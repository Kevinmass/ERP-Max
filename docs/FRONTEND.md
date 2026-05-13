# Frontend Documentation (React / TypeScript)

## Overview

The frontend is built with **React 19**, **TypeScript**, **Vite 7**, **Tailwind CSS 4**, and **React Router 7**. It provides a modern, responsive UI for the ERP system, communicating with the Rust backend via Tauri's IPC (`invoke`).

## Project Structure (frontend/src/)

```
src/
├── api/                  # Tauri IPC API wrappers
│   ├── catalogue.ts      # Product & category operations + export
│   ├── dashboard.ts      # Dashboard data & KPI operations
│   └── matching.ts       # Product matching operations
├── components/           # Main page-level components
│   ├── Layout.tsx        # App shell with sidebar, header, breadcrumb
│   ├── Sidebar.tsx       # Navigation sidebar
│   ├── Header.tsx        # Top header bar
│   ├── Breadcrumb.tsx    # Breadcrumb navigation
│   ├── StatusBar.tsx     # Bottom status bar
│   ├── Dashboard.tsx     # Analytics dashboard
│   ├── Catalogue.tsx     # Product catalog page
│   ├── Categories.tsx    # Category management page
│   ├── Sales.tsx         # Sales (POS interface + history)
│   ├── Stock.tsx         # Stock page (legacy, redirects to module)
│   ├── ProductMatching.tsx # Supplier price matching page
│   ├── KpiCard.tsx       # Reusable KPI card component
│   ├── SalesChart.tsx    # Sales trend chart component
│   └── ImageZoomModal.tsx # Image zoom modal
├── context/              # React Context providers
│   ├── AuthContext.tsx    # User authentication state
│   ├── DashboardContext.tsx # Dashboard data & KPIs
│   └── LayoutContext.tsx  # Layout UI state
├── modules/              # Feature modules (sub-pages and sub-components)
│   ├── catalogue/        # Product table, grid, form components
│   ├── sales/            # POS interface, sales history
│   ├── stock/            # Stock dashboard
│   └── settings/         # Settings views and types
├── utils/
│   ├── theme.ts          # Theme engine (colors, fonts, backgrounds)
│   └── pdfGenerator.ts   # PDF utility helpers
├── modules_config.ts     # Module/route definitions
├── App.tsx               # Root component with routing
├── main.tsx              # Application entry point
└── index.css             # Global styles + Tailwind directives
```

## Entry Point: `main.tsx`

```tsx
ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
);
```

## Root Component: `App.tsx`

Sets up the provider hierarchy and routing:

```tsx
<AuthProvider>
    <DashboardProvider>
        <LayoutProvider>
            <Router>
                <AppContent />
            </Router>
        </LayoutProvider>
    </DashboardProvider>
</AuthProvider>
```

### Routes (AppContent)

| Path           | Component        | Module        |
|----------------|------------------|---------------|
| `/`            | Dashboard        | —             |
| `/catalogue`   | Catalogue        | catalogue     |
| `/categorias`  | Categories       | categorias    |
| `/sales`       | Sales            | sales         |
| `/stock`       | StockDashboard   | stock         |
| `/settings`    | SettingsView     | settings      |
| `/matching`    | ProductMatching  | product-matching|

## Layout System

### `Layout.tsx`
The layout component wraps all page content and provides:
- **Sidebar**: Navigation with module links and user menu
- **Header**: Page title, mobile menu toggle, notification area
- **Breadcrumb**: Dynamic breadcrumb based on current route
- **Content area**: Scrollable main content with `max-w-7xl` container
- **StatusBar**: Bottom status bar

The layout applies theme and font settings on component mount by calling the `get_settings` Tauri command and applying the result through the theme engine.

### State Management

#### AuthContext (`context/AuthContext.tsx`)
```typescript
interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    login: (userData: User) => void;
    logout: () => void;
}
```
- Persists user data in `localStorage`.
- Creates a default admin user on first launch (`{ id: 1, name: 'Admin', email: 'admin@erp.com' }`).

#### DashboardContext (`context/DashboardContext.tsx`)
```typescript
interface DashboardContextType {
    stats: DashboardStats | null;
    kpiConfig: KpiConfig | null;
    refreshDashboard: () => void;
}
```
- Fetches dashboard statistics and KPI configuration from the backend.
- Provides a `refreshDashboard()` function for data refresh.

#### LayoutContext (`context/LayoutContext.tsx`)
Manages layout-level UI state (sidebar collapse state, mobile menu visibility).

## API Layer

### `api/catalogue.ts`

| Function                     | Backend Command               | Description                    |
|------------------------------|-------------------------------|--------------------------------|
| `exportarCatalogoExcel()`    | `exportar_catalogo_excel`     | Export as CSV (number[])       |
| `exportarCatalogoPdf()`      | `exportar_catalogo_pdf`       | Export as PDF (number[])       |
| `reimportarPreciosCatalogo()`| `reimportar_precios_catalogo` | Reimport prices from file      |
| `exportCatalogueToExcel()`   | (wraps export + download)     | Download as CSV file           |
| `exportCatalogueToPdf()`     | (wraps export + download)     | Download as PDF file           |

