"""Integration tests for payment webhook idempotency.

PayFast webhook: POST /api/v1/payments/webhook/payfast
  - Form-encoded body (application/x-www-form-urlencoded)
  - Signature: MD5 of sorted key=value pairs (no passphrase in sandbox/test)
  - Idempotency key: (gateway_transaction_id, gateway="payfast")

Yoco webhook: POST /api/v1/payments/yoco/webhook
  - JSON body + Yoco-Signature header
  - Signature: HMAC-SHA256 — skipped automatically when YOCO_WEBHOOK_SECRET is empty
  - Idempotency key: (gateway_transaction_id, gateway="yoco")
"""

import hashlib
import json
import urllib.parse
import pytest
from unittest.mock import patch

from app.database import SessionLocal
from app.models.payment_transaction import PaymentTransaction
from app.models.organization import Organization

pytestmark = pytest.mark.integration

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

PAYFAST_URL = "/api/v1/payments/webhook/payfast"
YOCO_URL = "/api/v1/payments/yoco/webhook"


def _payfast_signature(data: dict, passphrase: str = "") -> str:
    """Reproduce PayFastService.generate_signature() exactly."""
    param_string = ""
    for key in sorted(data.keys()):
        if key != "signature":
            param_string += f"{key}={urllib.parse.quote_plus(str(data[key]).strip())}&"
    param_string = param_string.rstrip("&")
    if passphrase:
        param_string += f"&passphrase={urllib.parse.quote_plus(passphrase.strip())}"
    return hashlib.md5(param_string.encode()).hexdigest()


def _payfast_payload(org_id: int, pf_payment_id: str, payment_status: str = "COMPLETE") -> dict:
    """Build a minimal PayFast ITN form payload with a valid signature."""
    data = {
        "merchant_id": "10000100",
        "merchant_key": "46f0cd694581a",
        "payment_status": payment_status,
        "pf_payment_id": pf_payment_id,
        "amount_gross": "29.00",
        "amount_fee": "1.16",
        "amount_net": "27.84",
        "item_name": "GuardianOS Subscription",
        "item_description": "Monthly subscription",
        "custom_str1": str(org_id),
        "custom_str2": "monthly",
        "custom_int1": str(org_id),
        "token": "sub_token_abc",
        "billing_date": "2026-03-08",
    }
    data["signature"] = _payfast_signature(data)
    return data


def _yoco_payload(org_id: int, checkout_id: str, event_type: str = "checkout.completed") -> dict:
    """Build a minimal Yoco webhook JSON payload."""
    return {
        "type": event_type,
        "payload": {
            "id": checkout_id,
            "status": "successful" if event_type == "checkout.completed" else event_type,
            "amount": 2900,        # cents — R29.00
            "currency": "ZAR",
            "paymentId": "pay_xyz_001",
            "createdDate": "2026-03-08T10:00:00Z",
            "metadata": {
                "org_id": org_id,
                "billing_period": "2026-03",
                "guard_count": 1,
                "payment_type": "subscription",
            },
        },
    }


def _get_test_org_id() -> int:
    """Return the org_id for the CI test organisation (CITEST01)."""
    session = SessionLocal()
    try:
        org = session.query(Organization).filter(Organization.org_code == "CITEST01").first()
        assert org is not None, "Test organisation CITEST01 not found — run ensure_test_user first"
        return org.org_id
    finally:
        session.close()


def _count_transactions(gateway: str, gateway_transaction_id: str) -> int:
    """Count PaymentTransaction rows matching the given gateway + transaction id."""
    session = SessionLocal()
    try:
        return (
            session.query(PaymentTransaction)
            .filter(
                PaymentTransaction.gateway == gateway,
                PaymentTransaction.gateway_transaction_id == gateway_transaction_id,
            )
            .count()
        )
    finally:
        session.close()


