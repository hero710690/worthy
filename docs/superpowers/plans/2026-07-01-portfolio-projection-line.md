# Portfolio Projection Line Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Overlay a "projected growth @ X%" line on the Portfolio Trend chart, seeded from the first snapshot's investment value and injecting the user's real contributions, shown only for the ALL time range.

**Architecture:** A new pure TypeScript module holds the projection math (contribution extraction + compounding). `PortfolioTrendChart.tsx` fetches transactions once (only when range is ALL), converts contributions to base currency via the existing spot FX service, memoizes the projected series, and renders it as an extra chart.js dataset. A number input controls the rate and a toggle shows/hides the line; both controls appear only when range is ALL.

**Tech Stack:** React + TypeScript, chart.js via react-chartjs-2, MUI, Vite. No test framework — verification is `tsc` typecheck + `vite build` + manual check in the running app.

## Global Constraints

- **Investments-only, always:** projection is seeded from `invest_value` and uses investment figures regardless of the ALL ASSETS / INVESTMENTS ONLY view toggle.
- **ALL range only:** the projected dataset, the rate input, and the projection toggle render ONLY when `range === 'ALL'`. Hidden for `1W`/`1M`/`3M`/`1Y`.
- **Contributions from the transaction ledger:** types `LumpSum`, `Recurring`, `Initialization` count as contributions; `Sell` and `Dividend` are ignored. Only transactions with `transaction_date` strictly after the first snapshot's date are counted (the seed already embeds everything up to `snapshot[0]`).
- **FX:** convert each contribution's native amount to base currency with `exchangeRateService.convertCurrency(amount, from, base)` (current spot; the app has no historical FX and already does this everywhere). Call `exchangeRateService.getRatesWithRefresh(...)` before converting so rates are populated.
- **Default rate: 7%.** Rate input accepts decimals; invalid/empty input falls back to the last valid rate. Not persisted (resets on reload). Projection toggle default ON.
- **Compounding:** `projected[i] = projected[i-1] * (1 + r)^(Δdays/365) + contribution_in_step`, where `contribution_in_step` sums contributions with `snapshot[i-1].date < c.date <= snapshot[i].date`.
- **No backend changes.** Frontend only. Do not modify any `.py` file.
- Match existing code style in `PortfolioTrendChart.tsx` (functional component, hooks, MUI, chart.js dataset objects).

---

### Task 1: Pure projection module

**Files:**
- Create: `frontend/src/services/portfolioProjection.ts`

**Interfaces:**
- Produces:
  - `interface ContributionEvent { date: string; baseAmount: number }`
  - `interface RawContribution { transaction_type: string; transaction_date: string; shares: number; price_per_share: number; currency: string }`
  - `extractContributions(transactions: RawContribution[], firstSnapshotDate: string, baseCurrency: string, convert: (amount: number, from: string, to: string) => number): ContributionEvent[]`
  - `computeProjection(snapshotDates: string[], seedValue: number, annualRatePct: number, contributions: ContributionEvent[]): number[]`

**Context:** This module is pure (no React, no network). `convert` is injected so the caller supplies `exchangeRateService.convertCurrency`. Dates are ISO `YYYY-MM-DD` strings; compare and diff them by constructing `new Date(iso + 'T00:00:00')`.

- [ ] **Step 1: Create the module with both functions**

Create `frontend/src/services/portfolioProjection.ts`:

