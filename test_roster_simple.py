"""Simple test of roster generation API with better error reporting"""
import requests
import json
import traceback
import sys
import io

# Fix Windows console encoding
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

API_URL = "http://localhost:8001"

print("=" * 60)
print("ROSTER GENERATION API TEST")
print("=" * 60)

# Step 1: Login
print("\n[1/3] Logging in...")
try:
    login_response = requests.post(
        f"{API_URL}/api/v1/auth/login",
        data={
            "username": "testadmin",
            "password": "TestAdmin123!"
        },
        timeout=10
    )

    if login_response.status_code != 200:
        print(f"❌ Login failed: {login_response.status_code}")
        print(f"Response: {login_response.text}")
        exit(1)

    token = login_response.json()["access_token"]
    print(f"✅ Login successful")
    print(f"Token: {token[:30]}...")

except Exception as e:
    print(f"❌ Login error: {e}")
    traceback.print_exc()
    exit(1)

# Step 2: Test /auth/me endpoint
print("\n[2/3] Testing /auth/me endpoint...")
try:
    me_response = requests.get(
        f"{API_URL}/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
        timeout=10
    )

    if me_response.status_code == 200:
        user_data = me_response.json()
        print(f"✅ Auth verified")
        print(f"User: {user_data.get('username')} (org_id: {user_data.get('org_id')})")
    else:
        print(f"⚠️  Auth check failed: {me_response.status_code}")
        print(f"Response: {me_response.text}")

except Exception as e:
    print(f"⚠️  Auth check error: {e}")

# Step 3: Generate roster
print("\n[3/3] Generating roster...")
try:
    roster_response = requests.post(
        f"{API_URL}/api/v1/roster/generate?algorithm=production",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        },
        json={
            "start_date": "2025-11-19",
            "end_date": "2025-11-26",
            "site_ids": []
        },
        timeout=120
    )

    print(f"Status Code: {roster_response.status_code}")
    print(f"Content-Type: {roster_response.headers.get('content-type')}")
    print(f"Content Length: {len(roster_response.content)} bytes")

    if roster_response.status_code == 200:
        result = roster_response.json()
        print(f"\n✅ SUCCESS!")
        print(f"Assignments: {len(result.get('assignments', []))}")
        print(f"Unfilled: {len(result.get('unfilled_shifts', []))}")
        print(f"Status: {result.get('status')}")

        # Show summary if available
        if 'summary' in result:
            summary = result['summary']
            print(f"\nSummary:")
            print(f"  Total cost: R{summary.get('total_cost', 0):,.2f}")
            print(f"  Shifts filled: {summary.get('total_shifts_filled', 0)}")
            print(f"  Avg cost/shift: R{summary.get('average_cost_per_shift', 0):,.2f}")
    else:
        print(f"\n❌ FAILED!")
        print(f"Response text: {roster_response.text}")

        # Try to parse as JSON
        try:
            error_json = roster_response.json()
            print(f"Error JSON: {json.dumps(error_json, indent=2)}")
        except:
            print("(Not valid JSON)")

except requests.exceptions.Timeout:
    print(f"❌ Request timed out after 120 seconds")
except Exception as e:
    print(f"❌ Error: {e}")
    traceback.print_exc()

print("\n" + "=" * 60)