def _delete_transaction(gateway: str, gateway_transaction_id: str) -> None:
    """Remove test PaymentTransaction rows so tests are repeatable."""
    session = SessionLocal()
    try:
        session.query(PaymentTransaction).filter(
            PaymentTransaction.gateway == gateway,
            PaymentTransaction.gateway_transaction_id == gateway_transaction_id,
        ).delete(synchronize_session=False)
        session.commit()
    finally:
        session.close()


# ---------------------------------------------------------------------------
# PayFast webhook tests
# ---------------------------------------------------------------------------

class TestPayFastWebhook:
    """Tests for POST /api/v1/payments/webhook/payfast."""

    def test_payfast_webhook_valid_notification(self, client, ensure_test_user):
        """A valid PayFast ITN with payment_status=COMPLETE returns 200."""
        org_id = _get_test_org_id()
        pf_payment_id = "pf_test_valid_001"

        _delete_transaction("payfast", pf_payment_id)

        payload = _payfast_payload(org_id, pf_payment_id, payment_status="COMPLETE")

        with patch("app.services.payfast_service.PayFastService.verify_signature", return_value=True):
            try:
                response = client.post(PAYFAST_URL, data=payload)
                assert response.status_code == 200, response.text
                body = response.json()
                assert body["status"] == "success"
            finally:
                _delete_transaction("payfast", pf_payment_id)

    def test_payfast_webhook_duplicate_idempotent(self, client, ensure_test_user):
        """Sending the same PayFast ITN twice must not create duplicate transactions."""
        org_id = _get_test_org_id()
        pf_payment_id = "pf_test_idempotent_002"

        _delete_transaction("payfast", pf_payment_id)

        payload = _payfast_payload(org_id, pf_payment_id, payment_status="COMPLETE")

        with patch("app.services.payfast_service.PayFastService.verify_signature", return_value=True):
            try:
                r1 = client.post(PAYFAST_URL, data=payload)
                assert r1.status_code == 200, r1.text

                r2 = client.post(PAYFAST_URL, data=payload)
                assert r2.status_code == 200, r2.text
                body2 = r2.json()
                assert "already" in body2.get("message", "").lower()

                count = _count_transactions("payfast", pf_payment_id)
                assert count == 1, f"Expected 1 transaction, found {count}"
            finally:
                _delete_transaction("payfast", pf_payment_id)

    def test_payfast_webhook_invalid_signature(self, client, ensure_test_user):
        """A notification with a tampered signature must be rejected."""
        org_id = _get_test_org_id()
        pf_payment_id = "pf_test_badsig_003"

        _delete_transaction("payfast", pf_payment_id)

        payload = _payfast_payload(org_id, pf_payment_id, payment_status="COMPLETE")
        payload["signature"] = "00000000000000000000000000000000"

        with patch("app.services.payfast_service.PayFastService.verify_signature", return_value=False):
            try:
                response = client.post(PAYFAST_URL, data=payload)
                assert response.status_code in [400, 500], (
                    f"Expected 400/500 for bad signature, got {response.status_code}"
                )
            finally:
                _delete_transaction("payfast", pf_payment_id)

    def test_payfast_webhook_failed_payment(self, client, ensure_test_user):
        """A FAILED payment status creates a failed transaction record."""
        org_id = _get_test_org_id()
        pf_payment_id = "pf_test_failed_004"

        _delete_transaction("payfast", pf_payment_id)

        payload = _payfast_payload(org_id, pf_payment_id, payment_status="FAILED")

        with patch("app.services.payfast_service.PayFastService.verify_signature", return_value=True):
            try:
                response = client.post(PAYFAST_URL, data=payload)
                assert response.status_code == 200, response.text

                session = SessionLocal()
                try:
                    tx = (
                        session.query(PaymentTransaction)
                        .filter(
                            PaymentTransaction.gateway == "payfast",
                            PaymentTransaction.gateway_transaction_id == pf_payment_id,
                        )
                        .first()
                    )
                    assert tx is not None
                    assert tx.status == "failed"
                finally:
                    session.close()
            finally:
                _delete_transaction("payfast", pf_payment_id)

    def test_payfast_webhook_cancelled_payment(self, client, ensure_test_user):
        """A CANCELLED subscription status creates a cancelled transaction record."""
        org_id = _get_test_org_id()
        pf_payment_id = "pf_test_cancelled_005"

        _delete_transaction("payfast", pf_payment_id)

        payload = _payfast_payload(org_id, pf_payment_id, payment_status="CANCELLED")

        with patch("app.services.payfast_service.PayFastService.verify_signature", return_value=True):
            try:
                response = client.post(PAYFAST_URL, data=payload)
                assert response.status_code == 200, response.text

                session = SessionLocal()
                try:
                    tx = (
                        session.query(PaymentTransaction)
                        .filter(
                            PaymentTransaction.gateway == "payfast",
                            PaymentTransaction.gateway_transaction_id == pf_payment_id,
                        )
                        .first()
                    )
                    assert tx is not None
                    assert tx.status == "cancelled"
                finally:
                    session.close()
            finally:
                _delete_transaction("payfast", pf_payment_id)


