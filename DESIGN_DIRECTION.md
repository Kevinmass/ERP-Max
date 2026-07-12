# DESIGN DIRECTION — Phase 2

> Design only. Nothing here is implemented.
>
> **DECISIONS LOCKED (2026-07-12):**
> - **Identity: B — «Taller»** (full spec in §1B below; A and C kept for the record, not pursued)
> - **Nav/landing rework approved as proposed** (§6) — Phase-1 Q7 resolved: task-first
> - **Spanish-first UI** (Q5 resolved) · **Background patterns retired**; themes = Taller × light/dark × 2 density modes

---

## 0. Who this is for, and what that forces

This is not a SaaS marketing site. It's a tool an Argentine shop owner opens at 8am and leaves open until close. That dictates almost everything:

- **It's read under bad conditions** — cheap monitors, sunlight, a hurry. High contrast and unambiguous state colors beat subtle elegance.
- **It's mostly numbers** — prices, quantities, totals. Numeric typography is the real "brand surface," not hero illustrations.
- **It's used hundreds of times a day** — motion must make it feel *faster*, never make the user wait. [Linear's motion values](https://performance.dev/how-is-linear-so-fast-a-technical-breakdown) (100ms quick / 250ms regular, instant-in / fade-out) are the right register, not Material's 300ms+.
- **It's a desktop app (Tauri)** — fonts must be bundled locally (no CDN at a point of sale with flaky internet), keyboard-first is viable and expected, and we can use density levels a website can't.

**The anti-generic stance.** The current UI is the statistical average of admin templates: Tailwind blue-600, gradient sidebar header, emoji icons, rounded-xl cards with soft shadows. The [sameness problem](https://superdesign.dev/blog/why-ai-design-looks-generic) is fixed by committing to specific, opinionated tokens — exact hexes, one accent, a real icon set, one signature idea — not by "clean and modern." Every option below is specified to that level.

**Signature idea (all options share it): the ledger.** Small businesses here ran on paper ledgers and printed receipts for a century. The app borrows that language quietly: ruled-line separators instead of card shadows, tabular numerals aligned like a ledger column, a receipt-styled sale confirmation. It's a motif with a *reason* — not decoration.

---

## 1. Identity options

Three directions. Each is a complete token set; they share the same spacing, motion, and component grammar (§3–§5), so switching later is cheap — that's the point of normalizing tokens first.

### Option A — «Libreta» (recommended)
*Warm paper + ink + ledger green. The trusted notebook, digitized.*

| Token | Light | Dark |
|---|---|---|
| `--bg` (app) | `#F7F5F0` warm paper | `#141311` |
| `--surface` (panels) | `#FFFFFF` | `#1D1B18` |
| `--surface-raised` | `#FFFFFF` + 1px border | `#26231F` |
| `--border` | `#E3DFD5` | `#38342E` |
| `--text` | `#1C1B18` ink | `#EDEAE2` |
| `--text-muted` | `#6E6A60` | `#9B968A` |
| `--accent` | `#1E6B4F` ledger green | `#4CC38A` |
| `--accent-contrast` | `#FFFFFF` | `#10281D` |
| `--money-positive` | `#1E6B4F` | `#4CC38A` |
| `--danger` | `#B4372E` stamp red | `#E5645A` |
| `--warning` | `#9A6B15` | `#E2B04A` |
| `--info` | `#2B5D8A` | `#6FA8D6` |

Character: warm, calm, obviously *not* a template (nobody's default is paper-warm neutrals + green). Green = money = the accent means something. Danger red reads like a rubber stamp on paper. Fits a catalogue/POS product emotionally — it replaces the notebook.

### Option B — «Taller» ✅ CHOSEN
*Steel + high-visibility amber. Industrial signage for hardware stores / warehouses.*

| Token | Light | Dark |
|---|---|---|
| `--bg` (app) | `#F2F3F5` cool steel | `#101214` |
| `--surface` (panels) | `#FFFFFF` | `#1A1D21` |
| `--surface-raised` | `#FFFFFF` + 1px border | `#22262B` |
| `--border` | `#D9DCE1` | `#343A42` |
| `--border-strong` (controls) | `#B8BDC6` | `#4A525C` |
| `--text` | `#16181B` | `#E9EBEE` |
| `--text-muted` | `#5E6570` | `#98A1AC` |
| `--accent` | `#C25E00` safety amber | `#F5A623` |
| `--accent-contrast` | `#FFFFFF` | `#231400` |
| `--money-positive` | `#1F7A46` | `#4CC38A` |
| `--danger` | `#C4302B` | `#E5645A` |
| `--warning` | *unified with accent* — attention = amber, by design | idem |
| `--info` | `#2E6699` | `#6FA8D6` |
| `--selected-bg` (rows/tiles) | `#FBF3E7` amber 6% | `#2A241A` |

Character rules that make Taller *Taller* (and not a recolor of a template):
- **Corners: 4px everywhere.** No rounded-xl anywhere. Badges are 3px-radius rectangles, not pills.
- **Controls carry `--border-strong`** (1px, visibly darker than panel borders) — chunky, physical, hits well at a counter.
- **Headings in Archivo SemiExpanded 600, uppercase for section labels** — industrial signage register; body stays Archivo normal.
- **Attention = amber, unified.** The accent doubles as the warning hue on purpose: in a workshop, the highlighted thing *is* the thing needing attention. Money stays green, errors stay red — three unambiguous signals total.
- Focus rings: 2px amber outer ring, 2px offset — visible from arm's length.
- Dark mode is the flagship look (graphite + amber reads best); light mode is the daylight-counter variant.

### Option C — «Mostrador»
*Graphite + electric blue. The conservative modern-SaaS register done properly.*

Light: `--bg #FAFAFA`, `--surface #FFFFFF`, `--text #18181B`, `--accent #2563EB`, dark `#0E0E10`/`#1B1B1F` with `#5B8DEF`. Closest to current look, lowest retraining cost for your eye — but also the direction most exposed to the "looks like every AI admin" problem. Included honestly as the safe path; I'd pick A over it.

**What replaces the current 4-schemes×2×3 theme engine:** one identity (chosen above) × light/dark × 2 density levels. The existing CSS-custom-property mechanism in `theme.ts` survives — we *narrow* it, we don't rebuild it. Fewer combinations, each actually designed. (The decorative background patterns — squares/circles/waves — I propose retiring; they fight legibility and scream template.)

---

## 2. Typography

Bundled locally (open licenses, ship with the app):

| Role | Face | Why |
|---|---|---|
| UI text | **Instrument Sans** (A/C) or **Archivo** (B) | Real character without novelty; not Inter (Inter is the sameness default) |
| Numbers & data | Same face with **`font-variant-numeric: tabular-nums`** everywhere data lives | Prices/quantities align in columns like a ledger — single highest-leverage craft detail in this app |
| Receipt/mono moments | **Spline Sans Mono** | Sale confirmation, SKU/codes, kbd hints |

Scale (4px-grid line heights, per [Polaris typography](https://polaris-react.shopify.com/design/typography)): 12 / 13 / 14 (body) / 16 / 20 / 24 / 30. Weights 400/500/600 only. Big totals (POS "TOTAL") use 30/600 tabular — the number *is* the interface.

## 3. Spacing, density, surfaces

- **4px base grid** for all spacing and type ([Polaris spacing](https://legacy.polaris.shopify.com/design/spacing)); scale: 4, 8, 12, 16, 24, 32, 48.
- **Density modes** replace "3 font sizes": *Cómodo* (default) and *Compacto* (rows 40px→32px, paddings one step down) — a real ERP need (long product tables).
- **Borders over shadows.** Panels are 1px-bordered surfaces; a single `shadow-sm` tier is reserved for genuinely floating things (menus, dialogs). Ruled lines (`--border`) separate table rows — the ledger motif.
- Radius: 6px controls, 8px panels, max 10px (A/C); 4px across the board (B). Nothing pill-shaped except status badges.
- **Icons: Lucide, 16/20px, 1.5px stroke — emojis exit the UI entirely.** (📚💰📦 as navigation is the single most prototype-looking thing in the app today.)

## 4. Component language (grammar, one line each)

- **Buttons**: solid accent = the one primary action per screen; bordered neutral = everything else; danger is bordered until confirmed. Press state translates 0.5px down + darkens 4% — physical, instant.
- **Tables**: header row 12px/600 uppercase muted; rows hover-tint; numbers right-aligned tabular; row actions appear on hover/focus, never permanently.
- **Forms**: labels above, 13px/500; errors inline under field in `--danger` with icon; no floating labels.
- **Badges** (stock/sale states): filled-soft (10% tint bg + full-color text), never solid rectangles of red.
- **Empty states**: every module gets one — icon, one sentence, one primary action ("No hay productos todavía → Cargar el primero"). First-run experience is made of these.
- **Toasts**: bottom-right, 3.5s, max 3 stacked; success toasts carry the undo when the action is reversible.
- **Command palette** (`Ctrl+K`): global product/action search — the power-user spine ([POS UX tactics](https://dev.pro/insights/designing-a-pos-system-ten-user-experience-tactics-that-improve-usability/) — reduce clicks per task).
- **`<kbd>` hints** rendered in mono on buttons that have shortcuts (F2 nueva venta, / buscar).

## 5. Motion & interaction spec

Philosophy: [Carbon's split](https://carbondesignsystem.com/elements/motion/overview/) — **productive** motion (fast, subtle, invisible) for 95% of the app; **expressive** motion reserved for the few moments that deserve celebration or alarm. Timing register from [Linear](https://performance.dev/how-is-linear-so-fast-a-technical-breakdown): asymmetric — things appear ~instantly, disappear gently.

**Tokens**
```
--motion-instant: 0ms        (state colors: hover/active tints)
--motion-fast:    90ms       (press feedback, checkbox, toggle)
--motion-base:    160ms      (dropdowns, popovers, row expand — enter)
--motion-exit:    120ms      (same elements — exit, fade only)
--motion-panel:   220ms      (drawers, dialogs, route content)
--motion-expressive: 400ms   (sale success, destructive confirm shake)
--ease-out:  cubic-bezier(0.2, 0, 0, 1)      (enters — fast start, soft landing)
--ease-in:   cubic-bezier(0.4, 0, 1, 1)      (exits)
--ease-spring: cubic-bezier(0.34, 1.3, 0.64, 1)  (expressive only, mild overshoot)
```

**Choreography rules**
1. Motion must do **spatial work** — panels slide from the edge they belong to; dropdowns scale from their trigger (transform-origin at the anchor). Nothing fades in "from nowhere."
2. **Never block input** on animation; everything is interruptible.
3. Larger travel = slightly longer duration (Carbon's non-linear scale), capped at 220ms.
4. `prefers-reduced-motion`: all transforms off, opacity-only at 80ms.

**Micro-interactions (the "alive" list, each with a job):**
- **Add to cart (POS)**: product tile presses down (90ms), a compact line-item slides into the cart list (160ms ease-out) and its price *ticks* up into the running total (number tween, 200ms). Feedback = "it counted," visible from the corner of your eye.
- **Sale completed** — the one expressive moment: cart panel resolves into a **receipt card** (mono type, dashed rule edges) that slides up 400ms spring, with the total stamped in; auto-clears to a fresh sale after 2s or on keypress. Celebration with a purpose: confirms *what* was charged.
- **Low stock**: when a checkout leaves an item under its minimum, its row gets a single amber flash (400ms, once — no infinite pulsing) and the "Atención" strip on Home increments.
- **Destructive confirm**: dialog does a 4px horizontal shake if user tries to confirm without typing the required word (delete product with sales history).
- **Optimistic rows**: edits apply instantly at 60% confidence styling (slight opacity) and settle to full on backend ack; on failure the row flashes red once and reverts — honest optimism.
- **KPI numbers** (Análisis): count up on first paint only (300ms), never on refresh — data updating shouldn't feel like a slot machine.
- **Skeletons** only for >200ms expected loads; under that, nothing (a skeleton that flashes for 50ms reads as jank).

## 6. Workflow & navigation rework (concrete screens)

Implements Phase-1 recommendation **A + honest C**, pending your Q7 answer.

**Navigation model** — sidebar reorganized into two zones, Spanish-first:

```
OPERACIÓN            GESTIÓN
▸ Hoy        (land)  ▸ Análisis      (the honest dashboard)
▸ Vender     (POS)   ▸ Proveedores   (matching, renamed)
▸ Catálogo           ▸ Configuración
▸ Inventario
```
(“Categorías” folds into Catálogo as a tab — it's not a destination, it's a facet.)

**S1 — «Hoy» (new landing).** One screen, three bands:
1. Action band: `Nueva venta (F2)` primary button + global search field (`/`) — the two things that start 90% of sessions.
2. **Atención** strip: real items only — low-stock products (click → restock drawer), pending matching reviews, nothing if nothing (strip collapses; no fake activity, per Finding H5).
3. Hoy en números: 3 small live stats (ventas de hoy $, operaciones, artículos vendidos) — today only; deep analysis lives in Análisis.

**S2 — «Vender» (POS focus mode).** Sidebar auto-collapses to icon rail; left = product grid with category chips + search always focused; right = cart ledger (tabular columns, running total bottom-anchored, 30px). Keyboard path: `/` search → arrows → Enter adds → `F12` cobrar. States: empty cart (hint + shortcuts), insufficient stock (inline amber on the line item — behavior per your H4 answer), success (receipt moment, §5).

**S3 — «Análisis»** (dashboard demoted & de-faked): real KPIs with real deltas or no deltas, sales trend, top products; the fabricated Recent Activity / System Status panels are deleted. Owner opens it deliberately at close of day.

**S4 — First run.** Fresh DB currently lands on a dashboard of zeros. Instead: a 3-step welcome (nombre del negocio → primera categoría/producto or importar CSV → listo) then Hoy with empty-states doing the rest of the onboarding.

---

## Sources drawn from
- [Polaris typography](https://polaris-react.shopify.com/design/typography) · [Polaris spacing](https://legacy.polaris.shopify.com/design/spacing) — commerce-admin 4px grid and type discipline; Polaris is *the* merchant-tool reference.
- [How's Linear so fast — technical breakdown](https://performance.dev/how-is-linear-so-fast-a-technical-breakdown) — duration values and asymmetric enter/exit; the register that makes daily tools feel instant.
- [Carbon motion](https://carbondesignsystem.com/elements/motion/overview/) — productive/expressive split and distance-scaled durations; fits an ERP's "mostly invisible, occasionally celebratory" needs.
- [POS UX tactics (dev.pro)](https://dev.pro/insights/designing-a-pos-system-ten-user-experience-tactics-that-improve-usability/) · [POS design principles (agentestudio)](https://agentestudio.com/blog/design-principles-pos-interface) — clicks-per-task, cashier keyboard flow, role-appropriate simplicity.
- [Why AI design looks generic (superdesign)](https://superdesign.dev/blog/why-ai-design-looks-generic) · [The sameness problem (pixso)](https://pixso.net/articles/how-to-prevent-ai-from-making-all-uis-look-the-same/) — the case for exact, opinionated tokens over "clean and modern."

## Decision log
1. **Identity: B — «Taller»** — chosen by Kevin, 2026-07-12. Typography adjusts accordingly: UI face is **Archivo** (SemiExpanded 600 for headings/signage labels), numbers tabular, Spline Sans Mono for receipt moments.
2. **Nav/landing rework (§6): approved as proposed** — «Hoy» is the landing, POS focus mode, dashboard demoted to «Análisis», sidebar split Operación/Gestión.
3. **Spanish-first UI: confirmed. Background patterns: retired.**
4. Still open from Phase 1 (block parts of implementation, not the theming work): Q1 sale price vs cost, Q2 stock source of truth, Q3 oversell policy + auth scope, Q4 matching/stock decoupling, Q6 delivery tracking.
