//! Migration strategy for Product Matching module
//!
//! This module handles database migrations for the product matching functionality,
//! including creating tables and adding missing columns.

use sqlx::{SqlitePool, Row};
use crate::migration::strategies::MigrationResult;

/// Check if product matching tables exist and have the required columns
pub async fn check_product_matching_tables_exist(pool: &SqlitePool) -> Result<bool, sqlx::Error> {
    // Check if matching_resultados table exists and has the required columns
    let result = sqlx::query(
        r#"
        SELECT COUNT(*) as count 
        FROM pragma_table_info('matching_resultados') 
        WHERE name IN ('producto_proveedor_cantidad', 'producto_proveedor_precio', 'producto_proveedor_nombre')
        "#
    )
    .fetch_one(pool)
    .await?;
    
    let column_count: i64 = result.get("count");
    
    // Specifically check for the problematic column
    let cantidad_result = sqlx::query(
        r#"
        SELECT COUNT(*) as count 
        FROM pragma_table_info('matching_resultados') 
        WHERE name = 'producto_proveedor_cantidad'
        "#
    )
    .fetch_one(pool)
    .await?;
    
    let cantidad_exists: i64 = cantidad_result.get("count");
    
    // Return true only if all required columns exist, specifically checking for producto_proveedor_cantidad
    Ok(column_count >= 3 && cantidad_exists > 0)
}

/// Check if importaciones table exists
pub async fn check_importaciones_table_exists(pool: &SqlitePool) -> Result<bool, sqlx::Error> {
    let result = sqlx::query(
        r#"
        SELECT COUNT(*) as count 
        FROM sqlite_master 
        WHERE type='table' AND name='importaciones'
        "#
    )
    .fetch_one(pool)
    .await?;
    
    let table_count: i64 = result.get("count");
    Ok(table_count > 0)
}

/// Check if embeddings_cache table exists
pub async fn check_embeddings_cache_table_exists(pool: &SqlitePool) -> Result<bool, sqlx::Error> {
    let result = sqlx::query(
        r#"
        SELECT COUNT(*) as count 
        FROM sqlite_master 
        WHERE type='table' AND name='embeddings_cache'
        "#
    )
    .fetch_one(pool)
    .await?;
    
    let table_count: i64 = result.get("count");
    Ok(table_count > 0)
}

/// Migrate product matching tables - create tables if they don't exist or add missing columns
pub async fn migrate_product_matching_tables(pool: &SqlitePool) -> Result<bool, sqlx::Error> {
    let mut migrated = false;
    
    // Check if tables exist
    let has_matching_tables = check_product_matching_tables_exist(pool).await?;
    let has_importaciones = check_importaciones_table_exists(pool).await?;
    let has_embeddings_cache = check_embeddings_cache_table_exists(pool).await?;
    
    if !has_matching_tables || !has_importaciones || !has_embeddings_cache {
        // Create or update tables
        create_product_matching_tables(pool).await?;
        migrated = true;
    }
    
    // Check for specific missing columns and add them if needed
    if !has_matching_tables {
        add_missing_columns(pool).await?;
        migrated = true;
    }
    
    Ok(migrated)
}

/// Create product matching tables
async fn create_product_matching_tables(pool: &SqlitePool) -> Result<(), sqlx::Error> {
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
    "#).execute(pool).await?;
    
    // Create matching_resultados table with all required columns
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
    "#).execute(pool).await?;
    
    // Create embeddings_cache table
    sqlx::query(r#"
        CREATE TABLE IF NOT EXISTS embeddings_cache (
            id INTEGER PRIMARY PRIMARY KEY AUTOINCREMENT,
            texto TEXT NOT NULL UNIQUE,
            embedding BLOB NOT NULL,
            modelo TEXT NOT NULL,
            fecha_creacion TEXT NOT NULL
        )
    "#).execute(pool).await?;
    
    // Create indexes for better performance
    sqlx::query(r#"
        CREATE INDEX IF NOT EXISTS idx_resultados_importacion 
        ON matching_resultados(importacion_id)
    "#).execute(pool).await?;
    
    Ok(())
}

/// Add missing columns to existing tables
async fn add_missing_columns(pool: &SqlitePool) -> Result<(), sqlx::Error> {
    // Check if producto_proveedor_cantidad column exists, if not add it
    let column_exists = sqlx::query(
        r#"
        SELECT COUNT(*) as count 
        FROM pragma_table_info('matching_resultados') 
        WHERE name = 'producto_proveedor_cantidad'
        "#
    )
    .fetch_one(pool)
    .await?;
    
    let count: i64 = column_exists.get("count");
    if count == 0 {
        sqlx::query("ALTER TABLE matching_resultados ADD COLUMN producto_proveedor_cantidad INTEGER")
            .execute(pool)
            .await?;
    }
    
    // Check if producto_proveedor_precio column exists, if not add it
    let column_exists = sqlx::query(
        r#"
        SELECT COUNT(*) as count 
        FROM pragma_table_info('matching_resultados') 
        WHERE name = 'producto_proveedor_precio'
        "#
    )
    .fetch_one(pool)
    .await?;
    
    let count: i64 = column_exists.get("count");
    if count == 0 {
        sqlx::query("ALTER TABLE matching_resultados ADD COLUMN producto_proveedor_precio REAL")
            .execute(pool)
            .await?;
    }
    
    // Check if producto_proveedor_nombre column exists, if not add it
    let column_exists = sqlx::query(
        r#"
        SELECT COUNT(*) as count 
        FROM pragma_table_info('matching_resultados') 
        WHERE name = 'producto_proveedor_nombre'
        "#
    )
    .fetch_one(pool)
    .await?;
    
    let count: i64 = column_exists.get("count");
    if count == 0 {
        sqlx::query("ALTER TABLE matching_resultados ADD COLUMN producto_proveedor_nombre TEXT NOT NULL")
            .execute(pool)
            .await?;
    }
    
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::SqlitePool;
    
    #[sqlx::test]
    async fn test_check_product_matching_tables_exist(pool: SqlitePool) -> Result<(), sqlx::Error> {
        // Initially should not exist
        assert!(!check_product_matching_tables_exist(&pool).await?);
        
        // Create tables
        create_product_matching_tables(&pool).await?;
        
        // Should exist now
        assert!(check_product_matching_tables_exist(&pool).await?);
        
        Ok(())
    }
    
    #[sqlx::test]
    async fn test_add_missing_columns(pool: SqlitePool) -> Result<(), sqlx::Error> {
        // Create table without some columns
        sqlx::query(r#"
            CREATE TABLE matching_resultados (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                importacion_id INTEGER NOT NULL,
                producto_proveedor_nombre TEXT NOT NULL,
                estado TEXT NOT NULL DEFAULT 'pendiente'
            )
        "#).execute(&pool).await?;
        
        // Check that missing columns are added
        add_missing_columns(&pool).await?;
        
        // Verify columns exist
        let result = sqlx::query(
            r#"
            SELECT COUNT(*) as count 
            FROM pragma_table_info('matching_resultados') 
            WHERE name IN ('producto_proveedor_cantidad', 'producto_proveedor_precio')
            "#
        )
        .fetch_one(&pool)
        .await?;
        
        let count: i64 = result.get("count");
        assert_eq!(count, 2);
        
        Ok(())
    }
}