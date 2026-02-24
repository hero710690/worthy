# Worthy App - AWS Migration Guide

## Overview
This guide helps you migrate the Worthy application to a new AWS account using CloudFormation Infrastructure as Code (IaC).

## Prerequisites

1. **AWS CLI** installed and configured
2. **AWS Account** with appropriate permissions
3. **Database backup** from current environment
4. **API Keys** for external services:
   - Alpha Vantage API Key
   - Exchange Rate API Key
   - Polygon API Key
   - Finnhub API Key

## Architecture

The CloudFormation templates create:
- **VPC**: Custom VPC with public/private subnets across 2 AZs
- **RDS**: PostgreSQL database in private subnets
- **Lambda**: Python 3.11 function for backend API
- **API Gateway**: REST API endpoint
- **S3**: Frontend hosting bucket
- **CloudFront**: CDN for frontend distribution
- **Secrets Manager**: Secure storage for credentials and API keys

## Migration Steps

### Step 1: Export Current Database

```bash
# From current environment
pg_dump -h worthy-db-dev.ch0ccg6ycp7t.ap-northeast-1.rds.amazonaws.com \
  -U worthy_admin \
  -d worthy \
  -F c \
  -f worthy_backup_$(date +%Y%m%d).dump
```

### Step 2: Deploy Infrastructure

```bash
# Navigate to project root
cd /Users/jeanlee/worthy

# Run deployment script
./cloudformation/deploy.sh production ap-northeast-1 your-aws-profile

# Follow prompts to enter:
# - Database password
# - API keys
```

The script will:
1. Create deployment S3 bucket
2. Upload CloudFormation templates
3. Package and upload Lambda function
4. Create secrets in Secrets Manager
5. Deploy all infrastructure stacks
6. Wait for completion (~15 minutes)

### Step 3: Import Database

```bash
# Get new database endpoint from CloudFormation outputs
NEW_DB_ENDPOINT=$(aws cloudformation describe-stacks \
  --stack-name worthy-app-production \
  --query 'Stacks[0].Outputs[?OutputKey==`DatabaseEndpoint`].OutputValue' \
  --output text)

# Restore database
pg_restore -h $NEW_DB_ENDPOINT \
  -U worthy_admin \
  -d worthy \
  -v worthy_backup_YYYYMMDD.dump
```

### Step 4: Deploy Frontend

```bash
# Get CloudFront distribution ID
CLOUDFRONT_ID=$(aws cloudformation describe-stacks \
  --stack-name worthy-app-production \
  --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDistributionId`].OutputValue' \
  --output text)

# Get S3 bucket name
S3_BUCKET=$(aws cloudformation describe-stacks \
  --stack-name worthy-app-production \
  --query 'Stacks[0].Outputs[?OutputKey==`FrontendBucketName`].OutputValue' \
  --output text)

# Update frontend environment variables
cd frontend
# Edit src/config.ts or .env with new API endpoint

# Build and deploy
npm run build
aws s3 sync dist/ s3://$S3_BUCKET/ --delete
aws cloudfront create-invalidation --distribution-id $CLOUDFRONT_ID --paths "/*"
```

### Step 5: Verify Deployment

```bash
# Get all endpoints
aws cloudformation describe-stacks \
  --stack-name worthy-app-production \
  --query 'Stacks[0].Outputs' \
  --output table
```

Test:
1. Frontend URL (CloudFront)
2. API health endpoint
3. Database connectivity
4. User login/registration

## Stack Management

### Update Stack
```bash
aws cloudformation update-stack \
  --stack-name worthy-app-production \
  --template-body file://cloudformation/main.yaml \
  --parameters file://parameters.json \
  --capabilities CAPABILITY_NAMED_IAM
```

### Delete Stack
```bash
# WARNING: This will delete all resources
aws cloudformation delete-stack --stack-name worthy-app-production
```

### View Stack Events
```bash
aws cloudformation describe-stack-events \
  --stack-name worthy-app-production \
  --max-items 20
```

## Cost Estimation

Monthly costs (approximate):
- **RDS db.t3.micro**: $15-20
- **Lambda**: $0-5 (within free tier for low traffic)
- **API Gateway**: $3.50 per million requests
- **S3**: $0.023 per GB
- **CloudFront**: $0.085 per GB (first 10 TB)
- **Total**: ~$25-40/month for low-medium traffic

## Troubleshooting

### Stack Creation Failed
```bash
# Check events
aws cloudformation describe-stack-events \
  --stack-name worthy-app-production \
  --query 'StackEvents[?ResourceStatus==`CREATE_FAILED`]'

# Delete failed stack and retry
aws cloudformation delete-stack --stack-name worthy-app-production
```

### Lambda Can't Connect to RDS
- Verify Lambda is in VPC private subnets
- Check security group allows Lambda → RDS on port 5432
- Verify DATABASE_URL environment variable

### Frontend Not Loading
- Check S3 bucket policy allows public read
- Verify CloudFront distribution is deployed
- Check browser console for API endpoint errors

## Rollback Plan

If migration fails:
1. Keep old infrastructure running
2. Delete new CloudFormation stack
3. Fix issues and redeploy
4. Only decommission old infrastructure after verification

## Security Checklist

- [ ] Database password is strong (min 8 chars)
- [ ] Secrets stored in Secrets Manager
- [ ] RDS in private subnets
- [ ] Security groups properly configured
- [ ] S3 bucket has appropriate access controls
- [ ] CloudFront uses HTTPS
- [ ] API keys rotated if compromised

## Support

For issues:
1. Check CloudFormation events
2. Review Lambda logs in CloudWatch
3. Verify all parameters are correct
4. Ensure IAM permissions are sufficient

## Files Created

```
cloudformation/
├── main.yaml           # Main orchestration stack
├── vpc.yaml           # VPC and networking
├── rds.yaml           # PostgreSQL database
├── lambda.yaml        # Lambda function
├── api-gateway.yaml   # API Gateway
├── frontend.yaml      # S3 and CloudFront
└── deploy.sh          # Deployment script
```
