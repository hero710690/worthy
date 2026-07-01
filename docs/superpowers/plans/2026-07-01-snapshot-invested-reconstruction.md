# Point-in-Time Snapshot Invested Reconstruction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Recompute historical `total_invested` / `invest_invested` in portfolio snapshots point-in-time from the transaction ledger, so backdated transactions and sells are reflected correctly.

**Architecture:** Add pure helpers to `backend/worthy_lambda_function.py` that (1) replay a user's transaction ledger to reconstruct as-of-date holdings + average cost basis, and (2) fetch historical daily FX from Yahoo Finance (in-memory cached). Refactor `take_portfolio_snapshot` to use them for the invested side, then drive recomputation via a re-runnable one-time backfill and a nightly 90-day rolling window in the existing batch job. No schema changes; value side unchanged.

**Tech Stack:** Python 3 (single-module Lambda-style app `worthy_lambda_function.py`), PostgreSQL via `execute_query`/`execute_update`, `requests` for HTTP, Yahoo Finance chart API, pytest (added by this plan).

## Global Constraints

- **No schema changes.** Do not add any table or column. Historical FX is cached in-memory only (reuse the existing `exchange_rate_cache` / `get_cached_exchange_rate` / `set_cached_exchange_rate` pattern).
- **Invested side only.** Only `total_invested` / `invest_invested` are recomputed. `total_value` / `invest_value` keep their existing logic.
- **Average-cost method** for cost basis, matching the app: a `Sell` reduces shares but leaves average cost per share unchanged.
- **Investable classification:** `INVESTABLE_ASSET_TYPES = {'Stock', 'ETF', 'Bond'}` (defined at `worthy_lambda_function.py:5674`).
- **Never crash a snapshot:** per-asset reconstruction/FX failures are logged and skipped (matches existing `continue` at `:5752`).
- **Base currency of all current users is TWD** — the FX source must cover TWD (Yahoo does; ECB/Frankfurter does not).
- All new code lives in `backend/worthy_lambda_function.py` unless a task says otherwise.

---

### Task 1: Test harness + ledger reconstruction (holdings/cost basis)

**Files:**
- Create: `backend/requirements-dev.txt`
- Create: `backend/tests/__init__.py`
- Create: `backend/tests/test_reconstruction.py`
- Modify: `backend/worthy_lambda_function.py` (add `reconstruct_holdings_asof`)

**Interfaces:**
- Produces: `reconstruct_holdings_asof(transactions, asof_date) -> dict[str, dict]`
  - `transactions`: list of dicts, each with keys `asset_id` (str), `transaction_type` (str), `transaction_date` (`datetime.date` or ISO `str`), `shares` (float, signed — sells negative), `price_per_share` (float).
  - `asof_date`: `datetime.date`.
  - Returns: `{ asset_id: { 'shares': float, 'avg_cost': float } }` for assets with `shares > 1e-9` as of that date (native currency, no FX).

- [ ] **Step 1: Add dev dependencies file**

Create `backend/requirements-dev.txt`:

```
pytest==8.3.4
```

- [ ] **Step 2: Create the test package init**

Create `backend/tests/__init__.py` (empty file):

```python
```

- [ ] **Step 3: Write the failing test**

Create `backend/tests/test_reconstruction.py`:

```python
import datetime
from worthy_lambda_function import reconstruct_holdings_asof


def _tx(asset_id, ttype, date, shares, price):
    return {
        "asset_id": asset_id,
        "transaction_type": ttype,
        "transaction_date": datetime.date.fromisoformat(date),
        "shares": shares,
        "price_per_share": price,
    }


def test_buys_accumulate_average_cost():
    txns = [
        _tx("A", "LumpSum", "2025-01-01", 10, 100.0),
        _tx("A", "LumpSum", "2025-02-01", 10, 200.0),
    ]
    result = reconstruct_holdings_asof(txns, datetime.date(2025, 3, 1))
    assert result["A"]["shares"] == 20
    assert result["A"]["avg_cost"] == 150.0  # (10*100 + 10*200) / 20


def test_partial_sell_keeps_avg_cost():
    txns = [
        _tx("A", "LumpSum", "2025-01-01", 10, 100.0),
        _tx("A", "Sell", "2025-02-01", -4, 250.0),
    ]
    result = reconstruct_holdings_asof(txns, datetime.date(2025, 3, 1))
    assert result["A"]["shares"] == 6
    assert result["A"]["avg_cost"] == 100.0  # unchanged by sell


def test_full_sell_removes_asset():
    txns = [
        _tx("A", "LumpSum", "2025-01-01", 10, 100.0),
        _tx("A", "Sell", "2025-02-01", -10, 250.0),
    ]
    result = reconstruct_holdings_asof(txns, datetime.date(2025, 3, 1))
    assert "A" not in result


def test_dividend_ignored_for_invested():
    txns = [
        _tx("A", "LumpSum", "2025-01-01", 10, 100.0),
        _tx("A", "Dividend", "2025-02-01", 5, 3.0),
    ]
    result = reconstruct_holdings_asof(txns, datetime.date(2025, 3, 1))
    assert result["A"]["shares"] == 10
    assert result["A"]["avg_cost"] == 100.0


def test_asof_excludes_future_transactions():
    txns = [
        _tx("A", "LumpSum", "2025-01-01", 10, 100.0),
        _tx("A", "LumpSum", "2025-06-01", 10, 200.0),
    ]
    result = reconstruct_holdings_asof(txns, datetime.date(2025, 3, 1))
    assert result["A"]["shares"] == 10
    assert result["A"]["avg_cost"] == 100.0


def test_iso_string_dates_supported():
    txns = [
        {"asset_id": "A", "transaction_type": "LumpSum",
         "transaction_date": "2025-01-01", "shares": 10, "price_per_share": 100.0},
    ]
    result = reconstruct_holdings_asof(txns, datetime.date(2025, 3, 1))
    assert result["A"]["shares"] == 10
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `cd backend && python -m pytest tests/test_reconstruction.py -v`
Expected: FAIL — `ImportError: cannot import name 'reconstruct_holdings_asof'`.

- [ ] **Step 5: Implement `reconstruct_holdings_asof`**

Add near the other snapshot helpers (just above `def take_portfolio_snapshot` at `worthy_lambda_function.py:5676`):

```python
def _coerce_date(value):
    """Accept a datetime.date, datetime.datetime, or ISO string -> datetime.date."""
    import datetime as _dt
    if isinstance(value, _dt.datetime):
        return value.date()
    if isinstance(value, _dt.date):
        return value
    return _dt.date.fromisoformat(str(value)[:10])


