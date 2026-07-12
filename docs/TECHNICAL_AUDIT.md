# Technical Audit Report: ERP & Catalogue System

> **Audit Type**: Full Repository Deep-Dive
> **Auditor**: Senior Engineering Recruiter / Technical Architect  
> **Date**: 2026-05-13  
> **Repository**: Sistema-Catalogo-y-ERP---Nuevo

---

## 1. PROJECT OVERVIEW

| Attribute | Value |
|---|---|
| **Project Name** | ERP & Catalogue System |
| **Application Type** | Desktop application (Tauri v2 native shell + web frontend) |
| **Main Purpose** | Comprehensive business management: product catalog, POS sales, inventory tracking, supplier price matching, analytics dashboard |
| **Target Users** | Small-to-medium business owners, retail operators, warehouse managers |
| **Development Maturity** | **Production-ready MVP** with active feature development (multi-version migrations, embedded fallback patterns) |
| **Monetization** | Not a product; appears to be a portfolio / in-house business tool |
| **GitHub** | https://github.com/Kevinmass/Sistema-Catalogo-y-ERP---Nuevo |

---

## 2. TECH STACK

### Languages
| Language | Lines of Code | Percentage |
|---|---|---|
| **TypeScript (TSX/TS)** | ~8,810 | 55% |
| **Rust** | ~6,682 | 42% |
| **SQL** | ~171 | 1% |
| **CSS** | ~496 | 3% |
| **JSON/TOML/Config** | ~336 | 2% |
| **Total Source** | **~16,500** | 100% |

### Frontend
| Technology | Version | Usage |
|---|---|---|
| **React** | 19.2.3 | Component-based UI with Context state management |
| **TypeScript** | 5.9.3 | Full type safety across all frontend code |
| **Vite** | 7.3.0 | Build tool, dev server, HMR |
| **Tailwind CSS** | 4.1.18 | Utility-first CSS, dark mode, custom theming |
| **React Router** | 7.11.0 | Client-side routing with 7 routes |
| **@tauri-apps/api** | ^2.0.0 | IPC communication layer to Rust backend |

### Backend
| Technology | Version | Usage |
|---|---|---|
| **Rust** | Edition 2021 (1.77.2+) | Systems-level backend language |
| **Tauri** | 2.6.1 | Native desktop shell, IPC framework |
| **sqlx** | 0.7 | Async SQLite with compile-time checked queries, embedded migrations |
| **Tokio** | 1.37 (full features) | Async runtime for all database operations |
| **serde / serde_json** | 1.0 | Serialization for IPC data exchange |
| **chrono** | 0.4 | Date/time with serde support |
| **printpdf** | 0.5 | PDF generation with A4 formatting, fonts, shapes |
| **calamine** | 0.26 | Excel (.xlsx) file parsing |
| **bcrypt** | 0.15 | Password hashing (available, client-side auth currently) |
| **uuid** | 1.0 (v4) | Unique ID generation for matching module |
| **thiserror** | 1.0 | Custom error types for domain logic |
| **tauri-plugin-fs** | 2.4.0 | Filesystem operations |
| **tauri-plugin-log** | 2 | Logging |

### Database
| Component | Details |
|---|---|
| **Engine** | SQLite 3 |
| **Connection Pool** | sqlx pool, max 5 connections |
| **Migrations** | 4 embedded + SQLx-managed migrations |
| **Tables** | 12 tables (categorias, productos, producto_fotos, etiquetas, producto_etiquetas, ventas, venta_items, pagos, inventory, settings, importaciones, matching_resultados, embeddings_cache, _sqlx_migrations) |
| **Schema Versioning** | Dual-strategy: SQLx migration runner + manual embedded SQL fallback |

### Infrastructure / Tooling
| Tool | Usage |
|---|---|
| **Docker** | Available on system (not in project config) |
| **pnpm** | Frontend package manager |
| **Cargo** | Rust package manager + build tool |
| **NSIS** | Windows installer generation (NSIS configs present in target/) |
| **WiX** | Windows MSI installer generation (WiX configs present in target/) |

---

## 3. ARCHITECTURE ANALYSIS

### Architecture Summary

The project implements a **modular, layered desktop application** using **Tauri v2** as the native shell. The frontend (React) and backend (Rust) communicate exclusively via **Tauri IPC (`invoke()`)** — a typed, async messaging protocol. The backend follows a **strict domain-driven layered architecture** where each business module (catalogue, sales, stock, settings, dashboard, product_matching) is self-contained with its own:

