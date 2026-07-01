import datetime
from unittest import mock
import worthy_lambda_function as wlf


ASSET_META = {
    "AAPL": {"currency": "USD", "asset_type": "Stock"},
    "TSLA": {"currency": "USD", "asset_type": "Stock"},
}


def _txn(asset_id, ttype, date_val, shares, pps):
    return {
        "asset_id": asset_id,
        "transaction_type": ttype,
        "transaction_date": date_val,
        "shares": shares,
        "price_per_share": pps,
    }


class TestComputeCumulativeDividendsAsof:

    def test_dividends_on_or_before_asof_are_summed_after_excluded(self):
        """Dividends on/before asof included; dividend after asof excluded."""
        txns = [
            _txn("AAPL", "Dividend", datetime.date(2025, 1, 1), 5, 2.0),   # 10.0, before
            _txn("AAPL", "Dividend", datetime.date(2025, 6, 1), 3, 4.0),   # 12.0, on asof
            _txn("AAPL", "Dividend", datetime.date(2025, 7, 1), 10, 10.0), # 100.0, AFTER
        ]
        meta = {"AAPL": {"currency": "USD", "asset_type": "Stock"}}
        asof = datetime.date(2025, 6, 1)

        with mock.patch.object(wlf, "get_historical_fx_rate", return_value=1.0):
            result = wlf.compute_cumulative_dividends_asof(txns, meta, "USD", asof)

        assert result == 22.0  # 10.0 + 12.0, not 100.0

    def test_fx_applied_per_asset(self):
        """FX conversion is applied for each asset's currency."""
        txns = [
            _txn("AAPL", "Dividend", datetime.date(2025, 3, 1), 10, 1.0),  # USD: 10 * 1.0 = 10
            _txn("HKEX", "Dividend", datetime.date(2025, 3, 1), 20, 5.0),  # HKD: 100 * 0.13 = 13
        ]
        meta = {
            "AAPL": {"currency": "USD", "asset_type": "Stock"},
            "HKEX": {"currency": "HKD", "asset_type": "Stock"},
        }
        asof = datetime.date(2025, 3, 31)

        def fake_fx(from_cur, to_cur, on_date):
            if from_cur == "USD":
                return 1.0
            if from_cur == "HKD":
                return 0.13
            raise ValueError(f"Unexpected {from_cur}")

        with mock.patch.object(wlf, "get_historical_fx_rate", side_effect=fake_fx):
            result = wlf.compute_cumulative_dividends_asof(txns, meta, "USD", asof)

        assert abs(result - (10.0 + 13.0)) < 0.001

    def test_missing_asset_meta_skips_dividend(self):
        """If asset has no meta entry, the dividend is skipped (not counted)."""
        txns = [
            _txn("AAPL", "Dividend", datetime.date(2025, 1, 1), 10, 2.0),  # has meta -> 20
            _txn("UNKNOWN", "Dividend", datetime.date(2025, 1, 1), 50, 10.0),  # no meta -> skip
        ]
        meta = {"AAPL": {"currency": "USD", "asset_type": "Stock"}}
        asof = datetime.date(2025, 12, 31)

        with mock.patch.object(wlf, "get_historical_fx_rate", return_value=1.0):
            result = wlf.compute_cumulative_dividends_asof(txns, meta, "USD", asof)

        assert result == 20.0

    def test_non_dividend_transactions_ignored(self):
        """LumpSum, Sell, etc. are not counted as dividends."""
        txns = [
            _txn("AAPL", "LumpSum",  datetime.date(2025, 1, 1), 10, 100.0),
            _txn("AAPL", "Sell",     datetime.date(2025, 2, 1), 5, 110.0),
            _txn("AAPL", "Dividend", datetime.date(2025, 3, 1), 2, 3.0),   # only this: 6.0
        ]
        meta = {"AAPL": {"currency": "USD", "asset_type": "Stock"}}
        asof = datetime.date(2025, 12, 31)

        with mock.patch.object(wlf, "get_historical_fx_rate", return_value=1.0):
            result = wlf.compute_cumulative_dividends_asof(txns, meta, "USD", asof)

        assert result == 6.0

    def test_fx_failure_skips_dividend(self):
        """If FX lookup raises, the dividend is skipped (not counted)."""
        txns = [
            _txn("AAPL", "Dividend", datetime.date(2025, 1, 1), 10, 5.0),  # USD ok -> 50
            _txn("BAD",  "Dividend", datetime.date(2025, 1, 1), 10, 5.0),  # FX fails -> skip
        ]
        meta = {
            "AAPL": {"currency": "USD", "asset_type": "Stock"},
            "BAD":  {"currency": "XYZ", "asset_type": "Stock"},
        }
        asof = datetime.date(2025, 12, 31)

        def fake_fx(from_cur, to_cur, on_date):
            if from_cur == "USD":
                return 1.0
            raise RuntimeError("FX unavailable")

        with mock.patch.object(wlf, "get_historical_fx_rate", side_effect=fake_fx):
            result = wlf.compute_cumulative_dividends_asof(txns, meta, "USD", asof)

        assert result == 50.0