def reconstruct_holdings_asof(transactions, asof_date):
    """
    Replay a user's transaction ledger to reconstruct per-asset holdings and
    average cost basis (native currency) as of asof_date.

    Average-cost method: buys update the running average; sells reduce shares
    but leave average cost per share unchanged; dividends are ignored.

    Returns { asset_id: {'shares': float, 'avg_cost': float} } for assets that
    still hold shares (> 1e-9) as of the date.
    """
    BUY_TYPES = {'Initialization', 'LumpSum', 'Recurring'}

    # Sort by date so replay order is correct regardless of input ordering.
    ordered = sorted(
        (t for t in transactions if _coerce_date(t['transaction_date']) <= asof_date),
        key=lambda t: (_coerce_date(t['transaction_date']),)
    )

    holdings = {}  # asset_id -> {'shares': float, 'avg_cost': float}
    for t in ordered:
        aid = str(t['asset_id'])
        ttype = t['transaction_type']
        shares = float(t['shares'])
        price = float(t['price_per_share'])

        if ttype == 'Dividend':
            continue

        h = holdings.setdefault(aid, {'shares': 0.0, 'avg_cost': 0.0})

        if ttype in BUY_TYPES:
            new_shares = h['shares'] + shares
            if new_shares > 1e-9:
                h['avg_cost'] = (h['shares'] * h['avg_cost'] + shares * price) / new_shares
            h['shares'] = new_shares
        elif ttype == 'Sell':
            # shares is stored negative for sells; avg_cost unchanged.
            h['shares'] = h['shares'] + shares
        else:
            logger.warning(f"reconstruct_holdings_asof: unknown transaction_type {ttype!r}, ignoring")

    return {aid: h for aid, h in holdings.items() if h['shares'] > 1e-9}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `cd backend && python -m pytest tests/test_reconstruction.py -v`
Expected: PASS (6 passed).

- [ ] **Step 7: Commit**

```bash
cd /Users/jeanl/ch-team/worthy
git add backend/requirements-dev.txt backend/tests/__init__.py backend/tests/test_reconstruction.py backend/worthy_lambda_function.py
git commit -m "feat: add point-in-time ledger reconstruction helper"
```

---

### Task 2: Historical FX helper (Yahoo Finance, in-memory cached)

**Files:**
- Modify: `backend/worthy_lambda_function.py` (add `get_historical_fx_rate`)
- Create/Modify: `backend/tests/test_historical_fx.py`

**Interfaces:**
- Consumes: existing `get_cached_exchange_rate(base, target)` / `set_cached_exchange_rate(base, target, rate_data)` (`worthy_lambda_function.py:1121`, `:1133`); `convert_currency_amount` as spot fallback (`:4291`).
- Produces: `get_historical_fx_rate(from_currency, to_currency, on_date) -> float`
  - Returns the multiplicative rate `r` such that `amount_in_to = amount_in_from * r`, for `on_date` (a `datetime.date`).
  - Uses Yahoo daily close, crossing via USD. On missing date, carries forward the most recent prior close within the fetched window. On total failure, falls back to `convert_currency_amount(1.0, from_currency, to_currency)` (current spot) and logs a warning.
  - Returns `1.0` when `from_currency == to_currency`.

- [ ] **Step 1: Write the failing test**

Create `backend/tests/test_historical_fx.py`:

```python
import datetime
from unittest import mock
import worthy_lambda_function as wlf


def test_same_currency_returns_one():
    assert wlf.get_historical_fx_rate("TWD", "TWD", datetime.date(2025, 2, 10)) == 1.0


def test_usd_to_twd_uses_yahoo_close():
    # Yahoo TWD=X quotes USD->TWD directly.
    fake = {
        "chart": {"result": [{
            "timestamp": [int(datetime.datetime(2025, 2, 10).timestamp())],
            "indicators": {"quote": [{"close": [32.8]}]},
        }]}
    }
    with mock.patch.object(wlf, "_fetch_yahoo_fx_series", return_value={datetime.date(2025, 2, 10): 32.8}):
        rate = wlf.get_historical_fx_rate("USD", "TWD", datetime.date(2025, 2, 10))
    assert abs(rate - 32.8) < 1e-6


def test_carry_forward_on_missing_date():
    series = {datetime.date(2025, 2, 7): 32.5}  # Friday; query for Sunday
    with mock.patch.object(wlf, "_fetch_yahoo_fx_series", return_value=series):
        rate = wlf.get_historical_fx_rate("USD", "TWD", datetime.date(2025, 2, 9))
    assert abs(rate - 32.5) < 1e-6


def test_cross_via_usd():
    # from=JPY to=TWD: rate = (USD->TWD) / (USD->JPY)
    def fake_series(pair_currency, start, end):
        return {
            "TWD": {datetime.date(2025, 2, 10): 32.0},
            "JPY": {datetime.date(2025, 2, 10): 150.0},
        }[pair_currency]
    with mock.patch.object(wlf, "_fetch_yahoo_fx_series", side_effect=lambda c, s, e: fake_series(c, s, e)):
        rate = wlf.get_historical_fx_rate("JPY", "TWD", datetime.date(2025, 2, 10))
    assert abs(rate - (32.0 / 150.0)) < 1e-6


def test_spot_fallback_on_failure():
    with mock.patch.object(wlf, "_fetch_yahoo_fx_series", side_effect=Exception("network")), \
         mock.patch.object(wlf, "convert_currency_amount", return_value=30.0) as spot:
        rate = wlf.get_historical_fx_rate("USD", "TWD", datetime.date(2025, 2, 10))
    assert rate == 30.0
    spot.assert_called_once()
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd backend && python -m pytest tests/test_historical_fx.py -v`
Expected: FAIL — `AttributeError: module ... has no attribute 'get_historical_fx_rate'` (and `_fetch_yahoo_fx_series`).

