#!/usr/bin/env python3
"""
Script to add tax_rate column to dividends table
"""

import psycopg2
import os

# Database configuration
DATABASE_URL = "postgresql://worthy_admin:WorthyApp2025!@worthy-db-dev.ch0ccg6ycp7t.ap-northeast-1.rds.amazonaws.com:5432/worthy"

def add_tax_rate_column():
    """Add tax_rate column to dividends table if it doesn't exist"""
    
    try:
        # Connect to database
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor()
        
        print("🔗 Connected to database")
        
        # Check if tax_rate column exists
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'dividends' AND column_name = 'tax_rate'
        """)
        
        if cursor.fetchone():
            print("✅ tax_rate column already exists")
            return True
        
        print("➕ Adding tax_rate column to dividends table...")
        
        # Add tax_rate column
        cursor.execute("""
            ALTER TABLE dividends 
            ADD COLUMN tax_rate DECIMAL(5,2) DEFAULT 20.0
        """)
        
        # Commit the changes
        conn.commit()
        
        print("✅ Successfully added tax_rate column")
        
        # Verify the column was added
        cursor.execute("""
            SELECT column_name, data_type, column_default
            FROM information_schema.columns 
            WHERE table_name = 'dividends' AND column_name = 'tax_rate'
        """)
        
        result = cursor.fetchone()
        if result:
            print(f"✅ Verified: tax_rate column added - Type: {result[1]}, Default: {result[2]}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False
        
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()
        print("🔌 Database connection closed")

if __name__ == "__main__":
    print("🛠️ Adding tax_rate column to dividends table...")
    print("=" * 50)
    
    success = add_tax_rate_column()
    
    print("=" * 50)
    if success:
        print("🎉 Database schema update completed successfully!")
    else:
        print("❌ Database schema update failed!")
