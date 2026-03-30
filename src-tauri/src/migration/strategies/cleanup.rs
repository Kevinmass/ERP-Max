use sqlx::SqlitePool;

/// Cleanup old migration artifacts and ensure database is clean
pub async fn migrate_cleanup(pool: &SqlitePool) -> Result<bool, sqlx::Error> {
    let mut cleaned = false;

    // Remove old 'imagen' column from productos table if it exists
    if check_column_exists(pool, "productos", "imagen").await? {
        println!("Removing old 'imagen' column from productos table...");
        
        // Create a temporary table without the imagen column
        sqlx::query(
            "CREATE TABLE productos_temp AS 
             SELECT id, nombre, descripcion, costo, stock, categoria_id, tags, archivado 
             FROM productos"
        )
        .execute(pool)
        .await?;

        // Drop the original table
        sqlx::query("DROP TABLE productos")
        .execute(pool)
        .await?;

        // Recreate the table with proper structure
        sqlx::query(
            "CREATE TABLE productos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT NOT NULL,
                descripcion TEXT,
                costo REAL NOT NULL,
                stock INTEGER NOT NULL DEFAULT 0,
                categoria_id INTEGER,
                tags TEXT,
                archivado BOOLEAN DEFAULT 0,
                FOREIGN KEY (categoria_id) REFERENCES categorias (id) ON DELETE SET NULL
            )"
        )
        .execute(pool)
        .await?;

        // Copy data back
        sqlx::query(
            "INSERT INTO productos (id, nombre, descripcion, costo, stock, categoria_id, tags, archivado)
             SELECT id, nombre, descripcion, costo, stock, categoria_id, tags, archivado 
             FROM productos_temp"
        )
        .execute(pool)
        .await?;

        // Drop temporary table
        sqlx::query("DROP TABLE productos_temp")
        .execute(pool)
        .await?;

        cleaned = true;
        println!("Removed old 'imagen' column from productos table");
    }

    // Ensure proper indexes exist
    if ensure_indexes_exist(pool).await? {
        cleaned = true;
    }

    Ok(cleaned)
}

/// Check if no old migration artifacts exist
pub async fn check_no_old_artifacts(pool: &SqlitePool) -> Result<bool, sqlx::Error> {
    let has_imagen_column = check_column_exists(pool, "productos", "imagen").await?;
    let has_old_inventario_table = check_table_exists(pool, "inventario").await?;
    
    Ok(!has_imagen_column && !has_old_inventario_table)
}

/// Ensure proper indexes exist for performance
async fn ensure_indexes_exist(pool: &SqlitePool) -> Result<bool, sqlx::Error> {
    let mut created_indexes = false;

    // Check and create indexes if they don't exist
    let indexes_to_create = vec![
        ("idx_productos_categoria_id", "productos", "categoria_id"),
        ("idx_producto_fotos_producto_id", "producto_fotos", "producto_id"),
        ("idx_categorias_padre_id", "categorias", "categoria_padre_id"),
        ("idx_venta_items_venta_id", "venta_items", "venta_id"),
        ("idx_venta_items_producto_id", "venta_items", "producto_id"),
        ("idx_pagos_venta_id", "pagos", "venta_id"),
        ("idx_ventas_archivado", "ventas", "archivado"),
        ("idx_productos_archivado", "productos", "archivado"),
        ("idx_categorias_archivado", "categorias", "archivado"),
        ("idx_inventory_product_id", "inventory", "product_id"),
        ("idx_settings_key", "settings", "key"),
    ];

    for (index_name, table_name, column_name) in indexes_to_create {
        if !check_index_exists(pool, index_name).await? {
            println!("Creating index {} on {}.{}", index_name, table_name, column_name);
            sqlx::query(&format!(
                "CREATE INDEX IF NOT EXISTS {} ON {}({})",
                index_name, table_name, column_name
            ))
            .execute(pool)
            .await?;
            created_indexes = true;
        }
    }

    Ok(created_indexes)
}

/// Helper function to check if a table exists
async fn check_table_exists(pool: &SqlitePool, table_name: &str) -> Result<bool, sqlx::Error> {
    let count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=?"
    )
    .bind(table_name)
    .fetch_one(pool)
    .await?;
    
    Ok(count > 0)
}

/// Helper function to check if a column exists in a table
async fn check_column_exists(pool: &SqlitePool, table_name: &str, column_name: &str) -> Result<bool, sqlx::Error> {
    let count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM pragma_table_info(?) WHERE name=?"
    )
    .bind(table_name)
    .bind(column_name)
    .fetch_one(pool)
    .await?;
    
    Ok(count > 0)
}

/// Helper function to check if an index exists
async fn check_index_exists(pool: &SqlitePool, index_name: &str) -> Result<bool, sqlx::Error> {
    let count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM sqlite_master WHERE type='index' AND name=?"
    )
    .bind(index_name)
    .fetch_one(pool)
    .await?;
    
    Ok(count > 0)
}