- [ ] **Step 3: Implement the FX helpers**

Add below `convert_currency_amount` (after `worthy_lambda_function.py:4367`):

```python
def _fetch_yahoo_fx_series(pair_currency, start_date, end_date):
    """
    Fetch daily USD->pair_currency close prices from Yahoo Finance for the
    inclusive date window. Returns { datetime.date: float }.

    Yahoo quotes USD-based FX as '{CUR}=X' (e.g. TWD=X == USD->TWD).
    """
    import datetime as _dt
    symbol = f"{pair_currency}=X"
    # Pad the window so weekends/holidays before the first requested date resolve.
    period1 = int(_dt.datetime.combine(start_date - _dt.timedelta(days=7), _dt.time()).timestamp())
    period2 = int(_dt.datetime.combine(end_date + _dt.timedelta(days=1), _dt.time()).timestamp())
    url = (
        f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"
        f"?period1={period1}&period2={period2}&interval=1d"
    )
    response = requests.get(url, headers={"User-Agent": "Mozilla/5.0"}, timeout=15)
    response.raise_for_status()
    data = response.json()
    result = data["chart"]["result"][0]
    timestamps = result.get("timestamp") or []
    closes = result["indicators"]["quote"][0].get("close") or []
    series = {}
    for ts, close in zip(timestamps, closes):
        if close is None:
            continue
        d = _dt.datetime.utcfromtimestamp(ts).date()
        series[d] = float(close)
    return series


def _usd_rate_on(pair_currency, on_date):
    """USD -> pair_currency close for on_date, carrying forward within a cached window."""
    if pair_currency == "USD":
        return 1.0
    cache_key = f"histfx_{pair_currency}"
    cached = get_cached_exchange_rate("USD", cache_key)
    series = cached.get("series") if cached else None
    if not series or on_date not in series:
        fetched = _fetch_yahoo_fx_series(pair_currency, on_date, on_date)
        # Merge with any prior cached series (keys are ISO strings in cache).
        series = dict((k, v) for k, v in (series or {}).items())
        series.update(fetched)
        set_cached_exchange_rate("USD", cache_key, {"series": series})
    # Exact date, else most recent prior date (carry forward).
    if on_date in series:
        return series[on_date]
    prior = [d for d in series.keys() if d <= on_date]
    if not prior:
        raise Exception(f"No historical USD->{pair_currency} rate on or before {on_date}")
    return series[max(prior)]


def get_historical_fx_rate(from_currency, to_currency, on_date):
    """
    Multiplicative rate r such that amount_to = amount_from * r, for on_date.
    Crosses via USD. Falls back to current spot on failure.
    """
    if from_currency == to_currency:
        return 1.0
    try:
        usd_to_from = _usd_rate_on(from_currency, on_date)  # USD->from
        usd_to_to = _usd_rate_on(to_currency, on_date)      # USD->to
        # from->to = (USD->to) / (USD->from)
        return usd_to_to / usd_to_from
    except Exception as e:
        logger.warning(
            f"Historical FX {from_currency}->{to_currency} on {on_date} failed ({e}); "
            f"falling back to current spot"
        )
        return convert_currency_amount(1.0, from_currency, to_currency)
```

Note: the in-memory cache stores the `series` dict directly (keys are `datetime.date`). Because `set_cached_exchange_rate` calls `.copy()` (shallow), the nested dict is shared across the run — acceptable for a per-run cache. Do NOT rely on cross-process persistence.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd backend && python -m pytest tests/test_historical_fx.py -v`
Expected: PASS (5 passed).

- [ ] **Step 5: Commit**

```bash
cd /Users/jeanl/ch-team/worthy
git add backend/worthy_lambda_function.py backend/tests/test_historical_fx.py
git commit -m "feat: add historical FX rate helper (Yahoo, in-memory cached)"
```

---

### Task 3: Compute invested from the ledger (combining reconstruction + FX)

**Files:**
- Modify: `backend/worthy_lambda_function.py` (add `compute_invested_asof`)
- Create/Modify: `backend/tests/test_compute_invested.py`

**Interfaces:**
- Consumes: `reconstruct_holdings_asof` (Task 1), `get_historical_fx_rate` (Task 2), `INVESTABLE_ASSET_TYPES` (`:5674`).
- Produces: `compute_invested_asof(transactions, asset_meta, base_currency, asof_date) -> (total_invested, invest_invested)`
  - `asset_meta`: `{ asset_id: {'currency': str, 'asset_type': str} }`.
  - Returns a tuple of two floats in `base_currency`, converted at `asof_date`'s historical FX.

- [ ] **Step 1: Write the failing test**

Create `backend/tests/test_compute_invested.py`:

```python
import datetime
from unittest import mock
import worthy_lambda_function as wlf


