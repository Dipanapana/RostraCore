"""Integration tests for additional endpoints — coverage expansion."""

import pytest

pytestmark = pytest.mark.integration


class TestShiftEndpointsCoverage:
    """Expanded shift endpoint tests."""

    def test_list_shifts(self, client, auth_headers):
        response = client.get("/api/v1/shifts/", headers=auth_headers)
        assert response.status_code == 200

    def test_list_shifts_filtered(self, client, auth_headers):
        response = client.get(
            "/api/v1/shifts/",
            params={"start_date": "2026-02-01", "end_date": "2026-02-28"},
            headers=auth_headers,
        )
        assert response.status_code == 200

    def test_coverage_gaps(self, client, auth_headers):
        response = client.get("/api/v1/shifts/coverage-gaps", headers=auth_headers)
        assert response.status_code == 200

    def test_my_shifts(self, client, auth_headers):
        response = client.get("/api/v1/shifts/my-shifts", headers=auth_headers)
        assert response.status_code in [200, 403]


class TestAttendanceEndpoints:
    """Test attendance endpoints."""

    def test_list_attendance(self, client, auth_headers):
        response = client.get("/api/v1/attendance/", headers=auth_headers)
        assert response.status_code == 200

    def test_attendance_filtered(self, client, auth_headers):
        response = client.get(
            "/api/v1/attendance/",
            params={"start_date": "2026-02-01", "end_date": "2026-02-28"},
            headers=auth_headers,
        )
        assert response.status_code == 200

    def test_attendance_analytics(self, client, auth_headers):
        response = client.get("/api/v1/attendance/analytics", headers=auth_headers)
        assert response.status_code == 200

    def test_attendance_no_auth(self, client):
        response = client.get("/api/v1/attendance/")
        assert response.status_code in [401, 403]


class TestOrganizationEndpoints:
    """Test organization endpoints."""

    def test_current_org(self, client, auth_headers):
        response = client.get("/api/v1/organizations/current", headers=auth_headers)
        assert response.status_code == 200

    def test_list_organizations(self, client, auth_headers):
        response = client.get("/api/v1/organizations/", headers=auth_headers)
        assert response.status_code == 200

    def test_org_no_auth(self, client):
        response = client.get("/api/v1/organizations/current")
        assert response.status_code in [401, 403]


class TestShiftPatternEndpoints:
    """Test shift pattern endpoints."""

    def test_list_templates(self, client, auth_headers):
        response = client.get("/api/v1/shift-patterns/templates", headers=auth_headers)
        assert response.status_code == 200

    def test_list_templates_all(self, client, auth_headers):
        response = client.get(
            "/api/v1/shift-patterns/templates",
            params={"active_only": False},
            headers=auth_headers,
        )
        assert response.status_code == 200


class TestDocumentEndpoints:
    """Test document endpoints."""

    def test_list_documents(self, client, auth_headers):
        response = client.get("/api/v1/documents/", headers=auth_headers)
        assert response.status_code == 200

    def test_document_summary(self, client, auth_headers):
        response = client.get("/api/v1/documents/summary/", headers=auth_headers)
        assert response.status_code == 200

    def test_documents_no_auth(self, client):
        response = client.get("/api/v1/documents/")
        assert response.status_code in [401, 403]


class TestIncidentEndpoints:
    """Test incident endpoints."""

    def test_list_incidents(self, client, auth_headers):
        response = client.get("/api/v1/incidents/", headers=auth_headers)
        assert response.status_code == 200

    def test_my_incidents(self, client, auth_headers):
        response = client.get("/api/v1/incidents/mine", headers=auth_headers)
        assert response.status_code in [200, 403]

    def test_incidents_no_auth(self, client):
        response = client.get("/api/v1/incidents/")
        assert response.status_code in [401, 403]


class TestFirearmEndpoints:
    """Test firearm management endpoints."""

    def test_list_firearms(self, client, auth_headers):
        response = client.get("/api/v1/firearms/", headers=auth_headers)
        assert response.status_code == 200

    def test_overdue_inspections(self, client, auth_headers):
        response = client.get("/api/v1/firearms/overdue-inspections", headers=auth_headers)
        assert response.status_code == 200

    def test_firearms_no_auth(self, client):
        response = client.get("/api/v1/firearms/")
        assert response.status_code in [401, 403]


class TestFleetEndpoints:
    """Test fleet management endpoints."""

    def test_list_vehicles(self, client, auth_headers):
        response = client.get("/api/v1/fleet/", headers=auth_headers)
        assert response.status_code == 200

    def test_fleet_dashboard(self, client, auth_headers):
        response = client.get("/api/v1/fleet/dashboard/", headers=auth_headers)
        assert response.status_code == 200

    def test_fleet_no_auth(self, client):
        response = client.get("/api/v1/fleet/")
        assert response.status_code in [401, 403]


class TestPatrolEndpoints:
    """Test patrol endpoints."""

    def test_list_tours(self, client, auth_headers):
        response = client.get("/api/v1/patrols/tours", headers=auth_headers)
        assert response.status_code == 200

    def test_list_runs(self, client, auth_headers):
        response = client.get("/api/v1/patrols/runs", headers=auth_headers)
        assert response.status_code == 200

    def test_patrols_no_auth(self, client):
        response = client.get("/api/v1/patrols/tours")
        assert response.status_code in [401, 403]


