mod settings;
mod archived_fields;
mod inventory;
mod cleanup;
mod product_matching;

use sqlx::SqlitePool;

// Re-export check functions for testing
pub use settings::check_settings_table_exists;
pub use archived_fields::check_archived_fields_exist;
pub use inventory::{check_inventory_table_exists, check_tags_column_exists};
pub use cleanup::check_no_old_artifacts;
pub use product_matching::{check_product_matching_tables_exist, check_importaciones_table_exists, check_embeddings_cache_table_exists};

/// Result of a migration operation
#[derive(Debug, PartialEq)]
pub enum MigrationResult {
    Success,
    AlreadyMigrated,
    Error(String),
}

/// Main migration orchestrator that applies all necessary migrations in order
pub async fn migrate_database(pool: &SqlitePool) -> Result<MigrationResult, Box<dyn std::error::Error>> {
    println!("Starting comprehensive database migration...");
    
    // Check if migration is already complete
    if is_migration_complete(pool).await? {
        println!("Database migration already completed");
        return Ok(MigrationResult::AlreadyMigrated);
    }

    // Apply migrations in order
    let mut migration_count = 0;

    // 1. Create settings table
    if settings::migrate_settings_table(pool).await? {
        migration_count += 1;
        println!("✓ Applied settings table migration");
    }

    // 2. Add archived fields
    if archived_fields::migrate_archived_fields(pool).await? {
        migration_count += 1;
        println!("✓ Applied archived fields migration");
    }

    // 3. Create inventory table and migrate stock data
    if inventory::migrate_inventory_table(pool).await? {
        migration_count += 1;
        println!("✓ Applied inventory table migration");
    }

    // 4. Create product matching tables and add missing columns
    if product_matching::migrate_product_matching_tables(pool).await? {
        migration_count += 1;
        println!("✓ Applied product matching tables migration");
    }

    // 5. Cleanup old migration artifacts
    if cleanup::migrate_cleanup(pool).await? {
        migration_count += 1;
        println!("✓ Applied cleanup migration");
    }

    if migration_count > 0 {
        println!("Migration completed successfully. Applied {} migrations.", migration_count);
        Ok(MigrationResult::Success)
    } else {
        println!("No migrations were needed");
        Ok(MigrationResult::AlreadyMigrated)
    }
}

/// Check if all migrations have already been applied
pub async fn is_migration_complete(pool: &SqlitePool) -> Result<bool, sqlx::Error> {
    // Check if all new features are present
    let has_settings = settings::check_settings_table_exists(pool).await?;
    let has_archived_fields = archived_fields::check_archived_fields_exist(pool).await?;
    let has_inventory = inventory::check_inventory_table_exists(pool).await?;
    let has_tags_column = inventory::check_tags_column_exists(pool).await?;
    let has_product_matching = product_matching::check_product_matching_tables_exist(pool).await?;
    let no_old_artifacts = cleanup::check_no_old_artifacts(pool).await?;

    Ok(has_settings && has_archived_fields && has_inventory && has_tags_column && has_product_matching && no_old_artifacts)
}
