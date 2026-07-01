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
