import json
import os
import logging
from datetime import datetime

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

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