class TestLeaveEndpointsCoverage:
    """Expanded leave endpoint tests."""

    def test_leave_requests(self, client, auth_headers):
        response = client.get("/api/v1/leave/requests", headers=auth_headers)
        assert response.status_code == 200

    def test_leave_entitlements(self, client, auth_headers):
        response = client.get("/api/v1/leave/entitlements", headers=auth_headers)
        assert response.status_code == 200

    def test_non_productive_summary(self, client, auth_headers):
        response = client.get("/api/v1/leave/non-productive-summary", headers=auth_headers)
        assert response.status_code == 200

    def test_leave_no_auth(self, client):
        response = client.get("/api/v1/leave/requests")
        assert response.status_code in [401, 403]


class TestPerformanceEndpoints:
    """Test performance management endpoints."""

    def test_performance_dashboard(self, client, auth_headers):
        response = client.get("/api/v1/performance-dashboard", headers=auth_headers)
        assert response.status_code == 200


class TestNotificationEndpoints:
    """Test notification endpoints."""

    def test_list_notifications(self, client, auth_headers):
        response = client.get("/api/v1/notifications/", headers=auth_headers)
        assert response.status_code == 200

    def test_notifications_no_auth(self, client):
        response = client.get("/api/v1/notifications/")
        assert response.status_code in [401, 403]


class TestMessagingEndpoints:
    """Test messaging endpoints."""

    def test_list_channels(self, client, auth_headers):
        response = client.get("/api/v1/messages/channels", headers=auth_headers)
        assert response.status_code == 200

    def test_messaging_no_auth(self, client):
        response = client.get("/api/v1/messages/channels")
        assert response.status_code in [401, 403]


class TestPostOrderEndpoints:
    """Test post order endpoints."""

    def test_list_post_orders(self, client, auth_headers):
        response = client.get("/api/v1/post-orders/", headers=auth_headers)
        assert response.status_code == 200


class TestShiftSwapEndpoints:
    """Test shift swap endpoints."""

    def test_list_swaps(self, client, auth_headers):
        response = client.get("/api/v1/shift-swaps/", headers=auth_headers)
        assert response.status_code == 200


class TestRosterPreferenceEndpoints:
    """Test roster preference endpoints."""

    def test_list_preferences(self, client, auth_headers):
        response = client.get("/api/v1/roster-preferences/", headers=auth_headers)
        assert response.status_code == 200


class TestPSIRAComplianceEndpoints:
    """Test PSIRA compliance endpoints."""

    def test_psira_rates(self, client, auth_headers):
        response = client.get("/api/v1/psira/rates", headers=auth_headers)
        assert response.status_code == 200

    def test_psira_check(self, client, auth_headers):
        response = client.get("/api/v1/psira/check", headers=auth_headers)
        assert response.status_code == 200


class TestExportEndpointsCoverage:
    """Expanded export endpoint tests."""

    def test_payroll_csv_with_format(self, client, auth_headers):
        response = client.get(
            "/api/v1/exports/payroll/csv",
            params={"period_start": "2026-02-01", "period_end": "2026-02-28", "format": "sage300"},
            headers=auth_headers,
        )
        assert response.status_code == 200

    def test_export_no_auth(self, client):
        response = client.get(
            "/api/v1/exports/payroll/csv",
            params={"period_start": "2026-02-01", "period_end": "2026-02-28"},
        )
        assert response.status_code in [401, 403]


class TestReportEndpointsCoverage:
    """Expanded report endpoint tests."""

    def test_outstanding_invoices(self, client, auth_headers):
        response = client.get("/api/v1/reports/outstanding-invoices", headers=auth_headers)
        assert response.status_code == 200

    def test_employee_payroll_report(self, client, auth_headers):
        response = client.get(
            "/api/v1/reports/employee-payroll",
            params={"period_start": "2026-02-01", "period_end": "2026-02-28"},
            headers=auth_headers,
        )
        assert response.status_code == 200

    def test_revenue_vs_cost(self, client, auth_headers):
        response = client.get(
            "/api/v1/reports/revenue-vs-cost",
            params={"period_start": "2026-02-01", "period_end": "2026-02-28"},
            headers=auth_headers,
        )
        assert response.status_code == 200


class TestSubscriptionEndpoints:
    """Test subscription/plan endpoints."""

    def test_list_plans(self, client, auth_headers):
        response = client.get("/api/v1/subscription-plans/plans", headers=auth_headers)
        # May require superadmin
        assert response.status_code in [200, 403]

    def test_current_subscription(self, client, auth_headers):
        response = client.get("/api/v1/subscriptions/current", headers=auth_headers)
        assert response.status_code in [200, 404]


class TestCustomFormEndpoints:
    """Test custom form endpoints."""

    def test_list_form_templates(self, client, auth_headers):
        response = client.get("/api/v1/forms/templates", headers=auth_headers)
        assert response.status_code == 200


class TestCommLogEndpoints:
    """Test communication log endpoints."""

    def test_list_comm_logs(self, client, auth_headers):
        response = client.get("/api/v1/comm-log/", headers=auth_headers)
        assert response.status_code == 200


class TestMaintenanceEndpoints:
    """Test maintenance endpoints."""

    def test_list_maintenance(self, client, auth_headers):
        response = client.get("/api/v1/maintenance/", headers=auth_headers)
        assert response.status_code == 200