def _tx(asset_id, ttype, date, shares, price):
    return {"asset_id": asset_id, "transaction_type": ttype,
            "transaction_date": datetime.date.fromisoformat(date),
            "shares": shares, "price_per_share": price}


def test_invested_split_and_fx_applied():
    txns = [
        _tx("S", "LumpSum", "2025-01-01", 10, 100.0),   # Stock, USD -> investable
        _tx("C", "Initialization", "2025-01-01", 1, 5000.0),  # Cash, TWD -> total only
    ]
    meta = {
        "S": {"currency": "USD", "asset_type": "Stock"},
        "C": {"currency": "TWD", "asset_type": "Cash"},
    }
    # USD->TWD = 30 on the date; TWD->TWD = 1.
    def fake_fx(frm, to, on_date):
        return {("USD", "TWD"): 30.0, ("TWD", "TWD"): 1.0}[(frm, to)]
    with mock.patch.object(wlf, "get_historical_fx_rate", side_effect=fake_fx):
        total, invest = wlf.compute_invested_asof(
            txns, meta, "TWD", datetime.date(2025, 2, 1))
    # Stock: 10*100 USD * 30 = 30000 ; Cash: 1*5000 TWD = 5000
    assert abs(invest - 30000.0) < 1e-6
    assert abs(total - 35000.0) < 1e-6


def test_sold_out_asset_excluded():
    txns = [
        _tx("S", "LumpSum", "2025-01-01", 10, 100.0),
        _tx("S", "Sell", "2025-01-15", -10, 120.0),
    ]
    meta = {"S": {"currency": "USD", "asset_type": "Stock"}}
    with mock.patch.object(wlf, "get_historical_fx_rate", return_value=30.0):
        total, invest = wlf.compute_invested_asof(
            txns, meta, "TWD", datetime.date(2025, 2, 1))
    assert total == 0.0
    assert invest == 0.0


def test_missing_asset_meta_is_skipped():
    txns = [_tx("X", "LumpSum", "2025-01-01", 10, 100.0)]
    with mock.patch.object(wlf, "get_historical_fx_rate", return_value=1.0):
        total, invest = wlf.compute_invested_asof(
            txns, {}, "USD", datetime.date(2025, 2, 1))
    assert total == 0.0 and invest == 0.0
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd backend && python -m pytest tests/test_compute_invested.py -v`
Expected: FAIL — `AttributeError: ... 'compute_invested_asof'`.

- [ ] **Step 3: Implement `compute_invested_asof`**

Add directly after `reconstruct_holdings_asof`:

```python
def compute_invested_asof(transactions, asset_meta, base_currency, asof_date):
    """
    Point-in-time invested amounts in base_currency as of asof_date.

    asset_meta: { asset_id: {'currency': str, 'asset_type': str} }
    Returns (total_invested, invest_invested).
    """
    holdings = reconstruct_holdings_asof(transactions, asof_date)
    total_invested = 0.0
    invest_invested = 0.0
    for aid, h in holdings.items():
        meta = asset_meta.get(str(aid))
        if not meta:
            logger.warning(f"compute_invested_asof: no asset_meta for {aid}, skipping")
            continue
        native_invested = h['shares'] * h['avg_cost']
        currency = meta.get('currency', 'USD')
        try:
            rate = get_historical_fx_rate(currency, base_currency, asof_date)
            base_invested = native_invested * rate
        except Exception:
            logger.warning(f"compute_invested_asof: FX failed for {aid} ({currency}), skipping")
            continue
        total_invested += base_invested
        if meta.get('asset_type') in INVESTABLE_ASSET_TYPES:
            invest_invested += base_invested
    return total_invested, invest_invested
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd backend && python -m pytest tests/test_compute_invested.py -v`
Expected: PASS (3 passed).

- [ ] **Step 5: Commit**

```bash
cd /Users/jeanl/ch-team/worthy
git add backend/worthy_lambda_function.py backend/tests/test_compute_invested.py
git commit -m "feat: compute point-in-time invested from ledger + historical FX"
```

---

### Task 4: Add a ledger-based recompute of an existing snapshot's invested

**Files:**
- Modify: `backend/worthy_lambda_function.py` (add `recompute_snapshot_invested`)
- Create/Modify: `backend/tests/test_recompute_snapshot.py`

**Interfaces:**
- Consumes: `compute_invested_asof` (Task 3), `execute_query` / `execute_update` (`:1021`/`:1028`), `DATABASE_URL` (`:967`).
- Produces: `recompute_snapshot_invested(user_id, snapshot_date, transactions=None, asset_meta=None, base_currency=None) -> dict`
  - Loads transactions/asset_meta/base_currency if not passed (so callers can batch-load once and reuse).
  - Updates only `total_invested` and `invest_invested` on the existing `portfolio_snapshots` row for `(user_id, snapshot_date)`. Does not touch value columns.
  - Returns `{'user_id', 'snapshot_date', 'total_invested', 'invest_invested'}`.

- [ ] **Step 1: Write the failing test**

Create `backend/tests/test_recompute_snapshot.py`:

```python
import datetime
from unittest import mock
import worthy_lambda_function as wlf


