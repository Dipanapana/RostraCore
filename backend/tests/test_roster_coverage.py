"""Integration tests for roster endpoints — coverage expansion."""

import pytest

pytestmark = pytest.mark.integration


class TestRosterDashboards:
    """Test roster dashboard and summary endpoints."""

    def test_assignment_dashboard(self, client, auth_headers):
        response = client.get("/api/v1/roster/assignment-dashboard", headers=auth_headers)
        assert response.status_code == 200

    def test_budget_summary(self, client, auth_headers):
        response = client.get("/api/v1/roster/budget-summary", headers=auth_headers)
        assert response.status_code == 200

    def test_employee_hours(self, client, auth_headers):
        response = client.get("/api/v1/roster/employee-hours", headers=auth_headers)
        assert response.status_code == 200

    def test_assignment_dashboard_with_dates(self, client, auth_headers):
        response = client.get(
            "/api/v1/roster/assignment-dashboard",
            params={"start_date": "2026-02-01", "end_date": "2026-02-28"},
            headers=auth_headers,
        )
        assert response.status_code == 200


class TestRosterGetEndpoints:
    """Test additional roster GET endpoints."""

    def test_unfilled_shifts(self, client, auth_headers):
        response = client.get("/api/v1/roster/unfilled-shifts", headers=auth_headers)
        assert response.status_code == 200

    def test_saved_rosters(self, client, auth_headers):
        response = client.get("/api/v1/roster/saved", headers=auth_headers)
        assert response.status_code == 200

    def test_cost_forecast(self, client, auth_headers):
        response = client.get(
            "/api/v1/roster/cost-forecast",
            params={"start_date": "2026-02-01T00:00:00", "end_date": "2026-02-28T23:59:59"},
            headers=auth_headers,
        )
        assert response.status_code == 200

    def test_site_coverage_calendar(self, client, auth_headers):
        response = client.get(
            "/api/v1/roster/site-coverage-calendar",
            params={"start_date": "2026-02-01T00:00:00", "end_date": "2026-02-28T23:59:59"},
            headers=auth_headers,
        )
        assert response.status_code == 200

    def test_posting_alerts(self, client, auth_headers):
        response = client.get(
            "/api/v1/roster/posting-alerts",
            params={"start_date": "2026-02-01T00:00:00", "end_date": "2026-02-28T23:59:59"},
            headers=auth_headers,
        )
        assert response.status_code == 200

    def test_spare_pool(self, client, auth_headers):
        response = client.get("/api/v1/roster/spare-pool", headers=auth_headers)
        assert response.status_code == 200

    def test_overtime_compliance(self, client, auth_headers):
        response = client.get("/api/v1/roster/overtime-compliance", headers=auth_headers)
        assert response.status_code == 200

    def test_audit_log(self, client, auth_headers):
        response = client.get("/api/v1/roster/audit-log", headers=auth_headers)
        assert response.status_code == 200


class TestRosterNoAuth:
    """Test roster endpoints require auth."""

    def test_budget_summary_no_auth(self, client):
        response = client.get("/api/v1/roster/budget-summary")
        assert response.status_code in [401, 403]

    def test_employee_hours_no_auth(self, client):
        response = client.get("/api/v1/roster/employee-hours")
        assert response.status_code in [401, 403]

    def test_saved_no_auth(self, client):
        response = client.get("/api/v1/roster/saved")
        assert response.status_code in [401, 403]

    def test_unfilled_no_auth(self, client):
        response = client.get("/api/v1/roster/unfilled-shifts")
        assert response.status_code in [401, 403]
