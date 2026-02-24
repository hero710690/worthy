#!/usr/bin/env python3
"""
Local testing script for Worthy API Lambda functions
"""

import json
import os
import sys
sys.path.append('src')

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

def test_user_registration():
    """Test user registration"""
    event = {
        'httpMethod': 'POST',
        'path': '/api/auth/register',
        'headers': {'Content-Type': 'application/json'},
        'queryStringParameters': None,
        'body': json.dumps({
            'email': 'test@example.com',
            'password': 'testpassword123',
            'base_currency': 'USD',
            'birth_year': 1990
        })
    }
    
    response = lambda_handler(event, {})
    print("Registration Response:", json.dumps(response, indent=2))
    return response

def test_user_login():
    """Test user login"""
    event = {
        'httpMethod': 'POST',
        'path': '/api/auth/login',
        'headers': {'Content-Type': 'application/json'},
        'queryStringParameters': None,
        'body': json.dumps({
            'email': 'test@example.com',
            'password': 'testpassword123'
        })
    }
    
    response = lambda_handler(event, {})
    print("Login Response:", json.dumps(response, indent=2))
    return response

if __name__ == '__main__':
    # Set up environment variables for testing
    os.environ['DATABASE_URL'] = 'postgresql://worthy_admin:<db-password>@localhost:5432/worthy'
    os.environ['JWT_SECRET'] = 'test-secret-key'
    os.environ['ENVIRONMENT'] = 'development'
    
    print("🧪 Testing Worthy API Lambda Functions")
    print("=" * 50)
    
    # Test health check
    print("\n1. Testing Health Check...")
    test_health_check()
    
    # Note: Database tests require a running PostgreSQL instance
    print("\n⚠️  Database tests require PostgreSQL to be running")
    print("Start PostgreSQL with: docker run --name worthy-postgres -e POSTGRES_DB=worthy -e POSTGRES_USER=worthy_admin -e POSTGRES_PASSWORD=<db-password> -p 5432:5432 -d postgres:15")
    
    # Uncomment these when database is ready:
    # print("\n2. Testing User Registration...")
    # test_user_registration()
    
    # print("\n3. Testing User Login...")
    # test_user_login()
    
    print("\n✅ Local testing completed!")
