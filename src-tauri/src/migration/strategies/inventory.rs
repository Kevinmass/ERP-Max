use sqlx::SqlitePool;

/// Migrate inventory table and migrate stock data from productos.stock to inventory table
pub async fn migrate_inventory_table(pool: &SqlitePool) -> Result<bool, sqlx::Error> {
    let mut migrated = false;

    // Check if old 'inventario' table exists and drop it first
    if check_table_exists(pool, "inventario").await? {
        println!("Found old 'inventario' table, dropping it...");
        sqlx::query("DROP TABLE IF EXISTS inventario")
            .execute(pool)
            .await?;
        println!("Dropped old 'inventario' table.");
    }

    // Create inventory table if it doesn't exist
    if !check_inventory_table_exists(pool).await? {
        println!("Creating inventory table...");
        
        sqlx::query(
            "CREATE TABLE inventory (
                product_id INTEGER PRIMARY KEY,
                quantity INTEGER NOT NULL DEFAULT 0,
                min_stock_level INTEGER NOT NULL DEFAULT 0,
                FOREIGN KEY (product_id) REFERENCES productos (id) ON DELETE CASCADE
            )"
        )
        .execute(pool)
        .await?;

        // Create index for better performance
        sqlx::query("CREATE INDEX idx_inventory_product_id ON inventory(product_id)")
            .execute(pool)
            .await?;
        
        migrated = true;
    }

    // Migrate stock data from productos.stock to inventory table
    if migrate_stock_data(pool).await? {
        migrated = true;
    }

    // Add tags column to productos if it doesn't exist
    if !check_tags_column_exists(pool).await? {
        println!("Adding tags column to productos table...");
        sqlx::query("ALTER TABLE productos ADD COLUMN tags TEXT")
            .execute(pool)
            .await?;
        migrated = true;
    }

    Ok(migrated)
}

/// Check if inventory table exists
pub async fn check_inventory_table_exists(pool: &SqlitePool) -> Result<bool, sqlx::Error> {
    let count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='inventory'"
    )
    .fetch_one(pool)
    .await?;
    
    Ok(count > 0)
}

/// Check if tags column exists in productos table
pub async fn check_tags_column_exists(pool: &SqlitePool) -> Result<bool, sqlx::Error> {
    check_column_exists(pool, "productos", "tags").await
}

/// Migrate stock data from productos.stock to inventory table
async fn migrate_stock_data(pool: &SqlitePool) -> Result<bool, sqlx::Error> {
    // Check if there's any stock data to migrate
    let stock_data_exists: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM productos WHERE stock > 0"
    )
    .fetch_one(pool)
    .await?;

    if stock_data_exists == 0 {
        return Ok(false);
    }

    println!("Migrating stock data from productos.stock to inventory table...");

    // Insert stock data into inventory table
    sqlx::query(
        "INSERT OR IGNORE INTO inventory (product_id, quantity, min_stock_level)
         SELECT id, stock, 0 FROM productos WHERE stock > 0"
    )
    .execute(pool)
    .await?;

    println!("Stock data migration completed");
    Ok(true)
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