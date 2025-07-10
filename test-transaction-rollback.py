#!/usr/bin/env python3

import psycopg2
import requests
import json
from datetime import datetime

# Database connection
DATABASE_URL = 'postgresql://worthy_admin:REDACTED_DB_PASSWORD@worthy-db-dev.ch0ccg6ycp7t.ap-northeast-1.rds.amazonaws.com:5432/worthy'
API_BASE_URL = 'https://mreda8g340.execute-api.ap-northeast-1.amazonaws.com/development'

def get_auth_token():
    """Get authentication token for testing"""
    # Use Jean's account for testing
    login_data = {
        "email": "hero710690@gmail.com",
        "password": "REDACTED_DB_PASSWORD"
    }
    
    response = requests.post(f"{API_BASE_URL}/auth/login", json=login_data)
    if response.status_code == 200:
        return response.json().get('token')
    else:
        print(f"❌ Login failed: {response.text}")
        return None

def get_asset_details(asset_id):
    """Get asset details from database"""
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        
        cur.execute("""
            SELECT asset_id, ticker_symbol, total_shares, average_cost_basis, currency
            FROM assets WHERE asset_id = %s
        """, (asset_id,))
        
        asset = cur.fetchone()
        cur.close()
        conn.close()
        
        if asset:
            return {
                'asset_id': asset[0],
                'ticker_symbol': asset[1], 
                'total_shares': float(asset[2]),
                'average_cost_basis': float(asset[3]),
                'currency': asset[4]
            }
        return None
        
    except Exception as e:
        print(f"❌ Error getting asset details: {e}")
        return None

def get_recent_transactions(asset_id, limit=5):
    """Get recent transactions for an asset"""
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        
        cur.execute("""
            SELECT transaction_id, transaction_type, transaction_date, shares, price_per_share, currency, created_at
            FROM transactions 
            WHERE asset_id = %s 
            ORDER BY created_at DESC 
            LIMIT %s
        """, (asset_id, limit))
        
        transactions = cur.fetchall()
        cur.close()
        conn.close()
        
        result = []
        for txn in transactions:
            result.append({
                'transaction_id': txn[0],
                'transaction_type': txn[1],
                'transaction_date': txn[2],
                'shares': float(txn[3]),
                'price_per_share': float(txn[4]),
                'currency': txn[5],
                'created_at': txn[6]
            })
        
        return result
        
    except Exception as e:
        print(f"❌ Error getting transactions: {e}")
        return []

