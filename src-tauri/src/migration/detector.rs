use sqlx::SqlitePool;

/// Represents the detected version of the database
#[derive(Debug, PartialEq)]
pub enum DatabaseVersion {
    /// New database with all current features
    New,
    /// Old database from Desarrollo version that needs migration
    Old,
    /// Empty database with no tables
    Empty,
}

/// Detects the version of the database by checking for specific features and structures
pub async fn detect_database_version(pool: &SqlitePool) -> Result<DatabaseVersion, sqlx::Error> {
    // Check if database is empty (no tables)
    let table_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM sqlite_master WHERE type='table'")
        .fetch_one(pool)
        .await?;

    if table_count == 0 {
        return Ok(DatabaseVersion::Empty);
    }

    // Check for key indicators of old vs new database
    let has_settings_table = check_table_exists(pool, "settings").await?;
    let has_archived_fields = check_archived_fields_exist(pool).await?;
    let has_inventory_table = check_table_exists(pool, "inventory").await?;
    let has_old_inventario_table = check_table_exists(pool, "inventario").await?;
    let has_imagen_column = check_column_exists(pool, "productos", "imagen").await?;
    let has_tags_column = check_column_exists(pool, "productos", "tags").await?;

    // Determine version based on feature presence
    let is_new_version = has_settings_table 
        && has_archived_fields 
        && has_inventory_table
        && !has_old_inventario_table
        && !has_imagen_column
        && has_tags_column;

    if is_new_version {
        Ok(DatabaseVersion::New)
    } else {
        Ok(DatabaseVersion::Old)
    }
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

/// Helper function to check if archived fields exist in main tables
async fn check_archived_fields_exist(pool: &SqlitePool) -> Result<bool, sqlx::Error> {
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

