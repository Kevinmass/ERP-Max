//! Database operations for Product Matching module

use sqlx::{Pool, Sqlite, Row};
use crate::modules::product_matching::models::*;
use thiserror::Error;

#[derive(Error, Debug)]
#[allow(dead_code)]
pub enum DbError {
    #[error("Database error: {0}")]
    DatabaseError(String),
    #[error("Not found: {0}")]
    NotFound(String),
}

/// Create the product matching tables
pub async fn create_tables(pool: &Pool<Sqlite>) -> Result<(), DbError> {
    // Create importaciones table
    sqlx::query(r#"
        CREATE TABLE IF NOT EXISTS importaciones (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            proveedor_nombre TEXT NOT NULL,
            archivo_original TEXT NOT NULL,
            fecha_importacion TEXT NOT NULL,
            estado TEXT NOT NULL DEFAULT 'pendiente',
            total_productos INTEGER DEFAULT 0,
            productos_emparajados INTEGER DEFAULT 0
        )
    "#).execute(pool).await
        .map_err(|e| DbError::DatabaseError(e.to_string()))?;
    
    // Create matching_resultados table
    sqlx::query(r#"
        CREATE TABLE IF NOT EXISTS matching_resultados (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            importacion_id INTEGER NOT NULL,
            producto_proveedor_nombre TEXT NOT NULL,
            producto_proveedor_precio REAL,
            producto_proveedor_cantidad INTEGER,
            producto_interno_id INTEGER,
            producto_interno_nombre TEXT,
            score_similitud REAL DEFAULT 0,
            estado TEXT NOT NULL DEFAULT 'pendiente',
            FOREIGN KEY (importacion_id) REFERENCES importaciones(id) ON DELETE CASCADE
        )
    "#).execute(pool).await
        .map_err(|e| DbError::DatabaseError(e.to_string()))?;
    
    // Create embeddings_cache table
    sqlx::query(r#"
        CREATE TABLE IF NOT EXISTS embeddings_cache (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            texto TEXT NOT NULL UNIQUE,
            embedding BLOB NOT NULL,
            modelo TEXT NOT NULL,
            fecha_creacion TEXT NOT NULL
        )
    "#).execute(pool).await
        .map_err(|e| DbError::DatabaseError(e.to_string()))?;
    
    // Create indexes
    sqlx::query(r#"
        CREATE INDEX IF NOT EXISTS idx_resultados_importacion 
        ON matching_resultados(importacion_id)
    "#).execute(pool).await
        .map_err(|e| DbError::DatabaseError(e.to_string()))?;
    
    // Ensure the missing column exists (direct fix for the reported issue)
    ensure_missing_columns(pool).await?;
    
    Ok(())
}

/// Ensure all required columns exist in matching_resultados table
async fn ensure_missing_columns(pool: &Pool<Sqlite>) -> Result<(), DbError> {
    // Check if producto_proveedor_cantidad column exists
    let column_exists = sqlx::query(
        r#"
        SELECT COUNT(*) as count 
        FROM pragma_table_info('matching_resultados') 
        WHERE name = 'producto_proveedor_cantidad'
        "#
    )
    .fetch_one(pool)
    .await
    .map_err(|e| DbError::DatabaseError(e.to_string()))?;
    
    let count: i64 = column_exists.get("count");
    if count == 0 {
        sqlx::query("ALTER TABLE matching_resultados ADD COLUMN producto_proveedor_cantidad INTEGER")
            .execute(pool)
            .await
            .map_err(|e| DbError::DatabaseError(e.to_string()))?;
    }
    
    // Check if producto_proveedor_precio column exists
    let column_exists = sqlx::query(
        r#"
        SELECT COUNT(*) as count 
        FROM pragma_table_info('matching_resultados') 
        WHERE name = 'producto_proveedor_precio'
        "#
    )
    .fetch_one(pool)
    .await
    .map_err(|e| DbError::DatabaseError(e.to_string()))?;
    
    let count: i64 = column_exists.get("count");
    if count == 0 {
        sqlx::query("ALTER TABLE matching_resultados ADD COLUMN producto_proveedor_precio REAL")
            .execute(pool)
            .await
            .map_err(|e| DbError::DatabaseError(e.to_string()))?;
    }
    
    // Check if producto_proveedor_nombre column exists
    let column_exists = sqlx::query(
        r#"
        SELECT COUNT(*) as count 
        FROM pragma_table_info('matching_resultados') 
        WHERE name = 'producto_proveedor_nombre'
        "#
    )
    .fetch_one(pool)
    .await
    .map_err(|e| DbError::DatabaseError(e.to_string()))?;
    
    let count: i64 = column_exists.get("count");
    if count == 0 {
        sqlx::query("ALTER TABLE matching_resultados ADD COLUMN producto_proveedor_nombre TEXT NOT NULL")
            .execute(pool)
            .await
            .map_err(|e| DbError::DatabaseError(e.to_string()))?;
    }
    
    Ok(())
}

/// Save an import record
pub async fn save_importacion(
    pool: &Pool<Sqlite>,
    importacion: &Importacion,
) -> Result<i32, DbError> {
    let result = sqlx::query(r#"
        INSERT INTO importaciones (proveedor_nombre, archivo_original, fecha_importacion, estado, total_productos, productos_emparajados)
        VALUES (?, ?, ?, ?, ?, ?)
    "#)
        .bind(&importacion.proveedor_nombre)
        .bind(&importacion.archivo_original)
        .bind(&importacion.fecha_importacion)
        .bind(importacion.estado.to_string())
        .bind(importacion.total_productos)
        .bind(importacion.productos_emparajados)
        .execute(pool)
        .await
        .map_err(|e| DbError::DatabaseError(e.to_string()))?;
    
    Ok(result.last_insert_rowid() as i32)
}

/// Update import status
pub async fn update_importacion_estado(
    pool: &Pool<Sqlite>,
    id: i32,
    estado: &str,
    total_productos: i32,
    productos_emparajados: i32,
) -> Result<(), DbError> {
    sqlx::query(r#"
        UPDATE importaciones 
        SET estado = ?, total_productos = ?, productos_emparajados = ?
        WHERE id = ?
    "#)
        .bind(estado)
        .bind(total_productos)
        .bind(productos_emparajados)
        .bind(id)
        .execute(pool)
        .await
        .map_err(|e| DbError::DatabaseError(e.to_string()))?;
    
    Ok(())
}

/// Save matching results
pub async fn save_resultados(
    pool: &Pool<Sqlite>,
    importacion_id: i32,
    resultados: &[MatchingResultado],
) -> Result<(), DbError> {
    for resultado in resultados {
        sqlx::query(r#"
            INSERT INTO matching_resultados 
            (importacion_id, producto_proveedor_nombre, producto_proveedor_precio, producto_proveedor_cantidad,
             producto_interno_id, producto_interno_nombre, score_similitud, estado)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        "#)
            .bind(importacion_id)
            .bind(&resultado.producto_proveedor_nombre)
            .bind(resultado.producto_proveedor_precio)
            .bind(resultado.producto_proveedor_cantidad)
            .bind(resultado.producto_interno_id)
            .bind(&resultado.producto_interno_nombre)
            .bind(resultado.score_similitud)
            .bind(resultado.estado.to_string())
            .execute(pool)
            .await
            .map_err(|e| DbError::DatabaseError(e.to_string()))?;
    }
    
    Ok(())
}

/// Get all imports
pub async fn get_importaciones(pool: &Pool<Sqlite>) -> Result<Vec<Importacion>, DbError> {
    let rows = sqlx::query(r#"
        SELECT id, proveedor_nombre, archivo_original, fecha_importacion, estado, total_productos, productos_emparajados
        FROM importaciones
        ORDER BY fecha_importacion DESC
    "#)
        .fetch_all(pool)
        .await
        .map_err(|e| DbError::DatabaseError(e.to_string()))?;
    
    let mut importaciones = Vec::new();
    for row in rows {
        let estado_str: String = row.get("estado");
        let estado = match estado_str.as_str() {
            "completada" => ImportacionEstado::Completada,
            "procesando" => ImportacionEstado::Procesando,
            "error" => ImportacionEstado::Error,
            _ => ImportacionEstado::Pendiente,
        };
        
        importaciones.push(Importacion {
            id: Some(row.get("id")),
            proveedor_nombre: row.get("proveedor_nombre"),
            archivo_original: row.get("archivo_original"),
            fecha_importacion: row.get("fecha_importacion"),
            estado,
            total_productos: row.get("total_productos"),
            productos_emparajados: row.get("productos_emparajados"),
        });
    }
    
    Ok(importaciones)
}

/// Get matching results for an import
pub async fn get_resultados(
    pool: &Pool<Sqlite>,
    importacion_id: i32,
) -> Result<Vec<MatchingResultado>, DbError> {
    let rows = sqlx::query(r#"
        SELECT id, importacion_id, producto_proveedor_nombre, producto_proveedor_precio,
               producto_proveedor_cantidad, producto_interno_id, producto_interno_nombre, score_similitud, estado
        FROM matching_resultados
        WHERE importacion_id = ?
        ORDER BY score_similitud DESC
    "#)
        .bind(importacion_id)
        .fetch_all(pool)
        .await
        .map_err(|e| DbError::DatabaseError(e.to_string()))?;
    
    let mut resultados = Vec::new();
    for row in rows {
        let estado_str: String = row.get("estado");
        let estado = match estado_str.as_str() {
            "confirmado" => MatchingEstado::Confirmado,
            "rechazado" => MatchingEstado::Rechazado,
            "sin_match" => MatchingEstado::SinMatch,
            _ => MatchingEstado::Pendiente,
        };
        
        resultados.push(MatchingResultado {
            id: Some(row.get("id")),
            importacion_id: row.get("importacion_id"),
            producto_proveedor_nombre: row.get("producto_proveedor_nombre"),
            producto_proveedor_precio: row.get("producto_proveedor_precio"),
            producto_proveedor_cantidad: row.get("producto_proveedor_cantidad"),
            producto_interno_id: row.get("producto_interno_id"),
            producto_interno_nombre: row.get("producto_interno_nombre"),
            score_similitud: row.get("score_similitud"),
            estado,
        });
    }
    
    Ok(resultados)
}

/// Update a single result status
pub async fn update_resultado_estado(
    pool: &Pool<Sqlite>,
    id: i32,
    producto_interno_id: i32,
    estado: &str,
) -> Result<(), DbError> {
    sqlx::query(r#"
        UPDATE matching_resultados
        SET estado = ?, producto_interno_id = ?
        WHERE id = ?
    "#)
        .bind(estado)
        .bind(producto_interno_id)
        .bind(id)
        .execute(pool)
        .await
        .map_err(|e| DbError::DatabaseError(e.to_string()))?;
    
    Ok(())
}

/// Get matching statistics
pub async fn get_matching_stats(
    pool: &Pool<Sqlite>,
    importacion_id: i32,
) -> Result<MatchingStats, DbError> {
    let row = sqlx::query(r#"
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN estado = 'confirmado' AND score_similitud >= 0.85 THEN 1 ELSE 0 END) as automaticos,
            SUM(CASE WHEN estado = 'pendiente' THEN 1 ELSE 0 END) as pendientes,
            SUM(CASE WHEN estado = 'confirmado' THEN 1 ELSE 0 END) as confirmados,
            SUM(CASE WHEN estado = 'rechazado' THEN 1 ELSE 0 END) as rechazados,
            SUM(CASE WHEN estado = 'sin_match' THEN 1 ELSE 0 END) as sin_match
        FROM matching_resultados
        WHERE importacion_id = ?
    "#)
        .bind(importacion_id)
        .fetch_one(pool)
        .await
        .map_err(|e| DbError::DatabaseError(e.to_string()))?;
    
    Ok(MatchingStats {
        total: row.get("total"),
        automaticos: row.get::<Option<i32>, _>("automaticos").unwrap_or(0),
        pendientes: row.get::<Option<i32>, _>("pendientes").unwrap_or(0),
        confirmados: row.get::<Option<i32>, _>("confirmados").unwrap_or(0),
        rechazados: row.get::<Option<i32>, _>("rechazados").unwrap_or(0),
        sin_match: row.get::<Option<i32>, _>("sin_match").unwrap_or(0),
    })
}
