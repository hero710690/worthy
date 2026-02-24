"""
Worthy App Complete Backend - Single File Lambda Function
Authentication system with hashlib-based password hashing
Asset management with UPDATE and DELETE functionality
"""
import json
import os
import logging
import hashlib
import secrets
import jwt
from datetime import datetime, timedelta
from email_validator import validate_email, EmailNotValidError

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Database connection handling
try:
    import psycopg2
    import psycopg2.extras
    from contextlib import contextmanager
    PSYCOPG2_AVAILABLE = True
    logger.info("psycopg2 is available")
except ImportError:
    PSYCOPG2_AVAILABLE = False
    logger.warning("psycopg2 not available, will use mock database")

# Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', '')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24
DATABASE_URL = os.environ.get('DATABASE_URL', '')

def get_cors_headers():
    """Return proper CORS headers"""
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, Accept, Origin",
        "Access-Control-Max-Age": "86400",
        "Content-Type": "application/json"
    }

def create_response(status_code, body, additional_headers=None):
    """Create a proper API Gateway response with CORS headers"""
    headers = get_cors_headers()
    if additional_headers:
        headers.update(additional_headers)
    
    return {
        "statusCode": status_code,
        "headers": headers,
        "body": json.dumps(body) if isinstance(body, (dict, list)) else body
    }

def create_error_response(status_code, message):
    """Create an error response"""
    return create_response(status_code, {
        "error": True,
        "message": message
    })

# Database functions
if PSYCOPG2_AVAILABLE:
    @contextmanager
    def get_db_connection(database_url):
        """Context manager for database connections"""
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

    def execute_query(database_url, query, params=None):
        """Execute a SELECT query and return results"""
        with get_db_connection(database_url) as conn:
            with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cursor:
                cursor.execute(query, params)
                return cursor.fetchall()

    def execute_update(database_url, query, params=None):
        """Execute an INSERT/UPDATE/DELETE query and return affected rows"""
        with get_db_connection(database_url) as conn:
            with conn.cursor() as cursor:
                cursor.execute(query, params)
                conn.commit()
                return cursor.rowcount
else:
    # Mock database functions
    def execute_query(database_url, query, params=None):
        """Mock database query"""
        logger.warning("Using mock database - query not executed")
        return []

    def execute_update(database_url, query, params=None):
        """Mock database update"""
        logger.warning("Using mock database - update not executed")
        return 0

# Password hashing functions
def hash_password(password):
    """Hash password using PBKDF2 with SHA256"""
    salt = secrets.token_hex(16)  # 32 character hex string
    password_hash = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 100000)
    return f"{salt}:{password_hash.hex()}"

def verify_password(password, stored_hash):
    """Verify password against stored hash"""
    try:
        salt, password_hash = stored_hash.split(':')
        new_hash = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt.encode('utf-8'), 100000)
        return password_hash == new_hash.hex()
    except ValueError:
        return False

# JWT functions
def generate_token(user_id, email):
    """Generate JWT token"""
    payload = {
        'user_id': user_id,
        'email': email,
        'exp': datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS),
        'iat': datetime.utcnow()
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_token(headers):
    """Verify JWT token from Authorization header"""
    try:
        auth_header = headers.get('Authorization') or headers.get('authorization')
        if not auth_header:
            return {"error": "Authorization header missing"}
        
        if not auth_header.startswith('Bearer '):
            return {"error": "Invalid authorization header format"}
        
        token = auth_header.split(' ')[1]
        
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
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

# Authentication handlers
def verify_jwt_token(auth_header):
    """Verify JWT token from Authorization header"""
    try:
        if not auth_header or not auth_header.startswith('Bearer '):
            return {'valid': False, 'error': 'Missing or invalid authorization header'}
        
        token = auth_header.split(' ')[1]
        
        # Decode and verify the token
        payload = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
        
        return {
            'valid': True,
            'user_id': payload.get('user_id'),
            'email': payload.get('email')
        }
        
    except jwt.ExpiredSignatureError:
        return {'valid': False, 'error': 'Token has expired'}
    except jwt.InvalidTokenError:
        return {'valid': False, 'error': 'Invalid token'}
    except Exception as e:
        logger.error(f"Token verification error: {str(e)}")
        return {'valid': False, 'error': 'Token verification failed'}

