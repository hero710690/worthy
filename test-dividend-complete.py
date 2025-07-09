#!/usr/bin/env python3
"""
Complete test script for dividend functionality
Tests the full flow: login -> get assets -> create dividend -> get dividends
"""

import requests
import json
import time

API_BASE_URL = "https://mreda8g340.execute-api.ap-northeast-1.amazonaws.com/development"

def test_dividend_functionality():
    print("🧪 Complete Dividend Functionality Test")
    print("=" * 60)
    
    # Step 1: Login to get a fresh token
    print("\n1️⃣ Logging in to get fresh token...")
    login_data = {
        "email": "testuser@worthy.com",
        "password": "password123"
    }
    
    try:
        response = requests.post(f"{API_BASE_URL}/auth/login", json=login_data)
        if response.status_code == 200:
            login_result = response.json()
            token = login_result.get("token")
            user = login_result.get("user", {})
            print(f"✅ Login successful! User: {user.get('name', 'Unknown')}")
            print(f"🔑 Token: {token[:20]}...")
        else:
            print(f"❌ Login failed: {response.status_code} - {response.text}")
            return
    except Exception as e:
        print(f"❌ Login error: {e}")
        return
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Step 2: Get user's assets
    print("\n2️⃣ Getting user assets...")
    try:
        response = requests.get(f"{API_BASE_URL}/assets", headers=headers)
        if response.status_code == 200:
            assets_data = response.json()
            assets = assets_data.get("assets", [])
            print(f"✅ Found {len(assets)} assets")
            
            if assets:
                # Show first few assets
                for i, asset in enumerate(assets[:3]):
                    print(f"   Asset {i+1}: {asset['ticker_symbol']} - {asset['total_shares']} shares")
                
                # Use first asset for dividend test
                test_asset = assets[0]
                asset_id = test_asset['asset_id']
                ticker = test_asset['ticker_symbol']
                shares = float(test_asset['total_shares'])
                print(f"📊 Using {ticker} (ID: {asset_id}) for dividend test")
            else:
                print("❌ No assets found. Please add some assets first.")
                return
        else:
            print(f"❌ Failed to get assets: {response.status_code} - {response.text}")
            return
    except Exception as e:
        print(f"❌ Assets error: {e}")
        return
    
    # Step 3: Test getting dividends (should be empty initially)
    print("\n3️⃣ Getting current dividends...")
    try:
        response = requests.get(f"{API_BASE_URL}/dividends", headers=headers)
        if response.status_code == 200:
            dividends_data = response.json()
            dividends = dividends_data.get("dividends", [])
            total_pending = dividends_data.get("total_pending", 0)
            total_processed = dividends_data.get("total_processed", 0)
            print(f"✅ Current dividends: {len(dividends)} total")
            print(f"💰 Pending: ${total_pending:.2f}, Processed: ${total_processed:.2f}")
        else:
            print(f"❌ Failed to get dividends: {response.status_code} - {response.text}")
            return
    except Exception as e:
        print(f"❌ Dividends error: {e}")
        return
    
    # Step 4: Create a test dividend
    print(f"\n4️⃣ Creating test dividend for {ticker}...")
    dividend_data = {
        "asset_id": asset_id,
        "dividend_per_share": 0.25,
        "ex_dividend_date": "2025-07-09",
        "payment_date": "2025-07-15",
        "currency": "USD"
    }
    
    try:
        response = requests.post(f"{API_BASE_URL}/dividends", json=dividend_data, headers=headers)
        if response.status_code == 201:
            dividend_result = response.json()
            dividend = dividend_result.get("dividend", {})
            dividend_id = dividend.get("dividend_id")
            total_dividend = dividend.get("total_dividend", 0)
            print(f"✅ Dividend created successfully!")
            print(f"🆔 Dividend ID: {dividend_id}")
            print(f"💵 Total dividend: ${total_dividend:.2f} ({shares} shares × $0.25)")
        else:
            print(f"❌ Failed to create dividend: {response.status_code} - {response.text}")
            return
    except Exception as e:
        print(f"❌ Create dividend error: {e}")
        return
    
    # Step 5: Get dividends again to verify creation
    print("\n5️⃣ Verifying dividend creation...")
    try:
        response = requests.get(f"{API_BASE_URL}/dividends", headers=headers)
        if response.status_code == 200:
            dividends_data = response.json()
            dividends = dividends_data.get("dividends", [])
            total_pending = dividends_data.get("total_pending", 0)
            print(f"✅ Updated dividends: {len(dividends)} total")
            print(f"💰 Pending: ${total_pending:.2f}")
            
            if dividends:
                latest_dividend = dividends[-1]  # Should be our newly created dividend
                print(f"📋 Latest dividend: {latest_dividend['ticker_symbol']} - ${latest_dividend['total_dividend']:.2f}")
        else:
            print(f"❌ Failed to verify dividends: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"❌ Verify dividends error: {e}")
    
    # Step 6: Test auto-detect dividends
    print("\n6️⃣ Testing auto-detect dividends...")
    try:
        response = requests.post(f"{API_BASE_URL}/dividends/auto-detect", headers=headers)
        if response.status_code == 200:
            detect_result = response.json()
            detected = detect_result.get("detected", 0)
            message = detect_result.get("message", "")
            print(f"✅ Auto-detect completed: {detected} dividends detected")
            print(f"📝 Message: {message}")
        else:
            print(f"❌ Auto-detect failed: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"❌ Auto-detect error: {e}")
    
    print("\n" + "=" * 60)
    print("🎉 Dividend functionality test completed!")
    print("\n🌐 Test the UI at: https://ds8jn7fwox3fb.cloudfront.net")
    print("📱 Navigate to 'Dividends' in the sidebar to see the interface")

if __name__ == "__main__":
    test_dividend_functionality()
