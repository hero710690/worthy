#!/usr/bin/env python3
"""
CD Asset Support Migration Script
Adds support for Certificate of Deposit (CD) assets to the Worthy database.

This script:
1. Updates the asset_type CHECK constraint to include 'CD'
2. Adds interest_rate and maturity_date columns if they don't exist
3. Verifies the migration was successful

Usage:
    python migrate_cd_support.py
"""

import os
import sys
import psycopg2
import psycopg2.extras
from contextlib import contextmanager
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

DATABASE_URL = os.environ.get('DATABASE_URL')
if not DATABASE_URL:
    print("❌ ERROR: DATABASE_URL environment variable not set")
    print("Please set DATABASE_URL in your .env file or environment")
    sys.exit(1)

@contextmanager
def get_db_connection():
    """Context manager for database connections"""
    conn = None
    try:
        conn = psycopg2.connect(DATABASE_URL)
        conn.autocommit = False
        yield conn
    except Exception as e:
        if conn:
            conn.rollback()
        raise e
    finally:
        if conn:
            conn.close()

def execute_query(query, params=None):
    """Execute a SELECT query and return results"""
    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cursor:
            cursor.execute(query, params)
            return cursor.fetchall()

def execute_update(query, params=None):
    """Execute an INSERT/UPDATE/DELETE query"""
    with get_db_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(query, params)
            conn.commit()
            return cursor.rowcount

def check_column_exists(table_name, column_name):
    """Check if a column exists in a table"""
    query = """
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = %s AND column_name = %s
    """
    result = execute_query(query, (table_name, column_name))
    return len(result) > 0

def check_constraint_allows_cd():
    """Check if the asset_type constraint allows 'CD'"""
    query = """
        SELECT check_clause 
        FROM information_schema.check_constraints cc
        JOIN information_schema.constraint_column_usage ccu 
            ON cc.constraint_name = ccu.constraint_name
        WHERE ccu.table_name = 'assets' 
            AND ccu.column_name = 'asset_type'
    """
    result = execute_query(query)
    if result:
        check_clause = result[0]['check_clause']
        return "'CD'" in check_clause or '"CD"' in check_clause
    return False

def migrate_cd_support():
    """Main migration function"""
    print("🚀 Starting CD Asset Support Migration...")
    print(f"📊 Database: {DATABASE_URL.split('@')[1] if '@' in DATABASE_URL else 'localhost'}")
    print()
    
    try:
        # Step 1: Check current constraint
        print("1️⃣ Checking current asset_type constraint...")
        cd_supported = check_constraint_allows_cd()
        
        if cd_supported:
            print("   ✅ CD asset type already supported")
        else:
            print("   ⚠️  CD asset type not supported, updating constraint...")
            
            # Drop existing constraint
            execute_update("ALTER TABLE assets DROP CONSTRAINT IF EXISTS assets_asset_type_check")
            print("   🗑️  Dropped old constraint")
            
            # Add new constraint with CD support
            execute_update("""
                ALTER TABLE assets ADD CONSTRAINT assets_asset_type_check 
                CHECK (asset_type IN ('Stock', 'ETF', 'Bond', 'Cash', 'CD', 'Other'))
            """)
            print("   ✅ Added new constraint with CD support")
        
        # Step 2: Check and add interest_rate column
        print("\n2️⃣ Checking interest_rate column...")
        if check_column_exists('assets', 'interest_rate'):
            print("   ✅ interest_rate column already exists")
        else:
            print("   ➕ Adding interest_rate column...")
            execute_update("ALTER TABLE assets ADD COLUMN interest_rate DECIMAL(5,4)")
            print("   ✅ interest_rate column added")
        
        # Step 3: Check and add maturity_date column
        print("\n3️⃣ Checking maturity_date column...")
        if check_column_exists('assets', 'maturity_date'):
            print("   ✅ maturity_date column already exists")
        else:
            print("   ➕ Adding maturity_date column...")
            execute_update("ALTER TABLE assets ADD COLUMN maturity_date DATE")
            print("   ✅ maturity_date column added")
        
        # Step 4: Check and add start_date column
        print("\n4️⃣ Checking start_date column...")
        if check_column_exists('assets', 'start_date'):
            print("   ✅ start_date column already exists")
        else:
            print("   ➕ Adding start_date column...")
            execute_update("ALTER TABLE assets ADD COLUMN start_date DATE")
            print("   ✅ start_date column added")
        
        # Step 5: Verify migration
        print("\n5️⃣ Verifying migration...")
        
        # Test CD constraint by checking the constraint definition
        try:
            cd_supported_after = check_constraint_allows_cd()
            if cd_supported_after:
                print("   ✅ CD asset type constraint verified")
            else:
                print("   ❌ CD asset type constraint verification failed")
                return False
                
            # Check columns exist
            interest_rate_exists = check_column_exists('assets', 'interest_rate')
            maturity_date_exists = check_column_exists('assets', 'maturity_date')
            start_date_exists = check_column_exists('assets', 'start_date')
            
            if interest_rate_exists and maturity_date_exists and start_date_exists:
                print("   ✅ CD-specific columns verified")
            else:
                print("   ❌ CD-specific columns verification failed")
                return False
                
        except Exception as e:
            print(f"   ❌ Migration verification failed: {e}")
            return False
        
        print("\n🎉 Migration completed successfully!")
        print("\n📋 Summary:")
        print("   • CD asset type is now supported")
        print("   • interest_rate column is available")
        print("   • maturity_date column is available")
        print("   • You can now create CD assets with interest rates and maturity dates")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Migration failed: {e}")
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("  WORTHY APP - CD ASSET SUPPORT MIGRATION")
    print("=" * 60)
    
    success = migrate_cd_support()
    
    if success:
        print("\n✅ Migration completed successfully!")
        print("You can now create CD assets in the Worthy app.")
        sys.exit(0)
    else:
        print("\n❌ Migration failed!")
        print("Please check the error messages above and try again.")
        sys.exit(1)