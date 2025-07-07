#!/usr/bin/env python3
"""
Simple test for Worthy API Lambda functions without database dependencies
"""

import json
import os
import sys
sys.path.append('src')

# Mock the database module to avoid psycopg2 dependency
class MockDatabase:
    @staticmethod
    def get_db_connection(database_url):
        return None
    
    @staticmethod
    def execute_query(database_url, query, params=None):
        # Mock user data for testing
        if "SELECT user_id" in query and "email" in query:
            return [{'user_id': 1, 'email': 'test@example.com', 'password_hash': '$2b$12$test'}]
        return []
    
    @staticmethod
    def execute_update(database_url, query, params=None):
        return 1

# Replace the database module
sys.modules['src.database'] = MockDatabase()

from src.lambda_handler import lambda_handler

def test_health_check():
    """Test health check endpoint"""
    event = {
        'httpMethod': 'GET',
        'path': '/health',
        'headers': {},
        'queryStringParameters': None,
        'body': None
    }
    
    response = lambda_handler(event, {})
    print("Health Check Response:", json.dumps(response, indent=2))
    return response

def test_root_endpoint():
    """Test root endpoint"""
    event = {
        'httpMethod': 'GET',
        'path': '/',
        'headers': {},
        'queryStringParameters': None,
        'body': None
    }
    
    response = lambda_handler(event, {})
    print("Root Response:", json.dumps(response, indent=2))
    return response

def test_unknown_endpoint():
    """Test unknown endpoint"""
    event = {
        'httpMethod': 'GET',
        'path': '/unknown',
        'headers': {},
        'queryStringParameters': None,
        'body': None
    }
    
    response = lambda_handler(event, {})
    print("Unknown Endpoint Response:", json.dumps(response, indent=2))
    return response

if __name__ == '__main__':
    # Set up environment variables for testing
    os.environ['DATABASE_URL'] = 'postgresql://worthy_admin:REDACTED_DB_PASSWORD@worthy-db-dev.ch0ccg6ycp7t.ap-northeast-1.rds.amazonaws.com:5432/worthy'
    os.environ['JWT_SECRET'] = 'test-secret-key'
    os.environ['ENVIRONMENT'] = 'development'
    
    print("🧪 Testing Worthy API Lambda Functions (Simple)")
    print("=" * 50)
    
    # Test health check
    print("\n1. Testing Health Check...")
    test_health_check()
    
    # Test root endpoint
    print("\n2. Testing Root Endpoint...")
    test_root_endpoint()
    
    # Test unknown endpoint
    print("\n3. Testing Unknown Endpoint...")
    test_unknown_endpoint()
    
    print("\n✅ Simple testing completed!")
