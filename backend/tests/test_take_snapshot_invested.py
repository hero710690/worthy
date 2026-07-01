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
