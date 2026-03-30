mod detector;
mod strategies;
mod test_compilation;

pub use detector::DatabaseVersion;
pub use strategies::{migrate_database, MigrationResult};
pub use strategies::{check_product_matching_tables_exist, check_importaciones_table_exists, check_embeddings_cache_table_exists};
pub use test_compilation::test_migration_compilation;

/// Main migration orchestrator that detects database version and applies necessary migrations
pub async fn run_migration_if_needed(pool: &sqlx::SqlitePool) -> Result<(), Box<dyn std::error::Error>> {
    let version = detector::detect_database_version(pool).await?;
    
    match version {
        DatabaseVersion::New => {
            println!("Database is already up to date (Nuevo version)");
        }
        DatabaseVersion::Old => {
            println!("Detected old database version (Desarrollo), starting migration...");
            let result = migrate_database(pool).await?;
            
            match result {
                MigrationResult::Success => {
                    println!("Database migration completed successfully");
                }
                MigrationResult::AlreadyMigrated => {
                    println!("Database was already migrated");
                }
                MigrationResult::Error(error) => {
                    return Err(format!("Migration failed: {}", error).into());
                }
            }
        }
        DatabaseVersion::Empty => {
            println!("Empty database, no migration needed");
        }
    }
    
    Ok(())
}

/// Test migration system by checking database version and migration status
#[tauri::command]
pub async fn test_migration_system(pool: tauri::State<'_, sqlx::SqlitePool>) -> Result<String, String> {
    use crate::migration::detector::{detect_database_version, DatabaseVersion};
    use crate::migration::strategies::{check_settings_table_exists, check_archived_fields_exist, check_inventory_table_exists, check_tags_column_exists, check_no_old_artifacts};

    let version = detect_database_version(&*pool).await.map_err(|e| e.to_string())?;
    
    let mut result = format!("Database Version: {:?}\n", version);
    
    match version {
        DatabaseVersion::New => {
            result.push_str("✓ Database is already up to date (Nuevo version)\n");
        }
        DatabaseVersion::Old => {
            result.push_str("⚠ Database needs migration (Desarrollo version detected)\n");
        }
        DatabaseVersion::Empty => {
            result.push_str("ℹ Empty database, no migration needed\n");
        }
    }

    // Check individual migration components
    result.push_str("\nMigration Component Status:\n");
    
    let has_settings = check_settings_table_exists(&*pool).await.map_err(|e| e.to_string())?;
    result.push_str(&format!("Settings table: {}\n", if has_settings { "✓ Present" } else { "✗ Missing" }));
    
    let has_archived_fields = check_archived_fields_exist(&*pool).await.map_err(|e| e.to_string())?;
    result.push_str(&format!("Archived fields: {}\n", if has_archived_fields { "✓ Present" } else { "✗ Missing" }));
    
    let has_inventory = check_inventory_table_exists(&*pool).await.map_err(|e| e.to_string())?;
    result.push_str(&format!("Inventory table: {}\n", if has_inventory { "✓ Present" } else { "✗ Missing" }));
    
    let has_tags_column = check_tags_column_exists(&*pool).await.map_err(|e| e.to_string())?;
    result.push_str(&format!("Tags column: {}\n", if has_tags_column { "✓ Present" } else { "✗ Missing" }));
    
    let has_product_matching = check_product_matching_tables_exist(&*pool).await.map_err(|e| e.to_string())?;
    result.push_str(&format!("Product matching tables: {}\n", if has_product_matching { "✓ Present" } else { "✗ Missing" }));
    
    let no_old_artifacts = check_no_old_artifacts(&*pool).await.map_err(|e| e.to_string())?;
    result.push_str(&format!("No old artifacts: {}\n", if no_old_artifacts { "✓ Clean" } else { "✗ Found" }));

    // Check if migration is complete
    let migration_complete = has_settings && has_archived_fields && has_inventory && has_tags_column && has_product_matching && no_old_artifacts;
    result.push_str(&format!("\nMigration Status: {}\n", if migration_complete { "✓ Complete" } else { "✗ Incomplete" }));

    Ok(result)
}
