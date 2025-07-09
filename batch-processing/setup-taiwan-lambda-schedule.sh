#!/bin/bash

# Worthy App - Setup Taiwan Market Lambda Schedule (Simplified)
# This script creates a direct Lambda trigger for Taiwan market timing

set -e

# Configuration
AWS_PROFILE="worthy-app-user"
AWS_REGION="ap-northeast-1"
LAMBDA_FUNCTION_NAME="worthy-api-development"

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

echo "🇹🇼 Setting up Taiwan market Lambda schedule..."

# Create EventBridge rule for Taiwan market (9:30 AM Taiwan Time = 01:30 UTC)
echo_info "Creating EventBridge rule for Taiwan market timing..."

aws events put-rule \
    --name "worthy-taiwan-market-batch" \
    --schedule-expression "cron(30 1 ? * TUE-SAT *)" \
    --description "Taiwan market batch processing (9:30 AM Taiwan Time, weekdays)" \
    --state ENABLED \
    --profile $AWS_PROFILE \
    --region $AWS_REGION

echo_success "Taiwan market EventBridge rule created"

# Get Lambda function ARN
echo_info "Getting Lambda function ARN..."

LAMBDA_FUNCTION_ARN=$(aws lambda get-function \
    --function-name $LAMBDA_FUNCTION_NAME \
    --profile $AWS_PROFILE \
    --region $AWS_REGION \
    --query 'Configuration.FunctionArn' \
    --output text)

if [ $? -ne 0 ]; then
    echo_error "Lambda function not found. Please ensure $LAMBDA_FUNCTION_NAME exists."
    exit 1
fi

echo_info "Lambda function ARN: $LAMBDA_FUNCTION_ARN"

# Add permission for EventBridge to invoke Lambda
echo_info "Adding EventBridge permission to Lambda..."

aws lambda add-permission \
    --function-name $LAMBDA_FUNCTION_NAME \
    --statement-id "AllowEventBridgeTaiwanInvoke" \
    --action lambda:InvokeFunction \
    --principal events.amazonaws.com \
    --source-arn "arn:aws:events:$AWS_REGION:$(aws sts get-caller-identity --profile $AWS_PROFILE --query Account --output text):rule/worthy-taiwan-market-batch" \
    --profile $AWS_PROFILE \
    --region $AWS_REGION 2>/dev/null || echo_warning "Permission may already exist"

echo_success "Lambda permission added"

# Add Lambda target to EventBridge rule
echo_info "Adding Lambda target to EventBridge rule..."

aws events put-targets \
    --rule "worthy-taiwan-market-batch" \
    --targets '[
        {
            "Id": "1",
            "Arn": "'$LAMBDA_FUNCTION_ARN'",
            "Input": "{\"httpMethod\":\"POST\",\"path\":\"/batch/recurring-investments\",\"headers\":{\"Content-Type\":\"application/json\"},\"body\":\"{\\\"market_context\\\":\\\"taiwan\\\"}\"}"
        }
    ]' \
    --profile $AWS_PROFILE \
    --region $AWS_REGION

echo_success "Lambda target added to EventBridge rule"

echo ""
echo "🎉 Taiwan market Lambda schedule setup completed!"
echo ""
echo "📋 Summary:"
echo "   🇺🇸 US Market Schedule: Daily at 9:30 AM EST (14:30 UTC) - weekdays"
echo "   🇹🇼 Taiwan Market Schedule: Daily at 9:30 AM Taiwan Time (01:30 UTC) - weekdays"
echo "   📡 Both schedules trigger the same Lambda endpoint: /batch/recurring-investments"
echo "   🔄 Market-specific logic handles appropriate investments based on ticker symbols"
echo ""
echo "🧪 Test Taiwan market batch processing:"
echo "   curl -X POST https://mreda8g340.execute-api.ap-northeast-1.amazonaws.com/development/batch/recurring-investments"
echo ""
echo "📊 Monitor EventBridge rules:"
echo "   aws events list-rules --profile $AWS_PROFILE --region $AWS_REGION"
echo ""
echo "🕐 Next Taiwan market execution: Tomorrow at 9:30 AM Taiwan Time (01:30 UTC)"
