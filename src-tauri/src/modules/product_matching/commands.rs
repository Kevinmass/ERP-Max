//! Tauri commands for Product Matching module

use tauri::State;
use sqlx::{Pool, Sqlite, Row};
use chrono::Utc;
use crate::modules::product_matching::models::*;
use crate::modules::product_matching::service::ProductMatchingService;
use crate::modules::product_matching::db as pm_db;
use crate::modules::product_matching::parser;
use std::sync::Arc;
use tokio::sync::RwLock;

/// Application state for product matching
pub struct ProductMatchingState {
    pub service: Arc<RwLock<ProductMatchingService>>,
    pub pool: Pool<sqlx::Sqlite>,
}

/// Get all internal products from catalogue for matching
async fn get_catalogue_products(pool: &Pool<Sqlite>) -> Result<Vec<ProductoInterno>, String> {
    let rows = sqlx::query(
        r#"
        SELECT p.id, p.nombre, COALESCE(p.descripcion, '') as descripcion, p.costo, 
               COALESCE(i.quantity, 0) as stock, COALESCE(p.categoria_id, 0) as categoria_id, 
               COALESCE(p.tags, '') as tags
        FROM productos p
        LEFT JOIN inventory i ON p.id = i.product_id
        ORDER BY p.nombre
        "#
    )
    .fetch_all(pool)
    .await
    .map_err(|e| format!("Error fetching catalogue products: {}", e))?;

    let mut products = Vec::new();
    for row in rows {
        let id: i32 = row.get("id");
        let nombre: String = row.get("nombre");
        let descripcion: String = row.get("descripcion");
        let descripcion = if descripcion.is_empty() { None } else { Some(descripcion) };
        let costo: f64 = row.get("costo");
        let stock: i32 = row.get("stock");
        let categoria_id: i32 = row.get("categoria_id");
        let categoria_id = if categoria_id == 0 { None } else { Some(categoria_id) };
        let tags: String = row.get("tags");
        let tags = if tags.is_empty() { None } else { Some(tags) };
        
        products.push(ProductoInterno {
            id,
            nombre,
            descripcion,
            costo,
            stock,
            categoria_id,
            tags,
        });
    }

    Ok(products)
}

/// Import a price list file and create initial import record
#[tauri::command]
pub async fn importar_lista_proveedor(
    state: State<'_, ProductMatchingState>,
    proveedor_nombre: String,
    archivo_contenido: Vec<u8>,
    nombre_archivo: String,
) -> Result<Importacion, String> {
    let productos = state.service.read().await
        .parse_file(&archivo_contenido, &nombre_archivo)
        .map_err(|e| e.to_string())?;
    
    let importacion = Importacion {
        id: None,
        proveedor_nombre: proveedor_nombre.clone(),
        archivo_original: nombre_archivo.clone(),
        fecha_importacion: Utc::now().to_rfc3339(),
        estado: ImportacionEstado::Pendiente,
        total_productos: productos.len() as i32,
        productos_emparajados: 0,
    };
    
    let importacion_id = pm_db::save_importacion(&state.pool, &importacion)
        .await
        .map_err(|e| e.to_string())?;
    
    let mut importacion_saved = importacion.clone();
    importacion_saved.id = Some(importacion_id);
    
    Ok(importacion_saved)
}

/// Execute the matching algorithm for an import
#[tauri::command]
pub async fn ejecutar_matching(
    state: State<'_, ProductMatchingState>,
    _threshold_automatico: Option<f64>,
    _threshold_revision: Option<f64>,
    importacion_id: i32,
) -> Result<MatchingStats, String> {
    let resultados_existentes = pm_db::get_resultados(&state.pool, importacion_id)
        .await
        .map_err(|e| e.to_string())?;
    
    if !resultados_existentes.is_empty() {
        return pm_db::get_matching_stats(&state.pool, importacion_id)
            .await
            .map_err(|e| e.to_string());
    }
    
    Ok(MatchingStats {
        total: 0,
        automaticos: 0,
        pendientes: 0,
        confirmados: 0,
        rechazados: 0,
        sin_match: 0,
    })
}

/// Get all imports
#[tauri::command]
pub async fn get_importaciones(
    state: State<'_, ProductMatchingState>,
) -> Result<Vec<Importacion>, String> {
    pm_db::get_importaciones(&state.pool)
        .await
        .map_err(|e| e.to_string())
}

/// Get results for an import
#[tauri::command]
pub async fn get_resultados_matching(
    state: State<'_, ProductMatchingState>,
    importacion_id: i32,
) -> Result<Vec<MatchingResultado>, String> {
    pm_db::get_resultados(&state.pool, importacion_id)
        .await
        .map_err(|e| e.to_string())
}

/// Get all internal products from catalogue for manual selection
#[tauri::command]
pub async fn get_productos_internos(
    state: State<'_, ProductMatchingState>,
) -> Result<Vec<ProductoInterno>, String> {
    get_catalogue_products(&state.pool).await
}

