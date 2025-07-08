# Worthy App - Quick Deployment Reference

## Frontend Deployment

### Automated Script (Recommended)
```bash
cd /Users/jeanlee/worthy/frontend
./deploy_frontend.sh
```

### Manual Steps
```bash
cd /Users/jeanlee/worthy/frontend
npm run build
aws s3 sync dist/ s3://worthy-frontend-1751874299 --delete --profile worthy-app-user
aws cloudfront create-invalidation --distribution-id E2Y4JRNUULLCOK --paths "/*" --profile worthy-app-user
```

**Wait 2-3 minutes for CloudFront cache invalidation!**

### URLs
- **Primary**: https://ds8jn7fwox3fb.cloudfront.net
- **Backup**: http://worthy-frontend-1751874299.s3-website-ap-northeast-1.amazonaws.com

---

## Backend Deployment

### Automated Script (Recommended)
```bash
cd /Users/jeanlee/worthy/backend
./deploy_lambda.sh
```

### Manual Steps
```bash
cd /Users/jeanlee/worthy/backend
# Update function code in deployment package
cp worthy_lambda_function.py lambda_deployment_full/
cd lambda_deployment_full && zip -r ../worthy-backend-full.zip . && cd ..
aws lambda update-function-code --function-name worthy-api-development --zip-file fileb://worthy-backend-full.zip --profile worthy-app-user --region ap-northeast-1
```

### API Endpoint
- **Production**: https://mreda8g340.execute-api.ap-northeast-1.amazonaws.com/development

---

## Testing After Deployment

### Frontend Testing
1. Wait 2-3 minutes for CloudFront cache invalidation
2. Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)
3. Test core functionality:
   - User registration/login
   - Dashboard loading with real-time data
   - Portfolio page loading
   - Asset management (add/edit assets)
4. Check browser console for errors

### Backend Testing
```bash
# Health check
curl https://mreda8g340.execute-api.ap-northeast-1.amazonaws.com/development/health

# Cache status
curl https://mreda8g340.execute-api.ap-northeast-1.amazonaws.com/development/cache/status

# Test stock prices (with caching)
curl "https://mreda8g340.execute-api.ap-northeast-1.amazonaws.com/development/test/stock-prices?symbols=AAPL,TSLA"
```

---

## AWS Resources

### Frontend
- **S3 Bucket**: worthy-frontend-1751874299
- **CloudFront**: E2Y4JRNUULLCOK
- **Region**: ap-northeast-1

### Backend
- **Lambda Function**: worthy-api-development
- **API Gateway**: mreda8g340
- **Database**: worthy-db-dev (PostgreSQL)
- **Region**: ap-northeast-1

### AWS Profile
- **Profile Name**: worthy-app-user
- **Region**: ap-northeast-1 (Asia Pacific - Tokyo)

---

## Emergency Procedures

### Frontend Issues
1. Use backup URL: http://worthy-frontend-1751874299.s3-website-ap-northeast-1.amazonaws.com
2. Clear CloudFront cache: `aws cloudfront create-invalidation --distribution-id E2Y4JRNUULLCOK --paths "/*" --profile worthy-app-user`

### Backend Issues
1. Check Lambda logs: AWS Console → CloudWatch → Log Groups → /aws/lambda/worthy-api-development
2. Test individual endpoints with curl
3. Check database connectivity

### Cache Issues
```bash
# Clear backend cache
curl -X POST https://mreda8g340.execute-api.ap-northeast-1.amazonaws.com/development/cache/clear

# Check cache status
curl https://mreda8g340.execute-api.ap-northeast-1.amazonaws.com/development/cache/status
```

---

## File Locations

### Deployment Scripts
- **Frontend**: `/Users/jeanlee/worthy/frontend/deploy_frontend.sh`
- **Backend**: `/Users/jeanlee/worthy/backend/deploy_lambda.sh`

### Documentation
- **Frontend Guide**: `/Users/jeanlee/worthy/frontend/DEPLOYMENT_GUIDE.md`
- **Backend Guide**: `/Users/jeanlee/worthy/backend/README.md`
- **Implementation Plan**: `/Users/jeanlee/worthy/IMPLEMENTATION_PLAN.md`

---

## Quick Commands Cheat Sheet

```bash
# Frontend deployment
cd /Users/jeanlee/worthy/frontend && ./deploy_frontend.sh

# Backend deployment  
cd /Users/jeanlee/worthy/backend && ./deploy_lambda.sh

# Test everything
curl https://mreda8g340.execute-api.ap-northeast-1.amazonaws.com/development/health
open https://ds8jn7fwox3fb.cloudfront.net

# Check cache performance
curl "https://mreda8g340.execute-api.ap-northeast-1.amazonaws.com/development/test/stock-prices?symbols=AAPL,TSLA" | jq '.cache_stats'
```

**Remember**: Always wait 2-3 minutes after CloudFront invalidation before testing frontend changes!
