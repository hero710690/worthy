import os
from typing import Dict, Any

def get_config() -> Dict[str, Any]:
    """
    Get configuration from environment variables
    """
    return {
        # Database
        'DATABASE_URL': os.getenv('DATABASE_URL', 'postgresql://user:password@localhost/worthy'),
        
        # JWT
        'JWT_SECRET': os.getenv('JWT_SECRET', 'your-secret-key-change-in-production'),
        'JWT_ALGORITHM': 'HS256',
        'JWT_EXPIRATION_HOURS': int(os.getenv('JWT_EXPIRATION_HOURS', '24')),
        
        # External APIs
        'ALPHA_VANTAGE_API_KEY': os.getenv('ALPHA_VANTAGE_API_KEY', ''),
        'EXCHANGE_RATE_API_KEY': os.getenv('EXCHANGE_RATE_API_KEY', ''),
        
        # Environment
        'ENVIRONMENT': os.getenv('ENVIRONMENT', 'development'),
        'DEBUG': os.getenv('DEBUG', 'false').lower() == 'true',
        
        # CORS
        'ALLOWED_ORIGINS': [
            'http://localhost:3000',
            'http://localhost:5173',
            'https://worthy-app.com'  # Add your production domain
        ]
    }