```typescript
// Pure projection math for the Portfolio Trend chart's "projected growth" line.
// No React or network dependencies — FX conversion is injected by the caller.

export interface ContributionEvent {
  date: string; // ISO YYYY-MM-DD
  baseAmount: number; // in the user's base currency
}

export interface RawContribution {
  transaction_type: string;
  transaction_date: string; // ISO
  shares: number;
  price_per_share: number;
  currency: string;
}

const CONTRIBUTION_TYPES = new Set(['LumpSum', 'Recurring', 'Initialization']);

function toDate(iso: string): Date {
  return new Date(iso.slice(0, 10) + 'T00:00:00');
}

/**
 * Convert the raw transaction ledger into base-currency contribution events.
 * Only LumpSum/Recurring/Initialization strictly after firstSnapshotDate count;
 * Sell/Dividend are ignored (the seed already embeds holdings up to snapshot[0]).
 */
export function extractContributions(
  transactions: RawContribution[],
  firstSnapshotDate: string,
  baseCurrency: string,
  convert: (amount: number, from: string, to: string) => number
): ContributionEvent[] {
  const firstDate = toDate(firstSnapshotDate);
  const events: ContributionEvent[] = [];
  for (const t of transactions) {
    if (!CONTRIBUTION_TYPES.has(t.transaction_type)) continue;
    const txDate = toDate(t.transaction_date);
    if (txDate <= firstDate) continue; // seed already covers this
    const native = t.shares * t.price_per_share;
    if (!(native > 0)) continue;
    let baseAmount = native;
    if (t.currency && t.currency !== baseCurrency) {
      try {
        baseAmount = convert(native, t.currency, baseCurrency);
      } catch {
        // If conversion fails, fall back to native amount rather than dropping.
        baseAmount = native;
      }
    }
    events.push({ date: t.transaction_date.slice(0, 10), baseAmount });
  }
  return events;
}

/**
 * Compound the seed value across the snapshot dates, injecting contributions
 * that fall within each step. Returns one projected value per snapshot date.
 */
export function computeProjection(
  snapshotDates: string[],
  seedValue: number,
  annualRatePct: number,
  contributions: ContributionEvent[]
): number[] {
  if (snapshotDates.length === 0) return [];
  const r = annualRatePct / 100;
  const result: number[] = [seedValue];
  for (let i = 1; i < snapshotDates.length; i++) {
    const prevDate = toDate(snapshotDates[i - 1]);
    const curDate = toDate(snapshotDates[i]);
    const deltaDays = (curDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);
    const deltaYears = deltaDays / 365;
    const grown = result[i - 1] * Math.pow(1 + r, deltaYears);
    let stepContribution = 0;
    for (const c of contributions) {
      const cd = toDate(c.date);
      if (cd > prevDate && cd <= curDate) stepContribution += c.baseAmount;
    }
    result.push(grown + stepContribution);
  }
  return result;
}
```

- [ ] **Step 2: Typecheck the module**

Run: `cd frontend && npx tsc --noEmit -p tsconfig.app.json 2>&1 | grep portfolioProjection || echo "no errors in portfolioProjection"`
Expected: `no errors in portfolioProjection` (module typechecks cleanly). If `tsconfig.app.json` doesn't exist, run `npx tsc --noEmit` and confirm no new errors reference `portfolioProjection.ts`.

- [ ] **Step 3: Commit**

```bash
cd /Users/jeanl/ch-team/worthy
git add frontend/src/services/portfolioProjection.ts
git commit -m "feat: add pure portfolio projection math module"
```

---

### Task 2: Wire projection controls + dataset into the chart

**Files:**
- Modify: `frontend/src/components/PortfolioTrendChart.tsx`

**Interfaces:**
- Consumes: `extractContributions`, `computeProjection`, `ContributionEvent`, `RawContribution` from `../services/portfolioProjection`; `exchangeRateService` from `../services/exchangeRateService`; `assetApi`'s `getTransactions` (see note below).
- Produces: no exports beyond the existing component.

**Context — imports and services:**
- The FX singleton: `import { exchangeRateService } from '../services/exchangeRateService';`. Methods: `getRatesWithRefresh(baseCurrency: string): Promise<...>` (call once to populate) and `convertCurrency(amount, from, to): number` (sync).
- Transactions: the transaction fetch lives in `assetApi`. Import it: `import { transactionAPI } from '../services/assetApi';` — verify the exact export name in `frontend/src/services/assetApi.ts` (the method is `getTransactions(): Promise<{ transactions: any[]; total_count: number }>`; it hits `GET /transactions`). If the object is exported under a different name, use that name. The returned transaction objects contain `transaction_type`, `transaction_date`, `shares`, `price_per_share`, `currency`.
- New MUI imports needed: `TextField`, `FormControlLabel`, `Switch` (add to the existing `@mui/material` import block).
- The existing component already imports `useState`, `useEffect` from React; add `useMemo`.

- [ ] **Step 1: Add state for rate, toggle, and transactions**

In `PortfolioTrendChart` (after the existing `const [error, setError] = useState<string | null>(null);` at line 65), add:

```typescript
  const [rateInput, setRateInput] = useState<string>('7');
  const [lastValidRate, setLastValidRate] = useState<number>(7);
  const [showProjection, setShowProjection] = useState<boolean>(true);
  const [transactions, setTransactions] = useState<RawContribution[]>([]);
  const [ratesReady, setRatesReady] = useState<boolean>(false);
```

