#!/usr/bin/env python3
"""
Test script to debug Taiwan fund price fetching
Testing symbol: 0P0000TLMT.TW
"""

import yfinance as yf
import requests
import json
from datetime import datetime

def test_yfinance_taiwan_fund():
    """Test yfinance with Taiwan fund symbol"""
    symbol = "0P0000TLMT.TW"
    print(f"🧪 Testing yfinance with symbol: {symbol}")
    
    try:
        # Create ticker object
        ticker = yf.Ticker(symbol)
        
        # Get ticker info
        print("📊 Getting ticker info...")
        info = ticker.info
        print(f"Info keys: {list(info.keys())}")
        
        # Check for price data
        current_price = info.get('regularMarketPrice')
        previous_close = info.get('previousClose')
        current_price_alt = info.get('currentPrice')
        
        print(f"regularMarketPrice: {current_price}")
        print(f"previousClose: {previous_close}")
        print(f"currentPrice: {current_price_alt}")
        print(f"currency: {info.get('currency')}")
        print(f"marketState: {info.get('marketState')}")
        
        # Try historical data
        print("\n📈 Getting historical data...")
        hist = ticker.history(period="5d")
        print(f"Historical data shape: {hist.shape}")
        if not hist.empty:
            print("Last 3 days of data:")
            print(hist.tail(3))
            latest_close = hist['Close'].iloc[-1]
            print(f"Latest close from history: {latest_close}")
        
        # Try different periods
        print("\n📅 Trying different periods...")
        for period in ["1d", "5d", "1mo"]:
            try:
                hist_period = ticker.history(period=period)
                print(f"{period}: {hist_period.shape[0]} rows")
                if not hist_period.empty:
                    print(f"  Latest close: {hist_period['Close'].iloc[-1]}")
            except Exception as e:
                print(f"  {period}: Error - {e}")
        
        return True
        
    except Exception as e:
        print(f"❌ yfinance error: {e}")
        return False

def test_yahoo_direct_api():
    """Test Yahoo Finance direct API"""
    symbol = "0P0000TLMT.TW"
    print(f"\n🌐 Testing Yahoo Finance direct API with symbol: {symbol}")
    
    try:
        # Try Yahoo Finance query API
        url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
        
        response = requests.get(url, headers=headers, timeout=10)
        print(f"Status code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("Response structure:")
            print(json.dumps(data, indent=2)[:500] + "...")
            
            # Try to extract price data
            if 'chart' in data and 'result' in data['chart']:
                result = data['chart']['result'][0]
                meta = result.get('meta', {})
                print(f"Currency: {meta.get('currency')}")
                print(f"Regular market price: {meta.get('regularMarketPrice')}")
                print(f"Previous close: {meta.get('previousClose')}")
        else:
            print(f"HTTP Error: {response.status_code}")
            print(response.text[:200])
            
    except Exception as e:
        print(f"❌ Direct API error: {e}")

def test_alternative_symbols():
    """Test alternative symbol formats"""
    print(f"\n🔄 Testing alternative symbol formats...")
    
    # Common Taiwan fund symbol variations
    symbols_to_try = [
        "0P0000TLMT.TW",
        "0P0000TLMT.TWO", 
        "0P0000TLMT",
        "TLMT.TW",
        "0P0000TLMT.TA"
    ]
    
    for symbol in symbols_to_try:
        print(f"\n🧪 Testing: {symbol}")
        try:
            ticker = yf.Ticker(symbol)
            info = ticker.info
            
            # Check if we got meaningful data
            if info and len(info) > 5:  # More than just basic error info
                price = info.get('regularMarketPrice') or info.get('currentPrice')
                if price:
                    print(f"  ✅ Found price: {price}")
                    print(f"  Currency: {info.get('currency')}")
                else:
                    print(f"  ⚠️ No price data, but got info with {len(info)} fields")
            else:
                print(f"  ❌ No meaningful data")
                
        except Exception as e:
            print(f"  ❌ Error: {e}")

if __name__ == "__main__":
    print("=" * 60)
    print("  TAIWAN FUND PRICE TESTING")
    print("=" * 60)
    
    # Test 1: yfinance
    test_yfinance_taiwan_fund()
    
    # Test 2: Direct Yahoo API
    test_yahoo_direct_api()
    
    # Test 3: Alternative symbols
    test_alternative_symbols()
    
    print("\n" + "=" * 60)
    print("Testing completed!")