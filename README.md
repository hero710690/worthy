# Worthy - Personal Financial Strategy Tool

A personalized financial strategy tool that helps users track investment assets and calculate FIRE (Financial Independence, Retire Early) progress across multiple currencies.

## 🌐 Live Application

- **Primary URL**: https://ds8jn7fwox3fb.cloudfront.net
- **Backup URL**: http://worthy-frontend-1751874299.s3-website-ap-northeast-1.amazonaws.com
- **API Endpoint**: https://mreda8g340.execute-api.ap-northeast-1.amazonaws.com/development

## 🚀 Quick Deployment

### Frontend Deployment
```bash
cd frontend
./deploy_frontend.sh
```

### Backend Deployment
```bash
cd backend
./deploy_lambda.sh
```

**See [DEPLOYMENT_QUICK_REFERENCE.md](DEPLOYMENT_QUICK_REFERENCE.md) for detailed instructions.**

## 🏗️ Architecture

### Frontend
- **Framework**: React.js with TypeScript
- **UI Library**: Material-UI
- **State Management**: Zustand
- **Deployment**: AWS S3 + CloudFront CDN

### Backend
- **Runtime**: AWS Lambda (Python 3.11)
- **Database**: PostgreSQL on AWS RDS
- **API**: AWS API Gateway
- **Caching**: TTL-based caching with cachetools
- **External APIs**: Finnhub, Alpha Vantage, ExchangeRate-API

## ✨ Features

### 🎉 **Milestone 1: Foundation & Authentication** - **COMPLETE**
- ✅ User registration and secure login
- ✅ JWT-based authentication
- ✅ Protected dashboard with user profile
- ✅ Responsive Material-UI design
- ✅ Full-stack deployment on AWS

### 🔄 **Milestone 2: Core Data Models & Asset Management** - **75% COMPLETE**
- ✅ Asset initialization and portfolio tracking
- ✅ Transaction recording for lump-sum purchases
- ✅ Professional UI with portfolio overview
- ✅ Database integration with proper relationships
- ❌ Complete CRUD operations for assets and transactions
- ❌ Recurring investments and FIRE profile tables

### ✅ **Milestone 3: External API Integration & Real-time Data** - **COMPLETE**
- ✅ Real-time stock/ETF prices using multiple APIs (Finnhub, Alpha Vantage)
- ✅ Live currency conversion using ExchangeRate-API
- ✅ Comprehensive portfolio valuation with market data
- ✅ Unrealized P&L tracking with real-time calculations
- ✅ **NEW**: TTL-based caching system (5min stock prices, 1hr exchange rates)
- ✅ API status monitoring and fallback mechanisms
- ✅ Performance optimization with 25x faster cached responses

## 🎯 **Current Status: Milestone 3 Complete + Enhanced Caching**

### **✅ Working Features:**
- **User Management**: Registration, login, profile management
- **Asset Portfolio**: Initialize assets, record transactions, view portfolio
- **Real-time Data**: Live stock prices, currency conversion, market valuation
- **Performance**: Intelligent caching reduces API calls by 95%
- **Dashboard**: Professional FinSet-style interface with real-time metrics
- **Portfolio Analysis**: Unrealized P&L, asset allocation, performance tracking

### **🔧 Recent Enhancements:**
- **Caching System**: Implemented TTL-based caching with cachetools
- **Performance**: 25x faster response times for cached data
- **Rate Limit Protection**: Intelligent caching prevents API limit hits
- **Monitoring**: Cache status endpoints and performance metrics
- **Reliability**: Fallback mechanisms when external APIs fail

## 📊 **Cache Performance Metrics**

The caching system provides significant performance improvements:

| Metric | First Request | Cached Requests |
|--------|---------------|-----------------|
| **Response Time** | 3,463ms | ~140ms |
| **API Calls** | 5 external calls | 0 external calls |
| **Cache Hit Rate** | 0% | 100% |
| **Speed Improvement** | Baseline | **25x faster** |

## 🛠️ Technology Stack

