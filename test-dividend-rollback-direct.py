#!/usr/bin/env python3
"""
Direct test for dividend transaction rollback functionality
Creates a dividend transaction directly and tests deletion rollback
"""

import requests
import json
import time

# API Configuration
API_BASE_URL = "https://mreda8g340.execute-api.ap-northeast-1.amazonaws.com/development"

def test_dividend_rollback_direct():
    """Test dividend transaction rollback by creating and deleting a dividend transaction"""
    
    print("🧪 Testing Dividend Transaction Rollback (Direct Test)")
    print("=" * 60)
    
    # Step 1: Login
    print("1. Logging in...")
    login_response = requests.post(f"{API_BASE_URL}/auth/login", json={
        "email": "testuser@gmail.com",
        "password": "password123"
    })
    
    if login_response.status_code != 200:
        print("❌ Login failed")
        return False
    
    token = login_response.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("✅ Login successful")
    
    # Step 2: Get assets
    print("2. Getting user assets...")
    assets_response = requests.get(f"{API_BASE_URL}/assets", headers=headers)
    assets = assets_response.json()["assets"]
    test_asset = assets[0]
    asset_id = test_asset["asset_id"]
    ticker = test_asset["ticker_symbol"]
    print(f"✅ Using asset: {ticker} (ID: {asset_id})")
    
    # Step 3: Create a dividend record first
    print("3. Creating dividend record...")
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
    print(f"✅ Created dividend (ID: {dividend_id})")
    
    # Step 4: Manually mark dividend as processed (simulate processing)
    print("4. Manually marking dividend as processed...")
    
    # We'll create a dividend transaction manually to simulate processing
    transaction_data = {
        "asset_id": asset_id,
        "transaction_type": "Dividend",
        "shares": 0,  # Dividend transactions have 0 shares
        "price_per_share": 25.0,  # Total dividend amount (0.25 * 100 shares)
        "transaction_date": "2025-07-15",
        "currency": "USD"
    }
    
    transaction_response = requests.post(f"{API_BASE_URL}/transactions",
                                       json=transaction_data, headers=headers)
    
    if transaction_response.status_code != 201:
        print(f"❌ Failed to create dividend transaction: {transaction_response.text}")
        return False
    
    transaction = transaction_response.json()["transaction"]
    transaction_id = transaction["transaction_id"]
    print(f"✅ Created dividend transaction (ID: {transaction_id})")
    
    # Step 5: Test the rollback by deleting the transaction
    print("5. Testing rollback - deleting dividend transaction...")
    delete_response = requests.delete(f"{API_BASE_URL}/transactions/{transaction_id}",
                                    headers=headers)
    
    if delete_response.status_code != 200:
        print(f"❌ Failed to delete transaction: {delete_response.text}")
        return False
    
    delete_result = delete_response.json()
    print(f"✅ Transaction deleted successfully")
    print(f"   - Message: {delete_result.get('message', 'No message')}")
    print(f"   - Rollback applied: {delete_result.get('rollback_applied', False)}")
    print(f"   - Transaction type: {delete_result.get('transaction_type', 'Unknown')}")
    
    # Step 6: Verify the rollback worked
    success = False
    if delete_result.get('transaction_type') == 'Dividend':
        if delete_result.get('rollback_applied'):
            print("🎉 SUCCESS: Dividend transaction rollback logic is working!")
            print("✅ Bug fix verified: Dividend transactions trigger rollback logic")
            success = True
        else:
            print("❌ FAILURE: Dividend transaction rollback was not applied")
    else:
        print("❌ FAILURE: Transaction type not recognized as Dividend")
    
    # Step 7: Cleanup
    print("6. Cleaning up test dividend...")
    cleanup_response = requests.delete(f"{API_BASE_URL}/dividends/{dividend_id}",
                                     headers=headers)
    
    if cleanup_response.status_code == 200:
        print("✅ Test dividend cleaned up")
    else:
        print("⚠️ Failed to clean up test dividend")
    
    print("=" * 60)
    
    if success:
        print("🎉 TEST PASSED: Dividend transaction rollback fix is working!")
        print("✅ The bug has been successfully fixed:")
        print("   - Dividend transactions are properly identified")
        print("   - Rollback logic is triggered for Dividend transaction types")
        print("   - The system can now handle dividend transaction deletions")
    else:
        print("❌ TEST FAILED: Dividend transaction rollback needs more work")
    
    return success

if __name__ == "__main__":
    test_dividend_rollback_direct()
