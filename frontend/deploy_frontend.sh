#!/bin/bash

# Worthy Frontend Deployment Script
# Automated deployment to AWS S3 + CloudFront

set -e  # Exit on any error

echo "🚀 Starting Worthy Frontend Deployment..."
echo "================================================"

# Configuration
S3_BUCKET="worthy-frontend-1751874299"
CLOUDFRONT_DISTRIBUTION_ID="E2Y4JRNUULLCOK"
AWS_PROFILE="worthy-app-user"
PRIMARY_URL="https://ds8jn7fwox3fb.cloudfront.net"
BACKUP_URL="http://worthy-frontend-1751874299.s3-website-ap-northeast-1.amazonaws.com"

# Navigate to frontend directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "📂 Working directory: $(pwd)"

# Check prerequisites
echo "🔍 Checking prerequisites..."

# Check if AWS CLI is available
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed or not in PATH"
    exit 1
fi

# Check AWS credentials
if ! aws sts get-caller-identity --profile "$AWS_PROFILE" &> /dev/null; then
    echo "❌ AWS credentials not configured for profile: $AWS_PROFILE"
    echo "Please run: aws configure --profile $AWS_PROFILE"
    exit 1
fi

echo "✅ AWS credentials verified for profile: $AWS_PROFILE"

# Check if npm is available
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed or not in PATH"
    exit 1
fi

# Check if package.json exists
if [ ! -f "package.json" ]; then
    echo "❌ package.json not found. Are you in the frontend directory?"
    exit 1
fi

echo "✅ Prerequisites check completed"

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies"
        exit 1
    fi
    echo "✅ Dependencies installed"
fi

# Build the application
echo "🔨 Building application..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

echo "✅ Build completed successfully"

# Check if dist directory exists
if [ ! -d "dist" ]; then
    echo "❌ Build output directory 'dist' not found"
    exit 1
fi

# Show build output size
echo "📊 Build output:"
ls -la dist/
echo ""

# Deploy to S3
echo "☁️  Deploying to S3 bucket: $S3_BUCKET"
aws s3 sync dist/ "s3://$S3_BUCKET" --delete --profile "$AWS_PROFILE"

if [ $? -ne 0 ]; then
    echo "❌ S3 deployment failed!"
    exit 1
fi

echo "✅ S3 deployment completed"

# Invalidate CloudFront cache
echo "🔄 Invalidating CloudFront cache..."
INVALIDATION_OUTPUT=$(aws cloudfront create-invalidation \
    --distribution-id "$CLOUDFRONT_DISTRIBUTION_ID" \
    --paths "/*" \
    --profile "$AWS_PROFILE" \
    --output json)

if [ $? -ne 0 ]; then
    echo "❌ CloudFront invalidation failed!"
    exit 1
fi

# Extract invalidation ID
INVALIDATION_ID=$(echo "$INVALIDATION_OUTPUT" | grep -o '"Id": "[^"]*"' | cut -d'"' -f4)
echo "✅ CloudFront invalidation created: $INVALIDATION_ID"

# Final success message
echo ""
echo "🎉 Frontend deployment completed successfully!"
echo "================================================"
echo "🌐 Primary URL: $PRIMARY_URL"
echo "🌐 Backup URL:  $BACKUP_URL"
echo ""
echo "⏳ Important: Wait 2-3 minutes for CloudFront cache invalidation to complete"
echo "🔄 Invalidation ID: $INVALIDATION_ID"
echo ""
echo "📋 To check invalidation status:"
echo "aws cloudfront get-invalidation --distribution-id $CLOUDFRONT_DISTRIBUTION_ID --id $INVALIDATION_ID --profile $AWS_PROFILE"
echo ""
echo "🧪 Testing checklist:"
echo "  ✓ Wait 2-3 minutes"
echo "  ✓ Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)"
echo "  ✓ Test login/registration"
echo "  ✓ Test dashboard loading"
echo "  ✓ Test portfolio page"
echo "  ✓ Check browser console for errors"
echo ""
echo "🎯 Deployment completed at: $(date)"
