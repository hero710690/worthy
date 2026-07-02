import datetime
from unittest import mock
import worthy_lambda_function as wlf


def _base_query(db, query, params=None):
    """Shared query handler for common lookups."""
    q = query.lower()
    if "base_currency from users" in q:
        return [{"base_currency": "TWD"}]
    if "from assets where user_id" in q:
        return [{"ticker_symbol": "TSLA", "total_shares": 10,
                 "average_cost_basis": 200.0, "currency": "TWD",
                 "asset_type": "Stock", "interest_rate": None,
                 "maturity_date": None, "start_date": None, "created_at": None}]
    return []


def test_price_fetch_fails_prior_snapshot_exists_carries_forward():
    """When price fetch returns None and a prior snapshot exists, UPSERT uses prior snapshot's total_value/invest_value."""
    prior_total = 800000.0
    prior_invest = 750000.0

    def fake_query(db, query, params=None):
        q = query.lower()
        if "base_currency from users" in q:
            return [{"base_currency": "TWD"}]
        if "from assets where user_id" in q:
            return [{"ticker_symbol": "TSLA", "total_shares": 10,
                     "average_cost_basis": 200.0, "currency": "TWD",
                     "asset_type": "Stock", "interest_rate": None,
                     "maturity_date": None, "start_date": None, "created_at": None}]
        if "from portfolio_snapshots" in q and "snapshot_date <" in q:
            return [{"total_value": prior_total, "invest_value": prior_invest}]
        return []

    inserted = {}

    def fake_update(db, query, params):
        inserted["params"] = params

    with mock.patch.object(wlf, "execute_query", side_effect=fake_query), \
         mock.patch.object(wlf, "execute_update", side_effect=fake_update), \
         mock.patch.object(wlf, "fetch_stock_price_with_fallback", return_value=None), \
         mock.patch.object(wlf, "_load_user_ledger", return_value=([], {}, "TWD")), \
         mock.patch.object(wlf, "compute_invested_asof", return_value=(5000.0, 4500.0)), \
         mock.patch.object(wlf, "compute_cumulative_dividends_asof", return_value=100.0):
        out = wlf.take_portfolio_snapshot(7, snapshot_date=datetime.date(2026, 7, 2))

    # total_value and invest_value must be the prior snapshot's values (carried forward)
    assert out["total_value"] == prior_total, f"Expected {prior_total}, got {out['total_value']}"
    assert out["invest_value"] == prior_invest, f"Expected {prior_invest}, got {out['invest_value']}"

    # The UPSERT params: (user_id, today, total_value, total_invested, base_currency,
    #                      asset_count, invest_value, invest_invested, cumulative_dividends)
    upsert = inserted["params"]
    assert upsert[2] == prior_total, f"UPSERT total_value should be {prior_total}, got {upsert[2]}"
    assert upsert[6] == prior_invest, f"UPSERT invest_value should be {prior_invest}, got {upsert[6]}"

    # total_invested and invest_invested come from ledger, should be unaffected
    assert upsert[3] == 5000.0
    assert upsert[7] == 4500.0


def test_price_fetch_succeeds_no_carry_forward():
    """When all prices fetch fine, values are computed normally (no carry-forward)."""
    def fake_query(db, query, params=None):
        q = query.lower()
        if "base_currency from users" in q:
            return [{"base_currency": "TWD"}]
        if "from assets where user_id" in q:
            return [{"ticker_symbol": "TSLA", "total_shares": 10,
                     "average_cost_basis": 200.0, "currency": "TWD",
                     "asset_type": "Stock", "interest_rate": None,
                     "maturity_date": None, "start_date": None, "created_at": None}]
        # prior snapshot query should not be hit; return non-empty anyway to catch misuse
        if "from portfolio_snapshots" in q:
            return [{"total_value": 999999.0, "invest_value": 999999.0}]
        return []

    inserted = {}

    def fake_update(db, query, params):
        inserted["params"] = params

    with mock.patch.object(wlf, "execute_query", side_effect=fake_query), \
         mock.patch.object(wlf, "execute_update", side_effect=fake_update), \
         mock.patch.object(wlf, "fetch_stock_price_with_fallback",
                           return_value={"current_price": 300.0}), \
         mock.patch.object(wlf, "_load_user_ledger", return_value=([], {}, "TWD")), \
         mock.patch.object(wlf, "compute_invested_asof", return_value=(2000.0, 1800.0)), \
         mock.patch.object(wlf, "compute_cumulative_dividends_asof", return_value=50.0):
        out = wlf.take_portfolio_snapshot(7, snapshot_date=datetime.date(2026, 7, 2))

    # 10 shares * 300 = 3000 TWD (no FX conversion needed, same currency)
    assert out["total_value"] == 3000.0
    assert out["invest_value"] == 3000.0
    # Must NOT equal the phony prior snapshot value
    assert out["total_value"] != 999999.0


def test_price_fetch_fails_no_prior_snapshot_uses_computed():
    """When price fails and there is no prior snapshot, the computed (cost-basis) values are kept (no crash)."""
    def fake_query(db, query, params=None):
        q = query.lower()
        if "base_currency from users" in q:
            return [{"base_currency": "TWD"}]
        if "from assets where user_id" in q:
            return [{"ticker_symbol": "TSLA", "total_shares": 10,
                     "average_cost_basis": 200.0, "currency": "TWD",
                     "asset_type": "Stock", "interest_rate": None,
                     "maturity_date": None, "start_date": None, "created_at": None}]
        if "from portfolio_snapshots" in q:
            return []  # no prior snapshot
        return []

    inserted = {}

    def fake_update(db, query, params):
        inserted["params"] = params

    with mock.patch.object(wlf, "execute_query", side_effect=fake_query), \
         mock.patch.object(wlf, "execute_update", side_effect=fake_update), \
         mock.patch.object(wlf, "fetch_stock_price_with_fallback", return_value=None), \
         mock.patch.object(wlf, "_load_user_ledger", return_value=([], {}, "TWD")), \
         mock.patch.object(wlf, "compute_invested_asof", return_value=(2000.0, 1800.0)), \
         mock.patch.object(wlf, "compute_cumulative_dividends_asof", return_value=0.0):
        out = wlf.take_portfolio_snapshot(7, snapshot_date=datetime.date(2026, 7, 2))

    # Should not crash; total_value uses cost fallback (10 * 200 = 2000)
    assert out["total_value"] == 2000.0
    assert out["invest_value"] == 2000.0
    assert "params" in inserted  # UPSERT was called
