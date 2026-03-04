"""Integration tests for payroll and invoicing endpoints."""

import pytest

pytestmark = pytest.mark.integration


class TestPayrollEndpoints:
    """Test payroll endpoints."""

    def test_list_payroll(self, client, auth_headers):
        response = client.get("/api/v1/payroll/", headers=auth_headers)
        assert response.status_code == 200

    def test_current_period(self, client, auth_headers):
        response = client.get("/api/v1/payroll/current-period", headers=auth_headers)
        assert response.status_code == 200

    def test_sa_tax_tables(self, client, auth_headers):
        response = client.get("/api/v1/payroll/sa-tax-tables", headers=auth_headers)
        assert response.status_code == 200

    def test_payroll_no_auth(self, client):
        response = client.get("/api/v1/payroll/")
        assert response.status_code in [401, 403]


class TestPayrollDeductions:
    """Test payroll deductions calculation endpoints."""

    def test_uif_calculation(self, client, auth_headers):
        response = client.get(
            "/api/v1/payroll-deductions/uif",
            params={"gross_monthly": 10000},
            headers=auth_headers,
        )
        assert response.status_code == 200

    def test_paye_calculation(self, client, auth_headers):
        response = client.get(
            "/api/v1/payroll-deductions/paye",
            params={"gross_monthly": 10000},
            headers=auth_headers,
        )
        assert response.status_code == 200

    def test_sdl_calculation(self, client, auth_headers):
        response = client.get(
            "/api/v1/payroll-deductions/sdl",
            params={"total_monthly_payroll": 100000},
            headers=auth_headers,
        )
        assert response.status_code == 200

    def test_net_pay_calculation(self, client, auth_headers):
        response = client.get(
            "/api/v1/payroll-deductions/net-pay",
            params={"gross_monthly": 15000},
            headers=auth_headers,
        )
        assert response.status_code == 200

    def test_cost_to_company(self, client, auth_headers):
        response = client.get(
            "/api/v1/payroll-deductions/cost-to-company",
            params={"gross_monthly": 15000},
            headers=auth_headers,
        )
        assert response.status_code == 200

    def test_tax_tables(self, client, auth_headers):
        response = client.get(
            "/api/v1/payroll-deductions/tax-tables",
            headers=auth_headers,
        )
        assert response.status_code == 200

    def test_deduction_config(self, client, auth_headers):
        response = client.get(
            "/api/v1/payroll-deductions/config",
            headers=auth_headers,
        )
        assert response.status_code == 200


class TestPayrollReports:
    """Test payroll reporting endpoints."""

    def test_payroll_summary(self, client, auth_headers):
        response = client.get(
            "/api/v1/payroll-reports/summary",
            params={"start_date": "2026-02-01", "end_date": "2026-02-28"},
            headers=auth_headers,
        )
        assert response.status_code == 200

    def test_payroll_by_employee(self, client, auth_headers):
        response = client.get(
            "/api/v1/payroll-reports/by-employee",
            headers=auth_headers,
        )
        assert response.status_code == 200

    def test_payroll_trend(self, client, auth_headers):
        response = client.get("/api/v1/payroll-reports/trend", headers=auth_headers)
        assert response.status_code == 200


class TestInvoiceEndpoints:
    """Test invoice endpoints."""

    def test_list_invoices(self, client, auth_headers):
        response = client.get("/api/v1/invoices/", headers=auth_headers)
        assert response.status_code == 200

    def test_invoice_stats(self, client, auth_headers):
        response = client.get("/api/v1/invoices/stats/summary", headers=auth_headers)
        assert response.status_code == 200

    def test_invoices_no_auth(self, client):
        response = client.get("/api/v1/invoices/")
        assert response.status_code in [401, 403]
