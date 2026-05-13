# Backend Documentation (Rust / Tauri)

## Overview

The backend is written in **Rust** using the **Tauri v2** framework. It provides all business logic, database access, and IPC command handlers that the frontend consumes. The code is organized into self-contained modules following a layered architecture.

## Entry Points

### `main.rs`
Application entry point. Calls `modules::register_modules()` on a `tauri::Builder` and runs the application.

```rust
fn main() {
    modules::register_modules(tauri::Builder::default())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### `lib.rs`
Library root that re-exports the public API:
- `db` module (database initialization)
- `migration` module (schema migration orchestrator)
- `modules` module (all business modules)

### `db.rs`
Database initialization and migration management.

**`init_db()`** — Asynchronous function that:
1. Creates the SQLite database file (`app.db`) in the project root directory.
2. Establishes a connection pool (max 5 connections).
3. Detects if the database is empty (no tables) or has existing tables.
4. Runs SQLx migrations or applies embedded SQL fallback.
5. Verifies all required tables and columns exist.
6. Creates/populates the `_sqlx_migrations` tracking table if needed.
7. Prints diagnostic information about applied migrations.

#### Migration Strategy Details

The migration system is designed to be resilient across different development stages:

- **Empty database**: Runs all SQLx migrations from the `migrations/` directory.
- **Existing database without `_sqlx_migrations` table**: Checks each table/column individually and applies only missing migrations, then creates the tracking table.
- **Existing database with `_sqlx_migrations`**: Checks for missing tables and applies any that are absent.
- **Fallback**: If SQLx migration fails, applies SQL directly from embedded strings (`include_str!`) for each migration.

## Module Structure

Each module follows a consistent pattern:

```
modules/{domain}/
├── mod.rs          — Module declaration, re-exports, optional get_commands()
├── commands.rs     — Tauri #[tauri::command] functions (IPC handlers)
├── service.rs      — Business logic
├── db.rs           — SQL queries and data access
└── models.rs       — Data structures with serde serialization
```

### Module Registration

All modules are registered through `modules/mod.rs` → `register_modules()`:

```rust
pub fn register_modules<R: Runtime>(builder: Builder<R>) -> Builder<R> {
    builder
        .setup(|app| {
            // Initialize database pool
            let pool = tauri::async_runtime::block_on(async {
                crate::db::init_db().await
            });
            app.manage(pool);
            
            // Initialize ProductMatchingService
            let matching_service = /* ... */;
            app.manage(pm_state);
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // All commands from all modules
            catalogue::get_productos,
            sales::register_sale,
            // ... etc
        ])
}
```

**State management**: Database pool and ProductMatchingService are stored as Tauri managed state, accessible in command handlers via `State<'_, SqlitePool>`.

## Module: Catalogue

**Path**: `modules/catalogue/`

### Commands

| Command                          | Parameters                                    | Returns              | Description                          |
|----------------------------------|-----------------------------------------------|----------------------|--------------------------------------|
| `get_productos`                  | `page`, `pageSize`, `searchQuery`, `categoriaId` | `ProductoResponse`   | Paginated product listing with filters |
| `create_producto`                | `producto: CrearProducto`                     | `Producto`           | Create a new product                  |
| `update_producto`                | `producto: ActualizarProducto`                | `Producto`           | Update an existing product            |
| `delete_producto`                | `product_id: i32`                             | `()`                 | Delete a product                     |
| `get_categorias`                 | —                                              | `Vec<Categoria>`     | Get all categories                    |
| `create_categoria`               | `categoria: CrearCategoria`                   | `Categoria`          | Create a new category                 |
| `delete_categoria`               | `categoria_id: i32`                           | `()`                 | Delete a category                    |
| `get_producto_by_id`             | `product_id: i32`                             | `Producto`           | Get a single product by ID           |
| `migrate_product_stock_to_inventory` | —                                        | `()`                 | Migrate stock from products to inventory table |
| `exportar_catalogo_excel`        | —                                              | `Vec<u8>`            | Export catalogue as CSV bytes        |
| `exportar_catalogo_pdf`          | —                                              | `Vec<u8>`            | Export catalogue as PDF bytes        |
| `reimportar_precios_catalogo`    | `archivo_contenido: Vec<u8>`, `nombre_archivo: String` | `ReimportarPreciosResult` | Import prices from CSV/Excel |

