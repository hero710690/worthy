# Portfolio Trend Chart — Projected Growth Line

**Date:** 2026-07-01
**Component:** `frontend/src/components/PortfolioTrendChart.tsx`

## Goal

Overlay a projected-growth line on the existing portfolio trend chart. The line
shows what the portfolio *would* be worth if investments had grown at a
user-specified constant annual return rate, while injecting the same real
contributions that actually occurred during the historical window.

## Scope

- All changes confined to `frontend/src/components/PortfolioTrendChart.tsx`
  (plus a small pure projection helper + its unit test).
- **No backend or API changes.** Reuses the `PortfolioSnapshot[]` from
  `portfolioAPI.getPortfolioSnapshots(range)`, plus the transaction history from
  `GET /transactions` (`assetApi`) and spot FX from `exchangeRateService`.
- Projection is computed entirely client-side.

## Background: why contributions come from transactions, not snapshot deltas

An earlier version of this spec derived per-period contributions from the
`invest_invested` delta between snapshots. Inspection of production data
(user "Bucky", user_id 21) showed this is unreliable:

- **Snapshots re-value cost basis at each day's spot FX rate.** For
  USD/JPY-denominated assets, `invest_invested` drifts by thousands of TWD on
  days with *no* transactions (e.g. 2025-08-06 → 08-08 swung purely on FX). With
  the `max(0, delta)` clamp, this upward noise is misread as contributions.
- **Sale proceeds inflate invested.** On a sell, `average_cost_basis` is left
  unchanged and proceeds are booked into a Cash asset at *market* price, so
  `total_invested` can *rise* after a sale (observed on Bucky's TQQQ and 006208
  partial sells: +10,489 and +182,159 respectively).

The corrected model drives contributions from actual `LumpSum`/`Recurring`/
`Initialization` transactions instead. This also naturally satisfies the
"sells inject nothing" rule, since `Sell`/`Dividend` transactions are ignored.

## Requirements (from interview)

1. Add a new line to the chart showing projected portfolio growth at a given
   annual return rate.
2. The return rate is adjustable.
3. The simulation reflects both lump-sum and recurring contributions.

## Design Decisions

| Topic | Decision |
|-------|----------|
| Projection span | **Overlay across the same historical window**, seeded from the first snapshot's value. Compares "what the rate predicted" vs actual history. No future extension. |
| Rate control | **Number input** (percent, decimals allowed). Default **7%**. |
| Contribution model | Derived from **actual transactions** (`GET /transactions`). Contribution types: `LumpSum`, `Recurring`, `Initialization`. `Sell` and `Dividend` are ignored. **Only contributions into investable assets (`Stock`/`ETF`/`Bond`) count** — deposits into `Cash`/`CD` are excluded, since the projection is investments-only (seeded from `invest_value`); otherwise opening a bank account would spike the projected investment line. Each amount = `shares × price_per_share`, converted from the transaction's native currency to base currency via `exchangeRateService` (spot rate). |
| Initialization handling | Count `LumpSum`/`Recurring`/`Initialization` **only when `transaction_date` is after the first snapshot's date** — the seed (`invest_value[0]`) already embeds everything up to `snapshot[0]`, so earlier transactions would double-count. |
| FX rate for past transactions | Uses **current spot rate** (no historical FX exists in the app). This matches how `returnsCalculationService` already converts cost basis/dividends — consistent, not worse. |
| View coupling | **Investments-only, always** — seeded from `invest_value`, regardless of the ALL ASSETS / INVESTMENTS ONLY toggle. |
| Line visibility | **Show/hide toggle**, default ON. Not persisted (resets to 7% / ON on reload). |
| Time-range gating | Projection line **only displays when the time-range toggle is `ALL`**. For `1W`/`1M`/`3M`/`1Y` the line, its rate input, and its toggle are hidden. |
| Sells | `Sell` transactions are simply not contributions; the projected value only grows by the return rate across a sell. |

