use sqlx::SqlitePool;

/// Migrate settings table if it doesn't exist
pub async fn migrate_settings_table(pool: &SqlitePool) -> Result<bool, sqlx::Error> {
    if check_settings_table_exists(pool).await? {
        return Ok(false); // Already exists
    }

    println!("Creating settings table...");
    
    // Create settings table
    sqlx::query(
        "CREATE TABLE settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )"
    )
    .execute(pool)
    .await?;

    // Create index for better performance
    sqlx::query("CREATE INDEX idx_settings_key ON settings(key)")
    .execute(pool)
    .await?;

    // Insert default settings if needed
    insert_default_settings(pool).await?;

    Ok(true)
}

/// Check if settings table exists
pub async fn check_settings_table_exists(pool: &SqlitePool) -> Result<bool, sqlx::Error> {
    let count: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='settings'"
    )
    .fetch_one(pool)
    .await?;
    
    Ok(count > 0)
}

/// Insert default settings
async fn insert_default_settings(pool: &SqlitePool) -> Result<(), sqlx::Error> {
    // Insert some default settings that might be useful
    let default_settings = vec![
        ("app_version", "1.0.0"),
        ("database_version", "nuevo"),
        ("theme", "light"),
        ("language", "es"),
    ];

    for (key, value) in default_settings {
        sqlx::query(
            "INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)"
        )
        .bind(key)
        .bind(value)
        .execute(pool)
        .await?;
    }

    Ok(())
}