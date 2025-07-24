#!/usr/bin/env python3

import os
import psycopg2
from psycopg2.extras import RealDictCursor

# Database connection
DATABASE_URL = "postgresql://worthy_admin:REDACTED_DB_PASSWORD@worthy-db-dev.ch0ccg6ycp7t.ap-northeast-1.rds.amazonaws.com:5432/worthy"

def check_orphaned_transactions():
    """Check for transactions that reference deleted assets"""
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Get user ID for hero710690@gmail.com
        cursor.execute("SELECT user_id FROM users WHERE email = %s", ("hero710690@gmail.com",))
        user = cursor.fetchone()
        user_id = user['user_id']
        
        # Check for transactions that reference non-existent assets
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
            print(f"Found {len(orphaned)} orphaned transactions:")
            for txn in orphaned:
                print(f"  - Transaction ID {txn['transaction_id']}: Asset ID {txn['asset_id']} (DELETED)")
                print(f"    Type: {txn['transaction_type']}, Date: {txn['transaction_date']}")
                print(f"    Shares: {txn['shares']}, Price: ${txn['price_per_share']:.2f}")
                print(f"    Currency: {txn['currency']}, Created: {txn['created_at']}")
                print()
        else:
            print("No orphaned transactions found.")
        
        # Check for recent asset deletions by looking at transaction patterns
        cursor.execute("""
            SELECT DISTINCT t.asset_id, COUNT(*) as transaction_count,
                   MIN(t.created_at) as first_transaction,
                   MAX(t.created_at) as last_transaction
            FROM transactions t
            LEFT JOIN assets a ON t.asset_id = a.asset_id
            WHERE a.asset_id IS NULL
            GROUP BY t.asset_id
            ORDER BY last_transaction DESC
        """)
        
        deleted_assets = cursor.fetchall()
        
        if deleted_assets:
            print(f"Assets that were deleted but had transactions:")
            for asset in deleted_assets:
                print(f"  - Asset ID {asset['asset_id']}: {asset['transaction_count']} transactions")
                print(f"    First: {asset['first_transaction']}, Last: {asset['last_transaction']}")
                print()
        
        # Check for recent transaction deletions by looking for gaps in transaction IDs
        cursor.execute("""
            SELECT transaction_id 
            FROM transactions 
            WHERE transaction_id BETWEEN 90 AND 110
            ORDER BY transaction_id
        """)
        
        existing_ids = [row['transaction_id'] for row in cursor.fetchall()]
        all_ids = list(range(90, 111))
        missing_ids = [id for id in all_ids if id not in existing_ids]
        
        if missing_ids:
            print(f"Missing transaction IDs (possibly deleted): {missing_ids}")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_orphaned_transactions()
