#!/usr/bin/env python3
"""
Initialize Worthy database tables
"""

import os
import sys
sys.path.append('src')

from src.database import create_tables
from src.config import get_config

def main():
    print("🗄️  Initializing Worthy database...")
    
    # Get configuration
    config = get_config()
    database_url = config['DATABASE_URL']
    
    if not database_url or database_url == 'postgresql://user:password@localhost/worthy':
        print("❌ DATABASE_URL not configured!")
        print("Please set DATABASE_URL environment variable or update .env file")
        return
    
    print(f"📡 Connecting to: {database_url.split('@')[1] if '@' in database_url else 'database'}")
    
    try:
        # Create tables
        create_tables(database_url)
        print("✅ Database tables created successfully!")
        
        # Test connection
        from src.database import execute_query
        result = execute_query(database_url, "SELECT version()")
        print(f"🔗 Connected to: {result[0]['version']}")
        
    except Exception as e:
        print(f"❌ Database initialization failed: {str(e)}")
        return
    
    print("🎉 Database is ready for Worthy app!")

if __name__ == '__main__':
    main()
