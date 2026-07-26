import datetime
from unittest import mock
import worthy_lambda_function as wlf


def _tx(aid, ttype, d, sh, px):
    return {"asset_id": aid, "transaction_type": ttype,
            "transaction_date": datetime.date.fromisoformat(d),
            "shares": sh, "price_per_share": px}


def test_price_on_carry_forward():
    series = {datetime.date(2026, 7, 1): 50.0, datetime.date(2026, 7, 3): 60.0}
    assert wlf._price_on(series, datetime.date(2026, 7, 3)) == 60.0
    assert wlf._price_on(series, datetime.date(2026, 7, 2)) == 50.0   # carry forward
    assert wlf._price_on(series, datetime.date(2026, 6, 30)) is None
    assert wlf._price_on({}, datetime.date(2026, 7, 2)) is None


def test_value_is_quantity_times_close_times_fx():
    txns = [_tx("S", "LumpSum", "2026-06-01", 10, 90.0)]  # 10 shares held
    meta = {"S": {"currency": "USD", "asset_type": "Stock", "ticker_symbol": "AAA"}}
    price_map = {"AAA": {datetime.date(2026, 7, 2): 100.0}}
    with mock.patch.object(wlf, "get_historical_fx_rate", return_value=30.0):
        total, invest = wlf.compute_value_from_history(
            txns, meta, "TWD", datetime.date(2026, 7, 2), price_map=price_map)
    assert abs(total - 30000.0) < 1e-6   # 10 * 100 * 30
    assert abs(invest - 30000.0) < 1e-6


def test_value_uses_accumulated_quantity_after_a_sell():
    txns = [
        _tx("S", "LumpSum", "2026-06-01", 10, 90.0),
        _tx("S", "Sell", "2026-06-20", -4, 120.0),   # 6 shares remain
    ]
    meta = {"S": {"currency": "TWD", "asset_type": "Stock", "ticker_symbol": "AAA"}}
    price_map = {"AAA": {datetime.date(2026, 7, 2): 100.0}}
    with mock.patch.object(wlf, "get_historical_fx_rate", return_value=1.0):
        total, _ = wlf.compute_value_from_history(
            txns, meta, "TWD", datetime.date(2026, 7, 2), price_map=price_map)
    assert abs(total - 600.0) < 1e-6   # 6 * 100


def test_value_carries_forward_close_on_weekend():
    txns = [_tx("S", "LumpSum", "2026-06-01", 5, 90.0)]
    meta = {"S": {"currency": "TWD", "asset_type": "Stock", "ticker_symbol": "AAA"}}
    price_map = {"AAA": {datetime.date(2026, 7, 3): 50.0}}  # Fri; 7/4-7/5 weekend
    with mock.patch.object(wlf, "get_historical_fx_rate", return_value=1.0):
        total, _ = wlf.compute_value_from_history(
            txns, meta, "TWD", datetime.date(2026, 7, 5), price_map=price_map)
    assert abs(total - 250.0) < 1e-6   # carries forward Fri close: 5 * 50


def test_cash_valued_at_balance_not_investable():
    txns = [_tx("C", "Initialization", "2026-06-01", 1, 5000.0)]
    meta = {"C": {"currency": "TWD", "asset_type": "Cash", "ticker_symbol": None}}
    with mock.patch.object(wlf, "get_historical_fx_rate", return_value=1.0):
        total, invest = wlf.compute_value_from_history(
            txns, meta, "TWD", datetime.date(2026, 7, 2), price_map={})
    assert abs(total - 5000.0) < 1e-6
    assert invest == 0.0   # cash excluded from invest_value


def test_no_stored_close_contributes_zero_not_cost():
    txns = [_tx("S", "LumpSum", "2026-06-01", 10, 90.0)]
    meta = {"S": {"currency": "USD", "asset_type": "Stock", "ticker_symbol": "AAA"}}
    with mock.patch.object(wlf, "get_historical_fx_rate", return_value=1.0):
        total, invest = wlf.compute_value_from_history(
            txns, meta, "USD", datetime.date(2026, 7, 2), price_map={})
    assert total == 0.0 and invest == 0.0   # never falls back to cost basis
