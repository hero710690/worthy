# Worthy Backend - AWS Lambda API

Python-based serverless backend for the Worthy financial tracking application, designed to run on AWS Lambda.

## Architecture

- **Runtime**: Python 3.11
- **Framework**: Native AWS Lambda handlers (no web framework overhead)
- **Database**: PostgreSQL (AWS RDS)
- **Authentication**: JWT tokens with bcrypt password hashing
- **Deployment**: AWS SAM (Serverless Application Model)

## Project Structure

```
backend/
├── src/
│   ├── lambda_handler.py      # Main Lambda entry point
│   ├── config.py              # Configuration management
│   ├── database.py            # Database connection utilities
│   ├── auth/
│   │   └── handler.py         # Authentication logic
│   ├── users/
│   │   └── handler.py         # User management logic
│   └── utils/
│       ├── response.py        # Response utilities
│       └── cors.py            # CORS handling
├── template.yaml              # AWS SAM template
├── requirements.txt           # Python dependencies
├── deploy.sh                  # Deployment script
└── test_local.py             # Local testing script
```

## Quick Start

### 1. Set up environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your configuration
nano .env
```

### 2. Set up database

```bash
# Option A: Local PostgreSQL with Docker
docker run --name worthy-postgres \
  -e POSTGRES_DB=worthy \
  -e POSTGRES_USER=worthy_admin \
  -e POSTGRES_PASSWORD=REDACTED_DB_PASSWORD \
  -p 5432:5432 -d postgres:15

# Option B: Use AWS RDS (see setup-database.sh)
./setup-database.sh
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Test locally

```bash
# Run local tests
python test_local.py
```

### 5. Deploy to AWS

```bash
# Make sure AWS credentials are configured
export AWS_ACCESS_KEY_ID=your-access-key
export AWS_SECRET_ACCESS_KEY=your-secret-key
export DATABASE_URL=your-database-url
export JWT_SECRET=your-jwt-secret

# Deploy
./deploy.sh development
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh` - Refresh JWT token

### Users (Protected)
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile

### Health Check
- `GET /health` - Health check endpoint
- `GET /` - Root endpoint

## Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRATION_HOURS=24

# External APIs (for future milestones)
ALPHA_VANTAGE_API_KEY=your-api-key
EXCHANGE_RATE_API_KEY=your-api-key

# Environment
ENVIRONMENT=development
DEBUG=true
```

## AWS Resources Created

- **Lambda Function**: `worthy-api-{environment}`
- **API Gateway**: REST API with CORS enabled
- **IAM Role**: Lambda execution role with necessary permissions
- **CloudWatch Logs**: Automatic logging for debugging

## Database Schema

### Users Table
```sql
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    base_currency VARCHAR(3) DEFAULT 'USD',
    birth_year INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Security Features

- **Password Hashing**: bcrypt with salt
- **JWT Authentication**: Secure token-based auth
- **Input Validation**: Email validation and password strength
- **SQL Injection Prevention**: Parameterized queries
- **CORS**: Configurable cross-origin resource sharing

## Testing

### Local Testing
```bash
# Test individual functions
python test_local.py

# Test with curl (after deployment)
curl https://your-api-url/health
```

### Example API Calls

```bash
# Register user
curl -X POST https://your-api-url/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","base_currency":"USD"}'

# Login
curl -X POST https://your-api-url/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Get profile (with token)
curl -X GET https://your-api-url/api/users/profile \
  -H "Authorization: Bearer your-jwt-token"
```

## Deployment

### Prerequisites
- AWS CLI configured
- AWS SAM CLI installed
- Python 3.11+
- PostgreSQL database

### Deploy Commands
```bash
# Development
./deploy.sh development

# Production
./deploy.sh production
```

## Monitoring

- **CloudWatch Logs**: Automatic logging
- **CloudWatch Metrics**: Lambda metrics
- **API Gateway Metrics**: Request/response metrics
- **Custom Metrics**: Can be added for business logic

## Cost Optimization

- **Lambda**: Pay per request (very cost-effective for low traffic)
- **RDS**: Use db.t3.micro for development
- **API Gateway**: Pay per API call
- **CloudWatch**: Minimal logging costs

## Next Steps (Milestone 2)

- Add Asset management endpoints
- Add Transaction recording endpoints
- Implement external API integrations
- Add automated batch processing
- Enhanced error handling and validation

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check DATABASE_URL format
   - Verify database is running and accessible
   - Check security groups for RDS

2. **JWT Token Issues**
   - Verify JWT_SECRET is set
   - Check token expiration
   - Validate Authorization header format

3. **Deployment Failures**
   - Check AWS credentials
   - Verify IAM permissions
   - Check CloudFormation stack events

### Logs
```bash
# View Lambda logs
aws logs tail /aws/lambda/worthy-api-development --follow

# View API Gateway logs
aws logs tail API-Gateway-Execution-Logs_your-api-id/development --follow
```
