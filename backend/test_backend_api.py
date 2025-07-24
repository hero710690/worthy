#!/usr/bin/env python3
"""
Test the backend stock price API directly
"""

import requests
import json

def test_backend_stock_api():
    """Test the backend stock price API"""
    
    # Backend API URL
    base_url = "https://mreda8g340.execute-api.ap-northeast-1.amazonaws.com/development"
    
    # Test the Taiwan fund symbol
    symbol = "0P0000TLMT.TW"
    
    print(f"🧪 Testing backend API with symbol: {symbol}")
    print(f"URL: {base_url}/api/stock-prices-multi?symbols={symbol}")
    
    try:
        # Test the multi stock prices endpoint with auth token
        headers = {
            "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjo3LCJlbWFpbCI6Imhlcm83MTA2OTBAZ21haWwuY29tIiwiZXhwIjoxNzUyNzIyODM5LCJpYXQiOjE3NTI2MzY0Mzl9.RlozFWSd5srhx8xkKcf5HGE-tW80Sl7nnNXZy--Wo2s"
        }
        response = requests.get(
            f"{base_url}/api/stock-prices-multi",
            params={"symbols": symbol},
            headers=headers,
            timeout=30
        )
        
        print(f"Status Code: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Success! Response:")
            print(json.dumps(data, indent=2))
        else:
            print("❌ Error Response:")
            print(response.text)
            
    except Exception as e:
        print(f"❌ Request failed: {e}")

def test_multiple_symbols():
    """Test with multiple symbols including working ones"""
    
    base_url = "https://mreda8g340.execute-api.ap-northeast-1.amazonaws.com/development"
    
    # Test multiple symbols
    symbols = ["AAPL", "0P0000TLMT.TW", "TSLA"]
    symbols_str = ",".join(symbols)
    
    print(f"\n🧪 Testing multiple symbols: {symbols_str}")
    
    try:
        headers = {
            "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjo3LCJlbWFpbCI6Imhlcm83MTA2OTBAZ21haWwuY29tIiwiZXhwIjoxNzUyNzIyODM5LCJpYXQiOjE3NTI2MzY0Mzl9.RlozFWSd5srhx8xkKcf5HGE-tW80Sl7nnNXZy--Wo2s"
        }
        response = requests.get(
            f"{base_url}/api/stock-prices-multi",
            params={"symbols": symbols_str},
            headers=headers,
            timeout=30
        )
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Success! Response:")
            print(json.dumps(data, indent=2))
            
            # Check each symbol
            for symbol in symbols:
                if symbol in data:
                    price_data = data[symbol]
                    print(f"\n📊 {symbol}:")
                    print(f"  Price: {price_data.get('price')}")
                    print(f"  Currency: {price_data.get('currency')}")
                    print(f"  Source: {price_data.get('source')}")
                else:
                    print(f"\n❌ {symbol}: Not found in response")
        else:
            print("❌ Error Response:")
            print(response.text)
            
    except Exception as e:
        print(f"❌ Request failed: {e}")

if __name__ == "__main__":
    print("=" * 60)
    print("  BACKEND API TESTING")
    print("=" * 60)
    
    # Test 1: Single Taiwan fund symbol
    test_backend_stock_api()
    
    # Test 2: Multiple symbols
    test_multiple_symbols()
    
    print("\n" + "=" * 60)
    print("Testing completed!")