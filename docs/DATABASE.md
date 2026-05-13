# Database Documentation

## Overview

The system uses **SQLite** as its database engine, managed through **sqlx** (v0.7) with the SQLite/Tokio runtime. The database file (`app.db`) is created automatically in the project root directory on first application launch.

## Connection Management

- **Pool**: SQLite connection pool with max 5 connections.
- **Initialization**: Managed by `db.rs` → `init_db()` which runs on application startup.
- **Auto-migration**: Tables are created and updated automatically using embedded migration files.

## Schema

### Table: `categorias`

Stores product categories in a hierarchical (parent-child) structure.

| Column              | Type    | Constraints                    | Description                     |
|---------------------|---------|--------------------------------|---------------------------------|
| `id`                | INTEGER | PRIMARY KEY AUTOINCREMENT      | Unique category ID              |
| `nombre`            | TEXT    | NOT NULL                       | Category name                   |
| `descripcion`       | TEXT    |                                | Optional description            |
| `categoria_padre_id`| INTEGER | REFERENCES categorias(id) ON DELETE SET NULL | Parent category ID (self-referential FK) |
| `archivado`         | INTEGER | DEFAULT 0                      | Soft-delete flag (0 = active, 1 = archived) |

**Indexes**: `idx_categorias_padre_id` on `categoria_padre_id`, `idx_categorias_archivado` on `archivado`

### Table: `productos`

Stores product catalog items.

| Column        | Type    | Constraints                       | Description                 |
|---------------|---------|-----------------------------------|-----------------------------|
| `id`          | INTEGER | PRIMARY KEY AUTOINCREMENT         | Unique product ID           |
| `nombre`      | TEXT    | NOT NULL                          | Product name                |
| `descripcion` | TEXT    |                                   | Product description         |
| `costo`       | REAL    | NOT NULL                          | Price/cost                  |
| `stock`       | INTEGER | NOT NULL DEFAULT 0                | Current stock quantity      |
| `categoria_id`| INTEGER | REFERENCES categorias(id) ON DELETE SET NULL | Category assignment |
| `tags`        | TEXT    |                                   | Comma-separated tags        |
| `archivado`   | INTEGER | DEFAULT 0                         | Soft-delete flag            |

**Indexes**: `idx_productos_categoria_id` on `categoria_id`, `idx_productos_archivado` on `archivado`

### Table: `producto_fotos`

Stores product photos as Base64-encoded strings.

| Column           | Type    | Constraints                           | Description                 |
|------------------|---------|---------------------------------------|-----------------------------|
| `id`             | INTEGER | PRIMARY KEY AUTOINCREMENT             | Unique photo ID             |
| `producto_id`    | INTEGER | NOT NULL REFERENCES productos(id) ON DELETE CASCADE | Associated product |
| `contenido_base64`| TEXT   | NOT NULL                              | Base64-encoded image data   |
| `orden`          | INTEGER | NOT NULL                              | Display order               |

**Indexes**: `idx_producto_fotos_producto_id` on `producto_id`

### Table: `etiquetas`

Stores tag labels.

| Column   | Type    | Constraints               | Description    |
|----------|---------|---------------------------|----------------|
| `id`     | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique tag ID  |
| `nombre` | TEXT    | NOT NULL UNIQUE           | Tag name       |

### Table: `producto_etiquetas`

Junction table for many-to-many product-tag relationships.

| Column        | Type    | Constraints                                    | Description         |
|---------------|---------|------------------------------------------------|---------------------|
| `producto_id` | INTEGER | NOT NULL REFERENCES productos(id) ON DELETE CASCADE | Product ID    |
| `etiqueta_id` | INTEGER | NOT NULL REFERENCES etiquetas(id) ON DELETE CASCADE | Tag ID       |

**Primary Key**: (`producto_id`, `etiqueta_id`)

### Table: `ventas`

Stores sales/transaction records.

| Column            | Type    | Constraints                    | Description                     |
|-------------------|---------|--------------------------------|---------------------------------|
| `id`              | INTEGER | PRIMARY KEY AUTOINCREMENT      | Unique sale ID                  |
| `fecha`           | TEXT    | NOT NULL                       | Sale date/time                  |
| `estado`          | TEXT    | NOT NULL                       | Sale status (e.g., "completada")|
| `total`           | REAL    | NOT NULL                       | Total sale amount               |
| `observaciones`   | TEXT    |                                | Optional notes                  |
| `cliente_nombre`  | TEXT    |                                | Customer name                   |
| `cliente_domicilio`| TEXT   |                                | Customer address                |
| `cliente_localidad`| TEXT   |                                | Customer city/locality          |
| `cliente_telefono`| TEXT    |                                | Customer phone number           |
| `archivado`       | INTEGER | DEFAULT 0                      | Archive flag                    |

