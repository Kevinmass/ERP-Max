use sqlx::SqlitePool;
use tauri::State;
use crate::modules::sales::models::{CrearVenta, VentaResponse};
use crate::modules::sales::service;
use crate::modules::sales::db;

#[tauri::command]
pub async fn register_sale(
    pool: State<'_, SqlitePool>,
    sale_data: CrearVenta,
) -> Result<VentaResponse, String> {
    service::process_sale_service(&pool, sale_data).await
}

#[tauri::command]
pub async fn get_sales_history(
    pool: State<'_, SqlitePool>,
    limit: i32,
    offset: i32,
) -> Result<Vec<VentaResponse>, String> {
    db::get_sales_history(&pool, limit, offset).await
}


#[tauri::command]
pub async fn delete_sale(
    pool: State<'_, SqlitePool>,
    sale_id: i32,
) -> Result<(), String> {
    service::delete_sale_service(&pool, sale_id).await
}

#[tauri::command]
pub async fn archive_sale(
    pool: State<'_, SqlitePool>,
    sale_id: i32,
) -> Result<(), String> {
    service::archive_sale_service(&pool, sale_id).await
}

#[tauri::command]
pub async fn unarchive_sale(
    pool: State<'_, SqlitePool>,
    sale_id: i32,
) -> Result<(), String> {
    service::unarchive_sale_service(&pool, sale_id).await
}

#[tauri::command]
pub async fn get_archived_sales(
    pool: State<'_, SqlitePool>,
    limit: i32,
    offset: i32,
) -> Result<Vec<VentaResponse>, String> {
    db::get_archived_sales(&pool, limit, offset).await
}

#[tauri::command]
pub async fn get_sales_history_with_filter(
    pool: State<'_, SqlitePool>,
    limit: i32,
    offset: i32,
    only_active: bool,
) -> Result<Vec<VentaResponse>, String> {
    db::get_sales_history_with_filter(&pool, limit, offset, only_active).await
}