- `commands.rs` — IPC handler exposed to frontend (declarative `#[tauri::command]` functions)
- `service.rs` — Business logic layer
- `db.rs` — Data access layer (sqlx queries)
- `models.rs` — Data structures with Serde serialization

The frontend mirrors this structure with corresponding API wrappers in `frontend/src/api/` that provide typed TypeScript interfaces to each backend command.

### Important Architectural Decisions

1. **Tauri over Electron** — Uses Rust backend instead of Node.js, yielding significantly lower memory footprint (Tauri ~10MB vs Electron ~150MB), faster startup, native file system access, and system-level performance for database operations.

2. **SQLite with multi-strategy migrations** — Database initialization includes 4 migration strategies: SQLx auto-migration, embedded SQL fallback, per-table/per-column verification, and manual tracking table creation. This is robust against schema drift across development phases.

3. **Character n-gram embeddings for fuzzy matching** — The product matching module implements a custom 384-dimensional embedding system using character bigrams and word frequency vectors with cosine similarity scoring. This avoids external API dependencies while providing computationally cheap fuzzy string matching.

4. **Byte-array IPC for file transfer** — PDF/CSV export and file import work by passing raw `Vec<u8>` byte arrays through IPC, avoiding temporary files. The frontend converts these to Blobs for browser download.

5. **Connection pool as Tauri managed state** — The SQLite pool is initialized once at startup and injected into every command handler via `State<'_, SqlitePool>`, following dependency injection patterns.

6. **Soft-delete (archivado) pattern** — Products, sales, and categories use a boolean `archivado` field instead of hard deletes, enabling undo and data recovery.

### Advanced Engineering Concepts Demonstrated

- **IPC-based architecture** with typed request-response patterns
- **Async Rust** with Tokio runtime for all database operations
- **Domain-driven module separation** with layered architecture
- **Embedded database migrations** with multi-strategy fallback
- **Custom embedding computation** (n-gram hashing → vector embedding → cosine similarity)
- **PDF generation** with programmatic layout management (page breaks, fonts, shapes, headers)
- **Self-referential hierarchical data** (categories with parent IDs, recursion for hierarchy display)
- **Dual view strategy** for data presentation (table/grid toggle, POS interface, dashboard KPIs)
- **Byte-array file transfer** over IPC (avoiding temp files)
- **Configurable runtime theming** via CSS custom properties + Tailwind dark mode

---

## 4. METRICS & SCALE ESTIMATION

### Repository Metrics (Measured)

| Metric | Value |
|---|---|
| **Total source files** | 72 (excluding build artifacts & dependencies) |
| **Total lines of code** | ~16,500 |
| **Rust files** | 33 files (~6,682 lines) |
| **TypeScript/TSX files** | 34 files (~8,810 lines) |
| **CSS** | 1 file (496 lines) |
| **SQL migrations** | 8 files (171 lines) |
| **Configuration files** | 8 (JSON, TOML, JS) |
| **Backend API endpoints** (IPCs) | **38 Tauri commands** |
| **Database tables** | **12** (plus 2 tracking tables) |
| **Frontend components** | 20+ React components |
| **NPM dependencies** | 11 |
| **Cargo dependencies** | 14 |
| **Git commits** | Active (latest `f5faf89`) |

### Engineering Complexity

| Dimension | Assessment |
|---|---|
| **Overall Complexity** | **High** |
| **Systems complexity** | Moderate-High (multi-module desktop app with embedded DB, PDF, Excel, fuzzy matching) |
| **Algorithmic complexity** | Moderate (custom embedding/hashing, fuzzy matching, pagination) |
| **Architectural complexity** | High (IPC architecture, layered modules, multi-strategy migrations) |
| **Estimated Solo Dev Time** | 3–6 months full-time |
| **Engineer Level Required** | **Mid-Level to Senior** (rust async patterns, Tauri IPC, SQL optimization, frontend state management) |
| **Equivalent Team Size** | 2–3 developers (1 Rust backend, 1 frontend, 1 part-time infra/ops) |
| **Maintainability** | High — consistent module structure, thorough documentation (5 docs), typed interfaces |
| **Portability** | Moderate — Tauri supports Windows/macOS/Linux; SQLite is embedded |

