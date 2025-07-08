#!/bin/bash

# Worthy App Lambda Deployment Script
# This script deploys the backend using the pre-built lambda_deployment_full directory

set -e  # Exit on any error

echo "🚀 Starting Worthy App Lambda Deployment..."

# Configuration
FUNCTION_NAME="worthy-api-development"
REGION="ap-northeast-1"
PROFILE="worthy-app-user"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
echo "📋 Checking prerequisites..."

# Check AWS CLI
if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI not found. Please install AWS CLI.${NC}"
    exit 1
fi

# Check AWS profile
if ! aws configure list-profiles | grep -q "$PROFILE"; then
    echo -e "${RED}❌ AWS profile '$PROFILE' not found.${NC}"
    exit 1
fi

# Verify AWS credentials
echo "🔐 Verifying AWS credentials..."
if ! aws sts get-caller-identity --profile "$PROFILE" --region "$REGION" > /dev/null 2>&1; then
    echo -e "${RED}❌ AWS credentials verification failed.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ AWS credentials verified.${NC}"

# Check if lambda_deployment_full exists
if [ ! -d "lambda_deployment_full" ]; then
    echo -e "${RED}❌ lambda_deployment_full directory not found.${NC}"
    exit 1
fi

# Clean up previous builds
echo "🧹 Cleaning up previous builds..."
rm -f worthy-backend-full.zip

# Step 1: Update the main function file in lambda_deployment_full
echo "📝 Updating function code in deployment package..."
cp worthy_lambda_function.py lambda_deployment_full/

# Step 2: Create deployment package from lambda_deployment_full
echo "📦 Creating deployment package from lambda_deployment_full..."
cd lambda_deployment_full
zip -r ../worthy-backend-full.zip . -x "*.DS_Store" "*.pyc" "__pycache__/*"
cd ..

# Step 3: Update function code
echo "🚀 Deploying to AWS Lambda..."
aws lambda update-function-code \
    --function-name "$FUNCTION_NAME" \
    --zip-file fileb://worthy-backend-full.zip \
    --profile "$PROFILE" \
    --region "$REGION" > /dev/null

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Function code updated successfully.${NC}"
else
    echo -e "${RED}❌ Function code update failed.${NC}"
    exit 1
fi

# Step 4: Update function configuration
echo "⚙️  Updating function configuration..."
aws lambda update-function-configuration \
    --function-name "$FUNCTION_NAME" \
    --handler worthy_lambda_function.lambda_handler \
    --timeout 30 \
    --memory-size 512 \
    --profile "$PROFILE" \
    --region "$REGION" > /dev/null

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Function configuration updated successfully.${NC}"
else
    echo -e "${RED}❌ Function configuration update failed.${NC}"
    exit 1
fi

# Step 5: Test deployment
echo "🧪 Testing deployment..."
API_URL="https://mreda8g340.execute-api.ap-northeast-1.amazonaws.com/development"

# Wait a moment for deployment to propagate
echo "⏳ Waiting for deployment to propagate..."
sleep 5

# Test health endpoint
echo "🏥 Testing health endpoint..."
HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/health")
if [ "$HEALTH_RESPONSE" = "200" ]; then
    echo -e "${GREEN}✅ Health check passed.${NC}"
else
    echo -e "${YELLOW}⚠️  Health check returned status: $HEALTH_RESPONSE${NC}"
fi

# Test stock prices endpoint
echo "📈 Testing stock prices endpoint..."
STOCK_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/stock-prices-multi?symbols=AAPL")
if [ "$STOCK_RESPONSE" = "200" ]; then
    echo -e "${GREEN}✅ Stock prices endpoint working.${NC}"
else
    echo -e "${YELLOW}⚠️  Stock prices endpoint returned status: $STOCK_RESPONSE${NC}"
fi

# Clean up build artifacts
echo "🧹 Cleaning up build artifacts..."
rm -f worthy-backend-full.zip

echo ""
echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
echo ""
echo "📊 Deployment Summary:"
echo "  • Function: $FUNCTION_NAME"
echo "  • Region: $REGION"
echo "  • API URL: $API_URL"
echo ""
echo "🔗 Test your API:"
echo "  • Health: curl $API_URL/health"
echo "  • Stock Prices: curl \"$API_URL/api/stock-prices-multi?symbols=AAPL,TSLA\""
echo ""
echo -e "${GREEN}✅ Ready to use!${NC}"
