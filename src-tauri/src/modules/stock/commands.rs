use sqlx::SqlitePool;
use tauri::State;
use crate::modules::stock::models::{InventoryResponse, UpdateStockRequest};
use crate::modules::stock::db;

#[tauri::command]
pub async fn get_inventory_list(
    pool: State<'_, SqlitePool>,
) -> Result<InventoryResponse, String> {
    db::get_inventory_list(&pool).await
}

#[tauri::command]
pub async fn update_stock_manually(
    pool: State<'_, SqlitePool>,
    request: UpdateStockRequest,
) -> Result<(), String> {
    db::update_stock_manually(&pool, request).await
}

// Additional command for adjusting stock (could be used internally)
#[tauri::command]
pub async fn adjust_stock(
    pool: State<'_, SqlitePool>,
    product_id: i32,
    delta: i32,
) -> Result<i32, String> {
    use crate::modules::stock::models::AdjustStockRequest;
    let request = AdjustStockRequest { product_id, delta };
    db::adjust_stock(&pool, request).await
}
