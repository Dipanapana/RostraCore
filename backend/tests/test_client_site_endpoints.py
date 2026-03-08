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


class TestClientCRUD:
    """Extended client CRUD tests."""

    def test_create_client_full_fields(self, client, auth_headers):
        """Create a client with all optional fields populated."""
        response = client.post(
            "/api/v1/clients/",
            json={
                "client_name": "Full Fields Corp",
                "contact_person": "Jane Full",
                "contact_email": "jane@fullfields.co.za",
                "contact_phone": "010-555-9876",
                "address": "1 Main Street, Sandton",
                "status": "active",
                "province": "Gauteng",
                "city": "Sandton",
                "billing_rate": 250.00,
                "payment_terms_days": 30,
                "industry_sector": "Retail",
            },
            headers=auth_headers,
        )
        assert response.status_code in [200, 201]
        data = response.json()
        assert data["client_name"] == "Full Fields Corp"
        assert data["province"] == "Gauteng"

    def test_create_client_missing_name(self, client, auth_headers):
        """Creating a client without the required client_name should fail with 422."""
        response = client.post(
            "/api/v1/clients/",
            json={"contact_person": "No Name"},
            headers=auth_headers,
        )
        assert response.status_code in [400, 422]

    def test_get_client_by_id(self, client, auth_headers):
        """Create a client then retrieve it by its ID."""
        create_resp = client.post(
            "/api/v1/clients/",
            json={
                "client_name": "Get By ID Corp",
                "contact_email": "getbyid@test.co.za",
            },
            headers=auth_headers,
        )
        assert create_resp.status_code in [200, 201]
        client_id = create_resp.json().get("client_id")

        get_resp = client.get(f"/api/v1/clients/{client_id}", headers=auth_headers)
        assert get_resp.status_code == 200
        assert get_resp.json()["client_id"] == client_id
        assert get_resp.json()["client_name"] == "Get By ID Corp"

    def test_get_nonexistent_client_returns_404(self, client, auth_headers):
        """Requesting a client ID that does not exist should return 404."""
        response = client.get("/api/v1/clients/999999999", headers=auth_headers)
        assert response.status_code == 404

    def test_update_client(self, client, auth_headers):
        """Create a client, then update its name and billing rate."""
        create_resp = client.post(
            "/api/v1/clients/",
            json={"client_name": "Original Name Ltd"},
            headers=auth_headers,
        )
        assert create_resp.status_code in [200, 201]
        client_id = create_resp.json().get("client_id")

        update_resp = client.put(
            f"/api/v1/clients/{client_id}",
            json={"client_name": "Updated Name Ltd", "billing_rate": 300.00},
            headers=auth_headers,
        )
        assert update_resp.status_code == 200
        data = update_resp.json()
        assert data["client_name"] == "Updated Name Ltd"
        assert data["billing_rate"] == 300.00

    def test_list_clients_filter_by_status(self, client, auth_headers):
        """List endpoint honours the status query param."""
        # Create an active and an inactive client so the filter has data to act on
        client.post(
            "/api/v1/clients/",
            json={"client_name": "Active Filter Client", "status": "active"},
            headers=auth_headers,
        )
        client.post(
            "/api/v1/clients/",
            json={"client_name": "Inactive Filter Client", "status": "inactive"},
            headers=auth_headers,
        )

        active_resp = client.get(
            "/api/v1/clients/?status=active", headers=auth_headers
        )
        assert active_resp.status_code == 200
        data = active_resp.json()
        assert isinstance(data, list)
        for record in data:
            assert record["status"] == "active"

    def test_contract_alerts_endpoint(self, client, auth_headers):
        """Contract alerts endpoint returns the expected summary keys."""
        response = client.get("/api/v1/clients/contract-alerts", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "summary" in data
        assert "alerts" in data
        assert "as_of" in data

    def test_get_client_sites(self, client, auth_headers):
        """Create a client with a site and verify the sites sub-resource is returned."""
        create_resp = client.post(
            "/api/v1/clients/",
            json={"client_name": "Client With Sites"},
            headers=auth_headers,
        )
        assert create_resp.status_code in [200, 201]
        client_id = create_resp.json().get("client_id")

        # Attach a site
        client.post(
            "/api/v1/sites/",
            json={
                "site_name": "Sub-resource Site",
                "client_name": "Client With Sites",
                "client_id": client_id,
                "address": "99 Resource Road",
                "city": "Cape Town",
                "province": "Western Cape",
                "min_staff": 1,
            },
            headers=auth_headers,
        )

        sites_resp = client.get(
            f"/api/v1/clients/{client_id}/sites", headers=auth_headers
        )
        assert sites_resp.status_code == 200
        assert isinstance(sites_resp.json(), list)
