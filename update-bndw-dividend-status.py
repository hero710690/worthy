#!/usr/bin/env python3
"""
Script to update BNDW dividend status to pending for user hero710690@gmail.com
"""

import psycopg2
import psycopg2.extras

# Database configuration
DATABASE_URL = "postgresql://worthy_admin:REDACTED_DB_PASSWORD@worthy-db-dev.ch0ccg6ycp7t.ap-northeast-1.rds.amazonaws.com:5432/worthy"

def update_bndw_dividend_status():
    """Update BNDW dividend status to pending for the specified user"""
    
    try:
        # Connect to database
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        
        print("🔗 Connected to database")
        
        # First, find the user
        cursor.execute("""
            SELECT user_id, name, email 
            FROM users 
            WHERE email = %s
        """, ('hero710690@gmail.com',))
        
        user = cursor.fetchone()
        if not user:
            print("❌ User hero710690@gmail.com not found")
            return False
        
        user_id = user['user_id']
        print(f"✅ Found user: {user['name']} (ID: {user_id})")
        
        # Find BNDW dividends for this user
        cursor.execute("""
            SELECT d.dividend_id, d.ticker_symbol, d.dividend_per_share, 
                   d.ex_dividend_date, d.payment_date, d.is_reinvested,
                   a.asset_id, a.ticker_symbol as asset_ticker
            FROM dividends d
            JOIN assets a ON d.asset_id = a.asset_id
            WHERE d.user_id = %s AND d.ticker_symbol = 'BNDW'
            ORDER BY d.ex_dividend_date DESC
        """, (user_id,))
        
        bndw_dividends = cursor.fetchall()
        
        if not bndw_dividends:
            print("❌ No BNDW dividends found for this user")
            return False
        
        print(f"📊 Found {len(bndw_dividends)} BNDW dividend(s):")
        
        processed_count = 0
        for dividend in bndw_dividends:
            status = "processed" if dividend['is_reinvested'] else "pending"
            print(f"   - ID: {dividend['dividend_id']}, Status: {status}, "
                  f"Amount: ${dividend['dividend_per_share']}, Date: {dividend['ex_dividend_date']}")
            
            if dividend['is_reinvested']:
                processed_count += 1
        
        if processed_count == 0:
            print("✅ All BNDW dividends are already in pending status")
            return True
        
        # Update processed dividends to pending
        print(f"🔄 Updating {processed_count} processed BNDW dividend(s) to pending status...")
        
        cursor.execute("""
            UPDATE dividends 
            SET is_reinvested = FALSE, updated_at = CURRENT_TIMESTAMP
            WHERE user_id = %s AND ticker_symbol = 'BNDW' AND is_reinvested = TRUE
            RETURNING dividend_id, ex_dividend_date, dividend_per_share
        """, (user_id,))
        
        updated_dividends = cursor.fetchall()
        
        # Commit the changes
        conn.commit()
        
        print(f"✅ Successfully updated {len(updated_dividends)} BNDW dividend(s) to pending status:")
        for dividend in updated_dividends:
            print(f"   - ID: {dividend['dividend_id']}, Date: {dividend['ex_dividend_date']}, "
                  f"Amount: ${dividend['dividend_per_share']}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        if 'conn' in locals():
            conn.rollback()
        return False
        
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()
        print("🔌 Database connection closed")

if __name__ == "__main__":
    print("🛠️ Updating BNDW dividend status to pending for hero710690@gmail.com")
    print("=" * 70)
    
    success = update_bndw_dividend_status()
    
    print("=" * 70)
    if success:
        print("🎉 BNDW dividend status update completed successfully!")
        print("✅ All BNDW dividends for hero710690@gmail.com are now in pending status")
    else:
        print("❌ BNDW dividend status update failed!")
