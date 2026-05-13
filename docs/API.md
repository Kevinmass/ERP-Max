# API Reference (Tauri IPC Commands)

## Overview

This document describes all Tauri IPC commands exposed by the Rust backend. Frontend code calls these commands using `invoke()` from `@tauri-apps/api/core`.

All commands accept parameters as a single object and return `Result<T, String>` where `T` is the command-specific return type.

---

## Catalogue Module

### `get_productos`

Paginated product listing with optional search and category filtering.

**Parameters**

| Parameter         | Type     | Required | Description                                |
|-------------------|----------|----------|--------------------------------------------|
| `page`            | `i32`    | No       | Page number (1-based, default: 1)          |
| `pageSize`        | `i32`    | No       | Items per page (default: 20)               |
| `searchQuery`     | `String` | No       | Text search against product name           |
| `categoriaId`     | `i32`    | No       | Category ID filter (includes subcategories)|

**Returns**

```typescript
{
  data: Producto[];
  total: number;
}
```

**TypeScript call**
```typescript
const result = await invoke<ProductoResponse>('get_productos', {
  page: 1,
  pageSize: 20,
  searchQuery: 'search term',
  categoriaId: 5,
});
```

---

### `create_producto`

Create a new product.

**Parameters**

```typescript
{
  producto: {
    nombre: string;           // required
    descripcion?: string;
    costo: number;            // required
    stock: number;            // required
    categoria_id?: number;
    foto?: string;
    tags?: string;
  }
}
```

**Returns**: `Producto` (the created product with ID)

---

### `update_producto`

Update an existing product. All fields except `id` are optional.

**Parameters**

```typescript
{
  producto: {
    id: number;               // required
    nombre?: string;
    descripcion?: string;
    costo?: number;
    stock?: number;
    categoria_id?: number | null;
    foto?: string | null;
    tags?: string | null;
  }
}
```

**Returns**: `Producto` (the updated product)

---

### `delete_producto`

Delete a product by ID.

**Parameters**

| Parameter    | Type  | Required | Description |
|--------------|-------|----------|-------------|
| `productId`  | `i32` | Yes      | Product ID  |

**Returns**: `void`

---

### `get_categorias`

Get all categories.

**Parameters**: None

**Returns**: `Categoria[]`

```typescript
{
  id: number;
  nombre: string;
  descripcion?: string;
  categoria_padre_id?: number;
}
```

---

### `create_categoria`

Create a new category.

**Parameters**

```typescript
{
  categoria: {
    nombre: string;               // required
    descripcion?: string;
    categoria_padre_id?: number;  // parent category ID for hierarchy
  }
}
```

**Returns**: `Categoria` (the created category with ID)

---

### `delete_categoria`

Delete a category by ID.

**Parameters**

| Parameter      | Type  | Required | Description   |
|----------------|-------|----------|---------------|
| `categoriaId`  | `i32` | Yes      | Category ID   |

**Returns**: `void`

---

### `get_producto_by_id`

Get a single product by its ID.

**Parameters**

| Parameter    | Type  | Required | Description |
|--------------|-------|----------|-------------|
| `productId`  | `i32` | Yes      | Product ID  |

**Returns**: `Producto`

---

### `migrate_product_stock_to_inventory`

Migrate stock values from the `productos` table to the `inventory` table for all products.

**Parameters**: None

**Returns**: `void`

---

### `exportar_catalogo_excel`

Export the product catalog as a CSV byte array (compatible with Excel).

**Parameters**: None

**Returns**: `number[]` (byte array — convert to Blob on frontend)

**CSV Format**: `Nombre,Precio,Descripcion,Stock,Categoria,Tags`

---

### `exportar_catalogo_pdf`

Export the product catalog as a PDF byte array with formatted layout (category grouping, page numbers, table headers).

**Parameters**: None

**Returns**: `number[]` (byte array — convert to Blob on frontend)

---

### `reimportar_precios_catalogo`

Reimport prices from a CSV/Excel file (matching products by name).

**Parameters**

| Parameter           | Type       | Required | Description              |
|---------------------|------------|----------|--------------------------|
| `archivoContenido`  | `Vec<u8>`  | Yes      | File content as bytes    |
| `nombreArchivo`     | `String`   | Yes      | Original filename        |

**Returns**

```typescript
{
  totalProcesados: number;
  actualizados: number;
  errores: string[];
}
```

---

## Sales Module

### `register_sale`

Register a new sale with items and payments.

**Parameters**