def test_recompute_updates_only_invested_columns():
    captured = {}

    def fake_execute_update(db, query, params):
        captured["query"] = query
        captured["params"] = params

    txns = [{"asset_id": "S", "transaction_type": "LumpSum",
             "transaction_date": datetime.date(2025, 1, 1),
             "shares": 10, "price_per_share": 100.0}]
    meta = {"S": {"currency": "USD", "asset_type": "Stock"}}

    with mock.patch.object(wlf, "execute_update", side_effect=fake_execute_update), \
         mock.patch.object(wlf, "compute_invested_asof", return_value=(35000.0, 30000.0)):
        out = wlf.recompute_snapshot_invested(
            user_id="21", snapshot_date=datetime.date(2025, 2, 1),
            transactions=txns, asset_meta=meta, base_currency="TWD")

    assert out["total_invested"] == 35000.0
    assert out["invest_invested"] == 30000.0
    q = captured["query"].lower()
    assert "update portfolio_snapshots" in q
    assert "total_invested" in q and "invest_invested" in q
    # Must NOT modify value columns.
    assert "total_value" not in q and "invest_value" not in q
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd backend && python -m pytest tests/test_recompute_snapshot.py -v`
Expected: FAIL — `AttributeError: ... 'recompute_snapshot_invested'`.

- [ ] **Step 3: Implement `recompute_snapshot_invested` and a shared loader**

Add after `compute_invested_asof`:

```python
def _load_user_ledger(user_id):
    """Return (transactions, asset_meta, base_currency) for a user."""
    base_rows = execute_query(
        DATABASE_URL,
        "SELECT base_currency FROM users WHERE user_id = %s",
        (user_id,)
    )
    if not base_rows:
        raise ValueError(f"User {user_id} not found")
    base_currency = base_rows[0]['base_currency']

    rows = execute_query(
        DATABASE_URL,
        """
        SELECT t.asset_id, t.transaction_type, t.transaction_date,
               t.shares, t.price_per_share, a.currency, a.asset_type
        FROM transactions t
        JOIN assets a ON t.asset_id = a.asset_id
        WHERE a.user_id = %s
        """,
        (user_id,)
    )
    transactions = []
    asset_meta = {}
    for r in rows:
        aid = str(r['asset_id'])
        transactions.append({
            'asset_id': aid,
            'transaction_type': r['transaction_type'],
            'transaction_date': r['transaction_date'],
            'shares': r['shares'],
            'price_per_share': r['price_per_share'],
        })
        asset_meta[aid] = {'currency': r.get('currency', 'USD'),
                           'asset_type': r.get('asset_type', 'Stock')}
    return transactions, asset_meta, base_currency


def recompute_snapshot_invested(user_id, snapshot_date, transactions=None,
                                asset_meta=None, base_currency=None):
    """Recompute and UPDATE only the invested columns of an existing snapshot."""
    if transactions is None or asset_meta is None or base_currency is None:
        transactions, asset_meta, base_currency = _load_user_ledger(user_id)

    asof = _coerce_date(snapshot_date)
    total_invested, invest_invested = compute_invested_asof(
        transactions, asset_meta, base_currency, asof)

    execute_update(
        DATABASE_URL,
        """
        UPDATE portfolio_snapshots
        SET total_invested = %s, invest_invested = %s
        WHERE user_id = %s AND snapshot_date = %s
        """,
        (total_invested, invest_invested, user_id, snapshot_date)
    )
    return {
        'user_id': user_id,
        'snapshot_date': str(snapshot_date),
        'total_invested': total_invested,
        'invest_invested': invest_invested,
    }
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd backend && python -m pytest tests/test_recompute_snapshot.py -v`
Expected: PASS (1 passed).

- [ ] **Step 5: Commit**

```bash
cd /Users/jeanl/ch-team/worthy
git add backend/worthy_lambda_function.py backend/tests/test_recompute_snapshot.py
git commit -m "feat: recompute invested columns of an existing snapshot from ledger"
```

---

### Task 5: One-time re-runnable backfill endpoint

**Files:**
- Modify: `backend/worthy_lambda_function.py` (add `handle_backfill_snapshot_invested`; add route near `:8218`)
- Create/Modify: `backend/tests/test_backfill_endpoint.py`

**Interfaces:**
- Consumes: `recompute_snapshot_invested` + `_load_user_ledger` (Task 4), `execute_query`, `create_response`.
- Produces: `handle_backfill_snapshot_invested(body) -> response` where `body` may include `{"user_id": <id>}` to scope to one user (omit = all users with snapshots). Route: `POST /batch/backfill-snapshot-invested`.

- [ ] **Step 1: Write the failing test**

Create `backend/tests/test_backfill_endpoint.py`:

```python
from unittest import mock
import worthy_lambda_function as wlf


def test_backfill_recomputes_each_snapshot_per_user():
    # Two users, each with two snapshot dates.
    def fake_query(db, query, params=None):
        q = query.lower()
        if "distinct user_id from portfolio_snapshots" in q:
            return [{"user_id": "21"}, {"user_id": "7"}]
        if "snapshot_date from portfolio_snapshots" in q:
            return [{"snapshot_date": "2025-01-01"}, {"snapshot_date": "2025-01-02"}]
        return []

    calls = []

    def fake_recompute(user_id, snapshot_date, transactions=None,
                       asset_meta=None, base_currency=None):
        calls.append((user_id, str(snapshot_date)))
        return {"user_id": user_id, "snapshot_date": str(snapshot_date),
                "total_invested": 1.0, "invest_invested": 1.0}

    with mock.patch.object(wlf, "execute_query", side_effect=fake_query), \
         mock.patch.object(wlf, "_load_user_ledger", return_value=([], {}, "TWD")), \
         mock.patch.object(wlf, "recompute_snapshot_invested", side_effect=fake_recompute):
        resp = wlf.handle_backfill_snapshot_invested({})

    assert resp["statusCode"] == 200
    # 2 users x 2 dates = 4 recompute calls
    assert len(calls) == 4


