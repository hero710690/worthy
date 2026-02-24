#!/bin/bash
set -e

# Worthy App - CloudFormation Deployment Script
# This script deploys the entire infrastructure to a new AWS account

# Configuration
ENVIRONMENT=${1:-production}
AWS_REGION=${2:-ap-northeast-1}
AWS_PROFILE=${3:-}  # Optional, leave empty for EC2 IAM role

echo "🚀 Deploying Worthy App Infrastructure"
echo "Environment: $ENVIRONMENT"
echo "Region: $AWS_REGION"
if [ -n "$AWS_PROFILE" ]; then
    echo "Profile: $AWS_PROFILE"
    PROFILE_FLAG="--profile $AWS_PROFILE"
else
    echo "Profile: Using EC2 IAM role or default credentials"
    PROFILE_FLAG=""
fi
echo ""

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed. Please install it first."
    exit 1
fi

# Prompt for database password
read -sp "Enter database master password (min 8 characters): " DB_PASSWORD
echo ""

if [ ${#DB_PASSWORD} -lt 8 ]; then
    echo "❌ Password must be at least 8 characters"
    exit 1
fi

# Create deployment bucket
ACCOUNT_ID=$(aws sts get-caller-identity $PROFILE_FLAG --query Account --output text)
DEPLOYMENT_BUCKET="worthy-deployment-${ACCOUNT_ID}"

echo "📦 Creating deployment bucket: $DEPLOYMENT_BUCKET"
aws s3 mb s3://$DEPLOYMENT_BUCKET --region $AWS_REGION $PROFILE_FLAG 2>/dev/null || echo "Bucket already exists"

# Upload CloudFormation templates
echo "📤 Uploading CloudFormation templates..."
aws s3 sync cloudformation/ s3://$DEPLOYMENT_BUCKET/cloudformation/ $PROFILE_FLAG

# Package Lambda function
echo "📦 Packaging Lambda function..."
cd backend
if [ -f "worthy-backend.zip" ]; then
    rm worthy-backend.zip
fi

# Create deployment package
cd lambda_deployment_full
zip -r ../worthy-backend.zip . -x "*.pyc" -x "__pycache__/*" -x "*.dist-info/*"
cd ..

# Upload Lambda package
echo "📤 Uploading Lambda package..."
aws s3 cp worthy-backend.zip s3://$DEPLOYMENT_BUCKET/lambda/worthy-backend.zip $PROFILE_FLAG

cd ..

# Create secrets for API keys
echo "🔐 Creating secrets..."

# JWT Secret
JWT_SECRET=$(openssl rand -base64 32)
aws secretsmanager create-secret \
    --name worthy-jwt-secret \
    --secret-string "{\"secret\":\"$JWT_SECRET\"}" \
    --region $AWS_REGION \
    $PROFILE_FLAG 2>/dev/null || \
aws secretsmanager update-secret \
    --secret-id worthy-jwt-secret \
    --secret-string "{\"secret\":\"$JWT_SECRET\"}" \
    --region $AWS_REGION \
    $PROFILE_FLAG

# API Keys (you need to provide these)
echo ""
echo "Please enter your API keys (press Enter to skip):"
read -p "Alpha Vantage API Key: " ALPHA_VANTAGE_KEY
read -p "Exchange Rate API Key: " EXCHANGE_RATE_KEY
read -p "Polygon API Key: " POLYGON_KEY
read -p "Finnhub API Key: " FINNHUB_KEY

API_KEYS_JSON=$(cat <<EOF
{
  "alpha_vantage": "$ALPHA_VANTAGE_KEY",
  "exchange_rate": "$EXCHANGE_RATE_KEY",
  "polygon": "$POLYGON_KEY",
  "finnhub": "$FINNHUB_KEY"
}
EOF
)

aws secretsmanager create-secret \
    --name worthy-api-keys \
    --secret-string "$API_KEYS_JSON" \
    --region $AWS_REGION \
    $PROFILE_FLAG 2>/dev/null || \
aws secretsmanager update-secret \
    --secret-id worthy-api-keys \
    --secret-string "$API_KEYS_JSON" \
    --region $AWS_REGION \
    $PROFILE_FLAG

# Deploy main stack
echo ""
echo "🚀 Deploying CloudFormation stack..."
STACK_NAME="worthy-app-${ENVIRONMENT}"

aws cloudformation create-stack \
    --stack-name $STACK_NAME \
    --template-body file://cloudformation/main.yaml \
    --parameters \
        ParameterKey=Environment,ParameterValue=$ENVIRONMENT \
        ParameterKey=DBPassword,ParameterValue=$DB_PASSWORD \
        ParameterKey=DBUsername,ParameterValue=worthy_admin \
    --capabilities CAPABILITY_NAMED_IAM \
    --region $AWS_REGION \
    $PROFILE_FLAG

echo ""
echo "⏳ Waiting for stack creation to complete..."
echo "This may take 10-15 minutes..."

aws cloudformation wait stack-create-complete \
    --stack-name $STACK_NAME \
    --region $AWS_REGION \
    $PROFILE_FLAG

# Get outputs
echo ""
echo "✅ Stack created successfully!"
echo ""
echo "📋 Stack Outputs:"
aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --region $AWS_REGION \
    $PROFILE_FLAG \
    --query 'Stacks[0].Outputs[*].[OutputKey,OutputValue]' \
    --output table

echo ""
echo "🎉 Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Deploy frontend: cd frontend && ./deploy_frontend.sh"
echo "2. Migrate database: See DATABASE_MIGRATION.md"
echo "3. Update frontend API endpoint in environment variables"
