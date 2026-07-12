pub mod catalogue;
pub mod sales;
pub mod settings;
pub mod stock;
pub mod dashboard;
pub mod product_matching;

use tauri::{Builder, Runtime, Manager};
use std::sync::Arc;
use tokio::sync::RwLock;
use crate::modules::product_matching::service::ProductMatchingService;
use crate::modules::product_matching::commands::ProductMatchingState;

pub fn register_modules<R: Runtime>(builder: Builder<R>) -> Builder<R> {
    builder
        .setup(|app| {
            // Initialize database synchronously
            let pool = tauri::async_runtime::block_on(async {
                match crate::db::init_db().await {
                    Ok(pool) => {
                        println!("Database initialized and migrations applied successfully");
                        pool
                    }
                    Err(e) => {
                        eprintln!("Failed to initialize database: {}", e);
                        std::process::exit(1);
                    }
                }
            });
            
            // Clone pool before managing
            let pool_clone = pool.clone();
            app.manage(pool);
            
            // Initialize Product Matching service
            let matching_service = tauri::async_runtime::block_on(async {
                let mut service = ProductMatchingService::new();
                service.initialize().await.expect("Failed to initialize matching service");
                Arc::new(RwLock::new(service))
            });
            
            // Create and manage the product matching state
            let pm_state = ProductMatchingState {
                service: matching_service,
                pool: pool_clone.clone(),
            };
            app.manage(pm_state);
            
            // Create product matching tables
            let pool_for_tables = pool_clone.clone();
            tauri::async_runtime::block_on(async {
                use crate::modules::product_matching::db as pm_db;
                pm_db::create_tables(&pool_for_tables).await.expect("Failed to create matching tables");
            });
            
            Ok(())
        })
        // Chain module command registrations using get_commands pattern
        .invoke_handler(tauri::generate_handler![
            catalogue::get_productos,
            catalogue::create_producto,
            catalogue::update_producto,
            catalogue::delete_producto,
            catalogue::get_categorias,
            catalogue::create_categoria,
            catalogue::delete_categoria,
            catalogue::get_producto_by_id,
            catalogue::migrate_product_stock_to_inventory,
            catalogue::exportar_catalogo_excel,
            catalogue::exportar_catalogo_pdf,
            catalogue::reimportar_precios_catalogo,
            catalogue::aplicar_ajuste_precios,
            sales::register_sale,
            sales::get_sales_history,
            sales::delete_sale,
            sales::archive_sale,
            sales::unarchive_sale,
            sales::get_archived_sales,
            sales::get_sales_history_with_filter,
            settings::get_settings,
            settings::save_settings,
            stock::get_inventory_list,
            stock::update_stock_manually,
            stock::adjust_stock,
            dashboard::get_dashboard_data,
            dashboard::get_dashboard_stats,
            dashboard::get_sales_trend,
            dashboard::get_inventory_status,
            dashboard::get_kpi_config,
            dashboard::update_kpi_config,
            // Product Matching commands
            product_matching::importar_lista_proveedor,
            product_matching::ejecutar_matching,
            product_matching::get_importaciones,
            product_matching::get_resultados_matching,
            product_matching::get_productos_internos,
            product_matching::confirmar_match,
            product_matching::rechazar_match,
            product_matching::get_matching_stats,
            product_matching::importar_y_matchear,
            product_matching::aplicar_actualizacion_precios,
            product_matching::exportar_resultados_excel,
            product_matching::reimportar_precios_excel
        ])
}
