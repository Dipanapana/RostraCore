"""Test roster generation via API to see actual error"""
import requests
import json

# First login to get token
print("=== LOGIN ===")
login_response = requests.post(
    "http://localhost:8001/api/v1/auth/login",
    data={
        "username": "testadmin",
        "password": "TestAdmin123!"
    }
)
print(f"Login Status: {login_response.status_code}")
if login_response.status_code == 200:
    token = login_response.json()["access_token"]
    print(f"Token: {token[:50]}...")
else:
    print(f"Login failed: {login_response.text}")
    exit(1)

# Now try roster generation
print("\n=== ROSTER GENERATION ===")
headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}
payload = {
    "start_date": "2025-11-19",
    "end_date": "2025-11-26",
    "site_ids": []
}

try:
    response = requests.post(
        "http://localhost:8001/api/v1/roster/generate?algorithm=production",
        headers=headers,
        json=payload,
        timeout=60
    )

    print(f"Status Code: {response.status_code}")
    print(f"Content-Type: {response.headers.get('content-type')}")
    print(f"Content Length: {len(response.content)} bytes")

    if response.status_code == 200:
        result = response.json()
        print(f"\nSuccess!")
        print(f"Assignments: {len(result.get('assignments', []))}")
        print(f"Unfilled: {len(result.get('unfilled_shifts', []))}")
    else:
        print(f"\nError Response:")
        print(f"Text: {response.text}")

        # Try to parse as JSON anyway
        try:
            error_json = response.json()
            print(f"JSON Error: {json.dumps(error_json, indent=2)}")
        except:
            print("Not JSON - raw text above")

except Exception as e:
    print(f"Exception: {e}")
    import traceback
    traceback.print_exc()
