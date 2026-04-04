#!/bin/bash

# Worthy App - Deploy Recurring Investments Cloud Scheduler Job on GCP
# Replaces the AWS EventBridge + Lambda setup with GCP Cloud Scheduler + Cloud Run
#
# Prerequisites:
#   - gcloud CLI authenticated with appropriate permissions
#   - Cloud Run service already deployed
#   - Terraform state initialized in /workshop/worthy-gcp/terraform/

set -e

# Configuration
TERRAFORM_DIR="/workshop/worthy-gcp/terraform"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo_success() {
    echo -e "${GREEN}[OK] $1${NC}"
}

echo_info() {
    echo -e "${BLUE}[INFO] $1${NC}"
}

echo_warning() {
    echo -e "${YELLOW}[WARN] $1${NC}"
}

echo_error() {
    echo -e "${RED}[ERROR] $1${NC}"
}

echo "=========================================="
echo " Worthy - Deploy Recurring Investments"
echo " GCP Cloud Scheduler Job"
echo "=========================================="
echo ""

# Verify gcloud is authenticated
echo_info "Verifying gcloud authentication..."
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>/dev/null | head -1 > /dev/null; then
    echo_error "No active gcloud account found. Run: gcloud auth login"
    exit 1
fi

ACTIVE_ACCOUNT=$(gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>/dev/null | head -1)
echo_success "Authenticated as: $ACTIVE_ACCOUNT"

# Verify Terraform directory exists
if [ ! -d "$TERRAFORM_DIR" ]; then
    echo_error "Terraform directory not found: $TERRAFORM_DIR"
    exit 1
fi

# Change to Terraform directory
cd "$TERRAFORM_DIR"

# Initialize Terraform if needed
if [ ! -d ".terraform" ]; then
    echo_info "Initializing Terraform..."
    terraform init
    echo_success "Terraform initialized"
else
    echo_info "Terraform already initialized"
fi

# Validate configuration
echo_info "Validating Terraform configuration..."
if ! terraform validate; then
    echo_error "Terraform validation failed. Fix errors in scheduler.tf before deploying."
    exit 1
fi
echo_success "Terraform configuration is valid"

# Plan changes (target only scheduler resources)
echo ""
echo_info "Planning scheduler deployment..."
echo ""

terraform plan \
    -target=google_cloud_scheduler_job.recurring_investments \
    -target=google_cloud_run_v2_service_iam_member.scheduler_invoker

echo ""
read -p "Apply these changes? (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo_warning "Deployment cancelled."
    exit 0
fi

# Apply changes
echo_info "Applying scheduler configuration..."
terraform apply \
    -target=google_cloud_scheduler_job.recurring_investments \
    -target=google_cloud_run_v2_service_iam_member.scheduler_invoker \
    -auto-approve

echo_success "Cloud Scheduler job deployed"

# Verify deployment
echo ""
echo_info "Verifying deployment..."

PROJECT_ID=$(terraform output -raw project_id 2>/dev/null || gcloud config get-value project 2>/dev/null)
REGION=$(terraform output -raw region 2>/dev/null || echo "asia-northeast1")

# List scheduler jobs
echo_info "Cloud Scheduler jobs:"
gcloud scheduler jobs list --location="$REGION" --project="$PROJECT_ID" 2>/dev/null || echo_warning "Could not list scheduler jobs"

echo ""
echo "=========================================="
echo " Deployment Complete"
echo "=========================================="
echo ""
echo "Summary:"
echo "  Schedule:  Weekdays at 9:30 AM EST (14:30 UTC)"
echo "  Endpoint:  POST /batch/recurring-investments"
echo "  Auth:      OIDC token via Cloud Run service account"
echo "  Retries:   3 attempts max"
echo ""
echo "Useful commands:"
echo "  # Manually trigger the job"
echo "  gcloud scheduler jobs run worthy-recurring-investments-production --location=$REGION"
echo ""
echo "  # View job details"
echo "  gcloud scheduler jobs describe worthy-recurring-investments-production --location=$REGION"
echo ""
echo "  # Pause the job"
echo "  gcloud scheduler jobs pause worthy-recurring-investments-production --location=$REGION"
echo ""
echo "  # View recent executions in Cloud Logging"
echo "  gcloud logging read 'resource.type=\"cloud_scheduler_job\"' --limit=10 --project=$PROJECT_ID"
echo ""
