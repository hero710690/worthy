import jwt
import bcrypt
import logging
from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from email_validator import validate_email, EmailNotValidError

from ..database import execute_query, execute_update
from ..utils.response import create_response, create_error_response

logger = logging.getLogger(__name__)

class AuthHandler:
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.jwt_secret = config['JWT_SECRET']
        self.jwt_algorithm = config['JWT_ALGORITHM']
        self.jwt_expiration_hours = config['JWT_EXPIRATION_HOURS']
        self.database_url = config['DATABASE_URL']
    
    def register(self, body: Dict[str, Any]) -> Dict[str, Any]:
        """
        Register a new user
        """
        try:
            # Validate input
            email = body.get('email', '').strip().lower()
            password = body.get('password', '')
            base_currency = body.get('base_currency', 'USD')
            birth_year = body.get('birth_year')
            
            if not email or not password:
                return create_error_response(400, "Email and password are required")
            
            # Validate email format
            try:
                validate_email(email)
            except EmailNotValidError:
                return create_error_response(400, "Invalid email format")
            
            # Validate password strength
            if len(password) < 8:
                return create_error_response(400, "Password must be at least 8 characters long")
            
            # Check if user already exists
            existing_user = execute_query(
                self.database_url,
                "SELECT user_id FROM users WHERE email = %s",
                (email,)
            )
            
            if existing_user:
                return create_error_response(409, "User with this email already exists")
            
            # Hash password
            password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            
            # Create user
            execute_update(
                self.database_url,
                """
                INSERT INTO users (email, password_hash, base_currency, birth_year)
                VALUES (%s, %s, %s, %s)
                """,
                (email, password_hash, base_currency, birth_year)
            )
            
            # Get created user
            user = execute_query(
                self.database_url,
                "SELECT user_id, email, base_currency, birth_year, created_at FROM users WHERE email = %s",
                (email,)
            )[0]
            
            # Generate JWT token
            token = self._generate_token(user['user_id'], email)
            
            return create_response(201, {
                "message": "User registered successfully",
                "user": {
                    "user_id": user['user_id'],
                    "email": user['email'],
                    "base_currency": user['base_currency'],
                    "birth_year": user['birth_year'],
                    "created_at": user['created_at'].isoformat()
                },
                "token": token
            })
            
        except Exception as e:
            logger.error(f"Registration error: {str(e)}")
            return create_error_response(500, "Registration failed")
    
    def login(self, body: Dict[str, Any]) -> Dict[str, Any]:
        """
        Login user
        """
        try:
            email = body.get('email', '').strip().lower()
            password = body.get('password', '')
            
            if not email or not password:
                return create_error_response(400, "Email and password are required")
            
            # Get user from database
            users = execute_query(
                self.database_url,
                "SELECT user_id, email, password_hash, base_currency, birth_year FROM users WHERE email = %s",
                (email,)
            )
            
            if not users:
                return create_error_response(401, "Invalid email or password")
            
            user = users[0]
            
            # Verify password
            if not bcrypt.checkpw(password.encode('utf-8'), user['password_hash'].encode('utf-8')):
                return create_error_response(401, "Invalid email or password")
            
            # Generate JWT token
            token = self._generate_token(user['user_id'], user['email'])
            
            return create_response(200, {
                "message": "Login successful",
                "user": {
                    "user_id": user['user_id'],
                    "email": user['email'],
                    "base_currency": user['base_currency'],
                    "birth_year": user['birth_year']
                },
                "token": token
            })
            
        except Exception as e:
            logger.error(f"Login error: {str(e)}")
            return create_error_response(500, "Login failed")
    
    def logout(self, headers: Dict[str, str]) -> Dict[str, Any]:
        """
        Logout user (for now just return success, token blacklisting can be added later)
        """
        return create_response(200, {"message": "Logout successful"})
    
    def refresh_token(self, headers: Dict[str, str]) -> Dict[str, Any]:
        """
        Refresh JWT token
        """
        try:
            auth_result = self.verify_token(headers)
            if auth_result.get('error'):
                return create_error_response(401, auth_result['error'])
            
            user_id = auth_result['user_id']
            email = auth_result['email']
            
            # Generate new token
            token = self._generate_token(user_id, email)
            
            return create_response(200, {
                "message": "Token refreshed successfully",
                "token": token
            })
            
        except Exception as e:
            logger.error(f"Token refresh error: {str(e)}")
            return create_error_response(500, "Token refresh failed")
    
    def verify_token(self, headers: Dict[str, str]) -> Dict[str, Any]:
        """
        Verify JWT token from Authorization header
        """
        try:
            auth_header = headers.get('Authorization') or headers.get('authorization')
            if not auth_header:
                return {"error": "Authorization header missing"}
            
            if not auth_header.startswith('Bearer '):
                return {"error": "Invalid authorization header format"}
            
            token = auth_header.split(' ')[1]
            
            try:
                payload = jwt.decode(token, self.jwt_secret, algorithms=[self.jwt_algorithm])
                return {
                    "user_id": payload['user_id'],
                    "email": payload['email'],
                    "exp": payload['exp']
                }
            except jwt.ExpiredSignatureError:
                return {"error": "Token has expired"}
            except jwt.InvalidTokenError:
                return {"error": "Invalid token"}
                
        except Exception as e:
            logger.error(f"Token verification error: {str(e)}")
            return {"error": "Token verification failed"}
    
    def _generate_token(self, user_id: int, email: str) -> str:
        """
        Generate JWT token
        """
        payload = {
            'user_id': user_id,
            'email': email,
            'exp': datetime.utcnow() + timedelta(hours=self.jwt_expiration_hours),
            'iat': datetime.utcnow()
        }
        return jwt.encode(payload, self.jwt_secret, algorithm=self.jwt_algorithm)
