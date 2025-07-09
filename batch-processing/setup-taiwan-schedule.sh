#!/bin/bash

# Worthy App - Setup Taiwan Market Batch Processing Schedule
# This script adds a second EventBridge rule for Taiwan market timing

set -e

# Configuration
AWS_PROFILE="worthy-app-user"
AWS_REGION="ap-northeast-1"

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

echo "🇹🇼 Setting up Taiwan market batch processing schedule..."

# Create EventBridge rule for Taiwan market (9:30 AM Taiwan Time = 01:30 UTC)
echo_info "Creating EventBridge rule for Taiwan market timing..."

aws events put-rule \
    --name "worthy-recurring-investments-taiwan" \
    --schedule-expression "cron(30 1 ? * TUE-SAT *)" \
    --description "Daily execution of Worthy recurring investments for Taiwan market (9:30 AM Taiwan Time)" \
    --state ENABLED \
    --profile $AWS_PROFILE \
    --region $AWS_REGION

echo_success "Taiwan market EventBridge rule created"

# Get existing EventBridge role ARN
EVENTBRIDGE_ROLE_ARN=$(aws iam get-role --role-name WorthyEventBridgeBatchRole --profile $AWS_PROFILE --query 'Role.Arn' --output text)

if [ $? -ne 0 ]; then
    echo_error "EventBridge role not found. Please run setup-aws-batch.sh first."
    exit 1
fi

echo_info "Using existing EventBridge role: $EVENTBRIDGE_ROLE_ARN"

# Add target to Taiwan EventBridge rule (using Lambda endpoint instead of Batch)
echo_info "Adding Lambda target to Taiwan market rule..."

# Get Lambda function ARN
LAMBDA_FUNCTION_ARN=$(aws lambda get-function \
    --function-name worthy-api-development \
    --profile $AWS_PROFILE \
    --region $AWS_REGION \
    --query 'Configuration.FunctionArn' \
    --output text)

if [ $? -ne 0 ]; then
    echo_error "Lambda function not found. Please ensure worthy-api-development exists."
    exit 1
fi

echo_info "Lambda function ARN: $LAMBDA_FUNCTION_ARN"

# Create Lambda permission for EventBridge to invoke the function
aws lambda add-permission \
    --function-name worthy-api-development \
    --statement-id "AllowEventBridgeTaiwanInvoke" \
    --action lambda:InvokeFunction \
    --principal events.amazonaws.com \
    --source-arn "arn:aws:events:$AWS_REGION:$(aws sts get-caller-identity --profile $AWS_PROFILE --query Account --output text):rule/worthy-recurring-investments-taiwan" \
    --profile $AWS_PROFILE \
    --region $AWS_REGION 2>/dev/null || echo_warning "Permission may already exist"

# Add Lambda target to EventBridge rule
aws events put-targets \
    --rule "worthy-recurring-investments-taiwan" \
    --targets '[
        {
            "Id": "1",
            "Arn": "'$LAMBDA_FUNCTION_ARN'",
            "HttpParameters": {
                "PathParameterValues": {},
                "HeaderParameters": {
                    "Content-Type": "application/json"
                },
                "QueryStringParameters": {}
            },
            "Input": "{\"httpMethod\":\"POST\",\"path\":\"/batch/recurring-investments\",\"headers\":{\"Content-Type\":\"application/json\"},\"body\":\"{\\\"market_context\\\":\\\"taiwan\\\"}\"}"
        }
    ]' \
    --profile $AWS_PROFILE \
    --region $AWS_REGION

echo_success "Taiwan market EventBridge target configured"

echo ""
echo "🎉 Taiwan market batch processing setup completed!"
echo ""
echo "📋 Summary:"
echo "   🇺🇸 US Market Schedule: Daily at 9:30 AM EST (14:30 UTC) - weekdays"
echo "   🇹🇼 Taiwan Market Schedule: Daily at 9:30 AM Taiwan Time (01:30 UTC) - weekdays"
echo "   📡 Both schedules use the same Lambda endpoint: /batch/recurring-investments"
echo "   🔄 Market-specific logic handles appropriate investments based on ticker symbols"
echo ""
echo "🧪 Test Taiwan market batch processing:"
echo "   curl -X POST https://mreda8g340.execute-api.ap-northeast-1.amazonaws.com/development/batch/recurring-investments"
echo ""
echo "📊 Monitor EventBridge rules:"
echo "   aws events list-rules --profile $AWS_PROFILE --region $AWS_REGION"
