import requests

# Login
resp = requests.post('http://localhost:8001/api/v1/auth/login-json', json={
    'username': 'testadmin2138',
    'password': 'TestPassword123!'
})

print("Login status:", resp.status_code)
print("Login response:", resp.json())
 
if resp.status_code == 200:
    token = resp.json()['access_token']
    print(f"\nToken (first 30 chars): {token[:30]}...")

    # Test /auth/me
    me_resp = requests.get('http://localhost:8001/api/v1/auth/me', headers={
        'Authorization': f'Bearer {token}'
    })
    print(f"\n/auth/me status: {me_resp.status_code}")
    if me_resp.status_code == 200:
        print("/auth/me response:", me_resp.json())
    else:
        print("/auth/me error:", me_resp.text)
