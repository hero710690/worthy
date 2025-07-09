#!/bin/bash

# Worthy App - AWS Batch Setup Script
# Sets up AWS Batch infrastructure for recurring investments processing

set -e

echo "🚀 Setting up AWS Batch infrastructure for Worthy recurring investments..."

# Configuration
AWS_PROFILE="worthy-app-user"
AWS_REGION="ap-northeast-1"
ECR_REPOSITORY_NAME="worthy-batch-processing"
BATCH_JOB_QUEUE_NAME="worthy-recurring-investments-queue"
BATCH_JOB_DEFINITION_NAME="worthy-recurring-investments-job"
COMPUTE_ENVIRONMENT_NAME="worthy-batch-compute-env"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

echo_warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

echo_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check prerequisites
echo "🔍 Checking prerequisites..."

if ! command -v aws &> /dev/null; then
    echo_error "AWS CLI is not installed"
    exit 1
fi

if ! command -v docker &> /dev/null; then
    echo_error "Docker is not installed"
    exit 1
fi

# Verify AWS credentials
if ! aws sts get-caller-identity --profile $AWS_PROFILE &> /dev/null; then
    echo_error "AWS credentials not configured for profile: $AWS_PROFILE"
    exit 1
fi

echo_success "Prerequisites check completed"

# Step 1: Create ECR repository
echo "📦 Creating ECR repository..."

aws ecr describe-repositories --repository-names $ECR_REPOSITORY_NAME --profile $AWS_PROFILE --region $AWS_REGION &> /dev/null || {
    aws ecr create-repository \
        --repository-name $ECR_REPOSITORY_NAME \
        --profile $AWS_PROFILE \
        --region $AWS_REGION
    echo_success "ECR repository created: $ECR_REPOSITORY_NAME"
}

# Get ECR repository URI
ECR_URI=$(aws ecr describe-repositories --repository-names $ECR_REPOSITORY_NAME --profile $AWS_PROFILE --region $AWS_REGION --query 'repositories[0].repositoryUri' --output text)
echo_success "ECR repository URI: $ECR_URI"

# Step 2: Build and push Docker image
echo "🐳 Building and pushing Docker image..."

# Get ECR login token
aws ecr get-login-password --profile $AWS_PROFILE --region $AWS_REGION | docker login --username AWS --password-stdin $ECR_URI

# Build Docker image
docker build -t $ECR_REPOSITORY_NAME .

# Tag image for ECR
docker tag $ECR_REPOSITORY_NAME:latest $ECR_URI:latest

# Push image to ECR
docker push $ECR_URI:latest

echo_success "Docker image pushed to ECR"

# Step 3: Create IAM role for Batch jobs
echo "🔐 Creating IAM role for Batch jobs..."

BATCH_EXECUTION_ROLE_NAME="WorthyBatchExecutionRole"

# Create trust policy
cat > batch-trust-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "Service": "ecs-tasks.amazonaws.com"
            },
            "Action": "sts:AssumeRole"
        }
    ]
}
EOF

# Create execution role
aws iam create-role \
    --role-name $BATCH_EXECUTION_ROLE_NAME \
    --assume-role-policy-document file://batch-trust-policy.json \
    --profile $AWS_PROFILE 2>/dev/null || echo_warning "Role may already exist"

# Attach policies
aws iam attach-role-policy \
    --role-name $BATCH_EXECUTION_ROLE_NAME \
    --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy \
    --profile $AWS_PROFILE

# Create custom policy for RDS and external API access
cat > batch-custom-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "rds-db:connect"
            ],
            "Resource": "*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "logs:CreateLogGroup",
                "logs:CreateLogStream",
                "logs:PutLogEvents"
            ],
            "Resource": "*"
        }
    ]
}
EOF

aws iam put-role-policy \
    --role-name $BATCH_EXECUTION_ROLE_NAME \
    --policy-name WorthyBatchCustomPolicy \
    --policy-document file://batch-custom-policy.json \
    --profile $AWS_PROFILE

# Get role ARN
BATCH_EXECUTION_ROLE_ARN=$(aws iam get-role --role-name $BATCH_EXECUTION_ROLE_NAME --profile $AWS_PROFILE --query 'Role.Arn' --output text)
echo_success "IAM role created: $BATCH_EXECUTION_ROLE_ARN"

# Step 4: Create Batch compute environment
echo "💻 Creating Batch compute environment..."

aws batch create-compute-environment \
    --compute-environment-name $COMPUTE_ENVIRONMENT_NAME \
    --type MANAGED \
    --state ENABLED \
    --compute-resources type=FARGATE \
    --service-role arn:aws:iam::$(aws sts get-caller-identity --profile $AWS_PROFILE --query Account --output text):role/aws-service-role/batch.amazonaws.com/AWSServiceRoleForBatch \
    --profile $AWS_PROFILE \
    --region $AWS_REGION 2>/dev/null || echo_warning "Compute environment may already exist"

echo_success "Batch compute environment created"

# Step 5: Create Batch job queue
echo "📋 Creating Batch job queue..."

aws batch create-job-queue \
    --job-queue-name $BATCH_JOB_QUEUE_NAME \
    --state ENABLED \
    --priority 1 \
    --compute-environment-order order=1,computeEnvironment=$COMPUTE_ENVIRONMENT_NAME \
    --profile $AWS_PROFILE \
    --region $AWS_REGION 2>/dev/null || echo_warning "Job queue may already exist"

echo_success "Batch job queue created"

# Step 6: Create Batch job definition
echo "📝 Creating Batch job definition..."

