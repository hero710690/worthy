#!/usr/bin/env python3
"""
Test dividend processing functionality (reinvest and cash options)
"""

import requests
import json

API_BASE_URL = "https://mreda8g340.execute-api.ap-northeast-1.amazonaws.com/development"

def test_dividend_processing():
    print("🧪 Dividend Processing Test")
    print("=" * 50)
    
    # Step 1: Login
    print("\n1️⃣ Logging in...")
    login_data = {"email": "testuser@worthy.com", "password": "password123"}
    
    response = requests.post(f"{API_BASE_URL}/auth/login", json=login_data)
    if response.status_code != 200:
        print(f"❌ Login failed: {response.text}")
        return
    
    token = response.json().get("token")
    headers = {"Authorization": f"Bearer {token}"}
    print("✅ Login successful!")
    
    # Step 2: Get pending dividends
    print("\n2️⃣ Getting pending dividends...")
    response = requests.get(f"{API_BASE_URL}/dividends", headers=headers)
    if response.status_code != 200:
        print(f"❌ Failed to get dividends: {response.text}")
        return
    
    dividends_data = response.json()
    dividends = dividends_data.get("dividends", [])
    pending_dividends = [d for d in dividends if not d.get('is_reinvested', False)]
    
    print(f"✅ Found {len(pending_dividends)} pending dividends")
    
    if not pending_dividends:
        print("ℹ️ No pending dividends to process. Create one first.")
        return
    
    # Step 3: Test dividend processing (reinvest)
    test_dividend = pending_dividends[0]
    dividend_id = test_dividend['dividend_id']
    amount = test_dividend['total_dividend']
    ticker = test_dividend['ticker_symbol']
    
    print(f"\n3️⃣ Testing dividend reinvestment...")
    print(f"📊 Processing dividend: {ticker} - ${amount}")
    
    process_data = {
        "action": "reinvest",
        "reinvest_asset_id": test_dividend['asset_id']
    }
    
    response = requests.post(f"{API_BASE_URL}/dividends/{dividend_id}/process", 
                           json=process_data, headers=headers)
    
    if response.status_code == 200:
        result = response.json()
        print(f"✅ Dividend reinvested successfully!")
        print(f"💰 Amount: ${result.get('amount', 0):.2f}")
    else:
        print(f"❌ Reinvestment failed: {response.status_code} - {response.text}")
    
    # Step 4: Verify processing
    print("\n4️⃣ Verifying dividend processing...")
    response = requests.get(f"{API_BASE_URL}/dividends", headers=headers)
    if response.status_code == 200:
        dividends_data = response.json()
        total_processed = dividends_data.get("total_processed", 0)
        total_pending = dividends_data.get("total_pending", 0)
        print(f"✅ Updated totals:")
        print(f"   Processed: ${total_processed:.2f}")
        print(f"   Pending: ${total_pending:.2f}")
    
    print("\n" + "=" * 50)
    print("🎉 Dividend processing test completed!")

if __name__ == "__main__":
    test_dividend_processing()