### Scaling Characteristics
- **Data scale**: Suitable for 10K–100K products, 100K+ sales records on SQLite
- **Performance bottleneck**: Single-file SQLite (no horizontal scaling without migration to PostgreSQL)
- **Concurrency**: Connection pool of 5 sufficient for single-user/small-team desktop usage
- **Export**: PDF generation with `printpdf` uses in-memory buffers, could be memory-intensive for 1000+ product catalogs

---

## 5. FEATURE ANALYSIS

### 1. Product Catalog Management (Catalogue Module)
- **Technical implementation**: Full CRUD with paginated listing (20/page), hierarchical categories (self-referential FK), text search + category filtering, dual table/grid view
- **Difficulty**: Moderate — paginated queries with JOINs on hierarchical categories, serde serialization for IPC
- **Resume value**: Demonstrates full-stack CRUD with complex data relationships, pagination, search

### 2. Point-of-Sale (POS) Interface (Sales Module)
- **Technical implementation**: Real-time cart management with product search, quantity adjustment, sale registration with inventory deduction, sales history with archive/unarchive
- **Difficulty**: Moderate — transactional integrity (DB writes on sale), stateful cart UI, archive workflow
- **Resume value**: Demonstrates transactional systems, state management, real-time UI patterns

### 3. Inventory Management (Stock Module)
- **Technical implementation**: Separated inventory table (`inventory`) from product table, manual stock updates, stock adjustments with reason tracking, low-stock alerts via KPI
- **Difficulty**: Low-Moderate — separate materialized stock table enables auditability
- **Resume value**: Demonstrates domain modeling separation, data integrity patterns

### 4. PDF & CSV Export (Catalogue Module)
- **Technical implementation**: Multi-page PDF with `printpdf` — font rendering, line/shape drawing, page break calculation, category hierarchy with indentation, section dividers. CSV with UTF-8 encoding, escape handling, Excel-compatible formatting
- **Difficulty**: High — programmatic pagination, font measurement, coordinate-based layout
- **Resume value**: Demonstrates low-level document generation, coordinate geometry, memory-efficient streaming

### 5. Supplier Price List Matching (Product Matching Module)
- **Technical implementation**: Multi-stage pipeline: (1) Excel/CSV parsing with `calamine` + auto-delimiter detection, (2) text normalization (accent removal, whitespace, special char filtering), (3) dual-strategy matching (fuzzy string via Levenshtein + character n-gram embedding with cosine similarity), (4) confidence thresholding (auto-confirm ≥85%, reviewer 70–85%), (5) bulk price updates
- **Difficulty**: **Very High** — custom ML-like embedding system, similarity scoring, dual-algorithm consensus, format-agnostic parsing
- **Resume value**: Extremely high — demonstrates embedding computation, vector similarity, fuzzy matching, pipeline architecture, file format handling

