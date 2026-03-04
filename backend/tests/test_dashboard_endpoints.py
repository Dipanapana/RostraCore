"""Integration tests for dashboard endpoints."""

import pytest

pytestmark = pytest.mark.integration


class TestMainDashboard:
    """Test core dashboard metrics endpoints."""

    def test_dashboard_metrics(self, client, auth_headers):
        response = client.get("/api/v1/dashboard/metrics", headers=auth_headers)
        assert response.status_code == 200

    def test_dashboard_weekly_summary(self, client, auth_headers):
        response = client.get("/api/v1/dashboard/weekly-summary", headers=auth_headers)
        assert response.status_code == 200

    def test_dashboard_upcoming_shifts(self, client, auth_headers):
        response = client.get("/api/v1/dashboard/upcoming-shifts", headers=auth_headers)
        assert response.status_code == 200

    def test_dashboard_site_coverage(self, client, auth_headers):
        response = client.get("/api/v1/dashboard/site-coverage", headers=auth_headers)
        assert response.status_code == 200

    def test_dashboard_employee_utilization(self, client, auth_headers):
        response = client.get("/api/v1/dashboard/employee-utilization", headers=auth_headers)
        assert response.status_code == 200

    def test_dashboard_cost_trends(self, client, auth_headers):
        response = client.get("/api/v1/dashboard/cost-trends", headers=auth_headers)
        assert response.status_code == 200

    def test_dashboard_expiring_certifications(self, client, auth_headers):
        response = client.get("/api/v1/dashboard/expiring-certifications", headers=auth_headers)
        assert response.status_code == 200

    def test_dashboard_no_auth(self, client):
        response = client.get("/api/v1/dashboard/metrics")
        assert response.status_code in [401, 403]


class TestSpecializedDashboards:
    """Test the 4 specialized dashboards + stats."""

    def test_executive_dashboard(self, client, auth_headers):
        response = client.get("/api/v1/dashboards/executive", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "revenue" in data or "workforce" in data or "period" in data

    def test_financial_dashboard(self, client, auth_headers):
        response = client.get("/api/v1/dashboards/financial", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "payroll" in data or "budget" in data

    def test_operations_dashboard(self, client, auth_headers):
        response = client.get("/api/v1/dashboards/operations", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "action_items" in data or "current_status" in data

    def test_people_analytics(self, client, auth_headers):
        response = client.get("/api/v1/dashboards/people-analytics", headers=auth_headers)
        assert response.status_code == 200

    def test_dashboard_stats(self, client, auth_headers):
        response = client.get("/api/v1/dashboards/stats", headers=auth_headers)
        assert response.status_code == 200


class TestDashboardAuthRequired:
    """Verify dashboards require authentication."""

    @pytest.mark.parametrize("endpoint", [
        "/api/v1/dashboards/executive",
        "/api/v1/dashboards/financial",
        "/api/v1/dashboards/operations",
        "/api/v1/dashboards/people-analytics",
    ])
    def test_dashboard_requires_auth(self, client, endpoint):
        response = client.get(endpoint)
        assert response.status_code in [401, 403]