**Indexes**: `idx_ventas_archivado` on `archivado`

### Table: `venta_items`

Individual line items within a sale.

| Column          | Type    | Constraints                                    | Description                 |
|-----------------|---------|------------------------------------------------|-----------------------------|
| `id`            | INTEGER | PRIMARY KEY AUTOINCREMENT                      | Unique item ID              |
| `venta_id`      | INTEGER | NOT NULL REFERENCES ventas(id) ON DELETE CASCADE | Parent sale                |
| `producto_id`   | INTEGER | NOT NULL REFERENCES productos(id) ON DELETE CASCADE | Product sold            |
| `cantidad`      | INTEGER | NOT NULL                                       | Quantity sold               |
| `entregado`     | INTEGER | NOT NULL DEFAULT 0                             | Delivery status (0/1)       |
| `fecha_entrega` | TEXT    |                                                | Delivery date               |
| `estado`        | TEXT    | NOT NULL DEFAULT 'pendiente'                   | Item status                 |

**Indexes**: `idx_venta_items_venta_id` on `venta_id`, `idx_venta_items_producto_id` on `producto_id`

### Table: `pagos`

Payment records associated with sales.

| Column    | Type    | Constraints                                   | Description                 |
|-----------|---------|-----------------------------------------------|-----------------------------|
| `id`      | INTEGER | PRIMARY KEY AUTOINCREMENT                     | Unique payment ID           |
| `venta_id`| INTEGER | NOT NULL REFERENCES ventas(id) ON DELETE CASCADE | Associated sale           |
| `monto`   | REAL    | NOT NULL                                      | Payment amount              |
| `fecha`   | TEXT    | NOT NULL                                      | Payment date                |
| `metodo`  | TEXT    |                                               | Payment method (e.g., cash, card) |

**Indexes**: `idx_pagos_venta_id` on `venta_id`

### Table: `inventory`

Dedicated inventory/stock management table (separate from `productos.stock`).

| Column           | Type    | Constraints                                      | Description              |
|------------------|---------|--------------------------------------------------|--------------------------|
| `product_id`     | INTEGER | PRIMARY KEY REFERENCES productos(id) ON DELETE CASCADE | Product ID         |
| `quantity`       | INTEGER | NOT NULL DEFAULT 0                               | Current stock quantity   |
| `min_stock_level`| INTEGER | NOT NULL DEFAULT 0                               | Minimum stock threshold  |

**Indexes**: `idx_inventory_product_id` on `product_id`

### Table: `settings`

Key-value store for application configuration.

| Column  | Type | Constraints        | Description            |
|---------|------|--------------------|------------------------|
| `key`   | TEXT | PRIMARY KEY        | Setting key identifier |
| `value` | TEXT | NOT NULL           | Setting value (JSON or string) |

**Indexes**: `idx_settings_key` on `key`

**Typical settings stored**:
- `theme_name` — "blue", "green", "purple", "professional"
- `theme_variant` — "light", "dark"
- `font_size` — "small", "medium", "large"
- KPI visibility flags (show_total_products, show_today_sales, show_low_stock, show_active_categories, show_total_revenue, show_sales_count)

### Table: `importaciones`

Tracks supplier price list imports for the Product Matching module.

| Column                | Type    | Constraints                    | Description                        |
|-----------------------|---------|--------------------------------|------------------------------------|
| `id`                  | INTEGER | PRIMARY KEY AUTOINCREMENT      | Unique import ID                   |
| `proveedor_nombre`    | TEXT    | NOT NULL                       | Supplier name                      |
| `archivo_original`    | TEXT    | NOT NULL                       | Original filename                  |
| `fecha_importacion`   | TEXT    | NOT NULL                       | Import timestamp                   |
| `estado`              | TEXT    | NOT NULL DEFAULT 'pendiente'   | Status (pendiente, procesando, completada, error) |
| `total_productos`     | INTEGER | DEFAULT 0                      | Total products in file             |
| `productos_emparajados`| INTEGER | DEFAULT 0                     | Number of matched products          |

### Table: `matching_resultados`

Stores matching results between supplier products and internal products.

