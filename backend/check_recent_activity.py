#!/usr/bin/env python3

import os
import psycopg2
from psycopg2.extras import RealDictCursor

# Database connection
DATABASE_URL = "postgresql://worthy_admin:REDACTED_DB_PASSWORD@worthy-db-dev.ch0ccg6ycp7t.ap-northeast-1.rds.amazonaws.com:5432/worthy"

def check_recent_activity():
    """Check recent transaction and asset activity"""
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Get user ID for hero710690@gmail.com
        cursor.execute("SELECT user_id FROM users WHERE email = %s", ("hero710690@gmail.com",))
        user = cursor.fetchone()
        user_id = user['user_id']
        
        print(f"User ID: {user_id}")
        print()
        
        # Check asset update history for BNDW (asset_id = 4)
        cursor.execute("""
            SELECT asset_id, ticker_symbol, total_shares, average_cost_basis, updated_at
            FROM assets 
            WHERE user_id = %s AND ticker_symbol = 'BNDW'
        """, (user_id,))
        
        bndw_asset = cursor.fetchone()
        if bndw_asset:
            print(f"BNDW Asset (ID {bndw_asset['asset_id']}):")
            print(f"  Current shares: {bndw_asset['total_shares']}")
            print(f"  Average cost: ${bndw_asset['average_cost_basis']:.2f}")
            print(f"  Last updated: {bndw_asset['updated_at']}")
            print()
            
            # Get all transactions for BNDW
            cursor.execute("""
                SELECT transaction_id, transaction_type, transaction_date, shares, 
                       price_per_share, currency, created_at
                FROM transactions 
                WHERE asset_id = %s
                ORDER BY created_at DESC
            """, (bndw_asset['asset_id'],))
            
            bndw_transactions = cursor.fetchall()
            print(f"BNDW Transactions ({len(bndw_transactions)}):")
            for txn in bndw_transactions:
                print(f"  - ID {txn['transaction_id']}: {txn['transaction_type']}")
                print(f"    Date: {txn['transaction_date']}, Shares: {txn['shares']}")
                print(f"    Price: ${txn['price_per_share']:.2f}, Created: {txn['created_at']}")
                print()
        
        # Check for any assets that were recently updated
        cursor.execute("""
            SELECT asset_id, ticker_symbol, total_shares, average_cost_basis, 
                   created_at, updated_at
            FROM assets 
            WHERE user_id = %s 
              AND updated_at > NOW() - INTERVAL '1 day'
            ORDER BY updated_at DESC
        """, (user_id,))
        
        recent_assets = cursor.fetchall()
        print(f"Recently Updated Assets ({len(recent_assets)}):")
        for asset in recent_assets:
            print(f"  - Asset ID {asset['asset_id']}: {asset['ticker_symbol']}")
            print(f"    Shares: {asset['total_shares']}, Cost: ${asset['average_cost_basis']:.2f}")
            print(f"    Created: {asset['created_at']}, Updated: {asset['updated_at']}")
            print()
        
        # Check transaction count by asset
        cursor.execute("""
            SELECT a.asset_id, a.ticker_symbol, COUNT(t.transaction_id) as txn_count,
                   a.total_shares, a.average_cost_basis
            FROM assets a
            LEFT JOIN transactions t ON a.asset_id = t.asset_id
            WHERE a.user_id = %s
            GROUP BY a.asset_id, a.ticker_symbol, a.total_shares, a.average_cost_basis
            ORDER BY txn_count DESC
        """, (user_id,))
        
        asset_summary = cursor.fetchall()
        print("Asset Transaction Summary:")
        for asset in asset_summary:
            print(f"  - {asset['ticker_symbol']} (ID {asset['asset_id']}): {asset['txn_count']} transactions")
            print(f"    Current: {asset['total_shares']} shares @ ${asset['average_cost_basis']:.2f}")
            print()
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_recent_activity()
