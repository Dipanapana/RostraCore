import requests
import json

url = "http://localhost:8000/api/v1/roster/confirm"
data = [{"shift_id": 1, "employee_id": 1}]
headers = {"Content-Type": "application/json"}

try:
    print(f"Sending POST to {url} with data {data}")
    response = requests.post(url, json=data, headers=headers)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Request failed: {e}")
