import requests
import json
from datetime import datetime, timedelta

# Test roster generation
API_URL = "http://localhost:8000"

# Login first
login_response = requests.post(
    f"{API_URL}/api/v1/auth/login",
    data={"username": "admin@guardianos.co.za", "password": "admin123"}
)

if login_response.status_code == 200:
    token = login_response.json()["access_token"]
    print(f"✓ Login successful, token: {token[:20]}...")
    
    # Try to generate roster
    start_date = datetime.now().date()
    end_date = start_date + timedelta(days=7)
    
    roster_request = {
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "site_ids": []  # Empty means all sites
    }
    
    print(f"\nGenerating roster from {start_date} to {end_date}...")
    
    roster_response = requests.post(
        f"{API_URL}/api/v1/roster/generate",
        headers={"Authorization": f"Bearer {token}"},
        json=roster_request
    )
    
    print(f"Status: {roster_response.status_code}")
    print(f"Response: {roster_response.text[:500]}")
    
else:
    print(f"✗ Login failed: {login_response.status_code}")
    print(login_response.text)
