#!/usr/bin/env python3

import os
import psycopg2
from psycopg2.extras import RealDictCursor

# Database connection
DATABASE_URL = "postgresql://worthy_admin:REDACTED_DB_PASSWORD@worthy-db-dev.ch0ccg6ycp7t.ap-northeast-1.rds.amazonaws.com:5432/worthy"

def get_user_data(email):
    """Get user data including assets and transactions"""
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Get user info
        cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
        user = cursor.fetchone()
        
        if not user:
            print(f"User {email} not found")
            return
        
        user_id = user['user_id']
        print(f"User ID: {user_id}")
        print(f"Email: {user['email']}")
        print(f"Base Currency: {user['base_currency']}")
        print(f"Created: {user['created_at']}")
        print()
        
        # Get assets
        cursor.execute("""
            SELECT asset_id, ticker_symbol, asset_type, total_shares, average_cost_basis, 
                   currency, created_at, updated_at
            FROM assets 
            WHERE user_id = %s 
            ORDER BY created_at DESC
        """, (user_id,))
        
        assets = cursor.fetchall()
        print(f"Assets ({len(assets)}):")
        for asset in assets:
            print(f"  - Asset ID {asset['asset_id']}: {asset['ticker_symbol']} ({asset['asset_type']})")
            print(f"    Shares: {asset['total_shares']}, Avg Cost: ${asset['average_cost_basis']:.2f}")
            print(f"    Currency: {asset['currency']}")
            print(f"    Created: {asset['created_at']}, Updated: {asset['updated_at']}")
            print()
        
        # Get transactions
        cursor.execute("""
            SELECT t.transaction_id, t.asset_id, t.transaction_type, t.transaction_date,
                   t.shares, t.price_per_share, t.currency, t.created_at,
                   a.ticker_symbol
            FROM transactions t
            JOIN assets a ON t.asset_id = a.asset_id
            WHERE a.user_id = %s
            ORDER BY t.created_at DESC
            LIMIT 20
        """, (user_id,))
        
        transactions = cursor.fetchall()
        print(f"Recent Transactions ({len(transactions)}):")
        for txn in transactions:
            print(f"  - Transaction ID {txn['transaction_id']}: {txn['ticker_symbol']}")
            print(f"    Type: {txn['transaction_type']}, Date: {txn['transaction_date']}")
            print(f"    Shares: {txn['shares']}, Price: ${txn['price_per_share']:.2f}")
            print(f"    Currency: {txn['currency']}, Created: {txn['created_at']}")
            print()
        
        # Check for orphaned transactions (transactions without assets)
        cursor.execute("""
            SELECT t.transaction_id, t.asset_id, t.transaction_type, t.transaction_date,
                   t.shares, t.price_per_share, t.currency, t.created_at
            FROM transactions t
            LEFT JOIN assets a ON t.asset_id = a.asset_id
            WHERE a.asset_id IS NULL
            ORDER BY t.created_at DESC
        """)
        
        orphaned = cursor.fetchall()
        if orphaned:
            print(f"Orphaned Transactions ({len(orphaned)}):")
            for txn in orphaned:
                print(f"  - Transaction ID {txn['transaction_id']}: Asset ID {txn['asset_id']} (MISSING)")
                print(f"    Type: {txn['transaction_type']}, Date: {txn['transaction_date']}")
                print(f"    Shares: {txn['shares']}, Price: ${txn['price_per_share']:.2f}")
                print(f"    Created: {txn['created_at']}")
                print()
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    get_user_data("hero710690@gmail.com")
