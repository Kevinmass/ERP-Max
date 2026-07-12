# FINDINGS — Phase 1 Analysis

> Deep read of the actual execution paths for sales, stock, and price updates, plus a workflow critique.
> No code was changed. Nothing here is implemented. Effort key: **S** ≈ <½ day, **M** ≈ ½–2 days, **L** ≈ 3+ days.
> Items touching the data layer's correctness are tagged **⚠ DATA-LAYER** per our ground rules — I will not touch these without explicit sign-off.

Severity is about **commercial risk** (a buyer relying on this to run a real shop), not code aesthetics.

---

## HIGH

### H1 — There is no selling price; `costo` is used as both cost and sale price ⚠ DATA-LAYER
**What.** `productos` has a single money column, `costo`. The POS charges `costo` directly (`process_sale`: `SELECT costo FROM productos … final_price = precio_modificado.unwrap_or(base_price)`, `sales/db.rs:16-26`). Supplier price matching and the catalogue price reimport both **overwrite `costo`** with the supplier's number (`product_matching/commands.rs:211`, `catalogue/db.rs:348`).
**Why it matters commercially.** The app has no concept of margin. Every sale is booked at cost, so "Total Revenue" on the dashboard is really total *cost of goods*, not revenue — the headline business number is wrong. Worse: the moment an operator updates a supplier cost (the whole point of the Matching module), the shop's **selling price silently changes to cost**. For a product meant to be sold to retailers, this is close to a dealbreaker.
**Proposed fix.** Introduce a distinct `precio_venta` (sale price) column alongside `costo`. POS charges `precio_venta`; matching/reimport only ever touch `costo`; optionally support a margin rule (`precio_venta = costo × (1 + markup)`) as a convenience. Migration backfills `precio_venta = costo` so nothing breaks on day one. **Effort: M** (schema migration + touch sale/insert/read + matching + reimport + product form). Needs your decision — see Q1.

### H2 — Sale line-item prices are never stored, so historical sales silently rewrite themselves ⚠ DATA-LAYER
**What.** `venta_items` stores `cantidad` but **no unit price**. `precio_modificado` is accepted, used to compute the sale header `total`, then discarded on insert (`sales/db.rs:50-62`). When history is read back, each line's `subtotal` is recomputed from the product's *current* `costo` (`sales/db.rs:162-164`). 
**Why it matters commercially.** Two concrete failures: (1) the sale header `total` and the sum of its displayed line items **diverge** whenever a price changed after the sale, or whenever `precio_modificado` was used at checkout — the receipt no longer adds up. (2) A past sale is **not reproducible**: change a product's price today and every historical invoice for it shows different line amounts. This breaks accounting, returns, and any audit. It's a data-integrity bug, not cosmetic.
**Proposed fix.** Add `precio_unitario` (and ideally `costo_unitario` for margin reporting) to `venta_items`, write the actual charged price at checkout, and read it back instead of recomputing. Backfill historical rows from current `costo` (best effort, one-time). **Effort: M.** Pairs naturally with H1.

### H3 — Two sources of truth for stock that actively drift apart ⚠ DATA-LAYER
**What.** Quantity lives in **both** `productos.stock` and `inventory.quantity`. Sales and sale-deletion only adjust `inventory` (`sales/db.rs:79-84`). But product **edit** sets `productos.stock` to an absolute value and then adjusts `inventory` by `new_stock − productos.stock` (`catalogue/db.rs:474-476`, `515+`). Because sales never decrement `productos.stock`, that column is stale the instant a sale happens — so the next product edit computes a **wrong delta** and corrupts `inventory`.
**Why it matters commercially.** Worked example: product has stock 10 (both tables agree). Sell 3 → `inventory`=7, `productos.stock` still 10. Operator edits the product and sets stock to 10 (a no-op in their mind) → delta = 10−10 = 0 → `inventory` stays 7 though they think they set 10. Or they set 12 → delta = +2 → `inventory` = 9, not 12. Inventory becomes untrustworthy, which cascades into low-stock alerts and the dashboard.
**Proposed fix.** Pick `inventory` as the single source of truth and make `productos.stock` a read-through (or drop it). Product edit should *set inventory absolutely*, not diff against a stale mirror. **Effort: M** (touches create/update/read + the migrate helper). Needs your decision — see Q2.

### H4 — Sales never check stock availability; inventory goes negative silently ⚠ DATA-LAYER
**What.** `process_sale` inserts items and calls `adjust_stock_tx` with a negative delta with **no check** that stock ≥ quantity (`sales/db.rs:78-84`). `adjust_stock_tx` computes `new = existing + delta` and writes it even if negative (`stock/db.rs:99-131`).
**Why it matters commercially.** The shop can sell 50 units of something it has 3 of, and nothing warns anyone. Oversell → broken fulfilment, negative on-hand counts, and the "low stock" KPI becoming meaningless. Most real users expect at least a warning at checkout.
**Proposed fix.** Validate availability inside the sale transaction; block or warn on shortfall (policy is your call — hard-block vs allow-with-confirmation). Return a typed error the POS can surface. **Effort: S–M.** Needs your decision — see Q3.

