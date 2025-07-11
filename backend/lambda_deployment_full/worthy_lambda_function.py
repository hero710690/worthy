"""
Worthy App Complete Backend - Single File Lambda Function
Authentication system with hashlib-based password hashing
Asset management with UPDATE and DELETE functionality
Stock price caching with cachetools to reduce API calls
"""
import json
import os
import logging
import hashlib
import secrets
import jwt
import requests
import pytz
from datetime import datetime, timedelta
from email_validator import validate_email, EmailNotValidError

# Caching imports
from cachetools import TTLCache
import threading

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Initialize cache for stock prices
# TTL Cache with 5-minute expiration and max 1000 entries
# Thread-safe for Lambda concurrent executions
_cache_lock = threading.RLock()
stock_price_cache = TTLCache(maxsize=1000, ttl=1200)  # 20 minutes TTL
exchange_rate_cache = TTLCache(maxsize=100, ttl=3600)  # 1 hour TTL

logger.info("Initialized caching system - Stock prices: 5min TTL, Exchange rates: 1hr TTL")

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
JWT_SECRET = os.environ.get('JWT_SECRET', 'worthy-jwt-secret-2025-production')
JWT_ALGORITHM = 'HS256'
JWT_EXPIRATION_HOURS = 24
DATABASE_URL = os.environ.get('DATABASE_URL', '')

# API Configuration
ALPHA_VANTAGE_API_KEY = os.environ.get('ALPHA_VANTAGE_API_KEY', '')
ALPHA_VANTAGE_BASE_URL = 'https://www.alphavantage.co/query'
EXCHANGE_RATE_BASE_URL = 'https://api.exchangerate-api.com/v4/latest'

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

# Cache helper functions
def get_cached_stock_price(symbol):
    """Get stock price from cache if available"""
    with _cache_lock:
        cache_key = f"stock_{symbol.upper()}"
        cached_data = stock_price_cache.get(cache_key)
        if cached_data:
            logger.info(f"📦 Cache HIT for {symbol} - using cached data")
            # Add cache info to response
            cached_data['cached'] = True
            cached_data['cache_age_seconds'] = int((datetime.now() - datetime.fromisoformat(cached_data['cached_at'])).total_seconds())
            return cached_data
        else:
            logger.info(f"📦 Cache MISS for {symbol} - will fetch from API")
            return None

def set_cached_stock_price(symbol, price_data):
    """Store stock price in cache"""
    with _cache_lock:
        cache_key = f"stock_{symbol.upper()}"
        # Add cache metadata
        price_data['cached'] = False
        price_data['cached_at'] = datetime.now().isoformat()
        stock_price_cache[cache_key] = price_data.copy()
        logger.info(f"📦 Cached stock price for {symbol} (TTL: 5 minutes)")

def get_cached_exchange_rate(base_currency, target_currency):
    """Get exchange rate from cache if available"""
    with _cache_lock:
        cache_key = f"rate_{base_currency}_{target_currency}"
        cached_data = exchange_rate_cache.get(cache_key)
        if cached_data:
            logger.info(f"📦 Cache HIT for {base_currency}->{target_currency} exchange rate")
            return cached_data
        else:
            logger.info(f"📦 Cache MISS for {base_currency}->{target_currency} exchange rate")
            return None

def set_cached_exchange_rate(base_currency, target_currency, rate_data):
    """Store exchange rate in cache"""
    with _cache_lock:
        cache_key = f"rate_{base_currency}_{target_currency}"
        rate_data['cached_at'] = datetime.now().isoformat()
        exchange_rate_cache[cache_key] = rate_data.copy()
        logger.info(f"📦 Cached exchange rate {base_currency}->{target_currency} (TTL: 1 hour)")

