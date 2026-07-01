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
