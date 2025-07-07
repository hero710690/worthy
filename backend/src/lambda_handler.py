import json
import os
import logging
from datetime import datetime

# Import auth handler and config with absolute imports
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from auth.handler import AuthHandler
    from config import get_config
except ImportError:
    # Fallback for Lambda environment
    import auth.handler
    import config
    AuthHandler = auth.handler.AuthHandler
    get_config = config.get_config

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize configuration and auth handler
config = get_config()
auth_handler = AuthHandler(config)

def handle_auth_routes(http_method, path, event, headers):
    """
    Handle authentication-related routes
    """
    try:
        # Parse request body for POST requests
        body = {}
        if http_method in ['POST', 'PUT'] and event.get('body'):
            try:
                body = json.loads(event['body'])
            except json.JSONDecodeError:
                return {
                    "statusCode": 400,
                    "headers": headers,
                    "body": json.dumps({
                        "error": True,
                        "message": "Invalid JSON in request body"
                    })
                }
        
        # Get headers for token verification
        request_headers = event.get('headers', {})
        
        # Route to specific auth endpoints
        if http_method == 'POST' and path == '/auth/register':
            result = auth_handler.register(body)
            return {
                "statusCode": result['statusCode'],
                "headers": headers,
                "body": result['body']
            }
        
        elif http_method == 'POST' and path == '/auth/login':
            result = auth_handler.login(body)
            return {
                "statusCode": result['statusCode'],
                "headers": headers,
                "body": result['body']
            }
        
        elif http_method == 'POST' and path == '/auth/logout':
            result = auth_handler.logout(request_headers)
            return {
                "statusCode": result['statusCode'],
                "headers": headers,
                "body": result['body']
            }
        
        elif http_method == 'POST' and path == '/auth/refresh':
            result = auth_handler.refresh_token(request_headers)
            return {
                "statusCode": result['statusCode'],
                "headers": headers,
                "body": result['body']
            }
        
        elif http_method == 'GET' and path == '/auth/verify':
            # Token verification endpoint
            auth_result = auth_handler.verify_token(request_headers)
            if auth_result.get('error'):
                return {
                    "statusCode": 401,
                    "headers": headers,
                    "body": json.dumps({
                        "error": True,
                        "message": auth_result['error']
                    })
                }
            else:
                return {
                    "statusCode": 200,
                    "headers": headers,
                    "body": json.dumps({
                        "valid": True,
                        "user_id": auth_result['user_id'],
                        "email": auth_result['email']
                    })
                }
        
        else:
            return {
                "statusCode": 404,
                "headers": headers,
                "body": json.dumps({
                    "error": True,
                    "message": "Auth endpoint not found",
                    "path": path,
                    "method": http_method
                })
            }
    
    except Exception as e:
        logger.error(f"Auth route error: {str(e)}", exc_info=True)
        return {
            "statusCode": 500,
            "headers": headers,
            "body": json.dumps({
                "error": True,
                "message": "Authentication service error"
            })
        }

def lambda_handler(event, context):
    """
    Main Lambda handler for Worthy API
    """
    try:
        # Log the incoming event
        logger.info(f"Received event: {json.dumps(event, default=str)}")
        
        # Extract HTTP method and path
        http_method = event.get('httpMethod', '').upper()
        path = event.get('path', '')
        
        # Create response headers
        headers = {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
            "Access-Control-Max-Age": "86400"
        }
        
        # Route the request
        if http_method == 'GET' and path == '/health':
            return {
                "statusCode": 200,
                "headers": headers,
                "body": json.dumps({
                    "status": "healthy",
                    "timestamp": datetime.utcnow().isoformat(),
                    "environment": os.getenv('AWS_LAMBDA_FUNCTION_NAME', 'local')
                })
            }
        
        elif http_method == 'GET' and path == '/':
            return {
                "statusCode": 200,
                "headers": headers,
                "body": json.dumps({
                    "message": "Worthy API is running",
                    "version": "1.0.0",
                    "environment": "lambda"
                })
            }
        
        # Authentication endpoints
        elif path.startswith('/auth/'):
            return handle_auth_routes(http_method, path, event, headers)
        
        elif http_method == 'OPTIONS':
            # Handle CORS preflight requests
            return {
                "statusCode": 200,
                "headers": headers,
                "body": json.dumps({})
            }
        
        else:
            return {
                "statusCode": 404,
                "headers": headers,
                "body": json.dumps({
                    "error": True,
                    "message": "Endpoint not found",
                    "path": path,
                    "method": http_method
                })
            }
        
    except Exception as e:
        logger.error(f"Unhandled error: {str(e)}", exc_info=True)
        return {
            "statusCode": 500,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            },
            "body": json.dumps({
                "error": True,
                "message": "Internal server error"
            })
        }
