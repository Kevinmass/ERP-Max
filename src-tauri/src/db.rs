use sqlx::sqlite::{SqlitePool, SqlitePoolOptions, SqliteConnectOptions};
use sqlx::Row;
use std::env;
use std::fs;
use std::collections::HashSet;

// Import migration modules from lib.rs

pub async fn init_db() -> Result<SqlitePool, Box<dyn std::error::Error>> {
    // Use project root directory for database storage (consistent location for both frontend and backend)
    let current_dir = env::current_dir()?;
    let db_path = current_dir.join("app.db");
    println!("Database path: {:?}", db_path);

    // Ensure the directory exists
    fs::create_dir_all(&current_dir)?;

    // Use connect options to avoid URI parsing issues on Windows and allow create-if-missing
    let db_path_str = db_path.to_str().ok_or("Invalid database path")?;
    println!("Connecting to database at path: {}", db_path_str);

    // Print some diagnostics
    println!("current_dir exists: {}", current_dir.exists());
    if let Ok(meta) = fs::metadata(&current_dir) {
        println!("current_dir is_dir: {}, permissions: {:?}", meta.is_dir(), meta.permissions());
    }

    let mut connect_opts = SqliteConnectOptions::new();
    connect_opts = connect_opts.filename(db_path_str).create_if_missing(true);

    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect_with(connect_opts)
        .await?;

    // Check if database is empty (no tables exist)
    let table_count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM sqlite_master WHERE type='table'")
        .fetch_one(&pool)
        .await
        .unwrap_or(0);

    if table_count == 0 {
        println!("Database is empty, applying all migrations...");
        // Run migrations using SQLx
        match sqlx::migrate!("./migrations").run(&pool).await {
            Ok(_) => {
                println!("SQLx migrations applied successfully");
            }
            Err(e) => {
                eprintln!("SQLx migration failed: {}", e);
                // Fallback to manual migration application
                println!("Falling back to manual migration application...");
                
                // Apply initial schema
                const INITIAL_SQL: &str = include_str!("../migrations/20240101_initial_schema/up.sql");
                sqlx::query(INITIAL_SQL)
                    .execute(&pool)
                    .await
                    .map_err(|e| {
                        eprintln!("Failed to apply embedded initial schema: {}", e);
                        e
                    })?;
                
                // Apply inventory migration
                const INVENTORY_SQL: &str = include_str!("../migrations/20251218_create_inventory_table/up.sql");
                sqlx::query(INVENTORY_SQL)
                    .execute(&pool)
                    .await
                    .map_err(|e| {
                        eprintln!("Failed to apply embedded inventory migration: {}", e);
                        e
                    })?;
                
                // Apply settings migration
                const SETTINGS_SQL: &str = include_str!("../migrations/20251222_create_settings_table/up.sql");
                sqlx::query(SETTINGS_SQL)
                    .execute(&pool)
                    .await
                    .map_err(|e| {
                        eprintln!("Failed to apply embedded settings migration: {}", e);
                        e
                    })?;
                
                // Apply archived field migration
                const ARCHIVADO_SQL: &str = include_str!("../migrations/20251223_add_archived_field/up.sql");
                sqlx::query(ARCHIVADO_SQL)
                    .execute(&pool)
                    .await
                    .map_err(|e| {
                        eprintln!("Failed to apply embedded archivado migration: {}", e);
                        e
                    })?;
                
                println!("Manual migrations applied successfully");
            }
        }
    } else {
        println!("Database already has tables, checking for missing migrations...");
        
        // Check if _sqlx_migrations table exists
        let migrations_exists: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='_sqlx_migrations'")
            .fetch_one(&pool)
            .await?;
        
        if migrations_exists == 0 {
            println!("_sqlx_migrations table missing — this indicates a migration issue. Applying all migrations manually...");
            
            // Apply all migrations manually since SQLx can't track them
            // Apply initial schema
            let productos_exists = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='productos'")
                .fetch_one(&pool)
                .await?;
            if productos_exists == 0 {
                println!("'productos' table missing — applying embedded initial schema...");
                const INITIAL_SQL: &str = include_str!("../migrations/20240101_initial_schema/up.sql");
                sqlx::query(INITIAL_SQL)
                    .execute(&pool)
                    .await
                    .map_err(|e| {
                        eprintln!("Failed to apply embedded initial schema: {}", e);
                        e
                    })?;
                println!("Applied embedded initial schema.");
            }

            // Apply inventory migration
            let inventory_exists = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='inventory'")
                .fetch_one(&pool)
                .await?;
            if inventory_exists == 0 {
                // Check if old 'inventario' table exists and drop it first
                let inventario_exists = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='inventario'")
                    .fetch_one(&pool)
                    .await?;
                if inventario_exists > 0 {
                    println!("Found old 'inventario' table, dropping it...");
                    sqlx::query("DROP TABLE IF EXISTS inventario")
                        .execute(&pool)
                        .await
                        .map_err(|e| {
                            eprintln!("Failed to drop old inventario table: {}", e);
                            e
                        })?;
                    println!("Dropped old 'inventario' table.");
                }
                
                println!("'inventory' table missing — applying embedded inventory migration...");
                const INVENTORY_SQL: &str = include_str!("../migrations/20251218_create_inventory_table/up.sql");
                sqlx::query(INVENTORY_SQL)
                    .execute(&pool)
                    .await
                    .map_err(|e| {
                        eprintln!("Failed to apply embedded inventory migration: {}", e);
                        e
                    })?;
                println!("Applied embedded inventory migration.");
            }

            // Apply settings migration
            let settings_exists = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='settings'")
                .fetch_one(&pool)
                .await?;
            if settings_exists == 0 {
                println!("'settings' table missing — applying embedded settings migration...");
                const SETTINGS_SQL: &str = include_str!("../migrations/20251222_create_settings_table/up.sql");
                sqlx::query(SETTINGS_SQL)
                    .execute(&pool)
                    .await
                    .map_err(|e| {
                        eprintln!("Failed to apply embedded settings migration: {}", e);
                        e
                    })?;
                println!("Applied embedded settings migration.");
            }

            // Apply archived field migration
            let ventas_archivado_exists = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM pragma_table_info('ventas') WHERE name='archivado'")
                .fetch_one(&pool)
                .await?;
            let productos_archivado_exists = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM pragma_table_info('productos') WHERE name='archivado'")
                .fetch_one(&pool)
                .await?;
            let categorias_archivado_exists = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM pragma_table_info('categorias') WHERE name='archivado'")
                .fetch_one(&pool)
                .await?;
            
            if ventas_archivado_exists == 0 || productos_archivado_exists == 0 || categorias_archivado_exists == 0 {
                println!("'archivado' column missing in one or more tables — applying embedded archivado migration...");
                const ARCHIVADO_SQL: &str = include_str!("../migrations/20251223_add_archived_field/up.sql");
                sqlx::query(ARCHIVADO_SQL)
                    .execute(&pool)
                    .await
                    .map_err(|e| {
                        eprintln!("Failed to apply embedded archivado migration: {}", e);
                        e
                    })?;
                println!("Applied embedded archivado migration.");
            }
            
            println!("All migrations applied successfully. Creating _sqlx_migrations table...");
            
            // Create the _sqlx_migrations table manually to prevent future issues
            sqlx::query(
                "CREATE TABLE IF NOT EXISTS _sqlx_migrations (
                    version TEXT PRIMARY KEY,
                    description TEXT NOT NULL,
                    installed_on TEXT NOT NULL DEFAULT (datetime('now')),
                    success BOOLEAN NOT NULL,
                    checksum TEXT NOT NULL,
                    execution_time BIGINT
                )"
            )
            .execute(&pool)
            .await
            .map_err(|e| {
                eprintln!("Failed to create _sqlx_migrations table: {}", e);
                e
            })?;
            
            // Insert migration records for the migrations we just applied
            let migrations = vec![
                ("20240101_initial_schema", "Initial schema with categories, productos, producto_fotos, etiquetas, producto_etiquetas, ventas, venta_items, pagos"),
                ("20251218_create_inventory_table", "Create inventory table for stock management"),
                ("20251222_create_settings_table", "Create settings table for application configuration"),
                ("20251223_add_archived_field", "Add archivado field to ventas, productos, and categorias tables"),
            ];
            
            for (version, description) in migrations {
                sqlx::query(
                    "INSERT OR IGNORE INTO _sqlx_migrations (version, description, success, checksum, execution_time) 
                     VALUES (?, ?, 1, 'manual_migration', 0)"
                )
                .bind(version)
                .bind(description)
                .execute(&pool)
                .await
                .map_err(|e| {
                    eprintln!("Failed to insert migration record for {}: {}", version, e);
                    e
                })?;
            }
            
            println!("_sqlx_migrations table created and populated successfully.");
        } else {
            // Database has _sqlx_migrations table, check for missing migrations
            // Check if specific tables exist and apply missing migrations
            let productos_exists = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='productos'")
                .fetch_one(&pool)
                .await?;
            let inventory_exists = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='inventory'")
                .fetch_one(&pool)
                .await?;
            let settings_exists = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='settings'")
                .fetch_one(&pool)
                .await?;

            // Apply migrations if tables are missing
            if productos_exists == 0 {
                println!("'productos' table missing — applying embedded initial schema...");
                const INITIAL_SQL: &str = include_str!("../migrations/20240101_initial_schema/up.sql");
                sqlx::query(INITIAL_SQL)
                    .execute(&pool)
                    .await
                    .map_err(|e| {
                        eprintln!("Failed to apply embedded initial schema: {}", e);
                        e
                    })?;
                println!("Applied embedded initial schema.");
            }

            if inventory_exists == 0 {
                // Check if old 'inventario' table exists and drop it first
                let inventario_exists = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='inventario'")
                    .fetch_one(&pool)
                    .await?;
                if inventario_exists > 0 {
                    println!("Found old 'inventario' table, dropping it...");
                    sqlx::query("DROP TABLE IF EXISTS inventario")
                        .execute(&pool)
                        .await
                        .map_err(|e| {
                            eprintln!("Failed to drop old inventario table: {}", e);
                            e
                        })?;
                    println!("Dropped old 'inventario' table.");
                }
                
                println!("'inventory' table missing — applying embedded inventory migration...");
                const INVENTORY_SQL: &str = include_str!("../migrations/20251218_create_inventory_table/up.sql");
                sqlx::query(INVENTORY_SQL)
                    .execute(&pool)
                    .await
                    .map_err(|e| {
                        eprintln!("Failed to apply embedded inventory migration: {}", e);
                        e
                    })?;
                println!("Applied embedded inventory migration.");
            }

            if settings_exists == 0 {
                println!("'settings' table missing — applying embedded settings migration...");
                const SETTINGS_SQL: &str = include_str!("../migrations/20251222_create_settings_table/up.sql");
                sqlx::query(SETTINGS_SQL)
                    .execute(&pool)
                    .await
                    .map_err(|e| {
                        eprintln!("Failed to apply embedded settings migration: {}", e);
                        e
                    })?;
                println!("Applied embedded settings migration.");
            }

            // Check for archivado column in tables
            let ventas_archivado_exists = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM pragma_table_info('ventas') WHERE name='archivado'")
                .fetch_one(&pool)
                .await?;
            let productos_archivado_exists = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM pragma_table_info('productos') WHERE name='archivado'")
                .fetch_one(&pool)
                .await?;
            let categorias_archivado_exists = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM pragma_table_info('categorias') WHERE name='archivado'")
                .fetch_one(&pool)
                .await?;
            
            if ventas_archivado_exists == 0 || productos_archivado_exists == 0 || categorias_archivado_exists == 0 {
                println!("'archivado' column missing in one or more tables — applying embedded archivado migration...");
                const ARCHIVADO_SQL: &str = include_str!("../migrations/20251223_add_archived_field/up.sql");
                sqlx::query(ARCHIVADO_SQL)
                    .execute(&pool)
                    .await
                    .map_err(|e| {
                        eprintln!("Failed to apply embedded archivado migration: {}", e);
                        e
                    })?;
                println!("Applied embedded archivado migration.");
            }
        }
    }

    // ── Post-migration column guards (idempotent) ───────────────────────────
    // Additive columns introduced after the original 4 migrations are ensured
    // here so they exist on every database regardless of which migration branch
    // above executed (fresh install, legacy DB, or partially-migrated DB). Each
    // is guarded by a pragma check, so re-running is always a no-op.

    // venta_items.precio_unitario — the actual unit price charged at sale time.
    // Without it, historical sales are recomputed from a product's *current*
    // price, so past receipts silently change when a price is updated.
    let venta_precio_exists: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM pragma_table_info('venta_items') WHERE name='precio_unitario'"
    )
    .fetch_one(&pool)
    .await
    .unwrap_or(0);
    if venta_precio_exists == 0 {
        println!("Adding missing column venta_items.precio_unitario...");
        sqlx::query("ALTER TABLE venta_items ADD COLUMN precio_unitario REAL")
            .execute(&pool)
            .await
            .map_err(|e| {
                eprintln!("Failed to add venta_items.precio_unitario column: {}", e);
                e
            })?;
        println!("Added venta_items.precio_unitario column.");
    }

    // productos.precio_compra — the true purchase cost, distinct from `costo`
    // (which holds the selling price). Nullable: unknown until entered or imported.
    let precio_compra_exists: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM pragma_table_info('productos') WHERE name='precio_compra'"
    )
    .fetch_one(&pool)
    .await
    .unwrap_or(0);
    if precio_compra_exists == 0 {
        println!("Adding missing column productos.precio_compra...");
        sqlx::query("ALTER TABLE productos ADD COLUMN precio_compra REAL")
            .execute(&pool)
            .await
            .map_err(|e| {
                eprintln!("Failed to add productos.precio_compra column: {}", e);
                e
            })?;
        println!("Added productos.precio_compra column.");
    }

    // Print tables for diagnostics (helps verify migrations applied)
    let rows = sqlx::query("SELECT name FROM sqlite_master WHERE type='table'")
        .fetch_all(&pool)
        .await?;
    println!("Database tables after migrations:");
    for r in rows {
        let name: Option<String> = r.try_get("name").ok();
        if let Some(n) = name {
            println!(" - {}", n);
        }
    }

    // Print applied migrations from _sqlx_migrations for debugging
    // First, inspect columns to avoid assuming a particular schema
    let info_rows = sqlx::query("PRAGMA table_info('_sqlx_migrations')")
        .fetch_all(&pool)
        .await?;
    let mut cols = HashSet::new();
    for c in info_rows {
        if let Ok(name) = c.try_get::<String, _>("name") {
            cols.insert(name);
        }
    }

    let mut fields = vec!["version", "description"];
    // Detect which timestamp column exists in this _sqlx_migrations table (names vary by sqlx version)
    let applied_col = if cols.contains("applied_on") {
        Some("applied_on")
    } else if cols.contains("installed_on") {
        Some("installed_on")
    } else if cols.contains("applied_at") {
        Some("applied_at")
    } else {
        None
    };

    if let Some(col) = applied_col {
        fields.push(col);
    }

    let query = format!("SELECT {} FROM _sqlx_migrations ORDER BY version", fields.join(", "));
    let mig_rows = sqlx::query(&query).fetch_all(&pool).await?;
    println!("Applied migrations:");
    for m in mig_rows {
        let version: Option<String> = m.try_get("version").ok();
        let desc: Option<String> = m.try_get("description").ok();
        let applied: Option<String> = applied_col
            .and_then(|col| m.try_get(col).ok());
        println!(" - {} | {} | {}", version.unwrap_or_default(), desc.unwrap_or_default(), applied.unwrap_or_default());
    }

    println!("Migration check completed successfully");

    println!("Database initialized and migrations applied successfully at: {:?}", db_path);

    Ok(pool)
}
