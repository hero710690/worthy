# Point-in-Time Snapshot Invested Reconstruction

**Date:** 2026-07-01
**Area:** Backend — `backend/worthy_lambda_function.py` (portfolio snapshots)

## Problem

Historical `total_invested` / `invest_invested` values in `portfolio_snapshots`
are wrong:

1. **Daily job uses current holdings.** `take_portfolio_snapshot`
   (`worthy_lambda_function.py:5676`) computes invested from the *live* `assets`
   table (`total_shares × average_cost_basis`), not the holdings as they were on
   the snapshot date.
2. **Backdated / edited transactions never correct history.** The batch
   `backfill_days` loop (`:5845`) only fills dates with *no* existing snapshot,
   and even those use current holdings. Nothing reconstructs past snapshots from
   the transaction ledger when a transaction is added with a past date, edited,
   or deleted.
3. **Sale proceeds inflate invested.** On a sell, `average_cost_basis` is left
   unchanged and proceeds are booked into a Cash asset at market price (counted in
   `total_invested`), so invested can *rise* after a sale.

**Verified against production data** (user "Bucky", user_id 21): NVDA full sell
(2026-02-09) correctly dropped `invest_invested` by 296,350, but the TQQQ partial
sell (2026-04-24) and 006208 partial sell (2026-04-29) *raised* it by +10,489 and
+182,159 — the "invested doesn't drop on sale" bug.

## Scope

- **Invested side only.** Recompute `total_invested` / `invest_invested`
  point-in-time from the transaction ledger. `total_value` / `invest_value` are
  out of scope (would need historical market prices).
- **No schema changes.** Per decision, do not add any table or column. Historical
  FX is fetched on demand and cached in-memory only.
- **Reuse existing infra.** No new Cloud Scheduler job, Cloud Tasks, or queue.

## Known Limitations (accepted)

- **Value side stays stale for backdated snapshots** — a backdated snapshot's
  `total_value` still reflects the market price when it was written, not the
  historical price. Out of scope here.
- **Edits/deletes can't be auto-detected** — the `transactions` table has
  `created_at` but no `updated_at`, and deletes leave no trace. The nightly
  rolling-window recompute (below) fixes anything within the window regardless;
  backdated/edited transactions *older* than the window require a manual re-run of
  the one-time backfill endpoint.
- **Historical FX re-fetched each run** — no persistence (no schema change), so
  Yahoo historical rates are re-fetched per job run (cached within the run).

## Design

### 1. Core reconstruction engine (pure)

New function: reconstruct as-of-date holdings and cost basis from the ledger.

- Input: a user's transactions (`Initialization`, `LumpSum`, `Recurring`, `Sell`,
  `Dividend`), and a target date.
- Replay transactions with `transaction_date ≤ target_date`, per asset,
  maintaining running `shares` and `average_cost_basis` (**average-cost method**,
  matching the app):
  - Buys (`Initialization` / `LumpSum` / `Recurring`):
    `new_avg = (shares·avg + Δshares·price) / (shares + Δshares)`; `shares += Δshares`.
  - `Sell`: `shares += Δshares` (Δ negative); **avg_cost unchanged**.
  - `Dividend`: ignored for invested (no cost-basis change).
- Per asset: `invested_native = shares × avg_cost`. Classify into
  `total_invested` (all asset types) vs `invest_invested`
  (`INVESTABLE_ASSET_TYPES` only).

Asset type is taken from the current `assets` row (asset type doesn't change over
time). Pure and unit-testable in isolation.

### 2. Historical FX conversion

New backend helper: convert native invested → base currency at the snapshot date's
FX rate, from **Yahoo Finance** (free, no API key, covers TWD — the base currency
of all current users — unlike ECB/Frankfurter which omits TWD).

- Endpoint:
  `https://query1.finance.yahoo.com/v8/finance/chart/{PAIR}=X?period1=..&period2=..&interval=1d`
  with a browser `User-Agent`.
- For `from → to`, use the pair Yahoo quotes and cross via USD as needed
  (e.g. `USDTWD=X`, `USDJPY=X`), matching the existing spot converter's
  USD-intermediary approach (`convert_currency_amount`).
- **Caching:** in-memory only, keyed by `(currency, date)`, reusing the existing
  `exchange_rate_cache` pattern. Historical rates are immutable, so a single job
  run fetches each `(currency, date)` at most once.
- **Fallbacks:** missing date (weekend/holiday) → carry forward most recent prior
  available rate. Yahoo failure → fall back to current spot rate (today's
  behavior) and log a warning. Never crash a snapshot.

### 3. Unified snapshot path

Refactor `take_portfolio_snapshot(user_id, snapshot_date)` so its **invested**
calculation uses the §1 reconstruction as-of `snapshot_date` + §2 historical FX,
instead of reading the live `assets` table. This single function then serves the
daily job, the rolling-window catch-up, and the one-time backfill. The value side
keeps its current logic (per scope).

### 4. Triggers

**A. One-time backfill (re-runnable).** An admin endpoint/script that recomputes
invested for **all existing snapshots** of each user from the ledger, updating in
place (`ON CONFLICT DO UPDATE`, already present). Fixes existing stale data and
serves as the manual remedy for out-of-window backdated transactions.

**B. Nightly rolling-window catch-up.** Extend the existing daily batch
(`handle_batch_portfolio_snapshot`, triggered by the existing Cloud Scheduler job
`worthy-portfolio-snapshot` at `terraform/scheduler.tf:30`) to, in addition to
writing today's snapshot, **recompute invested for each user's last 90 snapshots**
from the ledger. Idempotent; always correct within the window regardless of
backdates/edits/deletes. No new infra.

## Error Handling

- Per-asset reconstruction/FX failure: log and skip that asset (matches existing
  `continue` at `:5752`); never crash the snapshot.
- FX gaps: carry-forward last known rate; ultimate fallback = current spot.
- Idempotent recompute via `ON CONFLICT ... DO UPDATE`.

## Testing

- **Unit — reconstruction:** buys accumulate avg-cost; partial sell reduces shares
  but not avg-cost; full sell → 0 invested; dividend ignored; multi-asset; correct
  investable-vs-total classification.
- **Unit — historical FX:** pair selection, USD cross, carry-forward on missing
  date, spot fallback on failure.
- **Integration — Bucky fixture:** assert `invest_invested` now *drops* on the
  2026-04-24 TQQQ and 2026-04-29 006208 partial sells (currently rises), and the
  2026-02-09 NVDA full sell remains correct.
- **Rolling window:** a backdated transaction within 90 days is corrected by the
  nightly run; one older than 90 days is corrected only after a manual backfill
  re-run.
