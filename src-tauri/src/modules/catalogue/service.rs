use sqlx::{SqlitePool, Row};
use crate::modules::catalogue::models::{ProductoResponse, Producto, Categoria, CrearProducto, ActualizarProducto, CrearCategoria};
use crate::modules::catalogue::db;
use crate::modules::stock::models::AdjustStockRequest;
use crate::modules::stock::db::adjust_stock;

pub async fn get_products_service(
    pool: &SqlitePool,
    page: Option<i32>,
    page_size: Option<i32>,
    search_query: Option<String>,
    categoria_id: Option<i32>,
    include_fotos: Option<bool>,
) -> Result<ProductoResponse, String> {
    // For now, just delegate to db layer
    // In the future, add caching, additional validation, business rules, etc.
    db::get_all_products_filtered(pool, page, page_size, search_query, categoria_id, include_fotos).await
}

pub async fn create_product_service(
    pool: &SqlitePool,
    producto: CrearProducto,
) -> Result<Producto, String> {
    // Basic validation
    if producto.nombre.trim().is_empty() {
        return Err("Product name is required".to_string());
    }
    if producto.costo < 0.0 {
        return Err("Product price must be non-negative".to_string());
    }

    // Create the product (inventory sync is handled in db layer)
    db::create_product(pool, producto).await
}

pub async fn update_product_service(
    pool: &SqlitePool,
    producto: ActualizarProducto,
) -> Result<Producto, String> {
    // Basic validation
    if producto.nombre.trim().is_empty() {
        return Err("Product name is required".to_string());
    }
    if producto.costo < 0.0 {
        return Err("Product price must be non-negative".to_string());
    }
    if producto.stock < 0 {
        return Err("Product stock must be non-negative".to_string());
    }

    // Update the product (inventory sync is handled in db layer)
    db::update_product(pool, producto).await
}

pub async fn delete_product_service(
    pool: &SqlitePool,
    product_id: i32,
) -> Result<(), String> {
    db::delete_product(pool, product_id).await
}

pub async fn get_categories_service(
    pool: &SqlitePool,
) -> Result<Vec<Categoria>, String> {
    db::get_categories(pool).await
}

pub async fn create_category_service(
    pool: &SqlitePool,
    categoria: CrearCategoria,
) -> Result<Categoria, String> {
    // Basic validation
    if categoria.nombre.trim().is_empty() {
        return Err("Category name is required".to_string());
    }

    db::create_category(pool, categoria).await
}

pub async fn delete_category_service(
    pool: &SqlitePool,
    categoria_id: i32,
) -> Result<(), String> {
    // Check if category has subcategories (still prevent deletion if has children)
    let subcategory_count: i32 = sqlx::query_scalar("SELECT COUNT(*) FROM categorias WHERE categoria_padre_id = ?")
        .bind(categoria_id)
        .fetch_one(pool)
        .await
        .map_err(|e| format!("Error checking subcategories: {}", e))?;

    if subcategory_count > 0 {
        return Err("Cannot delete category with subcategories. Delete subcategories first.".to_string());
    }

    // Update all products in this category to have no category (categoria_id = NULL)
    sqlx::query("UPDATE productos SET categoria_id = NULL WHERE categoria_id = ?")
        .bind(categoria_id)
        .execute(pool)
        .await
        .map_err(|e| format!("Error updating products: {}", e))?;

    db::delete_category(pool, categoria_id).await
}

pub async fn get_product_by_id_service(
    pool: &SqlitePool,
    product_id: i32,
) -> Result<Producto, String> {
    db::get_product_by_id(pool, product_id).await
}

#[allow(dead_code)]
pub async fn get_products_by_category_hierarchy_service(
    pool: &SqlitePool,
    categoria_id: i32,
    page: Option<i32>,
    page_size: Option<i32>,
) -> Result<ProductoResponse, String> {
    db::get_products_by_category_hierarchy(pool, categoria_id, page, page_size).await
}

pub async fn aplicar_ajuste_precios_service(
    pool: &SqlitePool,
    product_ids: Vec<i32>,
    porcentaje: f64,
    desde_costo: bool,
) -> Result<i32, String> {
    if product_ids.is_empty() {
        return Err("No se seleccionaron productos".to_string());
    }
    if porcentaje <= -100.0 {
        return Err("El ajuste no puede ser -100% o menor".to_string());
    }

    db::aplicar_ajuste_precios(pool, &product_ids, porcentaje, desde_costo).await
}

pub async fn migrate_product_stock_to_inventory_service(
    pool: &SqlitePool,
) -> Result<(), String> {
    // Get all products with their stock
    let rows = sqlx::query("SELECT id, stock FROM productos WHERE stock > 0")
        .fetch_all(pool)
        .await
        .map_err(|e| format!("Error fetching products: {}", e))?;

    let mut migrated_count = 0;
    
    for row in rows {
        let product_id: i32 = row.try_get("id").map_err(|e| format!("Error getting id: {}", e))?;
        let stock: i32 = row.try_get("stock").map_err(|e| format!("Error getting stock: {}", e))?;

        // Check if inventory record already exists
        let existing_quantity: Option<i32> = sqlx::query_scalar(
            "SELECT quantity FROM inventory WHERE product_id = ?"
        )
        .bind(product_id)
        .fetch_optional(pool)
        .await
        .map_err(|e| format!("Error checking existing inventory: {}", e))?;

        if existing_quantity.is_none() {
            // Create inventory record if it doesn't exist
            let request = AdjustStockRequest {
                product_id,
                delta: stock,
            };
            adjust_stock(pool, request).await?;
            migrated_count += 1;
        }
    }

    println!("Migrated stock for {} products", migrated_count);
    Ok(())
}
