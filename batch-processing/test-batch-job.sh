#!/bin/bash

# Worthy App - Manual Test Script for AWS Batch Job
# Use this script to manually test the recurring investments batch processing

set -e

# Configuration
AWS_PROFILE="worthy-app-user"
AWS_REGION="ap-northeast-1"
BATCH_JOB_QUEUE_NAME="worthy-recurring-investments-queue"
BATCH_JOB_DEFINITION_NAME="worthy-recurring-investments-job"

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

echo "🧪 Testing Worthy recurring investments batch job..."

# Generate unique job name
JOB_NAME="worthy-test-$(date +%Y%m%d-%H%M%S)"

echo_info "Job name: $JOB_NAME"

# Submit batch job
echo "🚀 Submitting batch job..."

JOB_ID=$(aws batch submit-job \
    --job-name "$JOB_NAME" \
    --job-queue "$BATCH_JOB_QUEUE_NAME" \
    --job-definition "$BATCH_JOB_DEFINITION_NAME" \
    --profile "$AWS_PROFILE" \
    --region "$AWS_REGION" \
    --query 'jobId' \
    --output text)

if [ $? -eq 0 ]; then
    echo_success "Batch job submitted successfully"
    echo_info "Job ID: $JOB_ID"
else
    echo_error "Failed to submit batch job"
    exit 1
fi

# Monitor job status
echo "📊 Monitoring job status..."

while true; do
    JOB_STATUS=$(aws batch describe-jobs \
        --jobs "$JOB_ID" \
        --profile "$AWS_PROFILE" \
        --region "$AWS_REGION" \
        --query 'jobs[0].status' \
        --output text)
    
    case $JOB_STATUS in
        "SUBMITTED")
            echo_info "Job status: SUBMITTED (waiting for resources)"
            ;;
        "PENDING")
            echo_info "Job status: PENDING (waiting to start)"
            ;;
        "RUNNABLE")
            echo_info "Job status: RUNNABLE (ready to run)"
            ;;
        "STARTING")
            echo_info "Job status: STARTING (container starting)"
            ;;
        "RUNNING")
            echo_info "Job status: RUNNING (executing batch processing)"
            ;;
        "SUCCEEDED")
            echo_success "Job status: SUCCEEDED (completed successfully)"
            break
            ;;
        "FAILED")
            echo_error "Job status: FAILED (execution failed)"
            
            # Get failure reason
            FAILURE_REASON=$(aws batch describe-jobs \
                --jobs "$JOB_ID" \
                --profile "$AWS_PROFILE" \
                --region "$AWS_REGION" \
                --query 'jobs[0].statusReason' \
                --output text)
            
            echo_error "Failure reason: $FAILURE_REASON"
            break
            ;;
        *)
            echo_warning "Unknown job status: $JOB_STATUS"
            ;;
    esac
    
    sleep 10
done

# Get job details
echo ""
echo "📋 Job Details:"
aws batch describe-jobs \
    --jobs "$JOB_ID" \
    --profile "$AWS_PROFILE" \
    --region "$AWS_REGION" \
    --query 'jobs[0].{JobName:jobName,Status:status,CreatedAt:createdAt,StartedAt:startedAt,StoppedAt:stoppedAt,ExitCode:attempts[0].exitCode}' \
    --output table

# Get logs
echo ""
echo "📊 Getting job logs..."

LOG_STREAM_NAME=$(aws batch describe-jobs \
    --jobs "$JOB_ID" \
    --profile "$AWS_PROFILE" \
    --region "$AWS_REGION" \
    --query 'jobs[0].attempts[0].taskProperties.containers[0].logStreamName' \
    --output text 2>/dev/null || echo "")

if [ "$LOG_STREAM_NAME" != "" ] && [ "$LOG_STREAM_NAME" != "None" ]; then
    echo_info "Log stream: $LOG_STREAM_NAME"
    
    echo ""
    echo "📝 Job Logs:"
    echo "----------------------------------------"
    
    aws logs get-log-events \
        --log-group-name "/aws/batch/worthy-recurring-investments" \
        --log-stream-name "$LOG_STREAM_NAME" \
        --profile "$AWS_PROFILE" \
        --region "$AWS_REGION" \
        --query 'events[*].message' \
        --output text
    
    echo "----------------------------------------"
else
    echo_warning "No log stream found. Job may not have started properly."
    
    # Try to get recent log streams
    echo_info "Recent log streams:"
    aws logs describe-log-streams \
        --log-group-name "/aws/batch/worthy-recurring-investments" \
        --order-by LastEventTime \
        --descending \
        --max-items 5 \
        --profile "$AWS_PROFILE" \
        --region "$AWS_REGION" \
        --query 'logStreams[*].{LogStreamName:logStreamName,LastEventTime:lastEventTime}' \
        --output table
fi

echo ""
if [ "$JOB_STATUS" = "SUCCEEDED" ]; then
    echo_success "✅ Batch job test completed successfully!"
else
    echo_error "❌ Batch job test failed. Check logs above for details."
fi

echo ""
echo "🔗 Useful commands:"
echo "   View all jobs: aws batch list-jobs --job-queue $BATCH_JOB_QUEUE_NAME --profile $AWS_PROFILE --region $AWS_REGION"
echo "   View logs: aws logs describe-log-streams --log-group-name '/aws/batch/worthy-recurring-investments' --profile $AWS_PROFILE --region $AWS_REGION"
