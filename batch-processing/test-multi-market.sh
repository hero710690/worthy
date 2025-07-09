#!/bin/bash

# Worthy App - Multi-Market Batch Processing Test Script
# Test both US and Taiwan market batch processing

set -e

# Configuration
API_BASE_URL="https://mreda8g340.execute-api.ap-northeast-1.amazonaws.com/development"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

echo_info() {
    echo -e "${BLUE}ℹ️ $1${NC}"
}

echo_warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

echo_error() {
    echo -e "${RED}❌ $1${NC}"
}

echo "🌏 Testing Multi-Market Batch Processing..."

# Test 1: General batch processing endpoint
echo ""
echo "🧪 Test 1: General Batch Processing Endpoint"
echo "============================================="

response=$(curl -s -X POST "$API_BASE_URL/batch/recurring-investments" \
  -H "Content-Type: application/json" \
  -w "\nHTTP_STATUS:%{http_code}")

http_status=$(echo "$response" | grep "HTTP_STATUS" | cut -d: -f2)
response_body=$(echo "$response" | sed '/HTTP_STATUS/d')

echo "Response: $response_body"
echo "HTTP Status: $http_status"

if [ "$http_status" = "200" ]; then
    echo_success "Batch processing endpoint is working"
else
    echo_error "Batch processing endpoint failed"
fi

# Test 2: Test Taiwan stock price fetching
echo ""
echo "🧪 Test 2: Taiwan Stock Price Fetching"
echo "======================================"

# Test Taiwan stock (2330.TW is Taiwan Semiconductor)
taiwan_response=$(curl -s "$API_BASE_URL/test/stock-prices?symbols=2330.TW" \
  -w "\nHTTP_STATUS:%{http_code}")

tw_http_status=$(echo "$taiwan_response" | grep "HTTP_STATUS" | cut -d: -f2)
tw_response_body=$(echo "$taiwan_response" | sed '/HTTP_STATUS/d')

echo "Taiwan Stock Response: $tw_response_body"
echo "HTTP Status: $tw_http_status"

if [ "$tw_http_status" = "200" ]; then
    echo_success "Taiwan stock price fetching is working"
else
    echo_warning "Taiwan stock price fetching may need attention"
fi

# Test 3: Test US stock price fetching
echo ""
echo "🧪 Test 3: US Stock Price Fetching"
echo "=================================="

us_response=$(curl -s "$API_BASE_URL/test/stock-prices?symbols=AAPL" \
  -w "\nHTTP_STATUS:%{http_code}")

us_http_status=$(echo "$us_response" | grep "HTTP_STATUS" | cut -d: -f2)
us_response_body=$(echo "$us_response" | sed '/HTTP_STATUS/d')

echo "US Stock Response: $us_response_body"
echo "HTTP Status: $us_http_status"

if [ "$us_http_status" = "200" ]; then
    echo_success "US stock price fetching is working"
else
    echo_error "US stock price fetching failed"
fi

# Test 4: Mixed market stock prices
echo ""
echo "🧪 Test 4: Mixed Market Stock Prices"
echo "===================================="

mixed_response=$(curl -s "$API_BASE_URL/test/stock-prices?symbols=AAPL,2330.TW,TSLA" \
  -w "\nHTTP_STATUS:%{http_code}")

mixed_http_status=$(echo "$mixed_response" | grep "HTTP_STATUS" | cut -d: -f2)
mixed_response_body=$(echo "$mixed_response" | sed '/HTTP_STATUS/d')

echo "Mixed Market Response: $mixed_response_body"
echo "HTTP Status: $mixed_http_status"

if [ "$mixed_http_status" = "200" ]; then
    echo_success "Mixed market stock price fetching is working"
else
    echo_warning "Mixed market stock price fetching may need attention"
fi

# Test 5: Market timing simulation
echo ""
echo "🧪 Test 5: Market Timing Information"
echo "===================================="

echo_info "Current time zones:"
echo "   🇺🇸 US Eastern Time: $(TZ='America/New_York' date)"
echo "   🇹🇼 Taiwan Time: $(TZ='Asia/Taipei' date)"
echo "   🌍 UTC Time: $(TZ='UTC' date)"

echo ""
echo_info "Market schedules:"
echo "   🇺🇸 US Market: 9:30 AM - 4:00 PM EST (14:30 - 21:00 UTC)"
echo "   🇹🇼 Taiwan Market: 9:00 AM - 1:30 PM Taiwan Time (01:00 - 05:30 UTC)"

# Calculate if markets should be open now
current_hour_utc=$(TZ='UTC' date +%H)
current_minute_utc=$(TZ='UTC' date +%M)
current_day=$(TZ='UTC' date +%u)  # 1=Monday, 7=Sunday

echo ""
echo_info "Current market status (estimated):"

# US Market check (14:30 - 21:00 UTC, Monday-Friday)
if [ "$current_day" -le 5 ]; then  # Weekday
    if [ "$current_hour_utc" -ge 14 ] && [ "$current_hour_utc" -lt 21 ]; then
        if [ "$current_hour_utc" -eq 14 ] && [ "$current_minute_utc" -lt 30 ]; then
            echo "   🇺🇸 US Market: 🔴 CLOSED (before 9:30 AM EST)"
        else
            echo "   🇺🇸 US Market: 🟢 OPEN"
        fi
    else
        echo "   🇺🇸 US Market: 🔴 CLOSED (outside trading hours)"
    fi
else
    echo "   🇺🇸 US Market: 🔴 CLOSED (weekend)"
fi

# Taiwan Market check (01:00 - 05:30 UTC, Monday-Friday)
if [ "$current_day" -le 5 ]; then  # Weekday
    if [ "$current_hour_utc" -ge 1 ] && [ "$current_hour_utc" -lt 6 ]; then
        if [ "$current_hour_utc" -eq 5 ] && [ "$current_minute_utc" -gt 30 ]; then
            echo "   🇹🇼 Taiwan Market: 🔴 CLOSED (after 1:30 PM Taiwan time)"
        else
            echo "   🇹🇼 Taiwan Market: 🟢 OPEN"
        fi
    else
        echo "   🇹🇼 Taiwan Market: 🔴 CLOSED (outside trading hours)"
    fi
else
    echo "   🇹🇼 Taiwan Market: 🔴 CLOSED (weekend)"
fi

echo ""
echo "📋 Summary:"
echo "=========="

if [ "$http_status" = "200" ]; then
    echo_success "✅ Batch processing endpoint: WORKING"
else
    echo_error "❌ Batch processing endpoint: FAILED"
fi

if [ "$us_http_status" = "200" ]; then
    echo_success "✅ US stock prices: WORKING"
else
    echo_error "❌ US stock prices: FAILED"
fi

if [ "$tw_http_status" = "200" ]; then
    echo_success "✅ Taiwan stock prices: WORKING"
else
    echo_warning "⚠️ Taiwan stock prices: NEEDS ATTENTION"
fi

echo ""
echo "🚀 Next Steps:"
echo "1. Deploy the enhanced batch processing: cd /Users/jeanlee/worthy/backend && ./deploy_lambda.sh"
echo "2. Set up Taiwan market schedule: cd /Users/jeanlee/worthy/batch-processing && ./setup-taiwan-schedule.sh"
echo "3. Create test recurring investments for both markets"
echo "4. Monitor EventBridge rules and Lambda logs"
