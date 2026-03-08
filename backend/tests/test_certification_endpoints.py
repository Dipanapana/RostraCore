"""Integration tests for certification endpoints."""

import uuid
import pytest
from datetime import date, timedelta

from app.database import SessionLocal
from app.models.employee import Employee, EmployeeStatus

pytestmark = pytest.mark.integration


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _create_employee(client, auth_headers, test_org) -> int:
    """Create a minimal employee and return its employee_id.

    Used as a prerequisite for certification tests that need a valid
    employee scoped to the test organisation.
    """
    unique = uuid.uuid4().hex[:8]
    resp = client.post(
        "/api/v1/employees/",
        json={
            "first_name": "Cert",
            "last_name": f"Worker{unique}",
            "email": f"cert.worker.{unique}@test.com",
            "id_number": f"800101{unique[:7]}",
            "gender": "male",
            "role": "armed",
            "pay_type": "hourly",
            "hourly_rate": 50.0,
            "org_id": test_org.org_id,
        },
        headers=auth_headers,
    )
    assert resp.status_code in [200, 201], (
        f"Pre-condition failed: could not create employee. Response: {resp.text}"
    )
    return resp.json()["employee_id"]


def _cert_payload(employee_id: int, *, offset_days: int = 365) -> dict:
    """Return a valid CertificationCreate payload."""
    today = date.today()
    return {
        "employee_id": employee_id,
        "cert_type": "PSIRA Registration",
        "issue_date": today.isoformat(),
        "expiry_date": (today + timedelta(days=offset_days)).isoformat(),
        "verified": True,
        "cert_number": f"PSR-{uuid.uuid4().hex[:8].upper()}",
        "issuing_authority": "PSIRA",
    }


# ---------------------------------------------------------------------------
# TestCertificationList
# ---------------------------------------------------------------------------

