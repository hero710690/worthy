import os
import json
import datetime
from unittest import mock
import pytest
import worthy_lambda_function as wlf

BACKUP = os.path.join(os.path.dirname(__file__), "..", "..",
                      "worthy-backup-20260511-181002.json")


def _load_bucky():
    if not os.path.exists(BACKUP):
        pytest.skip("Bucky backup fixture not present")
    with open(BACKUP) as f:
        d = json.load(f)
    uid = "21"
    assets = [a for a in d["assets"] if str(a["user_id"]) == uid]
    aids = {str(a["asset_id"]) for a in assets}
    txns = [{
        "asset_id": str(t["asset_id"]),
        "transaction_type": t["transaction_type"],
        "transaction_date": datetime.date.fromisoformat(str(t["transaction_date"])[:10]),
        "shares": float(t["shares"]),
        "price_per_share": float(t["price_per_share"]),
    } for t in d["transactions"] if str(t["asset_id"]) in aids]
    meta = {str(a["asset_id"]): {"currency": a["currency"],
                                 "asset_type": a["asset_type"]} for a in assets}
    return txns, meta


def _invest_only(txns, meta, on):
    # FX identity so we isolate cost-basis behavior (native amounts).
    with mock.patch.object(wlf, "get_historical_fx_rate", return_value=1.0):
        _, invest = wlf.compute_invested_asof(txns, meta, "TWD", on)
    return invest


def test_tqqq_partial_sell_reduces_invested():
    txns, meta = _load_bucky()
    before = _invest_only(txns, meta, datetime.date(2026, 4, 23))
    after = _invest_only(txns, meta, datetime.date(2026, 4, 24))  # TQQQ -50sh
    assert after < before, "invested should DROP after a partial sell"


def test_nvda_full_sell_removes_position():
    txns, meta = _load_bucky()
    # NVDA (asset 9201) fully sold 2026-02-09.
    before = _invest_only(txns, meta, datetime.date(2026, 2, 6))
    after = _invest_only(txns, meta, datetime.date(2026, 2, 9))
    assert after < before
