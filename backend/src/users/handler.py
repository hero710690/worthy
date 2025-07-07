import logging
from typing import Dict, Any

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from database import execute_query, execute_update
from utils.response import create_response, create_error_response

logger = logging.getLogger(__name__)

class UserHandler:
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.database_url = config['DATABASE_URL']
    
    def get_profile(self, user_id: int) -> Dict[str, Any]:
        """
        Get user profile
        """
        try:
            users = execute_query(
                self.database_url,
                """
                SELECT user_id, email, base_currency, birth_year, created_at, updated_at
                FROM users WHERE user_id = %s
                """,
                (user_id,)
            )
            
            if not users:
                return create_error_response(404, "User not found")
            
            user = users[0]
            
            return create_response(200, {
                "user": {
                    "user_id": user['user_id'],
                    "email": user['email'],
                    "base_currency": user['base_currency'],
                    "birth_year": user['birth_year'],
                    "created_at": user['created_at'].isoformat(),
                    "updated_at": user['updated_at'].isoformat() if user['updated_at'] else None
                }
            })
            
        except Exception as e:
            logger.error(f"Get profile error: {str(e)}")
            return create_error_response(500, "Failed to get user profile")
    
    def update_profile(self, user_id: int, body: Dict[str, Any]) -> Dict[str, Any]:
        """
        Update user profile
        """
        try:
            # Extract updatable fields
            base_currency = body.get('base_currency')
            birth_year = body.get('birth_year')
            
            # Build update query dynamically
            update_fields = []
            params = []
            
            if base_currency is not None:
                # Validate currency code (basic validation)
                if len(base_currency) != 3 or not base_currency.isalpha():
                    return create_error_response(400, "Invalid currency code")
                update_fields.append("base_currency = %s")
                params.append(base_currency.upper())
            
            if birth_year is not None:
                # Validate birth year
                if not isinstance(birth_year, int) or birth_year < 1900 or birth_year > 2010:
                    return create_error_response(400, "Invalid birth year")
                update_fields.append("birth_year = %s")
                params.append(birth_year)
            
            if not update_fields:
                return create_error_response(400, "No valid fields to update")
            
            # Add user_id to params
            params.append(user_id)
            
            # Execute update
            query = f"""
                UPDATE users 
                SET {', '.join(update_fields)}
                WHERE user_id = %s
            """
            
            rows_affected = execute_update(self.database_url, query, tuple(params))
            
            if rows_affected == 0:
                return create_error_response(404, "User not found")
            
            # Return updated profile
            return self.get_profile(user_id)
            
        except Exception as e:
            logger.error(f"Update profile error: {str(e)}")
            return create_error_response(500, "Failed to update user profile")