cat > job-definition.json << EOF
{
    "jobDefinitionName": "$BATCH_JOB_DEFINITION_NAME",
    "type": "container",
    "platformCapabilities": ["FARGATE"],
    "containerProperties": {
        "image": "$ECR_URI:latest",
        "vcpus": 0.25,
        "memory": 512,
        "executionRoleArn": "$BATCH_EXECUTION_ROLE_ARN",
        "networkConfiguration": {
            "assignPublicIp": "ENABLED"
        },
        "environment": [
            {
                "name": "DATABASE_URL",
                "value": "postgresql://worthy_admin:REDACTED_DB_PASSWORD@worthy-db-dev.ch0ccg6ycp7t.ap-northeast-1.rds.amazonaws.com:5432/worthy"
            },
            {
                "name": "FINNHUB_API_KEY",
                "value": "REDACTED_FINNHUB_KEY"
            },
            {
                "name": "ALPHA_VANTAGE_API_KEY",
                "value": "REDACTED_ALPHA_VANTAGE_KEY"
            },
            {
                "name": "EXCHANGE_RATE_API_KEY",
                "value": "REDACTED_EXCHANGE_RATE_KEY"
            }
        ],
        "logConfiguration": {
            "logDriver": "awslogs",
            "options": {
                "awslogs-group": "/aws/batch/worthy-recurring-investments",
                "awslogs-region": "$AWS_REGION",
                "awslogs-stream-prefix": "batch"
            }
        }
    },
    "retryStrategy": {
        "attempts": 3
    },
    "timeout": {
        "attemptDurationSeconds": 3600
    }
}
EOF

aws batch register-job-definition \
    --cli-input-json file://job-definition.json \
    --profile $AWS_PROFILE \
    --region $AWS_REGION

echo_success "Batch job definition created"

# Step 7: Create CloudWatch log group
echo "📊 Creating CloudWatch log group..."

aws logs create-log-group \
    --log-group-name "/aws/batch/worthy-recurring-investments" \
    --profile $AWS_PROFILE \
    --region $AWS_REGION 2>/dev/null || echo_warning "Log group may already exist"

echo_success "CloudWatch log group created"

# Step 8: Create EventBridge rule for daily execution
echo "⏰ Creating EventBridge rule for daily execution..."

# Create rule for daily execution at 9:30 AM EST (market open)
aws events put-rule \
    --name "worthy-recurring-investments-daily" \
    --schedule-expression "cron(30 14 * * MON-FRI *)" \
    --description "Daily execution of Worthy recurring investments batch job" \
    --state ENABLED \
    --profile $AWS_PROFILE \
    --region $AWS_REGION

# Create IAM role for EventBridge
EVENTBRIDGE_ROLE_NAME="WorthyEventBridgeBatchRole"

cat > eventbridge-trust-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "Service": "events.amazonaws.com"
            },
            "Action": "sts:AssumeRole"
        }
    ]
}
EOF

aws iam create-role \
    --role-name $EVENTBRIDGE_ROLE_NAME \
    --assume-role-policy-document file://eventbridge-trust-policy.json \
    --profile $AWS_PROFILE 2>/dev/null || echo_warning "EventBridge role may already exist"

cat > eventbridge-batch-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "batch:SubmitJob"
            ],
            "Resource": "*"
        }
    ]
}
EOF

aws iam put-role-policy \
    --role-name $EVENTBRIDGE_ROLE_NAME \
    --policy-name EventBridgeBatchPolicy \
    --policy-document file://eventbridge-batch-policy.json \
    --profile $AWS_PROFILE

EVENTBRIDGE_ROLE_ARN=$(aws iam get-role --role-name $EVENTBRIDGE_ROLE_NAME --profile $AWS_PROFILE --query 'Role.Arn' --output text)

# Add target to EventBridge rule
aws events put-targets \
    --rule "worthy-recurring-investments-daily" \
    --targets "Id"="1","Arn"="arn:aws:batch:$AWS_REGION:$(aws sts get-caller-identity --profile $AWS_PROFILE --query Account --output text):job-queue/$BATCH_JOB_QUEUE_NAME","RoleArn"="$EVENTBRIDGE_ROLE_ARN","BatchParameters"="{\"JobName\":\"worthy-recurring-investments-$(date +%Y%m%d)\",\"JobQueue\":\"$BATCH_JOB_QUEUE_NAME\",\"JobDefinition\":\"$BATCH_JOB_DEFINITION_NAME\"}" \
    --profile $AWS_PROFILE \
    --region $AWS_REGION

echo_success "EventBridge rule created for daily execution"

# Cleanup temporary files
rm -f batch-trust-policy.json batch-custom-policy.json job-definition.json eventbridge-trust-policy.json eventbridge-batch-policy.json

echo ""
echo "🎉 AWS Batch infrastructure setup completed successfully!"
echo ""
echo "📋 Summary:"
echo "   ECR Repository: $ECR_URI"
echo "   Compute Environment: $COMPUTE_ENVIRONMENT_NAME"
echo "   Job Queue: $BATCH_JOB_QUEUE_NAME"
echo "   Job Definition: $BATCH_JOB_DEFINITION_NAME"
echo "   Schedule: Daily at 9:30 AM EST (14:30 UTC) on weekdays"
echo ""
echo "🧪 To test the batch job manually:"
echo "   aws batch submit-job \\"
echo "     --job-name worthy-test-$(date +%Y%m%d-%H%M) \\"
echo "     --job-queue $BATCH_JOB_QUEUE_NAME \\"
echo "     --job-definition $BATCH_JOB_DEFINITION_NAME \\"
echo "     --profile $AWS_PROFILE \\"
echo "     --region $AWS_REGION"
echo ""
echo "📊 To view logs:"
echo "   aws logs describe-log-streams \\"
echo "     --log-group-name '/aws/batch/worthy-recurring-investments' \\"
echo "     --profile $AWS_PROFILE \\"
echo "     --region $AWS_REGION"