```typescript
{
  // Sale data structure
  // Includes: customer info, items with products, quantities, payments
}
```

**Returns**: `Venta` (the created sale with ID)

---

### `get_sales_history`

Get all sales history.

**Parameters**: None

**Returns**: `Venta[]`

---

### `delete_sale`

Delete a sale by ID.

**Parameters**

| Parameter  | Type  | Required | Description |
|------------|-------|----------|-------------|
| `ventaId`  | `i32` | Yes      | Sale ID     |

**Returns**: `void`

---

### `archive_sale`

Archive a sale (soft-delete, can be restored).

**Parameters**

| Parameter  | Type  | Required | Description |
|------------|-------|----------|-------------|
| `ventaId`  | `i32` | Yes      | Sale ID     |

**Returns**: `void`

---

### `unarchive_sale`

Restore an archived sale.

**Parameters**

| Parameter  | Type  | Required | Description |
|------------|-------|----------|-------------|
| `ventaId`  | `i32` | Yes      | Sale ID     |

**Returns**: `void`

---

### `get_archived_sales`

Get all archived sales.

**Parameters**: None

**Returns**: `Venta[]`

---

### `get_sales_history_with_filter`

Get sales history with filtering options (date range, status, etc.).

**Parameters**: Filter parameters

**Returns**: `Venta[]`

---

## Stock Module

### `get_inventory_list`

Get inventory list with optional search and category filtering.

**Parameters**

| Parameter       | Type     | Required | Description                |
|-----------------|----------|----------|----------------------------|
| `searchQuery`   | `String` | No       | Text search                |
| `categoriaId`   | `i32`    | No       | Category filter            |
| (additional filters) |      | No       | Other filter parameters     |

**Returns**: `InventoryItem[]`

---

### `update_stock_manually`

Set a product's stock to a specific quantity.

**Parameters**

| Parameter    | Type  | Required | Description           |
|--------------|-------|----------|-----------------------|
| `productId`  | `i32` | Yes      | Product ID            |
| `newStock`   | `i32` | Yes      | New stock quantity    |

**Returns**: `void`

---

### `adjust_stock`

Adjust stock by a delta value with a reason.

**Parameters**

| Parameter        | Type     | Required | Description                 |
|------------------|----------|----------|-----------------------------|
| `productId`      | `i32`    | Yes      | Product ID                  |
| `quantityChange` | `i32`    | Yes      | Quantity change (+/-)       |
| `reason`         | `String` | Yes      | Reason for adjustment       |

**Returns**: `void`

---

## Settings Module

### `get_settings`

Get all settings as a key-value map.

**Parameters**: None

**Returns**: `Record<string, string>` (key-value pairs)

**Common keys**: `theme_name`, `theme_variant`, `font_size`, `show_total_products`, `show_today_sales`, `show_low_stock`, `show_active_categories`, `show_total_revenue`, `show_sales_count`

---

### `save_settings`

Save or update settings.

**Parameters**

```typescript
{
  settings: Record<string, string>;  // key-value pairs to save
}
```

**Returns**: `void`

---

## Dashboard Module

### `get_dashboard_data`

Get comprehensive dashboard data including stats, trends, and inventory status.

**Parameters**: None

**Returns**: `DashboardData`

---

### `get_dashboard_stats`

Get KPI statistics for the dashboard.

**Parameters**: None

**Returns**

```typescript
{
  total_products: number;
  today_sales: number;
  low_stock_items: number;
  active_categories: number;
  total_revenue: number;
  sales_count: number;
}
```

---

### `get_sales_trend`

Get sales trend data (time-series for charting).

**Parameters**: None

**Returns**: `SalesTrend[]`

---

### `get_inventory_status`

Get inventory status summary (items by stock level).

**Parameters**: None

**Returns**: `InventoryStatus[]`

---

### `get_kpi_config`

Get KPI visibility configuration.

**Parameters**: None

**Returns**

```typescript
{
  show_total_products: boolean;
  show_today_sales: boolean;
  show_low_stock: boolean;
  show_active_categories: boolean;
  show_total_revenue: boolean;
  show_sales_count: boolean;
}
```

---

### `update_kpi_config`

Update KPI visibility configuration.

**Parameters**

```typescript
{
  config: {
    show_total_products?: boolean;
    show_today_sales?: boolean;
    show_low_stock?: boolean;
    show_active_categories?: boolean;
    show_total_revenue?: boolean;
    show_sales_count?: boolean;
  }
}
```

