import datetime
from unittest import mock
import worthy_lambda_function as wlf


def test_take_snapshot_uses_ledger_and_stored_price_history():
    """take_portfolio_snapshot computes value from stored prices and invested
    from the ledger, then upserts. All sources are mocked."""
    meta = {"S": {"currency": "USD", "asset_type": "Stock", "ticker_symbol": "QQQ"}}
    captured = {}

    def fake_update(db, query, params):
        captured["params"] = params

    with mock.patch.object(wlf, "execute_update", side_effect=fake_update), \
         mock.patch.object(wlf, "_load_user_ledger", return_value=([], meta, "TWD")), \
         mock.patch.object(wlf, "populate_price_history", return_value=1), \
         mock.patch.object(wlf, "populate_fx_history", return_value=1), \
         mock.patch.object(wlf, "compute_value_from_history", return_value=(36000.0, 30000.0)), \
         mock.patch.object(wlf, "compute_cumulative_dividends_asof", return_value=100.0), \
         mock.patch.object(wlf, "compute_invested_asof", return_value=(9999.0, 8888.0)), \
         mock.patch.object(wlf, "reconstruct_holdings_asof", return_value={"S": {"shares": 10, "avg_cost": 90}}):
        out = wlf.take_portfolio_snapshot("21", snapshot_date=datetime.date(2026, 5, 1))

    assert out["total_value"] == 36000.0
    assert out["invest_value"] == 30000.0
    assert out["total_invested"] == 9999.0
    assert out["invest_invested"] == 8888.0
    assert out["cumulative_dividends"] == 100.0
    assert out["asset_count"] == 1
    # UPSERT columns: (user_id, date, total_value, total_invested, base_currency,
    #                  asset_count, invest_value, invest_invested, cumulative_dividends)
    p = captured["params"]
    assert p[2] == 36000.0 and p[3] == 9999.0 and p[6] == 30000.0
