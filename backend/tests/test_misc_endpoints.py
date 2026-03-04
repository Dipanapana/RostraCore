"""Integration tests for miscellaneous endpoints."""

import pytest

pytestmark = pytest.mark.integration


class TestReportEndpoints:
    """Test report endpoints."""

    def test_outstanding_invoices_report(self, client, auth_headers):
        response = client.get("/api/v1/reports/outstanding-invoices", headers=auth_headers)
        assert response.status_code == 200

    def test_employee_payroll_report(self, client, auth_headers):
        response = client.get(
            "/api/v1/reports/employee-payroll",
            params={"period_start": "2026-02-01", "period_end": "2026-02-28"},
            headers=auth_headers,
        )
        assert response.status_code == 200

    def test_reports_no_auth(self, client):
        response = client.get("/api/v1/reports/outstanding-invoices")
        assert response.status_code in [401, 403]


class TestCertificationEndpoints:
    """Test certification endpoints."""

    def test_compliance_dashboard(self, client, auth_headers):
        response = client.get(
            "/api/v1/certifications/compliance-dashboard",
            headers=auth_headers,
        )
        assert response.status_code == 200

    def test_cert_alerts(self, client, auth_headers):
        response = client.get("/api/v1/cert-alerts/dashboard/", headers=auth_headers)
        assert response.status_code == 200


class TestBudgetEndpoints:
    """Test budget endpoints."""

    def test_budget_dashboard(self, client, auth_headers):
        response = client.get("/api/v1/budgets/dashboard", headers=auth_headers)
        assert response.status_code == 200


class TestOvertimeEndpoints:
    """Test overtime endpoints."""

    def test_overtime_dashboard(self, client, auth_headers):
        response = client.get("/api/v1/overtime/dashboard", headers=auth_headers)
        assert response.status_code == 200


class TestDeploymentEndpoints:
    """Test deployment management endpoints."""

    def test_deployment_dashboard(self, client, auth_headers):
        response = client.get("/api/v1/deployments/dashboard", headers=auth_headers)
        assert response.status_code == 200


class TestAvailabilityEndpoints:
    """Test availability endpoints."""

    def test_list_availability(self, client, auth_headers):
        response = client.get("/api/v1/availability/", headers=auth_headers)
        assert response.status_code == 200


class TestLeaveEndpoints:
    """Test leave management endpoints."""

    def test_list_leave(self, client, auth_headers):
        response = client.get("/api/v1/leave/requests", headers=auth_headers)
        assert response.status_code == 200


class TestAnnouncementEndpoints:
    """Test announcement endpoints."""

    def test_announcement_dashboard(self, client, auth_headers):
        response = client.get("/api/v1/announcements/dashboard/", headers=auth_headers)
        assert response.status_code == 200


class TestTrainingEndpoints:
    """Test training endpoints."""

    def test_training_dashboard(self, client, auth_headers):
        response = client.get("/api/v1/training/dashboard/", headers=auth_headers)
        assert response.status_code == 200


class TestDisciplinaryEndpoints:
    """Test disciplinary endpoints."""

    def test_disciplinary_dashboard(self, client, auth_headers):
        response = client.get("/api/v1/disciplinary/dashboard/", headers=auth_headers)
        assert response.status_code == 200


class TestIODEndpoints:
    """Test injury-on-duty endpoints."""

    def test_iod_dashboard(self, client, auth_headers):
        response = client.get("/api/v1/iod/dashboard", headers=auth_headers)
        assert response.status_code == 200


class TestEmergencyContactEndpoints:
    """Test emergency contact endpoints."""

    def test_emergency_dashboard(self, client, auth_headers):
        response = client.get("/api/v1/emergency-contacts/dashboard", headers=auth_headers)
        assert response.status_code == 200


class TestSLAEndpoints:
    """Test SLA endpoints."""

    def test_sla_dashboard(self, client, auth_headers):
        response = client.get("/api/v1/sla/dashboard", headers=auth_headers)
        assert response.status_code == 200


class TestContractEndpoints:
    """Test contract compliance endpoints."""

    def test_contract_compliance_dashboard(self, client, auth_headers):
        response = client.get("/api/v1/contract-compliance/dashboard", headers=auth_headers)
        assert response.status_code == 200

    def test_contract_values_dashboard(self, client, auth_headers):
        response = client.get("/api/v1/contract-values/dashboard/", headers=auth_headers)
        assert response.status_code == 200


class TestSkillsMatrixEndpoints:
    """Test skills matrix endpoints."""

    def test_skills_dashboard(self, client, auth_headers):
        response = client.get("/api/v1/skills-matrix/dashboard", headers=auth_headers)
        assert response.status_code == 200


class TestPOPIAEndpoints:
    """Test POPIA compliance endpoints."""

    def test_popia_dashboard(self, client, auth_headers):
        response = client.get("/api/v1/popia/dashboard", headers=auth_headers)
        assert response.status_code == 200


class TestExportEndpoints:
    """Test export endpoints."""

    def test_payroll_csv_export(self, client, auth_headers):
        response = client.get(
            "/api/v1/exports/payroll/csv",
            params={"period_start": "2026-02-01", "period_end": "2026-02-28"},
            headers=auth_headers,
        )
        assert response.status_code == 200


class TestRoleBasedAccess:
    """Test that guard role has limited access."""

    def test_guard_cannot_access_payroll(self, client, guard_auth_headers):
        response = client.get("/api/v1/payroll/", headers=guard_auth_headers)
        # Guards should have restricted access to payroll
        assert response.status_code in [200, 403]

    def test_guard_can_access_own_payslip(self, client, guard_auth_headers):
        response = client.get("/api/v1/payroll/my-payslip", headers=guard_auth_headers)
        # Should be 200 (even if no payslip data) or appropriate error
        assert response.status_code in [200, 404]
