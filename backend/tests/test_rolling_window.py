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
