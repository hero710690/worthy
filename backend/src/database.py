import os
import logging

logger = logging.getLogger(__name__)

# Try to import psycopg2 first
try:
    import psycopg2
    import psycopg2.extras
    from contextlib import contextmanager
    from typing import Generator, Dict, Any
    
    PSYCOPG2_AVAILABLE = True
    logger.info("psycopg2 is available")
    
except ImportError:
    PSYCOPG2_AVAILABLE = False
    logger.warning("psycopg2 not available, will use mock database")

# Use real database if psycopg2 is available, otherwise use mock
if PSYCOPG2_AVAILABLE:
    @contextmanager
    def get_db_connection(database_url: str) -> Generator[psycopg2.extensions.connection, None, None]:
        """
        Context manager for database connections
        """
        conn = None
        try:
            conn = psycopg2.connect(database_url)
            yield conn
        except Exception as e:
            if conn:
                conn.rollback()
            logger.error(f"Database error: {str(e)}")
            raise
        finally:
            if conn:
                conn.close()

    def execute_query(database_url: str, query: str, params: tuple = None) -> list:
        """
        Execute a SELECT query and return results
        """
        with get_db_connection(database_url) as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cursor:
                cursor.execute(query, params)
                return cursor.fetchall()

    def execute_update(database_url: str, query: str, params: tuple = None) -> int:
        """
        Execute an INSERT/UPDATE/DELETE query and return affected rows
        """
        with get_db_connection(database_url) as conn:
            with conn.cursor() as cursor:
                cursor.execute(query, params)
                conn.commit()
                return cursor.rowcount

    def create_tables(database_url: str):
        """
        Create database tables if they don't exist
        """
        create_users_table = """
        CREATE TABLE IF NOT EXISTS users (
            user_id SERIAL PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            base_currency VARCHAR(3) DEFAULT 'USD',
            birth_year INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """
        
        create_updated_at_trigger = """
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = CURRENT_TIMESTAMP;
            RETURN NEW;
        END;
        $$ language 'plpgsql';
        
        DROP TRIGGER IF EXISTS update_users_updated_at ON users;
        CREATE TRIGGER update_users_updated_at
            BEFORE UPDATE ON users
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
        """
        
        try:
            with get_db_connection(database_url) as conn:
                with conn.cursor() as cursor:
                    cursor.execute(create_users_table)
                    cursor.execute(create_updated_at_trigger)
                    conn.commit()
            logger.info("Database tables created successfully")
        except Exception as e:
            logger.error(f"Error creating tables: {str(e)}")
            raise

else:
    # Use mock database
    from .database_mock import *
    logger.info("Using mock database")
