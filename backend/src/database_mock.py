"""
Mock database module for Lambda deployment without psycopg2
This will be replaced with real database functionality later
"""

import logging
from contextlib import contextmanager
from typing import Generator, Dict, Any, List

logger = logging.getLogger(__name__)

# Mock data store
MOCK_USERS = {}

@contextmanager
def get_db_connection(database_url: str) -> Generator[None, None, None]:
    """
    Mock context manager for database connections
    """
    logger.info(f"Mock database connection to: {database_url.split('@')[1] if '@' in database_url else 'database'}")
    yield None

def execute_query(database_url: str, query: str, params: tuple = None) -> List[Dict]:
    """
    Mock execute SELECT query and return results
    """
    logger.info(f"Mock query: {query[:50]}...")
    
    # Mock user queries
    if "SELECT user_id" in query and "email" in query:
        email = params[0] if params else "test@example.com"
        if email in MOCK_USERS:
            return [MOCK_USERS[email]]
        return []
    
    if "SELECT user_id, email" in query and "WHERE user_id" in query:
        user_id = params[0] if params else 1
        for user in MOCK_USERS.values():
            if user['user_id'] == user_id:
                return [user]
        return []
    
    return []

def execute_update(database_url: str, query: str, params: tuple = None) -> int:
    """
    Mock execute INSERT/UPDATE/DELETE query and return affected rows
    """
    logger.info(f"Mock update: {query[:50]}...")
    
    # Mock user creation
    if "INSERT INTO users" in query and params:
        email, password_hash, base_currency, birth_year = params
        user_id = len(MOCK_USERS) + 1
        MOCK_USERS[email] = {
            'user_id': user_id,
            'email': email,
            'password_hash': password_hash,
            'base_currency': base_currency,
            'birth_year': birth_year,
            'created_at': '2025-07-07T05:30:00',
            'updated_at': None
        }
        return 1
    
    # Mock user update
    if "UPDATE users" in query:
        return 1
    
    return 1

def create_tables(database_url: str):
    """
    Mock create database tables
    """
    logger.info("Mock: Database tables created successfully")
    return True
