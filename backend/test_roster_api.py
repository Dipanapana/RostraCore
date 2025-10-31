"""Test roster API endpoint directly."""

import requests
import json
from datetime import datetime, timedelta

# Test API endpoint
url = "http://localhost:8000/api/v1/roster/generate"

# Calculate dates
start_date = datetime.now().date()
end_date = start_date + timedelta(days=7)

payload = {
    "start_date": start_date.isoformat(),
    "end_date": end_date.isoformat()
}

print(f"Testing roster generation...")
print(f"Payload: {json.dumps(payload, indent=2)}")
print(f"\nSending request to {url}...")

try:
    response = requests.post(url, json=payload, timeout=30)

    print(f"\nStatus Code: {response.status_code}")
    print(f"Headers: {dict(response.headers)}")

    if response.status_code == 200:
        result = response.json()
        print(f"\nSUCCESS!")
        print(f"Assignments: {len(result.get('assignments', []))}")
        print(f"Unfilled Shifts: {len(result.get('unfilled_shifts', []))}")
        print(f"Total Cost: R{result.get('summary', {}).get('total_cost', 0):.2f}")
    else:
        print(f"\nERROR Response:")
        try:
            error_data = response.json()
            print(json.dumps(error_data, indent=2))
        except:
            print(response.text)

except Exception as e:
    print(f"\nException: {e}")
    import traceback
    traceback.print_exc()
