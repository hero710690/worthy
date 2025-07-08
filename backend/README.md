# Worthy Backend - Lambda Deployment

This directory contains the backend implementation for the Worthy financial tracking application, deployed as an AWS Lambda function.

## 🏗️ Architecture

- **Single-file Lambda function**: `worthy_lambda_function.py`
- **Dependencies**: Managed via Lambda Layers
- **Database**: PostgreSQL on AWS RDS
- **API Gateway**: RESTful API endpoints
- **Authentication**: JWT tokens with hashlib password hashing

## 📁 Directory Structure

```
backend/
├── worthy_lambda_function.py    # Main Lambda function (single file)
├── requirements.txt             # Python dependencies
├── deploy_lambda.sh            # Deployment script
├── lambda_deployment_full/     # Working deployment with dependencies
├── .env                        # Environment variables (local)
├── .env.example               # Environment template
├── test_local.py              # Local testing script
└── README.md                  # This file
```

## 🚀 Quick Deployment

```bash
# Make sure you're in the backend directory
cd backend

# Run the deployment script
./deploy_lambda.sh
```

The deployment script will:
1. ✅ Check prerequisites (AWS CLI, Docker, credentials)
2. 📦 Create Lambda Layer with dependencies
3. 🗜️ Package the function code
4. 🚀 Deploy layer and function to AWS
5. 🔗 Attach layer to function
6. 🧪 Test the deployment
7. 🧹 Clean up build artifacts

## 📋 Prerequisites

### Required Tools
- **AWS CLI**: Configured with `worthy-app-user` profile
- **Docker**: For Lambda-compatible dependency builds (recommended)
- **Python 3.11**: For local development

### AWS Configuration
```bash
# Verify AWS profile exists
aws configure list-profiles | grep worthy-app-user

# Test AWS credentials
aws sts get-caller-identity --profile worthy-app-user
```

## 🔧 Manual Deployment (Advanced)

If you need to deploy manually or troubleshoot:

### 1. Create Dependencies Layer
```bash
# Using Docker (recommended for macOS)
mkdir python
docker run --rm -v "$PWD":/var/task -w /var/task public.ecr.aws/lambda/python:3.11 \
    pip install -r requirements.txt -t python/
zip -r worthy-dependencies-layer.zip python/

# Deploy layer
aws lambda publish-layer-version \
    --layer-name worthy-dependencies \
    --zip-file fileb://worthy-dependencies-layer.zip \
    --compatible-runtimes python3.11 \
    --profile worthy-app-user \
    --region ap-northeast-1
```

### 2. Package Function Code
```bash
mkdir lambda_deployment
cp worthy_lambda_function.py lambda_deployment/
cd lambda_deployment && zip -r ../worthy-backend-full.zip .
cd ..
```

### 3. Update Function
```bash
# Update function code
aws lambda update-function-code \
    --function-name worthy-api-development \
    --zip-file fileb://worthy-backend-full.zip \
    --profile worthy-app-user \
    --region ap-northeast-1

# Attach layer (replace VERSION with actual version number)
aws lambda update-function-configuration \
    --function-name worthy-api-development \
    --layers arn:aws:lambda:ap-northeast-1:ACCOUNT_ID:layer:worthy-dependencies:VERSION \
    --handler worthy_lambda_function.lambda_handler \
    --profile worthy-app-user \
    --region ap-northeast-1
```

## 🧪 Testing

### Local Testing
```bash
# Test the function locally
python test_local.py
```

### API Testing
```bash
# Health check
curl https://mreda8g340.execute-api.ap-northeast-1.amazonaws.com/development/health

# Stock prices
curl "https://mreda8g340.execute-api.ap-northeast-1.amazonaws.com/development/api/stock-prices-multi?symbols=AAPL,TSLA"

# User registration
curl -X POST https://mreda8g340.execute-api.ap-northeast-1.amazonaws.com/development/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"password123","base_currency":"USD","birth_year":1990}'
```

## 🔐 Environment Variables

The Lambda function uses these environment variables (pre-configured):

```bash
FINNHUB_API_KEY=d1lubu9r01qg4dblektgd1lubu9r01qg4dbleku0
ALPHA_VANTAGE_API_KEY=I4FAQ1D6K5UODI1E
DATABASE_URL=postgresql://worthy_admin:WorthyApp2025!@worthy-db-dev.ch0ccg6ycp7t.ap-northeast-1.rds.amazonaws.com:5432/worthy
JWT_SECRET=worthy-jwt-secret-2025-production
EXCHANGE_RATE_API_KEY=4de678c416959e681a760650
```

## 📊 API Endpoints

### Authentication
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `GET /auth/verify` - Token verification
- `POST /auth/logout` - User logout

### Asset Management
- `POST /assets` - Create/initialize asset
- `GET /assets` - Get user's assets
- `GET /assets/:id` - Get specific asset details
- `POST /transactions` - Record transaction
- `GET /assets/:id/transactions` - Get transaction history

### External APIs
- `GET /api/stock-prices-multi?symbols=AAPL,TSLA` - Multi-API stock prices
- `GET /api/exchange-rates?base=USD` - Currency exchange rates
- `GET /health` - Health check

## 🐛 Troubleshooting

### Common Issues

1. **Import Errors**
   ```bash
   # Check if layer is attached
   aws lambda get-function-configuration \
     --function-name worthy-api-development \
     --profile worthy-app-user
   ```

2. **API Rate Limits**
   - Check API key quotas in external services
   - Monitor CloudWatch logs for rate limit errors

3. **Database Connection Issues**
   - Verify RDS security groups allow Lambda access
   - Check DATABASE_URL environment variable

4. **CORS Issues**
   - Verify API Gateway CORS configuration
   - Check preflight OPTIONS requests

### Debug Commands
```bash
# View function logs
aws logs describe-log-streams \
  --log-group-name "/aws/lambda/worthy-api-development" \
  --profile worthy-app-user

# Test function directly
aws lambda invoke \
  --function-name worthy-api-development \
  --payload '{"httpMethod":"GET","path":"/health"}' \
  --profile worthy-app-user \
  response.json
```

## 📈 Performance

- **Cold Start**: ~2-3 seconds (with dependencies layer)
- **Warm Execution**: ~100-500ms
- **Memory**: 512MB allocated
- **Timeout**: 30 seconds

## 🔄 Deployment History

- **July 8, 2025**: Standardized single-file deployment approach
- **July 7, 2025**: Added multi-API fallback system
- **July 6, 2025**: Initial Lambda deployment with asset management

## 📝 Development Notes

- Use `worthy_lambda_function.py` as the single source of truth
- All dependencies are managed via Lambda Layers
- Database schema changes require manual migration
- API changes should maintain backward compatibility

---

**Ready to deploy?** Run `./deploy_lambda.sh` and you're good to go! 🚀
