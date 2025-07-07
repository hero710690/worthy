from typing import Dict, Any

def add_cors_headers(response: Dict[str, Any]) -> Dict[str, Any]:
    """
    Add CORS headers to response
    """
    if 'headers' not in response:
        response['headers'] = {}
    
    response['headers'].update({
        'Access-Control-Allow-Origin': '*',  # In production, specify your domain
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        'Access-Control-Max-Age': '86400'
    })
    
    return response
