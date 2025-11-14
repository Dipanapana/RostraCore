"""
Quick test script to verify clients endpoint is working.

Run this to diagnose clients page loading issues.
"""

import sys
from app.database import SessionLocal
from app.models.client import Client
from sqlalchemy import text


def test_clients_endpoint():
    """Test clients data and endpoint functionality."""
    print("=" * 60)
    print("CLIENTS ENDPOINT DIAGNOSTIC TEST")
    print("=" * 60)
    print()

    db = SessionLocal()

    try:
        # Test 1: Database connection
        print("[1/5] Testing database connection...")
        try:
            db.execute(text('SELECT 1'))
            print("    ✅ Database connection OK")
        except Exception as e:
            print(f"    ❌ Database connection failed: {e}")
            return

        # Test 2: Check if clients table exists
        print("\n[2/5] Checking clients table...")
        try:
            count = db.query(Client).count()
            print(f"    ✅ Clients table exists with {count} records")

            if count == 0:
                print("    ⚠️  WARNING: No clients in database!")
                print("       The clients page will show 'No clients found'")
        except Exception as e:
            print(f"    ❌ Clients table error: {e}")
            return

        # Test 3: Fetch all clients
        print("\n[3/5] Fetching all clients...")
        try:
            clients = db.query(Client).all()
            print(f"    ✅ Successfully fetched {len(clients)} clients")

            if len(clients) > 0:
                print("\n    Sample client data:")
                for i, client in enumerate(clients[:3], 1):
                    print(f"      {i}. ID: {client.client_id}, Name: {client.client_name}")
                    print(f"         Org ID: {client.org_id}, Status: {client.status}")
                    print()
        except Exception as e:
            print(f"    ❌ Failed to fetch clients: {e}")
            return

        # Test 4: Check for NULL org_id issues
        print("\n[4/5] Checking for NULL org_id...")
        try:
            null_org_clients = db.query(Client).filter(Client.org_id == None).all()
            if null_org_clients:
                print(f"    ⚠️  WARNING: {len(null_org_clients)} clients have NULL org_id")
                print("       These may cause filtering issues")
                for client in null_org_clients:
                    print(f"         - Client ID {client.client_id}: {client.client_name}")
            else:
                print("    ✅ All clients have org_id set")
        except Exception as e:
            print(f"    ❌ Failed to check org_id: {e}")

        # Test 5: Test the actual endpoint query logic
        print("\n[5/5] Testing endpoint query logic...")
        try:
            # Simulate what the endpoint does
            query = db.query(Client)
            # Optional org_id filter (not applied in test)
            # Optional status filter (not applied in test)
            clients_result = query.limit(100).all()

            print(f"    ✅ Endpoint query logic works: {len(clients_result)} clients")

            # Calculate site counts like the endpoint does
            from app.models.site import Site
            for i, client in enumerate(clients_result[:3], 1):
                site_count = db.query(Site).filter(Site.client_id == client.client_id).count()
                print(f"      {i}. {client.client_name}: {site_count} sites")

        except Exception as e:
            print(f"    ❌ Endpoint query logic failed: {e}")
            import traceback
            traceback.print_exc()

        # Summary
        print("\n" + "=" * 60)
        print("DIAGNOSTIC SUMMARY")
        print("=" * 60)

        if count == 0:
            print("\n⚠️  ISSUE FOUND: No clients in database")
            print("\nFIX: Add some clients using the frontend or SQL:")
            print("""
INSERT INTO clients (org_id, client_name, status, created_at)
VALUES (1, 'Test Client', 'active', NOW());
            """)
        else:
            print("\n✅ All checks passed!")
            print("\nIf the clients page is still loading forever:")
            print("1. Check browser console for errors (F12 → Console)")
            print("2. Check browser Network tab (F12 → Network)")
            print("3. Look for errors in backend logs")
            print("4. Verify token is being sent in request headers")
            print("5. Make sure frontend .env.local has correct API URL")

    except Exception as e:
        print(f"\n❌ UNEXPECTED ERROR: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    test_clients_endpoint()
