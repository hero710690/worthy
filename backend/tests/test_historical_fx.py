import datetime
from unittest import mock
import pytest
import worthy_lambda_function as wlf


@pytest.fixture(autouse=True)
def clear_fx_cache():
    """Clear the exchange rate cache before each test to prevent cross-test pollution."""
    wlf.exchange_rate_cache.clear()
    yield
    wlf.exchange_rate_cache.clear()


def test_same_currency_returns_one():
    assert wlf.get_historical_fx_rate("TWD", "TWD", datetime.date(2025, 2, 10)) == 1.0


def test_usd_to_twd_uses_yahoo_close():
    # Yahoo TWD=X quotes USD->TWD directly.
    fake = {
        "chart": {"result": [{
            "timestamp": [int(datetime.datetime(2025, 2, 10).timestamp())],
            "indicators": {"quote": [{"close": [32.8]}]},
        }]}
    }
    with mock.patch.object(wlf, "_fetch_yahoo_fx_series", return_value={datetime.date(2025, 2, 10): 32.8}):
        rate = wlf.get_historical_fx_rate("USD", "TWD", datetime.date(2025, 2, 10))
    assert abs(rate - 32.8) < 1e-6


def test_carry_forward_on_missing_date():
    series = {datetime.date(2025, 2, 7): 32.5}  # Friday; query for Sunday
    with mock.patch.object(wlf, "_fetch_yahoo_fx_series", return_value=series):
        rate = wlf.get_historical_fx_rate("USD", "TWD", datetime.date(2025, 2, 9))
    assert abs(rate - 32.5) < 1e-6


def test_weekend_fx_uses_friday_not_sunday_bar():
    # Yahoo forex has a Sunday bar (32.9); a Sunday value snapshot must still use
    # Friday's rate (32.5) to stay aligned with the Friday stock-close carry-forward.
    series = {
        datetime.date(2026, 7, 3): 32.5,   # Friday
        datetime.date(2026, 7, 5): 32.9,   # Sunday (forex bar)
    }
    with mock.patch.object(wlf, "_fetch_yahoo_fx_series", return_value=series):
        sat = wlf.get_historical_fx_rate("USD", "TWD", datetime.date(2026, 7, 4))
        sun = wlf.get_historical_fx_rate("USD", "TWD", datetime.date(2026, 7, 5))
    assert abs(sat - 32.5) < 1e-6
    assert abs(sun - 32.5) < 1e-6   # Sunday uses Friday, not the Sunday bar
    assert sat == sun               # weekend stays flat


def test_cross_via_usd():
    # from=JPY to=TWD: rate = (USD->TWD) / (USD->JPY)
    def fake_series(pair_currency, start, end):
        return {
            "TWD": {datetime.date(2025, 2, 10): 32.0},
            "JPY": {datetime.date(2025, 2, 10): 150.0},
        }[pair_currency]
    with mock.patch.object(wlf, "_fetch_yahoo_fx_series", side_effect=lambda c, s, e: fake_series(c, s, e)):
        rate = wlf.get_historical_fx_rate("JPY", "TWD", datetime.date(2025, 2, 10))
    assert abs(rate - (32.0 / 150.0)) < 1e-6


def test_spot_fallback_on_failure():
    with mock.patch.object(wlf, "_fetch_yahoo_fx_series", side_effect=Exception("network")), \
         mock.patch.object(wlf, "convert_currency_amount", return_value=30.0) as spot:
        rate = wlf.get_historical_fx_rate("USD", "TWD", datetime.date(2025, 2, 10))
    assert rate == 30.0
    spot.assert_called_once()


def test_usd_rate_reads_from_fx_history_db():
    """When fx_history has a stored rate, _usd_rate_on reads it (no Yahoo fetch)."""
    def fake_query(db, query, params=None):
        if "from fx_history" in query.lower():
            return [{"usd_rate": 31.55}]
        return []
    with mock.patch.object(wlf, "execute_query", side_effect=fake_query), \
         mock.patch.object(wlf, "_fetch_yahoo_fx_series", side_effect=AssertionError("should not fetch")):
        rate = wlf.get_historical_fx_rate("USD", "TWD", datetime.date(2026, 7, 10))
    assert abs(rate - 31.55) < 1e-6