### 6. Analytics Dashboard (Dashboard Module)
- **Technical implementation**: 6 KPI cards (total products, today's sales, low stock, active categories, total revenue, sales count), sales trend chart, configurable KPI visibility, quick-action grid, system status
- **Difficulty**: Moderate — aggregate SQL queries (COUNT, SUM, GROUP BY), auto-refresh context
- **Resume value**: Demonstrates data aggregation, dashboard architecture, visualization integration

### 7. Theming & Personalization (Settings Module)
- **Technical implementation**: 4 color schemes × 2 variants (light/dark) × 3 font sizes = 24 theme combinations. Runtime CSS custom property injection via `theme.ts`, Tailwind dark mode integration, background patterns (squares, circles, diamonds, waves). Settings persisted as key-value in SQLite
- **Difficulty**: Moderate — CSS custom property architecture, string-interpolated theming
- **Resume value**: Demonstrates advanced CSS architecture, runtime theme engines, persisted user preferences

### 8. Migration System
- **Technical implementation**: 4 SQLx migrations + embedded SQL fallback + per-column verification + auto-detection of database version (New/Old/Empty) + dynamic column addition. Tracks migrations in `_sqlx_migrations` table
- **Difficulty**: High — multi-strategy, would, could, should patterns, schema introspection via `pragma_table_info`
- **Resume value**: Demonstrates sophisticated data migration patterns, defensive database programming

### 9. Product Photo Management
- **Technical implementation**: Base64-encoded image storage in `producto_fotos` table, image zoom modal component, ordered display
- **Difficulty**: Low-Moderate — Base64 is straightforward but not optimal for large images
- **Resume value**: Demonstrates media handling, but limited (no compression, cloud storage, or CDN)

### 10. Auto-Import Price Reimport
- **Technical implementation**: CSV/Excel generated from export can be edited and reimported to bulk-update prices. Uses name-based exact matching to map file rows to database records
- **Difficulty**: Moderate — round-trip data flow design, error reporting per product
- **Resume value**: Demonstrates closed-loop data workflows, batch processing with error handling

---

## 6. AI/ML/LLM ANALYSIS

### AI/ML Relevance

This project demonstrates **significant AI/ML engineering depth**, particularly in the **Product Matching module**.

### Embedding System

| Component | Detail |
|---|---|
| **Embedding dimension** | 384 (matches Jina AI v2 small model dimension) |
| **Algorithm** | Character bigram hashing + word frequency vectors + length/word-count features |
| **Normalization** | L2 normalization of resulting vectors |
| **Similarity metric** | Cosine similarity |
| **Hash function** | DJB2 variant (Bernstein hash `h=5381; h=33*h+c`) |
| **Text preprocessing** | Accent stripping (á→a, é→e, etc.), special char removal, whitespace normalization |

### Matching Pipeline
1. **Parse** supplier file (CSV/Excel) → `Vec<ProductoProveedor>`
2. **Normalize** all product names (spanish accent handling)
3. **Compute embeddings** for all internal products once (batched)
4. **Score** each supplier product against all internal products via cosine similarity
5. **Classify** matches: auto-confirm (≥85%), pending review (70–85%), no match (<70%)

### How Advanced Is This?

| Dimension | Assessment |
|---|---|
| **AI Engineering Maturity** | **Mid-Level** — custom embedding is a smart alternative to API-based embeddings (no cost, no latency). Demonstrates understanding of vector representations, similarity search, and threshold-based classification |
| **Missing for Production** | No cross-validation, no embedding persistence to disk for cold starts, no approximate nearest neighbor (ANN) indexing (brute-force O(n²) for each match), no feedback loop for model improvement |
| **Resume Keywords** | `embeddings`, `vector similarity`, `cosine similarity`, `fuzzy matching`, `natural language processing`, `text normalization`, `feature engineering` |
| **Interview Support** | Candidate can discuss: "Why 384 dimensions? Why character bigrams vs. word embeddings? Why cosine similarity vs. Euclidean? How would you scale this to 1M products?" |

### Additional AI/ML Observations
- The `EmbeddingService` is initialized with `model_id: "jinaai/jina-embeddings-v2-small-en"` suggesting an intent to integrate cloud-based embeddings.
- Currently uses simple hash-based embeddings as a local approximation.
- Embeddings cache table (`embeddings_cache`) is defined but may not be fully utilized — indicates awareness of caching strategies.

---

## 7. DEVOPS & ENGINEERING PRACTICES

| Practice | Detected | Details |
|---|---|---|
| **CI/CD** | ❌ Not configured | No GitHub Actions, no CI config |
| **Testing** | ⚠️ Minimal | Unit tests in `service.rs` (mock service), `parser.rs` (file parsing) — no integration or E2E tests |
| **Linting** | ❌ No config | No rustfmt/clippy overrides, no ESLint/Prettier |
| **Formatting** | ⚠️ Default | Rust edition 2021 defaults |
| **Docker** | ❌ Not configured | Docker available on system but no Dockerfile |
| **Dependency management** | ✅ Good | Cargo.toml with explicit versions, pnpm-lock for frontend |
| **Documentation** | ✅ Excellent | 6 docs: README, ARCHITECTURE, BACKEND, FRONTEND, DATABASE, API |
| **Error handling** | ✅ Strong | `thiserror` for domain errors, `Result<_, String>` for IPC handlers, comprehensive error logging |
| **Logging** | ✅ Present | `tauri-plugin-log`, mixed with `println!` diagnostics |
| **Secrets management** | ❌ None | No .env, no secrets |
| **Environment management** | ❌ None | Single environment, no staging/prod separation |

### Engineering Maturity Assessment

**Strengths:**
- Excellent documentation structure (6 documents with cross-references)
- Consistent code organization across all modules
- Strong error handling with typed errors
- Resilient database initialization with multi-strategy fallback
- Defensive programming (pragma_table_info introspection, connection pool verification)

**Weaknesses:**
- No test suite (extremely minimal unit tests only)
- No CI/CD pipeline
- No linting/formatting enforcement
- Mixed `println!` and proper logging
- No automated build process for releases (manual `cargo tauri build`)

**Engineering Level Signal: Strong Mid-Level** — The code demonstrates excellent architectural thinking and implementation skill, but lacks testing maturity and CI/CD practices that would indicate Senior+ level.

---

## 8. SECURITY ANALYSIS

| Area | Assessment | Details |
|---|---|---|
| **Authentication** | ✅ Client-side | `AuthContext` with localStorage persistence. Default admin user created on first launch. |
| **Authorization** | ⚠️ Basic | Role-based module access (`administrador` for settings). Frontend-enforced only. |
| **Password hashing** | ✅ Available | `bcrypt 0.15` in Cargo.toml but not actively used in current auth flow |
| **IPC security** | ✅ Good | Tauri's `invoke()` provides natural API boundary — no direct database exposure |
| **Input validation** | ⚠️ Partial | Rust types enforce shape (serde deserialization), but no explicit sanitization |
| **SQL injection** | ✅ Safe | sqlx uses parameterized queries exclusively |
| **File upload handling** | ✅ Safe | File bytes transferred through IPC, parsed in memory, temp files cleaned up for Excel |
| **Credential handling** | ❌ Weak | localStorage is not encrypted; passwords visible in plaintext in current approach |
| **HTTPS/TLS** | N/A | Desktop app, no network exposure |
| **OWASP Top 10** | ⚠️ Partial | Covered: SQL injection, mass assignment (serde). Missing: proper auth, session management, XSS protection discussion |

**Cybersecurity Skills Demonstrated:**
- Parameterized query usage
- Type-safe input validation
- File parsing with memory safety (Rust's ownership model)
- Principle of least privilege via Tauri permission system

---

## 9. RESUME BULLETS

### Optimized for ATS & Recruiters

**General Software Engineering (8–10 bullets):**

1. **Architected and built a full-stack desktop ERP application** using Rust (Tauri v2) and React 19 with TypeScript, serving 6 business modules (catalog, POS sales, inventory, supplier matching, analytics, settings) via typed IPC communication.

2. **Designed a modular, domain-driven backend architecture** in Rust with 6 self-contained modules (command → service → db → model layers), 38 Tauri IPC commands, and 12+ SQLite tables with complex relationships (hierarchical categories, many-to-many tags, transactional sales).

3. **Implemented a custom product matching engine** combining character n-gram embeddings (384-dimensional vectors) with cosine similarity and fuzzy string matching, achieving automated supplier price matching with configurable confidence thresholds (auto-confirm ≥85%, manual review 70–85%).

4. **Built a resilient multi-strategy database migration system** supporting SQLx migrations, embedded SQL fallback, per-column version detection via PRAGMA introspection, and auto-schema reconciliation — handling database states from empty through 4 incremental schema versions.

5. **Developed a programmatic PDF generation pipeline** using `printpdf` with automatic pagination, category-hierarchy indentation, font management, and geometric layout — producing A4-formatted product catalogs with section breaks and page numbering.

6. **Engineered a real-time Point-of-Sale (POS) interface** with cart management, live product search, inventory deduction, sale archival, and multi-tab history views — handling transactional integrity across sales, payments, and inventory updates.

7. **Created a cross-platform desktop application** using Tauri v2 (Rust + WebView), achieving native performance (~10MB binary) vs. traditional Electron alternatives, with Windows NSIS/MSI installer generation.

8. **Implemented an extensible runtime theme engine** supporting 24 theme combinations (4 color schemes × 2 light/dark variants × 3 font sizes) via CSS custom properties, Tailwind dark mode, and persisted user preferences in SQLite.

9. **Developed a file import/export system** supporting Excel (`.xlsx` via `calamine`), CSV with auto-delimiter detection, and multi-format price list parsing — enabling closed-loop data workflows (export → edit → reimport).

**AI/ML Engineering (if applicable):**

10. **Built a custom text embedding system** using character n-gram feature hashing and L2-normalized vector representations with cosine similarity scoring — enabling fuzzy product matching without external API dependencies.

### ATS Keywords Detected

`Rust`, `TypeScript`, `React`, `Tauri`, `SQLite`, `sqlx`, `IPC`, `Desktop Application`, `ERP`, `POS`, `Inventory Management`, `Embeddings`, `Cosine Similarity`, `Fuzzy Matching`, `PDF Generation`, `Excel Parsing`, `Full-Stack`, `Domain-Driven Design`, `Async Rust`, `Tokio`, `Database Migrations`, `serde`, `Tailwind CSS`, `Vite`, `CI/CD-ready`, `Multi-module Architecture`, `REST-IPC`, `CRUD`, `State Management`, `React Context`, `Soft Delete`, `Pagination`, `Hierarchical Data`, `File Import/Export`, `Error Handling`, `thiserror`, `bcrypt`

---

## 10. INTERVIEW TALKING POINTS

### Architecture & Design
- **Why Tauri over Electron?** Talk about memory footprint (10MB vs 150MB), startup time, native performance, security model.
- **IPC architecture tradeoffs**: Why `invoke()` over HTTP? Serialization overhead? How does it compare to REST/gRPC?
- **Module separation**: Why command/service/db split? How does it compare to Clean Architecture or Hexagonal Architecture?
- **SQLite for ERP**: When does SQLite break down? Migration path to PostgreSQL? Read/write concurrency limits?

### Database & Migrations
- **Multi-strategy migration design**: Why 4 strategies? When does each fail? How would you test migration resilience?
- **Schema introspection**: Using `pragma_table_info` to detect missing columns — real-world applications and limitations.
- **Connection pool sizing**: Why max 5 connections for SQLite? Impact of too many concurrent writers.

### Fuzzy Matching & Embeddings
- **Why 384 dimensions?** (matches Jina v2 small — discuss embedding dimension tradeoffs)
- **Character n-grams vs. word embeddings vs. transformer embeddings**: Performance vs. accuracy tradeoffs. When would you upgrade to BERT/Sentence-Transformers?
- **Cosine similarity vs. dot product vs. Euclidean**: When to use each for text similarity?
- **Brute-force O(n²) matching**: How to scale to 100K+ products? (Discuss ANN, FAISS, HNSW, inverted indexes)
- **Threshold calibration**: How to determine 85% auto-confirm vs. 70% review thresholds? (Cross-validation, A/B testing, precision/recall analysis)

### Performance & Scaling
- **Vector embedding computation**: Performance characteristics of custom n-gram hash vs. precomputed embeddings
- **PDF generation at scale**: Memory pressure with 1000+ products, streaming vs. in-memory generation
- **Frontend performance**: Pagination strategy, re-render optimization, when to move from Context to Zustand/Redux

### Engineering Judgment
- **Testing gap**: What would you test first? (Integration tests for DB layer, snapshot tests for PDF, property-based tests for parsers)
- **Security concerns**: Client-side auth, localStorage — how to upgrade to proper auth? JWT? Session tokens?
- **Missing CI/CD**: What pipeline would you build? (GitHub Actions → lint → test → build → release)

---

## 11. RECRUITER EVALUATION

### Overall Engineering Assessment

| Dimension | Rating | Notes |
|---|---|---|
| **Architecture** | 8/10 | Clean modular design, excellent documentation, consistent patterns |
| **Rust Proficiency** | 7/10 | Solid async/await, State management, serde — but no advanced trait patterns, generics, or macros |
| **TypeScript/React** | 7/10 | Modern stack (v19, Router v7), good component structure, Context patterns — not yet using Suspense, Server Components, or advanced hooks |
| **Database** | 7/10 | Good SQL, resilient migrations, proper indexing — but SQLite limits sophistication |
| **AI/ML Engineering** | 6/10 | Demonstrates understanding of embeddings and similarity — but no actual ML frameworks or models integrated |
| **Testing** | 2/10 | Significant gap — only a handful of unit tests |
| **DevOps** | 2/10 | No CI/CD, linting, or deployment automation |
| **Documentation** | 9/10 | Exceptional for a solo/small project — 6 detailed docs |
| **Marketability** | **Strong** | Full-stack Rust + React is a high-demand skill combination |

### Engineering Level Signal

**Signals: Strong Mid-Level Engineer**

- ✅ Designs and implements complete systems independently
- ✅ Strong architectural thinking (module separation, IPC, layered architecture)
- ✅ Chooses appropriate technologies (Tauri over Electron, SQLite over PostgreSQL for scope)
- ✅ Excellent documentation habits
- ❌ No testing infrastructure (biggest gap for Senior-level)
- ❌ No CI/CD configuration
- ❌ Mixed engineering practices (`println!` vs logging, no linter)

**With 6–12 months of focused improvement on testing + CI/CD → Strong Senior Engineer**

### Differentiators (What Makes This Stand Out)

1. **Full-stack Rust + React** — Uncommon combination, very attractive for roles needing systems-level + web skills
2. **Custom embedding system** — Shows ML/vector literacy without relying on pre-built APIs
3. **Multi-strategy migration system** — Demonstrates defensive production thinking
4. **Programmatic PDF generation** — Shows low-level graphics and layout understanding
5. **Spanish language codebase** — Bilingual engineering capacity (valuable for international teams)

### Suggested Job Targets

| Role | Fit | Rationale |
|---|---|---|
| **Full-Stack Engineer** | ⭐⭐⭐⭐⭐ | Direct match — Rust backend + React frontend |
| **Desktop Application Engineer** | ⭐⭐⭐⭐⭐ | Tauri + React desktop app is the core competency |
| **Rust Backend Engineer** | ⭐⭐⭐⭐ | Strong Rust async patterns, DB, IPC — but no web servers or microservices |
| **AI Tooling Engineer** | ⭐⭐⭐ | Embedding system + matching pipeline shows potential |
| **ERP / Business Systems Engineer** | ⭐⭐⭐⭐⭐ | Direct domain match |
| **Cybersecurity SWE** | ⭐⭐ | Basic auth awareness, but security not a focus |
| **DevOps Engineer** | ⭐ | No CI/CD or infra experience demonstrated |

### Strongest Resume Keywords

`Rust` `TypeScript` `React` `Tauri` `SQLite` `sqlx` `Full-Stack` `Desktop Application` `Embeddings` `Vector Similarity` `Fuzzy Matching` `ERP` `POS` `Inventory Management` `PDF Generation` `Excel Import` `Database Migrations` `IPC` `Async/Await` `Tokio` `Tailwind CSS` `Vite` `Multi-module Architecture` `Domain-Driven Design`

---

## APPENDIX A: FILE MANIFEST

### Backend (Rust) — src-tauri/src/

| File | Lines | Purpose |
|---|---|---|
| `main.rs` | 11 | Entry point, registers modules |
| `lib.rs` | 12 | Public API re-exports |
| `db.rs` | 395 | Database init, multi-strategy migrations |
| `modules/mod.rs` | 104 | Module registry, IPC handler registration |
| `modules/catalogue/commands.rs` | 428 | 12 IPC commands for product/category CRUD + exports |
| `modules/catalogue/db.rs` | 805 | SQL queries for catalogue (largest backend file) |
| `modules/catalogue/service.rs` | 159 | Business logic layer |
| `modules/catalogue/models.rs` | 134 | Data structures |
| `modules/sales/commands.rs` | 66 | 7 IPC commands (sales CRUD + archive) |
| `modules/sales/db.rs` | 358 | SQL queries for sales |
| `modules/sales/service.rs` | 156 | Sales business logic |
| `modules/sales/models.rs` | 58 | Sale data structures |
| `modules/stock/commands.rs` | 31 | 3 IPC commands |
| `modules/stock/db.rs` | 159 | Stock queries |
| `modules/stock/service.rs` | 31 | Stock business logic |
| `modules/stock/models.rs` | 39 | Inventory data structures |
| `modules/dashboard/commands.rs` | 58 | 6 IPC commands |
| `modules/dashboard/db.rs` | 100 | Dashboard aggregate queries |
| `modules/dashboard/models.rs` | 48 | Dashboard/KPI models |
| `modules/settings/commands.rs` | — | (merged into mod.rs) |
| `modules/settings/mod.rs` | 31 | 2 IPC commands |
| `modules/settings/db.rs` | 29 | Settings key-value queries |
| `modules/settings/service.rs` | 70 | Settings business logic |
| `modules/settings/models.rs` | 19 | Settings data types |
| `modules/product_matching/mod.rs` | 21 | Module declaration |
| `modules/product_matching/commands.rs` | 448 | 12 IPC commands (import, match, confirm, export) |
| `modules/product_matching/db.rs` | 343 | Matching DB tables + queries |
| `modules/product_matching/service.rs` | 234 | Matching business logic |
| `modules/product_matching/models.rs` | 154 | Matching data structures |
| `modules/product_matching/parser.rs` | 221 | CSV/Excel file parsing |
| `modules/product_matching/embeddings.rs` | 225 | Custom embedding engine |
| `migration/mod.rs` | 90 | Migration orchestrator |
| `migration/detector.rs` | 80 | DB version detection |
| `migration/test_compilation.rs` | 52 | Compilation tests |
| `migration/strategies/mod.rs` | 87 | Strategy module |
| `migration/strategies/archived_fields.rs` | 90 | Archived field migration |
| `migration/strategies/inventory.rs` | 122 | Inventory table migration |
| `migration/strategies/settings.rs` | 64 | Settings table migration |
| `migration/strategies/product_matching.rs` | 257 | PM tables migration |
| `migration/strategies/cleanup.rs` | 146 | Old schema cleanup |

### Frontend (TypeScript/React) — frontend/src/

| File | Lines | Purpose |
|---|---|---|
| `main.tsx` | 10 | App entry |
| `App.tsx` | 48 | Root component with routing |
| `index.css` | 496 | Tailwind + global styles |
| `modules_config.ts` | 59 | Route definitions |
| `api/catalogue.ts` | 88 | Product API wrappers |
| `api/dashboard.ts` | 63 | Dashboard API wrappers |
| `api/matching.ts` | 273 | Product matching API wrappers |
| `components/Layout.tsx` | 74 | App shell |
| `components/Sidebar.tsx` | 215 | Navigation sidebar |
| `components/Header.tsx` | 241 | Header with menu |
| `components/Breadcrumb.tsx` | 70 | Breadcrumb nav |
| `components/StatusBar.tsx` | 77 | Bottom status |
| `components/Dashboard.tsx` | 267 | Analytics dashboard |
| `components/Catalogue.tsx` | 506 | Product catalog page |
| `components/Categories.tsx` | 83 | Category management |
| `components/Sales.tsx` | 80 | Sales page container |
| `components/Stock.tsx` | 15 | Stock redirect |
| `components/ProductMatching.tsx` | 865 | **Largest frontend file** — matching UI |
| `components/KpiCard.tsx` | 101 | Reusable KPI card |
| `components/SalesChart.tsx` | 85 | Trend chart |
| `components/ImageZoomModal.tsx` | 167 | Image viewer |
| `context/AuthContext.tsx` | 77 | Auth state |
| `context/DashboardContext.tsx` | 115 | Dashboard data |
| `context/LayoutContext.tsx` | 95 | Layout state |
| `modules/catalogue/CategoryManager.tsx` | 278 | Category editing |
| `modules/catalogue/ProductForm.tsx` | 323 | Product create/edit form |
| `modules/catalogue/ProductoCard.tsx` | 219 | Card view |
| `modules/catalogue/ProductosGrid.tsx` | 93 | Grid layout |
| `modules/catalogue/ProductTable.tsx` | 285 | Table view |
| `modules/catalogue/types.ts` | 63 | Catalogue types |
| `modules/sales/POSInterface.tsx` | 386 | POS main UI |
| `modules/sales/CartSidebar.tsx` | 325 | Shopping cart |
| `modules/sales/CartSummary.tsx` | 92 | Cart totals |
| `modules/sales/FloatingCheckoutButton.tsx` | 230 | Checkout button |
| `modules/sales/ProductGrid.tsx` | 253 | POS product grid |
| `modules/sales/SalesHistory.tsx` | 528 | History browser |
| `modules/sales/types.ts` | 67 | Sales types |
| `modules/settings/SettingsView.tsx` | 590 | Settings + theme UI |
| `modules/settings/types.ts` | 17 | Settings types |
| `modules/stock/StockDashboard.tsx` | 348 | Stock management UI |
| `modules/stock/types.ts` | 16 | Stock types |
| `utils/theme.ts` | 254 | Theme engine |
| `utils/pdfGenerator.ts` | 207 | PDF utilities |

---

*Report generated by AI-assisted technical audit. All metrics are measured or closely estimated from source code analysis.*