/// Confirm a match manually
#[tauri::command]
pub async fn confirmar_match(
    state: State<'_, ProductMatchingState>,
    resultado_id: i32,
    producto_interno_id: i32,
) -> Result<(), String> {
    pm_db::update_resultado_estado(&state.pool, resultado_id, producto_interno_id, "confirmado")
        .await
        .map_err(|e| e.to_string())
}

/// Reject a match
#[tauri::command]
pub async fn rechazar_match(
    state: State<'_, ProductMatchingState>,
    resultado_id: i32,
) -> Result<(), String> {
    pm_db::update_resultado_estado(&state.pool, resultado_id, 0, "rechazado")
        .await
        .map_err(|e| e.to_string())
}

/// Get matching statistics
#[tauri::command]
pub async fn get_matching_stats(
    state: State<'_, ProductMatchingState>,
    importacion_id: i32,
) -> Result<MatchingStats, String> {
    pm_db::get_matching_stats(&state.pool, importacion_id)
        .await
        .map_err(|e| e.to_string())
}

/// Apply price and stock updates to catalogue - updates prices and stock for confirmed matches
#[tauri::command]
pub async fn aplicar_actualizacion_precios(
    state: State<'_, ProductMatchingState>,
    importacion_id: i32,
) -> Result<ActualizacionPreciosResult, String> {
    let resultados = pm_db::get_resultados(&state.pool, importacion_id)
        .await
        .map_err(|e| e.to_string())?;
    
    let confirmados: Vec<&MatchingResultado> = resultados
        .iter()
        .filter(|r| r.estado == MatchingEstado::Confirmado && r.producto_interno_id.is_some())
        .collect();
    
    let total_confirmados = confirmados.len() as i32;
    let mut actualizados = 0;
    let mut errores = Vec::new();
    
    for resultado in &confirmados {
        let producto_interno_id = resultado.producto_interno_id.unwrap();
        let nuevo_precio = resultado.producto_proveedor_precio;
        let nueva_cantidad = resultado.producto_proveedor_cantidad;
        
        // Update price (existing functionality)
        if let Some(precio) = nuevo_precio {
            let result = sqlx::query("UPDATE productos SET costo = ? WHERE id = ?")
                .bind(precio)
                .bind(producto_interno_id)
                .execute(&state.pool)
                .await;
            
            match result {
                Ok(_) => actualizados += 1,
                Err(e) => errores.push(format!("Producto {}: {}", resultado.producto_proveedor_nombre, e)),
            }
        }
        
        // Update stock quantity (new functionality)
        if let Some(cantidad) = nueva_cantidad {
            // Use the stock service to update inventory
            let delta = cantidad; // Set stock to the exact quantity from supplier
            
            // First, get current stock level
            let current_stock: Option<i32> = sqlx::query_scalar(
                "SELECT quantity FROM inventory WHERE product_id = ?"
            )
            .bind(producto_interno_id)
            .fetch_optional(&state.pool)
            .await
            .map_err(|e| format!("Error getting current stock: {}", e))?;
            
            let current_stock = current_stock.unwrap_or(0);
            let stock_delta = cantidad - current_stock;
            
            // Update inventory using the stock service logic
            let new_quantity = current_stock + stock_delta;
            
            let update_result = sqlx::query(
                r#"
                INSERT INTO inventory (product_id, quantity, min_stock_level)
                VALUES (?, ?, 0)
                ON CONFLICT(product_id) DO UPDATE SET
                quantity = excluded.quantity
                "#,
            )
            .bind(producto_interno_id)
            .bind(new_quantity)
            .execute(&state.pool)
            .await;
            
            match update_result {
                Ok(_) => {
                    // Stock update successful, increment counter if price was also updated
                    if nuevo_precio.is_some() {
                        // Already counted in price update
                    } else {
                        // Only stock was updated
                        actualizados += 1;
                    }
                },
                Err(e) => errores.push(format!("Stock Producto {}: {}", resultado.producto_proveedor_nombre, e)),
            }
        }
    }
    
    Ok(ActualizacionPreciosResult {
        total_confirmados,
        actualizados,
        errores,
    })
}

/// Export matching results to CSV file
#[tauri::command]
pub async fn exportar_resultados_excel(
    state: State<'_, ProductMatchingState>,
    importacion_id: i32,
) -> Result<Vec<u8>, String> {
    let resultados = pm_db::get_resultados(&state.pool, importacion_id)
        .await
        .map_err(|e| e.to_string())?;
    
    let productos_internos = get_catalogue_products(&state.pool).await?;
    
    let mut csv_content = String::new();
    csv_content.push_str("Producto Proveedor,Precio Proveedor,Codigo,Producto Interno,Precio Actual,Nuevo Precio,Diferencia,Similitud,Estado\n");
    
    for resultado in &resultados {
        let current_price = productos_internos
            .iter()
            .find(|p| p.id == resultado.producto_interno_id.unwrap_or(0))
            .map(|p| p.costo);
        
        let diff = if let (Some(nuevo), Some(actual)) = (resultado.producto_proveedor_precio, current_price) {
            nuevo - actual
        } else {
            0.0
        };
        
        let estado_str = match resultado.estado {
            MatchingEstado::Pendiente => "Pendiente",
            MatchingEstado::Confirmado => "Confirmado",
            MatchingEstado::Rechazado => "Rechazado",
            MatchingEstado::SinMatch => "Sin Match",
        };
        
        csv_content.push_str(&format!(
            "\"{}\",{},\"{}\",\"{}\",{},{},{},{:.2},{}\n",
            resultado.producto_proveedor_nombre.replace("\"", "\"\""),
            resultado.producto_proveedor_precio.unwrap_or(0.0),
            resultado.producto_interno_nombre.clone().unwrap_or_default().replace("\"", "\"\""),
            resultado.producto_interno_nombre.clone().unwrap_or_default().replace("\"", "\"\""),
            current_price.unwrap_or(0.0),
            resultado.producto_proveedor_precio.unwrap_or(0.0),
            diff,
            resultado.score_similitud,
            estado_str
        ));
    }
    
    Ok(csv_content.into_bytes())
}