def test_backfill_scoped_to_single_user():
    def fake_query(db, query, params=None):
        q = query.lower()
        if "snapshot_date from portfolio_snapshots" in q:
            return [{"snapshot_date": "2025-01-01"}]
        return []
    calls = []
    with mock.patch.object(wlf, "execute_query", side_effect=fake_query), \
         mock.patch.object(wlf, "_load_user_ledger", return_value=([], {}, "TWD")), \
         mock.patch.object(wlf, "recompute_snapshot_invested",
                           side_effect=lambda **k: calls.append(k) or {}):
        resp = wlf.handle_backfill_snapshot_invested({"user_id": "21"})
    assert resp["statusCode"] == 200
    assert len(calls) == 1
    assert calls[0]["user_id"] == "21"
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd backend && python -m pytest tests/test_backfill_endpoint.py -v`
Expected: FAIL — `AttributeError: ... 'handle_backfill_snapshot_invested'`.

- [ ] **Step 3: Implement the handler**

Add near `handle_batch_portfolio_snapshot` (after `:5867`):

```python
def handle_backfill_snapshot_invested(body=None):
    """
    Re-runnable one-time backfill: recompute invested columns for existing
    snapshots from the transaction ledger.

    body: optional {"user_id": <id>} to scope to a single user.
    """
    logger.info("Starting snapshot invested backfill")
    user_id = None
    if body and isinstance(body, dict):
        user_id = body.get('user_id')

    if user_id:
        user_ids = [user_id]
    else:
        rows = execute_query(
            DATABASE_URL,
            "SELECT DISTINCT user_id FROM portfolio_snapshots"
        )
        user_ids = [r['user_id'] for r in rows]

    results = {'updated': 0, 'users': 0, 'failed': []}
    for uid in user_ids:
        try:
            transactions, asset_meta, base_currency = _load_user_ledger(uid)
            date_rows = execute_query(
                DATABASE_URL,
                "SELECT snapshot_date FROM portfolio_snapshots WHERE user_id = %s ORDER BY snapshot_date",
                (uid,)
            )
            for dr in date_rows:
                recompute_snapshot_invested(
                    user_id=uid, snapshot_date=dr['snapshot_date'],
                    transactions=transactions, asset_meta=asset_meta,
                    base_currency=base_currency)
                results['updated'] += 1
            results['users'] += 1
        except Exception as e:
            logger.error(f"Backfill failed for user {uid}: {str(e)}")
            results['failed'].append({'user_id': uid, 'error': str(e)})

    logger.info(f"Backfill complete: {results['updated']} snapshots, "
                f"{results['users']} users, {len(results['failed'])} failed")
    return create_response(200, {
        'message': 'Snapshot invested backfill complete',
        'results': results,
    })
```

- [ ] **Step 4: Add the route**

In the router, right after the `/batch/portfolio-snapshot` block (`worthy_lambda_function.py:8218-8219`), add:

```python
        elif path == '/batch/backfill-snapshot-invested' and http_method == 'POST':
            body = json.loads(event.get('body', '{}')) if event.get('body') else {}
            return handle_backfill_snapshot_invested(body)
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `cd backend && python -m pytest tests/test_backfill_endpoint.py -v`
Expected: PASS (2 passed).

- [ ] **Step 6: Commit**

```bash
cd /Users/jeanl/ch-team/worthy
git add backend/worthy_lambda_function.py backend/tests/test_backfill_endpoint.py
git commit -m "feat: add re-runnable snapshot invested backfill endpoint"
```

---

### Task 6: Nightly 90-day rolling-window recompute in the batch job

**Files:**
- Modify: `backend/worthy_lambda_function.py` (`handle_batch_portfolio_snapshot`, `:5820`)
- Create/Modify: `backend/tests/test_rolling_window.py`

**Interfaces:**
- Consumes: `recompute_snapshot_invested` + `_load_user_ledger` (Task 4).
- Produces: extended `handle_batch_portfolio_snapshot` behavior — after taking today's snapshot for each user, recompute invested for that user's snapshots within the last 90 days. Add a module constant `ROLLING_RECOMPUTE_DAYS = 90`.

- [ ] **Step 1: Write the failing test**

Create `backend/tests/test_rolling_window.py`:

```python
from unittest import mock
import worthy_lambda_function as wlf


def test_batch_recomputes_last_90_days_per_user():
    assert wlf.ROLLING_RECOMPUTE_DAYS == 90

    def fake_query(db, query, params=None):
        q = query.lower()
        if "distinct user_id from assets" in q:
            return [{"user_id": "21"}]
        if "snapshot_date from portfolio_snapshots" in q:
            # window query returns two dates
            return [{"snapshot_date": "2026-05-01"}, {"snapshot_date": "2026-05-02"}]
        return []

    recompute_calls = []

    with mock.patch.object(wlf, "execute_query", side_effect=fake_query), \
         mock.patch.object(wlf, "take_portfolio_snapshot", return_value={"total_value": 1}), \
         mock.patch.object(wlf, "_load_user_ledger", return_value=([], {}, "TWD")), \
         mock.patch.object(wlf, "recompute_snapshot_invested",
                           side_effect=lambda **k: recompute_calls.append(k) or {}):
        resp = wlf.handle_batch_portfolio_snapshot({})

    assert resp["statusCode"] == 200
    # Two windowed snapshots recomputed for the single user.
    assert len(recompute_calls) == 2
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd backend && python -m pytest tests/test_rolling_window.py -v`
Expected: FAIL — `AttributeError: ... 'ROLLING_RECOMPUTE_DAYS'` (constant not yet defined).

