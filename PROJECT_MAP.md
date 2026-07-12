# PROJECT MAP

> Purely descriptive. No judgments, ratings, or recommendations — those come in later phases.
> Generated from a direct crawl of the repo on 2026-07-12.

---

## 1. Tech Stack

**Shell**: Tauri v2 (`tauri = "2.6.1"`) — Rust-native desktop shell wrapping a WebView, IPC bridge to a React frontend.

**Frontend** (`frontend/`)
| Package | Version |
|---|---|
| react / react-dom | ^19.2.3 |
| react-router-dom | ^7.11.0 |
| typescript | ^5.9.3 |
| vite | ^7.3.0 |
| tailwindcss | ^4.1.18 |
| @tauri-apps/api | ^2.0.0 |

Build: `vite` dev server, `tsc -b && vite build` for production build.

**Backend** (`src-tauri/`)
| Crate | Version |
|---|---|
| tauri | 2.6.1 |
| sqlx (sqlite, runtime-tokio, migrate) | 0.7 |
| tokio (full) | 1.37 |
| serde / serde_json | 1.0 |
| chrono | 0.4 |
| printpdf | 0.5 |
| calamine | 0.26 |
| bcrypt | 0.15 (present, not wired into auth flow) |
| thiserror | 1.0 |
| uuid (v4) | 1.0 |
| tauri-plugin-fs | 2.4.0 |
| tauri-plugin-log | 2 |

**Database**: SQLite, accessed via sqlx connection pool (max 5 connections), managed as Tauri app state.

---

## 2. Directory Structure

```
├── frontend/                      # React/TS/Vite app
│   ├── src/
│   │   ├── api/                   # Typed wrappers around Tauri invoke() calls
│   │   ├── components/            # Page-level + shared components
│   │   ├── context/                # React Context providers (Auth, Layout, Dashboard)
│   │   ├── modules/                # Feature-scoped components, grouped by domain
│   │   │   ├── catalogue/
│   │   │   ├── sales/
│   │   │   ├── settings/
│   │   │   └── stock/
│   │   ├── utils/                 # theme.ts, pdfGenerator.ts
│   │   ├── modules_config.ts       # Central route/module registry (sidebar + role gating)
│   │   ├── App.tsx                 # Router + top-level providers
│   │   └── main.tsx
│   └── package.json
├── src-tauri/                     # Rust backend
│   ├── src/
│   │   ├── main.rs                 # Entry point
│   │   ├── lib.rs                  # Module re-exports
│   │   ├── db.rs                   # DB init + migration bootstrapping
│   │   ├── migration/              # Custom migration orchestration (separate from sqlx migrate)
│   │   │   ├── detector.rs         # Detects DB schema state (new/old/empty)
│   │   │   └── strategies/         # Per-feature manual migration steps
│   │   └── modules/                # One folder per business domain
│   │       ├── catalogue/          # commands.rs, db.rs, service.rs, models.rs
│   │       ├── sales/
│   │       ├── stock/
│   │       ├── settings/
│   │       ├── dashboard/
│   │       └── product_matching/   # + parser.rs, embeddings.rs
│   ├── migrations/                 # sqlx-managed migrations (4 folders, up/down.sql)
│   └── Cargo.toml
└── docs/                           # Pre-existing docs: ARCHITECTURE, BACKEND, FRONTEND, DATABASE, API, TECHNICAL_AUDIT
```

Each backend module consistently follows: `commands.rs` (Tauri `#[tauri::command]` handlers) → `service.rs` (business logic) → `db.rs` (sqlx queries) → `models.rs` (structs/DTOs).

---

## 3. Module Responsibilities

| Module | Route | Backend commands (examples) | Responsibility |
|---|---|---|---|
| **Catalogue** | `/catalogue`, `/categorias` | `get_productos`, `create_producto`, `update_producto`, `delete_producto`, `get_categorias`, `create_categoria`, `delete_categoria`, `exportar_catalogo_excel`, `exportar_catalogo_pdf`, `reimportar_precios_catalogo` | Product + category CRUD, paginated listing, PDF/Excel export, price reimport |
| **Sales** | `/sales` | `register_sale`, `get_sales_history`, `delete_sale`, `archive_sale`, `unarchive_sale`, `get_archived_sales`, `get_sales_history_with_filter` | POS cart → sale registration, sales history, archive workflow |
| **Stock** | `/stock` | `get_inventory_list`, `update_stock_manually`, `adjust_stock` | Inventory levels, manual adjustment, low-stock detection |
| **Dashboard** | `/` | `get_dashboard_data`, `get_dashboard_stats`, `get_sales_trend`, `get_inventory_status`, `get_kpi_config`, `update_kpi_config` | Aggregate KPIs, sales trend chart data, configurable KPI visibility |
| **Settings** | `/settings` (admin-only) | `get_settings`, `save_settings` | Key-value settings persistence (theme, preferences) |
| **Product Matching** | `/matching` | `importar_lista_proveedor`, `ejecutar_matching`, `get_importaciones`, `get_resultados_matching`, `confirmar_match`, `rechazar_match`, `get_matching_stats`, `importar_y_matchear`, `aplicar_actualizacion_precios`, `exportar_resultados_excel`, `reimportar_precios_excel` | Supplier price-list import (CSV/Excel), fuzzy/embedding-based product matching, confidence-based classification, bulk price update |