def handle_create_asset(body, user_id):
    """Handle asset creation/initialization"""
    try:
        ticker_symbol = body.get('ticker_symbol', '').strip().upper()
        asset_type = body.get('asset_type', 'Stock')
        total_shares = body.get('total_shares', 0)
        average_cost_basis = body.get('average_cost_basis', 0)
        currency = body.get('currency', 'USD')
        
        if not ticker_symbol:
            return create_error_response(400, "Ticker symbol is required")
        
        if total_shares <= 0:
            return create_error_response(400, "Total shares must be greater than 0")
        
        if average_cost_basis <= 0:
            return create_error_response(400, "Average cost basis must be greater than 0")
        
        # Check if asset already exists for this user
        existing_asset = execute_query(
            DATABASE_URL,
            "SELECT asset_id FROM assets WHERE user_id = %s AND ticker_symbol = %s",
            (user_id, ticker_symbol)
        )
        
        if existing_asset:
            return create_error_response(409, f"Asset {ticker_symbol} already exists for this user")
        
        # Create asset
        execute_update(
            DATABASE_URL,
            """
            INSERT INTO assets (user_id, ticker_symbol, asset_type, total_shares, average_cost_basis, currency)
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (user_id, ticker_symbol, asset_type, total_shares, average_cost_basis, currency)
        )
        
        # Get created asset
        asset = execute_query(
            DATABASE_URL,
            "SELECT * FROM assets WHERE user_id = %s AND ticker_symbol = %s",
            (user_id, ticker_symbol)
        )[0]
        
        # Create initialization transaction
        execute_update(
            DATABASE_URL,
            """
            INSERT INTO transactions (asset_id, transaction_type, transaction_date, shares, price_per_share, currency)
            VALUES (%s, 'Initialization', CURRENT_DATE, %s, %s, %s)
            """,
            (asset['asset_id'], total_shares, average_cost_basis, currency)
        )
        
        return create_response(201, {
            "message": "Asset created successfully",
            "asset": {
                "asset_id": asset['asset_id'],
                "ticker_symbol": asset['ticker_symbol'],
                "asset_type": asset['asset_type'],
                "total_shares": float(asset['total_shares']),
                "average_cost_basis": float(asset['average_cost_basis']),
                "currency": asset['currency'],
                "created_at": asset['created_at'].isoformat()
            }
        })
        
    except Exception as e:
        logger.error(f"Create asset error: {str(e)}")
        return create_error_response(500, "Failed to create asset")

def handle_get_assets(user_id):
    """Get all assets for a user"""
    try:
        assets = execute_query(
            DATABASE_URL,
            """
            SELECT a.*, 
                   COALESCE(SUM(t.shares), 0) as total_shares_calculated,
                   COUNT(t.transaction_id) as transaction_count
            FROM assets a
            LEFT JOIN transactions t ON a.asset_id = t.asset_id
            WHERE a.user_id = %s
            GROUP BY a.asset_id
            ORDER BY a.created_at DESC
            """,
            (user_id,)
        )
        
        asset_list = []
        for asset in assets:
            asset_list.append({
                "asset_id": asset['asset_id'],
                "ticker_symbol": asset['ticker_symbol'],
                "asset_type": asset['asset_type'],
                "total_shares": float(asset['total_shares']),
                "average_cost_basis": float(asset['average_cost_basis']),
                "currency": asset['currency'],
                "transaction_count": asset['transaction_count'],
                "created_at": asset['created_at'].isoformat(),
                "updated_at": asset['updated_at'].isoformat() if asset['updated_at'] else None
            })
        
        return create_response(200, {
            "assets": asset_list,
            "total_assets": len(asset_list)
        })
        
    except Exception as e:
        logger.error(f"Get assets error: {str(e)}")
        return create_error_response(500, "Failed to retrieve assets")

def handle_get_asset(asset_id, user_id):
    """Get specific asset details"""
    try:
        asset = execute_query(
            DATABASE_URL,
            "SELECT * FROM assets WHERE asset_id = %s AND user_id = %s",
            (asset_id, user_id)
        )
        
        if not asset:
            return create_error_response(404, "Asset not found")
        
        asset = asset[0]
        
        # Get transaction history
        transactions = execute_query(
            DATABASE_URL,
            """
            SELECT * FROM transactions 
            WHERE asset_id = %s 
            ORDER BY transaction_date DESC, created_at DESC
            """,
            (asset_id,)
        )
        
        transaction_list = []
        for txn in transactions:
            transaction_list.append({
                "transaction_id": txn['transaction_id'],
                "transaction_type": txn['transaction_type'],
                "transaction_date": txn['transaction_date'].isoformat(),
                "shares": float(txn['shares']),
                "price_per_share": float(txn['price_per_share']),
                "currency": txn['currency'],
                "created_at": txn['created_at'].isoformat()
            })
        
        return create_response(200, {
            "asset": {
                "asset_id": asset['asset_id'],
                "ticker_symbol": asset['ticker_symbol'],
                "asset_type": asset['asset_type'],
                "total_shares": float(asset['total_shares']),
                "average_cost_basis": float(asset['average_cost_basis']),
                "currency": asset['currency'],
                "created_at": asset['created_at'].isoformat(),
                "updated_at": asset['updated_at'].isoformat() if asset['updated_at'] else None
            },
            "transactions": transaction_list
        })
        
    except Exception as e:
        logger.error(f"Get asset error: {str(e)}")
        return create_error_response(500, "Failed to retrieve asset")

def handle_create_transaction(body, user_id):
    """Handle transaction creation"""
    try:
        asset_id = body.get('asset_id')
        transaction_type = body.get('transaction_type', 'LumpSum')
        shares = body.get('shares', 0)
        price_per_share = body.get('price_per_share', 0)
        currency = body.get('currency', 'USD')
        transaction_date = body.get('transaction_date')
        
        if not asset_id:
            return create_error_response(400, "Asset ID is required")
        
        if shares <= 0:
            return create_error_response(400, "Shares must be greater than 0")
        
        if price_per_share <= 0:
            return create_error_response(400, "Price per share must be greater than 0")
        
        # Verify asset belongs to user
        asset = execute_query(
            DATABASE_URL,
            "SELECT * FROM assets WHERE asset_id = %s AND user_id = %s",
            (asset_id, user_id)
        )
        
        if not asset:
            return create_error_response(404, "Asset not found")
        
        asset = asset[0]
        
        # Parse transaction date
        if transaction_date:
            try:
                from datetime import datetime
                transaction_date = datetime.strptime(transaction_date, '%Y-%m-%d').date()
            except ValueError:
                return create_error_response(400, "Invalid date format. Use YYYY-MM-DD")
        else:
            from datetime import date
            transaction_date = date.today()
        
        # Create transaction
        execute_update(
            DATABASE_URL,
            """
            INSERT INTO transactions (asset_id, transaction_type, transaction_date, shares, price_per_share, currency)
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (asset_id, transaction_type, transaction_date, shares, price_per_share, currency)
        )
        
        # Update asset totals
        new_total_shares = float(asset['total_shares']) + shares
        total_cost = (float(asset['total_shares']) * float(asset['average_cost_basis'])) + (shares * price_per_share)
        new_average_cost = total_cost / new_total_shares if new_total_shares > 0 else 0
        
        execute_update(
            DATABASE_URL,
            """
            UPDATE assets 
            SET total_shares = %s, average_cost_basis = %s, updated_at = CURRENT_TIMESTAMP
            WHERE asset_id = %s
            """,
            (new_total_shares, new_average_cost, asset_id)
        )
        
        # Get created transaction
        transaction = execute_query(
            DATABASE_URL,
            """
            SELECT * FROM transactions 
            WHERE asset_id = %s AND transaction_date = %s AND shares = %s AND price_per_share = %s
            ORDER BY created_at DESC LIMIT 1
            """,
            (asset_id, transaction_date, shares, price_per_share)
        )[0]
        
        return create_response(201, {
            "message": "Transaction created successfully",
            "transaction": {
                "transaction_id": transaction['transaction_id'],
                "asset_id": transaction['asset_id'],
                "transaction_type": transaction['transaction_type'],
                "transaction_date": transaction['transaction_date'].isoformat(),
                "shares": float(transaction['shares']),
                "price_per_share": float(transaction['price_per_share']),
                "currency": transaction['currency'],
                "created_at": transaction['created_at'].isoformat()
            }
        })
        
    except Exception as e:
        logger.error(f"Create transaction error: {str(e)}")
        return create_error_response(500, "Failed to create transaction")

