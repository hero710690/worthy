#!/usr/bin/env python3
"""
Database Migration: Add barista_income_currency column to fire_profile table

This script adds the barista_income_currency column to allow users to specify
their part-time income in a different currency than their base currency.
"""

import psycopg2
import os
from urllib.parse import urlparse

def run_migration():
    """Run the database migration"""
    
    # Database connection string
    DATABASE_URL = "postgresql://<db-user>:<db-password>@<db-host>:5432/worthy"
    
    try:
        # Connect to database
        print("🔗 Connecting to database...")
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor()
        
        # Check if column already exists
        print("🔍 Checking if barista_income_currency column exists...")
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'fire_profile' 
            AND column_name = 'barista_income_currency'
        """)
        
        if cursor.fetchone():
            print("✅ Column barista_income_currency already exists")
            return True
        
        # Add the column
        print("➕ Adding barista_income_currency column...")
        cursor.execute("""
            ALTER TABLE fire_profile 
            ADD COLUMN barista_income_currency VARCHAR(3) DEFAULT 'USD'
        """)
        
        # Commit the changes
        conn.commit()
        print("✅ Successfully added barista_income_currency column")
        
        # Verify the column was added
        cursor.execute("""
            SELECT column_name, data_type, column_default
            FROM information_schema.columns 
            WHERE table_name = 'fire_profile' 
            AND column_name = 'barista_income_currency'
        """)
        
        result = cursor.fetchone()
        if result:
            print(f"✅ Verification: Column {result[0]} ({result[1]}) with default {result[2]} added successfully")
        
        return True
        
    except Exception as e:
        print(f"❌ Migration failed: {str(e)}")
        return False
        
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()

def update_existing_profiles():
    """Update existing FIRE profiles to set barista_income_currency to user's base currency"""
    
    DATABASE_URL = "postgresql://<db-user>:<db-password>@<db-host>:5432/worthy"
    
    try:
        print("🔄 Updating existing FIRE profiles with user's base currency...")
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor()
        
        # Update existing profiles to use user's base currency as default
        cursor.execute("""
            UPDATE fire_profile 
            SET barista_income_currency = users.base_currency
            FROM users 
            WHERE fire_profile.user_id = users.user_id 
            AND fire_profile.barista_income_currency = 'USD'
        """)
        
        rows_updated = cursor.rowcount
        conn.commit()
        
        print(f"✅ Updated {rows_updated} existing FIRE profiles with user's base currency")
        return True
        
    except Exception as e:
        print(f"❌ Update failed: {str(e)}")
        return False
        
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    print("🚀 Running Barista Currency Migration...")
    
    if run_migration():
        if update_existing_profiles():
            print("\n🎉 Migration completed successfully!")
            print("\n📋 What was done:")
            print("1. ✅ Added barista_income_currency column to fire_profile table")
            print("2. ✅ Updated existing profiles to use user's base currency")
            print("3. ✅ New profiles will default to USD if not specified")
            print("\n🔧 Next steps:")
            print("1. Deploy the updated Lambda function with currency conversion")
            print("2. Test FIRE calculations with different currencies")
        else:
            print("\n⚠️ Migration partially completed - column added but update failed")
    else:
        print("\n❌ Migration failed completely")
