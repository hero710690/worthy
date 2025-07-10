#!/usr/bin/env python3

import requests
import json
import psycopg2
from datetime import datetime

# Configuration
API_BASE_URL = 'https://mreda8g340.execute-api.ap-northeast-1.amazonaws.com/development'
DATABASE_URL = 'postgresql://worthy_admin:REDACTED_DB_PASSWORD@worthy-db-dev.ch0ccg6ycp7t.ap-northeast-1.rds.amazonaws.com:5432/worthy'

def get_auth_token():
    """Get authentication token for testing"""
    # Try to register a test user first
    register_data = {
        "name": "Edit Test User",
        "email": "edit.test@example.com",
        "password": "password123",
        "base_currency": "USD",
        "birth_year": 1990
    }
    
    # Try to register (might fail if user exists)
    requests.post(f"{API_BASE_URL}/auth/register", json=register_data)
    
    # Login
    login_data = {
        "email": "edit.test@example.com",
        "password": "password123"
    }
    
    response = requests.post(f"{API_BASE_URL}/auth/login", json=login_data)
    if response.status_code == 200:
        return response.json().get('token')
    else:
        print(f"❌ Login failed: {response.text}")
        return None

def create_test_transaction(token):
    """Create a test transaction to edit"""
    headers = {'Authorization': f'Bearer {token}'}
    
    # First create an asset
    asset_data = {
        "ticker_symbol": "TEST",
        "asset_type": "Stock",
        "total_shares": 100,
        "average_cost_basis": 50,
        "currency": "USD"
    }
    
    asset_response = requests.post(f"{API_BASE_URL}/assets", json=asset_data, headers=headers)
    if asset_response.status_code != 200:
        print(f"❌ Failed to create asset: {asset_response.text}")
        return None
    
    asset_id = asset_response.json()['asset']['asset_id']
    print(f"✅ Created test asset with ID: {asset_id}")
    
    # Create a transaction
    transaction_data = {
        "asset_id": asset_id,
        "transaction_type": "LumpSum",
        "shares": 10,
        "price_per_share": 55.50,
        "transaction_date": "2025-07-10",
        "currency": "USD"
    }
    
    txn_response = requests.post(f"{API_BASE_URL}/transactions", json=transaction_data, headers=headers)
    if txn_response.status_code != 200:
        print(f"❌ Failed to create transaction: {txn_response.text}")
        return None
    
    # Get the transaction ID from database
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        
        cur.execute("""
            SELECT transaction_id FROM transactions 
            WHERE asset_id = %s 
            ORDER BY created_at DESC 
            LIMIT 1
        """, (asset_id,))
        
        result = cur.fetchone()
        cur.close()
        conn.close()
        
        if result:
            transaction_id = result[0]
            print(f"✅ Created test transaction with ID: {transaction_id}")
            return transaction_id
        else:
            print("❌ Could not find created transaction")
            return None
            
    except Exception as e:
        print(f"❌ Database error: {e}")
        return None

def test_edit_transaction(token, transaction_id):
    """Test editing the transaction"""
    headers = {'Authorization': f'Bearer {token}'}
    
    print(f"\n🧪 Testing edit transaction {transaction_id}...")
    
    # Get current transaction details
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        
        cur.execute("""
            SELECT t.*, a.ticker_symbol 
            FROM transactions t
            JOIN assets a ON t.asset_id = a.asset_id
            WHERE t.transaction_id = %s
        """, (transaction_id,))
        
        before = cur.fetchone()
        cur.close()
        conn.close()
        
        if not before:
            print("❌ Transaction not found")
            return False
        
        print(f"📊 BEFORE EDIT:")
        print(f"   Shares: {before[3]}")
        print(f"   Price: ${before[4]}")
        print(f"   Date: {before[2]}")
        print(f"   Currency: {before[5]}")
        
    except Exception as e:
        print(f"❌ Database error: {e}")
        return False
    
    # Edit the transaction
    edit_data = {
        "shares": 15.5,  # Changed from 10
        "price_per_share": 60.25,  # Changed from 55.50
        "transaction_date": "2025-07-09",  # Changed date
        "currency": "USD"
    }
    
    print(f"\n🔄 Sending edit request...")
    print(f"   New Shares: {edit_data['shares']}")
    print(f"   New Price: ${edit_data['price_per_share']}")
    print(f"   New Date: {edit_data['transaction_date']}")
    
    response = requests.put(f"{API_BASE_URL}/transactions/{transaction_id}", json=edit_data, headers=headers)
    
    print(f"\n📡 API Response:")
    print(f"   Status Code: {response.status_code}")
    print(f"   Response: {response.text}")
    
    if response.status_code == 200:
        print("✅ Edit request successful!")
        
        # Verify the changes in database
        try:
            conn = psycopg2.connect(DATABASE_URL)
            cur = conn.cursor()
            
            cur.execute("""
                SELECT t.*, a.ticker_symbol 
                FROM transactions t
                JOIN assets a ON t.asset_id = a.asset_id
                WHERE t.transaction_id = %s
            """, (transaction_id,))
            
            after = cur.fetchone()
            cur.close()
            conn.close()
            
            if after:
                print(f"\n📊 AFTER EDIT:")
                print(f"   Shares: {after[3]} (was {before[3]})")
                print(f"   Price: ${after[4]} (was ${before[4]})")
                print(f"   Date: {after[2]} (was {before[2]})")
                print(f"   Currency: {after[5]} (was {before[5]})")
                
                # Check if changes were applied
                changes_applied = (
                    float(after[3]) == edit_data['shares'] and
                    float(after[4]) == edit_data['price_per_share'] and
                    str(after[2]) == edit_data['transaction_date']
                )
                
                if changes_applied:
                    print("✅ All changes successfully applied!")
                    return True
                else:
                    print("❌ Changes were not applied correctly")
                    return False
            else:
                print("❌ Could not retrieve updated transaction")
                return False
                
        except Exception as e:
            print(f"❌ Database verification error: {e}")
            return False
    else:
        print(f"❌ Edit request failed!")
        return False

def main():
    print("🧪 EDIT TRANSACTION FUNCTIONALITY TEST")
    print("=" * 50)
    
    # Get authentication token
    token = get_auth_token()
    if not token:
        print("❌ Could not get authentication token")
        return
    
    print("✅ Authentication successful")
    
    # Create a test transaction
    transaction_id = create_test_transaction(token)
    if not transaction_id:
        print("❌ Could not create test transaction")
        return
    
    # Test editing the transaction
    success = test_edit_transaction(token, transaction_id)
    
    if success:
        print("\n🎉 EDIT TRANSACTION TEST PASSED!")
        print("✅ Edit functionality is working correctly")
    else:
        print("\n❌ EDIT TRANSACTION TEST FAILED!")
        print("🔍 There may be an issue with the edit functionality")

if __name__ == "__main__":
    main()
