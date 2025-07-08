# Worthy Frontend Deployment Guide

## Overview
This guide provides step-by-step instructions for deploying the Worthy frontend application to AWS S3 with CloudFront CDN distribution.

## Prerequisites

### 1. AWS CLI Configuration
Ensure AWS CLI is configured with the `worthy-app-user` profile:
```bash
aws configure list --profile worthy-app-user
```

### 2. Required AWS Resources
- **S3 Bucket**: `worthy-frontend-1751874299`
- **CloudFront Distribution**: `E2Y4JRNUULLCOK`
- **Domain**: `ds8jn7fwox3fb.cloudfront.net`

### 3. Node.js Environment
- Node.js version: 18+ 
- npm or yarn package manager

## Deployment Process

### Step 1: Navigate to Frontend Directory
```bash
cd /Users/jeanlee/worthy/frontend
```

### Step 2: Install Dependencies (if needed)
```bash
npm install
```

### Step 3: Build the Application
```bash
npm run build
```

**Expected Output:**
- Build files generated in `dist/` directory
- Main files: `index.html`, `assets/index-[hash].js`, `assets/index-[hash].css`
- Build size should be ~660KB for JS bundle

### Step 4: Deploy to S3
```bash
aws s3 sync dist/ s3://worthy-frontend-1751874299 --delete --profile worthy-app-user
```

**Flags Explanation:**
- `--delete`: Removes files from S3 that don't exist locally
- `--profile worthy-app-user`: Uses the correct AWS profile

### Step 5: Invalidate CloudFront Cache
```bash
aws cloudfront create-invalidation --distribution-id E2Y4JRNUULLCOK --paths "/*" --profile worthy-app-user
```

**Important:** Wait 2-3 minutes for cache invalidation to complete before testing.

## Quick Deployment Script

Create a deployment script for convenience:

```bash
#!/bin/bash
# File: deploy_frontend.sh

echo "🚀 Starting Worthy Frontend Deployment..."

# Navigate to frontend directory
cd /Users/jeanlee/worthy/frontend

# Build the application
echo "📦 Building application..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

# Deploy to S3
echo "☁️ Deploying to S3..."
aws s3 sync dist/ s3://worthy-frontend-1751874299 --delete --profile worthy-app-user

if [ $? -ne 0 ]; then
    echo "❌ S3 deployment failed!"
    exit 1
fi

# Invalidate CloudFront cache
echo "🔄 Invalidating CloudFront cache..."
aws cloudfront create-invalidation --distribution-id E2Y4JRNUULLCOK --paths "/*" --profile worthy-app-user

if [ $? -ne 0 ]; then
    echo "❌ CloudFront invalidation failed!"
    exit 1
fi

echo "✅ Frontend deployment completed successfully!"
echo "🌐 Primary URL: https://ds8jn7fwox3fb.cloudfront.net"
echo "🌐 Backup URL: http://worthy-frontend-1751874299.s3-website-ap-northeast-1.amazonaws.com"
echo "⏳ Wait 2-3 minutes for CloudFront cache invalidation to complete"
```

## Environment Configuration

### Development vs Production
The frontend automatically detects the environment and uses the appropriate API endpoints:

**API Endpoint:**
- Production: `https://mreda8g340.execute-api.ap-northeast-1.amazonaws.com/development`

### Environment Variables
No environment variables are required for deployment as the API endpoint is hardcoded in the services.

## Troubleshooting

### Common Issues

#### 1. Build Failures
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

#### 2. S3 Sync Issues
```bash
# Check AWS credentials
aws sts get-caller-identity --profile worthy-app-user

# Verify S3 bucket access
aws s3 ls s3://worthy-frontend-1751874299 --profile worthy-app-user
```

#### 3. CloudFront Cache Issues
```bash
# Check invalidation status
aws cloudfront list-invalidations --distribution-id E2Y4JRNUULLCOK --profile worthy-app-user

# Force browser cache clear
# Chrome/Firefox: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
```

