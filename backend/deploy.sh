#!/bin/bash

# Worthy Backend Deployment Script

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-development}
STACK_NAME="worthy-backend-${ENVIRONMENT}"
REGION=${AWS_DEFAULT_REGION:-us-east-1}

echo -e "${GREEN}🚀 Deploying Worthy Backend to AWS Lambda${NC}"
echo -e "${YELLOW}Environment: ${ENVIRONMENT}${NC}"
echo -e "${YELLOW}Stack Name: ${STACK_NAME}${NC}"
echo -e "${YELLOW}Region: ${REGION}${NC}"

# Check if AWS CLI is configured
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo -e "${RED}❌ AWS CLI not configured. Please run 'aws configure'${NC}"
    exit 1
fi

# Check if SAM CLI is installed
if ! command -v sam &> /dev/null; then
    echo -e "${RED}❌ AWS SAM CLI not found. Please install it first.${NC}"
    echo "Installation: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install.html"
    exit 1
fi

# Install dependencies
echo -e "${YELLOW}📦 Installing Python dependencies...${NC}"
pip install -r requirements.txt -t src/

# Build the SAM application
echo -e "${YELLOW}🔨 Building SAM application...${NC}"
sam build

# Deploy the application
echo -e "${YELLOW}🚀 Deploying to AWS...${NC}"
sam deploy \
    --stack-name "${STACK_NAME}" \
    --region "${REGION}" \
    --capabilities CAPABILITY_IAM \
    --parameter-overrides \
        Environment="${ENVIRONMENT}" \
        JWTSecret="${JWT_SECRET:-change-me-in-production}" \
        DatabaseURL="${DATABASE_URL}" \
        AlphaVantageAPIKey="${ALPHA_VANTAGE_API_KEY:-}" \
        ExchangeRateAPIKey="${EXCHANGE_RATE_API_KEY:-}" \
    --confirm-changeset

# Get the API URL
API_URL=$(aws cloudformation describe-stacks \
    --stack-name "${STACK_NAME}" \
    --region "${REGION}" \
    --query 'Stacks[0].Outputs[?OutputKey==`WorthyApiUrl`].OutputValue' \
    --output text)

echo -e "${GREEN}✅ Deployment completed successfully!${NC}"
echo -e "${GREEN}🌐 API URL: ${API_URL}${NC}"

# Test the deployment
echo -e "${YELLOW}🧪 Testing deployment...${NC}"
if curl -s "${API_URL}health" | grep -q "healthy"; then
    echo -e "${GREEN}✅ Health check passed!${NC}"
else
    echo -e "${RED}❌ Health check failed!${NC}"
fi

echo -e "${GREEN}🎉 Worthy Backend is now live!${NC}"
