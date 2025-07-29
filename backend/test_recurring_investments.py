#!/usr/bin/env python3
"""
Test script to check recurring investments and batch processing
"""

import requests
import json
from datetime import datetime, date

# API Configuration
API_BASE = "https://mreda8g340.execute-api.ap-northeast-1.amazonaws.com/development"

def test_login():
    """Test login to get JWT token"""
    login_data = {
        "email": "test@example.com",  # Replace with actual test user
        "password": "password123"
    }
    
    response = requests.post(f"{API_BASE}/auth/login", json=login_data)
    if response.status_code == 200:
        data = response.json()
        return data.get('token')
    else:
        print(f"Login failed: {response.status_code} - {response.text}")
        return None

def test_recurring_investments(token):
    """Check user's recurring investments"""
    headers = {"Authorization": f"Bearer {token}"}
    
    response = requests.get(f"{API_BASE}/recurring-investments", headers=headers)
    if response.status_code == 200:
        data = response.json()
        print("📋 Recurring Investments:")
        print(json.dumps(data, indent=2))
        return data.get('recurring_investments', [])
    else:
        print(f"Failed to get recurring investments: {response.status_code} - {response.text}")
        return []

def test_batch_processing():
    """Test batch processing endpoint"""
    print("\n🚀 Testing batch processing...")
    
    response = requests.post(f"{API_BASE}/batch/recurring-investments")
    if response.status_code == 200:
        data = response.json()
        print("✅ Batch processing response:")
        print(json.dumps(data, indent=2))
        return data
    else:
        print(f"❌ Batch processing failed: {response.status_code} - {response.text}")
        return None

def test_transactions(token):
    """Check recent transactions"""
    headers = {"Authorization": f"Bearer {token}"}
    
    response = requests.get(f"{API_BASE}/transactions", headers=headers)
    if response.status_code == 200:
        data = response.json()
        print("\n📊 Recent Transactions:")
        transactions = data.get('transactions', [])
        
        # Filter for today's transactions
        today = date.today().isoformat()
        today_transactions = [t for t in transactions if t.get('transaction_date') == today]
        
        if today_transactions:
            print(f"Found {len(today_transactions)} transactions for today ({today}):")
            for tx in today_transactions:
                print(f"  - {tx.get('ticker_symbol')}: {tx.get('shares')} shares @ ${tx.get('price_per_share')} ({tx.get('transaction_type')})")
        else:
            print(f"No transactions found for today ({today})")
            
        return transactions
    else:
        print(f"Failed to get transactions: {response.status_code} - {response.text}")
        return []

def main():
    print("🔍 Testing Recurring Investments System")
    print("=" * 50)
    
    # Step 1: Login
    print("1. Logging in...")
    token = test_login()
    if not token:
        print("❌ Cannot proceed without valid token")
        return
    
    print("✅ Login successful")
    
    # Step 2: Check recurring investments
    print("\n2. Checking recurring investments...")
    recurring_investments = test_recurring_investments(token)
    
    if not recurring_investments:
        print("❌ No recurring investments found")
        return
    
    # Step 3: Check for investments due today
    today = date.today().isoformat()
    due_today = []
    
    for investment in recurring_investments:
        next_run_date = investment.get('next_run_date')
        if next_run_date and next_run_date <= today:
            due_today.append(investment)
    
    if due_today:
        print(f"\n⏰ Found {len(due_today)} investments due today or overdue:")
        for inv in due_today:
            print(f"  - {inv.get('ticker_symbol')}: ${inv.get('amount')} {inv.get('currency')} (due: {inv.get('next_run_date')})")
    else:
        print(f"\n✅ No investments due today ({today})")
    
    # Step 4: Test batch processing
    batch_result = test_batch_processing()
    
    # Step 5: Check transactions
    print("\n3. Checking recent transactions...")
    transactions = test_transactions(token)
    
    # Summary
    print("\n" + "=" * 50)
    print("📋 SUMMARY:")
    print(f"  - Total recurring investments: {len(recurring_investments)}")
    print(f"  - Due today: {len(due_today)}")
    print(f"  - Batch processing: {'✅ Success' if batch_result else '❌ Failed'}")
    print(f"  - Total transactions: {len(transactions)}")

if __name__ == "__main__":
    main()
