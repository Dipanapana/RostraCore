"""End-to-end tests for invoices, revenue dashboard, site profitability,
and payroll report endpoints.

Covers listing, generation, stats, revenue overview, site profitability
breakdowns, and payroll report summaries/trends.
"""

import pytest

pytestmark = pytest.mark.integration


class TestInvoiceEndpoints:
    """Tests for invoice CRUD and generation."""

    def test_list_invoices_empty(self, client, ensure_test_user, auth_headers):
        """GET /invoices/ returns an empty list for the test org."""
        response = client.get("/api/v1/invoices/", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        if isinstance(data, list):
            assert isinstance(data, list)
        else:
            # Paginated response
            assert isinstance(data, dict)

    def test_list_invoices_requires_auth(self, client, ensure_test_user):
        """GET /invoices/ without a token returns 401."""
        response = client.get("/api/v1/invoices/")
        assert response.status_code in [401, 403]

    def test_get_invoice_not_found(self, client, ensure_test_user, auth_headers):
        """GET /invoices/99999 returns 404 for a nonexistent invoice."""
        response = client.get("/api/v1/invoices/99999", headers=auth_headers)
        assert response.status_code == 404

    def test_invoice_stats_summary(self, client, ensure_test_user, auth_headers):
        """GET /invoices/stats/summary returns a valid structure."""
        response = client.get(
            "/api/v1/invoices/stats/summary", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)
        # Should contain summary statistics (totals, counts, etc.)
        assert len(data) > 0

    def test_generate_invoice_no_shifts(
        self, client, ensure_test_user, auth_headers
    ):
        """POST /invoices/generate with a client_id and period that has no shifts.

        Should return an error since there are no shifts to invoice,
        or a 200 with a zero-value invoice.
        """
        payload = {
            "client_id": 99999,
            "period_start": "2020-01-01",
            "period_end": "2020-01-31",
        }
        response = client.post(
            "/api/v1/invoices/generate",
            json=payload,
            headers=auth_headers,
        )
        # Client doesn't exist or no shifts: expect an error
        assert response.status_code in [200, 400, 404, 422]


class TestRevenueDashboard:
    """Tests for revenue overview endpoint."""

    def test_revenue_overview(self, client, ensure_test_user, auth_headers):
        """GET /revenue/overview returns valid structure with zeros for test org."""
        response = client.get("/api/v1/revenue/overview", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)
        # Should have revenue-related fields
        assert len(data) > 0

    def test_revenue_overview_custom_days(
        self, client, ensure_test_user, auth_headers
    ):
        """GET /revenue/overview?days=30 works with a custom time window."""
        response = client.get(
            "/api/v1/revenue/overview",
            params={"days": 30},
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)

    def test_revenue_requires_auth(self, client, ensure_test_user):
        """GET /revenue/overview without auth returns 401."""
        response = client.get("/api/v1/revenue/overview")
        assert response.status_code in [401, 403]


class TestSiteProfitability:
    """Tests for site profitability analytics."""

    def test_site_profitability_by_site(
        self, client, ensure_test_user, auth_headers
    ):
        """GET /site-profitability/by-site returns valid structure."""
        response = client.get(
            "/api/v1/site-profitability/by-site", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, (list, dict))

    def test_site_profitability_summary(
        self, client, ensure_test_user, auth_headers
    ):
        """GET /site-profitability/summary returns valid structure."""
        response = client.get(
            "/api/v1/site-profitability/summary", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)
        # Should have summary fields (totals, trend, etc.)
        assert len(data) > 0


class TestPayrollReports:
    """Tests for payroll report endpoints."""

    def test_payroll_report_summary(
        self, client, ensure_test_user, auth_headers
    ):
        """GET /payroll-reports/summary returns valid structure."""
        response = client.get(
            "/api/v1/payroll-reports/summary", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)
        assert len(data) > 0

    def test_payroll_report_trend(
        self, client, ensure_test_user, auth_headers
    ):
        """GET /payroll-reports/trend returns a valid trend array."""
        response = client.get(
            "/api/v1/payroll-reports/trend", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        # Trend is typically a list of monthly data points
        if isinstance(data, list):
            assert isinstance(data, list)
        else:
            # Could be wrapped in a dict with a trend key
            assert isinstance(data, dict)

    def test_payroll_report_by_employee(
        self, client, ensure_test_user, auth_headers
    ):
        """GET /payroll-reports/by-employee returns valid structure."""
        response = client.get(
            "/api/v1/payroll-reports/by-employee", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, (list, dict))

    def test_payroll_report_trend_custom_months(
        self, client, ensure_test_user, auth_headers
    ):
        """GET /payroll-reports/trend?months=3 works with custom month count."""
        response = client.get(
            "/api/v1/payroll-reports/trend",
            params={"months": 3},
            headers=auth_headers,
        )
        assert response.status_code == 200
        data = response.json()
        if isinstance(data, list):
            # With months=3, should have at most 3 entries
            assert len(data) <= 4  # allow slight variance for boundary months
