"""Integration tests for client and site endpoints."""

import pytest

pytestmark = pytest.mark.integration


class TestClientEndpoints:
    """Test client CRUD endpoints."""

    def test_list_clients(self, client, auth_headers):
        response = client.get("/api/v1/clients/", headers=auth_headers)
        assert response.status_code == 200

    def test_create_client(self, client, auth_headers):
        response = client.post(
            "/api/v1/clients/",
            json={
                "client_name": "Test Client Co",
                "contact_person": "Bob Test",
                "contact_email": "bob@testclient.co.za",
                "contact_phone": "011-123-4567",
            },
            headers=auth_headers,
        )
        assert response.status_code in [200, 201]
        data = response.json()
        assert data["client_name"] == "Test Client Co"

    def test_list_clients_no_auth(self, client):
        response = client.get("/api/v1/clients/")
        assert response.status_code in [401, 403]


class TestSiteEndpoints:
    """Test site CRUD endpoints."""

    def test_list_sites(self, client, auth_headers):
        response = client.get("/api/v1/sites/", headers=auth_headers)
        assert response.status_code == 200

    def test_create_site(self, client, auth_headers):
        # First create a client
        client_resp = client.post(
            "/api/v1/clients/",
            json={
                "client_name": "Site Test Client",
                "contact_person": "Alice",
                "contact_email": "alice@sitetest.co.za",
            },
            headers=auth_headers,
        )
        if client_resp.status_code in [200, 201]:
            client_id = client_resp.json().get("client_id")
            # Create a site
            response = client.post(
                "/api/v1/sites/",
                json={
                    "site_name": "Test Mall",
                    "client_name": "Site Test Client",
                    "client_id": client_id,
                    "address": "123 Test Street, Johannesburg",
                    "city": "Johannesburg",
                    "province": "Gauteng",
                    "min_staff": 2,
                },
                headers=auth_headers,
            )
            assert response.status_code in [200, 201]

    def test_list_sites_no_auth(self, client):
        response = client.get("/api/v1/sites/")
        assert response.status_code in [401, 403]