**Returns**: `void`

---

## Product Matching Module

### `importar_lista_proveedor`

Import a supplier price list file (Excel/CSV).

**Parameters**

| Parameter           | Type       | Required | Description              |
|---------------------|------------|----------|--------------------------|
| `archivoContenido`  | `Vec<u8>`  | Yes      | File content as bytes    |
| `nombreArchivo`     | `String`   | Yes      | Original filename        |

**Returns**

```typescript
{
  importacion_id: number;
  total_productos: number;
  // ... other result fields
}
```

---

### `ejecutar_matching`

Execute matching algorithm for a previously imported supplier list.

**Parameters**

| Parameter        | Type  | Required | Description           |
|------------------|-------|----------|-----------------------|
| `importacionId`  | `i32` | Yes      | Import ID             |

**Returns**

```typescript
{
  total: number;
  matched: number;
  unmatched: number;
  // ... other result fields
}
```

---

### `get_importaciones`

Get all supplier price list imports.

**Parameters**: None

**Returns**: `Importacion[]`

---

### `get_resultados_matching`

Get matching results for a specific import.

**Parameters**

| Parameter        | Type  | Required | Description           |
|------------------|-------|----------|-----------------------|
| `importacionId`  | `i32` | Yes      | Import ID             |

**Returns**: `MatchResult[]`

---

### `get_productos_internos`

Get internal products for manual matching (with search).

**Parameters**: Search parameters

**Returns**: `InternalProduct[]`

---

### `confirmar_match`

Confirm a proposed match between a supplier product and internal product.

**Parameters**

| Parameter  | Type  | Required | Description      |
|------------|-------|----------|------------------|
| `matchId`  | `i32` | Yes      | Match result ID  |

**Returns**: `void`

---

### `rechazar_match`

Reject a proposed match.

**Parameters**

| Parameter  | Type  | Required | Description      |
|------------|-------|----------|------------------|
| `matchId`  | `i32` | Yes      | Match result ID  |

**Returns**: `void`

---

### `get_matching_stats`

Get matching statistics for an import.

**Parameters**

| Parameter        | Type  | Required | Description           |
|------------------|-------|----------|-----------------------|
| `importacionId`  | `i32` | Yes      | Import ID             |

**Returns**

```typescript
{
  total: number;
  automaticos: number;
  pendientes: number;
  confirmados: number;
  rechazados: number;
  sin_match: number;
}
```

---

### `importar_y_matchear`

Import a supplier price list and execute matching in one step.

**Parameters**

| Parameter           | Type       | Required | Description              |
|---------------------|------------|----------|--------------------------|
| `archivoContenido`  | `Vec<u8>`  | Yes      | File content as bytes    |
| `nombreArchivo`     | `String`   | Yes      | Original filename        |

**Returns**: `MatchingResult`

---

### `aplicar_actualizacion_precios`

Apply confirmed price updates from a matching import to actual product prices.

**Parameters**

| Parameter        | Type  | Required | Description           |
|------------------|-------|----------|-----------------------|
| `importacionId`  | `i32` | Yes      | Import ID             |

**Returns**

```typescript
{
  total_actualizados: number;
  errores: string[];
}
```

---

### `exportar_resultados_excel`

Export matching results as a CSV byte array.

**Parameters**

| Parameter        | Type  | Required | Description           |
|------------------|-------|----------|-----------------------|
| `importacionId`  | `i32` | Yes      | Import ID             |

**Returns**: `number[]` (byte array)

---

### `reimportar_precios_excel`

Reimport prices from a standard catalog export file.

**Parameters**

| Parameter           | Type       | Required | Description              |
|---------------------|------------|----------|--------------------------|
| `archivoContenido`  | `Vec<u8>`  | Yes      | File content as bytes    |
| `nombreArchivo`     | `String`   | Yes      | Original filename        |

**Returns**

```typescript
{
  totalProcesados: number;
  actualizados: number;
  errores: string[];
}
```

---

## Migration Module

### `test_migration_system`

Diagnostic command that checks the status of each migration component.

**Parameters**: None

**Returns**: `String` (formatted report with migration component statuses)

**Output example**:
```
Database Version: New
✓ Database is already up to date (Nuevo version)

Migration Component Status:
Settings table: ✓ Present
Archived fields: ✓ Present
Inventory table: ✓ Present
Tags column: ✓ Present
Product matching tables: ✓ Present
No old artifacts: ✓ Clean

Migration Status: ✓ Complete