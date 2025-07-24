"""
Direct database update script for user profile
This script bypasses the Lambda function and directly updates the user profile in the database
"""
import os
import sys
import psycopg2
import psycopg2.extras
import json

# Database connection string
DATABASE_URL = "postgresql://worthy_admin:REDACTED_DB_PASSWORD@worthy-db-dev.ch0ccg6ycp7t.ap-northeast-1.rds.amazonaws.com:5432/worthy"

def execute_query(query, params=None):
    """Execute a database query and return results"""
    conn = None
    try:
        conn = psycopg2.connect(DATABASE_URL)
        with conn.cursor(cursor_factory=psycopg2.extras.DictCursor) as cursor:
            cursor.execute(query, params)
            if query.strip().upper().startswith('SELECT'):
                return cursor.fetchall()
            conn.commit()
            return True
    except Exception as e:
        print(f"Database error: {str(e)}")
        if conn:
            conn.rollback()
        return None
    finally:
        if conn:
            conn.close()

def update_user_profile(user_id, profile_data):
    """Update user profile information"""
    try:
        # Build update query dynamically based on provided fields
        update_fields = []
        params = []
        
        if 'name' in profile_data:
            update_fields.append("name = %s")
            params.append(profile_data['name'])
        
        if 'email' in profile_data:
            # Check if email already exists for another user
            existing_user = execute_query(
                "SELECT user_id FROM users WHERE email = %s AND user_id != %s",
                (profile_data['email'], user_id)
            )
            
            if existing_user:
                return {"success": False, "message": "Email already in use by another account"}
            
            update_fields.append("email = %s")
            params.append(profile_data['email'])
        
        if 'base_currency' in profile_data:
            valid_currencies = ['USD', 'TWD', 'EUR', 'GBP', 'JPY', 'KRW', 'SGD', 'HKD']
            if profile_data['base_currency'] not in valid_currencies:
                return {"success": False, "message": "Invalid currency"}
            
            update_fields.append("base_currency = %s")
            params.append(profile_data['base_currency'])
        
        if 'birth_year' in profile_data:
            current_year = 2025  # Hardcoded for simplicity
            if not isinstance(profile_data['birth_year'], int) or profile_data['birth_year'] < 1900 or profile_data['birth_year'] > current_year:
                return {"success": False, "message": "Invalid birth year"}
            
            update_fields.append("birth_year = %s")
            params.append(profile_data['birth_year'])
        
        if not update_fields:
            return {"success": False, "message": "No fields to update"}
        
        # Add user_id to params
        params.append(user_id)
        
        # Execute update query
        query = f"UPDATE users SET {', '.join(update_fields)} WHERE user_id = %s"
        print(f"Executing query: {query}")
        print(f"With params: {params}")
        
        execute_query(query, tuple(params))
        
        # Get updated user data
        updated_user = execute_query(
            "SELECT user_id, name, email, base_currency, birth_year, created_at FROM users WHERE user_id = %s",
            (user_id,)
        )[0]
        
        return {
            "success": True,
            "message": "Profile updated successfully",
            "user": dict(updated_user)
        }
    except Exception as e:
        print(f"Error updating user profile: {str(e)}")
        return {"success": False, "message": f"Error updating profile: {str(e)}"}

def main():
    """Main function to update user profile"""
    if len(sys.argv) < 3:
        print("Usage: python update_profile_direct.py <user_id> '<profile_data_json>'")
        print("Example: python update_profile_direct.py 1 '{\"name\":\"John Doe\",\"base_currency\":\"USD\",\"birth_year\":1990}'")
        return
    
    user_id = int(sys.argv[1])
    profile_data = json.loads(sys.argv[2])
    
    result = update_user_profile(user_id, profile_data)
    print(json.dumps(result, indent=2, default=str))

if __name__ == "__main__":
    main()