| Column                     | Type    | Constraints                                           | Description                      |
|----------------------------|---------|-------------------------------------------------------|----------------------------------|
| `id`                       | INTEGER | PRIMARY KEY AUTOINCREMENT                             | Unique result ID                 |
| `importacion_id`           | INTEGER | NOT NULL REFERENCES importaciones(id) ON DELETE CASCADE | Associated import               |
| `producto_proveedor_nombre`| TEXT    | NOT NULL                                              | Supplier product name            |
| `producto_proveedor_precio`| REAL    |                                                       | Supplier price                   |
| `producto_proveedor_cantidad`| INTEGER |                                                    | Supplier quantity                |
| `producto_interno_id`      | INTEGER |                                                       | Matched internal product ID      |
| `producto_interno_nombre`  | TEXT    |                                                       | Matched internal product name    |
| `score_similitud`          | REAL    | DEFAULT 0                                             | Match confidence score (0-1)     |
| `estado`                   | TEXT    | NOT NULL DEFAULT 'pendiente'                          | Status (pendiente, confirmado, rechazado, sin_match) |

**Indexes**: `idx_resultados_importacion` on `importacion_id`

### Table: `embeddings_cache`

Caches text embeddings for the matching system to avoid recomputation.

| Column          | Type    | Constraints               | Description                    |
|-----------------|---------|---------------------------|--------------------------------|
| `id`            | INTEGER | PRIMARY KEY AUTOINCREMENT | Unique cache entry ID          |
| `texto`         | TEXT    | NOT NULL UNIQUE           | Original text                  |
| `embedding`     | BLOB    | NOT NULL                  | Binary embedding vector        |
| `modelo`        | TEXT    | NOT NULL                  | Embedding model identifier     |
| `fecha_creacion`| TEXT    | NOT NULL                  | Creation timestamp             |

### Table: `_sqlx_migrations`

SQLx migration tracking table (created manually as fallback).

| Column          | Type    | Constraints               | Description                    |
|-----------------|---------|---------------------------|--------------------------------|
| `version`       | TEXT    | PRIMARY KEY               | Migration version identifier   |
| `description`   | TEXT    | NOT NULL                  | Migration description          |
| `installed_on`  | TEXT    | NOT NULL DEFAULT datetime('now') | Installation timestamp    |
| `success`       | BOOLEAN | NOT NULL                  | Whether migration succeeded     |
| `checksum`      | TEXT    | NOT NULL                  | Migration checksum             |
| `execution_time`| BIGINT  |                           | Time taken to apply migration  |

## Entity Relationship Summary

```
categorias ──┬── categorias (parent-child self-reference)
             │
             └── productos ──┬── producto_fotos
                             ├── producto_etiquetas ── etiquetas
                             ├── venta_items ── ventas ── pagos
                             └── inventory

importaciones ── matching_resultados (linked to productos via producto_interno_id)
embeddings_cache (standalone, used by matching service)
settings (standalone key-value store)
```

## Migration Files

| File                                        | Description                       |
|---------------------------------------------|-----------------------------------|
| `20240101_initial_schema/up.sql`            | Creates categorias, productos, producto_fotos, etiquetas, producto_etiquetas, ventas, venta_items, pagos |
| `20240101_initial_schema/down.sql`          | Drops all initial schema tables   |
| `20251218_create_inventory_table/up.sql`    | Creates inventory table           |
| `20251218_create_inventory_table/down.sql`  | Drops inventory table             |
| `20251222_create_settings_table/up.sql`     | Creates settings table            |
| `20251222_create_settings_table/down.sql`   | Drops settings table              |
| `20251223_add_archived_field/up.sql`        | Adds archivado column to ventas, productos, categorias |
| `20251223_add_archived_field/down.sql`      | Removes archivado column from ventas, productos, categorias |

## Migration Strategy

On startup, `db.rs::init_db()` executes the following migration logic:

1. **Check if database is empty** (no tables):
   - Run SQLx migrations from `migrations/` directory.
   - If SQLx fails, apply SQL embedded via `include_str!` directly.

2. **Check if `_sqlx_migrations` table exists**:
   - If missing: Check each table/column individually and apply only the missing migrations. Then create `_sqlx_migrations` table and populate it with migration records.
   - If present: Check if any required tables are missing and apply them.

3. **Product Matching tables** are created separately by `product_matching::db::create_tables()` during module registration, including dynamic column addition for backward compatibility.