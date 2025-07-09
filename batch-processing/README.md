# Worthy App - AWS Batch Recurring Investments Processing

This directory contains the AWS Batch infrastructure and code for automated processing of recurring investment plans in the Worthy financial tracking application.

## 🎯 **Overview**

The batch processing system automatically executes recurring investment plans on a daily schedule:

1. **Checks market status** (weekdays only, excludes holidays)
2. **Fetches due investments** from the database
3. **Gets current stock prices** using multi-API fallback (Finnhub → Alpha Vantage)
4. **Calculates shares to purchase** based on investment amount
5. **Creates/updates assets** and records transactions
6. **Updates next run dates** for recurring plans
7. **Handles errors gracefully** with retry logic and logging

## 📁 **Files Structure**

```
batch-processing/
├── README.md                          # This file
├── recurring_investments_batch.py     # Main batch processing script
├── Dockerfile                         # Docker container definition
├── requirements.txt                   # Python dependencies
├── setup-aws-batch.sh               # AWS infrastructure setup script
└── test-batch-job.sh                # Manual testing script
```

## 🏗️ **Architecture**

```
EventBridge (Daily 9:30 AM EST) → AWS Batch Job Queue → Fargate Container
                                                              ↓
                                                    Python Batch Script
                                                              ↓
                                              RDS Database + External APIs
                                              (Finnhub, Alpha Vantage, ExchangeRate)
```

### **AWS Services Used:**
- **AWS Batch**: Job orchestration and execution
- **Amazon ECS/Fargate**: Serverless container execution
- **Amazon ECR**: Docker image registry
- **EventBridge**: Scheduled job triggers
- **CloudWatch Logs**: Centralized logging
- **IAM**: Security and permissions

## 🚀 **Setup Instructions**

### **Prerequisites:**
- AWS CLI configured with `worthy-app-user` profile
- Docker installed and running
- Appropriate AWS permissions for Batch, ECR, IAM, EventBridge

### **1. One-Time Infrastructure Setup:**
```bash
cd batch-processing
./setup-aws-batch.sh
```

This script will:
- ✅ Create ECR repository for Docker images
- ✅ Build and push Docker image
- ✅ Create IAM roles and policies
- ✅ Set up Batch compute environment and job queue
- ✅ Create job definition with environment variables
- ✅ Configure EventBridge for daily execution
- ✅ Set up CloudWatch logging

### **2. Manual Testing:**
```bash
./test-batch-job.sh
```

This will submit a test job and monitor its execution with real-time logs.

## ⏰ **Scheduling**

The batch job runs automatically:
- **Schedule**: Daily at 9:30 AM EST (14:30 UTC)
- **Days**: Monday through Friday (market days only)
- **Market Holidays**: Automatically skipped using built-in holiday calendar

## 🔧 **Configuration**

### **Environment Variables:**
The batch job uses these environment variables (configured in job definition):

```bash
DATABASE_URL=postgresql://worthy_admin:WorthyApp2025!@worthy-db-dev.ch0ccg6ycp7t.ap-northeast-1.rds.amazonaws.com:5432/worthy
FINNHUB_API_KEY=d1lubu9r01qg4dblektgd1lubu9r01qg4dbleku0
ALPHA_VANTAGE_API_KEY=I4FAQ1D6K5UODI1E
EXCHANGE_RATE_API_KEY=4de678c416959e681a760650
```

### **Resource Allocation:**
- **CPU**: 0.25 vCPU (Fargate)
- **Memory**: 512 MB
- **Timeout**: 1 hour
- **Retry Attempts**: 3

## 📊 **Monitoring & Logging**

### **CloudWatch Logs:**
All batch job output is sent to CloudWatch Logs:
- **Log Group**: `/aws/batch/worthy-recurring-investments`
- **Log Streams**: Automatically created per job execution

### **View Logs:**
```bash
# List recent log streams
aws logs describe-log-streams \
  --log-group-name '/aws/batch/worthy-recurring-investments' \
  --order-by LastEventTime \
  --descending \
  --profile worthy-app-user \
  --region ap-northeast-1

# View specific log stream
aws logs get-log-events \
  --log-group-name '/aws/batch/worthy-recurring-investments' \
  --log-stream-name 'STREAM_NAME' \
  --profile worthy-app-user \
  --region ap-northeast-1
```

### **Job Status Monitoring:**
```bash
# List recent jobs
aws batch list-jobs \
  --job-queue worthy-recurring-investments-queue \
  --profile worthy-app-user \
  --region ap-northeast-1

# Get job details
aws batch describe-jobs \
  --jobs JOB_ID \
  --profile worthy-app-user \
  --region ap-northeast-1
```

## 🔄 **Batch Processing Logic**