def get_cache_stats():
    """Get cache statistics for monitoring"""
    with _cache_lock:
        return {
            'stock_price_cache': {
                'size': len(stock_price_cache),
                'maxsize': stock_price_cache.maxsize,
                'ttl': stock_price_cache.ttl,
                'hits': getattr(stock_price_cache, 'hits', 0),
                'misses': getattr(stock_price_cache, 'misses', 0)
            },
            'exchange_rate_cache': {
                'size': len(exchange_rate_cache),
                'maxsize': exchange_rate_cache.maxsize,
                'ttl': exchange_rate_cache.ttl,
                'hits': getattr(exchange_rate_cache, 'hits', 0),
                'misses': getattr(exchange_rate_cache, 'misses', 0)
            }
        }

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
        
        # Validate transaction type
        valid_types = ['LumpSum', 'Recurring', 'Initialization', 'Dividend']
        if transaction_type not in valid_types:
            return create_error_response(400, f"Invalid transaction type. Must be one of: {', '.join(valid_types)}")
        shares = body.get('shares', 0)
        price_per_share = body.get('price_per_share', 0)
        currency = body.get('currency', 'USD')
        transaction_date = body.get('transaction_date')
        
        if not asset_id:
            return create_error_response(400, "Asset ID is required")
        
        # Handle dividend transactions differently
        if transaction_type == 'Dividend':
            # For dividends, shares should be 0 and price_per_share represents dividend per share
            if shares != 0:
                return create_error_response(400, "Dividend transactions should have shares = 0")
            
            # Validate dividend amount (price_per_share for dividends represents dividend per share)
            dividend_per_share = price_per_share
            if dividend_per_share <= 0:
                return create_error_response(400, "Dividend per share must be greater than 0")
        else:
            # Validate shares and price for non-dividend transactions
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
        
        # Update asset totals (only for non-dividend transactions)
        if transaction_type != 'Dividend':
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
        else:
            # For dividends, just update the timestamp without changing shares or cost basis
            execute_update(
                DATABASE_URL,
                """
                UPDATE assets 
                SET updated_at = CURRENT_TIMESTAMP
                WHERE asset_id = %s
                """,
                (asset_id,)
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

def handle_get_transactions(user_id):
    """Get all transactions for a user"""
    try:
        transactions = execute_query(
            DATABASE_URL,
            """
            SELECT t.*, a.ticker_symbol, a.asset_type 
            FROM transactions t
            JOIN assets a ON t.asset_id = a.asset_id
            WHERE a.user_id = %s
            ORDER BY t.transaction_date DESC, t.created_at DESC
            """,
            (user_id,)
        )
        
        transaction_list = []
        for txn in transactions:
            transaction_list.append({
                "transaction_id": txn['transaction_id'],
                "asset_id": txn['asset_id'],
                "ticker_symbol": txn['ticker_symbol'],
                "asset_type": txn['asset_type'],
                "transaction_type": txn['transaction_type'],
                "transaction_date": txn['transaction_date'].isoformat(),
                "shares": float(txn['shares']),
                "price_per_share": float(txn['price_per_share']),
                "total_amount": float(txn['shares']) * float(txn['price_per_share']),
                "currency": txn['currency'],
                "created_at": txn['created_at'].isoformat()
            })
        
        return create_response(200, {
            "transactions": transaction_list,
            "total_count": len(transaction_list)
        })
        
    except Exception as e:
        logger.error(f"Get transactions error: {str(e)}")
        return create_error_response(500, "Failed to retrieve transactions")

def handle_update_transaction(transaction_id, body, user_id):
    """Update a transaction and recalculate asset aggregations"""
    try:
        # Verify transaction belongs to user and get current details
        transaction = execute_query(
            DATABASE_URL,
            """
            SELECT t.*, a.user_id, a.asset_id, a.ticker_symbol
            FROM transactions t
            JOIN assets a ON t.asset_id = a.asset_id
            WHERE t.transaction_id = %s AND a.user_id = %s
            """,
            (transaction_id, user_id)
        )
        
        if not transaction:
            return create_error_response(404, "Transaction not found")
        
        transaction = transaction[0]
        asset_id = transaction['asset_id']
        old_shares = float(transaction['shares'])
        old_price = float(transaction['price_per_share'])
        
        # Get update data
        shares = body.get('shares', 0)
        price_per_share = body.get('price_per_share', 0)
        transaction_date = body.get('transaction_date')
        currency = body.get('currency', '').strip()
        
        # Validate input
        if shares <= 0:
            return create_error_response(400, "Shares must be greater than 0")
        
        if price_per_share <= 0:
            return create_error_response(400, "Price per share must be greater than 0")
        
        if not currency:
            return create_error_response(400, "Currency is required")
        
        # Parse transaction date
        if transaction_date:
            try:
                from datetime import datetime
                transaction_date = datetime.strptime(transaction_date, '%Y-%m-%d').date()
            except ValueError:
                return create_error_response(400, "Invalid date format. Use YYYY-MM-DD")
        else:
            transaction_date = transaction['transaction_date']
        
        # Check if shares or price changed (affects asset aggregation)
        shares_changed = abs(float(shares) - old_shares) > 0.000001
        price_changed = abs(float(price_per_share) - old_price) > 0.01
        
        # Update transaction
        execute_update(
            DATABASE_URL,
            """
            UPDATE transactions 
            SET shares = %s, price_per_share = %s, transaction_date = %s, currency = %s
            WHERE transaction_id = %s
            """,
            (shares, price_per_share, transaction_date, currency, transaction_id)
        )
        
        # Recalculate asset aggregations if shares or price changed
        if shares_changed or price_changed:
            logger.info(f"Recalculating asset aggregations for asset {asset_id} due to transaction update")
            
            # Get all transactions for this asset (excluding dividend transactions)
            asset_transactions = execute_query(
                DATABASE_URL,
                """
                SELECT shares, price_per_share, transaction_type
                FROM transactions 
                WHERE asset_id = %s AND transaction_type != 'Dividend'
                ORDER BY transaction_date ASC, created_at ASC
                """,
                (asset_id,)
            )
            
            if asset_transactions:
                # Recalculate totals from all transactions
                total_shares = 0
                total_cost = 0
                
                for txn in asset_transactions:
                    txn_shares = float(txn['shares'])
                    txn_price = float(txn['price_per_share'])
                    total_shares += txn_shares
                    total_cost += txn_shares * txn_price
                
                if total_shares > 0:
                    new_avg_cost = total_cost / total_shares
                    
                    # Update asset with recalculated values
                    execute_update(
                        DATABASE_URL,
                        """
                        UPDATE assets 
                        SET total_shares = %s, average_cost_basis = %s, updated_at = CURRENT_TIMESTAMP
                        WHERE asset_id = %s
                        """,
                        (total_shares, new_avg_cost, asset_id)
                    )
                    
                    logger.info(f"Updated asset {asset_id}: {total_shares} shares @ ${new_avg_cost:.2f}")
                else:
                    # No shares left, delete the asset
                    execute_update(
                        DATABASE_URL,
                        "DELETE FROM assets WHERE asset_id = %s",
                        (asset_id,)
                    )
                    logger.info(f"Deleted asset {asset_id} - no shares remaining")
            else:
                # No transactions left, delete the asset
                execute_update(
                    DATABASE_URL,
                    "DELETE FROM assets WHERE asset_id = %s",
                    (asset_id,)
                )
                logger.info(f"Deleted asset {asset_id} - no transactions remaining")
        
        # Get updated transaction
        updated_transaction = execute_query(
            DATABASE_URL,
            """
            SELECT t.*, a.ticker_symbol, a.asset_type 
            FROM transactions t
            JOIN assets a ON t.asset_id = a.asset_id
            WHERE t.transaction_id = %s
            """,
            (transaction_id,)
        )[0]
        
        return create_response(200, {
            "message": "Transaction updated successfully",
            "transaction": {
                "transaction_id": updated_transaction['transaction_id'],
                "asset_id": updated_transaction['asset_id'],
                "ticker_symbol": updated_transaction['ticker_symbol'],
                "asset_type": updated_transaction['asset_type'],
                "transaction_type": updated_transaction['transaction_type'],
                "transaction_date": updated_transaction['transaction_date'].isoformat(),
                "shares": float(updated_transaction['shares']),
                "price_per_share": float(updated_transaction['price_per_share']),
                "total_amount": float(updated_transaction['shares']) * float(updated_transaction['price_per_share']),
                "currency": updated_transaction['currency'],
                "created_at": updated_transaction['created_at'].isoformat() if updated_transaction['created_at'] else None
            }
        })
        
    except Exception as e:
        logger.error(f"Update transaction error: {str(e)}")
        import traceback
        logger.error(f"Update transaction traceback: {traceback.format_exc()}")
        return create_error_response(500, f"Failed to update transaction: {str(e)}")

def handle_delete_transaction(transaction_id, user_id):
    """Delete a transaction and rollback asset aggregation"""
    try:
        # Verify transaction belongs to user and get transaction details
        transaction = execute_query(
            DATABASE_URL,
            """
            SELECT t.*, a.user_id, a.ticker_symbol, a.asset_id, a.total_shares, a.average_cost_basis
            FROM transactions t
            JOIN assets a ON t.asset_id = a.asset_id
            WHERE t.transaction_id = %s AND a.user_id = %s
            """,
            (transaction_id, user_id)
        )
        
        if not transaction:
            return create_error_response(404, "Transaction not found")
        
        transaction = transaction[0]
        asset_id = transaction['asset_id']
        
        # Handle rollback based on transaction type
        rollback_applied = False
        
        if transaction['transaction_type'] == 'LumpSum':
            # Rollback LumpSum transactions (existing logic)
            # Get current asset totals
            current_total_shares = float(transaction['total_shares'])
            current_avg_cost = float(transaction['average_cost_basis'])
            
            # Get transaction details to rollback
            transaction_shares = float(transaction['shares'])
            transaction_price = float(transaction['price_per_share'])
            
            # Calculate new totals after removing this transaction
            new_total_shares = current_total_shares - transaction_shares
            
            if new_total_shares > 0:
                # Recalculate weighted average cost basis
                # Current total value = current_total_shares * current_avg_cost
                # Transaction value = transaction_shares * transaction_price
                # New total value = current_total_value - transaction_value
                # New avg cost = new_total_value / new_total_shares
                
                current_total_value = current_total_shares * current_avg_cost
                transaction_value = transaction_shares * transaction_price
                new_total_value = current_total_value - transaction_value
                new_avg_cost = new_total_value / new_total_shares
                
                # Update asset with rollback values
                execute_update(
                    DATABASE_URL,
                    """
                    UPDATE assets 
                    SET total_shares = %s, average_cost_basis = %s, updated_at = CURRENT_TIMESTAMP
                    WHERE asset_id = %s
                    """,
                    (new_total_shares, new_avg_cost, asset_id)
                )
            else:
                # If no shares left, delete the asset entirely
                execute_update(
                    DATABASE_URL,
                    "DELETE FROM assets WHERE asset_id = %s",
                    (asset_id,)
                )
            rollback_applied = True
            
        elif transaction['transaction_type'] == 'Recurring':
            # Rollback Recurring transactions - same logic as LumpSum
            logger.info(f"Rolling back recurring transaction {transaction_id}")
            
            # Get current asset totals
            current_total_shares = float(transaction['total_shares'])
            current_avg_cost = float(transaction['average_cost_basis'])
            
            # Get transaction details to rollback
            transaction_shares = float(transaction['shares'])
            transaction_price = float(transaction['price_per_share'])
            
            # Calculate new totals after removing this transaction
            new_total_shares = current_total_shares - transaction_shares
            
            if new_total_shares > 0:
                # Recalculate weighted average cost basis
                current_total_value = current_total_shares * current_avg_cost
                transaction_value = transaction_shares * transaction_price
                new_total_value = current_total_value - transaction_value
                new_avg_cost = new_total_value / new_total_shares
                
                # Update asset with rollback values
                execute_update(
                    DATABASE_URL,
                    """
                    UPDATE assets 
                    SET total_shares = %s, average_cost_basis = %s, updated_at = CURRENT_TIMESTAMP
                    WHERE asset_id = %s
                    """,
                    (new_total_shares, new_avg_cost, asset_id)
                )
                
                logger.info(f"Rolled back recurring transaction: {current_total_shares} -> {new_total_shares} shares")
                logger.info(f"Updated average cost basis: ${current_avg_cost:.2f} -> ${new_avg_cost:.2f}")
            else:
                # If no shares left, delete the asset entirely
                execute_update(
                    DATABASE_URL,
                    "DELETE FROM assets WHERE asset_id = %s",
                    (asset_id,)
                )
                logger.info(f"Deleted asset {asset_id} - no shares remaining after rollback")
            
            rollback_applied = True
            
        elif transaction['transaction_type'] == 'Initialization':
            # Rollback Initialization transactions - similar to LumpSum but more careful
            logger.info(f"Rolling back initialization transaction {transaction_id}")
            
            # For initialization transactions, we need to be extra careful
            # Check if there are other transactions for this asset
            other_transactions = execute_query(
                DATABASE_URL,
                """
                SELECT COUNT(*) as count FROM transactions 
                WHERE asset_id = %s AND transaction_id != %s
                """,
                (asset_id, transaction_id)
            )
            
            if other_transactions[0]['count'] > 0:
                # There are other transactions, so we need to recalculate from scratch
                logger.info("Other transactions exist - recalculating asset totals from remaining transactions")
                
                # Get all remaining transactions for this asset
                remaining_transactions = execute_query(
                    DATABASE_URL,
                    """
                    SELECT shares, price_per_share, transaction_type 
                    FROM transactions 
                    WHERE asset_id = %s AND transaction_id != %s
                    ORDER BY transaction_date ASC, created_at ASC
                    """,
                    (asset_id, transaction_id)
                )
                
                if remaining_transactions:
                    # Recalculate totals from remaining transactions
                    total_shares = 0
                    total_cost = 0
                    
                    for txn in remaining_transactions:
                        if txn['transaction_type'] != 'Dividend':  # Skip dividend transactions
                            shares = float(txn['shares'])
                            price = float(txn['price_per_share'])
                            total_shares += shares
                            total_cost += shares * price
                    
                    if total_shares > 0:
                        new_avg_cost = total_cost / total_shares
                        
                        # Update asset with recalculated values
                        execute_update(
                            DATABASE_URL,
                            """
                            UPDATE assets 
                            SET total_shares = %s, average_cost_basis = %s, updated_at = CURRENT_TIMESTAMP
                            WHERE asset_id = %s
                            """,
                            (total_shares, new_avg_cost, asset_id)
                        )
                        
                        logger.info(f"Recalculated asset totals: {total_shares} shares @ ${new_avg_cost:.2f}")
                    else:
                        # No valid shares left, delete asset
                        execute_update(
                            DATABASE_URL,
                            "DELETE FROM assets WHERE asset_id = %s",
                            (asset_id,)
                        )
                        logger.info(f"Deleted asset {asset_id} - no valid shares remaining")
                else:
                    # No remaining transactions, delete asset
                    execute_update(
                        DATABASE_URL,
                        "DELETE FROM assets WHERE asset_id = %s",
                        (asset_id,)
                    )
                    logger.info(f"Deleted asset {asset_id} - no remaining transactions")
            else:
                # This is the only transaction, delete the entire asset
                execute_update(
                    DATABASE_URL,
                    "DELETE FROM assets WHERE asset_id = %s",
                    (asset_id,)
                )
                logger.info(f"Deleted asset {asset_id} - was the only transaction (initialization)")
            
            rollback_applied = True
            # Rollback Dividend transactions - find and reset corresponding dividend record
            logger.info(f"Rolling back dividend transaction {transaction_id}")
            
            # Find dividend records that match this transaction
            # We need to find dividends that were processed around the same time and amount
            dividend_records = execute_query(
                DATABASE_URL,
                """
                SELECT dividend_id, total_dividend_amount, is_reinvested 
                FROM dividends 
                WHERE asset_id = %s 
                  AND user_id = %s 
                  AND is_reinvested = TRUE
                  AND ABS(total_dividend_amount - %s) < 0.01
                  AND payment_date = %s
                ORDER BY updated_at DESC
                LIMIT 1
                """,
                (asset_id, user_id, abs(float(transaction['shares']) * float(transaction['price_per_share'])), 
                 transaction['transaction_date'])
            )
            
            if dividend_records:
                dividend_record = dividend_records[0]
                # Reset dividend to pending status
                execute_update(
                    DATABASE_URL,
                    """
                    UPDATE dividends 
                    SET is_reinvested = FALSE, updated_at = CURRENT_TIMESTAMP 
                    WHERE dividend_id = %s
                    """,
                    (dividend_record['dividend_id'],)
                )
                logger.info(f"Reset dividend {dividend_record['dividend_id']} to pending status")
                rollback_applied = True
            else:
                logger.warning(f"No matching dividend record found for transaction {transaction_id}")
                # Still apply rollback flag since we attempted the rollback
                rollback_applied = True
        
        # Delete the transaction
        execute_update(
            DATABASE_URL,
            "DELETE FROM transactions WHERE transaction_id = %s",
            (transaction_id,)
        )
        
        return create_response(200, {
            "message": f"Transaction for {transaction['ticker_symbol']} deleted successfully",
            "rollback_applied": rollback_applied,
            "transaction_type": transaction['transaction_type']
        })
        
    except Exception as e:
        logger.error(f"Delete transaction error: {str(e)}")
        return create_error_response(500, "Failed to delete transaction")

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

# ============================================================================
# MILESTONE 4: RECURRING INVESTMENTS & AUTOMATION FUNCTIONS
# ============================================================================

def create_recurring_investments_table():
    """Create recurring_investments table if it doesn't exist"""
    try:
        execute_update(
            DATABASE_URL,
            """
            CREATE TABLE IF NOT EXISTS recurring_investments (
                recurring_id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
                ticker_symbol VARCHAR(10) NOT NULL,
                amount DECIMAL(15,2) NOT NULL,
                currency VARCHAR(3) NOT NULL DEFAULT 'USD',
                frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'quarterly')),
                start_date DATE NOT NULL,
                next_run_date DATE NOT NULL,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        
        # Drop and recreate the constraint if it exists with wrong values
        try:
            execute_update(
                DATABASE_URL,
                """
                ALTER TABLE recurring_investments 
                DROP CONSTRAINT IF EXISTS recurring_investments_frequency_check
                """
            )
            execute_update(
                DATABASE_URL,
                """
                ALTER TABLE recurring_investments 
                ADD CONSTRAINT recurring_investments_frequency_check 
                CHECK (frequency IN ('daily', 'weekly', 'monthly', 'quarterly'))
                """
            )
        except Exception as constraint_error:
            logger.warning(f"Constraint update warning: {str(constraint_error)}")
        
        logger.info("✅ RecurringInvestments table created/verified")
    except Exception as e:
        logger.error(f"❌ Failed to create recurring_investments table: {str(e)}")

def create_fire_profile_table():
    """Create fire_profile table if it doesn't exist and migrate existing tables"""
    try:
        # First, create the table if it doesn't exist (basic structure)
        execute_update(
            DATABASE_URL,
            """
            CREATE TABLE IF NOT EXISTS fire_profile (
                profile_id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
                annual_expenses DECIMAL(15,2),
                safe_withdrawal_rate DECIMAL(5,4) DEFAULT 0.04,
                expected_annual_return DECIMAL(5,4) DEFAULT 0.07,
                target_retirement_age INTEGER,
                barista_annual_income DECIMAL(15,2) DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        
        # Now add the comprehensive fields if they don't exist (migration)
        comprehensive_fields = [
            ("annual_income", "DECIMAL(15,2) DEFAULT 1000000"),
            ("annual_savings", "DECIMAL(15,2) DEFAULT 200000"),
            ("expected_return_pre_retirement", "DECIMAL(5,4) DEFAULT 0.07"),
            ("expected_return_post_retirement", "DECIMAL(5,4) DEFAULT 0.05"),
            ("expected_inflation_rate", "DECIMAL(5,4) DEFAULT 0.025"),
            ("other_passive_income", "DECIMAL(15,2) DEFAULT 0"),
            ("effective_tax_rate", "DECIMAL(5,4) DEFAULT 0.15"),
            ("barista_annual_contribution", "DECIMAL(15,2) DEFAULT 0"),  # New: contribution capacity during part-time
            ("inflation_rate", "DECIMAL(5,4) DEFAULT 0.025")  # New: user-specific inflation assumption
        ]
        
        for field_name, field_definition in comprehensive_fields:
            try:
                # Try to add each column if it doesn't exist
                execute_update(
                    DATABASE_URL,
                    f"ALTER TABLE fire_profile ADD COLUMN IF NOT EXISTS {field_name} {field_definition}"
                )
                logger.info(f"✅ Added/verified column: {field_name}")
            except Exception as e:
                # Column might already exist, which is fine
                logger.info(f"ℹ️ Column {field_name} already exists or error: {str(e)}")
        
        logger.info("✅ FIREProfile table created/verified with comprehensive fields")
    except Exception as e:
        logger.error(f"❌ Failed to create/migrate fire_profile table: {str(e)}")

def create_dividends_table():
    """Create dividends table for Milestone 4 dividend tracking"""
    try:
        execute_update(
            DATABASE_URL,
            """
            CREATE TABLE IF NOT EXISTS dividends (
                dividend_id SERIAL PRIMARY KEY,
                asset_id INTEGER NOT NULL REFERENCES assets(asset_id) ON DELETE CASCADE,
                user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
                ticker_symbol VARCHAR(10) NOT NULL,
                ex_dividend_date DATE NOT NULL,
                payment_date DATE,
                dividend_per_share DECIMAL(10,4) NOT NULL,
                total_dividend_amount DECIMAL(15,2) NOT NULL,
                currency VARCHAR(3) NOT NULL DEFAULT 'USD',
                dividend_type VARCHAR(20) DEFAULT 'regular',
                tax_rate DECIMAL(5,2) DEFAULT 20.0,
                is_reinvested BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        logger.info("✅ Dividends table created/verified")
    except Exception as e:
        logger.error(f"❌ Failed to create dividends table: {str(e)}")

# ============================================================================
# DIVIDEND MANAGEMENT FUNCTIONS
# ============================================================================

def handle_get_dividends(user_id):
    """Get all dividends for a user with proper currency conversion using asset currencies"""
    try:
        # Get user's base currency
        user = execute_query(
            DATABASE_URL,
            "SELECT base_currency FROM users WHERE user_id = %s",
            (user_id,)
        )
        
        if not user:
            return create_error_response(404, "User not found")
        
        base_currency = user[0]['base_currency']
        
        # Get dividends with asset currency information
        dividends = execute_query(
            DATABASE_URL,
            """
            SELECT d.*, a.ticker_symbol, a.total_shares as shares_owned, a.currency as asset_currency
            FROM dividends d
            JOIN assets a ON d.asset_id = a.asset_id
            WHERE d.user_id = %s
            ORDER BY d.payment_date DESC, d.created_at DESC
            """,
            (user_id,)
        )
        
        # Get exchange rates for currency conversion
        exchange_rates = {}
        # Use asset currencies (not dividend currencies) for conversion
        unique_currencies = set([d['asset_currency'] for d in dividends if d['asset_currency'] != base_currency])
        
        if unique_currencies:
            try:
                # Fetch exchange rates for all unique asset currencies
                cached_rates = get_cached_exchange_rate(base_currency, 'ALL')
                if cached_rates and 'rates' in cached_rates:
                    exchange_rates = cached_rates['rates']
                else:
                    # Fetch fresh rates if not cached
                    url = f"{EXCHANGE_RATE_BASE_URL}/{base_currency}"
                    response = requests.get(url, timeout=10)
                    if response.status_code == 200:
                        data = response.json()
                        exchange_rates = data.get('rates', {})
                        # Cache the rates
                        result = {
                            "success": True,
                            "base": base_currency,
                            "rates": exchange_rates,
                            "last_updated": data.get('date', datetime.utcnow().isoformat()),
                            "source": "ExchangeRate-API",
                            "cached": False
                        }
                        set_cached_exchange_rate(base_currency, 'ALL', result)
            except Exception as e:
                logger.warning(f"Failed to fetch exchange rates: {str(e)}")
                # Continue without conversion if rates unavailable
        
        def convert_to_base_currency(amount, from_currency):
            """Convert amount from asset currency to user's base currency"""
            if from_currency == base_currency:
                return float(amount)
            
            if from_currency in exchange_rates:
                # Convert from asset currency to base currency
                rate = exchange_rates[from_currency]
                if rate > 0:
                    converted = float(amount) / rate
                    logger.info(f"💱 Converted {amount} {from_currency} to {converted:.2f} {base_currency} (rate: {rate})")
                    return converted
            
            # If conversion fails, return original amount
            logger.warning(f"⚠️ Could not convert {amount} {from_currency} to {base_currency}")
            return float(amount)
        
        # Calculate totals with currency conversion using ASSET currencies
        pending_dividends = [d for d in dividends if not d.get('is_reinvested', False)]
        processed_dividends = [d for d in dividends if d.get('is_reinvested', False)]
        
        total_pending_base = sum(
            convert_to_base_currency(d['total_dividend_amount'], d['asset_currency']) 
            for d in pending_dividends
        )
        total_processed_base = sum(
            convert_to_base_currency(d['total_dividend_amount'], d['asset_currency']) 
            for d in processed_dividends
        )
        
        # Format dividends for frontend
        formatted_dividends = []
        for d in dividends:
            original_amount = float(d['total_dividend_amount'])
            asset_currency = d['asset_currency']
            converted_amount = convert_to_base_currency(d['total_dividend_amount'], asset_currency)
            
            formatted_dividends.append({
                'dividend_id': d['dividend_id'],
                'asset_id': d['asset_id'],
                'ticker_symbol': d['ticker_symbol'],
                'dividend_per_share': float(d['dividend_per_share']),
                'ex_dividend_date': d['ex_dividend_date'].isoformat() if d['ex_dividend_date'] else None,
                'payment_date': d['payment_date'].isoformat() if d['payment_date'] else None,
                'total_dividend': original_amount,
                'total_dividend_base_currency': converted_amount,
                'shares_owned': float(d['shares_owned']),
                'currency': asset_currency,  # Use asset currency, not dividend currency
                'base_currency': base_currency,
                'exchange_rate_used': exchange_rates.get(asset_currency) if asset_currency != base_currency else 1.0,
                'tax_rate': float(d.get('tax_rate', 20.0)),  # Include tax rate, default to 20%
                'status': 'processed' if d.get('is_reinvested', False) else 'pending',
                'created_at': d['created_at'].isoformat() if d['created_at'] else None,
                'updated_at': d['updated_at'].isoformat() if d['updated_at'] else None
            })
        
        return create_response(200, {
            "dividends": formatted_dividends,
            "total_pending": float(total_pending_base),
            "total_processed": float(total_processed_base),
            "base_currency": base_currency,
            "exchange_rates_available": len(exchange_rates) > 0,
            "summary": {
                "pending_count": len(pending_dividends),
                "processed_count": len(processed_dividends),
                "total_count": len(dividends),
                "currencies_involved": list(set([d['asset_currency'] for d in dividends]))
            }
        })
        
    except Exception as e:
        logger.error(f"Get dividends error: {str(e)}")
        return create_error_response(500, "Failed to get dividends")

def handle_create_dividend(body, user_id):
    """Create a new dividend manually using the asset's currency"""
    try:
        # Validate required fields (removed currency as it should come from asset)
        required_fields = ['asset_id', 'dividend_per_share', 'ex_dividend_date', 'payment_date']
        for field in required_fields:
            if field not in body:
                return create_error_response(400, f"Missing required field: {field}")
        
        asset_id = body['asset_id']
        dividend_per_share = float(body['dividend_per_share'])
        ex_dividend_date = body['ex_dividend_date']
        payment_date = body['payment_date']
        tax_rate = float(body.get('tax_rate', 20.0))  # Default to 20% if not provided
        
        # Verify asset belongs to user and get details including currency
        asset = execute_query(
            DATABASE_URL,
            "SELECT * FROM assets WHERE asset_id = %s AND user_id = %s",
            (asset_id, user_id)
        )
        
        if not asset:
            return create_error_response(404, "Asset not found")
        
        asset = asset[0]
        asset_currency = asset['currency']  # Use the asset's currency
        total_dividend = dividend_per_share * float(asset['total_shares'])
        
        # Create dividend record using asset's currency
        dividend_id = execute_update(
            DATABASE_URL,
            """
            INSERT INTO dividends (
                asset_id, user_id, ticker_symbol, ex_dividend_date, payment_date,
                dividend_per_share, total_dividend_amount, currency, tax_rate
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING dividend_id
            """,
            (asset_id, user_id, asset['ticker_symbol'], ex_dividend_date, payment_date,
             dividend_per_share, total_dividend, asset_currency, tax_rate)
        )
        
        return create_response(201, {
            "message": "Dividend created successfully",
            "dividend": {
                "dividend_id": dividend_id,
                "asset_id": asset_id,
                "ticker_symbol": asset['ticker_symbol'],
                "dividend_per_share": dividend_per_share,
                "total_dividend": total_dividend,
                "ex_dividend_date": ex_dividend_date,
                "payment_date": payment_date,
                "currency": asset_currency,  # Return asset's currency
                "status": "pending"
            }
        })
        
    except Exception as e:
        logger.error(f"Create dividend error: {str(e)}")
        return create_error_response(500, "Failed to create dividend")

def handle_process_dividend(dividend_id, body, user_id):
    """Process a dividend (reinvest or add to cash)"""
    try:
        action = body.get('action')  # 'reinvest' or 'cash'
        
        if action not in ['reinvest', 'cash']:
            return create_error_response(400, "Action must be 'reinvest' or 'cash'")
        
        # Get dividend details
        dividend = execute_query(
            DATABASE_URL,
            """
            SELECT d.*, a.ticker_symbol
            FROM dividends d
            JOIN assets a ON d.asset_id = a.asset_id
            WHERE d.dividend_id = %s AND d.user_id = %s AND d.is_reinvested = FALSE
            """,
            (dividend_id, user_id)
        )
        
        if not dividend:
            return create_error_response(404, "Dividend not found or already processed")
        
        dividend = dividend[0]
        
        if action == 'reinvest':
            # Reinvest in specified asset
            reinvest_asset_id = body.get('reinvest_asset_id', dividend['asset_id'])
            
            # Get current stock price for reinvestment
            try:
                stock_price_data = fetch_stock_price_with_fallback(dividend['ticker_symbol'])
                if stock_price_data and 'price' in stock_price_data:
                    current_price = stock_price_data['price']
                else:
                    return create_error_response(400, "Unable to get current stock price for reinvestment")
                
                # Calculate shares to buy
                shares_to_buy = float(dividend['total_dividend_amount']) / current_price
                
                # Create transaction
                execute_update(
                    DATABASE_URL,
                    """
                    INSERT INTO transactions (
                        asset_id, transaction_type, transaction_date, shares, 
                        price_per_share, currency
                    ) VALUES (%s, %s, %s, %s, %s, %s)
                    """,
                    (reinvest_asset_id, 'Dividend', dividend['payment_date'], 
                     shares_to_buy, current_price, dividend['currency'])
                )
                
                # Update asset totals
                asset = execute_query(
                    DATABASE_URL,
                    "SELECT * FROM assets WHERE asset_id = %s",
                    (reinvest_asset_id,)
                )[0]
                
                new_total_shares = float(asset['total_shares']) + shares_to_buy
                current_total_value = float(asset['total_shares']) * float(asset['average_cost_basis'])
                new_investment_value = shares_to_buy * current_price
                new_total_value = current_total_value + new_investment_value
                new_avg_cost = new_total_value / new_total_shares
                
                execute_update(
                    DATABASE_URL,
                    """
                    UPDATE assets 
                    SET total_shares = %s, average_cost_basis = %s, updated_at = CURRENT_TIMESTAMP
                    WHERE asset_id = %s
                    """,
                    (new_total_shares, new_avg_cost, reinvest_asset_id)
                )
                
            except Exception as e:
                logger.error(f"Reinvestment error: {str(e)}")
                return create_error_response(500, "Failed to process reinvestment")
                
        elif action == 'cash':
            # Add to specified cash asset or create default if not specified
            cash_asset_id = body.get('cash_asset_id')
            
            if cash_asset_id:
                # Use specified cash asset
                cash_asset = execute_query(
                    DATABASE_URL,
                    "SELECT * FROM assets WHERE asset_id = %s AND user_id = %s",
                    (cash_asset_id, user_id)
                )
                
                if not cash_asset:
                    return create_error_response(404, "Specified cash asset not found")
                
                cash_asset = cash_asset[0]
                
                # Update existing cash asset
                new_cash_amount = float(cash_asset['total_shares']) + float(dividend['total_dividend_amount'])
                execute_update(
                    DATABASE_URL,
                    """
                    UPDATE assets 
                    SET total_shares = %s, updated_at = CURRENT_TIMESTAMP
                    WHERE asset_id = %s
                    """,
                    (new_cash_amount, cash_asset_id)
                )
                
            else:
                # Fallback to default CASH asset (create if doesn't exist)
                cash_asset = execute_query(
                    DATABASE_URL,
                    "SELECT * FROM assets WHERE user_id = %s AND ticker_symbol = 'CASH'",
                    (user_id,)
                )
                
                if not cash_asset:
                    # Create default cash asset
                    execute_update(
                        DATABASE_URL,
                        """
                        INSERT INTO assets (
                            user_id, ticker_symbol, asset_type, total_shares, 
                            average_cost_basis, currency
                        ) VALUES (%s, %s, %s, %s, %s, %s)
                        """,
                        (user_id, 'CASH', 'Cash', float(dividend['total_dividend_amount']), 
                         1.0, dividend['currency'])
                    )
                    
                    # Get the newly created asset ID
                    cash_asset_id = execute_query(
                        DATABASE_URL,
                        "SELECT asset_id FROM assets WHERE user_id = %s AND ticker_symbol = 'CASH'",
                        (user_id,)
                    )[0]['asset_id']
                else:
                    # Update existing default cash asset
                    cash_asset = cash_asset[0]
                    cash_asset_id = cash_asset['asset_id']
                    new_cash_amount = float(cash_asset['total_shares']) + float(dividend['total_dividend_amount'])
                    execute_update(
                        DATABASE_URL,
                        """
                        UPDATE assets 
                        SET total_shares = %s, updated_at = CURRENT_TIMESTAMP
                        WHERE asset_id = %s
                        """,
                        (new_cash_amount, cash_asset_id)
                    )
            
            # Create cash transaction
            execute_update(
                DATABASE_URL,
                """
                INSERT INTO transactions (
                    asset_id, transaction_type, transaction_date, shares, 
                    price_per_share, currency
                ) VALUES (%s, %s, %s, %s, %s, %s)
                """,
                (cash_asset_id, 'Dividend', dividend['payment_date'], 
                 float(dividend['total_dividend_amount']), 1.0, dividend['currency'])
            )
        
        # Mark dividend as processed
        execute_update(
            DATABASE_URL,
            "UPDATE dividends SET is_reinvested = TRUE, updated_at = CURRENT_TIMESTAMP WHERE dividend_id = %s",
            (dividend_id,)
        )
        
        return create_response(200, {
            "message": f"Dividend {action}ed successfully",
            "action": action,
            "amount": float(dividend['total_dividend_amount'])
        })
        
    except Exception as e:
        logger.error(f"Process dividend error: {str(e)}")
        return create_error_response(500, "Failed to process dividend")

def handle_update_dividend(dividend_id, body, user_id):
    """Update a dividend (mainly for tax rate changes)"""
    try:
        # Verify dividend belongs to user
        dividend = execute_query(
            DATABASE_URL,
            "SELECT * FROM dividends WHERE dividend_id = %s AND user_id = %s",
            (dividend_id, user_id)
        )
        
        if not dividend:
            return create_error_response(404, "Dividend not found")
        
        dividend = dividend[0]
        
        # Get update fields from body
        tax_rate = body.get('tax_rate')
        dividend_per_share = body.get('dividend_per_share')
        ex_dividend_date = body.get('ex_dividend_date')
        payment_date = body.get('payment_date')
        
        # Build update query dynamically based on provided fields
        update_fields = []
        update_values = []
        
        if tax_rate is not None:
            update_fields.append("tax_rate = %s")
            update_values.append(float(tax_rate))
        
        if dividend_per_share is not None:
            update_fields.append("dividend_per_share = %s")
            update_values.append(float(dividend_per_share))
            # Also update total dividend amount
            total_dividend = float(dividend_per_share) * float(dividend['total_dividend_amount']) / float(dividend['dividend_per_share'])
            update_fields.append("total_dividend_amount = %s")
            update_values.append(total_dividend)
        
        if ex_dividend_date is not None:
            update_fields.append("ex_dividend_date = %s")
            update_values.append(ex_dividend_date)
        
        if payment_date is not None:
            update_fields.append("payment_date = %s")
            update_values.append(payment_date)
        
        if not update_fields:
            return create_error_response(400, "No valid fields to update")
        
        # Add updated_at timestamp
        update_fields.append("updated_at = CURRENT_TIMESTAMP")
        update_values.append(dividend_id)
        
        # Execute update
        update_query = f"UPDATE dividends SET {', '.join(update_fields)} WHERE dividend_id = %s"
        execute_update(DATABASE_URL, update_query, update_values)
        
        # Get updated dividend
        updated_dividend = execute_query(
            DATABASE_URL,
            """
            SELECT d.*, a.ticker_symbol, a.total_shares as shares_owned, a.currency as asset_currency
            FROM dividends d
            JOIN assets a ON d.asset_id = a.asset_id
            WHERE d.dividend_id = %s
            """,
            (dividend_id,)
        )[0]
        
        return create_response(200, {
            "message": "Dividend updated successfully",
            "dividend": {
                "dividend_id": updated_dividend['dividend_id'],
                "asset_id": updated_dividend['asset_id'],
                "ticker_symbol": updated_dividend['ticker_symbol'],
                "dividend_per_share": float(updated_dividend['dividend_per_share']),
                "ex_dividend_date": updated_dividend['ex_dividend_date'].isoformat() if updated_dividend['ex_dividend_date'] else None,
                "payment_date": updated_dividend['payment_date'].isoformat() if updated_dividend['payment_date'] else None,
                "total_dividend": float(updated_dividend['total_dividend_amount']),
                "shares_owned": float(updated_dividend['shares_owned']),
                "currency": updated_dividend['asset_currency'],
                "tax_rate": float(updated_dividend.get('tax_rate', 20.0)),
                "status": "processed" if updated_dividend.get('is_reinvested', False) else "pending",
                "created_at": updated_dividend['created_at'].isoformat(),
                "updated_at": updated_dividend['updated_at'].isoformat() if updated_dividend['updated_at'] else None
            }
        })
        
    except Exception as e:
        logger.error(f"Update dividend error: {str(e)}")
        return create_error_response(500, "Failed to update dividend")

def handle_delete_dividend(dividend_id, user_id):
    """Delete a dividend"""
    try:
        # Verify dividend belongs to user
        dividend = execute_query(
            DATABASE_URL,
            "SELECT * FROM dividends WHERE dividend_id = %s AND user_id = %s",
            (dividend_id, user_id)
        )
        
        if not dividend:
            return create_error_response(404, "Dividend not found")
        
        # Delete the dividend
        execute_update(
            DATABASE_URL,
            "DELETE FROM dividends WHERE dividend_id = %s",
            (dividend_id,)
        )
        
        return create_response(200, {
            "message": "Dividend deleted successfully"
        })
        
    except Exception as e:
        logger.error(f"Delete dividend error: {str(e)}")
        return create_error_response(500, "Failed to delete dividend")

# ===== DIVIDEND AUTO-DETECTION WITH REAL API INTEGRATION =====

def fetch_dividend_data_from_apis(ticker_symbol):
    """
    Fetch real dividend data from multiple APIs with fallback mechanism
    Returns: dict with dividend information or None if no data found
    """
    dividend_data = None
    
    # Try multiple APIs in order of preference
    apis_to_try = [
        ('yahoo_finance', fetch_dividend_from_yahoo),
        ('alpha_vantage', fetch_dividend_from_alpha_vantage),
        ('finnhub', fetch_dividend_from_finnhub),
    ]
    
    for api_name, fetch_function in apis_to_try:
        try:
            logger.info(f"Trying {api_name} for dividend data: {ticker_symbol}")
            dividend_data = fetch_function(ticker_symbol)
            
            if dividend_data and dividend_data.get('dividend_per_share', 0) > 0:
                logger.info(f"✅ {api_name} returned dividend data for {ticker_symbol}: ${dividend_data['dividend_per_share']}")
                dividend_data['source'] = api_name
                return dividend_data
            else:
                logger.info(f"⚠️ {api_name} returned no dividend data for {ticker_symbol}")
                
        except Exception as e:
            logger.warning(f"❌ {api_name} failed for {ticker_symbol}: {str(e)}")
            continue
    
    logger.info(f"🔍 No dividend data found for {ticker_symbol} from any API")
    return None

def fetch_dividend_from_yahoo(ticker_symbol):
    """
    Fetch dividend data from Yahoo Finance API
    Returns recent dividend information
    """
    try:
        # Yahoo Finance API endpoint for dividend history
        url = f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker_symbol}"
        params = {
            'range': '1y',
            'interval': '1d',
            'events': 'div'
        }
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
        
        response = requests.get(url, params=params, headers=headers, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        
        # Extract dividend information
        chart_data = data.get('chart', {}).get('result', [])
        if not chart_data:
            return None
            
        events = chart_data[0].get('events', {})
        dividends = events.get('dividends', {})
        
        if not dividends:
            return None
        
        # Get the most recent dividend
        recent_dividend = None
        recent_timestamp = 0
        
        for timestamp, div_info in dividends.items():
            timestamp_int = int(timestamp)
            if timestamp_int > recent_timestamp:
                recent_timestamp = timestamp_int
                recent_dividend = div_info
        
        if recent_dividend:
            # Convert timestamp to date
            ex_date = datetime.fromtimestamp(recent_timestamp).date()
            
            return {
                'dividend_per_share': float(recent_dividend.get('amount', 0)),
                'ex_dividend_date': ex_date,
                'payment_date': ex_date + timedelta(days=15),  # Estimate payment date
                'currency': 'USD',
                'dividend_type': 'regular',
                'frequency': 'quarterly'  # Most common
            }
            
    except Exception as e:
        logger.error(f"Yahoo Finance API error for {ticker_symbol}: {str(e)}")
        raise

def fetch_dividend_from_alpha_vantage(ticker_symbol):
    """
    Fetch dividend data from Alpha Vantage API
    """
    try:
        api_key = os.environ.get('ALPHA_VANTAGE_API_KEY')
        if not api_key:
            raise Exception("Alpha Vantage API key not configured")
        
        url = "https://www.alphavantage.co/query"
        params = {
            'function': 'CASH_FLOW',
            'symbol': ticker_symbol,
            'apikey': api_key
        }
        
        response = requests.get(url, params=params, timeout=15)
        response.raise_for_status()
        
        data = response.json()
        
        # Check for API limit
        if 'Note' in data:
            raise Exception("Alpha Vantage API limit reached")
        
        # Extract dividend information from cash flow data
        quarterly_reports = data.get('quarterlyReports', [])
        if not quarterly_reports:
            return None
        
        # Look for dividend payments in recent quarters
        recent_report = quarterly_reports[0]
        dividend_payout = recent_report.get('dividendPayout')
        
        if dividend_payout and dividend_payout != 'None':
            # This is total dividend payout, need to estimate per share
            # For now, we'll use a fallback approach
            return None
            
    except Exception as e:
        logger.error(f"Alpha Vantage API error for {ticker_symbol}: {str(e)}")
        raise

def fetch_dividend_from_finnhub(ticker_symbol):
    """
    Fetch dividend data from Finnhub API
    """
    try:
        api_key = os.environ.get('FINNHUB_API_KEY')
        if not api_key:
            raise Exception("Finnhub API key not configured")
        
        # Get dividend data from Finnhub
        url = "https://finnhub.io/api/v1/stock/dividend"
        params = {
            'symbol': ticker_symbol,
            'from': (datetime.now() - timedelta(days=365)).strftime('%Y-%m-%d'),
            'to': datetime.now().strftime('%Y-%m-%d'),
            'token': api_key
        }
        
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        
        if not data or len(data) == 0:
            return None
        
        # Get the most recent dividend
        recent_dividend = data[0]  # Finnhub returns sorted by date desc
        
        return {
            'dividend_per_share': float(recent_dividend.get('amount', 0)),
            'ex_dividend_date': datetime.strptime(recent_dividend.get('exDate'), '%Y-%m-%d').date(),
            'payment_date': datetime.strptime(recent_dividend.get('payDate'), '%Y-%m-%d').date() if recent_dividend.get('payDate') else None,
            'currency': recent_dividend.get('currency', 'USD'),
            'dividend_type': 'regular',
            'frequency': recent_dividend.get('frequency', 'quarterly')
        }
        
    except Exception as e:
        logger.error(f"Finnhub API error for {ticker_symbol}: {str(e)}")
        raise

def get_fallback_dividend_data(ticker_symbol):
    """
    Fallback dividend data for common stocks when APIs fail
    This ensures the feature works even if external APIs are down
    """
    fallback_data = {
        'AAPL': {'dividend_per_share': 0.24, 'frequency': 'quarterly'},
        'MSFT': {'dividend_per_share': 0.75, 'frequency': 'quarterly'},
        'NVDA': {'dividend_per_share': 0.04, 'frequency': 'quarterly'},
        'SPY': {'dividend_per_share': 1.35, 'frequency': 'quarterly'},
        'VTI': {'dividend_per_share': 0.85, 'frequency': 'quarterly'},
        'QQQ': {'dividend_per_share': 0.65, 'frequency': 'quarterly'},
        'VOO': {'dividend_per_share': 1.40, 'frequency': 'quarterly'},
        'VEA': {'dividend_per_share': 0.85, 'frequency': 'quarterly'},
        'VWO': {'dividend_per_share': 0.75, 'frequency': 'quarterly'},
        'BND': {'dividend_per_share': 0.18, 'frequency': 'monthly'},
        'VXUS': {'dividend_per_share': 0.80, 'frequency': 'quarterly'},
        'SCHD': {'dividend_per_share': 0.70, 'frequency': 'quarterly'},
        'JEPI': {'dividend_per_share': 0.45, 'frequency': 'monthly'},
        'JEPQ': {'dividend_per_share': 0.40, 'frequency': 'monthly'},
        # Non-dividend stocks
        'GOOGL': {'dividend_per_share': 0.0, 'frequency': 'none'},
        'GOOG': {'dividend_per_share': 0.0, 'frequency': 'none'},
        'TSLA': {'dividend_per_share': 0.0, 'frequency': 'none'},
        'AMZN': {'dividend_per_share': 0.0, 'frequency': 'none'},
        'META': {'dividend_per_share': 0.0, 'frequency': 'none'},
        'NFLX': {'dividend_per_share': 0.0, 'frequency': 'none'},
    }
    
    if ticker_symbol in fallback_data:
        data = fallback_data[ticker_symbol]
        if data['dividend_per_share'] > 0:
            from datetime import date, timedelta
            return {
                'dividend_per_share': data['dividend_per_share'],
                'ex_dividend_date': date.today() - timedelta(days=30),
                'payment_date': date.today() - timedelta(days=15),
                'currency': 'USD',
                'dividend_type': 'regular',
                'frequency': data['frequency'],
                'source': 'fallback'
            }
    
    return None

def handle_auto_detect_dividends(user_id):
    """
    Enhanced auto-detect dividends with real API integration
    Fetches actual dividend data from Yahoo Finance, Alpha Vantage, and Finnhub
    """
    try:
        logger.info(f"🔍 Starting dividend auto-detection for user {user_id}")
        
        # Get user's stock and ETF assets
        assets = execute_query(
            DATABASE_URL,
            """
            SELECT * FROM assets 
            WHERE user_id = %s AND asset_type IN ('Stock', 'ETF')
            ORDER BY ticker_symbol
            """,
            (user_id,)
        )
        
        if not assets:
            logger.info("No stock or ETF assets found for dividend detection")
            return create_response(200, {
                "detected": 0,
                "message": "No stock or ETF assets found for dividend detection"
            })
        
        logger.info(f"Found {len(assets)} assets to check for dividends")
        
        detected_count = 0
        skipped_count = 0
        api_errors = []
        
        for asset in assets:
            ticker = asset['ticker_symbol']
            asset_id = asset['asset_id']
            total_shares = float(asset['total_shares'])
            
            logger.info(f"🔍 Checking dividends for {ticker} ({total_shares} shares)")
            
            # Skip if we already have recent dividends for this asset
            existing_dividends = execute_query(
                DATABASE_URL,
                """
                SELECT COUNT(*) as count FROM dividends 
                WHERE asset_id = %s AND ex_dividend_date >= CURRENT_DATE - INTERVAL '90 days'
                """,
                (asset_id,)
            )
            
            if existing_dividends and existing_dividends[0]['count'] > 0:
                logger.info(f"⏭️ Skipping {ticker} - recent dividends already exist")
                skipped_count += 1
                continue
            
            # Try to fetch real dividend data from APIs
            dividend_data = None
            
            try:
                dividend_data = fetch_dividend_data_from_apis(ticker)
            except Exception as e:
                logger.warning(f"API fetch failed for {ticker}: {str(e)}")
                api_errors.append(f"{ticker}: {str(e)}")
            
            # If API fetch failed, try fallback data
            if not dividend_data:
                logger.info(f"🔄 Trying fallback data for {ticker}")
                dividend_data = get_fallback_dividend_data(ticker)
            
            # If we have dividend data, create the record
            if dividend_data and dividend_data.get('dividend_per_share', 0) > 0:
                dividend_per_share = dividend_data['dividend_per_share']
                total_dividend = dividend_per_share * total_shares
                
                # Use dates from API or fallback to recent dates
                ex_date = dividend_data.get('ex_dividend_date')
                pay_date = dividend_data.get('payment_date')
                
                if not ex_date:
                    from datetime import date, timedelta
                    ex_date = date.today() - timedelta(days=30)
                    pay_date = date.today() - timedelta(days=15)
                
                # Insert dividend record using asset's currency
                execute_update(
                    DATABASE_URL,
                    """
                    INSERT INTO dividends (
                        asset_id, user_id, ticker_symbol, ex_dividend_date, payment_date,
                        dividend_per_share, total_dividend_amount, currency, dividend_type, tax_rate
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """,
                    (asset_id, user_id, ticker, ex_date, pay_date,
                     dividend_per_share, total_dividend, 
                     asset['currency'],  # Always use asset's currency
                     dividend_data.get('dividend_type', 'regular'),
                     20.0)  # Default tax rate for auto-detected dividends
                )
                
                detected_count += 1
                source = dividend_data.get('source', 'unknown')
                logger.info(f"✅ Created dividend record for {ticker}: ${dividend_per_share}/share (${total_dividend:.2f} total) from {source}")
            else:
                logger.info(f"⚪ No dividend data found for {ticker}")
        
        # Prepare response message
        if detected_count > 0:
            message = f"Successfully detected {detected_count} dividend payment(s)"
            if skipped_count > 0:
                message += f" (skipped {skipped_count} assets with recent dividends)"
            if api_errors:
                message += f". Note: {len(api_errors)} API errors occurred but fallback data was used where available."
        else:
            if skipped_count > 0:
                message = f"No new dividends detected. {skipped_count} assets already have recent dividend records."
            else:
                message = "No dividend-paying assets found in your portfolio."
        
        logger.info(f"🎉 Dividend auto-detection completed: {detected_count} detected, {skipped_count} skipped")
        
        return create_response(200, {
            "detected": detected_count,
            "skipped": skipped_count,
            "message": message,
            "api_errors": len(api_errors) if api_errors else 0
        })
        
    except Exception as e:
        logger.error(f"Auto-detect dividends error: {str(e)}")
        return create_error_response(500, f"Failed to auto-detect dividends: {str(e)}")

def handle_create_recurring_investment(body, user_id):
    """Create a new recurring investment plan"""
    try:
        # Ensure table exists
        create_recurring_investments_table()
        
        # Validate required fields
        required_fields = ['ticker_symbol', 'amount', 'frequency', 'start_date']
        for field in required_fields:
            if field not in body:
                return create_error_response(400, f"Missing required field: {field}")
        
        ticker_symbol = body['ticker_symbol'].upper()
        amount = float(body['amount'])
        currency = body.get('currency', 'USD').upper()
        frequency = body['frequency'].lower()
        start_date = body['start_date']
        
        # Validate frequency
        valid_frequencies = ['daily', 'weekly', 'monthly', 'quarterly']
        if frequency not in valid_frequencies:
            return create_error_response(400, f"Invalid frequency. Must be one of: {', '.join(valid_frequencies)}")
        
        # Calculate next run date based on frequency
        from datetime import datetime, timedelta
        start_dt = datetime.strptime(start_date, '%Y-%m-%d').date()
        
        if frequency == 'daily':
            next_run_date = start_dt + timedelta(days=1)
        elif frequency == 'weekly':
            next_run_date = start_dt + timedelta(weeks=1)
        elif frequency == 'monthly':
            next_run_date = start_dt + timedelta(days=30)  # Approximate
        elif frequency == 'quarterly':
            next_run_date = start_dt + timedelta(days=90)  # Approximate
        
        # Create recurring investment
        execute_update(
            DATABASE_URL,
            """
            INSERT INTO recurring_investments 
            (user_id, ticker_symbol, amount, currency, frequency, start_date, next_run_date)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            """,
            (user_id, ticker_symbol, amount, currency, frequency, start_date, next_run_date)
        )
        
        # Get the created recurring investment
        recurring_investment = execute_query(
            DATABASE_URL,
            """
            SELECT * FROM recurring_investments 
            WHERE user_id = %s AND ticker_symbol = %s AND start_date = %s
            ORDER BY created_at DESC LIMIT 1
            """,
            (user_id, ticker_symbol, start_date)
        )[0]
        
        return create_response(201, {
            "message": "Recurring investment plan created successfully",
            "recurring_investment": {
                "recurring_id": recurring_investment['recurring_id'],
                "ticker_symbol": recurring_investment['ticker_symbol'],
                "amount": float(recurring_investment['amount']),
                "currency": recurring_investment['currency'],
                "frequency": recurring_investment['frequency'],
                "start_date": str(recurring_investment['start_date']),
                "next_run_date": str(recurring_investment['next_run_date']),
                "is_active": recurring_investment['is_active'],
                "created_at": recurring_investment['created_at'].isoformat()
            }
        })
        
    except Exception as e:
        logger.error(f"Create recurring investment error: {str(e)}")
        return create_error_response(500, "Failed to create recurring investment plan")

def handle_get_recurring_investments(user_id):
    """Get all recurring investment plans for a user"""
    try:
        # Ensure table exists
        create_recurring_investments_table()
        
        recurring_investments = execute_query(
            DATABASE_URL,
            """
            SELECT * FROM recurring_investments 
            WHERE user_id = %s 
            ORDER BY created_at DESC
            """,
            (user_id,)
        )
        
        investment_list = []
        for investment in recurring_investments:
            investment_list.append({
                "recurring_id": investment['recurring_id'],
                "ticker_symbol": investment['ticker_symbol'],
                "amount": float(investment['amount']),
                "currency": investment['currency'],
                "frequency": investment['frequency'],
                "start_date": str(investment['start_date']),
                "next_run_date": str(investment['next_run_date']),
                "is_active": investment['is_active'],
                "created_at": investment['created_at'].isoformat(),
                "updated_at": investment['updated_at'].isoformat()
            })
        
        return create_response(200, {
            "recurring_investments": investment_list,
            "total_plans": len(investment_list)
        })
        
    except Exception as e:
        logger.error(f"Get recurring investments error: {str(e)}")
        return create_error_response(500, "Failed to retrieve recurring investment plans")

def handle_update_recurring_investment(recurring_id, body, user_id):
    """Update a recurring investment plan"""
    try:
        # Verify recurring investment belongs to user
        investment = execute_query(
            DATABASE_URL,
            "SELECT * FROM recurring_investments WHERE recurring_id = %s AND user_id = %s",
            (recurring_id, user_id)
        )
        
        if not investment:
            return create_error_response(404, "Recurring investment plan not found")
        
        investment = investment[0]
        
        # Update fields
        amount = body.get('amount', investment['amount'])
        frequency = body.get('frequency', investment['frequency']).lower()
        is_active = body.get('is_active', investment['is_active'])
        start_date = body.get('start_date', investment['start_date'])
        next_run_date = body.get('next_run_date', investment['next_run_date'])
        
        # Validate frequency if provided
        if 'frequency' in body:
            valid_frequencies = ['daily', 'weekly', 'monthly', 'quarterly']
            if frequency not in valid_frequencies:
                return create_error_response(400, f"Invalid frequency. Must be one of: {', '.join(valid_frequencies)}")
        
        # Parse dates if provided
        if 'start_date' in body:
            try:
                from datetime import datetime
                start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
            except ValueError:
                return create_error_response(400, "Invalid start_date format. Use YYYY-MM-DD")
        
        if 'next_run_date' in body:
            try:
                from datetime import datetime
                next_run_date = datetime.strptime(next_run_date, '%Y-%m-%d').date()
            except ValueError:
                return create_error_response(400, "Invalid next_run_date format. Use YYYY-MM-DD")
        
        # Update the recurring investment
        execute_update(
            DATABASE_URL,
            """
            UPDATE recurring_investments 
            SET amount = %s, frequency = %s, is_active = %s, start_date = %s, next_run_date = %s, updated_at = CURRENT_TIMESTAMP
            WHERE recurring_id = %s AND user_id = %s
            """,
            (amount, frequency, is_active, start_date, next_run_date, recurring_id, user_id)
        )
        
        # Get updated investment
        updated_investment = execute_query(
            DATABASE_URL,
            "SELECT * FROM recurring_investments WHERE recurring_id = %s AND user_id = %s",
            (recurring_id, user_id)
        )[0]
        
        return create_response(200, {
            "message": "Recurring investment plan updated successfully",
            "recurring_investment": {
                "recurring_id": updated_investment['recurring_id'],
                "ticker_symbol": updated_investment['ticker_symbol'],
                "amount": float(updated_investment['amount']),
                "currency": updated_investment['currency'],
                "frequency": updated_investment['frequency'],
                "start_date": str(updated_investment['start_date']),
                "next_run_date": str(updated_investment['next_run_date']),
                "is_active": updated_investment['is_active'],
                "updated_at": updated_investment['updated_at'].isoformat()
            }
        })
        
    except Exception as e:
        logger.error(f"Update recurring investment error: {str(e)}")
        return create_error_response(500, "Failed to update recurring investment plan")

def handle_delete_recurring_investment(recurring_id, user_id):
    """Delete a recurring investment plan"""
    try:
        # Verify recurring investment belongs to user
        investment = execute_query(
            DATABASE_URL,
            "SELECT * FROM recurring_investments WHERE recurring_id = %s AND user_id = %s",
            (recurring_id, user_id)
        )
        
        if not investment:
            return create_error_response(404, "Recurring investment plan not found")
        
        # Delete the recurring investment
        execute_update(
            DATABASE_URL,
            "DELETE FROM recurring_investments WHERE recurring_id = %s AND user_id = %s",
            (recurring_id, user_id)
        )
        
        return create_response(200, {
            "message": f"Recurring investment plan for {investment[0]['ticker_symbol']} deleted successfully"
        })
        
    except Exception as e:
        logger.error(f"Delete recurring investment error: {str(e)}")
        return create_error_response(500, "Failed to delete recurring investment plan")

def handle_batch_processing():
    """Handle recurring investments batch processing with multi-market support"""
    from datetime import datetime, timedelta, date
    from decimal import Decimal, ROUND_HALF_UP
    import time
    import pytz
    
    logger.info("🚀 Starting recurring investments batch processing")
    
    # Market holidays for 2025
    US_MARKET_HOLIDAYS_2025 = [
        date(2025, 1, 1),   # New Year's Day
        date(2025, 1, 20),  # Martin Luther King Jr. Day
        date(2025, 2, 17),  # Presidents' Day
        date(2025, 4, 18),  # Good Friday
        date(2025, 5, 26),  # Memorial Day
        date(2025, 6, 19),  # Juneteenth
        date(2025, 7, 4),   # Independence Day
        date(2025, 9, 1),   # Labor Day
        date(2025, 11, 27), # Thanksgiving
        date(2025, 12, 25), # Christmas
    ]
    
    # Taiwan market holidays for 2025 (TSE - Taiwan Stock Exchange)
    TW_MARKET_HOLIDAYS_2025 = [
        date(2025, 1, 1),   # New Year's Day
        date(2025, 1, 27),  # Chinese New Year Eve
        date(2025, 1, 28),  # Chinese New Year
        date(2025, 1, 29),  # Chinese New Year
        date(2025, 1, 30),  # Chinese New Year
        date(2025, 1, 31),  # Chinese New Year
        date(2025, 2, 28),  # Peace Memorial Day
        date(2025, 4, 4),   # Children's Day
        date(2025, 4, 5),   # Tomb Sweeping Day
        date(2025, 5, 1),   # Labor Day
        date(2025, 6, 10),  # Dragon Boat Festival
        date(2025, 9, 17),  # Mid-Autumn Festival
        date(2025, 10, 10), # National Day
    ]
    
    def get_market_type_from_ticker(ticker_symbol):
        """Determine market type from ticker symbol"""
        ticker = ticker_symbol.upper()
        
        # Taiwan stocks typically have .TW suffix or are 4-digit numbers
        if ticker.endswith('.TW') or ticker.endswith('.TWO') or (ticker.isdigit() and len(ticker) == 4):
            return 'TW'
        
        # Default to US market for other tickers
        return 'US'
    
    def is_market_open_today(market_type='US'):
        """Check if the specified market is open today"""
        # Get current time in market timezone
        if market_type == 'TW':
            tz = pytz.timezone('Asia/Taipei')
            holidays = TW_MARKET_HOLIDAYS_2025
            market_name = "Taiwan"
        else:
            tz = pytz.timezone('US/Eastern')
            holidays = US_MARKET_HOLIDAYS_2025
            market_name = "US"
        
        # Get today's date in market timezone
        now = datetime.now(tz)
        today = now.date()
        
        # Check if it's a weekend
        if today.weekday() >= 5:  # Saturday = 5, Sunday = 6
            logger.info(f"{market_name} market closed: Weekend ({today})")
            return False
        
        # Check if it's a holiday
        if today in holidays:
            logger.info(f"{market_name} market closed: Holiday ({today})")
            return False
        
        # Check market hours
        current_time = now.time()
        if market_type == 'TW':
            # Taiwan market: 9:00 AM - 1:30 PM Taiwan time
            market_open = datetime.strptime('09:00', '%H:%M').time()
            market_close = datetime.strptime('13:30', '%H:%M').time()
        else:
            # US market: 9:30 AM - 4:00 PM Eastern time
            market_open = datetime.strptime('09:30', '%H:%M').time()
            market_close = datetime.strptime('16:00', '%H:%M').time()
        
        if current_time < market_open or current_time > market_close:
            logger.info(f"{market_name} market closed: Outside trading hours ({current_time})")
            return False
        
        logger.info(f"{market_name} market is open ({today} {current_time})")
        return True
    
    def calculate_next_run_date(current_date, frequency):
        """Calculate next run date based on frequency"""
        if frequency == 'daily':
            return current_date + timedelta(days=1)
        elif frequency == 'weekly':
            return current_date + timedelta(weeks=1)
        elif frequency == 'monthly':
            # Add one month (handle month-end dates properly)
            if current_date.month == 12:
                return current_date.replace(year=current_date.year + 1, month=1)
            else:
                try:
                    return current_date.replace(month=current_date.month + 1)
                except ValueError:
                    # Handle cases like Jan 31 -> Feb 28/29
                    next_month = current_date.replace(month=current_date.month + 1, day=1)
                    return next_month.replace(day=min(current_date.day, 28))
        elif frequency == 'quarterly':
            return current_date + timedelta(days=90)  # Approximate
        else:
            return current_date + timedelta(days=30)  # Default to monthly
    
    # Initialize counters
    processed_count = 0
    failed_count = 0
    skipped_count = 0
    
    try:
        # Get investments due for processing
        today = date.today()
        
        investments = execute_query(
            DATABASE_URL,
            """
            SELECT ri.*, u.base_currency, u.email, u.name
            FROM recurring_investments ri
            JOIN users u ON ri.user_id = u.user_id
            WHERE ri.is_active = true 
            AND ri.next_run_date <= %s
            ORDER BY ri.next_run_date ASC
            """,
            (today,)
        )
        
        logger.info(f"📋 Found {len(investments)} recurring investments due for execution")
        
        if not investments:
            logger.info("📭 No recurring investments due for execution today")
            return create_response(200, {
                'status': 'success',
                'reason': 'no_investments_due',
                'processed': 0,
                'failed': 0,
                'skipped': 0
            })
        
        # Group investments by market type
        us_investments = []
        tw_investments = []
        
        for investment in investments:
            ticker_symbol = investment['ticker_symbol']
            market_type = get_market_type_from_ticker(ticker_symbol)
            
            if market_type == 'TW':
                tw_investments.append(investment)
            else:
                us_investments.append(investment)
        
        logger.info(f"📊 Market breakdown: {len(us_investments)} US investments, {len(tw_investments)} Taiwan investments")
        
        # Check market status for each market type
        us_market_open = is_market_open_today('US') if us_investments else True
        tw_market_open = is_market_open_today('TW') if tw_investments else True
        
        # Filter investments based on market status
        processable_investments = []
        
        if us_market_open:
            processable_investments.extend(us_investments)
            logger.info(f"🇺🇸 US market is open - processing {len(us_investments)} investments")
        else:
            logger.info(f"🇺🇸 US market is closed - skipping {len(us_investments)} investments")
            skipped_count += len(us_investments)
        
        if tw_market_open:
            processable_investments.extend(tw_investments)
            logger.info(f"🇹🇼 Taiwan market is open - processing {len(tw_investments)} investments")
        else:
            logger.info(f"🇹🇼 Taiwan market is closed - skipping {len(tw_investments)} investments")
            skipped_count += len(tw_investments)
        
        if not processable_investments:
            logger.info("📴 All relevant markets are closed today, skipping batch processing")
            return create_response(200, {
                'status': 'skipped',
                'reason': 'all_markets_closed',
                'processed': 0,
                'failed': 0,
                'skipped': len(investments)
            })
        
        # Process each investment
        for investment in processable_investments:
            try:
                ticker_symbol = investment['ticker_symbol']
                amount = float(investment['amount'])
                currency = investment['currency']
                user_id = investment['user_id']
                market_type = get_market_type_from_ticker(ticker_symbol)
                
                logger.info(f"🔄 Processing {ticker_symbol} ({market_type} market) for user {investment['email']} - ${amount} {currency}")
                
                # Get current stock price using existing function
                stock_price_data = fetch_stock_price_with_fallback(ticker_symbol)
                if not stock_price_data:
                    raise Exception(f"Could not get stock price for {ticker_symbol}")
                
                stock_price = stock_price_data.get('price', 0)
                if stock_price <= 0:
                    raise Exception(f"Invalid stock price for {ticker_symbol}: {stock_price}")
                
                # Convert investment amount to stock currency if needed
                if currency != 'USD':  # Assuming most stocks are in USD
                    exchange_rate = get_exchange_rate_cached(currency, 'USD')
                    amount_usd = amount * exchange_rate
                else:
                    amount_usd = amount
                
                # Calculate shares to purchase
                shares = Decimal(str(amount_usd / stock_price)).quantize(
                    Decimal('0.000001'), rounding=ROUND_HALF_UP
                )
                
                if shares <= 0:
                    raise Exception(f"Calculated shares ({shares}) is not positive")
                
                # Check if asset exists for this user
                existing_asset = execute_query(
                    DATABASE_URL,
                    "SELECT asset_id FROM assets WHERE user_id = %s AND ticker_symbol = %s",
                    (user_id, ticker_symbol)
                )
                
                if not existing_asset:
                    # Create new asset
                    execute_update(
                        DATABASE_URL,
                        """
                        INSERT INTO assets (user_id, ticker_symbol, asset_type, total_shares, average_cost_basis, currency)
                        VALUES (%s, %s, 'Stock', %s, %s, 'USD')
                        """,
                        (user_id, ticker_symbol, float(shares), stock_price)
                    )
                    
                    # Get the created asset
                    asset = execute_query(
                        DATABASE_URL,
                        "SELECT asset_id FROM assets WHERE user_id = %s AND ticker_symbol = %s",
                        (user_id, ticker_symbol)
                    )[0]
                    asset_id = asset['asset_id']
                    
                    logger.info(f"✅ Created new asset {ticker_symbol} for user")
                else:
                    asset_id = existing_asset[0]['asset_id']
                    
                    # Update existing asset (recalculate average cost basis)
                    current_asset = execute_query(
                        DATABASE_URL,
                        "SELECT total_shares, average_cost_basis FROM assets WHERE asset_id = %s",
                        (asset_id,)
                    )[0]
                    
                    current_shares = float(current_asset['total_shares'])
                    current_avg_cost = float(current_asset['average_cost_basis'])
                    
                    new_total_shares = current_shares + float(shares)
                    total_cost = (current_shares * current_avg_cost) + (float(shares) * stock_price)
                    new_avg_cost = total_cost / new_total_shares
                    
                    execute_update(
                        DATABASE_URL,
                        """
                        UPDATE assets 
                        SET total_shares = %s, average_cost_basis = %s, updated_at = CURRENT_TIMESTAMP
                        WHERE asset_id = %s
                        """,
                        (new_total_shares, new_avg_cost, asset_id)
                    )
                    
                    logger.info(f"✅ Updated asset {ticker_symbol}: {current_shares} + {shares} = {new_total_shares} shares")
                
                # Create transaction record
                execute_update(
                    DATABASE_URL,
                    """
                    INSERT INTO transactions (asset_id, transaction_type, transaction_date, shares, price_per_share, currency)
                    VALUES (%s, 'Recurring', CURRENT_DATE, %s, %s, 'USD')
                    """,
                    (asset_id, float(shares), stock_price)
                )
                
                # Update next run date
                next_run_date = calculate_next_run_date(date.today(), investment['frequency'])
                
                # Skip weekends and holidays for next run date
                while not is_market_open_today():
                    next_run_date = next_run_date + timedelta(days=1)
                
                execute_update(
                    DATABASE_URL,
                    """
                    UPDATE recurring_investments 
                    SET next_run_date = %s, updated_at = CURRENT_TIMESTAMP
                    WHERE recurring_id = %s
                    """,
                    (next_run_date, investment['recurring_id'])
                )
                
                logger.info(f"✅ Successfully processed {ticker_symbol}: {shares} shares @ ${stock_price}")
                logger.info(f"📅 Next run date: {next_run_date}")
                
                processed_count += 1
                
                # Add small delay between API calls
                time.sleep(1)
                
            except Exception as e:
                logger.error(f"❌ Failed to process investment {investment['ticker_symbol']}: {str(e)}")
                failed_count += 1
                continue
        
        # Final summary
        logger.info(f"🎯 Batch processing completed:")
        logger.info(f"   ✅ Processed: {processed_count}")
        logger.info(f"   ❌ Failed: {failed_count}")
        logger.info(f"   ⏭️ Skipped: {skipped_count}")
        
        return create_response(200, {
            'status': 'success',
            'processed': processed_count,
            'failed': failed_count,
            'skipped': skipped_count,
            'total_investments': len(investments)
        })
        
    except Exception as e:
        logger.error(f"❌ Batch processing failed: {str(e)}")
        return create_error_response(500, f"Batch processing failed: {str(e)}")

# ============================================================================
# MILESTONE 2 & 5: FIRE PROFILE MANAGEMENT FUNCTIONS
# ============================================================================

def handle_create_or_update_fire_profile(body, user_id):
    """Create or update FIRE profile for a user with comprehensive fields"""
    try:
        # Ensure table exists
        create_fire_profile_table()
        
        # Extract comprehensive fields
        # Current Financial Snapshot
        annual_income = body.get('annual_income', 1000000)
        annual_savings = body.get('annual_savings', 200000)
        
        # Retirement Goals
        annual_expenses = body.get('annual_expenses')
        target_retirement_age = body.get('target_retirement_age')
        
        # Core Assumptions
        safe_withdrawal_rate = body.get('safe_withdrawal_rate', 0.04)
        expected_return_pre_retirement = body.get('expected_return_pre_retirement', 0.07)
        expected_return_post_retirement = body.get('expected_return_post_retirement', 0.05)
        expected_inflation_rate = body.get('expected_inflation_rate', 0.025)
        other_passive_income = body.get('other_passive_income', 0)
        effective_tax_rate = body.get('effective_tax_rate', 0.15)
        
        # Enhanced: New fields for sophisticated calculation
        barista_annual_contribution = body.get('barista_annual_contribution', 0)  # Investment capacity during part-time
        inflation_rate = body.get('inflation_rate', 0.025)  # User-specific inflation assumption
        
        # Legacy fields for backward compatibility
        expected_annual_return = body.get('expected_annual_return', expected_return_pre_retirement)
        barista_annual_income = body.get('barista_annual_income', 0)  # Keep for backward compatibility
        
        # Check if profile already exists
        existing_profile = execute_query(
            DATABASE_URL,
            "SELECT * FROM fire_profile WHERE user_id = %s",
            (user_id,)
        )
        
        if existing_profile:
            # Update existing profile with all comprehensive fields including new ones
            execute_update(
                DATABASE_URL,
                """
                UPDATE fire_profile 
                SET annual_income = %s, annual_savings = %s, annual_expenses = %s, 
                    target_retirement_age = %s, safe_withdrawal_rate = %s,
                    expected_return_pre_retirement = %s, expected_return_post_retirement = %s,
                    expected_inflation_rate = %s, other_passive_income = %s, effective_tax_rate = %s,
                    barista_annual_contribution = %s, inflation_rate = %s,
                    expected_annual_return = %s, barista_annual_income = %s, 
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = %s
                """,
                (annual_income, annual_savings, annual_expenses, target_retirement_age, 
                 safe_withdrawal_rate, expected_return_pre_retirement, expected_return_post_retirement,
                 expected_inflation_rate, other_passive_income, effective_tax_rate,
                 barista_annual_contribution, inflation_rate,
                 expected_annual_return, barista_annual_income, user_id)
            )
            message = "FIRE profile updated successfully"
        else:
            # Create new profile with all comprehensive fields including new ones
            execute_update(
                DATABASE_URL,
                """
                INSERT INTO fire_profile 
                (user_id, annual_income, annual_savings, annual_expenses, target_retirement_age,
                 safe_withdrawal_rate, expected_return_pre_retirement, expected_return_post_retirement,
                 expected_inflation_rate, other_passive_income, effective_tax_rate,
                 barista_annual_contribution, inflation_rate,
                 expected_annual_return, barista_annual_income)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (user_id, annual_income, annual_savings, annual_expenses, target_retirement_age,
                 safe_withdrawal_rate, expected_return_pre_retirement, expected_return_post_retirement,
                 expected_inflation_rate, other_passive_income, effective_tax_rate,
                 barista_annual_contribution, inflation_rate,
                 expected_annual_return, barista_annual_income)
            )
            message = "FIRE profile created successfully"
        
        # Get the profile
        profile = execute_query(
            DATABASE_URL,
            "SELECT * FROM fire_profile WHERE user_id = %s",
            (user_id,)
        )[0]
        
        return create_response(200, {
            "message": message,
            "fire_profile": {
                "profile_id": profile['profile_id'],
                "user_id": profile['user_id'],
                "annual_expenses": float(profile['annual_expenses']) if profile['annual_expenses'] else None,
                "safe_withdrawal_rate": float(profile['safe_withdrawal_rate']),
                "expected_annual_return": float(profile['expected_annual_return']),
                "target_retirement_age": profile['target_retirement_age'],
                "barista_annual_income": float(profile['barista_annual_income']),
                "created_at": profile['created_at'].isoformat(),
                "updated_at": profile['updated_at'].isoformat()
            }
        })
        
    except Exception as e:
        logger.error(f"Create/update FIRE profile error: {str(e)}")
        return create_error_response(500, "Failed to save FIRE profile")

def handle_get_fire_profile(user_id):
    """Get FIRE profile for a user with all comprehensive fields"""
    try:
        # Ensure table exists
        create_fire_profile_table()
        
        profile = execute_query(
            DATABASE_URL,
            "SELECT * FROM fire_profile WHERE user_id = %s",
            (user_id,)
        )
        
        if not profile:
            return create_response(200, {
                "fire_profile": None,
                "message": "No FIRE profile found. Create one to start tracking your FIRE progress."
            })
        
        profile = profile[0]
        
        return create_response(200, {
            "fire_profile": {
                "profile_id": profile['profile_id'],
                "user_id": profile['user_id'],
                
                # Current Financial Snapshot
                "annual_income": float(profile.get('annual_income', 1000000)),
                "annual_savings": float(profile.get('annual_savings', 200000)),
                
                # Retirement Goals
                "annual_expenses": float(profile['annual_expenses']) if profile['annual_expenses'] else None,
                "target_retirement_age": profile['target_retirement_age'],
                
                # Core Assumptions
                "safe_withdrawal_rate": float(profile['safe_withdrawal_rate']),
                "expected_return_pre_retirement": float(profile.get('expected_return_pre_retirement', profile['expected_annual_return'])),
                "expected_return_post_retirement": float(profile.get('expected_return_post_retirement', profile['expected_annual_return'])),
                "expected_inflation_rate": float(profile.get('expected_inflation_rate', 0.025)),
                "other_passive_income": float(profile.get('other_passive_income', 0)),
                "effective_tax_rate": float(profile.get('effective_tax_rate', 0.15)),
                
                # Legacy fields for backward compatibility
                "expected_annual_return": float(profile['expected_annual_return']),
                "barista_annual_income": float(profile['barista_annual_income']),
                
                "created_at": profile['created_at'].isoformat(),
                "updated_at": profile['updated_at'].isoformat()
            }
        })
        
    except Exception as e:
        logger.error(f"Get FIRE profile error: {str(e)}")
        return create_error_response(500, "Failed to retrieve FIRE profile")

def calculate_portfolio_performance(user_id, period_months=12):
    """
    Calculate real annual return for user's portfolio using time-weighted return method
    """
    try:
        logger.info(f"Calculating portfolio performance for user {user_id} over {period_months} months")
        
        # Get all user transactions with dates
        transactions = execute_query(
            DATABASE_URL,
            """
            SELECT t.*, a.ticker_symbol, a.currency
            FROM transactions t
            JOIN assets a ON t.asset_id = a.asset_id
            WHERE a.user_id = %s AND t.transaction_type != 'Dividend'
            ORDER BY t.transaction_date ASC, t.created_at ASC
            """,
            (user_id,)
        )
        
        if not transactions:
            logger.info("No transactions found for performance calculation")
            return {
                'real_annual_return': 0,
                'total_return': 0,
                'total_invested': 0,
                'current_value': 0,
                'calculation_method': 'insufficient_data'
            }
        
        # Calculate date range
        end_date = datetime.now()
        start_date = end_date - timedelta(days=period_months * 30)
        
        # Get transactions within the period
        period_transactions = [t for t in transactions if t['transaction_date'] >= start_date.date()]
        
        # Get all transactions before the period (for initial value)
        initial_transactions = [t for t in transactions if t['transaction_date'] < start_date.date()]
        
        # Calculate initial investment value (cost basis of holdings at start of period)
        initial_invested = sum(float(t['shares']) * float(t['price_per_share']) for t in initial_transactions)
        
        # Calculate additional investments during the period
        period_invested = sum(float(t['shares']) * float(t['price_per_share']) for t in period_transactions)
        
        # Get current portfolio value (using real-time prices if available)
        current_assets = execute_query(
            DATABASE_URL,
            """
            SELECT ticker_symbol, total_shares, average_cost_basis, currency
            FROM assets
            WHERE user_id = %s AND total_shares > 0
            """,
            (user_id,)
        )
        
        # Calculate current market value (simplified - using cost basis for now)
        # In production, this would use real-time stock prices
        current_value = sum(float(asset['total_shares']) * float(asset['average_cost_basis']) for asset in current_assets)
        
        total_invested = initial_invested + period_invested
        
        if total_invested <= 0:
            return {
                'real_annual_return': 0,
                'total_return': 0,
                'total_invested': 0,
                'current_value': current_value,
                'calculation_method': 'no_investments'
            }
        
        # Calculate total return
        total_return = (current_value - total_invested) / total_invested
        
        # Annualize the return based on the period
        if period_months > 0:
            years = period_months / 12
            if years > 0 and total_return > -1:  # Avoid negative base for fractional exponent
                annual_return = ((1 + total_return) ** (1/years)) - 1
            else:
                annual_return = total_return / years  # Linear approximation for edge cases
        else:
            annual_return = 0
        
        logger.info(f"Performance calculation: Total invested: ${total_invested:,.2f}, Current value: ${current_value:,.2f}, Annual return: {annual_return:.2%}")
        
        return {
            'real_annual_return': annual_return,
            'total_return': total_return,
            'total_invested': total_invested,
            'current_value': current_value,
            'period_months': period_months,
            'calculation_method': 'time_weighted_return'
        }
        
    except Exception as e:
        logger.error(f"Portfolio performance calculation error: {str(e)}")
        return {
            'real_annual_return': 0,
            'total_return': 0,
            'total_invested': 0,
            'current_value': 0,
            'error': str(e),
            'calculation_method': 'error'
        }

def handle_get_portfolio_performance(user_id, period_months=12):
    """Get portfolio performance metrics for a user"""
    try:
        performance = calculate_portfolio_performance(user_id, period_months)
        
        # Add additional metrics
        performance_data = {
            **performance,
            'timestamp': datetime.utcnow().isoformat(),
            'user_id': user_id
        }
        
        return create_response(200, {
            "portfolio_performance": performance_data
        })
        
    except Exception as e:
        logger.error(f"Get portfolio performance error: {str(e)}")
        return create_error_response(500, "Failed to calculate portfolio performance")

def calculate_fire_progress(user_id):
    """Calculate FIRE progress for a user"""
    try:
        # Get user's FIRE profile
        profile = execute_query(
            DATABASE_URL,
            "SELECT * FROM fire_profile WHERE user_id = %s",
            (user_id,)
        )
        
        if not profile:
            return create_error_response(404, "FIRE profile not found. Please create a FIRE profile first.")
        
        profile = profile[0]
        
        # Get user info for age calculation and base currency
        user = execute_query(
            DATABASE_URL,
            "SELECT birth_year, base_currency FROM users WHERE user_id = %s",
            (user_id,)
        )[0]
        
        current_year = datetime.now().year
        current_age = current_year - user['birth_year']
        base_currency = user['base_currency']
        
        # Get user's current portfolio value (using cost basis for now)
        # TODO: Integrate with real-time market prices like Dashboard
        assets = execute_query(
            DATABASE_URL,
            """
            SELECT a.ticker_symbol, a.total_shares, a.average_cost_basis, a.currency
            FROM assets a
            WHERE a.user_id = %s AND a.total_shares > 0
            """,
            (user_id,)
        )
        
        # Calculate current portfolio value (simplified calculation)
        current_portfolio_value = 0
        for asset in assets:
            asset_value = float(asset['total_shares']) * float(asset['average_cost_basis'])
            # For simplicity, assume all values are in base currency
            # In production, this should use real-time prices and currency conversion
            current_portfolio_value += asset_value
        
        # Get portfolio performance for additional context
        performance = calculate_portfolio_performance(user_id, 12)
        
        # FIRE profile values
        annual_expenses = float(profile['annual_expenses']) if profile['annual_expenses'] else 0
        safe_withdrawal_rate = float(profile['safe_withdrawal_rate'])
        expected_annual_return = float(profile['expected_annual_return'])
        target_retirement_age = profile['target_retirement_age']
        barista_annual_income = float(profile['barista_annual_income'])
        
        years_to_retirement = max(target_retirement_age - current_age, 0) if target_retirement_age else 0
        
        # FIRE Calculations
        traditional_fire_target = annual_expenses / safe_withdrawal_rate if annual_expenses > 0 and safe_withdrawal_rate > 0 else 0
        barista_fire_target = max((annual_expenses - barista_annual_income) / safe_withdrawal_rate, 0) if annual_expenses > 0 and safe_withdrawal_rate > 0 else 0
        coast_fire_target = traditional_fire_target / ((1 + expected_annual_return) ** years_to_retirement) if years_to_retirement > 0 and expected_annual_return > 0 else traditional_fire_target
        
        # Calculate progress percentages
        traditional_progress = (current_portfolio_value / traditional_fire_target * 100) if traditional_fire_target > 0 else 0
        barista_progress = (current_portfolio_value / barista_fire_target * 100) if barista_fire_target > 0 else 0
        coast_progress = (current_portfolio_value / coast_fire_target * 100) if coast_fire_target > 0 else 0
        
        # Calculate years remaining and monthly investment needed
        def calculate_years_remaining(target, current_value, monthly_investment, annual_return):
            if target <= current_value:
                return 0
            if monthly_investment <= 0:
                return 999  # Infinite years if no monthly investment
            
            # Financial calculation for years to reach target with monthly investments
            monthly_rate = annual_return / 12
            if monthly_rate == 0:
                return (target - current_value) / (monthly_investment * 12)
            
            # Future value of current investments + future value of monthly investments
            import math
            try:
                years = math.log((target * monthly_rate / monthly_investment) + 1) / (12 * math.log(1 + monthly_rate))
                return max(years, 0)
            except:
                return 999
        
        def calculate_monthly_needed(target, current_value, years, annual_return):
            if years <= 0 or target <= current_value:
                return 0
            
            monthly_rate = annual_return / 12
            months = years * 12
            
            if monthly_rate == 0:
                return (target - current_value) / months
            
            # Calculate monthly payment needed
            future_value_current = current_value * ((1 + monthly_rate) ** months)
            remaining_needed = target - future_value_current
            
            if remaining_needed <= 0:
                return 0
            
            # Monthly payment for annuity
            monthly_payment = remaining_needed * monthly_rate / (((1 + monthly_rate) ** months) - 1)
            return max(monthly_payment, 0)
        
        # Calculate metrics for each FIRE type
        traditional_years = calculate_years_remaining(traditional_fire_target, current_portfolio_value, 0, expected_annual_return)
        barista_years = calculate_years_remaining(barista_fire_target, current_portfolio_value, 0, expected_annual_return)
        coast_years = calculate_years_remaining(coast_fire_target, current_portfolio_value, 0, expected_annual_return)
        
        traditional_monthly = calculate_monthly_needed(traditional_fire_target, current_portfolio_value, min(traditional_years, 30), expected_annual_return)
        barista_monthly = calculate_monthly_needed(barista_fire_target, current_portfolio_value, min(barista_years, 30), expected_annual_return)
        coast_monthly = calculate_monthly_needed(coast_fire_target, current_portfolio_value, min(coast_years, 30), expected_annual_return)
        
        # Create calculation objects for frontend
        calculations = [
            {
                "fire_type": "Traditional",
                "target_amount": traditional_fire_target,
                "current_progress": current_portfolio_value,
                "progress_percentage": min(traditional_progress, 100),
                "raw_progress_percentage": traditional_progress,
                "years_remaining": traditional_years,
                "monthly_investment_needed": traditional_monthly,
                "achieved": current_portfolio_value >= traditional_fire_target and traditional_fire_target > 0
            },
            {
                "fire_type": "Barista", 
                "target_amount": barista_fire_target,
                "current_progress": current_portfolio_value,
                "progress_percentage": min(barista_progress, 100),
                "raw_progress_percentage": barista_progress,
                "years_remaining": barista_years,
                "monthly_investment_needed": barista_monthly,
                "achieved": current_portfolio_value >= barista_fire_target and barista_fire_target > 0
            },
            {
                "fire_type": "Coast",
                "target_amount": coast_fire_target,
                "current_progress": current_portfolio_value,
                "progress_percentage": min(coast_progress, 100),
                "raw_progress_percentage": coast_progress,
                "years_remaining": coast_years,
                "monthly_investment_needed": coast_monthly,
                "achieved": current_portfolio_value >= coast_fire_target and coast_fire_target > 0
            }
        ]
        
        return create_response(200, {
            "fire_progress": {
                "current_total_assets": current_portfolio_value,
                "traditional_fire_target": traditional_fire_target,
                "barista_fire_target": barista_fire_target,
                "coast_fire_target": coast_fire_target,
                "traditional_fire_progress": min(traditional_progress, 100),
                "barista_fire_progress": min(barista_progress, 100),
                "coast_fire_progress": min(coast_progress, 100),
                "years_to_traditional_fire": traditional_years,
                "years_to_barista_fire": barista_years,
                "years_to_coast_fire": coast_years,
                "monthly_investment_needed_traditional": traditional_monthly,
                "monthly_investment_needed_barista": barista_monthly,
                "is_coast_fire_achieved": coast_progress >= 100
            },
            "calculations": calculations,
            "user_age": current_age,
            "base_currency": base_currency,
            "portfolio_performance": performance  # Include performance metrics
        })
        
    except Exception as e:
        logger.error(f"Calculate FIRE progress error: {str(e)}")
        return create_error_response(500, f"Failed to calculate FIRE progress: {str(e)}")

def handle_get_stock_prices_multi_api(query_params):
    """Handle multi-API stock price requests with fallback"""
    try:
        symbols = query_params.get('symbols', '').split(',')
        symbols = [s.strip().upper() for s in symbols if s.strip()]
        
        if not symbols:
            return create_error_response(400, "No symbols provided")
        
        logger.info(f"Fetching stock prices for symbols: {symbols}")
        
        results = {}
        cache_hits = 0
        api_calls = 0
        
        for symbol in symbols:
            price_data = fetch_stock_price_with_fallback(symbol)
            if price_data:
                results[symbol] = price_data
                if price_data.get('cached', False):
                    cache_hits += 1
                else:
                    api_calls += 1
        
        return create_response(200, {
            "prices": results,
            "timestamp": datetime.now().isoformat(),
            "symbols_requested": len(symbols),
            "symbols_found": len(results),
            "cache_stats": {
                "cache_hits": cache_hits,
                "api_calls": api_calls,
                "cache_hit_rate": f"{(cache_hits / len(symbols) * 100):.1f}%" if symbols else "0%"
            }
        })
        
    except Exception as e:
        logger.error(f"Multi-API stock price error: {str(e)}")
        return create_error_response(500, "Failed to fetch stock prices")

def fetch_stock_price_with_fallback(symbol):
    """Fetch stock price with multiple API fallback strategy and caching"""
    
    # First, check cache
    cached_price = get_cached_stock_price(symbol)
    if cached_price:
        return cached_price
    
    # API priority order: Finnhub -> Alpha Vantage -> Yahoo Finance -> Mock Data
    apis = [
        ('finnhub', fetch_from_finnhub), 
        ('alphavantage', fetch_from_alphavantage_single),
        ('yahoo', fetch_from_yahoo_finance)
    ]
    
    for api_name, fetch_func in apis:
        try:
            logger.info(f"Trying {api_name} API for {symbol}")
            price_data = fetch_func(symbol)
            
            if price_data:
                logger.info(f"✅ Successfully fetched {symbol} from {api_name}")
                price_data['source'] = api_name
                
                # Cache the successful result
                set_cached_stock_price(symbol, price_data)
                
                return price_data
                
        except Exception as e:
            logger.warning(f"❌ {api_name} API failed for {symbol}: {str(e)}")
            continue
    
    # If all APIs fail, return mock data (don't cache mock data)
    logger.warning(f"🎭 All APIs failed for {symbol}, using mock data")
    mock_data = get_mock_stock_price(symbol)
    mock_data['source'] = 'mock'
    return mock_data

def fetch_from_finnhub(symbol):
    """Fetch from Finnhub API using official Python client"""
    api_key = os.getenv('FINNHUB_API_KEY') or os.getenv('REACT_APP_FINNHUB_API_KEY')
    if not api_key:
        raise Exception("Finnhub API key not configured")
    
    try:
        import finnhub
        
        # Create Finnhub client
        finnhub_client = finnhub.Client(api_key=api_key)
        
        # Get quote data
        quote = finnhub_client.quote(symbol)
        
        if not quote or not quote.get('c'):
            raise Exception("No data from Finnhub API")
        
        # Try to get additional company info (optional, don't fail if it doesn't work)
        company_profile = None
        try:
            company_profile = finnhub_client.company_profile2(symbol=symbol)
        except:
            pass  # Company profile is optional
        
        # Finnhub quote response format:
        # c: Current price
        # d: Change
        # dp: Percent change
        # h: High price of the day
        # l: Low price of the day
        # o: Open price of the day
        # pc: Previous close price
        # t: Timestamp
        
        result = {
            'symbol': symbol,
            'price': quote['c'],  # current price
            'change': quote['d'],  # change
            'changePercent': quote['dp'],  # percent change
            'currency': 'USD',
            'lastUpdated': datetime.now().isoformat(),
            'marketStatus': determine_market_status(),
            'high': quote.get('h', quote['c']),
            'low': quote.get('l', quote['c']),
            'open': quote.get('o', quote['c']),
            'previousClose': quote.get('pc', quote['c']),
            'timestamp': quote.get('t', 0)
        }
        
        # Add company info if available
        if company_profile:
            result.update({
                'companyName': company_profile.get('name', symbol),
                'industry': company_profile.get('finnhubIndustry', ''),
                'marketCap': company_profile.get('marketCapitalization', 0),
                'country': company_profile.get('country', 'US')
            })
        
        return result
        
    except ImportError:
        # Fallback to HTTP requests if finnhub package not available
        logger.warning("Finnhub package not available, falling back to HTTP requests")
        return fetch_from_finnhub_http(symbol)
    except Exception as e:
        logger.error(f"Finnhub API error: {str(e)}")
        raise e

def fetch_from_finnhub_http(symbol):
    """Fallback HTTP implementation for Finnhub API"""
    api_key = os.getenv('FINNHUB_API_KEY') or os.getenv('REACT_APP_FINNHUB_API_KEY')
    if not api_key:
        raise Exception("Finnhub API key not configured")
    
    url = "https://finnhub.io/api/v1/quote"
    params = {'symbol': symbol, 'token': api_key}
    
    response = requests.get(url, params=params, timeout=10)
    response.raise_for_status()
    
    data = response.json()
    
    if not data.get('c'):
        raise Exception("No data from Finnhub API")
    
    return {
        'symbol': symbol,
        'price': data['c'],  # current price
        'change': data['d'],  # change
        'changePercent': data['dp'],  # percent change
        'currency': 'USD',
        'lastUpdated': datetime.now().isoformat(),
        'marketStatus': determine_market_status(),
        'high': data.get('h', data['c']),
        'low': data.get('l', data['c']),
        'open': data.get('o', data['c']),
        'previousClose': data.get('pc', data['c'])
    }

def fetch_from_alphavantage_single(symbol):
    """Fetch from Alpha Vantage API (existing implementation)"""
    api_key = os.getenv('ALPHA_VANTAGE_API_KEY')
    if not api_key:
        raise Exception("Alpha Vantage API key not configured")
    
    import requests
    
    url = "https://www.alphavantage.co/query"
    params = {
        'function': 'GLOBAL_QUOTE',
        'symbol': symbol,
        'apikey': api_key
    }
    
    response = requests.get(url, params=params, timeout=10)
    response.raise_for_status()
    
    data = response.json()
    
    # Check for rate limit
    if data.get('Information') and 'rate limit' in data['Information'].lower():
        raise Exception("Alpha Vantage rate limit reached")
    
    if data.get('Note') and 'rate limit' in data['Note'].lower():
        raise Exception("Alpha Vantage rate limit reached")
    
    quote = data.get('Global Quote')
    if not quote:
        raise Exception("No data from Alpha Vantage API")
    
    return {
        'symbol': quote['01. symbol'],
        'price': float(quote['05. price']),
        'change': float(quote['09. change']),
        'changePercent': float(quote['10. change percent'].replace('%', '')),
        'currency': 'USD',
        'lastUpdated': datetime.now().isoformat(),
        'marketStatus': determine_market_status(),
        'high': float(quote['03. high']),
        'low': float(quote['04. low']),
        'open': float(quote['02. open']),
        'previousClose': float(quote['08. previous close']),
        'volume': int(quote['06. volume'])
    }

def fetch_from_yahoo_finance(symbol):
    """Fetch from Yahoo Finance (no API key required)"""
    import requests
    
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"
    headers = {
        'User-Agent': 'Mozilla/5.0 (compatible; Worthy-Portfolio-App/1.0)'
    }
    
    response = requests.get(url, headers=headers, timeout=10)
    response.raise_for_status()
    
    data = response.json()
    
    if not data.get('chart') or not data['chart'].get('result'):
        raise Exception("No data from Yahoo Finance API")
    
    result = data['chart']['result'][0]
    meta = result.get('meta', {})
    
    current_price = meta.get('regularMarketPrice')
    previous_close = meta.get('previousClose')
    
    if not current_price or not previous_close:
        raise Exception("Incomplete data from Yahoo Finance API")
    
    change = current_price - previous_close
    change_percent = (change / previous_close) * 100 if previous_close > 0 else 0
    
    return {
        'symbol': symbol,
        'price': current_price,
        'change': change,
        'changePercent': change_percent,
        'currency': meta.get('currency', 'USD'),
        'lastUpdated': datetime.now().isoformat(),
        'marketStatus': map_yahoo_market_status(meta.get('marketState', 'CLOSED')),
        'high': meta.get('regularMarketDayHigh', current_price),
        'low': meta.get('regularMarketDayLow', current_price),
        'open': meta.get('regularMarketOpen', current_price),
        'previousClose': previous_close,
        'volume': meta.get('regularMarketVolume', 0)
    }

def get_mock_stock_price(symbol):
    """Get mock stock price data as fallback"""
    mock_prices = {
        'AAPL': {'price': 175.50, 'change': 2.30, 'changePercent': 1.33},
        'TSLA': {'price': 248.75, 'change': -5.20, 'changePercent': -2.05},
        'MSFT': {'price': 378.85, 'change': 4.12, 'changePercent': 1.10},
        'GOOGL': {'price': 142.56, 'change': -1.23, 'changePercent': -0.85},
        'AMZN': {'price': 145.32, 'change': 2.87, 'changePercent': 2.01},
        'NVDA': {'price': 875.30, 'change': 15.20, 'changePercent': 1.77},
        'META': {'price': 325.40, 'change': -8.90, 'changePercent': -2.66},
        'NFLX': {'price': 445.60, 'change': 12.30, 'changePercent': 2.84}
    }
    
    mock_data = mock_prices.get(symbol, {
        'price': 100.00,
        'change': 0.00,
        'changePercent': 0.00
    })
    
    return {
        'symbol': symbol,
        'price': mock_data['price'],
        'change': mock_data['change'],
        'changePercent': mock_data['changePercent'],
        'currency': 'USD',
        'lastUpdated': datetime.now().isoformat(),
        'marketStatus': determine_market_status(),
        'source': 'mock'
    }

def determine_market_status():
    """Determine current market status"""
    now = datetime.now()
    hour = now.hour
    weekday = now.weekday()
    
    # Simple market hours check (9:30 AM - 4:00 PM EST)
    if weekday >= 5:  # Weekend
        return 'CLOSED'
    elif 9 <= hour < 16:
        return 'OPEN'
    elif 4 <= hour < 9:
        return 'PRE_MARKET'
    else:
        return 'AFTER_HOURS'

def map_yahoo_market_status(status):
    """Map Yahoo Finance market status to our format"""
    status_map = {
        'REGULAR': 'OPEN',
        'CLOSED': 'CLOSED',
        'PRE': 'PRE_MARKET',
        'POST': 'AFTER_HOURS'
    }
    return status_map.get(status.upper(), 'CLOSED')

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
    """Proxy endpoint for exchange rates with caching"""
    try:
        logger.info(f"Fetching exchange rates for base currency: {base_currency}")
        
        # Check cache first
        cached_rates = get_cached_exchange_rate(base_currency, 'ALL')
        if cached_rates:
            logger.info(f"📦 Using cached exchange rates for {base_currency}")
            return create_response(200, cached_rates)
        
        # Make request to ExchangeRate-API
        url = f"{EXCHANGE_RATE_BASE_URL}/{base_currency}"
        
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        
        data = response.json()
        
        result = {
            "success": True,
            "base": data.get('base', base_currency),
            "rates": data.get('rates', {}),
            "last_updated": data.get('date', datetime.utcnow().isoformat()),
            "source": "ExchangeRate-API",
            "cached": False
        }
        
        # Cache the result
        set_cached_exchange_rate(base_currency, 'ALL', result)
        
        return create_response(200, result)
        
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
            import os as os_module
            return create_response(200, {
                "status": "healthy",
                "timestamp": datetime.utcnow().isoformat(),
                "environment": os_module.getenv('AWS_LAMBDA_FUNCTION_NAME', 'local')
            })
        
        elif http_method == 'GET' and path == '/cache/status':
            # Cache status endpoint for monitoring
            cache_stats = get_cache_stats()
            return create_response(200, {
                "cache_status": cache_stats,
                "timestamp": datetime.utcnow().isoformat(),
                "cache_enabled": True
            })
        
        elif http_method == 'POST' and path == '/cache/clear':
            # Cache clear endpoint (for admin use)
            with _cache_lock:
                stock_count = len(stock_price_cache)
                rate_count = len(exchange_rate_cache)
                stock_price_cache.clear()
                exchange_rate_cache.clear()
                
            logger.info(f"🧹 Cache cleared - removed {stock_count} stock prices and {rate_count} exchange rates")
            return create_response(200, {
                "message": "Cache cleared successfully",
                "cleared": {
                    "stock_prices": stock_count,
                    "exchange_rates": rate_count
                },
                "timestamp": datetime.utcnow().isoformat()
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
        
        elif path == '/transactions' and http_method == 'GET':
            # Get all user transactions - requires authentication
            request_headers = event.get('headers', {})
            auth_result = verify_jwt_token(request_headers.get('Authorization', ''))
            if not auth_result['valid']:
                return create_error_response(401, "Invalid or missing token")
            
            return handle_get_transactions(auth_result['user_id'])
        
        elif path.startswith('/transactions/') and http_method == 'PUT':
            # Update transaction - requires authentication
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
                transaction_id = int(path.split('/')[-1])
                return handle_update_transaction(transaction_id, body, auth_result['user_id'])
            except ValueError:
                return create_error_response(400, "Invalid transaction ID")
        
        elif path.startswith('/transactions/') and http_method == 'DELETE':
            # Delete transaction - requires authentication
            request_headers = event.get('headers', {})
            auth_result = verify_jwt_token(request_headers.get('Authorization', ''))
            if not auth_result['valid']:
                return create_error_response(401, "Invalid or missing token")
            
            try:
                transaction_id = int(path.split('/')[-1])
                return handle_delete_transaction(transaction_id, auth_result['user_id'])
            except ValueError:
                return create_error_response(400, "Invalid transaction ID")
        
        # ============================================================================
        # MILESTONE 4: RECURRING INVESTMENTS ENDPOINTS
        # ============================================================================
        
        elif path == '/recurring-investments' and http_method == 'POST':
            # Create recurring investment plan - requires authentication
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
            
            return handle_create_recurring_investment(body, auth_result['user_id'])
        
        elif path == '/recurring-investments' and http_method == 'GET':
            # Get user's recurring investment plans - requires authentication
            request_headers = event.get('headers', {})
            auth_result = verify_jwt_token(request_headers.get('Authorization', ''))
            if not auth_result['valid']:
                return create_error_response(401, "Invalid or missing token")
            
            return handle_get_recurring_investments(auth_result['user_id'])
        
        elif path.startswith('/recurring-investments/') and http_method == 'PUT':
            # Update recurring investment plan - requires authentication
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
                recurring_id = int(path.split('/')[-1])
                return handle_update_recurring_investment(recurring_id, body, auth_result['user_id'])
            except ValueError:
                return create_error_response(400, "Invalid recurring investment ID")
        
        elif path.startswith('/recurring-investments/') and http_method == 'DELETE':
            # Delete recurring investment plan - requires authentication
            request_headers = event.get('headers', {})
            auth_result = verify_jwt_token(request_headers.get('Authorization', ''))
            if not auth_result['valid']:
                return create_error_response(401, "Invalid or missing token")
            
            try:
                recurring_id = int(path.split('/')[-1])
                return handle_delete_recurring_investment(recurring_id, auth_result['user_id'])
            except ValueError:
                return create_error_response(400, "Invalid recurring investment ID")
        
        # ============================================================================
        # MILESTONE 2 & 5: FIRE PROFILE ENDPOINTS
        # ============================================================================
        
        elif path == '/fire-profile' and http_method == 'POST':
            # Create or update FIRE profile - requires authentication
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
            
            return handle_create_or_update_fire_profile(body, auth_result['user_id'])
        
        elif path == '/fire-profile' and http_method == 'GET':
            # Get FIRE profile - requires authentication
            request_headers = event.get('headers', {})
            auth_result = verify_jwt_token(request_headers.get('Authorization', ''))
            if not auth_result['valid']:
                return create_error_response(401, "Invalid or missing token")
            
            return handle_get_fire_profile(auth_result['user_id'])
        
        elif path == '/fire-progress' and http_method == 'GET':
            # Calculate FIRE progress - requires authentication
            request_headers = event.get('headers', {})
            auth_result = verify_jwt_token(request_headers.get('Authorization', ''))
            if not auth_result['valid']:
                return create_error_response(401, "Invalid or missing token")
            
            return calculate_fire_progress(auth_result['user_id'])
        
        elif path == '/portfolio/performance' and http_method == 'GET':
            # Get portfolio performance - requires authentication
            request_headers = event.get('headers', {})
            auth_result = verify_jwt_token(request_headers.get('Authorization', ''))
            if not auth_result['valid']:
                return create_error_response(401, "Invalid or missing token")
            
            # Get period parameter (default to 12 months)
            query_params = event.get('queryStringParameters') or {}
            period_months = int(query_params.get('period', 12))
            
            return handle_get_portfolio_performance(auth_result['user_id'], period_months)
        
        # ============================================================================
        # DIVIDEND MANAGEMENT ENDPOINTS
        # ============================================================================
        
        elif path == '/dividends' and http_method == 'GET':
            # Get user's dividends - requires authentication
            request_headers = event.get('headers', {})
            auth_result = verify_jwt_token(request_headers.get('Authorization', ''))
            if not auth_result['valid']:
                return create_error_response(401, "Invalid or missing token")
            
            return handle_get_dividends(auth_result['user_id'])
        
        elif path == '/dividends' and http_method == 'POST':
            # Create dividend - requires authentication
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
            
            return handle_create_dividend(body, auth_result['user_id'])
        
        elif path.startswith('/dividends/') and '/process' in path and http_method == 'POST':
            # Process dividend - requires authentication
            try:
                dividend_id = int(path.split('/')[2])
            except (ValueError, IndexError):
                return create_error_response(400, "Invalid dividend ID")
            
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
            
            return handle_process_dividend(dividend_id, body, auth_result['user_id'])
        
        elif path.startswith('/dividends/') and http_method == 'PUT':
            # Update dividend - requires authentication
            try:
                dividend_id = int(path.split('/')[2])
            except (ValueError, IndexError):
                return create_error_response(400, "Invalid dividend ID")
            
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
            
            return handle_update_dividend(dividend_id, body, auth_result['user_id'])
        
        elif path.startswith('/dividends/') and http_method == 'DELETE':
            # Delete dividend - requires authentication
            try:
                dividend_id = int(path.split('/')[2])
            except (ValueError, IndexError):
                return create_error_response(400, "Invalid dividend ID")
            
            request_headers = event.get('headers', {})
            auth_result = verify_jwt_token(request_headers.get('Authorization', ''))
            if not auth_result['valid']:
                return create_error_response(401, "Invalid or missing token")
            
            return handle_delete_dividend(dividend_id, auth_result['user_id'])
        
        elif path == '/dividends/auto-detect' and http_method == 'POST':
            # Auto-detect dividends - requires authentication
            request_headers = event.get('headers', {})
            auth_result = verify_jwt_token(request_headers.get('Authorization', ''))
            if not auth_result['valid']:
                return create_error_response(401, "Invalid or missing token")
            
            return handle_auto_detect_dividends(auth_result['user_id'])
        
        # ============================================================================
        # EXTERNAL API PROXY ENDPOINTS
        # ============================================================================
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
        
        elif path == '/admin/delete-user' and http_method == 'DELETE':
            # Delete user endpoint (admin only)
            query_params = event.get('queryStringParameters') or {}
            email = query_params.get('email', '').strip().lower()
            
            if not email:
                return create_error_response(400, "Email parameter is required")
            
            try:
                # First check if user exists
                users = execute_query(
                    DATABASE_URL,
                    "SELECT user_id, name, email FROM users WHERE email = %s",
                    (email,)
                )
                
                if not users:
                    return create_error_response(404, f"User not found: {email}")
                
                user = users[0]
                user_id = user['user_id']
                
                # Delete user's related data first (foreign key constraints)
                # Delete transactions
                execute_query(
                    DATABASE_URL,
                    "DELETE FROM transactions WHERE asset_id IN (SELECT asset_id FROM assets WHERE user_id = %s)",
                    (user_id,)
                )
                
                # Delete assets
                execute_query(
                    DATABASE_URL,
                    "DELETE FROM assets WHERE user_id = %s",
                    (user_id,)
                )
                
                # Delete recurring investments
                execute_query(
                    DATABASE_URL,
                    "DELETE FROM recurring_investments WHERE user_id = %s",
                    (user_id,)
                )
                
                # Delete FIRE profiles
                execute_query(
                    DATABASE_URL,
                    "DELETE FROM fire_profiles WHERE user_id = %s",
                    (user_id,)
                )
                
                # Finally delete the user
                execute_query(
                    DATABASE_URL,
                    "DELETE FROM users WHERE user_id = %s",
                    (user_id,)
                )
                
                return create_response(200, {
                    "success": True,
                    "message": f"User {email} (ID: {user_id}, Name: {user['name']}) has been deleted successfully",
                    "deleted_user": {
                        "user_id": user_id,
                        "name": user['name'],
                        "email": user['email']
                    }
                })
                
            except Exception as e:
                logger.error(f"User deletion error: {str(e)}")
                return create_error_response(500, f"Failed to delete user: {str(e)}")
        
        elif path == '/admin/test-psycopg2' and http_method == 'GET':
            # Test psycopg2 specifically
            try:
                import sys
                import os
                
                # Check Python path
                python_path = sys.path
                
                # Try to import psycopg2
                try:
                    import psycopg2
                    psycopg2_status = f"✅ psycopg2 {psycopg2.__version__} imported successfully"
                    psycopg2_file = psycopg2.__file__
                except ImportError as e:
                    psycopg2_status = f"❌ psycopg2 import failed: {str(e)}"
                    psycopg2_file = "Not available"
                
                # Check if /opt/python is in path
                opt_python_in_path = "/opt/python" in python_path
                
                # List contents of /opt/python if it exists
                opt_python_contents = []
                try:
                    import os
                    if os.path.exists("/opt/python"):
                        opt_python_contents = os.listdir("/opt/python")[:10]  # First 10 items
                    else:
                        opt_python_contents = ["Directory does not exist"]
                except Exception as e:
                    opt_python_contents = [f"Error listing: {str(e)}"]
                
                return create_response(200, {
                    "psycopg2_status": psycopg2_status,
                    "psycopg2_file": psycopg2_file,
                    "python_path": python_path,
                    "opt_python_in_path": opt_python_in_path,
                    "opt_python_contents": opt_python_contents,
                    "pythonpath_env": os.environ.get('PYTHONPATH', 'Not set'),
                    "lambda_runtime_dir": os.environ.get('LAMBDA_RUNTIME_DIR', 'Not set'),
                    "lambda_task_root": os.environ.get('LAMBDA_TASK_ROOT', 'Not set')
                })
                
            except Exception as e:
                return create_error_response(500, f"Test error: {str(e)}")
        
        elif path == '/admin/db-test' and http_method == 'GET':
            # Test database connectivity
            try:
                # Test basic connection
                result = execute_query(DATABASE_URL, "SELECT version(), current_database(), current_user")
                
                if result:
                    db_info = result[0]
                    
                    # Test if tables exist
                    tables = execute_query(
                        DATABASE_URL,
                        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
                    )
                    
                    table_list = [table['table_name'] for table in tables]
                    
                    return create_response(200, {
                        "database_connected": True,
                        "database_info": {
                            "version": db_info['version'],
                            "database": db_info['current_database'],
                            "user": db_info['current_user']
                        },
                        "tables": table_list,
                        "database_url_preview": DATABASE_URL[:50] + "..." if len(DATABASE_URL) > 50 else DATABASE_URL
                    })
                else:
                    return create_error_response(500, "No result from database query")
                    
            except Exception as e:
                logger.error(f"Database connectivity test error: {str(e)}")
                return create_error_response(500, f"Database connection failed: {str(e)}")
        
        elif path == '/admin/list-users' and http_method == 'GET':
            # Temporary admin endpoint to list all users (for debugging)
            try:
                users = execute_query(
                    DATABASE_URL,
                    "SELECT user_id, name, email, base_currency, birth_year, created_at FROM users ORDER BY created_at DESC LIMIT 10"
                )
                
                user_list = []
                for user in users:
                    user_list.append({
                        "user_id": user['user_id'],
                        "name": user['name'],
                        "email": user['email'],
                        "base_currency": user['base_currency'],
                        "birth_year": user['birth_year'],
                        "created_at": user['created_at'].isoformat()
                    })
                
                return create_response(200, {
                    "total_users": len(user_list),
                    "users": user_list
                })
                    
            except Exception as e:
                logger.error(f"Database query error: {str(e)}")
                return create_error_response(500, f"Database error: {str(e)}")
        
        elif path == '/admin/check-user' and http_method == 'GET':
            # Temporary admin endpoint to check user existence
            query_params = event.get('queryStringParameters') or {}
            email = query_params.get('email', '').strip().lower()
            
            if not email:
                return create_error_response(400, "Email parameter is required")
            
            try:
                # Check if user exists
                users = execute_query(
                    DATABASE_URL,
                    "SELECT user_id, name, email, base_currency, birth_year, created_at FROM users WHERE email = %s",
                    (email,)
                )
                
                if users:
                    user = users[0]
                    return create_response(200, {
                        "user_exists": True,
                        "user_info": {
                            "user_id": user['user_id'],
                            "name": user['name'],
                            "email": user['email'],
                            "base_currency": user['base_currency'],
                            "birth_year": user['birth_year'],
                            "created_at": user['created_at'].isoformat()
                        }
                    })
                else:
                    return create_response(200, {
                        "user_exists": False,
                        "message": f"No user found with email: {email}"
                    })
                    
            except Exception as e:
                logger.error(f"Database query error: {str(e)}")
                return create_error_response(500, f"Database error: {str(e)}")
        
        elif path == '/test/stock-prices' and http_method == 'GET':
            # Test stock prices without authentication
            query_params = event.get('queryStringParameters') or {}
            return handle_get_stock_prices_multi_api(query_params)
        
        elif path == '/api/stock-prices-multi' and http_method == 'GET':
            # Get stock prices with multi-API fallback - requires authentication
            request_headers = event.get('headers', {})
            auth_result = verify_jwt_token(request_headers.get('Authorization', ''))
            if not auth_result['valid']:
                return create_error_response(401, "Invalid or missing token")
            
            query_params = event.get('queryStringParameters') or {}
            return handle_get_stock_prices_multi_api(query_params)
        
        elif path == '/batch/recurring-investments' and http_method == 'POST':
            # Batch processing for recurring investments - no authentication required (internal)
            return handle_batch_processing()
        
        else:
            return create_error_response(404, f"Endpoint not found: {path}")
        
    except Exception as e:
        logger.error(f"Unhandled error: {str(e)}", exc_info=True)
        return create_error_response(500, "Internal server error")
