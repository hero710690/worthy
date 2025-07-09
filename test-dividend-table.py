#!/usr/bin/env python3
"""
Test script to check if dividend table exists and create it if needed
"""

import psycopg2
import os
from urllib.parse import urlparse

# Database connection from environment
DATABASE_URL = "postgresql://worthy_admin:REDACTED_DB_PASSWORD@worthy-db-dev.ch0ccg6ycp7t.ap-northeast-1.rds.amazonaws.com:5432/worthy"

def test_dividend_table():
    """Test if dividend table exists and create if needed"""
    try:
        # Parse database URL
        url = urlparse(DATABASE_URL)
        
        # Connect to database
        conn = psycopg2.connect(
            host=url.hostname,
            port=url.port,
            database=url.path[1:],  # Remove leading slash
            user=url.username,
            password=url.password
        )
        
        cursor = conn.cursor()
        
        print("🔍 Testing dividend table...")
        
        # Check if dividend table exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'dividends'
            );
        """)
        
        table_exists = cursor.fetchone()[0]
        
        if table_exists:
            print("✅ Dividend table exists!")
            
            # Check table structure
            cursor.execute("""
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_name = 'dividends'
                ORDER BY ordinal_position;
            """)
            
            columns = cursor.fetchall()
            print(f"📋 Table has {len(columns)} columns:")
            for col in columns:
                print(f"   - {col[0]}: {col[1]} ({'NULL' if col[2] == 'YES' else 'NOT NULL'})")
                
            # Check if there are any dividends
            cursor.execute("SELECT COUNT(*) FROM dividends;")
            count = cursor.fetchone()[0]
            print(f"📊 Total dividends in table: {count}")
            
        else:
            print("❌ Dividend table does NOT exist!")
            print("🔧 Creating dividend table...")
            
            # Create dividend table
            cursor.execute("""
                CREATE TABLE dividends (
                    dividend_id SERIAL PRIMARY KEY,
                    asset_id INTEGER NOT NULL REFERENCES assets(asset_id) ON DELETE CASCADE,
                    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
                    ticker_symbol VARCHAR(10) NOT NULL,
                    ex_dividend_date DATE NOT NULL,
                    payment_date DATE,
                    dividend_per_share DECIMAL(10,4) NOT NULL,
                    total_dividend_amount DECIMAL(15,2) NOT NULL,
                    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
                    dividend_type VARCHAR(20) DEFAULT 'regular',
                    is_reinvested BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)
            
            conn.commit()
            print("✅ Dividend table created successfully!")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_dividend_table()
