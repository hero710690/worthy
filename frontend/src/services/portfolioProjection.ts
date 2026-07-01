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