/// Reimport Excel with price updates
#[tauri::command]
pub async fn reimportar_precios_excel(
    state: State<'_, ProductMatchingState>,
    importacion_id: i32,
    archivo_contenido: Vec<u8>,
    nombre_archivo: String,
) -> Result<ReimportarPreciosResult, String> {
    let productos_precios = parser::parse_file(&archivo_contenido, &nombre_archivo)
        .map_err(|e| format!("Error parsing Excel: {}", e))?;
    
    let resultados = pm_db::get_resultados(&state.pool, importacion_id)
        .await
        .map_err(|e| e.to_string())?;
    
    let mut actualizados = 0;
    let mut errores = Vec::new();
    
    for producto_precio in &productos_precios {
        if let Some(resultado) = resultados.iter().find(|r| 
            r.producto_proveedor_nombre.to_lowercase() == producto_precio.nombre.to_lowercase()
        ) {
            if let Some(producto_interno_id) = resultado.producto_interno_id {
                if let Some(nuevo_precio) = producto_precio.precio {
                    let update_result = sqlx::query("UPDATE productos SET costo = ? WHERE id = ?")
                        .bind(nuevo_precio)
                        .bind(producto_interno_id)
                        .execute(&state.pool)
                        .await;
                    
                    match update_result {
                        Ok(_) => actualizados += 1,
                        Err(e) => errores.push(format!("{}: {}", producto_precio.nombre, e)),
                    }
                }
            }
        }
    }
    
    Ok(ReimportarPreciosResult {
        total_procesados: productos_precios.len() as i32,
        actualizados,
        errores,
    })
}

/// Execute matching with full pipeline
#[tauri::command]
pub async fn importar_y_matchear(
    state: State<'_, ProductMatchingState>,
    proveedor_nombre: String,
    archivo_contenido: Vec<u8>,
    nombre_archivo: String,
    threshold_automatico: Option<f64>,
    threshold_revision: Option<f64>,
) -> Result<Importacion, String> {
    let productos = state.service.read().await
        .parse_file(&archivo_contenido, &nombre_archivo)
        .map_err(|e| e.to_string())?;
    
    let importacion = Importacion {
        id: None,
        proveedor_nombre: proveedor_nombre.clone(),
        archivo_original: nombre_archivo.clone(),
        fecha_importacion: Utc::now().to_rfc3339(),
        estado: ImportacionEstado::Procesando,
        total_productos: productos.len() as i32,
        productos_emparajados: 0,
    };
    
    let importacion_id = pm_db::save_importacion(&state.pool, &importacion)
        .await
        .map_err(|e| e.to_string())?;
    
    let internal_products = get_catalogue_products(&state.pool).await?;
    
    if internal_products.is_empty() {
        return Err("No hay productos en el catálogo. Por favor agrega productos primero.".to_string());
    }
    
    let mut service = state.service.write().await;
    if let (Some(auto), Some(rev)) = (threshold_automatico, threshold_revision) {
        service.set_thresholds(auto, rev);
    }
    
    let resultados = service.execute_matching(productos, &internal_products)
        .await
        .map_err(|e| e.to_string())?;
    
    let mut resultados_with_import = resultados;
    for r in &mut resultados_with_import {
        r.importacion_id = importacion_id;
    }
    
    let stats = service.calculate_stats(&resultados_with_import);
    
    pm_db::save_resultados(&state.pool, importacion_id, &resultados_with_import)
        .await
        .map_err(|e| e.to_string())?;
    
    pm_db::update_importacion_estado(
        &state.pool,
        importacion_id,
        "completada",
        stats.total,
        stats.confirmados + stats.automaticos,
    )
    .await
    .map_err(|e| e.to_string())?;
    
    Ok(Importacion {
        id: Some(importacion_id),
        proveedor_nombre,
        archivo_original: nombre_archivo,
        fecha_importacion: Utc::now().to_rfc3339(),
        estado: ImportacionEstado::Completada,
        total_productos: stats.total,
        productos_emparajados: stats.confirmados + stats.automaticos,
    })
}