### Key Models

```rust
struct Producto { id, nombre, descripcion, costo, stock, categoria_id, foto, tags, archivado, created_at, updated_at }
struct Categoria { id, nombre, descripcion, categoria_padre_id }
struct CrearProducto { nombre, descripcion?, costo, stock, categoria_id?, foto?, tags? }
struct ActualizarProducto { id, nombre?, descripcion?, costo?, stock?, categoria_id?, foto?, tags? }
struct ProductoResponse { data: Vec<Producto>, total: i32 }
struct ReimportarPreciosResult { total_procesados: i32, actualizados: i32, errores: Vec<String> }
```

### Export Features

- **Excel (CSV)**: Generates a CSV file with columns: Nombre, Precio, Descripcion, Stock, Categoria, Tags. This CSV can be reimported to update prices.
- **PDF**: Generates a multi-page PDF using `printpdf` with:
  - Title and page numbering
  - Category hierarchy with indentation
  - Product tables (Name, Price, Stock, Category)
  - Automatic page breaks
  - Section dividers between categories

## Module: Sales

**Path**: `modules/sales/`

### Commands

| Command                        | Parameters                                | Returns                | Description                        |
|--------------------------------|-------------------------------------------|------------------------|------------------------------------|
| `register_sale`                | sale data                                 | `Venta`               | Register a new sale                |
| `get_sales_history`            | —                                          | `Vec<Venta>`          | Get all sales history              |
| `delete_sale`                  | `venta_id: i32`                           | `()`                  | Delete a sale                      |
| `archive_sale`                 | `venta_id: i32`                           | `()`                  | Archive a sale                     |
| `unarchive_sale`               | `venta_id: i32`                           | `()`                  | Restore an archived sale           |
| `get_archived_sales`           | —                                          | `Vec<Venta>`          | Get archived sales                 |
| `get_sales_history_with_filter`| filter params                             | `Vec<Venta>`          | Get sales with filtering           |

## Module: Stock

**Path**: `modules/stock/`

### Commands

| Command                | Parameters                            | Returns                | Description                      |
|------------------------|---------------------------------------|------------------------|----------------------------------|
| `get_inventory_list`   | `search_query`, `categoria_id`, filters | `Vec<InventoryItem>`  | Get inventory list with filters  |
| `update_stock_manually`| `product_id`, `new_stock`             | `()`                  | Set stock to a specific value    |
| `adjust_stock`         | `product_id`, `quantity_change`, `reason` | `()`               | Adjust stock up/down with reason |

## Module: Settings

**Path**: `modules/settings/`

### Commands

| Command          | Parameters                  | Returns       | Description                    |
|------------------|-----------------------------|---------------|--------------------------------|
| `get_settings`   | —                           | `SettingsMap` | Get all settings as key-value map |
| `save_settings`  | `settings: SettingsMap`     | `()`          | Save/update settings           |

Settings are stored as key-value pairs in the `settings` table, supporting types: theme_name, theme_variant, font_size, and KPI visibility flags.

## Module: Dashboard

**Path**: `modules/dashboard/`

### Commands

| Command               | Parameters | Returns              | Description                      |
|-----------------------|------------|----------------------|----------------------------------|
| `get_dashboard_data`  | —          | `DashboardData`      | Get full dashboard data          |
| `get_dashboard_stats` | —          | `DashboardStats`     | Get KPI statistics               |
| `get_sales_trend`     | —          | `Vec<SalesTrend>`    | Get sales trend data             |
| `get_inventory_status`| —          | `Vec<InventoryStatus>`| Get inventory status summary    |
| `get_kpi_config`      | —          | `KpiConfig`          | Get KPI visibility configuration |
| `update_kpi_config`   | `config: KpiConfig` | `()`            | Update KPI visibility settings   |

**DashboardStats** includes: `total_products`, `today_sales`, `low_stock_items`, `active_categories`, `total_revenue`, `sales_count`.

## Module: Product Matching

**Path**: `modules/product_matching/`

This module handles importing supplier price lists and matching them against internal products.

### Sub-modules

