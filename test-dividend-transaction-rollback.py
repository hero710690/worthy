#!/usr/bin/env python3
"""
Test script to verify dividend transaction rollback functionality
Tests the bug fix for dividend records being rolled back to pending when transactions are deleted
"""

import requests
import json
import time

# API Configuration
API_BASE_URL = "https://mreda8g340.execute-api.ap-northeast-1.amazonaws.com/development"

def test_dividend_transaction_rollback():
    """Test the dividend transaction rollback functionality"""
    
    print("🧪 Testing Dividend Transaction Rollback Fix")
    print("=" * 60)
    
    # Step 1: Login to get authentication token
    print("1. Logging in...")
    login_response = requests.post(f"{API_BASE_URL}/auth/login", json={
        "email": "testuser@gmail.com",
        "password": "password123"
    })
    
    if login_response.status_code != 200:
        print("❌ Login failed. Please ensure test user exists.")
        return False
    
    token = login_response.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    print("✅ Login successful")
    
    # Step 2: Get user's assets
    print("2. Getting user assets...")
    assets_response = requests.get(f"{API_BASE_URL}/assets", headers=headers)
    
    if assets_response.status_code != 200:
        print("❌ Failed to get assets")
        return False
    
    assets = assets_response.json()["assets"]
    if not assets:
        print("❌ No assets found. Please create some assets first.")
        return False
    
    test_asset = assets[0]  # Use first asset for testing
    asset_id = test_asset["asset_id"]
    ticker = test_asset["ticker_symbol"]
    
    print(f"✅ Using asset: {ticker} (ID: {asset_id})")
    
    # Step 3: Create a test dividend
    print("3. Creating test dividend...")
    dividend_data = {
        "asset_id": asset_id,
        "dividend_per_share": 0.25,
        "ex_dividend_date": "2025-07-01",
        "payment_date": "2025-07-15",
        "tax_rate": 20.0
    }
    
    dividend_response = requests.post(f"{API_BASE_URL}/dividends", 
                                    json=dividend_data, headers=headers)
    
    if dividend_response.status_code != 201:
        print(f"❌ Failed to create dividend: {dividend_response.text}")
        return False
    
    dividend = dividend_response.json()["dividend"]
    dividend_id = dividend["dividend_id"]
    
    print(f"✅ Created dividend: ${dividend['dividend_per_share']}/share (ID: {dividend_id})")
    
    # Step 4: Process the dividend (this should create a transaction)
    print("4. Processing dividend (reinvest)...")
    process_data = {
        "action": "reinvest",
        "reinvest_asset_id": asset_id
    }
    
    process_response = requests.post(f"{API_BASE_URL}/dividends/{dividend_id}/process",
                                   json=process_data, headers=headers)
    
    if process_response.status_code != 200:
        print(f"❌ Failed to process dividend: {process_response.text}")
        return False
    
    print("✅ Dividend processed successfully")
    
    # Step 5: Verify dividend is now processed
    print("5. Verifying dividend status...")
    dividends_response = requests.get(f"{API_BASE_URL}/dividends", headers=headers)
    
    if dividends_response.status_code != 200:
        print("❌ Failed to get dividends")
        return False
    
    dividends = dividends_response.json()["dividends"]
    test_dividend = next((d for d in dividends if d["dividend_id"] == dividend_id), None)
    
    if not test_dividend:
        print("❌ Test dividend not found")
        return False
    
    if test_dividend["status"] != "processed":
        print(f"❌ Expected dividend status 'processed', got '{test_dividend['status']}'")
        return False
    
    print("✅ Dividend status is 'processed'")
    
    # Step 6: Get transactions to find the dividend transaction
    print("6. Finding dividend transaction...")
    transactions_response = requests.get(f"{API_BASE_URL}/transactions", headers=headers)
    
    if transactions_response.status_code != 200:
        print("❌ Failed to get transactions")
        return False
    
    transactions = transactions_response.json()["transactions"]
    dividend_transaction = next((t for t in transactions 
                               if t["transaction_type"] == "Dividend" 
                               and t["asset_id"] == asset_id), None)
    
    if not dividend_transaction:
        print("❌ Dividend transaction not found")
        return False
    
    transaction_id = dividend_transaction["transaction_id"]
    print(f"✅ Found dividend transaction (ID: {transaction_id})")
    
    # Step 7: Delete the dividend transaction (this should trigger rollback)
    print("7. Deleting dividend transaction...")
    delete_response = requests.delete(f"{API_BASE_URL}/transactions/{transaction_id}",
                                    headers=headers)
    
    if delete_response.status_code != 200:
        print(f"❌ Failed to delete transaction: {delete_response.text}")
        return False
    
    delete_result = delete_response.json()
    print(f"✅ Transaction deleted. Rollback applied: {delete_result.get('rollback_applied', False)}")
    
    # Step 8: Verify dividend is rolled back to pending
    print("8. Verifying dividend rollback...")
    time.sleep(1)  # Give a moment for the rollback to process
    
    dividends_response = requests.get(f"{API_BASE_URL}/dividends", headers=headers)
    
    if dividends_response.status_code != 200:
        print("❌ Failed to get dividends after rollback")
        return False
    
    dividends = dividends_response.json()["dividends"]
    test_dividend = next((d for d in dividends if d["dividend_id"] == dividend_id), None)
    
    if not test_dividend:
        print("❌ Test dividend not found after rollback")
        return False
    
    expected_status = "pending"
    actual_status = test_dividend["status"]
    
    if actual_status == expected_status:
        print(f"✅ SUCCESS: Dividend status rolled back to '{actual_status}'")
        success = True
    else:
        print(f"❌ FAILURE: Expected dividend status '{expected_status}', got '{actual_status}'")
        success = False
    
    # Step 9: Cleanup - delete the test dividend
    print("9. Cleaning up test dividend...")
    cleanup_response = requests.delete(f"{API_BASE_URL}/dividends/{dividend_id}",
                                     headers=headers)
    
    if cleanup_response.status_code == 200:
        print("✅ Test dividend cleaned up")
    else:
        print("⚠️ Failed to clean up test dividend (manual cleanup may be needed)")
    
    print("=" * 60)
    
    if success:
        print("🎉 TEST PASSED: Dividend transaction rollback is working correctly!")
        print("✅ Bug fix verified: Dividends are properly rolled back to pending when transactions are deleted")
    else:
        print("❌ TEST FAILED: Dividend transaction rollback is not working")
        print("🐛 Bug still exists: Dividends are not being rolled back to pending")
    
    return success

if __name__ == "__main__":
    test_dividend_transaction_rollback()
