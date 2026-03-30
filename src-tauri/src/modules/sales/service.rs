use sqlx::{SqlitePool, Row};
use crate::modules::sales::models::{CrearVenta, VentaResponse};
use crate::modules::sales::db;
use crate::modules::stock::models::AdjustStockRequest;
use crate::modules::stock::db::adjust_stock_tx;

pub async fn process_sale_service(
    pool: &SqlitePool,
    sale_data: CrearVenta,
) -> Result<VentaResponse, String> {
    // Validate sale data
    if sale_data.items.is_empty() {
        return Err("Sale must have at least one item".to_string());
    }

    // Delegate to db layer with transaction handling
    db::process_sale(pool, sale_data).await
}

pub async fn delete_sale_service(
    pool: &SqlitePool,
    sale_id: i32,
) -> Result<(), String> {
    // Validate sale can be deleted
    let mut tx = pool.begin().await.map_err(|e| format!("Error starting transaction: {}", e))?;

    // Check if sale exists and get its details
    let sale_row = sqlx::query(
        "SELECT id, estado FROM ventas WHERE id = ?"
    )
    .bind(sale_id)
    .fetch_optional(&mut *tx)
    .await
    .map_err(|e| format!("Error checking sale: {}", e))?;

    let sale = sale_row.ok_or_else(|| format!("Sale with ID {} not found", sale_id))?;
    let estado: String = sale.try_get("estado").map_err(|e| format!("Error getting sale estado: {}", e))?;

    // Check if sale can be deleted
    if estado != "completa" {
        return Err("Cannot delete sale that is not in 'completa' state".to_string());
    }

    // Check if sale has any payments
    let payment_count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM pagos WHERE venta_id = ?"
    )
    .bind(sale_id)
    .fetch_one(&mut *tx)
    .await
    .map_err(|e| format!("Error checking payments: {}", e))?;

    if payment_count > 0 {
        return Err("Cannot delete sale that has associated payments".to_string());
    }

    // Get sale items to restore inventory
    let item_rows = sqlx::query(
        "SELECT producto_id, cantidad FROM venta_items WHERE venta_id = ?"
    )
    .bind(sale_id)
    .fetch_all(&mut *tx)
    .await
    .map_err(|e| format!("Error getting sale items: {}", e))?;

    // Restore inventory for each item
    for item_row in item_rows {
        let product_id: i32 = item_row.try_get("producto_id").map_err(|e| format!("Error getting product_id: {}", e))?;
        let quantity: i32 = item_row.try_get("cantidad").map_err(|e| format!("Error getting quantity: {}", e))?;

        // Restore inventory (negative delta to add back)
        let _ = adjust_stock_tx(&mut tx, AdjustStockRequest {
            product_id,
            delta: quantity,
        }).await?;
    }

    // Delete sale items
    sqlx::query("DELETE FROM venta_items WHERE venta_id = ?")
        .bind(sale_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| format!("Error deleting sale items: {}", e))?;

    // Delete sale
    sqlx::query("DELETE FROM ventas WHERE id = ?")
        .bind(sale_id)
        .execute(&mut *tx)
        .await
        .map_err(|e| format!("Error deleting sale: {}", e))?;

    // Commit transaction
    tx.commit().await.map_err(|e| format!("Error committing transaction: {}", e))?;

    Ok(())
}

pub async fn archive_sale_service(
    pool: &SqlitePool,
    sale_id: i32,
) -> Result<(), String> {
    // Check if sale exists and is not already archived
    let sale_row = sqlx::query(
        "SELECT id, archivado FROM ventas WHERE id = ?"
    )
    .bind(sale_id)
    .fetch_optional(pool)
    .await
    .map_err(|e| format!("Error checking sale: {}", e))?;

    let sale = sale_row.ok_or_else(|| format!("Sale with ID {} not found", sale_id))?;
    let archivado: bool = sale.try_get("archivado").map_err(|e| format!("Error getting archivado status: {}", e))?;

    if archivado {
        return Err("Sale is already archived".to_string());
    }

    // Archive the sale
    sqlx::query("UPDATE ventas SET archivado = 1 WHERE id = ?")
        .bind(sale_id)
        .execute(pool)
        .await
        .map_err(|e| format!("Error archiving sale: {}", e))?;

    Ok(())
}

pub async fn unarchive_sale_service(
    pool: &SqlitePool,
    sale_id: i32,
) -> Result<(), String> {
    // Check if sale exists and is archived
    let sale_row = sqlx::query(
        "SELECT id, archivado FROM ventas WHERE id = ?"
    )
    .bind(sale_id)
    .fetch_optional(pool)
    .await
    .map_err(|e| format!("Error checking sale: {}", e))?;

    let sale = sale_row.ok_or_else(|| format!("Sale with ID {} not found", sale_id))?;
    let archivado: bool = sale.try_get("archivado").map_err(|e| format!("Error getting archivado status: {}", e))?;

    if !archivado {
        return Err("Sale is not archived".to_string());
    }

    // Unarchive the sale
    sqlx::query("UPDATE ventas SET archivado = 0 WHERE id = ?")
        .bind(sale_id)
        .execute(pool)
        .await
        .map_err(|e| format!("Error unarchiving sale: {}", e))?;

    Ok(())
}