- [ ] **Step 2: Fetch transactions + FX rates only when range is ALL**

After the existing snapshot-loading `useEffect` (ends line 75), add a second effect:

```typescript
  useEffect(() => {
    if (range !== 'ALL') return;
    if (transactions.length > 0 && ratesReady) return;
    let cancelled = false;
    Promise.all([
      transactionAPI.getTransactions(),
      exchangeRateService.getRatesWithRefresh(baseCurrency),
    ])
      .then(([txRes]) => {
        if (cancelled) return;
        setTransactions((txRes.transactions ?? []) as RawContribution[]);
        setRatesReady(true);
      })
      .catch(() => {
        // Projection is best-effort; on failure it simply won't render.
        if (!cancelled) setRatesReady(false);
      });
    return () => {
      cancelled = true;
    };
  }, [range, baseCurrency, transactions.length, ratesReady]);
```

(If the imported name is not `transactionAPI`, use the correct one from assetApi.ts.)

- [ ] **Step 3: Parse the rate input**

Add a handler after the state declarations:

```typescript
  const handleRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setRateInput(raw);
    const parsed = parseFloat(raw);
    if (!Number.isNaN(parsed) && parsed >= 0 && parsed <= 100) {
      setLastValidRate(parsed);
    }
  };
```

- [ ] **Step 4: Memoize the projected series**

After `const labels = snapshots.map((s) => formatDateLabel(s.date));` (line 80), add:

```typescript
  const projectionData = useMemo<number[] | null>(() => {
    if (range !== 'ALL' || !showProjection) return null;
    if (snapshots.length < 2 || !ratesReady) return null;
    const dates = snapshots.map((s) => s.date);
    const seed = snapshots[0].invest_value;
    const contributions = extractContributions(
      transactions,
      snapshots[0].date,
      baseCurrency,
      (amount, from, to) => exchangeRateService.convertCurrency(amount, from, to)
    );
    return computeProjection(dates, seed, lastValidRate, contributions);
  }, [range, showProjection, snapshots, ratesReady, transactions, baseCurrency, lastValidRate]);
```

- [ ] **Step 5: Add the projected dataset to chartData**

The current `chartData.datasets` is a fixed array of three. Change it to append the projection when present. Replace the `const chartData = { labels, datasets: [ ... ] };` block (lines 82-117) so the datasets array is built then conditionally extended:

```typescript
  const datasets = [
    {
      label: 'Portfolio Value',
      data: snapshots.map((s) => s[valueKey] as number),
      borderColor: '#5c6bc0',
      backgroundColor: 'rgba(92, 107, 192, 0.15)',
      fill: true,
      tension: 0.3,
      pointRadius: 0,
      borderWidth: 2,
    },
    {
      label: 'Total Invested',
      data: snapshots.map((s) => s[investedKey] as number),
      borderColor: '#ec407a',
      backgroundColor: 'transparent',
      fill: false,
      tension: 0.3,
      pointRadius: 0,
      borderWidth: 1.5,
      borderDash: [5, 5],
    },
    {
      label: 'Cumulative Dividends',
      data: snapshots.map((s) => s.cumulative_dividends),
      borderColor: '#66bb6a',
      backgroundColor: 'transparent',
      fill: false,
      tension: 0.3,
      pointRadius: 0,
      borderWidth: 1.5,
    },
  ];

  if (projectionData) {
    datasets.push({
      label: `Projected (investments @ ${lastValidRate}%)`,
      data: projectionData,
      borderColor: '#ffa726',
      backgroundColor: 'transparent',
      fill: false,
      tension: 0.3,
      pointRadius: 0,
      borderWidth: 1.5,
      borderDash: [2, 3],
    } as typeof datasets[number]);
  }

  const chartData = { labels, datasets };
```

- [ ] **Step 6: Update the tooltip callbacks for the dynamic dataset list**

The existing tooltip `label` and `labelTextColor` callbacks index into hardcoded arrays (`['Portfolio Value','Total Invested','Cumulative Dividends']` and a color array at lines 138-143). Replace them to read from the live datasets so the 4th (projection) entry works:

