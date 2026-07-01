# Portfolio Trend Chart — Projected Growth Line

**Date:** 2026-07-01
**Component:** `frontend/src/components/PortfolioTrendChart.tsx`

## Goal

Overlay a projected-growth line on the existing portfolio trend chart. The line
shows what the portfolio *would* be worth if investments had grown at a
user-specified constant annual return rate, while injecting the same real
contributions that actually occurred during the historical window.

## Scope

- All changes confined to `frontend/src/components/PortfolioTrendChart.tsx`.
- **No backend or API changes.** Reuses the `PortfolioSnapshot[]` data already
  fetched via `portfolioAPI.getPortfolioSnapshots(range)`.
- Projection is computed entirely client-side.

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
| Contribution model | Derived from **`invest_invested` delta** between consecutive snapshots (cost-basis increase captures both LumpSum and Recurring buys). No extra API calls. |
| View coupling | **Investments-only, always** — uses `invest_value` / `invest_invested` regardless of the ALL ASSETS / INVESTMENTS ONLY toggle. |
| Line visibility | **Show/hide toggle**, default ON. Not persisted (resets to 7% / ON on reload). |
| Negative delta (sells) | Treated as **no change**: `contribution = max(0, delta)`. Sells inject nothing; the projected value only grows by the return rate that period. |

## Projection Math

Given snapshots `s[0..n]` sorted ascending by date, and annual rate `r` (as a decimal):

1. **Seed:** `projected[0] = s[0].invest_value`
2. **For each `i` from 1 to n:**
   - `contribution = max(0, s[i].invest_invested - s[i-1].invest_invested)`
   - `deltaYears = (s[i].date - s[i-1].date) in days / 365`
   - `projected[i] = projected[i-1] * (1 + r)^deltaYears + contribution`

Compounding uses the actual number of days between snapshots, so irregular
snapshot spacing is handled correctly.

## UI

New controls in the card header, alongside the existing time-range and view-mode
toggles:

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

Projection recomputes (via `useMemo` over `snapshots` + `rate`) when:
- the rate input changes,
- the range changes (new snapshots fetched),
- the projection toggle changes visibility (dataset included/excluded).

## Edge Cases

- **Fewer than 2 snapshots:** projection line is omitted (nothing to compound).
- **Empty / invalid rate input:** retain last valid rate; do not crash.
- **All deltas zero (no contributions):** projection is pure compound growth on
  the seed value — valid.
- **ALL ASSETS view mode:** projection remains investments-only and will visually
  sit below the actual line; the legend label communicates this.

## Testing

- Unit-test the projection function: seed value, positive delta injection,
  negative delta (→ no change), compounding across uneven date gaps, and the
  <2-snapshot case.
- Manual/visual: toggle line on/off, change rate, switch range and view mode,
  confirm the line recomputes and renders correctly.
