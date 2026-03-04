"""Integration tests for roster endpoints."""

import pytest

pytestmark = pytest.mark.integration


class TestRosterEndpoints:
    """Test roster CRUD and generation endpoints."""

    def test_roster_assignment_dashboard(self, client, auth_headers):
        response = client.get("/api/v1/roster/assignment-dashboard", headers=auth_headers)
        assert response.status_code == 200

    def test_roster_no_auth(self, client):
        response = client.get("/api/v1/roster/assignment-dashboard")
        assert response.status_code in [401, 403]


class TestShiftEndpoints:
    """Test shift endpoints."""

    def test_list_shifts(self, client, auth_headers):
        response = client.get("/api/v1/shifts/", headers=auth_headers)
        assert response.status_code == 200

    def test_shifts_no_auth(self, client):
        response = client.get("/api/v1/shifts/")
        assert response.status_code in [401, 403]


class TestConstraintEndpoints:
    """Test solver constraint config endpoints."""

    def test_get_constraints(self, client, auth_headers):
        response = client.get("/api/v1/settings/constraints", headers=auth_headers)
        assert response.status_code == 200

    def test_constraints_no_auth(self, client):
        response = client.get("/api/v1/settings/constraints")
        assert response.status_code in [401, 403]
