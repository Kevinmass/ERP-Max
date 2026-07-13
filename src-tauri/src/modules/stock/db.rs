use sqlx::{SqlitePool, Row};
use crate::modules::stock::models::{InventoryItem, InventoryResponse, UpdateStockRequest, AdjustStockRequest};

pub async fn get_inventory_list(
    pool: &SqlitePool,
) -> Result<InventoryResponse, String> {
    let rows = sqlx::query(
        r#"
        SELECT i.product_id, p.nombre as product_name, i.quantity, i.min_stock_level,
               CASE WHEN i.quantity <= i.min_stock_level THEN 1 ELSE 0 END as is_low_stock,
               p.categoria_id,
               (SELECT pf.contenido_base64 FROM producto_fotos pf
                    WHERE pf.producto_id = p.id ORDER BY pf.orden LIMIT 1) as thumbnail
        FROM inventory i
        JOIN productos p ON i.product_id = p.id
        ORDER BY p.nombre
        "#,
    )
    .fetch_all(pool)
    .await
    .map_err(|e| format!("Error fetching inventory: {}", e))?;

    let mut data = Vec::new();
    for row in rows {
        data.push(InventoryItem {
            product_id: row.try_get("product_id").map_err(|e| format!("Error getting product_id: {}", e))?,
            product_name: row.try_get("product_name").map_err(|e| format!("Error getting product_name: {}", e))?,
            quantity: row.try_get("quantity").map_err(|e| format!("Error getting quantity: {}", e))?,
            min_stock_level: row.try_get("min_stock_level").map_err(|e| format!("Error getting min_stock_level: {}", e))?,
            is_low_stock: row.try_get::<i32, _>("is_low_stock").map_err(|e| format!("Error getting is_low_stock: {}", e))? == 1,
            categoria_id: row.try_get("categoria_id").ok(),
            thumbnail: row.try_get("thumbnail").ok(),
        });
    }

    Ok(InventoryResponse { data })
}

pub async fn get_stock_level(
    pool: &SqlitePool,
    product_id: i32,
) -> Result<i32, String> {
    let quantity: Option<i32> = sqlx::query_scalar(
        "SELECT quantity FROM inventory WHERE product_id = ?"
    )
    .bind(product_id)
    .fetch_optional(pool)
    .await
    .map_err(|e| format!("Error getting stock level: {}", e))?;

    Ok(quantity.unwrap_or(0))
}

pub async fn adjust_stock(
    pool: &SqlitePool,
    request: AdjustStockRequest,
) -> Result<i32, String> {
    // First, ensure the product exists in inventory (create if not exists)
    let existing_quantity = get_stock_level(pool, request.product_id).await?;

    let new_quantity = existing_quantity + request.delta;

    // Upsert the inventory record
    sqlx::query(
        r#"
        INSERT INTO inventory (product_id, quantity, min_stock_level)
        VALUES (?, ?, 0)
        ON CONFLICT(product_id) DO UPDATE SET
        quantity = excluded.quantity
        "#,
    )
    .bind(request.product_id)
    .bind(new_quantity)
    .execute(pool)
    .await
    .map_err(|e| format!("Error adjusting stock: {}", e))?;

    Ok(new_quantity)
}

pub async fn update_stock_manually(
    pool: &SqlitePool,
    request: UpdateStockRequest,
) -> Result<(), String> {

    // Upsert the inventory record
    sqlx::query(
        r#"
        INSERT INTO inventory (product_id, quantity, min_stock_level)
        VALUES (?, ?, 0)
        ON CONFLICT(product_id) DO UPDATE SET
        quantity = excluded.quantity
        "#,
    )
    .bind(request.product_id)
    .bind(request.quantity)
    .execute(pool)
    .await
    .map_err(|e| format!("Error updating stock: {}", e))?;

    Ok(())
}

pub async fn adjust_stock_tx<'a>(
    tx: &mut sqlx::Transaction<'a, sqlx::Sqlite>,
    request: AdjustStockRequest,
) -> Result<i32, String> {
    // Get existing quantity
    let existing_quantity: Option<i32> = sqlx::query_scalar(
        "SELECT quantity FROM inventory WHERE product_id = ?"
    )
    .bind(request.product_id)
    .fetch_optional(&mut **tx)
    .await
    .map_err(|e| format!("Error getting stock level: {}", e))?;

    let existing_quantity = existing_quantity.unwrap_or(0);
    let new_quantity = existing_quantity + request.delta;

    // Upsert the inventory record
    sqlx::query(
        r#"
        INSERT INTO inventory (product_id, quantity, min_stock_level)
        VALUES (?, ?, 0)
        ON CONFLICT(product_id) DO UPDATE SET
        quantity = excluded.quantity
        "#,
    )
    .bind(request.product_id)
    .bind(new_quantity)
    .execute(&mut **tx)
    .await
    .map_err(|e| format!("Error adjusting stock: {}", e))?;

    Ok(new_quantity)
}

#[allow(dead_code)]
pub async fn set_min_stock_level(
    pool: &SqlitePool,
    product_id: i32,
    min_level: i32,
) -> Result<(), String> {
    if min_level < 0 {
        return Err("Minimum stock level cannot be negative".to_string());
    }

    // Upsert the inventory record with min_stock_level
    sqlx::query(
        r#"
        INSERT INTO inventory (product_id, quantity, min_stock_level)
        VALUES (?, 0, ?)
        ON CONFLICT(product_id) DO UPDATE SET
        min_stock_level = excluded.min_stock_level
        "#,
    )
    .bind(product_id)
    .bind(min_level)
    .execute(pool)
    .await
    .map_err(|e| format!("Error setting min stock level: {}", e))?;

    Ok(())
}