## Projection Math

Inputs:
- snapshots `s[0..n]` sorted ascending by date,
- annual rate `r` (decimal),
- contribution events `c[]` — each `{ date, baseAmount }`, precomputed from
  transactions (see below).

Precompute contributions (once, from the transaction list):
- Filter to `transaction_type ∈ {LumpSum, Recurring, Initialization}` with
  `transaction_date > s[0].date`.
- `nativeAmount = shares × price_per_share`
- `baseAmount = exchangeRateService.convertCurrency(nativeAmount, tx.currency, baseCurrency)`

Walk the snapshots:

1. **Seed:** `projected[0] = s[0].invest_value`
2. **For each `i` from 1 to n:**
   - `contribution` = sum of `c[].baseAmount` where
     `s[i-1].date < c.date ≤ s[i].date` (contributions falling in this step).
   - `deltaYears = (s[i].date - s[i-1].date) in days / 365`
   - `projected[i] = projected[i-1] * (1 + r)^deltaYears + contribution`

Compounding uses the actual number of days between snapshots, so irregular
snapshot spacing is handled correctly. Contributions are applied at the end of
the step containing their date (a slight simplification vs. exact intra-step
timing, negligible at snapshot granularity).

The projection function is a pure helper (snapshots + rate + contribution events
→ number[]), unit-testable in isolation. Transaction fetching and FX conversion
happen in the component and feed it the precomputed `c[]`.

## UI

New controls in the card header, alongside the existing time-range and view-mode
toggles. **These controls are only rendered when the time-range toggle is `ALL`;**
they are hidden for every other range.

- **Annual return rate** — a small numeric `TextField` (suffix `%`), default `7`,
  accepts decimals (e.g. `7.5`). Invalid/empty input falls back to the last valid
  rate.
- **Projection toggle** — show/hide the projected line, default ON.

New chart.js dataset:
- Label: **"Projected (investments @ X%)"** — the "investments" qualifier makes
  clear that in ALL ASSETS mode the line sits below the actual total-value line
  because it excludes cash/CD.
- Dashed line, distinct color from existing datasets.
- Spans the same x-axis (same snapshot dates) as the actual line.

## Recompute Triggers

Transactions are fetched once (when `range === 'ALL'` and not already loaded)
and cached in state; contribution events are memoized from them + `baseCurrency`.
The projection array recomputes (via `useMemo` over `snapshots` + `rate` +
contribution events) when:
- the rate input changes,
- the range changes (new snapshots fetched),
- the projection toggle changes visibility (dataset included/excluded).

The projected dataset is included **only when `range === 'ALL'`** and the
projection toggle is ON; otherwise it is excluded from the chart. Transactions
are only fetched when the line is actually needed (range `ALL`).

## Edge Cases

- **Fewer than 2 snapshots:** projection line is omitted (nothing to compound).
- **Empty / invalid rate input:** retain last valid rate; do not crash.
- **No qualifying contributions:** projection is pure compound growth on the seed
  value — valid.
- **Transaction fetch fails:** projection falls back to zero contributions (pure
  compound growth) rather than breaking the chart; log a warning.
- **Transaction with unknown/missing currency:** treat native amount as already
  in base currency (best-effort) or skip; do not crash.
- **ALL ASSETS view mode:** projection remains investments-only and will visually
  sit below the actual line; the legend label communicates this.

## Testing

- Unit-test the pure projection function: seed value, a single mid-window
  contribution, multiple contributions in one step, no contributions (pure
  growth), compounding across uneven date gaps, and the <2-snapshot case.
- Unit-test the contribution-extraction helper: type filtering (Sell/Dividend
  excluded), the `date > snapshot[0].date` gate, and native→base amount = shares ×
  price_per_share × rate.
- Manual/visual: toggle line on/off, change rate, switch range and view mode,
  confirm the line recomputes and renders correctly; sanity-check against Bucky's
  data that a sell no longer bumps the projected line.
