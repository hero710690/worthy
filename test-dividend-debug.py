#!/usr/bin/env python3
"""
Debug script for dividend functionality
"""

import requests
import json

API_BASE_URL = "https://mreda8g340.execute-api.ap-northeast-1.amazonaws.com/development"
TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxMSwiZW1haWwiOiJ0ZXN0dXNlckB3b3J0aHkuY29tIiwiZXhwIjoxNzUyMTE5MDQyLCJpYXQiOjE7NTIwMzI2NDJ9.a7yg0Pw8wyFQR075VPS5Xzd3moWPjNrB25AiaKgMXWg"

headers = {"Authorization": f"Bearer {TOKEN}"}

print("🔍 Testing Dividend Functionality Debug")
print("=" * 50)

# Test 1: Check if we can get assets (this should work)
print("\n1️⃣ Testing assets endpoint...")
try:
    response = requests.get(f"{API_BASE_URL}/assets", headers=headers)
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        assets = response.json().get("assets", [])
        print(f"✅ Found {len(assets)} assets")
        for asset in assets:
            print(f"   - {asset['ticker_symbol']}: {asset['total_shares']} shares")
    else:
        print(f"❌ Error: {response.text}")
except Exception as e:
    print(f"❌ Exception: {e}")

# Test 2: Try to get dividends (this is failing)
print("\n2️⃣ Testing dividends GET endpoint...")
try:
    response = requests.get(f"{API_BASE_URL}/dividends", headers=headers)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"❌ Exception: {e}")

# Test 3: Try to create a dividend manually
print("\n3️⃣ Testing dividend creation...")
dividend_data = {
    "asset_id": 12,  # AAPL asset from our previous tests
    "dividend_per_share": 0.25,
    "ex_dividend_date": "2025-07-09",
    "payment_date": "2025-07-15",
    "currency": "USD"
}

try:
    response = requests.post(f"{API_BASE_URL}/dividends", 
                           json=dividend_data, headers=headers)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"❌ Exception: {e}")

# Test 4: Check health endpoint
print("\n4️⃣ Testing health endpoint...")
try:
    response = requests.get(f"{API_BASE_URL}/health")
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"❌ Exception: {e}")

print("\n" + "=" * 50)
print("Debug test complete!")
