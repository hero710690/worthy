# Worthy App - Quick Reference Card

**Last Updated**: July 8, 2025

---

## 🚀 Quick Deployment

```bash
cd backend
./deploy_lambda.sh
```

**That's it!** The script handles everything automatically.

---

## 🔗 Live URLs

- **Frontend**: https://ds8jn7fwox3fb.cloudfront.net
- **API**: https://mreda8g340.execute-api.ap-northeast-1.amazonaws.com/development
- **Health Check**: https://mreda8g340.execute-api.ap-northeast-1.amazonaws.com/development/health

---

## 🧪 Quick API Tests

```bash
# Health Check
curl https://mreda8g340.execute-api.ap-northeast-1.amazonaws.com/development/health

# Register User
curl -X POST https://mreda8g340.execute-api.ap-northeast-1.amazonaws.com/development/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"password123","base_currency":"USD","birth_year":1990}'

# Login User
curl -X POST https://mreda8g340.execute-api.ap-northeast-1.amazonaws.com/development/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Stock Prices (replace TOKEN)
curl "https://mreda8g340.execute-api.ap-northeast-1.amazonaws.com/development/api/stock-prices-multi?symbols=AAPL,TSLA" \
  -H "Authorization: Bearer TOKEN"
```

---

## 🐛 Quick Troubleshooting

**Missing Dependency Error**:
```bash
pip3 install <package-name> -t lambda_deployment_full/
./deploy_lambda.sh
```

**Check Lambda Logs**:
```bash
aws logs describe-log-streams --log-group-name "/aws/lambda/worthy-api-development" --order-by LastEventTime --descending --limit 1 --profile worthy-app-user --region ap-northeast-1
```

**Function Status**:
```bash
aws lambda get-function-configuration --function-name worthy-api-development --profile worthy-app-user --region ap-northeast-1
```

---

## 📁 File Structure (Keep Only These)

```
backend/
├── worthy_lambda_function.py    # Main function
├── deploy_lambda.sh            # Deployment script
├── requirements.txt             # Dependencies
├── lambda_deployment_full/     # Deployment package
├── .env & .env.example         # Config
├── test_local.py              # Local testing
└── README.md                  # Documentation
```

---

## ⚠️ Important Rules

1. **ONLY use `deploy_lambda.sh`** - No other deployment methods
2. **Single file approach** - All code in `worthy_lambda_function.py`
3. **Dependencies go in `lambda_deployment_full/`** - Not in root
4. **Test after every deployment** - Use health check
5. **Keep it clean** - Remove unused files immediately
6. since we're have asset in different currency make sure to consider exchange rate before summing them up.
---

## 📊 Current Status

- ✅ **Milestone 1**: Authentication (100% Complete)
- ✅ **Milestone 2**: Asset Management (75% Complete)
- ✅ **Milestone 3**: External APIs (100% Complete)
- 🔄 **Next**: Milestone 4 - Recurring Investments

---

## 🔧 Environment

- **AWS Profile**: worthy-app-user
- **Region**: ap-northeast-1
- **Lambda Function**: worthy-api-development
- **Database**: worthy-db-dev
- **Python**: 3.11

---

*For detailed information, see [DEPLOYMENT_GUIDELINES.md](DEPLOYMENT_GUIDELINES.md)*
