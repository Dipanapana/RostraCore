import requests

# Login first
resp = requests.post('http://localhost:8001/api/v1/auth/login-json', json={
    'username': 'testadmin2138',
    'password': 'TestPassword123!'
})

token = resp.json()['access_token']
print(f"Got token: {token[:30]}...")

# Test dashboard metrics
metrics_resp = requests.get('http://localhost:8001/api/v1/dashboard/metrics', headers={
    'Authorization': f'Bearer {token}'
})

print(f"\nDashboard metrics status: {metrics_resp.status_code}")
if metrics_resp.status_code == 200:
    print("Dashboard response:", metrics_resp.json())
else:
    print("Error:", metrics_resp.text)