```typescript
          label: (ctx: { datasetIndex: number; parsed: { y: number } }) => {
            const label = datasets[ctx.datasetIndex]?.label ?? '';
            return ` ${label} : ${formatTooltipValue(ctx.parsed.y, baseCurrency)}`;
          },
          labelTextColor: (ctx: { datasetIndex: number }) => {
            return (datasets[ctx.datasetIndex]?.borderColor as string) ?? '#333';
          },
```

- [ ] **Step 7: Render the rate input + toggle (ALL range only)**

Inside the controls `Stack` (the inner `<Stack direction="row" spacing={1} ...>` that holds the two ToggleButtonGroups, lines 172-195), after the view-mode `ToggleButtonGroup` closes (line 194) and before the `Stack` closes, add:

```typescript
            {range === 'ALL' && (
              <>
                <TextField
                  label="Return %"
                  value={rateInput}
                  onChange={handleRateChange}
                  size="small"
                  type="number"
                  inputProps={{ step: 0.1, min: 0, max: 100, style: { width: 64 } }}
                  sx={{ '& .MuiInputBase-root': { height: 32 } }}
                />
                <FormControlLabel
                  control={
                    <Switch
                      size="small"
                      checked={showProjection}
                      onChange={(e) => setShowProjection(e.target.checked)}
                    />
                  }
                  label="Projection"
                  sx={{ '& .MuiFormControlLabel-label': { fontSize: '0.75rem' } }}
                />
              </>
            )}
```

- [ ] **Step 8: Update the chart re-render key**

The `<Line key={viewMode} ... />` at line 212 forces a remount on view change. Extend the key so rate/toggle changes cleanly re-render:

```typescript
          <Line key={`${viewMode}-${range}-${showProjection}-${lastValidRate}`} data={chartData} options={chartOptions} />
```

- [ ] **Step 9: Typecheck**

Run: `cd frontend && npx tsc --noEmit -p tsconfig.app.json 2>&1 | grep -E "PortfolioTrendChart|portfolioProjection" || echo "no errors in changed files"`
Expected: `no errors in changed files`. If it reports the `transactionAPI` import name is wrong, correct it to the actual export from `assetApi.ts` and re-run.

- [ ] **Step 10: Production build**

Run: `cd frontend && npm run build 2>&1 | tail -5`
Expected: `✓ built in ...` with no TypeScript errors.

- [ ] **Step 11: Commit**

```bash
cd /Users/jeanl/ch-team/worthy
git add frontend/src/components/PortfolioTrendChart.tsx
git commit -m "feat: projected growth line on portfolio trend chart (ALL range)"
```

---

### Task 3: Manual verification in the running app

**Files:** none (verification task)

- [ ] **Step 1: Run the dev server**

Run: `cd frontend && npm run dev` and open the Portfolio Trend chart (log in as a user with snapshot history, e.g. the demo user or your own account).

- [ ] **Step 2: Verify the projection line behavior**

Confirm each:
- With range = **ALL**, a dashed orange "Projected (investments @ 7%)" line appears, starting at the same point as the actual investment value on the left edge.
- The rate input and the Projection toggle are visible ONLY at range ALL; switching to `1Y`/`3M`/`1M`/`1W` hides the line AND both controls.
- Changing the rate number updates the line's slope and the legend label live.
- Toggling Projection off removes the line; on restores it.
- Switching ALL ASSETS vs INVESTMENTS ONLY does not change the projection line (it stays investments-based); the legend label still says "investments".
- The tooltip shows all visible series including the projection, with correct colors.

- [ ] **Step 3: Note any issues**

If the line looks wrong (e.g., starts at zero, ignores contributions, or the slope is implausible), capture the symptom and the seed/first-snapshot values. Do not patch blindly — report the specific discrepancy.

---

## Self-Review Notes

- Spec coverage: projected line (Task 1+2), adjustable rate via number input (Task 2 Steps 1/3/7), contributions from LumpSum+Recurring+Initialization transactions with FX and post-seed gating (Task 1 `extractContributions`), investments-only seed (Task 2 Step 4), ALL-range-only gating (Task 2 Steps 4/7), show/hide toggle default ON not persisted (Task 2 Steps 1/7), default 7% with invalid-input fallback (Task 2 Steps 1/3), compounding by actual days (Task 1 `computeProjection`) — all mapped.
- No backend changes. Verification is typecheck + build + manual (no test framework, per decision).
- Known simplification (from spec): contributions applied at end of their containing step; current spot FX used for past transactions (consistent with the rest of the app).
