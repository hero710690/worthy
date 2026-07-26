import datetime
from unittest import mock
import worthy_lambda_function as wlf


def test_value_backfill_populates_then_updates_from_stored_prices():
    updates = []

    def fake_query(db, query, params=None):
        q = query.lower()
        if "distinct ticker_symbol" in q:
            return [{"ticker_symbol": "AAA", "currency": "USD"}]
        if "snapshot_date from portfolio_snapshots" in q:
            return [{"snapshot_date": "2026-07-02"}, {"snapshot_date": "2026-07-03"}]
        return []

    with mock.patch.object(wlf, "wait_for_egress_ready", return_value=True), \
         mock.patch.object(wlf, "execute_query", side_effect=fake_query), \
         mock.patch.object(wlf, "execute_update", side_effect=lambda *a: updates.append(a)), \
         mock.patch.object(wlf, "populate_price_history", return_value=42) as pop, \
         mock.patch.object(wlf, "_load_user_ledger", return_value=([], {}, "TWD")), \
         mock.patch.object(wlf, "_load_price_history", return_value={"AAA": {}}), \
         mock.patch.object(wlf, "compute_value_from_history",
                           side_effect=[(1000.0, 900.0), (1100.0, 950.0)]):
        resp = wlf.handle_backfill_snapshot_value(
            {"user_id": 7, "start_date": "2026-07-02", "end_date": "2026-07-03"})

    assert resp["statusCode"] == 200
    # prices populated once before per-date compute
    pop.assert_called_once()
    assert len(updates) == 2
    # execute_update(db, query, params) ; params=(total, invest, uid, date)
    assert float(updates[0][2][0]) == 1000.0
    assert float(updates[1][2][0]) == 1100.0


def test_value_backfill_requires_dates():
    resp = wlf.handle_backfill_snapshot_value({"user_id": 7})
    assert resp["statusCode"] == 400
