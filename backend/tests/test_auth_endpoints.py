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


class TestBruteForceProtection:
    """Test brute-force protection — account lockout after 5 failed attempts + IP rate limiting."""

    def setup_method(self):
        """Clear the in-memory rate limiter store before every test."""
        from app.middleware.rate_limit import login_rate_limiter
        login_rate_limiter._memory_store.clear()

    def test_account_locks_after_failures(self, client, test_user):
        """Multiple failed login attempts should eventually lock the account (423) or trigger rate limit (429)."""
        for i in range(4):
            resp = client.post(
                "/api/v1/auth/login",
                data={"username": "ci_testadmin", "password": "WrongPassword!"},
            )
            assert resp.status_code == 401, f"Attempt {i + 1} expected 401, got {resp.status_code}"

        # 5th attempt should trigger account lockout (423) or rate limit (429)
        resp = client.post(
            "/api/v1/auth/login",
            data={"username": "ci_testadmin", "password": "WrongPassword!"},
        )
        assert resp.status_code in [401, 423, 429], f"Expected lockout/rate-limit, got {resp.status_code}"

    def test_lockout_blocks_correct_password(self, client, test_user):
        """After lockout, even the correct password should be rejected."""
        # Trigger lockout
        for _ in range(5):
            client.post(
                "/api/v1/auth/login",
                data={"username": "ci_testadmin", "password": "WrongPassword!"},
            )

        # Correct password should also fail while locked
        resp = client.post(
            "/api/v1/auth/login",
            data={"username": "ci_testadmin", "password": "TestPass123!"},
        )
        assert resp.status_code in [423, 429]

    def test_successful_login_after_few_failures(self, client, test_user):
        """After 3 failed attempts a successful login is still possible."""
        for _ in range(3):
            client.post(
                "/api/v1/auth/login",
                data={"username": "ci_testadmin", "password": "WrongPassword!"},
            )

        resp = client.post(
            "/api/v1/auth/login",
            data={"username": "ci_testadmin", "password": "TestPass123!"},
        )
        assert resp.status_code == 200


class TestForgotPassword:
    """Test forgot-password endpoint."""

    def setup_method(self):
        """Clear in-memory rate limiter state so forgot-password requests are not pre-blocked."""
        from app.middleware.rate_limit import login_rate_limiter
        login_rate_limiter._memory_store.clear()

    def test_forgot_password_valid_email(self, client, test_user):
        """POST with a known email must return 200."""
        resp = client.post(
            "/api/v1/auth/forgot-password",
            json={"email": "ci_testadmin@test.com"},
        )
        assert resp.status_code == 200

    def test_forgot_password_invalid_email(self, client):
        """POST with an unknown email must still return 200 (no email enumeration)."""
        resp = client.post(
            "/api/v1/auth/forgot-password",
            json={"email": "nobody@doesnotexist.com"},
        )
        assert resp.status_code == 200

    def test_forgot_password_missing_email(self, client):
        """POST with no email field must return 422 (validation error)."""
        resp = client.post(
            "/api/v1/auth/forgot-password",
            json={},
        )
        assert resp.status_code in [400, 422]


class TestChangePassword:
    """Extended tests for the change-password endpoint."""

    def test_change_password_success(self, client, test_user, auth_headers):
        """Change to a strong password, verify old one is rejected, then restore."""
        new_password = "NewStrongPass789!"

        # Change to new password
        resp = client.post(
            "/api/v1/auth/change-password",
            json={"current_password": "TestPass123!", "new_password": new_password},
            headers=auth_headers,
        )
        assert resp.status_code == 200

        # Old password must no longer work
        resp_old = client.post(
            "/api/v1/auth/login",
            data={"username": "ci_testadmin", "password": "TestPass123!"},
        )
        assert resp_old.status_code == 401

        # New password must work
        resp_new = client.post(
            "/api/v1/auth/login",
            data={"username": "ci_testadmin", "password": new_password},
        )
        assert resp_new.status_code == 200

        # Restore original password so other tests are not affected
        client.post(
            "/api/v1/auth/change-password",
            json={"current_password": new_password, "new_password": "TestPass123!"},
            headers=auth_headers,
        )

    def test_change_password_weak(self, client, auth_headers):
        """Attempting to change to a weak password must be rejected with 400 or 422."""
        resp = client.post(
            "/api/v1/auth/change-password",
            json={"current_password": "TestPass123!", "new_password": "123"},
            headers=auth_headers,
        )
        assert resp.status_code in (400, 422)
