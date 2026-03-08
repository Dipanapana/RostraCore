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


class TestEmployeeFilter:
    """Test employee list filtering and search."""

    def test_list_employees_with_limit(self, client, auth_headers):
        """Limit query param constrains the number of results returned."""
        response = client.get(
            "/api/v1/employees/?limit=2", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        # Result set must not exceed the requested limit
        assert len(data) <= 2

    def test_list_employees_filter_by_status_active(self, client, auth_headers):
        """Status filter returns only employees with the requested status."""
        response = client.get(
            "/api/v1/employees/?status_filter=active", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        for emp in data:
            assert emp.get("status") == "active"

    def test_list_employees_skip_pagination(self, client, auth_headers, test_org):
        """Skip param works: two pages with skip=0 and skip=1 differ when there are employees."""
        # Ensure at least two employees exist
        for i in range(2):
            unique = uuid.uuid4().hex[:8]
            client.post(
                "/api/v1/employees/",
                json={
                    "first_name": f"Page{i}",
                    "last_name": "Worker",
                    "email": f"page{i}.worker.{unique}@test.com",
                    "id_number": f"720101{unique[:7]}",
                    "gender": "male",
                    "role": "armed",
                    "pay_type": "hourly",
                    "hourly_rate": 40.0,
                    "org_id": test_org.org_id,
                },
                headers=auth_headers,
            )

        page1 = client.get(
            "/api/v1/employees/?skip=0&limit=1", headers=auth_headers
        ).json()
        page2 = client.get(
            "/api/v1/employees/?skip=1&limit=1", headers=auth_headers
        ).json()

        # Pages should exist; if there are at least 2 employees the IDs will differ
        if page1 and page2:
            assert page1[0]["employee_id"] != page2[0]["employee_id"]

    def test_grade_stats_endpoint(self, client, auth_headers):
        """Grade stats endpoint returns the expected top-level keys."""
        response = client.get(
            "/api/v1/employees/grade-stats", headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "grades" in data
        assert "total_active" in data
        assert isinstance(data["grades"], list)


class TestEmployeeCreateValidation:
    """Test validation rules on employee creation."""

    def test_create_employee_missing_required_fields(self, client, auth_headers):
        """POST with an empty body should fail with 422 Unprocessable Entity."""
        response = client.post(
            "/api/v1/employees/",
            json={},
            headers=auth_headers,
        )
        assert response.status_code in [400, 422]

    def test_create_employee_duplicate_id_number(self, client, auth_headers, test_org):
        """Creating two employees with the same id_number should fail on the second."""
        unique = uuid.uuid4().hex[:8]
        id_number = f"830303{unique[:7]}"
        payload = {
            "first_name": "Duplicate",
            "last_name": "Id",
            "email": f"dup1.{unique}@test.com",
            "id_number": id_number,
            "gender": "male",
            "role": "unarmed",
            "pay_type": "hourly",
            "hourly_rate": 38.0,
            "org_id": test_org.org_id,
        }
        first = client.post("/api/v1/employees/", json=payload, headers=auth_headers)
        assert first.status_code in [200, 201]

        # Second employee with same id_number but different email
        payload["email"] = f"dup2.{unique}@test.com"
        second = client.post("/api/v1/employees/", json=payload, headers=auth_headers)
        # Expect conflict (409) or validation error (422); some implementations return 400
        assert second.status_code in [400, 409, 422]

    def test_update_employee_partial(self, client, auth_headers, test_org):
        """PATCH/PUT with a subset of fields updates only those fields."""
        unique = uuid.uuid4().hex[:8]
        create_resp = client.post(
            "/api/v1/employees/",
            json={
                "first_name": "Partial",
                "last_name": "Update",
                "email": f"partial.{unique}@test.com",
                "id_number": f"940404{unique[:7]}",
                "gender": "female",
                "role": "unarmed",
                "pay_type": "hourly",
                "hourly_rate": 42.0,
                "org_id": test_org.org_id,
            },
            headers=auth_headers,
        )
        assert create_resp.status_code in [200, 201]
        emp_id = create_resp.json().get("employee_id")

        update_resp = client.put(
            f"/api/v1/employees/{emp_id}",
            json={"first_name": "Updated"},
            headers=auth_headers,
        )
        assert update_resp.status_code == 200
        assert update_resp.json()["first_name"] == "Updated"
        # Last name must be unchanged
        assert update_resp.json()["last_name"] == "Update"

    def test_get_nonexistent_employee_returns_404(self, client, auth_headers):
        """Requesting an employee ID that does not exist should return 404."""
        response = client.get(
            "/api/v1/employees/999999999", headers=auth_headers
        )
        assert response.status_code == 404
