from unittest import mock
import worthy_lambda_function as wlf


class _Resp:
    def __init__(self, status_code):
        self.status_code = status_code


def test_egress_ready_first_attempt_no_sleep():
    """Warm instance: canary succeeds immediately, no sleep, returns True."""
    with mock.patch.object(wlf.requests, "get", return_value=_Resp(200)) as get, \
         mock.patch("time.sleep") as sleep:
        ok = wlf.wait_for_egress_ready()
    assert ok is True
    assert get.call_count == 1
    sleep.assert_not_called()


def test_egress_retries_until_ready():
    """Cold instance: first two attempts raise (network unreachable), third succeeds."""
    calls = {"n": 0}

    def flaky_get(*a, **k):
        calls["n"] += 1
        if calls["n"] < 3:
            raise OSError("[Errno 101] Network is unreachable")
        return _Resp(200)

    with mock.patch.object(wlf.requests, "get", side_effect=flaky_get), \
         mock.patch("time.sleep") as sleep:
        ok = wlf.wait_for_egress_ready(max_attempts=5, delay_seconds=1)
    assert ok is True
    assert calls["n"] == 3
    assert sleep.call_count == 2  # slept after attempts 1 and 2


def test_egress_gives_up_after_max_attempts():
    """Egress never recovers: returns False after exhausting attempts (no crash)."""
    with mock.patch.object(wlf.requests, "get", side_effect=OSError("unreachable")), \
         mock.patch("time.sleep"):
        ok = wlf.wait_for_egress_ready(max_attempts=3, delay_seconds=1)
    assert ok is False