### H5 — The dashboard shows fabricated data ⚠ (trust)
**What.** On the entry screen: every KPI trend badge is a hardcoded literal (`+12.5% vs last month`, `+8.2% vs yesterday`, …, `Dashboard.tsx:35-87`); "Recent Activity" is a static fake array (`:219-224`); "System Status" shows invented "Storage 45% Used" and "Last Backup 2 hours ago" (`:253-260`).
**Why it matters commercially.** This is the first thing a prospective buyer sees, and it's lying. Invented trend arrows and a fake "last backup" line destroy credibility instantly in a demo — and a fake backup indicator is actively dangerous (implies a safety net that doesn't exist). Technically trivial to fix, high reputational cost to leave.
**Proposed fix.** Compute trends from real data or remove the badges; wire "Recent Activity" to real recent sales/products or cut it; delete the fake System Status panel (or replace with real DB/file status). **Effort: S** to strip, **M** to make trends genuinely real.

---

## MEDIUM

### M1 — Three near-identical copies of the sales-history query (duplication + N+1)
**What.** `get_sales_history`, `get_archived_sales`, and `get_sales_history_with_filter` in `sales/db.rs` are ~95% identical (~180 lines of copy-paste), differing only in a `WHERE archivado` clause. All three also fetch items **one query per sale** (N+1).
**Why it matters.** Three places to fix every future bug (and H2's fix would have to be applied three times). N+1 is fine at 20 rows, sluggish at commercial history sizes.
**Proposed fix.** Collapse to one function taking a filter enum; fetch items for the whole page in a single `WHERE venta_id IN (…)` query. **Effort: S–M.**

### M2 — Price reimport & matching-apply are non-transactional and re-implement stock logic
**What.** `reimportar_precios_catalogo` updates prices in a per-row loop with no transaction (`catalogue/commands.rs:405-421`) — a failure midway leaves prices half-updated with no rollback. `aplicar_actualizacion_precios` inlines its own copy of the inventory upsert (`commands.rs:243-254`) instead of calling the stock module, and is likewise non-transactional.
**Why it matters.** Bulk price updates are exactly where partial failure hurts (some products repriced, some not, no record of which). Duplicated stock logic will drift from the real one.
**Proposed fix.** Wrap each batch in a transaction; route all stock writes through `stock::db::adjust_stock_tx`. **Effort: S–M.**

### M3 — Matching treats the supplier's "cantidad" as your absolute stock level ⚠ DATA-LAYER
**What.** `aplicar_actualizacion_precios` sets your inventory to the supplier file's quantity column (`stock_delta = cantidad − current_stock`, `commands.rs:238`).
**Why it matters.** A supplier price list's quantity means "what the supplier has," not "what you have." Applying a price update would overwrite the shop's real on-hand counts with the supplier's numbers. Likely not intended.
**Proposed fix.** Decouple price update from stock update; if a "receive stock from this list" feature is wanted, make it an explicit, separate, opt-in action. **Effort: S.** Needs your confirmation — see Q4.

### M4 — `app.db` is created in `current_dir`, not an app-data directory ⚠ DATA-LAYER
**What.** `init_db` puts the database at `current_dir()/app.db` (`db.rs:11-12`).
**Why it matters.** For a shipped desktop app, the working directory is unpredictable (often the install dir, which may be read-only under `Program Files`, or wherever a shortcut launches from). Result: the DB can land in the wrong place, fail to write, or the user ends up with **multiple app.db files** depending on how they launched — i.e. "my data disappeared." This will surface the moment it's installed on a real machine rather than run from the dev folder.
**Proposed fix.** Use Tauri's resolved app-data dir (`app_data_dir`) for the DB path. **Effort: S** (but it's data-location — flag before doing). Also relates to there being **no backup/export-of-DB** story at all.

### M5 — Bilingual UI (Spanish/English mixed in the same screens)
**What.** The dashboard alone mixes "Dashboard / Overview of your business operations / Active inventory items / Recent Activity / Quick Access" with "Ventas de Hoy / Productos Totales / Nueva Venta." This pattern recurs across components.
**Why it matters.** For a product sold into a Spanish-speaking market, half-English UI reads as unfinished. It's the kind of thing that makes a demo feel like a prototype.
**Proposed fix.** Pick one UI language (Spanish, given the market and data model) and normalize; if multi-locale is a future goal, introduce a tiny i18n layer. **Effort: M** to normalize now, more if i18n. Needs your decision — see Q5.