- [ ] **Step 3: Add the constant and rolling-window recompute**

Add the constant next to `INVESTABLE_ASSET_TYPES` (`:5674`):

```python
ROLLING_RECOMPUTE_DAYS = 90
```

In `handle_batch_portfolio_snapshot`, inside the per-user `try` block, after the existing `take_portfolio_snapshot(uid)` call and before `results['success'].append(uid)` (`:5857-5858`), insert:

```python
            # Recompute invested (point-in-time) for the rolling window so
            # backdated/edited transactions within the window self-correct.
            try:
                transactions, asset_meta, base_currency = _load_user_ledger(uid)
                window_start = today - timedelta(days=ROLLING_RECOMPUTE_DAYS)
                window_rows = execute_query(
                    DATABASE_URL,
                    """
                    SELECT snapshot_date FROM portfolio_snapshots
                    WHERE user_id = %s AND snapshot_date >= %s
                    ORDER BY snapshot_date
                    """,
                    (uid, window_start)
                )
                for wr in window_rows:
                    recompute_snapshot_invested(
                        user_id=uid, snapshot_date=wr['snapshot_date'],
                        transactions=transactions, asset_meta=asset_meta,
                        base_currency=base_currency)
            except Exception as e:
                logger.error(f"Rolling recompute failed for user {uid}: {str(e)}")
```

(`today` and `timedelta` are already in scope in this function — see `:5826`, `:5840`.)

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd backend && python -m pytest tests/test_rolling_window.py -v`
Expected: PASS (1 passed).

- [ ] **Step 5: Commit**

```bash
cd /Users/jeanl/ch-team/worthy
git add backend/worthy_lambda_function.py backend/tests/test_rolling_window.py
git commit -m "feat: nightly 90-day rolling-window invested recompute in batch job"
```

---

### Task 7: Unify the daily snapshot's invested calc on the ledger

**Files:**
- Modify: `backend/worthy_lambda_function.py` (`take_portfolio_snapshot`, `:5676`)
- Create/Modify: `backend/tests/test_take_snapshot_invested.py`

**Interfaces:**
- Consumes: `compute_invested_asof` (Task 3), `_load_user_ledger` (Task 4).
- Produces: `take_portfolio_snapshot` computes `total_invested` / `invest_invested` via `compute_invested_asof` as-of the snapshot date, while `total_value` / `invest_value` keep their current market-price logic.

**Context:** Currently the invested totals are accumulated inside the per-asset loop (`:5756`, `:5760`) as `invested_amount` (native, spot-converted). This task replaces those two accumulations with the ledger-based figures; the value accumulations (`:5755`, `:5759`) stay.

- [ ] **Step 1: Write the failing test**

Create `backend/tests/test_take_snapshot_invested.py`:

```python
import datetime
from unittest import mock
import worthy_lambda_function as wlf


def test_take_snapshot_uses_ledger_for_invested():
    # users lookup + assets lookup + dividends lookup + insert
    def fake_query(db, query, params=None):
        q = query.lower()
        if "base_currency from users" in q:
            return [{"base_currency": "TWD"}]
        if "from assets where user_id" in q:
            return [{"ticker_symbol": "QQQ", "total_shares": 10,
                     "average_cost_basis": 100.0, "currency": "USD",
                     "asset_type": "Stock", "interest_rate": None,
                     "maturity_date": None, "start_date": None, "created_at": None}]
        if "transaction_type = 'dividend'" in q:
            return []
        return []

    inserted = {}

    def fake_update(db, query, params):
        inserted["params"] = params

    with mock.patch.object(wlf, "execute_query", side_effect=fake_query), \
         mock.patch.object(wlf, "execute_update", side_effect=fake_update), \
         mock.patch.object(wlf, "fetch_stock_price_with_fallback",
                           return_value={"current_price": 120.0}), \
         mock.patch.object(wlf, "convert_currency_amount", side_effect=lambda a, f, t: a * 30.0), \
         mock.patch.object(wlf, "_load_user_ledger",
                           return_value=([], {}, "TWD")), \
         mock.patch.object(wlf, "compute_invested_asof", return_value=(9999.0, 8888.0)):
        out = wlf.take_portfolio_snapshot("21", snapshot_date=datetime.date(2026, 5, 1))

    assert out["total_invested"] == 9999.0
    assert out["invest_invested"] == 8888.0
    # value side still computed from market price (10 * 120 * 30 = 36000)
    assert out["total_value"] > 0
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd backend && python -m pytest tests/test_take_snapshot_invested.py -v`
Expected: FAIL — `out["total_invested"]` is the old asset-table figure, not `9999.0`.

- [ ] **Step 3: Refactor `take_portfolio_snapshot`**

In `take_portfolio_snapshot`:

1. Keep the value accumulation but stop accumulating invested from the asset loop. Change line `:5756` and `:5760` region so `total_invested` / `invest_invested` are NOT incremented inside the loop. Concretely, remove these two lines:

```python
        total_invested += invested_amount
```
```python
            invest_invested += invested_amount
```

(Leave `total_value += current_amount` and `invest_value += current_amount` intact.)

2. After the asset loop and before the dividends query (`:5762`), compute invested from the ledger:

```python
    # Invested (cost basis) is reconstructed point-in-time from the ledger so
    # backdated transactions and sells are reflected correctly.
    try:
        _txns, _meta, _base = _load_user_ledger(user_id)
        total_invested, invest_invested = compute_invested_asof(
            _txns, _meta, _base, _coerce_date(today if snapshot_date is None else snapshot_date))
    except Exception as e:
        logger.error(f"Snapshot: ledger invested computation failed for user {user_id}: {e}; "
                     f"keeping asset-table fallback")
        # total_invested / invest_invested retain any loop value (0.0 here).
