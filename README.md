# ERP & Catalogue System

A modern desktop ERP application built with **Tauri v2**, **React 19**, and **SQLite**. This system provides comprehensive business management tools including product catalog management, sales processing, inventory tracking, supplier price list matching, and analytics dashboards.

## Tech Stack

| Layer    | Technology                                |
| -------- | ----------------------------------------- |
| Frontend | React 19, TypeScript, Vite 7, Tailwind CSS 4, React Router 7 |
| Backend  | Rust, Tauri 2.6, sqlx 0.7, Tokio         |
| Database | SQLite (via sqlx with embedded migrations)|
| PDF      | printpdf 0.5                              |
| Excel    | calamine 0.26 (parsing), CSV (generation) |
| Auth     | bcrypt 0.15                               |

## Features

- **📚 Product Catalog** — Full CRUD for products and categories with hierarchical categorization, paginated listing, search, and grid/table views.
- **💰 Sales (POS)** — Point-of-sale interface with real-time cart management, sale registration, history browsing, and sale archiving.
- **📦 Inventory** — Stock level monitoring, manual stock updates, and stock adjustments with adjustment reasons.
- **🔗 Product Matching** — Import supplier price lists (Excel/CSV), match against internal products using name similarity with fuzzy matching and embedding-based matching, update prices in bulk.
- **📊 Dashboard** — KPI cards (total products, today's sales, low stock items, active categories, total revenue), sales trend chart, system status.
- **⚙️ Settings** — Customizable themes (Blue, Green, Purple, Professional) with light/dark variants and adjustable font sizes.
- **📄 Export** — Export product catalog to CSV (Excel-compatible) and professionally formatted PDF.
- **📋 Migration System** — Automatic database schema detection and migration between versions.

## Project Structure

```
├── frontend/                  # React + TypeScript frontend
│   └── src/
│       ├── api/              # Tauri IPC API wrappers
│       ├── components/       # Main page components
│       ├── context/          # React contexts (Auth, Dashboard, Layout)
│       ├── modules/          # Feature modules (catalogue, sales, stock, settings)
│       └── utils/            # Theme engine, PDF utilities
├── src-tauri/                # Rust backend (Tauri)
│   ├── migrations/           # SQL migration files
│   └── src/
│       ├── modules/          # Backend modules
│       │   ├── catalogue/    # Product & category management
│       │   ├── sales/        # Sales & transactions
│       │   ├── stock/        # Inventory management
│       │   ├── settings/     # System configuration
│       │   ├── dashboard/    # Analytics & KPIs
│       │   └── product_matching/  # Supplier price matching
│       ├── migration/        # Schema migration orchestrator
│       ├── db.rs             # Database initialization
│       ├── lib.rs            # Library root
│       └── main.rs           # Application entry point
└── docs/                     # Documentation
```

## Prerequisites

- [Node.js](https://nodejs.org/) >= 18
- [Rust](https://www.rust-lang.org/) (latest stable, edition 2021)
- [Tauri CLI](https://v2.tauri.app/start/cli/) (cargo install tauri-cli --version "^2")
- [pnpm](https://pnpm.io/) (recommended) or npm

## Installation

```bash
# Clone the repository
git clone https://github.com/Kevinmass/Sistema-Catalogo-y-ERP---Nuevo.git
cd Sistema-Catalogo-y-ERP---Nuevo

# Install frontend dependencies
cd frontend
pnpm install

# Build and run in development mode
cd ..
cargo tauri dev
```

## Development

```bash
# Start the Vite dev server (frontend only)
cd frontend
pnpm dev

# Run Tauri in development mode (full app)
cargo tauri dev

# Build for production
cargo tauri build
```

The application will create a SQLite database (`app.db`) in the project root on first launch, automatically applying all necessary migrations.

## Database

The system uses SQLite with embedded SQL migrations. On startup, `db.rs` automatically:

1. Creates the SQLite database file if it doesn't exist.
2. Runs SQLx migrations from `src-tauri/migrations/`.
3. Falls back to manual embedded SQL execution if SQLx migration tracking fails.
4. Verifies all tables and columns exist, applying missing migrations as needed.

See [docs/DATABASE.md](docs/DATABASE.md) for the full schema documentation.

## Architecture

This application follows a **modular architecture**:

- **Backend (Rust)**: Each business domain (catalogue, sales, stock, settings, dashboard, product_matching) is organized as a self-contained module with its own `commands.rs` (Tauri IPC handlers), `service.rs` (business logic), `db.rs` (data access), and `models.rs` (data structures).
- **Frontend (React)**: Pages correspond to backend modules. State management uses React Context providers. Communication with the backend happens exclusively through Tauri's `invoke()` IPC mechanism.
- **IPC Layer**: All data flows through Tauri commands defined in Rust and called from TypeScript via `@tauri-apps/api/core`.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for a detailed architecture overview.

## Modules

### Catalogue
Manage products with name, description, cost, stock, category assignment, and tags. Supports hierarchical categories (parent-child), paginated listing with search and category filtering, and export to CSV/PDF.

### Sales (POS)
Point-of-sale interface with product search, cart management, quantity adjustment, and sale registration. Includes sales history browsing and sale archiving/unarchiving.

### Inventory
Real-time stock levels with search and category filtering. Supports manual stock updates and stock adjustments with reasons.

### Product Matching
Import supplier price lists (Excel/CSV), match products against internal catalog using name-based fuzzy matching and text embeddings, confirm/reject matches and apply price updates in bulk.

### Dashboard
Analytics dashboard with configurable KPI cards, sales trend chart, quick-access module navigation, and system status display.

### Settings
Theme customization (4 color schemes × light/dark variants), font size adjustment, and KPI visibility configuration.

## License

This project is licensed under the ISC License.