Module registry lives in `frontend/src/modules_config.ts` — drives sidebar nav and role gating (`requiredRole: 'administrador'` gates Settings; everything else is open to all users).

Backend command registration lives in `src-tauri/src/modules/mod.rs`, which also does app-startup work: DB init, product-matching service init, product-matching table creation.

---

## 4. Data Model (SQLite schema, as created by migrations)

### Core schema (`20240101_initial_schema`)
- **categorias**: `id, nombre, descripcion, categoria_padre_id → categorias.id` (self-referential hierarchy)
- **productos**: `id, nombre, descripcion, costo, stock, categoria_id → categorias.id, tags`
- **producto_fotos**: `id, producto_id → productos.id (CASCADE), contenido_base64, orden` (images stored as base64 text, not files/blobs)
- **etiquetas**: `id, nombre (UNIQUE)`
- **producto_etiquetas**: junction table `(producto_id, etiqueta_id)` — many-to-many, but `productos.tags` also exists as a plain text column (two parallel tagging mechanisms — see open question below)
- **ventas**: `id, fecha, estado, total, observaciones, cliente_nombre, cliente_domicilio, cliente_localidad, cliente_telefono`
- **venta_items**: `id, venta_id → ventas.id (CASCADE), producto_id → productos.id (CASCADE), cantidad, entregado, fecha_entrega, estado`
- **pagos**: `id, venta_id → ventas.id (CASCADE), monto, fecha, metodo`

### Later migrations (additive, applied in order)
- `20251218_create_inventory_table`: **inventory**: `product_id (PK) → productos.id (CASCADE), quantity, min_stock_level` — a separate materialized stock table alongside `productos.stock`
- `20251222_create_settings_table`: **settings**: `key (PK), value` — plain key-value store
- `20251223_add_archived_field`: adds `archivado BOOLEAN DEFAULT 0` to `ventas`, `productos`, `categorias` (soft-delete pattern)

### Product Matching tables
Created separately at runtime via `product_matching::db::create_tables()` (not in the sqlx `migrations/` folder) — includes `importaciones`, `matching_resultados`, and an `embeddings_cache` table per the audit doc. Exact DDL lives in `src-tauri/src/modules/product_matching/db.rs`.

### Rust-side models of note
- `Producto` (runtime struct) includes `fotos: Vec<String>` — photos are joined/aggregated into the product response, not lazily loaded.
- `DashboardStats` / `KpiConfig`: 6 fixed KPIs (total products, today's sales, low stock items, active categories, total revenue, sales count), each individually toggleable via `KpiConfig`.
- `MatchingEstado` enum: `Pendiente | Confirmado | Rechazado | SinMatch` — drives the review workflow state machine for matching results.
- `Venta` has both `estado` (free-form string) and `archivado` (bool) — two separate status axes.
- `VentaItem` has its own `estado` (default `'pendiente'`) plus `entregado`/`fecha_entrega` — per-item delivery tracking distinct from the sale's overall `estado`.

---

## 5. Entry Point / Navigation Flow

1. **Rust startup** (`main.rs` → `modules::register_modules`): initializes DB pool synchronously (blocking on async init), initializes the `ProductMatchingService`, creates product-matching tables, registers all `#[tauri::command]` handlers, then starts the Tauri event loop.
2. **Frontend mount** (`main.tsx` → `App.tsx`): wraps the app in `AuthProvider` → `DashboardProvider` → `LayoutProvider` → `Router`.
3. **Auth**: `AuthContext` is **not** a real login system — on first load it auto-creates a default `{id:1, name:'Admin', email:'admin@erp.com'}` user in `localStorage` if none exists. There is no login screen in the routed component tree currently observed.
4. **Routing** (`App.tsx`): single `Layout` wrapper containing nested `Routes` for `/` (Dashboard), `/catalogue`, `/categorias`, `/sales`, `/stock`, `/settings`, `/matching`.
5. **Sidebar/nav**: driven by `modules_config.ts`'s `MODULES` array (id, name, route, icon, description, requiredRole), independent from the router's route list — so adding a module currently requires updating both files.
6. **IPC calls**: components call typed wrapper functions in `frontend/src/api/*.ts`, which call `@tauri-apps/api`'s `invoke()` with the exact command names registered in `modules/mod.rs`.

---

## Open Questions (need your input before I act on any of these)

1. **Tagging**: there's both a `producto_etiquetas` many-to-many junction table (with an `etiquetas` table) and a plain `tags` text column on `productos`. Which one is actually live/used by the UI today, and is the other dead/legacy?
2. **Auth**: `AuthContext` auto-logs-in a hardcoded admin user with no password check. Is real authentication in scope for this engagement, or is this intentionally a single-operator desktop tool where "auth" just means role-flagging for the Settings screen?
3. **Stock duplication**: `productos.stock` and the separate `inventory` table both track quantity. Is `inventory` the current source of truth and `productos.stock` legacy, or are they meant to be kept in sync deliberately?
4. **Product Matching DDL**: those tables are created via a runtime Rust function rather than a tracked sqlx migration file — worth flagging since it means schema changes there don't go through the same migration/rollback path as the rest of the schema. Do you want this normalized later, or is it intentionally separate?

I haven't touched any code — this is a snapshot for us to work from. Let me know how you'd like to answer the above, and what Phase 1 should focus on (UI/UX pass, workflow cleanup, or something else first).
