use sqlx::SqlitePool;

/// Migrate archived fields to main tables if they don't exist
pub async fn migrate_archived_fields(pool: &SqlitePool) -> Result<bool, sqlx::Error> {
    let mut migrated = false;

    // Add archived field to ventas table
    if !check_column_exists(pool, "ventas", "archivado").await? {
        println!("Adding archivado field to ventas table...");
        sqlx::query("ALTER TABLE ventas ADD COLUMN archivado BOOLEAN DEFAULT 0")
            .execute(pool)
            .await?;
        
        // Create index for better performance
        sqlx::query("CREATE INDEX idx_ventas_archivado ON ventas(archivado)")
            .execute(pool)
            .await?;
        
        // Update existing records to be active (not archived)
        sqlx::query("UPDATE ventas SET archivado = 0")
            .execute(pool)
            .await?;
        
        migrated = true;
    }

    // Add archived field to productos table
    if !check_column_exists(pool, "productos", "archivado").await? {
        println!("Adding archivado field to productos table...");
        sqlx::query("ALTER TABLE productos ADD COLUMN archivado BOOLEAN DEFAULT 0")
            .execute(pool)
            .await?;
        
        // Create index for better performance
        sqlx::query("CREATE INDEX idx_productos_archivado ON productos(archivado)")
            .execute(pool)
            .await?;
        
        // Update existing records to be active (not archived)
        sqlx::query("UPDATE productos SET archivado = 0")
            .execute(pool)
            .await?;
        
        migrated = true;
    }

    // Add archived field to categorias table
    if !check_column_exists(pool, "categorias", "archivado").await? {
        println!("Adding archivado field to categorias table...");
        sqlx::query("ALTER TABLE categorias ADD COLUMN archivado BOOLEAN DEFAULT 0")
            .execute(pool)
            .await?;
        
        // Create index for better performance
        sqlx::query("CREATE INDEX idx_categorias_archivado ON categorias(archivado)")
            .execute(pool)
            .await?;
        
        // Update existing records to be active (not archived)
        sqlx::query("UPDATE categorias SET archivado = 0")
            .execute(pool)
            .await?;
        
        migrated = true;
    }

    Ok(migrated)
}

/// Check if archived fields exist in main tables
pub async fn check_archived_fields_exist(pool: &SqlitePool) -> Result<bool, sqlx::Error> {
    let ventas_has_archivado = check_column_exists(pool, "ventas", "archivado").await?;
    let productos_has_archivado = check_column_exists(pool, "productos", "archivado").await?;
    let categorias_has_archivado = check_column_exists(pool, "categorias", "archivado").await?;
    
    Ok(ventas_has_archivado && productos_has_archivado && categorias_has_archivado)
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