# ---------------------------------------------------------------------------
# Yoco webhook tests
# ---------------------------------------------------------------------------

class TestYocoWebhook:
    """Tests for POST /api/v1/payments/yoco/webhook.

    Signature verification is bypassed automatically when YOCO_WEBHOOK_SECRET
    is empty (the service returns True in that branch), which is the case in
    the test environment.  If a secret IS configured, tests use
    unittest.mock.patch to bypass verification so they stay focused on
    business logic rather than crypto.
    """

    def _post_yoco(self, client, payload: dict, signature: str = "test-sig") -> object:
        """POST a Yoco webhook event with the given JSON payload."""
        return client.post(
            YOCO_URL,
            content=json.dumps(payload),
            headers={
                "Content-Type": "application/json",
                "Yoco-Signature": signature,
            },
        )

    def test_yoco_webhook_valid_event(self, client, ensure_test_user):
        """A valid checkout.completed event returns 200 and records the transaction."""
        org_id = _get_test_org_id()
        checkout_id = "yoco_test_valid_001"

        _delete_transaction("yoco", checkout_id)

        payload = _yoco_payload(org_id, checkout_id, event_type="checkout.completed")

        with patch(
            "app.services.yoco_service.YocoService.verify_webhook_signature",
            return_value=True,
        ):
            try:
                response = self._post_yoco(client, payload)
                assert response.status_code == 200, response.text
                body = response.json()
                assert body["status"] == "success"
                assert body["event_type"] == "checkout.completed"
                assert body["org_id"] == org_id
            finally:
                _delete_transaction("yoco", checkout_id)

    def test_yoco_webhook_duplicate_idempotent(self, client, ensure_test_user):
        """Sending the same Yoco event twice must not create duplicate transactions."""
        org_id = _get_test_org_id()
        checkout_id = "yoco_test_idempotent_002"

        _delete_transaction("yoco", checkout_id)

        payload = _yoco_payload(org_id, checkout_id, event_type="checkout.completed")

        with patch(
            "app.services.yoco_service.YocoService.verify_webhook_signature",
            return_value=True,
        ):
            try:
                # First call — creates the transaction
                r1 = self._post_yoco(client, payload)
                assert r1.status_code == 200, r1.text

                # Second call — already processed
                r2 = self._post_yoco(client, payload)
                assert r2.status_code == 200, r2.text
                body2 = r2.json()
                assert body2["status"] == "success"
                assert "already" in body2.get("message", "").lower()

                # Exactly one transaction row
                count = _count_transactions("yoco", checkout_id)
                assert count == 1, f"Expected 1 transaction, found {count}"
            finally:
                _delete_transaction("yoco", checkout_id)

    def test_yoco_webhook_unknown_event(self, client, ensure_test_user):
        """An unknown event type is handled gracefully — returns 200, no crash."""
        org_id = _get_test_org_id()
        checkout_id = "yoco_test_unknown_003"

        _delete_transaction("yoco", checkout_id)

        # Use an event type not handled by any branch (not checkout.completed /
        # checkout.expired / refund.completed).  The endpoint should still
        # commit successfully (no rows written for unknown events is fine) and
        # not raise a 500.
        payload = _yoco_payload(org_id, checkout_id, event_type="payment.unknown")

        with patch(
            "app.services.yoco_service.YocoService.verify_webhook_signature",
            return_value=True,
        ):
            try:
                response = self._post_yoco(client, payload)
                assert response.status_code == 200, (
                    f"Unknown event type should be handled gracefully, got {response.status_code}: {response.text}"
                )
            finally:
                _delete_transaction("yoco", checkout_id)

    def test_yoco_webhook_invalid_signature(self, client, ensure_test_user):
        """A request with a bad signature is rejected with 400."""
        org_id = _get_test_org_id()
        checkout_id = "yoco_test_badsig_004"

        _delete_transaction("yoco", checkout_id)

        payload = _yoco_payload(org_id, checkout_id, event_type="checkout.completed")

        with patch(
            "app.services.yoco_service.YocoService.verify_webhook_signature",
            return_value=False,
        ):
            try:
                response = self._post_yoco(client, payload, signature="invalid-sig")
                assert response.status_code == 400, (
                    f"Expected 400 for bad Yoco signature, got {response.status_code}: {response.text}"
                )
            finally:
                _delete_transaction("yoco", checkout_id)

    def test_yoco_webhook_checkout_expired(self, client, ensure_test_user):
        """A checkout.expired event is recorded as an expired transaction."""
        org_id = _get_test_org_id()
        checkout_id = "yoco_test_expired_005"

        _delete_transaction("yoco", checkout_id)

        payload = _yoco_payload(org_id, checkout_id, event_type="checkout.expired")

        with patch(
            "app.services.yoco_service.YocoService.verify_webhook_signature",
            return_value=True,
        ):
            try:
                response = self._post_yoco(client, payload)
                assert response.status_code == 200, response.text

                session = SessionLocal()
                try:
                    tx = (
                        session.query(PaymentTransaction)
                        .filter(
                            PaymentTransaction.gateway == "yoco",
                            PaymentTransaction.gateway_transaction_id == checkout_id,
                        )
                        .first()
                    )
                    assert tx is not None
                    assert tx.status == "expired"
                finally:
                    session.close()
            finally:
                _delete_transaction("yoco", checkout_id)

    def test_yoco_webhook_missing_org_id(self, client, ensure_test_user):
        """A webhook with no org_id in metadata is ignored gracefully (200, ignored)."""
        # Build payload with org_id omitted from metadata
        payload = {
            "type": "checkout.completed",
            "payload": {
                "id": "yoco_test_no_org_006",
                "status": "successful",
                "amount": 2900,
                "currency": "ZAR",
                "metadata": {},  # No org_id
            },
        }

        with patch(
            "app.services.yoco_service.YocoService.verify_webhook_signature",
            return_value=True,
        ):
            response = self._post_yoco(client, payload)
            # Should return 200 with "ignored" status, not crash
            assert response.status_code == 200, response.text
            body = response.json()
            assert body["status"] in ("ignored", "error"), (
                f"Expected 'ignored' or 'error' for missing org_id, got: {body}"
            )

    def test_yoco_webhook_invalid_json(self, client, ensure_test_user):
        """Malformed JSON body returns 400."""
        response = client.post(
            YOCO_URL,
            content=b"not-valid-json{{{",
            headers={
                "Content-Type": "application/json",
                "Yoco-Signature": "test-sig",
            },
        )
        # The endpoint catches JSONDecodeError and raises 400
        assert response.status_code == 400, (
            f"Malformed JSON should return 400, got {response.status_code}"
        )
