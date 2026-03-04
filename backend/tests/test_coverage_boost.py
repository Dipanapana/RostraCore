"""Additional integration tests to boost endpoint coverage."""

import pytest

pytestmark = pytest.mark.integration


class TestOrgSettingsEndpoints:
    """Test organization settings endpoints."""

    def test_client_management_settings(self, client, auth_headers):
        response = client.get("/api/v1/organization-settings/client-management", headers=auth_headers)
        assert response.status_code == 200

    def test_client_management_mode(self, client, auth_headers):
        response = client.get("/api/v1/organization-settings/client-management/mode", headers=auth_headers)
        assert response.status_code == 200

    def test_default_hourly_rates(self, client, auth_headers):
        response = client.get("/api/v1/organization-settings/hourly-rates", headers=auth_headers)
        assert response.status_code == 200

    def test_org_settings_no_auth(self, client):
        response = client.get("/api/v1/organization-settings/client-management")
        assert response.status_code in [401, 403]


class TestShiftHandoverEndpoints:
    """Test shift handover endpoints."""

    def test_list_handovers(self, client, auth_headers):
        response = client.get("/api/v1/shift-handovers/", headers=auth_headers)
        assert response.status_code == 200

    def test_handover_dashboard(self, client, auth_headers):
        response = client.get("/api/v1/shift-handovers/dashboard", headers=auth_headers)
        assert response.status_code == 200


class TestInspectionEndpoints:
    """Test inspection endpoints."""

    def test_list_inspections(self, client, auth_headers):
        response = client.get("/api/v1/inspections/", headers=auth_headers)
        assert response.status_code == 200

    def test_inspection_templates(self, client, auth_headers):
        response = client.get("/api/v1/inspections/templates/", headers=auth_headers)
        assert response.status_code == 200

    def test_inspection_dashboard(self, client, auth_headers):
        response = client.get("/api/v1/inspections/dashboard/", headers=auth_headers)
        assert response.status_code == 200


class TestDailyActivityEndpoints:
    """Test daily activity report endpoints."""

    def test_list_dars(self, client, auth_headers):
        response = client.get("/api/v1/daily-activity/", headers=auth_headers)
        assert response.status_code == 200

    def test_dar_dashboard(self, client, auth_headers):
        response = client.get("/api/v1/daily-activity/dashboard/", headers=auth_headers)
        assert response.status_code == 200


class TestClientReportEndpoints:
    """Test client report endpoints."""

    def test_list_client_reports(self, client, auth_headers):
        response = client.get("/api/v1/client-reports/", headers=auth_headers)
        assert response.status_code == 200

    def test_client_reports_dashboard(self, client, auth_headers):
        response = client.get("/api/v1/client-reports/dashboard", headers=auth_headers)
        assert response.status_code == 200


class TestGuardRestrictionEndpoints:
    """Test guard restriction endpoints."""

    def test_list_restrictions(self, client, auth_headers):
        response = client.get("/api/v1/guard-restrictions/", headers=auth_headers)
        assert response.status_code == 200


class TestReportsEndpointsCoverage:
    """Expanded report endpoint tests for coverage."""

    def test_profitability_report(self, client, auth_headers):
        response = client.get(
            "/api/v1/reports/profitability",
            params={"period_start": "2026-02-01", "period_end": "2026-02-28"},
            headers=auth_headers,
        )
        assert response.status_code == 200

    def test_site_performance_report(self, client, auth_headers):
        response = client.get(
            "/api/v1/reports/site-performance",
            params={"period_start": "2026-02-01", "period_end": "2026-02-28"},
            headers=auth_headers,
        )
        assert response.status_code == 200

    def test_client_profitability_report(self, client, auth_headers):
        response = client.get("/api/v1/reports/client-profitability", headers=auth_headers)
        assert response.status_code == 200


class TestPayrollEndpointsCoverage:
    """Expanded payroll endpoint tests."""

    def test_my_payslip(self, client, auth_headers):
        response = client.get("/api/v1/payroll/my-payslip", headers=auth_headers)
        # May return 404 if no payslip for the test user
        assert response.status_code in [200, 404]

    def test_payroll_list(self, client, auth_headers):
        response = client.get("/api/v1/payroll/", headers=auth_headers)
        assert response.status_code == 200

    def test_payroll_no_auth(self, client):
        response = client.get("/api/v1/payroll/")
        assert response.status_code in [401, 403]


class TestRolePermissionEndpoints:
    """Test role permission endpoints."""

    def test_list_permissions(self, client, auth_headers):
        response = client.get("/api/v1/role-permissions/", headers=auth_headers)
        assert response.status_code == 200


class TestLocationEndpoints:
    """Test location tracking endpoints."""

    def test_location_no_auth(self, client):
        response = client.get("/api/v1/location/")
        assert response.status_code in [401, 403, 404, 405]


class TestCertAlertEndpoints:
    """Test certification alert endpoints."""

    def test_cert_alerts_expiring(self, client, auth_headers):
        response = client.get("/api/v1/cert-alerts/expiring/", headers=auth_headers)
        assert response.status_code == 200

    def test_cert_alerts_dashboard(self, client, auth_headers):
        response = client.get("/api/v1/cert-alerts/dashboard/", headers=auth_headers)
        assert response.status_code == 200


class TestOvertimeEndpointsCoverage:
    """Expanded overtime endpoint tests."""

    def test_overtime_list(self, client, auth_headers):
        response = client.get("/api/v1/overtime/", headers=auth_headers)
        assert response.status_code == 200

    def test_overtime_dashboard(self, client, auth_headers):
        response = client.get("/api/v1/overtime/dashboard", headers=auth_headers)
        assert response.status_code == 200


class TestExceptionEndpoints:
    """Test shift exception endpoints."""

    def test_exception_summary(self, client, auth_headers):
        response = client.get("/api/v1/exceptions/summary", headers=auth_headers)
        assert response.status_code == 200

    def test_list_exceptions(self, client, auth_headers):
        response = client.get("/api/v1/exceptions/", headers=auth_headers)
        assert response.status_code == 200


class TestSystemSettingsEndpoints:
    """Test system settings endpoints."""

    def test_system_settings_public(self, client, auth_headers):
        response = client.get("/api/v1/system-settings/public", headers=auth_headers)
        assert response.status_code == 200

    def test_system_settings_pricing(self, client, auth_headers):
        response = client.get("/api/v1/system-settings/pricing", headers=auth_headers)
        assert response.status_code in [200, 403]