#### 4. CORS Issues
If you encounter CORS errors, verify the API Gateway CORS configuration in the backend.

### Verification Steps

After deployment, verify the application:

1. **Check URLs:**
   - Primary: https://ds8jn7fwox3fb.cloudfront.net
   - Backup: http://worthy-frontend-1751874299.s3-website-ap-northeast-1.amazonaws.com

2. **Test Core Functionality:**
   - User registration/login
   - Dashboard loading
   - Portfolio page loading
   - Asset management

3. **Check Browser Console:**
   - No JavaScript errors
   - API calls successful (200 status codes)
   - Authentication working

## File Structure

```
frontend/
├── dist/                     # Build output (generated)
│   ├── index.html
│   ├── assets/
│   │   ├── index-[hash].js
│   │   └── index-[hash].css
│   └── vite.svg
├── src/                      # Source code
├── package.json
├── vite.config.ts
└── DEPLOYMENT_GUIDE.md       # This file
```

## AWS Resources Details

### S3 Bucket Configuration
- **Bucket Name**: `worthy-frontend-1751874299`
- **Region**: `ap-northeast-1`
- **Static Website Hosting**: Enabled
- **Public Access**: Enabled for static hosting

### CloudFront Distribution
- **Distribution ID**: `E2Y4JRNUULLCOK`
- **Domain**: `ds8jn7fwox3fb.cloudfront.net`
- **Origin**: S3 bucket
- **Caching**: Enabled with TTL

## Security Considerations

1. **API Keys**: No sensitive keys in frontend code
2. **Authentication**: JWT tokens stored in localStorage
3. **HTTPS**: All traffic served over HTTPS via CloudFront
4. **CORS**: Properly configured for cross-origin requests

## Performance Optimization

1. **Bundle Size**: ~660KB (consider code splitting if grows larger)
2. **CDN**: CloudFront provides global edge caching
3. **Compression**: Gzip enabled via CloudFront
4. **Caching**: Browser and CDN caching optimized

## Rollback Procedure

If deployment issues occur:

1. **Identify Last Working Version:**
   ```bash
   aws s3api list-object-versions --bucket worthy-frontend-1751874299 --profile worthy-app-user
   ```

2. **Restore Previous Version:**
   ```bash
   # This would require manual restoration from version history
   # Consider implementing versioned deployments for easier rollback
   ```

3. **Emergency Fallback:**
   - Use backup URL: http://worthy-frontend-1751874299.s3-website-ap-northeast-1.amazonaws.com
   - This bypasses CloudFront if there are CDN issues

## Monitoring and Logs

### CloudFront Logs
Monitor CloudFront access logs for:
- Traffic patterns
- Error rates
- Geographic distribution

### Browser Console
Monitor for:
- JavaScript errors
- API call failures
- Performance issues

## Contact Information

**AWS Resources:**
- Region: ap-northeast-1 (Asia Pacific - Tokyo)
- Profile: worthy-app-user

**URLs:**
- Primary: https://ds8jn7fwox3fb.cloudfront.net
- Backup: http://worthy-frontend-1751874299.s3-website-ap-northeast-1.amazonaws.com
- API: https://mreda8g340.execute-api.ap-northeast-1.amazonaws.com/development

---

## Quick Reference Commands

```bash
# Full deployment
cd /Users/jeanlee/worthy/frontend
npm run build
aws s3 sync dist/ s3://worthy-frontend-1751874299 --delete --profile worthy-app-user
aws cloudfront create-invalidation --distribution-id E2Y4JRNUULLCOK --paths "/*" --profile worthy-app-user

# Check deployment status
aws cloudfront get-invalidation --distribution-id E2Y4JRNUULLCOK --id [INVALIDATION-ID] --profile worthy-app-user

# Emergency cache clear
aws cloudfront create-invalidation --distribution-id E2Y4JRNUULLCOK --paths "/*" --profile worthy-app-user
```

**Remember:** Always wait 2-3 minutes after CloudFront invalidation before testing!
