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
