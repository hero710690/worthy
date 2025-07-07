import json
from typing import Dict, Any

def create_response(status_code: int, data: Any) -> Dict[str, Any]:
    """
    Create a standardized API response
    """
    return {
        'statusCode': status_code,
        'body': json.dumps(data, default=str),
        'headers': {
            'Content-Type': 'application/json'
        }
    }

def create_error_response(status_code: int, message: str, details: Any = None) -> Dict[str, Any]:
    """
    Create a standardized error response
    """
    error_data = {
        'error': True,
        'message': message
    }
    
    if details:
        error_data['details'] = details
    
    return create_response(status_code, error_data)