### **Market Validation:**
1. Check if current date is a weekday
2. Verify against US market holiday calendar
3. Skip processing if market is closed

### **Investment Processing:**
1. Query database for recurring investments due today
2. For each investment:
   - Get current stock price (Finnhub → Alpha Vantage fallback)
   - Convert currency if needed
   - Calculate shares to purchase
   - Create/update asset record
   - Record transaction
   - Update next run date (skip weekends/holidays)

### **Error Handling:**
- **API Failures**: Automatic fallback between price APIs
- **Database Errors**: Transaction rollback and detailed logging
- **Network Issues**: Retry logic with exponential backoff
- **Invalid Data**: Skip problematic investments, continue processing others

## 🧪 **Testing**

### **Local Testing:**
```bash
# Set environment variables
export DATABASE_URL="postgresql://..."
export FINNHUB_API_KEY="..."
export ALPHA_VANTAGE_API_KEY="..."
export EXCHANGE_RATE_API_KEY="..."

# Run batch script locally
python recurring_investments_batch.py
```

### **AWS Batch Testing:**
```bash
# Submit manual test job
./test-batch-job.sh

# Or submit directly
aws batch submit-job \
  --job-name worthy-test-$(date +%Y%m%d-%H%M) \
  --job-queue worthy-recurring-investments-queue \
  --job-definition worthy-recurring-investments-job \
  --profile worthy-app-user \
  --region ap-northeast-1
```

## 📈 **Performance & Scaling**

### **Current Configuration:**
- **Execution Time**: ~1-5 minutes for typical workloads
- **Concurrency**: Single job execution (prevents conflicts)
- **API Rate Limits**: Built-in delays between API calls
- **Cost**: ~$0.01-0.05 per execution (Fargate pricing)

### **Scaling Considerations:**
- **High Volume**: Increase CPU/memory allocation
- **Multiple Regions**: Deploy separate batch environments
- **API Limits**: Implement more sophisticated rate limiting

## 🔐 **Security**

### **IAM Permissions:**
- **Batch Execution Role**: ECS task execution + RDS connect
- **EventBridge Role**: Batch job submission only
- **Least Privilege**: Minimal required permissions

### **Network Security:**
- **VPC**: Uses default VPC with public subnets (Fargate requirement)
- **Security Groups**: Default security group allows outbound HTTPS
- **Database**: RDS security group allows Lambda/Batch access

### **Secrets Management:**
- **Environment Variables**: Stored in job definition (consider AWS Secrets Manager for production)
- **API Keys**: Rotated regularly
- **Database Credentials**: Dedicated batch processing user

## 🚨 **Troubleshooting**

### **Common Issues:**

#### **Job Fails to Start:**
- Check compute environment status
- Verify IAM roles and permissions
- Ensure ECR image is accessible

#### **Database Connection Errors:**
- Verify RDS security group allows Batch access
- Check DATABASE_URL format and credentials
- Ensure RDS instance is running

#### **API Rate Limit Errors:**
- Check API key quotas and usage
- Verify API keys are valid and active
- Consider implementing exponential backoff

#### **Market Data Issues:**
- Check external API status (Finnhub, Alpha Vantage)
- Verify ticker symbols are valid
- Review fallback API logic

### **Debug Commands:**
```bash
# Check compute environment
aws batch describe-compute-environments \
  --compute-environments worthy-batch-compute-env \
  --profile worthy-app-user

# Check job queue
aws batch describe-job-queues \
  --job-queues worthy-recurring-investments-queue \
  --profile worthy-app-user

# Check job definition
aws batch describe-job-definitions \
  --job-definition-name worthy-recurring-investments-job \
  --profile worthy-app-user
```

## 🔄 **Maintenance**

### **Regular Tasks:**
- **Weekly**: Review job execution logs for errors
- **Monthly**: Check API usage and costs
- **Quarterly**: Update Docker image with latest dependencies
- **As Needed**: Add new market holidays to calendar

### **Updates:**
```bash
# Update Docker image
docker build -t worthy-batch-processing .
docker tag worthy-batch-processing:latest ECR_URI:latest
docker push ECR_URI:latest

# Update job definition (if needed)
aws batch register-job-definition \
  --cli-input-json file://job-definition.json \
  --profile worthy-app-user
```

## 📞 **Support**

### **Monitoring Alerts:**
- Set up CloudWatch alarms for job failures
- Configure SNS notifications for critical errors
- Monitor API usage and rate limits

### **Contact:**
- Check CloudWatch Logs for detailed error messages
- Review AWS Batch console for job status
- Verify external API status pages

---

**Last Updated**: July 8, 2025  
**Version**: 1.0  
**Status**: Production Ready ✅