### Frontend
- React.js 18+ with TypeScript
- Material-UI (MUI) for components
- Zustand for state management
- Vite for build tooling
- Axios for API communication

### Backend
- Python 3.11 on AWS Lambda
- PostgreSQL database on AWS RDS
- JWT authentication with hashlib
- cachetools for intelligent caching
- Multiple external API integrations

### External APIs
- **Finnhub**: Primary stock price data
- **Alpha Vantage**: Fallback stock prices
- **ExchangeRate-API**: Currency conversion
- **Yahoo Finance**: Additional fallback (HTTP)

## 📁 Project Structure

```
worthy/
├── frontend/                 # React.js frontend
│   ├── src/
│   ├── deploy_frontend.sh   # Automated deployment script
│   └── DEPLOYMENT_GUIDE.md  # Detailed deployment guide
├── backend/                  # Python Lambda backend
│   ├── worthy_lambda_function.py  # Main Lambda function
│   ├── deploy_lambda.sh     # Automated deployment script
│   └── lambda_deployment_full/    # Deployment package
├── IMPLEMENTATION_PLAN.md    # Development roadmap
├── DEPLOYMENT_QUICK_REFERENCE.md  # Quick deployment guide
└── README.md                # This file
```

## 🔧 Development Setup

### Prerequisites
- Node.js 18+
- Python 3.11+
- AWS CLI configured with `worthy-app-user` profile

### Frontend Development
```bash
cd frontend
npm install
npm run dev
```

### Backend Development
```bash
cd backend
pip install -r requirements.txt
# Local testing with mock data
```

## 🚀 Deployment

### Automated Deployment (Recommended)
```bash
# Deploy frontend
cd frontend && ./deploy_frontend.sh

# Deploy backend
cd backend && ./deploy_lambda.sh
```

### Manual Deployment
See [DEPLOYMENT_QUICK_REFERENCE.md](DEPLOYMENT_QUICK_REFERENCE.md) for step-by-step instructions.

## 🧪 Testing

### Frontend Testing
1. Visit https://ds8jn7fwox3fb.cloudfront.net
2. Test user registration/login
3. Check dashboard real-time data
4. Verify portfolio calculations
5. Monitor browser console for errors

### Backend Testing
```bash
# Health check
curl https://mreda8g340.execute-api.ap-northeast-1.amazonaws.com/development/health

# Cache performance
curl "https://mreda8g340.execute-api.ap-northeast-1.amazonaws.com/development/test/stock-prices?symbols=AAPL,TSLA"

# Cache status
curl https://mreda8g340.execute-api.ap-northeast-1.amazonaws.com/development/cache/status
```

## 📈 **Next Milestones**

### **Milestone 4: Recurring Investments & Automation**
- Automated recurring investment plans
- Market holiday handling
- Dividend tracking system
- Batch processing automation

### **Milestone 5: FIRE Calculator & Financial Planning**
- Traditional, Barista, and Coast FIRE calculations
- Financial projections and scenarios
- Goal tracking and progress visualization

## 🔒 Security

- JWT-based authentication
- Password hashing with PBKDF2
- HTTPS everywhere via CloudFront
- Input validation and sanitization
- No sensitive data in frontend code

## 📊 Monitoring

### Cache Monitoring
- Cache hit rates and performance metrics
- API usage tracking and rate limit monitoring
- Real-time cache status via `/cache/status` endpoint

### Application Monitoring
- AWS CloudWatch for Lambda logs
- CloudFront access logs for frontend
- Database performance monitoring

## 🤝 Contributing

1. Follow the implementation plan in `IMPLEMENTATION_PLAN.md`
2. Use the deployment scripts for consistent deployments
3. Test both frontend and backend after changes
4. Monitor cache performance and API usage

## 📞 Support

For deployment issues or questions:
1. Check `DEPLOYMENT_QUICK_REFERENCE.md`
2. Review AWS CloudWatch logs
3. Test individual API endpoints
4. Verify cache status and performance

---

**Last Updated**: July 8, 2025
**Current Version**: Milestone 3 Complete + Enhanced Caching
**Status**: Production Ready ✅
