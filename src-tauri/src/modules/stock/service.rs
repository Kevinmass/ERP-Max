use sqlx::SqlitePool;
use crate::modules::stock::models::{AdjustStockRequest};
use crate::modules::stock::db;

#[allow(dead_code)]
pub async fn adjust_stock_service(
    pool: &SqlitePool,
    product_id: i32,
    delta: i32,
) -> Result<i32, String> {
    // Basic validation
    if product_id <= 0 {
        return Err("Invalid product ID".to_string());
    }

    let request = AdjustStockRequest { product_id, delta };
    db::adjust_stock(pool, request).await
}

#[allow(dead_code)]
pub async fn get_stock_level_service(
    pool: &SqlitePool,
    product_id: i32,
) -> Result<i32, String> {
    // Basic validation
    if product_id <= 0 {
        return Err("Invalid product ID".to_string());
    }

    db::get_stock_level(pool, product_id).await
}