### M6 — `db.rs` init is a 400-line hand-rolled migration engine that bypasses the `migration/` module
**What.** `init_db` contains three deeply-nested, near-duplicate branches that re-detect tables/columns and re-apply embedded SQL by hand. Meanwhile a `migration/` module with a detector and strategy pattern exists and is re-exported (`lib.rs:12`) but **isn't called** by init.
**Why it matters.** Migrations are the highest-blast-radius code in the app (they can corrupt or wipe real customer data). This one is very hard to reason about, has no tests exercising the branches, and there's a whole abstraction sitting unused next to it — so it's unclear which is authoritative. Fragile foundation for a product that will need schema changes over time.
**Proposed fix.** Decide on one migration path (lean on sqlx's own migrator, which already tracks state) and delete the hand-rolled fallback, or consolidate onto the `migration/` module. **Effort: M.** ⚠ DATA-LAYER — analysis only until you approve.

---

## LOW

### L1 — `println!` diagnostics in hot paths
`get_products_service`/`get_productos` log every call (`catalogue/service.rs:16`, `commands.rs:35`); migration prints extensively. Use the already-present `tauri-plugin-log`, gate behind debug, or remove. **Effort: S.**

### L2 — Manual row-mapping where `FromRow` is already derived
`Venta` derives `sqlx::FromRow` yet every read hand-maps each column with `.try_get().map_err()` (dozens of lines ×3 in `sales/db.rs`). Switching to `query_as` removes a large chunk of boilerplate and a class of typo bugs. **Effort: S** (folds into M1).

### L3 — Half-built per-item delivery tracking
`venta_items` carries `entregado`, `fecha_entrega`, and a per-item `estado` (`models.rs`) that nothing in the write path sets meaningfully (always `0`/`'pendiente'`). Either a feature was started and abandoned or it's latent scope. Worth a decision: finish it (delivery workflow) or remove the columns to reduce confusion. **Effort: S to note / M+ to build.** Needs your input — see Q6.

### L4 — Role gating is decorative
`Sidebar.tsx:13-14` renders all modules with the comment "All modules are visible since there's no authentication," ignoring `requiredRole`. Settings is nominally admin-only but shown to everyone. Consistent with auth being a stub. Ties directly to the auth question (Q3 from PROJECT_MAP). **Effort: depends on auth decision.**

---

## Cross-cutting observation on entry point & daily flow (workflow critique)

**Current:** the app opens on a KPI dashboard (`/`), with all modules in a left sidebar and a "Quick Access" grid that duplicates the sidebar. Half the dashboard is fabricated (H5).

**Critique.** For a catalogue + POS ERP, the operator's job-to-be-done on open is almost always **"sell something"** or **"find/edit a product / check stock."** A KPI wall is a *management* view (end-of-day, weekly), not a *daily-driver* view — and here it's mostly fake numbers, so it currently adds a click to every real task while projecting false data. The Quick Access grid also duplicates navigation that already exists in the sidebar, so the landing screen is largely redundant.

**Options for a better flow (for discussion, not yet built):**
- **A — Task-first launcher.** Land on a lean action screen: big "Nueva venta," a product search box, and a short "needs attention" strip (low stock, today's real sales). Dashboard/analytics demoted to its own tab. *Best for a shop that lives in the POS.*
- **B — Role-aware landing.** Owner/admin → dashboard (once it's real); cashier/operator → POS. Requires real auth/roles to exist (ties to Q3). *Best if you're selling to multi-seat businesses.*
- **C — Keep dashboard-first, but make it honest and actionable.** Real trends, real recent activity, low-stock items that are click-to-act, remove fake panels. Lowest disruption. *Best if the buyer persona is an owner-operator who wants the overview.*

My lean: **A for daily use, with a trimmed honest dashboard (C) available as a secondary tab** — most retail operators want to get to selling fast, and the analytics view earns its place at close-of-day rather than on every launch. But this depends on who you're selling to.

---

## Questions I need answered before Phase 2

1. **Selling price (H1/H2):** Confirm the intended model — is `costo` meant to be cost-only (so we add a real `precio_venta` + margin), or has it always been "the price" and cost isn't tracked separately? This drives the biggest change.
2. **Stock source of truth (H3):** Should `inventory` become authoritative and `productos.stock` be retired, or do you rely on `productos.stock` anywhere I should preserve?
3. **Oversell policy (H4) + auth (L4):** On a sale with insufficient stock — hard block, or warn-and-allow? And separately: is real authentication/roles in scope for the commercial version, or is this a single-operator tool where role gating can be dropped honestly?
4. **Matching & stock (M3):** When applying a supplier price update, should it ever touch your on-hand stock at all? My assumption is no — confirm.
5. **UI language (M5):** Standardize on Spanish? Or is English/multi-locale a goal worth building an i18n layer for?
6. **Delivery tracking (L3):** Is the per-item `entregado`/`estado` a feature you want finished, or dead scope to remove?
7. **Sequencing:** Given the above, do you want Phase 2 to start with the **data-integrity cluster (H1–H4)** — the commercially riskiest — or with a **visible UI/workflow win (H5 + entry flow)** for morale/demo value? I can argue either; the integrity issues are the ones that would embarrass the product in real use.

I have not written or changed any feature code. Everything above is proposal-stage.
