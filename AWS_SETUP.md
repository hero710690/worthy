# AWS Setup for Worthy App

## AWS User and Permissions

A dedicated AWS IAM user `worthy-app-user` has been created with the following details:

- **User Name**: `worthy-app-user`
- **User ID**: `AIDATTIKGE2FIUQJTJ3T7`
- **ARN**: `arn:aws:iam::247518865034:user/worthy/worthy-app-user`
- **Policy**: `WorthyAppPolicy` (attached)

## Required AWS Credentials

To deploy the Worthy app, you'll need to configure AWS credentials. Contact the administrator for:

- AWS Access Key ID
- AWS Secret Access Key

## Configuration Options

### Option 1: Environment Variables
```bash
export AWS_ACCESS_KEY_ID=your-access-key-id
export AWS_SECRET_ACCESS_KEY=your-secret-access-key
export AWS_DEFAULT_REGION=us-east-1
```

### Option 2: AWS Credentials File
Add to `~/.aws/credentials`:
```ini
[worthy-app]
aws_access_key_id = your-access-key-id
aws_secret_access_key = your-secret-access-key
region = us-east-1
```

Then use: `aws --profile worthy-app`

### Option 3: AWS CLI Configure
```bash
aws configure --profile worthy-app
```

## IAM Policy Permissions

The `WorthyAppPolicy` includes permissions for:

- **Lambda**: Full access for function deployment
- **API Gateway**: Full access for REST API management
- **RDS**: Full access for database management
- **S3**: Access to worthy-* buckets
- **CloudFront**: Full access for CDN
- **EventBridge**: Full access for scheduling
- **CloudWatch Logs**: Full access for logging
- **Systems Manager**: Parameter store access for worthy/*
- **Secrets Manager**: Secret management for worthy/*
- **IAM**: Limited role management for Lambda execution

## Database Setup

### Option 1: Local Development (Docker)
```bash
docker run --name worthy-postgres \
  -e POSTGRES_DB=worthy \
  -e POSTGRES_USER=worthy_admin \
  -e POSTGRES_PASSWORD=***REMOVED*** \
  -p 5432:5432 -d postgres:15
```

### Option 2: AWS RDS
```bash
aws rds create-db-instance \
    --db-instance-identifier worthy-db-dev \
    --db-instance-class db.t3.micro \
    --engine postgres \
    --engine-version 15.4 \
    --master-username worthy_admin \
    --master-user-password 'YOUR_SECURE_PASSWORD' \
    --allocated-storage 20 \
    --storage-type gp2 \
    --db-name worthy \
    --backup-retention-period 7 \
    --storage-encrypted \
    --publicly-accessible \
    --region us-east-1
```

## Deployment

Once credentials are configured:

```bash
cd backend
./deploy.sh development
```

## Security Notes

- Never commit AWS credentials to version control
- Use environment variables or AWS credentials file
- Rotate credentials regularly
- Use least privilege principle for IAM policies
- Enable MFA for AWS console access