def handle_update_asset(asset_id, body, user_id):
    """Handle asset update"""
    try:
        # Verify asset belongs to user
        asset = execute_query(
            DATABASE_URL,
            "SELECT * FROM assets WHERE asset_id = %s AND user_id = %s",
            (asset_id, user_id)
        )
        
        if not asset:
            return create_error_response(404, "Asset not found")
        
        # Get update data
        asset_type = body.get('asset_type', '').strip()
        total_shares = body.get('total_shares', 0)
        average_cost_basis = body.get('average_cost_basis', 0)
        currency = body.get('currency', '').strip()
        
        # Validate input
        if not asset_type:
            return create_error_response(400, "Asset type is required")
        
        if total_shares <= 0:
            return create_error_response(400, "Total shares must be greater than 0")
        
        if average_cost_basis <= 0:
            return create_error_response(400, "Average cost basis must be greater than 0")
        
        if not currency:
            return create_error_response(400, "Currency is required")
        
        # Update asset
        execute_update(
            DATABASE_URL,
            """
            UPDATE assets 
            SET asset_type = %s, total_shares = %s, average_cost_basis = %s, 
                currency = %s, updated_at = CURRENT_TIMESTAMP
            WHERE asset_id = %s AND user_id = %s
            """,
            (asset_type, total_shares, average_cost_basis, currency, asset_id, user_id)
        )
        
        # Get updated asset
        updated_asset = execute_query(
            DATABASE_URL,
            "SELECT * FROM assets WHERE asset_id = %s AND user_id = %s",
            (asset_id, user_id)
        )[0]
        
        return create_response(200, {
            "message": "Asset updated successfully",
            "asset": {
                "asset_id": updated_asset['asset_id'],
                "ticker_symbol": updated_asset['ticker_symbol'],
                "asset_type": updated_asset['asset_type'],
                "total_shares": float(updated_asset['total_shares']),
                "average_cost_basis": float(updated_asset['average_cost_basis']),
                "currency": updated_asset['currency'],
                "created_at": updated_asset['created_at'].isoformat(),
                "updated_at": updated_asset['updated_at'].isoformat() if updated_asset['updated_at'] else None
            }
        })
        
    except Exception as e:
        logger.error(f"Update asset error: {str(e)}")
        return create_error_response(500, "Failed to update asset")

