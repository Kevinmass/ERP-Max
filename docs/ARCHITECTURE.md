# Architecture Overview

## System Architecture

This ERP & Catalogue System is built as a **desktop application** using the **Tauri v2** framework. Tauri bridges a Rust backend with a web-based frontend (React/TypeScript), providing native performance and access to the filesystem while using familiar web technologies for the UI.

```
┌─────────────────────────────────────────────────────────┐
│                    Tauri v2 Shell                         │
│                                                          │
│  ┌─────────────────────┐       ┌──────────────────────┐ │
│  │   Frontend (WebView) │       │   Backend (Rust)      │ │
│  │                      │       │                        │ │
│  │  React 19 App        │ IPC   │  Tauri Commands        │ │
│  │  ├─ Pages            │◄─────►│  ├─ catalogue          │ │
│  │  ├─ Components       │invoke │  ├─ sales              │ │
│  │  ├─ Contexts         │       │  ├─ stock              │ │
│  │  ├─ API Layer        │       │  ├─ settings           │ │
│  │  └─ Utils            │       │  ├─ dashboard          │ │
│  │                      │       │  ├─ product_matching   │ │
│  │                      │       │  └─ migration          │ │
│  │                      │       │                        │ │
│  │                      │       │  ┌──────────────────┐  │ │
│  │                      │       │  │   SQLite (sqlx)   │  │ │
│  │                      │       │  └──────────────────┘  │ │
│  └─────────────────────┘       └──────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

## Data Flow

1. The user interacts with the React UI.
2. React components call functions in the `api/` layer (e.g., `api/catalogue.ts`).
3. API functions use `@tauri-apps/api/core`'s `invoke()` to send IPC messages to the Rust backend.
4. Tauri routes the call to the appropriate Rust command function (e.g., `get_productos`).
5. The command processes the request via a service layer, which uses sqlx to query the SQLite database.
6. The result is serialized to JSON and sent back through IPC to the frontend.
7. React re-renders the UI with the response data.

## Backend Architecture (Rust)

Each business domain follows a **layered module pattern**:

```
modules/{domain}/
├── mod.rs          Module exports + optional Tauri command registration
├── commands.rs     Tauri IPC command handlers (#[tauri::command])
├── service.rs      Business logic layer
├── db.rs           Database access layer (sqlx queries)
└── models.rs       Data structures (structs, enums, serde serialize/deserialize)
```

### Module Registry

`src-tauri/src/modules/mod.rs` (`register_modules()`):
- Initializes the database connection pool on app startup.
- Runs migrations automatically.
- Registers all Tauri IPC command handlers.
- Initializes the Product Matching service (including embeddings).
- Creates product matching database tables.

## Frontend Architecture (React/TypeScript)

### Page Layout

The frontend uses a shell layout pattern:
```
App.tsx
├── AuthProvider        (Context: authentication state)
│   └── DashboardProvider (Context: dashboard data)
│       └── LayoutProvider  (Context: layout state)
│           └── Router
│               └── AppContent
│                   └── Layout
│                       ├── Sidebar (navigation)
│                       ├── Header (title bar + mobile menu)
│                       ├── Breadcrumb
│                       ├── <main> (routed page content)
│                       └── StatusBar
```

### Routing

| Route           | Component         | Description                |
|-----------------|-------------------|----------------------------|
| `/`             | Dashboard         | Analytics overview         |
| `/catalogue`    | Catalogue         | Product management         |
| `/categorias`   | Categories        | Category management        |
| `/sales`        | Sales (POS)       | Point of sale + history    |
| `/stock`        | StockDashboard    | Inventory management       |
| `/settings`     | SettingsView      | System configuration       |
| `/matching`     | ProductMatching   | Supplier price matching    |

### Module Configuration

Routes and modules are defined in `modules_config.ts` with:
- Unique module ID
- Display name
- Route path
- Icon (emoji)
- Description
- Optional role-based access (e.g., `settings` requires `administrador`)

### State Management

The app uses **React Context** for state management:
- **AuthContext**: User authentication state with localStorage persistence.
- **DashboardContext**: Dashboard stats, KPI configurations, and refresh mechanism.
- **LayoutContext**: Layout UI state management (sidebar, theme).

### IPC API Layer

Frontend modules communicate with the Rust backend through typed API wrappers in `frontend/src/api/`:
- `catalogue.ts` — Product and category operations, exports
- `dashboard.ts` — Dashboard data, KPIs
- `matching.ts` — Product matching operations

Each function wraps `invoke<T>()` with typed parameters and return types.

### Theme System

The theme engine (`utils/theme.ts`) provides:
- 4 color themes: Blue, Green, Purple, Professional
- 2 variants per theme: Light, Dark
- CSS custom properties for brand colors, neutrals, and surfaces
- Font size scaling (small, medium, large)
- Background patterns (squares, circles, diamonds, waves)
- Tailwind CSS dark mode integration

## Database Architecture

The database is **SQLite** managed through **sqlx** (compile-time checked SQL queries) with **embedded migrations**.

### Migration Strategy

`db.rs` implements a robust multi-strategy migration system:

1. **Primary**: Run SQLx migrations from `src-tauri/migrations/` directory.
2. **Fallback**: If SQLx tracking fails, apply SQL from embedded files (`include_str!`) directly.
3. **Verification**: Check for missing tables/columns on every startup.
4. **Tracking**: Maintain `_sqlx_migrations` table to track applied migrations.

### Migration Files

| File                                     | Description                              |
| ---------------------------------------- | ---------------------------------------- |
| `20240101_initial_schema/up.sql`         | Core tables: categorias, productos, ventas, etc. |
| `20251218_create_inventory_table/up.sql` | Inventory table for stock management     |
| `20251222_create_settings_table/up.sql`  | Settings table for configuration         |
| `20251223_add_archived_field/up.sql`     | Archivado field for soft-delete/archive  |

## Security

- **Authentication**: Managed client-side via AuthContext with localStorage persistence. Default admin user created on first launch.
- **Authorization**: Role-based module access (settings restricted to `administrador`).
- **Password Hashing**: bcrypt (available in dependencies for future server-side auth).
- **Tauri Permissions**: Filesystem access limited to necessary operations (exports).

## Communication Patterns

### Request-Response (Tauri Commands)
Most operations use synchronous request-response IPC:
```typescript
// Frontend
const products = await invoke<ProductoResponse>('get_productos', { page: 1, pageSize: 20 });

// Backend
#[tauri::command]
pub async fn get_productos(pool: State<'_, SqlitePool>, page: Option<i32>) -> Result<ProductoResponse, String> {
    // business logic
}
```

### File Operations
File import/export uses byte array transfer through IPC:
- Export: Backend generates bytes (PDF/CSV), frontend creates Blob and triggers download.
- Import: Frontend reads file as byte array, sends to backend for processing.