**Download Helper**: `downloadBlob(data, filename, mimeType)` converts a `number[]` (byte array from Tauri) to a `Blob` and triggers a browser download.

### `api/dashboard.ts`

| Function             | Backend Command          | Return Type        |
|----------------------|--------------------------|--------------------|
| `getDashboardData()` | `get_dashboard_data`     | `DashboardData`    |
| `getDashboardStats()`| `get_dashboard_stats`    | `DashboardStats`   |
| `getSalesTrend()`    | `get_sales_trend`        | `SalesTrend[]`     |
| `getInventoryStatus()`| `get_inventory_status`  | `InventoryStatus[]`|
| `getKpiConfig()`     | `get_kpi_config`         | `KpiConfig`        |
| `updateKpiConfig()`  | `update_kpi_config`      | `void`             |

### `api/matching.ts`

| Function                          | Backend Command                     |
|-----------------------------------|-------------------------------------|
| `importarListaProveedor()`        | `importar_lista_proveedor`          |
| `ejecutarMatching()`              | `ejecutar_matching`                 |
| `getImportaciones()`              | `get_importaciones`                 |
| `getResultadosMatching()`         | `get_resultados_matching`           |
| `getProductosInternos()`          | `get_productos_internos`            |
| `confirmarMatch()`                | `confirmar_match`                   |
| `rechazarMatch()`                 | `rechazar_match`                    |
| `getMatchingStats()`              | `get_matching_stats`                |
| `importarYMatchear()`             | `importar_y_matchear`               |
| `aplicarActualizacionPrecios()`   | `aplicar_actualizacion_precios`     |
| `exportarResultadosExcel()`       | `exportar_resultados_excel`         |

## Key Components

### Dashboard (`components/Dashboard.tsx`)
- Displays KPI cards (total products, today's sales, low stock, active categories, total revenue, sales count).
- Shows a sales trend chart (`SalesChart` component).
- Quick actions: Add Product, New Sale, View Inventory.
- Module quick-access grid.
- Recent activity and system status panels.
- Supports KPI visibility configuration.

### Catalogue (`components/Catalogue.tsx`)
- Dual view mode: **Table** (`ProductTable`) and **Grid** (`ProductosGrid`).
- Search bar with text search and category dropdown filter.
- Hierarchical category sorting (indented, parent-child).
- Paginated results (20 products per page).
- Product creation/editing form modal (`ProductForm`).
- Export dropdown (CSV / PDF).
- Notification system for action feedback.

### Sales (`components/Sales.tsx`)
- Tab-based navigation between **POS Interface** and **Sales History**.
- POS: Product search, cart management, quantity adjustment, sale registration.
- History: Filterable list of past sales with archive/unarchive capabilities.

### ProductMatching (`components/ProductMatching.tsx`)
- File upload UI for supplier price lists.
- Matching results display with accept/reject actions.
- Statistics overview and price update application.

## Module Configuration

Defined in `modules_config.ts`:

```typescript
interface ModuleConfig {
    id: string;
    name: string;
    route: string;
    icon: string;
    description?: string;
    requiredRole?: string;  // 'administrador' or undefined
}
```

| Module          | Name        | Route        | Icon | Admin Only |
|-----------------|-------------|--------------|------|------------|
| catalogue       | CATALOGO    | /catalogue   | 📚   | No         |
| categorias      | CATEGORIAS  | /categorias  | 📁   | No         |
| sales           | VENTAS      | /sales       | 💰   | No         |
| stock           | INVENTARIO  | /stock       | 📦   | No         |
| settings        | CONFIGURACION| /settings   | ⚙️   | Yes        |
| product-matching| MATCHING    | /matching    | 🔗   | No         |

## Theme System

The theme engine (`utils/theme.ts`) provides:

- **4 Color Schemes**: Blue, Green, Purple, Professional
- **2 Variants**: Light, Dark
- **Font Sizes**: Small (0.875), Medium (1.125), Large (1.375) — applied as CSS custom property `--font-scale-base`
- **Background Patterns**: squares, circles, diamonds, waves

### `applyTheme(themeName, variant)`
1. Removes existing theme classes from `<html>`.
2. Adds new theme classes (e.g., `theme-blue-dark`).
3. Manages Tailwind's `dark` class.
4. Applies gradient background colors.
5. Sets CSS custom properties for brand colors, neutrals, and surfaces.

### `applyFontSize(fontSize)`
Sets `--font-scale-base` on `document.documentElement`.

## CSS & Styling

- **Tailwind CSS 4**: Utility-first CSS framework.
- **Global styles** (`index.css`): Tailwind directives, base styles.
- **CSS Custom Properties**: Dynamic theming via `--color-brand-*`, `--color-neutral-*`, `--color-surface-*`.
- **Dark Mode**: Managed through the `dark` class on `<html>` element.