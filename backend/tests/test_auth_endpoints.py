"""Integration tests for auth endpoints."""

import pytest

pytestmark = pytest.mark.integration


class TestHealthCheck:
    """Test health and root endpoints."""

    def test_root_endpoint(self, client):
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data or "message" in data

    def test_health_endpoint(self, client):
        response = client.get("/health")
        assert response.status_code == 200


class TestLogin:
    """Test login endpoints."""

    def test_login_form_success(self, client, test_user):
        response = client.post(
            "/api/v1/auth/login",
            data={"username": "ci_testadmin", "password": "TestPass123!"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    def test_login_json_success(self, client, test_user):
        response = client.post(
            "/api/v1/auth/login-json",
            json={"username": "ci_testadmin", "password": "TestPass123!"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Logged in successfully"

    def test_login_wrong_password(self, client, test_user):
        response = client.post(
            "/api/v1/auth/login",
            data={"username": "ci_testadmin", "password": "WrongPassword"},
        )
        assert response.status_code == 401

    def test_login_nonexistent_user(self, client):
        response = client.post(
            "/api/v1/auth/login",
            data={"username": "nobody", "password": "pass"},
        )
        assert response.status_code == 401


class TestAuthenticatedEndpoints:
    """Test endpoints that require authentication."""

    def test_get_me(self, client, auth_headers):
        response = client.get("/api/v1/auth/me", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == "ci_testadmin"
        assert data["role"] == "company_admin"

    def test_get_me_no_auth(self, client):
        response = client.get("/api/v1/auth/me")
        assert response.status_code in [401, 403]

    def test_change_password_wrong_current(self, client, auth_headers):
        response = client.post(
            "/api/v1/auth/change-password",
            json={
                "current_password": "WrongOldPassword!",
                "new_password": "NewTestPass456!",
            },
            headers=auth_headers,
        )
        # Should reject wrong current password
        assert response.status_code in [400, 401, 422]


class TestLogout:
    """Test logout endpoint."""

    def test_logout(self, client):
        response = client.post("/api/v1/auth/logout")
        assert response.status_code == 200