| File            | Purpose                                                    |
|-----------------|------------------------------------------------------------|
| `models.rs`     | Data structures for imports, matches, supplier products    |
| `parser.rs`     | File parsing (Excel/CSV) using `calamine`                  |
| `embeddings.rs` | Text embedding generation using character n-grams          |
| `service.rs`    | Matching service with fuzzy string comparison              |
| `commands.rs`   | Tauri IPC command handlers                                 |
| `db.rs`         | Database access for matching tables                        |

### Matching Strategy

1. **Name Normalization**: Both internal and supplier product names are normalized (lowercased, special characters removed, abbreviations expanded).
2. **Fuzzy Matching**: Uses normalized Levenshtein distance and substring similarity to find potential matches.
3. **Embedding Matching**: Character n-gram embeddings are computed and compared using cosine similarity for improved matching accuracy.
4. **Scoring**: Matches are scored and ranked, with configurable confidence thresholds.

### Commands

| Command                          | Parameters                                    | Returns                    | Description                              |
|----------------------------------|-----------------------------------------------|----------------------------|------------------------------------------|
| `importar_lista_proveedor`       | File bytes + filename                         | `ImportacionResult`        | Import supplier price list                |
| `ejecutar_matching`              | `importacion_id: i32`                         | `MatchingResult`           | Execute matching for an import           |
| `get_importaciones`              | —                                             | `Vec<Importacion>`         | Get all imports                          |
| `get_resultados_matching`        | `importacion_id: i32`                         | `Vec<MatchResult>`         | Get matching results for an import       |
| `get_productos_internos`         | Search params                                 | `Vec<InternalProduct>`     | Get internal products for manual matching|
| `confirmar_match`                | `match_id: i32`                               | `()`                       | Confirm a proposed match                 |
| `rechazar_match`                 | `match_id: i32`                               | `()`                       | Reject a proposed match                  |
| `get_matching_stats`             | —                                             | `MatchingStats`            | Get matching statistics                  |
| `importar_y_matchear`            | File bytes + filename                         | `MatchingResult`           | Import and match in one step             |
| `aplicar_actualizacion_precios`  | `importacion_id: i32`                         | `PriceUpdateResult`        | Apply confirmed price updates            |
| `exportar_resultados_excel`      | `importacion_id: i32`                         | `Vec<u8>`                  | Export matching results as CSV           |
| `reimportar_precios_excel`       | File bytes + filename                         | `ReimportPreciosResult`    | Reimport prices from standard catalog export |

## Migration System

**Path**: `migration/`

### Components

| File                   | Purpose                                               |
|------------------------|-------------------------------------------------------|
| `mod.rs`               | Orchestrator (`run_migration_if_needed`, `test_migration_system`) |
| `detector.rs`          | Database version detection (New, Old/Desarrollo, Empty) |
| `strategies.rs`        | Migration strategies and individual component checks   |
| `test_compilation.rs`  | Compilation test utilities                             |

### Database Version Detection

The detector classifies a database as:
- **New** — Has the `settings` table present (post-migration schema).
- **Old** — Has old tables but lacks migration indicators.
- **Empty** — No tables at all.

### `test_migration_system` Command

A diagnostic Tauri command that reports the status of each migration component:
- Settings table presence
- Archived fields presence
- Inventory table presence
- Tags column presence
- Product matching tables presence
- Old artifact cleanup status

## Dependencies (Cargo.toml)

| Crate          | Version | Purpose                            |
|----------------|---------|------------------------------------|
| tauri          | 2.6.1   | Application framework              |
| sqlx           | 0.7     | SQLite database with migrations    |
| tokio          | 1.37    | Async runtime                      |
| serde          | 1.0     | Serialization/deserialization      |
| serde_json     | 1.0     | JSON handling                      |
| chrono         | 0.4     | Date/time with serde support       |
| printpdf       | 0.5     | PDF generation                     |
| calamine       | 0.26    | Excel file parsing                 |
| bcrypt         | 0.15    | Password hashing                    |
| uuid           | 1.0     | Unique ID generation               |
| thiserror      | 1.0     | Error handling                     |
| tauri-plugin-fs| 2.4.0   | Filesystem plugin                  |
| tauri-plugin-log| 2      | Logging plugin                     |