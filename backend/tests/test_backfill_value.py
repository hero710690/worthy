import datetime
from unittest import mock
import worthy_lambda_function as wlf


def test_price_on_exact_and_carry_forward():
    series = {
        datetime.date(2026, 7, 1): 100.0,
        datetime.date(2026, 7, 3): 110.0,
    }
    # exact
    assert wlf._price_on(series, datetime.date(2026, 7, 3)) == 110.0
    # carry forward (7/2 -> most recent prior = 7/1)
    assert wlf._price_on(series, datetime.date(2026, 7, 2)) == 100.0
    # before any data -> None
    assert wlf._price_on(series, datetime.date(2026, 6, 30)) is None
    # empty
    assert wlf._price_on({}, datetime.date(2026, 7, 2)) is None


def test_value_backfill_uses_historical_price_and_updates():
    """A stock's value comes from the historical price series, not carry-forward or cost."""
    txns = [{"asset_id": "S", "transaction_type": "LumpSum",
             "transaction_date": datetime.date(2026, 6, 1),
             "shares": 10, "price_per_share": 90.0}]
    meta = {"S": {"currency": "TWD", "asset_type": "Stock", "ticker_symbol": "0050.TW"}}

    updates = []

    def fake_query(db, query, params=None):
        q = query.lower()
        if "distinct user_id from portfolio_snapshots" in q:
            return [{"user_id": 7}]
        if "snapshot_date from portfolio_snapshots" in q:
            return [{"snapshot_date": "2026-07-02"}, {"snapshot_date": "2026-07-03"}]
        return []

    def fake_update(db, query, params):
        updates.append(params)

    series = {datetime.date(2026, 7, 2): 101.0, datetime.date(2026, 7, 3): 105.0}

    with mock.patch.object(wlf, "wait_for_egress_ready", return_value=True), \
         mock.patch.object(wlf, "execute_query", side_effect=fake_query), \
         mock.patch.object(wlf, "execute_update", side_effect=fake_update), \
         mock.patch.object(wlf, "_load_user_ledger", return_value=(txns, meta, "TWD")), \
         mock.patch.object(wlf, "_fetch_yahoo_price_series", return_value=series), \
         mock.patch.object(wlf, "get_historical_fx_rate", return_value=1.0):
        resp = wlf.handle_backfill_snapshot_value(
            {"start_date": "2026-07-02", "end_date": "2026-07-03"})

    assert resp["statusCode"] == 200
    assert len(updates) == 2
    # 7/02: 10 shares * 101.0 = 1010 ; 7/03: 10 * 105.0 = 1050
    # UPDATE params: (total_value, invest_value, user_id, snapshot_date)
    by_date = {p[3]: p for p in updates}
    assert abs(float(by_date["2026-07-02"][0]) - 1010.0) < 1e-6
    assert abs(float(by_date["2026-07-02"][1]) - 1010.0) < 1e-6
    assert abs(float(by_date["2026-07-03"][0]) - 1050.0) < 1e-6


def test_value_backfill_requires_dates():
    resp = wlf.handle_backfill_snapshot_value({"user_id": 7})
    assert resp["statusCode"] == 400
