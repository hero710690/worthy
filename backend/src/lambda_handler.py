import json
import os
import logging
from typing import Dict, Any
from datetime import datetime

# Import our modules
from .config import get_config
from .database import get_db_connection
from .auth.handler import AuthHandler
from .users.handler import UserHandler
from .utils.response import create_response, create_error_response
from .utils.cors import add_cors_headers

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize handlers
config = get_config()
auth_handler = AuthHandler(config)
user_handler = UserHandler(config)

def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Main Lambda handler for Worthy API
    """
    try:
        # Log the incoming event (remove in production)
        logger.info(f"Received event: {json.dumps(event, default=str)}")
        
        # Extract HTTP method and path
        http_method = event.get('httpMethod', '').upper()
        path = event.get('path', '')
        headers = event.get('headers', {})
        query_params = event.get('queryStringParameters') or {}
        body = event.get('body')
        
        # Parse JSON body if present
        json_body = {}
        if body:
            try:
                json_body = json.loads(body)
            except json.JSONDecodeError:
                return create_error_response(400, "Invalid JSON in request body")
        
        # Route the request
        response = route_request(http_method, path, headers, query_params, json_body)
        
        # Add CORS headers
        response = add_cors_headers(response)
        
        return response
        
    except Exception as e:
        logger.error(f"Unhandled error: {str(e)}", exc_info=True)
        return create_error_response(500, "Internal server error")

def route_request(method: str, path: str, headers: Dict, query_params: Dict, body: Dict) -> Dict[str, Any]:
    """
    Route requests to appropriate handlers
    """
    # Health check
    if method == 'GET' and path == '/health':
        return create_response(200, {"status": "healthy", "timestamp": datetime.utcnow().isoformat()})
    
    # Root endpoint
    if method == 'GET' and path == '/':
        return create_response(200, {"message": "Worthy API is running", "version": "1.0.0"})
    
    # Authentication routes
    if path.startswith('/api/auth'):
        return handle_auth_routes(method, path, headers, query_params, body)
    
    # User routes (protected)
    if path.startswith('/api/users'):
        return handle_user_routes(method, path, headers, query_params, body)
    
    # Asset routes (will be added in Milestone 2)
    if path.startswith('/api/assets'):
        return create_error_response(501, "Assets endpoints not implemented yet")
    
    # Transaction routes (will be added in Milestone 2)
    if path.startswith('/api/transactions'):
        return create_error_response(501, "Transaction endpoints not implemented yet")
    
    # 404 for unknown routes
    return create_error_response(404, "Endpoint not found")

def handle_auth_routes(method: str, path: str, headers: Dict, query_params: Dict, body: Dict) -> Dict[str, Any]:
    """
    Handle authentication-related routes
    """
    if method == 'POST' and path == '/api/auth/register':
        return auth_handler.register(body)
    
    elif method == 'POST' and path == '/api/auth/login':
        return auth_handler.login(body)
    
    elif method == 'POST' and path == '/api/auth/logout':
        return auth_handler.logout(headers)
    
    elif method == 'POST' and path == '/api/auth/refresh':
        return auth_handler.refresh_token(headers)
    
    else:
        return create_error_response(404, "Auth endpoint not found")

def handle_user_routes(method: str, path: str, headers: Dict, query_params: Dict, body: Dict) -> Dict[str, Any]:
    """
    Handle user-related routes (protected)
    """
    # Verify authentication for all user routes
    auth_result = auth_handler.verify_token(headers)
    if auth_result.get('error'):
        return create_error_response(401, auth_result['error'])
    
    user_id = auth_result['user_id']
    
    if method == 'GET' and path == '/api/users/profile':
        return user_handler.get_profile(user_id)
    
    elif method == 'PUT' and path == '/api/users/profile':
        return user_handler.update_profile(user_id, body)
    
    else:
        return create_error_response(404, "User endpoint not found")
