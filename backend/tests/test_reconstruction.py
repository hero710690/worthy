import datetime
from worthy_lambda_function import reconstruct_holdings_asof


def _tx(asset_id, ttype, date, shares, price):
    return {
        "asset_id": asset_id,
        "transaction_type": ttype,
        "transaction_date": datetime.date.fromisoformat(date),
        "shares": shares,
        "price_per_share": price,
    }


def test_buys_accumulate_average_cost():
    txns = [
        _tx("A", "LumpSum", "2025-01-01", 10, 100.0),
        _tx("A", "LumpSum", "2025-02-01", 10, 200.0),
    ]
    result = reconstruct_holdings_asof(txns, datetime.date(2025, 3, 1))
    assert result["A"]["shares"] == 20
    assert result["A"]["avg_cost"] == 150.0  # (10*100 + 10*200) / 20


def test_partial_sell_keeps_avg_cost():
    txns = [
        _tx("A", "LumpSum", "2025-01-01", 10, 100.0),
        _tx("A", "Sell", "2025-02-01", -4, 250.0),
    ]
    result = reconstruct_holdings_asof(txns, datetime.date(2025, 3, 1))
    assert result["A"]["shares"] == 6
    assert result["A"]["avg_cost"] == 100.0  # unchanged by sell


def test_full_sell_removes_asset():
    txns = [
        _tx("A", "LumpSum", "2025-01-01", 10, 100.0),
        _tx("A", "Sell", "2025-02-01", -10, 250.0),
    ]
    result = reconstruct_holdings_asof(txns, datetime.date(2025, 3, 1))
    assert "A" not in result


def test_dividend_ignored_for_invested():
    txns = [
        _tx("A", "LumpSum", "2025-01-01", 10, 100.0),
        _tx("A", "Dividend", "2025-02-01", 5, 3.0),
    ]
    result = reconstruct_holdings_asof(txns, datetime.date(2025, 3, 1))
    assert result["A"]["shares"] == 10
    assert result["A"]["avg_cost"] == 100.0


def test_asof_excludes_future_transactions():
    txns = [
        _tx("A", "LumpSum", "2025-01-01", 10, 100.0),
        _tx("A", "LumpSum", "2025-06-01", 10, 200.0),
    ]
    result = reconstruct_holdings_asof(txns, datetime.date(2025, 3, 1))
    assert result["A"]["shares"] == 10
    assert result["A"]["avg_cost"] == 100.0


def test_iso_string_dates_supported():
    txns = [
        {"asset_id": "A", "transaction_type": "LumpSum",
         "transaction_date": "2025-01-01", "shares": 10, "price_per_share": 100.0},
    ]
    result = reconstruct_holdings_asof(txns, datetime.date(2025, 3, 1))
    assert result["A"]["shares"] == 10