class TestCertificationList:
    """Tests for GET /api/v1/certifications/"""

    def test_list_certifications(self, client, auth_headers):
        """Authenticated request returns HTTP 200 and a list."""
        response = client.get("/api/v1/certifications/", headers=auth_headers)
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_list_certifications_no_auth(self, client):
        """Unauthenticated request must be rejected with 401 or 403."""
        response = client.get("/api/v1/certifications/")
        assert response.status_code in [401, 403]

    def test_list_certifications_filter_by_employee(
        self, client, auth_headers, test_org
    ):
        """employee_id query param scopes results to a single employee."""
        emp_id = _create_employee(client, auth_headers, test_org)

        # Create a cert for that employee
        client.post(
            "/api/v1/certifications/",
            json=_cert_payload(emp_id),
            headers=auth_headers,
        )

        response = client.get(
            f"/api/v1/certifications/?employee_id={emp_id}",
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        for cert in data:
            assert cert["employee_id"] == emp_id


# ---------------------------------------------------------------------------
# TestComplianceDashboard
# ---------------------------------------------------------------------------

class TestComplianceDashboard:
    """Tests for GET /api/v1/certifications/compliance-dashboard"""

    def test_compliance_dashboard(self, client, auth_headers):
        """Endpoint returns 200 with all expected top-level keys."""
        response = client.get(
            "/api/v1/certifications/compliance-dashboard", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()

        expected_keys = {
            "total_active_employees",
            "psira_summary",
            "firearm_summary",
            "certification_summary",
            "expiry_alerts",
            "employees_without_certs",
        }
        assert expected_keys.issubset(data.keys()), (
            f"Missing keys: {expected_keys - data.keys()}"
        )

    def test_compliance_dashboard_no_auth(self, client):
        """Unauthenticated request must be rejected."""
        response = client.get("/api/v1/certifications/compliance-dashboard")
        assert response.status_code in [401, 403]

    def test_compliance_dashboard_psira_summary_structure(
        self, client, auth_headers
    ):
        """psira_summary contains the required numeric fields."""
        response = client.get(
            "/api/v1/certifications/compliance-dashboard", headers=auth_headers
        )
        assert response.status_code == 200
        psira = response.json()["psira_summary"]
        for key in ("total_psira_certs", "valid", "expired", "expiring_30_days"):
            assert key in psira, f"psira_summary missing key: {key}"

    def test_compliance_dashboard_cert_summary_compliance_rate(
        self, client, auth_headers
    ):
        """certification_summary.compliance_rate is a number between 0 and 100."""
        response = client.get(
            "/api/v1/certifications/compliance-dashboard", headers=auth_headers
        )
        assert response.status_code == 200
        rate = response.json()["certification_summary"].get("compliance_rate", -1)
        assert 0 <= rate <= 100, f"compliance_rate out of range: {rate}"


# ---------------------------------------------------------------------------
# TestCertificationCreate
# ---------------------------------------------------------------------------

class TestCertificationCreate:
    """Tests for POST /api/v1/certifications/"""

    def test_create_certification(self, client, auth_headers, test_org):
        """Valid payload returns 201 with the persisted certification."""
        emp_id = _create_employee(client, auth_headers, test_org)
        payload = _cert_payload(emp_id)

        response = client.post(
            "/api/v1/certifications/",
            json=payload,
            headers=auth_headers,
        )
        assert response.status_code == 201
        data = response.json()
        assert data["employee_id"] == emp_id
        assert data["cert_type"] == payload["cert_type"]
        assert "cert_id" in data

    def test_create_certification_invalid_dates(self, client, auth_headers, test_org):
        """Expiry date before or equal to issue date should return 400."""
        emp_id = _create_employee(client, auth_headers, test_org)
        today = date.today()
        payload = {
            "employee_id": emp_id,
            "cert_type": "Bad Dates Cert",
            "issue_date": today.isoformat(),
            # expiry_date is same as issue_date — endpoint rejects this
            "expiry_date": today.isoformat(),
            "verified": False,
        }

        response = client.post(
            "/api/v1/certifications/",
            json=payload,
            headers=auth_headers,
        )
        assert response.status_code == 400

    def test_create_certification_expiry_before_issue(
        self, client, auth_headers, test_org
    ):
        """Expiry date strictly before issue date should also return 400."""
        emp_id = _create_employee(client, auth_headers, test_org)
        today = date.today()
        payload = {
            "employee_id": emp_id,
            "cert_type": "Reversed Dates Cert",
            "issue_date": today.isoformat(),
            "expiry_date": (today - timedelta(days=1)).isoformat(),
            "verified": False,
        }

        response = client.post(
            "/api/v1/certifications/",
            json=payload,
            headers=auth_headers,
        )
        assert response.status_code == 400

    def test_create_certification_unknown_employee(self, client, auth_headers):
        """Creating a cert for a non-existent employee should return 404."""
        today = date.today()
        response = client.post(
            "/api/v1/certifications/",
            json={
                "employee_id": 999999999,
                "cert_type": "Ghost Cert",
                "issue_date": today.isoformat(),
                "expiry_date": (today + timedelta(days=365)).isoformat(),
                "verified": False,
            },
            headers=auth_headers,
        )
        assert response.status_code == 404

    def test_create_certification_no_auth(self, client, test_org):
        """Unauthenticated POST must be rejected."""
        today = date.today()
        response = client.post(
            "/api/v1/certifications/",
            json={
                "employee_id": 1,
                "cert_type": "No Auth Cert",
                "issue_date": today.isoformat(),
                "expiry_date": (today + timedelta(days=365)).isoformat(),
                "verified": False,
            },
        )
        assert response.status_code in [401, 403]

    def test_create_certification_missing_required_fields(
        self, client, auth_headers
    ):
        """POST without required fields should return 422 Unprocessable Entity."""
        response = client.post(
            "/api/v1/certifications/",
            json={"cert_type": "Incomplete"},
            headers=auth_headers,
        )
        assert response.status_code in [400, 422]


# ---------------------------------------------------------------------------
# TestCertificationGetById
# ---------------------------------------------------------------------------

class TestCertificationGetById:
    """Tests for GET /api/v1/certifications/{cert_id}"""

    def test_get_certification_by_id(self, client, auth_headers, test_org):
        """Retrieve a previously created certification by its primary key."""
        emp_id = _create_employee(client, auth_headers, test_org)
        create_resp = client.post(
            "/api/v1/certifications/",
            json=_cert_payload(emp_id),
            headers=auth_headers,
        )
        assert create_resp.status_code == 201
        cert_id = create_resp.json()["cert_id"]

        get_resp = client.get(
            f"/api/v1/certifications/{cert_id}", headers=auth_headers
        )
        assert get_resp.status_code == 200
        assert get_resp.json()["cert_id"] == cert_id

    def test_get_nonexistent_certification_returns_404(
        self, client, auth_headers
    ):
        """Requesting a cert_id that does not exist should return 404."""
        response = client.get(
            "/api/v1/certifications/999999999", headers=auth_headers
        )
        assert response.status_code == 404


# ---------------------------------------------------------------------------
# TestCertificationUpdate
# ---------------------------------------------------------------------------

class TestCertificationUpdate:
    """Tests for PUT /api/v1/certifications/{cert_id}"""

    def test_update_certification_verified_flag(
        self, client, auth_headers, test_org
    ):
        """Toggle the verified flag from False to True."""
        emp_id = _create_employee(client, auth_headers, test_org)
        payload = _cert_payload(emp_id)
        payload["verified"] = False

        create_resp = client.post(
            "/api/v1/certifications/",
            json=payload,
            headers=auth_headers,
        )
        assert create_resp.status_code == 201
        cert_id = create_resp.json()["cert_id"]

        update_resp = client.put(
            f"/api/v1/certifications/{cert_id}",
            json={"verified": True},
            headers=auth_headers,
        )
        assert update_resp.status_code == 200
        assert update_resp.json()["verified"] is True

    def test_update_certification_invalid_dates(
        self, client, auth_headers, test_org
    ):
        """Updating to an expiry_date before existing issue_date must return 400."""
        emp_id = _create_employee(client, auth_headers, test_org)
        today = date.today()
        create_resp = client.post(
            "/api/v1/certifications/",
            json=_cert_payload(emp_id),
            headers=auth_headers,
        )
        assert create_resp.status_code == 201
        cert_id = create_resp.json()["cert_id"]

        # Set expiry before today (which is the issue_date)
        update_resp = client.put(
            f"/api/v1/certifications/{cert_id}",
            json={"expiry_date": (today - timedelta(days=10)).isoformat()},
            headers=auth_headers,
        )
        assert update_resp.status_code == 400


# ---------------------------------------------------------------------------
# TestCertificationDelete
# ---------------------------------------------------------------------------

class TestCertificationDelete:
    """Tests for DELETE /api/v1/certifications/{cert_id}"""

    def test_delete_certification(self, client, auth_headers, test_org):
        """Deleting an existing cert returns a success message and subsequent GET is 404."""
        emp_id = _create_employee(client, auth_headers, test_org)
        create_resp = client.post(
            "/api/v1/certifications/",
            json=_cert_payload(emp_id),
            headers=auth_headers,
        )
        assert create_resp.status_code == 201
        cert_id = create_resp.json()["cert_id"]

        delete_resp = client.delete(
            f"/api/v1/certifications/{cert_id}", headers=auth_headers
        )
        assert delete_resp.status_code == 200
        assert "deleted" in delete_resp.json().get("message", "").lower()

        # Confirm it is gone
        get_resp = client.get(
            f"/api/v1/certifications/{cert_id}", headers=auth_headers
        )
        assert get_resp.status_code == 404

    def test_delete_nonexistent_certification_returns_404(
        self, client, auth_headers
    ):
        """Deleting a cert that does not exist should return 404."""
        response = client.delete(
            "/api/v1/certifications/999999999", headers=auth_headers
        )
        assert response.status_code == 404


# ---------------------------------------------------------------------------
# TestExpiringCertifications
# ---------------------------------------------------------------------------

class TestExpiringCertifications:
    """Tests for GET /api/v1/certifications/expiring"""

    def test_expiring_certifications_endpoint(self, client, auth_headers):
        """Endpoint returns 200 and a list."""
        response = client.get(
            "/api/v1/certifications/expiring", headers=auth_headers
        )
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_expiring_certifications_within_window(
        self, client, auth_headers, test_org
    ):
        """A cert expiring in 15 days appears in ?days=30 but not in ?days=7."""
        emp_id = _create_employee(client, auth_headers, test_org)
        today = date.today()
        payload = {
            "employee_id": emp_id,
            "cert_type": "Expiry Window Test",
            "issue_date": (today - timedelta(days=30)).isoformat(),
            "expiry_date": (today + timedelta(days=15)).isoformat(),
            "verified": True,
        }
        create_resp = client.post(
            "/api/v1/certifications/",
            json=payload,
            headers=auth_headers,
        )
        assert create_resp.status_code == 201
        cert_id = create_resp.json()["cert_id"]

        within_30 = client.get(
            "/api/v1/certifications/expiring?days=30", headers=auth_headers
        )
        assert within_30.status_code == 200
        ids_30 = [c["cert_id"] for c in within_30.json()]
        assert cert_id in ids_30

        within_7 = client.get(
            "/api/v1/certifications/expiring?days=7", headers=auth_headers
        )
        assert within_7.status_code == 200
        ids_7 = [c["cert_id"] for c in within_7.json()]
        assert cert_id not in ids_7
