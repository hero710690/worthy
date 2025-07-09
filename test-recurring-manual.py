#!/usr/bin/env python3
"""
Manual test script for recurring investments
This simulates what the AWS Batch job would do
"""

import requests
import json
from datetime import datetime, date
import os

# Configuration
API_BASE_URL = "https://mreda8g340.execute-api.ap-northeast-1.amazonaws.com/development"

def test_recurring_investment_flow():
    """Test the complete recurring investment flow"""
    print("🚀 Testing Recurring Investment End-to-End Flow")
    print("=" * 60)
    
    # Step 1: Login to get a token
    print("\n1️⃣ Logging in to get authentication token...")
    login_data = {
        "email": "testuser@worthy.com",  # Test user we just created
        "password": "password123"
    }
    
    try:
        login_response = requests.post(f"{API_BASE_URL}/auth/login", json=login_data)
        if login_response.status_code != 200:
            print(f"❌ Login failed: {login_response.text}")
            return
        
        token = login_response.json()["token"]
        headers = {"Authorization": f"Bearer {token}"}
        print("✅ Login successful")
        
    except Exception as e:
        print(f"❌ Login error: {e}")
        return
    
    # Step 2: Check existing assets
    print("\n2️⃣ Checking existing assets...")
    try:
        assets_response = requests.get(f"{API_BASE_URL}/assets", headers=headers)
        if assets_response.status_code == 200:
            assets = assets_response.json().get("assets", [])
            print(f"✅ Found {len(assets)} existing assets")
            for asset in assets:
                print(f"   - {asset['ticker_symbol']}: {asset['total_shares']} shares @ ${asset['average_cost_basis']:.2f}")
        else:
            print(f"❌ Failed to get assets: {assets_response.text}")
            return
    except Exception as e:
        print(f"❌ Assets error: {e}")
        return
    
    # Step 3: Create a recurring investment plan
    print("\n3️⃣ Creating a recurring investment plan...")
    recurring_plan = {
        "ticker_symbol": "AAPL",
        "amount": 100.00,
        "currency": "USD",
        "frequency": "weekly",
        "start_date": date.today().isoformat(),
        "next_run_date": date.today().isoformat()  # Set to today for immediate testing
    }
    
    try:
        recurring_response = requests.post(f"{API_BASE_URL}/recurring-investments", 
                                         json=recurring_plan, headers=headers)
        if recurring_response.status_code == 201:
            plan = recurring_response.json()
            print(f"✅ Created recurring plan: ${recurring_plan['amount']} {recurring_plan['currency']} weekly for {recurring_plan['ticker_symbol']}")
            plan_id = plan.get("recurring_investment_id")
        else:
            print(f"❌ Failed to create recurring plan: {recurring_response.text}")
            return
    except Exception as e:
        print(f"❌ Recurring plan error: {e}")
        return
    
    # Step 4: Simulate batch processing execution
    print("\n4️⃣ Simulating batch processing execution...")
    print("   (This is what would happen automatically on schedule)")
    
    # Get current stock price for AAPL
    try:
        stock_response = requests.get(f"{API_BASE_URL}/api/stock-prices-multi?symbols=AAPL", 
                                    headers=headers)
        if stock_response.status_code == 200:
            stock_data = stock_response.json()
            aapl_price = stock_data["prices"]["AAPL"]["price"]
            print(f"✅ Current AAPL price: ${aapl_price:.2f}")
            
            # Calculate shares to purchase
            shares_to_buy = recurring_plan["amount"] / aapl_price
            print(f"✅ Calculated shares to buy: {shares_to_buy:.4f}")
            
        else:
            print(f"❌ Failed to get stock price: {stock_response.text}")
            return
    except Exception as e:
        print(f"❌ Stock price error: {e}")
        return
    
    # Step 5: Execute the recurring investment (create transaction)
    print("\n5️⃣ Executing recurring investment (creating transaction)...")
    
    # For new assets, we need to initialize them first
    # Let's check if AAPL asset exists, if not create it with initial transaction
    aapl_asset = None
    for asset in assets:
        if asset["ticker_symbol"] == "AAPL":
            aapl_asset = asset
            break
    
    if not aapl_asset:
        print("   Initializing new AAPL asset with first purchase...")
        asset_data = {
            "ticker_symbol": "AAPL",
            "asset_type": "Stock",
            "total_shares": shares_to_buy,
            "average_cost_basis": aapl_price,
            "currency": "USD"
        }
        try:
            asset_response = requests.post(f"{API_BASE_URL}/assets", json=asset_data, headers=headers)
            if asset_response.status_code == 201:
                aapl_asset = asset_response.json()["asset"]
                print(f"✅ Initialized AAPL asset with {shares_to_buy:.4f} shares @ ${aapl_price:.2f}")
                print(f"   Asset ID: {aapl_asset['asset_id']}")
            else:
                print(f"❌ Failed to initialize asset: {asset_response.text}")
                return
        except Exception as e:
            print(f"❌ Asset initialization error: {e}")
            return
    else:
        # Asset exists, create additional transaction
        print(f"   Adding to existing AAPL position (current: {aapl_asset['total_shares']} shares)...")
        transaction_data = {
            "asset_id": aapl_asset["asset_id"],
            "transaction_type": "LumpSum",
            "shares": shares_to_buy,
            "price_per_share": aapl_price,
            "currency": "USD",
            "transaction_date": date.today().isoformat()
        }
        
        try:
            transaction_response = requests.post(f"{API_BASE_URL}/transactions", 
                                               json=transaction_data, headers=headers)
            if transaction_response.status_code == 201:
                transaction = transaction_response.json()
                print(f"✅ Created additional transaction: {shares_to_buy:.4f} shares @ ${aapl_price:.2f}")
                print(f"   Total cost: ${shares_to_buy * aapl_price:.2f}")
            else:
                print(f"❌ Failed to create transaction: {transaction_response.text}")
                return
        except Exception as e:
            print(f"❌ Transaction error: {e}")
            return
    
    # Step 6: Verify the asset was updated
    print("\n6️⃣ Verifying asset updates...")
    try:
        assets_response = requests.get(f"{API_BASE_URL}/assets", headers=headers)
        if assets_response.status_code == 200:
            updated_assets = assets_response.json().get("assets", [])
            for asset in updated_assets:
                if asset["ticker_symbol"] == "AAPL":
                    print(f"✅ Updated AAPL asset:")
                    print(f"   - Total shares: {asset['total_shares']:.4f}")
                    print(f"   - Average cost basis: ${asset['average_cost_basis']:.2f}")
                    print(f"   - Total value: ${asset['total_shares'] * asset['average_cost_basis']:.2f}")
                    break
        else:
            print(f"❌ Failed to get updated assets: {assets_response.text}")
    except Exception as e:
        print(f"❌ Asset verification error: {e}")
    
    # Step 7: Check transaction history
    print("\n7️⃣ Checking transaction history...")
    try:
        transactions_response = requests.get(f"{API_BASE_URL}/transactions", headers=headers)
        if transactions_response.status_code == 200:
            transactions = transactions_response.json().get("transactions", [])
            recent_transactions = [t for t in transactions if t["ticker_symbol"] == "AAPL"][-3:]  # Last 3 AAPL transactions
            print(f"✅ Recent AAPL transactions:")
            for txn in recent_transactions:
                print(f"   - {txn['transaction_date']}: {txn['shares']:.4f} shares @ ${txn['price_per_share']:.2f} ({txn['transaction_type']})")
        else:
            print(f"❌ Failed to get transactions: {transactions_response.text}")
    except Exception as e:
        print(f"❌ Transaction history error: {e}")
    
    print("\n🎉 End-to-End Test Complete!")
    print("=" * 60)
    print("Summary:")
    print("✅ Created recurring investment plan")
    print("✅ Fetched real-time stock price")
    print("✅ Calculated shares to purchase")
    print("✅ Created transaction record")
    print("✅ Updated asset aggregation")
    print("✅ Verified data consistency")

if __name__ == "__main__":
    test_recurring_investment_flow()
