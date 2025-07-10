#!/usr/bin/env python3

import psycopg2
import requests
from datetime import datetime, date, timedelta
from decimal import Decimal, ROUND_HALF_UP
import json

# Database connection
DATABASE_URL = 'postgresql://worthy_admin:REDACTED_DB_PASSWORD@worthy-db-dev.ch0ccg6ycp7t.ap-northeast-1.rds.amazonaws.com:5432/worthy'

def get_stock_price(ticker_symbol):
    """Get stock price using multiple APIs with Taiwan support"""
    
    # For Taiwan stocks, use Yahoo Finance
    if ticker_symbol.endswith('.TW') or ticker_symbol.endswith('.TWO'):
        try:
            print(f"🇹🇼 Getting Taiwan stock price for {ticker_symbol} via Yahoo Finance...")
            
            # Yahoo Finance API (free, no key required)
            url = f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker_symbol}"
            headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
            
            response = requests.get(url, headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                result = data.get('chart', {}).get('result', [])
                if result:
                    meta = result[0].get('meta', {})
                    current_price = meta.get('regularMarketPrice')
                    if current_price and current_price > 0:
                        print(f"✅ Yahoo Finance price for {ticker_symbol}: NT${current_price}")
                        return current_price
            
            print(f"❌ Yahoo Finance failed for {ticker_symbol}")
            return None
            
        except Exception as e:
            print(f"❌ Error getting Taiwan stock price: {e}")
            return None
    
    # For US stocks, use Finnhub
    else:
        api_key = "REDACTED_FINNHUB_KEY"
        
        try:
            print(f"🇺🇸 Getting US stock price for {ticker_symbol} via Finnhub...")
            url = f"https://finnhub.io/api/v1/quote?symbol={ticker_symbol}&token={api_key}"
            response = requests.get(url, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                current_price = data.get('c', 0)  # 'c' is current price
                if current_price and current_price > 0:
                    print(f"✅ Finnhub price for {ticker_symbol}: ${current_price}")
                    return current_price
            
            print(f"❌ Finnhub failed for {ticker_symbol}")
            return None
            
        except Exception as e:
            print(f"❌ Error getting US stock price: {e}")
            return None

def process_overdue_investment(recurring_id):
    """Manually process a specific overdue recurring investment"""
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        
        # Get the overdue investment details
        cur.execute("""
            SELECT ri.*, u.email, u.name
            FROM recurring_investments ri
            JOIN users u ON ri.user_id = u.user_id
            WHERE ri.recurring_id = %s AND ri.is_active = true
        """, (recurring_id,))
        
        investment = cur.fetchone()
        if not investment:
            print(f"❌ Investment {recurring_id} not found or not active")
            return False
        
        recurring_id, user_id, ticker_symbol, amount, currency, frequency, start_date, next_run_date, is_active, created_at, updated_at, email, name = investment
        
        print(f"🔄 Processing overdue investment:")
        print(f"   ID: {recurring_id}")
        print(f"   User: {name} ({email})")
        print(f"   Ticker: {ticker_symbol}")
        print(f"   Amount: {currency} {amount}")
        print(f"   Due Date: {next_run_date}")
        print(f"   Days Overdue: {(date.today() - next_run_date).days}")
        print()
        
        # Get stock price
        print(f"📊 Getting stock price for {ticker_symbol}...")
        stock_price = get_stock_price(ticker_symbol)
        
        if not stock_price:
            print(f"❌ Could not get stock price for {ticker_symbol}")
            return False
        
        # Calculate shares to purchase
        if currency == 'TWD':
            amount_in_stock_currency = float(amount)  # Taiwan stock in TWD
            stock_currency = 'TWD'
        else:
            amount_in_stock_currency = float(amount)  # Assume USD
            stock_currency = 'USD'
        
        shares = Decimal(str(amount_in_stock_currency / stock_price)).quantize(
            Decimal('0.000001'), rounding=ROUND_HALF_UP
        )
        
        print(f"💰 Investment calculation:")
        print(f"   Amount: {currency} {amount}")
        print(f"   Stock Price: {stock_currency} {stock_price}")
        print(f"   Shares to buy: {shares}")
        print()
        
        # Check if asset exists
        cur.execute("""
            SELECT asset_id, total_shares, average_cost_basis 
            FROM assets 
            WHERE user_id = %s AND ticker_symbol = %s
        """, (user_id, ticker_symbol))
        
        existing_asset = cur.fetchone()
        
        if existing_asset:
            asset_id, current_shares, current_avg_cost = existing_asset
            print(f"📈 Updating existing asset {ticker_symbol} (ID: {asset_id})")
            print(f"   Current: {current_shares} shares @ ${current_avg_cost}")
            
            # Calculate new average cost basis
            new_total_shares = float(current_shares) + float(shares)
            total_cost = (float(current_shares) * float(current_avg_cost)) + (float(shares) * stock_price)
            new_avg_cost = total_cost / new_total_shares
            
            # Update asset
            cur.execute("""
                UPDATE assets 
                SET total_shares = %s, average_cost_basis = %s, updated_at = CURRENT_TIMESTAMP
                WHERE asset_id = %s
            """, (new_total_shares, new_avg_cost, asset_id))
            
            print(f"   Updated: {new_total_shares} shares @ ${new_avg_cost:.2f}")
            
        else:
            print(f"🆕 Creating new asset for {ticker_symbol}")
            
            # Create new asset
            cur.execute("""
                INSERT INTO assets (user_id, ticker_symbol, asset_type, total_shares, average_cost_basis, currency)
                VALUES (%s, %s, 'Stock', %s, %s, %s)
                RETURNING asset_id
            """, (user_id, ticker_symbol, float(shares), stock_price, stock_currency))
            
            asset_id = cur.fetchone()[0]
            print(f"   Created asset ID: {asset_id}")
        
        # Create transaction record
        cur.execute("""
            INSERT INTO transactions (asset_id, transaction_type, transaction_date, shares, price_per_share, currency)
            VALUES (%s, 'Recurring', CURRENT_DATE, %s, %s, %s)
            RETURNING transaction_id
        """, (asset_id, float(shares), stock_price, stock_currency))
        
        transaction_id = cur.fetchone()[0]
        print(f"✅ Created transaction ID: {transaction_id}")
        
        # Update next run date (add 1 month for monthly frequency)
        if frequency == 'monthly':
            next_run = next_run_date + timedelta(days=30)  # Approximate monthly
        elif frequency == 'weekly':
            next_run = next_run_date + timedelta(days=7)
        else:
            next_run = next_run_date + timedelta(days=30)  # Default to monthly
        
        cur.execute("""
            UPDATE recurring_investments 
            SET next_run_date = %s, updated_at = CURRENT_TIMESTAMP
            WHERE recurring_id = %s
        """, (next_run, recurring_id))
        
        print(f"📅 Updated next run date to: {next_run}")
        
        # Commit all changes
        conn.commit()
        print(f"🎉 Successfully processed recurring investment {recurring_id}!")
        
        cur.close()
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Error processing investment: {e}")
        if 'conn' in locals():
            conn.rollback()
            conn.close()
        return False

if __name__ == "__main__":
    print("🚀 URGENT: Processing overdue recurring investments")
    print("=" * 60)
    
    # Process all overdue investments
    overdue_investments = [6, 5, 4]  # IDs from our earlier analysis
    
    for investment_id in overdue_investments:
        print(f"\n🔄 Processing investment ID: {investment_id}")
        success = process_overdue_investment(investment_id)
        
        if success:
            print(f"✅ SUCCESS: Investment {investment_id} processed!")
        else:
            print(f"❌ FAILED: Investment {investment_id} could not be processed")
        
        print("-" * 40)
    
    print("\n🎯 SUMMARY: All overdue investments processed!")
    print("🔄 Check your transactions table for new 'Recurring' transactions")