def handle_delete_asset(asset_id, user_id):
    """Handle asset deletion"""
    try:
        # Verify asset belongs to user
        asset = execute_query(
            DATABASE_URL,
            "SELECT * FROM assets WHERE asset_id = %s AND user_id = %s",
            (asset_id, user_id)
        )
        
        if not asset:
            return create_error_response(404, "Asset not found")
        
        asset = asset[0]
        
        # Delete associated transactions first (foreign key constraint)
        execute_update(
            DATABASE_URL,
            "DELETE FROM transactions WHERE asset_id = %s",
            (asset_id,)
        )
        
        # Delete the asset
        execute_update(
            DATABASE_URL,
            "DELETE FROM assets WHERE asset_id = %s AND user_id = %s",
            (asset_id, user_id)
        )
        
        return create_response(200, {
            "message": f"Asset {asset['ticker_symbol']} deleted successfully"
        })
        
    except Exception as e:
        logger.error(f"Delete asset error: {str(e)}")
        return create_error_response(500, "Failed to delete asset")

def handle_register(body):
    try:
        # Validate input
        name = body.get('name', '').strip()
        email = body.get('email', '').strip().lower()
        password = body.get('password', '')
        base_currency = body.get('base_currency', 'USD')
        birth_year = body.get('birth_year')
        
        if not name or not email or not password:
            return create_error_response(400, "Name, email and password are required")
        
        # Validate name length
        if len(name) < 2 or len(name) > 50:
            return create_error_response(400, "Name must be between 2 and 50 characters")
        
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
            DATABASE_URL,
            "SELECT user_id FROM users WHERE email = %s",
            (email,)
        )
        
        if existing_user:
            return create_error_response(409, "User with this email already exists")
        
        # Hash password
        password_hash = hash_password(password)
        
        # Create user
        execute_update(
            DATABASE_URL,
            """
            INSERT INTO users (name, email, password_hash, base_currency, birth_year)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (name, email, password_hash, base_currency, birth_year)
        )
        
        # Get created user
        user = execute_query(
            DATABASE_URL,
            "SELECT user_id, name, email, base_currency, birth_year, created_at FROM users WHERE email = %s",
            (email,)
        )[0]
        
        # Generate JWT token
        token = generate_token(user['user_id'], email)
        
        return create_response(201, {
            "message": "User registered successfully",
            "user": {
                "user_id": user['user_id'],
                "name": user['name'],
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

def handle_login(body):
    """Handle user login"""
    try:
        email = body.get('email', '').strip().lower()
        password = body.get('password', '')
        
        if not email or not password:
            return create_error_response(400, "Email and password are required")
        
        # Get user from database
        users = execute_query(
            DATABASE_URL,
            "SELECT user_id, name, email, password_hash, base_currency, birth_year FROM users WHERE email = %s",
            (email,)
        )
        
        if not users:
            return create_error_response(401, "Invalid email or password")
        
        user = users[0]
        
        # Verify password
        if not verify_password(password, user['password_hash']):
            return create_error_response(401, "Invalid email or password")
        
        # Generate JWT token
        token = generate_token(user['user_id'], user['email'])
        
        return create_response(200, {
            "message": "Login successful",
            "user": {
                "user_id": user['user_id'],
                "name": user['name'],
                "email": user['email'],
                "base_currency": user['base_currency'],
                "birth_year": user['birth_year']
            },
            "token": token
        })
        
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        return create_error_response(500, "Login failed")

def handle_logout(headers):
    """Handle user logout"""
    return create_response(200, {"message": "Logout successful"})

def handle_refresh_token(headers):
    """Handle token refresh"""
    try:
        auth_result = verify_token(headers)
        if auth_result.get('error'):
            return create_error_response(401, auth_result['error'])
        
        user_id = auth_result['user_id']
        email = auth_result['email']
        
        # Generate new token
        token = generate_token(user_id, email)
        
        return create_response(200, {
            "message": "Token refreshed successfully",
            "token": token
        })
        
    except Exception as e:
        logger.error(f"Token refresh error: {str(e)}")
        return create_error_response(500, "Token refresh failed")

def handle_verify_token(headers):
    """Handle token verification"""
    auth_result = verify_token(headers)
    if auth_result.get('error'):
        return create_error_response(401, auth_result['error'])
    else:
        return create_response(200, {
            "valid": True,
            "user_id": auth_result['user_id'],
            "email": auth_result['email']
        })

def handle_get_exchange_rates(base_currency='USD'):
    """Proxy endpoint for exchange rates"""
    try:
        logger.info(f"Fetching exchange rates for base currency: {base_currency}")
        
        # Make request to ExchangeRate-API
        url = f"{EXCHANGE_RATE_BASE_URL}/{base_currency}"
        
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        
        return create_response(200, {
            "success": True,
            "base": data.get('base', base_currency),
            "rates": data.get('rates', {}),
            "last_updated": data.get('date', datetime.utcnow().isoformat()),
            "source": "ExchangeRate-API"
        })
        
    except requests.exceptions.RequestException as e:
        logger.error(f"Exchange rate API error: {str(e)}")
        return create_error_response(503, f"Exchange rate service unavailable: {str(e)}")
    except Exception as e:
        logger.error(f"Exchange rate handler error: {str(e)}")
        return create_error_response(500, "Failed to fetch exchange rates")

def handle_get_stock_price(symbol):
    """Proxy endpoint for stock prices"""
    try:
        logger.info(f"Fetching stock price for symbol: {symbol}")
        
        # Make request to Alpha Vantage API
        params = {
            'function': 'GLOBAL_QUOTE',
            'symbol': symbol.upper(),
            'apikey': ALPHA_VANTAGE_API_KEY
        }
        
        response = requests.get(ALPHA_VANTAGE_BASE_URL, params=params, timeout=15)
        response.raise_for_status()
        
        data = response.json()
        
        # Check for API errors
        if 'Error Message' in data:
            return create_error_response(400, f"Invalid symbol: {symbol}")
        
        if 'Note' in data:
            return create_error_response(429, "API rate limit exceeded")
        
        if 'Global Quote' not in data:
            return create_error_response(404, f"No data found for symbol: {symbol}")
        
        quote = data['Global Quote']
        
        # Parse and format the response
        stock_data = {
            "symbol": quote.get('01. symbol', symbol),
            "price": float(quote.get('05. price', 0)),
            "change": float(quote.get('09. change', 0)),
            "change_percent": quote.get('10. change percent', '0%').replace('%', ''),
            "volume": quote.get('06. volume', '0'),
            "latest_trading_day": quote.get('07. latest trading day', ''),
            "previous_close": float(quote.get('08. previous close', 0)),
            "currency": "USD",
            "source": "Alpha Vantage",
            "last_updated": datetime.utcnow().isoformat()
        }
        
        return create_response(200, {
            "success": True,
            "data": stock_data
        })
        
    except requests.exceptions.RequestException as e:
        logger.error(f"Stock price API error: {str(e)}")
        return create_error_response(503, f"Stock price service unavailable: {str(e)}")
    except ValueError as e:
        logger.error(f"Stock price parsing error: {str(e)}")
        return create_error_response(500, "Failed to parse stock price data")
    except Exception as e:
        logger.error(f"Stock price handler error: {str(e)}")
        return create_error_response(500, "Failed to fetch stock price")

def handle_get_multiple_stock_prices(symbols):
    """Proxy endpoint for multiple stock prices"""
    try:
        logger.info(f"Fetching stock prices for symbols: {symbols}")
        
        if not symbols or len(symbols) == 0:
            return create_error_response(400, "No symbols provided")
        
        if len(symbols) > 10:
            return create_error_response(400, "Too many symbols (max 10)")
        
        results = {}
        errors = []
        
        for symbol in symbols:
            try:
                # Make individual requests (Alpha Vantage doesn't support batch requests)
                params = {
                    'function': 'GLOBAL_QUOTE',
                    'symbol': symbol.upper(),
                    'apikey': ALPHA_VANTAGE_API_KEY
                }
                
                response = requests.get(ALPHA_VANTAGE_BASE_URL, params=params, timeout=15)
                response.raise_for_status()
                
                data = response.json()
                
                if 'Global Quote' in data:
                    quote = data['Global Quote']
                    results[symbol.upper()] = {
                        "symbol": quote.get('01. symbol', symbol),
                        "price": float(quote.get('05. price', 0)),
                        "change": float(quote.get('09. change', 0)),
                        "change_percent": quote.get('10. change percent', '0%').replace('%', ''),
                        "currency": "USD",
                        "last_updated": datetime.utcnow().isoformat()
                    }
                else:
                    errors.append(f"No data for {symbol}")
                
                # Rate limiting: wait between requests
                import time
                time.sleep(12)  # 12 seconds between requests (5 calls per minute limit)
                
            except Exception as e:
                errors.append(f"Error fetching {symbol}: {str(e)}")
        
        return create_response(200, {
            "success": True,
            "data": results,
            "errors": errors,
            "source": "Alpha Vantage"
        })
        
    except Exception as e:
        logger.error(f"Multiple stock prices handler error: {str(e)}")
        return create_error_response(500, "Failed to fetch stock prices")

# Main Lambda handler
def lambda_handler(event, context):
    """Main Lambda handler for Worthy API"""
    try:
        # Log the incoming event
        logger.info(f"Received event: {json.dumps(event, default=str)}")
        
        # Extract HTTP method and path
        http_method = event.get('httpMethod', '').upper()
        path = event.get('path', '')
        
        # Handle CORS preflight requests
        if http_method == 'OPTIONS':
            return create_response(200, {})
        
        # Route the request
        if http_method == 'GET' and path == '/health':
            return create_response(200, {
                "status": "healthy",
                "timestamp": datetime.utcnow().isoformat(),
                "environment": os.getenv('AWS_LAMBDA_FUNCTION_NAME', 'local')
            })
        
        elif http_method == 'GET' and path == '/':
            return create_response(200, {
                "message": "Worthy API is running",
                "version": "1.0.0",
                "environment": "lambda"
            })
        
        # Authentication endpoints
        elif path.startswith('/auth/'):
            # Parse request body for POST requests
            body = {}
            if http_method in ['POST', 'PUT'] and event.get('body'):
                try:
                    body = json.loads(event['body'])
                except json.JSONDecodeError:
                    return create_error_response(400, "Invalid JSON in request body")
            
            # Get headers for token verification
            request_headers = event.get('headers', {})
            
            # Route to specific auth endpoints
            if http_method == 'POST' and path == '/auth/register':
                return handle_register(body)
            
            elif http_method == 'POST' and path == '/auth/login':
                return handle_login(body)
            
            elif http_method == 'POST' and path == '/auth/logout':
                return handle_logout(request_headers)
            
            elif http_method == 'POST' and path == '/auth/refresh':
                return handle_refresh_token(request_headers)
            
            elif http_method == 'GET' and path == '/auth/verify':
                return handle_verify_token(request_headers)
            
            else:
                return create_error_response(404, f"Auth endpoint not found: {path}")
        
        # Asset management endpoints
        elif path == '/assets' and http_method == 'POST':
            # Create asset - requires authentication
            body = {}
            if event.get('body'):
                try:
                    body = json.loads(event['body'])
                except json.JSONDecodeError:
                    return create_error_response(400, "Invalid JSON in request body")
            
            request_headers = event.get('headers', {})
            auth_result = verify_jwt_token(request_headers.get('Authorization', ''))
            if not auth_result['valid']:
                return create_error_response(401, "Invalid or missing token")
            
            return handle_create_asset(body, auth_result['user_id'])
        
        elif path == '/assets' and http_method == 'GET':
            # Get user assets - requires authentication
            request_headers = event.get('headers', {})
            auth_result = verify_jwt_token(request_headers.get('Authorization', ''))
            if not auth_result['valid']:
                return create_error_response(401, "Invalid or missing token")
            
            return handle_get_assets(auth_result['user_id'])
        
        elif path.startswith('/assets/') and http_method == 'GET':
            # Get specific asset - requires authentication
            request_headers = event.get('headers', {})
            auth_result = verify_jwt_token(request_headers.get('Authorization', ''))
            if not auth_result['valid']:
                return create_error_response(401, "Invalid or missing token")
            
            try:
                asset_id = int(path.split('/')[-1])
                return handle_get_asset(asset_id, auth_result['user_id'])
            except ValueError:
                return create_error_response(400, "Invalid asset ID")
        
        elif path.startswith('/assets/') and http_method == 'PUT':
            # Update asset - requires authentication
            body = {}
            if event.get('body'):
                try:
                    body = json.loads(event['body'])
                except json.JSONDecodeError:
                    return create_error_response(400, "Invalid JSON in request body")
            
            request_headers = event.get('headers', {})
            auth_result = verify_jwt_token(request_headers.get('Authorization', ''))
            if not auth_result['valid']:
                return create_error_response(401, "Invalid or missing token")
            
            try:
                asset_id = int(path.split('/')[-1])
                return handle_update_asset(asset_id, body, auth_result['user_id'])
            except ValueError:
                return create_error_response(400, "Invalid asset ID")
        
        elif path.startswith('/assets/') and http_method == 'DELETE':
            # Delete asset - requires authentication
            request_headers = event.get('headers', {})
            auth_result = verify_jwt_token(request_headers.get('Authorization', ''))
            if not auth_result['valid']:
                return create_error_response(401, "Invalid or missing token")
            
            try:
                asset_id = int(path.split('/')[-1])
                return handle_delete_asset(asset_id, auth_result['user_id'])
            except ValueError:
                return create_error_response(400, "Invalid asset ID")
        
        elif path == '/transactions' and http_method == 'POST':
            # Create transaction - requires authentication
            body = {}
            if event.get('body'):
                try:
                    body = json.loads(event['body'])
                except json.JSONDecodeError:
                    return create_error_response(400, "Invalid JSON in request body")
            
            request_headers = event.get('headers', {})
            auth_result = verify_jwt_token(request_headers.get('Authorization', ''))
            if not auth_result['valid']:
                return create_error_response(401, "Invalid or missing token")
            
            return handle_create_transaction(body, auth_result['user_id'])
        
        # External API proxy endpoints (require authentication)
        elif path == '/api/exchange-rates' and http_method == 'GET':
            # Get exchange rates - requires authentication
            request_headers = event.get('headers', {})
            auth_result = verify_jwt_token(request_headers.get('Authorization', ''))
            if not auth_result['valid']:
                return create_error_response(401, "Invalid or missing token")
            
            # Get base currency from query parameters
            query_params = event.get('queryStringParameters') or {}
            base_currency = query_params.get('base', 'USD')
            
            return handle_get_exchange_rates(base_currency)
        
        elif path.startswith('/api/stock-price/') and http_method == 'GET':
            # Get single stock price - requires authentication
            request_headers = event.get('headers', {})
            auth_result = verify_jwt_token(request_headers.get('Authorization', ''))
            if not auth_result['valid']:
                return create_error_response(401, "Invalid or missing token")
            
            # Extract symbol from path
            symbol = path.split('/api/stock-price/')[-1]
            if not symbol:
                return create_error_response(400, "Stock symbol is required")
            
            return handle_get_stock_price(symbol)
        
        elif path == '/api/stock-prices' and http_method == 'POST':
            # Get multiple stock prices - requires authentication
            request_headers = event.get('headers', {})
            auth_result = verify_jwt_token(request_headers.get('Authorization', ''))
            if not auth_result['valid']:
                return create_error_response(401, "Invalid or missing token")
            
            body = {}
            if event.get('body'):
                try:
                    body = json.loads(event['body'])
                except json.JSONDecodeError:
                    return create_error_response(400, "Invalid JSON in request body")
            
            symbols = body.get('symbols', [])
            if not symbols:
                return create_error_response(400, "Symbols array is required")
            
            return handle_get_multiple_stock_prices(symbols)
        
        else:
            return create_error_response(404, f"Endpoint not found: {path}")
        
    except Exception as e:
        logger.error(f"Unhandled error: {str(e)}", exc_info=True)
        return create_error_response(500, "Internal server error")