def test_transaction_rollback(transaction_id, token):
    """Test transaction deletion and rollback"""
    print(f"\n🧪 Testing rollback for transaction ID: {transaction_id}")
    
    # Get transaction details first
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        
        cur.execute("""
            SELECT t.*, a.asset_id, a.ticker_symbol, a.total_shares, a.average_cost_basis
            FROM transactions t
            JOIN assets a ON t.asset_id = a.asset_id
            WHERE t.transaction_id = %s
        """, (transaction_id,))
        
        txn_data = cur.fetchone()
        cur.close()
        conn.close()
        
        if not txn_data:
            print(f"❌ Transaction {transaction_id} not found")
            return False
        
        # Extract transaction details
        txn_id, asset_id, txn_type, txn_date, shares, price, currency, created_at = txn_data[:8]
        asset_id, ticker, current_shares, current_avg_cost = txn_data[8:12]
        
        print(f"📊 BEFORE ROLLBACK:")
        print(f"   Transaction: {txn_type} | {shares} shares @ {currency} {price}")
        print(f"   Asset: {ticker} | {current_shares} shares @ ${current_avg_cost:.2f}")
        
        # Calculate expected values after rollback
        if txn_type in ['LumpSum', 'Recurring', 'Initialization']:
            expected_shares = current_shares - shares
            if expected_shares > 0:
                # Calculate expected average cost basis
                current_total_value = current_shares * current_avg_cost
                transaction_value = shares * price
                expected_total_value = current_total_value - transaction_value
                expected_avg_cost = expected_total_value / expected_shares
                print(f"   Expected after rollback: {expected_shares} shares @ ${expected_avg_cost:.2f}")
            else:
                print(f"   Expected after rollback: Asset will be deleted (no shares remaining)")
        
        # Perform the deletion via API
        headers = {'Authorization': f'Bearer {token}'}
        response = requests.delete(f"{API_BASE_URL}/transactions/{transaction_id}", headers=headers)
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ API Response: {result.get('message', 'Success')}")
            print(f"   Rollback Applied: {result.get('rollback_applied', False)}")
            
            # Verify the rollback by checking asset state
            updated_asset = get_asset_details(asset_id)
            if updated_asset:
                print(f"📊 AFTER ROLLBACK:")
                print(f"   Asset: {updated_asset['ticker_symbol']} | {updated_asset['total_shares']} shares @ ${updated_asset['average_cost_basis']:.2f}")
                
                # Verify calculations
                if txn_type in ['LumpSum', 'Recurring', 'Initialization']:
                    if expected_shares > 0:
                        shares_match = abs(updated_asset['total_shares'] - expected_shares) < 0.000001
                        cost_match = abs(updated_asset['average_cost_basis'] - expected_avg_cost) < 0.01
                        
                        if shares_match and cost_match:
                            print("✅ Rollback calculations are CORRECT!")
                        else:
                            print("❌ Rollback calculations are INCORRECT!")
                            print(f"   Expected: {expected_shares} shares @ ${expected_avg_cost:.2f}")
                            print(f"   Actual: {updated_asset['total_shares']} shares @ ${updated_asset['average_cost_basis']:.2f}")
                    else:
                        print("✅ Asset correctly preserved (expected deletion scenario)")
            else:
                if expected_shares <= 0:
                    print("✅ Asset correctly deleted (no shares remaining)")
                else:
                    print("❌ Asset unexpectedly deleted!")
            
            return True
        else:
            print(f"❌ API Error: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Test error: {e}")
        return False

def main():
    print("🧪 TRANSACTION ROLLBACK TESTING")
    print("=" * 60)
    
    # Get authentication token
    token = get_auth_token()
    if not token:
        print("❌ Could not get authentication token")
        return
    
    print("✅ Authentication successful")
    
    # Find a recent recurring transaction to test with
    print("\n🔍 Finding recent recurring transactions...")
    
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        
        # Get recent recurring transactions
        cur.execute("""
            SELECT t.transaction_id, t.asset_id, a.ticker_symbol, t.shares, t.price_per_share, t.currency
            FROM transactions t
            JOIN assets a ON t.asset_id = a.asset_id
            WHERE t.transaction_type = 'Recurring'
            ORDER BY t.created_at DESC
            LIMIT 3
        """)
        
        recurring_txns = cur.fetchall()
        cur.close()
        conn.close()
        
        if not recurring_txns:
            print("❌ No recurring transactions found to test with")
            return
        
        print(f"📊 Found {len(recurring_txns)} recent recurring transactions:")
        for i, txn in enumerate(recurring_txns):
            txn_id, asset_id, ticker, shares, price, currency = txn
            print(f"   {i+1}. ID {txn_id}: {ticker} | {shares} shares @ {currency} {price}")
        
        # Test rollback with the most recent transaction
        test_txn_id = recurring_txns[0][0]
        print(f"\n🎯 Testing rollback with transaction ID: {test_txn_id}")
        
        # Ask for confirmation
        confirm = input(f"\n⚠️  This will DELETE transaction {test_txn_id} and rollback asset totals. Continue? (y/N): ")
        if confirm.lower() != 'y':
            print("❌ Test cancelled by user")
            return
        
        # Perform the test
        success = test_transaction_rollback(test_txn_id, token)
        
        if success:
            print("\n🎉 ROLLBACK TEST COMPLETED SUCCESSFULLY!")
            print("✅ Transaction deleted and asset totals rolled back correctly")
        else:
            print("\n❌ ROLLBACK TEST FAILED!")
            print("🔍 Check the error messages above for details")
        
    except Exception as e:
        print(f"❌ Main test error: {e}")

if __name__ == "__main__":
    main()
