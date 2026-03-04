"""Integration tests for employee endpoints."""

import pytest

pytestmark = pytest.mark.integration
import uuid


class TestEmployeeList:
    """Test employee list/read endpoints."""

    def test_list_employees(self, client, auth_headers):
        response = client.get("/api/v1/employees/", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, (list, dict))

    def test_list_employees_no_auth(self, client):
        response = client.get("/api/v1/employees/")
        assert response.status_code in [401, 403]


class TestEmployeeCreate:
    """Test employee creation."""

    def test_create_employee(self, client, auth_headers, test_org):
        unique = uuid.uuid4().hex[:8]
        response = client.post(
            "/api/v1/employees/",
            json={
                "first_name": "John",
                "last_name": "Doe",
                "email": f"john.doe.{unique}@test.com",
                "phone": "0821234567",
                "id_number": f"900101{unique[:7]}",
                "gender": "male",
                "role": "armed",
                "pay_type": "hourly",
                "hourly_rate": 45.0,
                "org_id": test_org.org_id,
            },
            headers=auth_headers,
        )
        assert response.status_code in [200, 201]
        data = response.json()
        assert data["first_name"] == "John"
        assert data["last_name"] == "Doe"

    def test_create_employee_no_auth(self, client):
        response = client.post(
            "/api/v1/employees/",
            json={"first_name": "Test", "last_name": "User"},
        )
        assert response.status_code in [401, 403]


class TestEmployeeUpdate:
    """Test employee update."""

    def test_update_employee(self, client, auth_headers, test_org):
        # First create
        create_resp = client.post(
            "/api/v1/employees/",
            json={
                "first_name": "Jane",
                "last_name": "Smith",
                "email": f"jane.smith.{uuid.uuid4().hex[:8]}@test.com",
                "phone": "0829876543",
                "id_number": f"850202{uuid.uuid4().hex[:7]}",
                "gender": "female",
                "role": "armed",
                "pay_type": "hourly",
                "hourly_rate": 50.0,
                "org_id": test_org.org_id,
            },
            headers=auth_headers,
        )
        if create_resp.status_code in [200, 201]:
            emp_id = create_resp.json().get("employee_id")
            if emp_id:
                # Update
                update_resp = client.put(
                    f"/api/v1/employees/{emp_id}",
                    json={"first_name": "Janet", "hourly_rate": 55.0},
                    headers=auth_headers,
                )
                assert update_resp.status_code == 200
                assert update_resp.json()["first_name"] == "Janet"


class TestEmployeeDataQuality:
    """Test employee data quality endpoint."""

    def test_data_quality(self, client, auth_headers):
        response = client.get(
            "/api/v1/employees/dashboard/data-quality",
            headers=auth_headers,
        )
        assert response.status_code == 200