```

Note: `today` is defined at `:5785` *after* the loop. Move the `today = snapshot_date or date.today()` assignment to just before this new block (or reference `snapshot_date or date.today()` directly in the `_coerce_date(...)` call). Use `_coerce_date(snapshot_date or date.today())` to avoid ordering issues.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd backend && python -m pytest tests/test_take_snapshot_invested.py -v`
Expected: PASS (1 passed).

- [ ] **Step 5: Run the full backend test suite**

Run: `cd backend && python -m pytest tests/ -v`
Expected: PASS (all tasks' tests green).

- [ ] **Step 6: Commit**

```bash
cd /Users/jeanl/ch-team/worthy
git add backend/worthy_lambda_function.py backend/tests/test_take_snapshot_invested.py
git commit -m "refactor: compute daily snapshot invested from ledger (point-in-time)"
```

---

### Task 8: Integration verification against Bucky's data

**Files:**
- Create: `backend/tests/test_bucky_integration.py`
- Uses fixture: `worthy-backup-20260511-181002.json` (repo root)

**Interfaces:**
- Consumes: `reconstruct_holdings_asof`, `compute_invested_asof` (with FX mocked to isolate cost-basis logic).

**Purpose:** Prove the bug is fixed — `invest_invested` now *drops* on partial sells that previously inflated it.

- [ ] **Step 1: Write the integration test**

Create `backend/tests/test_bucky_integration.py`:

```python
import os
import json
import datetime
from unittest import mock
import pytest
import worthy_lambda_function as wlf

BACKUP = os.path.join(os.path.dirname(__file__), "..", "..",
                      "worthy-backup-20260511-181002.json")


def _load_bucky():
    if not os.path.exists(BACKUP):
        pytest.skip("Bucky backup fixture not present")
    with open(BACKUP) as f:
        d = json.load(f)
    uid = "21"
    assets = [a for a in d["assets"] if str(a["user_id"]) == uid]
    aids = {str(a["asset_id"]) for a in assets}
    txns = [{
        "asset_id": str(t["asset_id"]),
        "transaction_type": t["transaction_type"],
        "transaction_date": datetime.date.fromisoformat(str(t["transaction_date"])[:10]),
        "shares": float(t["shares"]),
        "price_per_share": float(t["price_per_share"]),
    } for t in d["transactions"] if str(t["asset_id"]) in aids]
    meta = {str(a["asset_id"]): {"currency": a["currency"],
                                 "asset_type": a["asset_type"]} for a in assets}
    return txns, meta


def _invest_only(txns, meta, on):
    # FX identity so we isolate cost-basis behavior (native amounts).
    with mock.patch.object(wlf, "get_historical_fx_rate", return_value=1.0):
        _, invest = wlf.compute_invested_asof(txns, meta, "TWD", on)
    return invest


def test_tqqq_partial_sell_reduces_invested():
    txns, meta = _load_bucky()
    before = _invest_only(txns, meta, datetime.date(2026, 4, 23))
    after = _invest_only(txns, meta, datetime.date(2026, 4, 24))  # TQQQ -50sh
    assert after < before, "invested should DROP after a partial sell"


def test_nvda_full_sell_removes_position():
    txns, meta = _load_bucky()
    # NVDA (asset 9201) fully sold 2026-02-09.
    before = _invest_only(txns, meta, datetime.date(2026, 2, 6))
    after = _invest_only(txns, meta, datetime.date(2026, 2, 9))
    assert after < before
```

- [ ] **Step 2: Run the integration test**

Run: `cd backend && python -m pytest tests/test_bucky_integration.py -v`
Expected: PASS (2 passed) — or SKIP if the backup file is absent.

- [ ] **Step 3: Commit**

```bash
cd /Users/jeanl/ch-team/worthy
git add backend/tests/test_bucky_integration.py
git commit -m "test: verify snapshot invested drops on sells (Bucky fixture)"
```

---

### Task 9: End-to-end run + backfill execution

**Files:** none (operational task)

**Interfaces:** Consumes the deployed `POST /batch/backfill-snapshot-invested`.

- [ ] **Step 1: Run full test suite**

Run: `cd backend && python -m pytest tests/ -v`
Expected: All green.

- [ ] **Step 2: Deploy the backend** (per existing deploy process for the Cloud Run service `worthy-backend-production`, project `jean-project-492204`). Confirm the new route is live:

Run: `curl -s -o /dev/null -w "%{http_code}\n" -X POST "$BACKEND_URL/batch/backfill-snapshot-invested" -H "Content-Type: application/json" -d '{"user_id":"21"}'`
Expected: `200` (note: this endpoint mirrors the existing `/batch/portfolio-snapshot` auth model — if that job runs unauthenticated via scheduler OIDC, confirm invocation path before running for all users).

- [ ] **Step 3: Backfill Bucky first, then spot-check** the `/portfolio/snapshots` output for user 21 around the 2026-04-24 and 2026-02-09 sell dates — confirm `invest_invested` now decreases across those sells on the chart.

- [ ] **Step 4: Backfill all users** by POSTing with an empty body `{}` once Bucky looks correct.

---

## Notes / Known Limitations (from spec)

- Value side (`total_value` / `invest_value`) is unchanged; backdated snapshots keep stale value.
- Edits/deletes older than the 90-day window require a manual re-run of `/batch/backfill-snapshot-invested`.
- Historical FX is re-fetched per job run (no persistence, per the no-schema-change constraint).
