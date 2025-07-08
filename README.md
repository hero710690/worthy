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

### 🔄 **Milestone 2: Core Data Models & Asset Management** - **85% COMPLETE**
- ✅ Asset initialization and portfolio tracking
- ✅ Transaction recording for lump-sum purchases
- ✅ Professional UI with portfolio overview
- ✅ Database integration with proper relationships
- ✅ Complete CRUD operations for assets and transactions (backend)
- ❌ Frontend CRUD interfaces for editing/deleting assets and transactions
- ❌ Complete transaction history management interface

### ✅ **Milestone 3: External API Integration & Real-time Data** - **COMPLETE**
- ✅ Real-time stock/ETF prices using multiple APIs (Finnhub, Alpha Vantage)
- ✅ Live currency conversion using ExchangeRate-API
- ✅ Comprehensive portfolio valuation with market data
- ✅ Unrealized P&L tracking with real-time calculations
- ✅ TTL-based caching system (5min stock prices, 1hr exchange rates)
- ✅ API status monitoring and fallback mechanisms
- ✅ Performance optimization with 25x faster cached responses

### 🎉 **Milestone 4: Recurring Investments & Automation** - **70% COMPLETE** ⭐ **NEW!**
- ✅ **Recurring Investment Management**: Complete CRUD operations for investment plans
- ✅ **FIRE Calculator**: Traditional, Barista, and Coast FIRE calculations
- ✅ **Professional UI**: Recurring investments dashboard with plan management
- ✅ **FIRE Progress Tracking**: Visual progress indicators and goal tracking
- ✅ **Backend APIs**: All recurring investment and FIRE profile endpoints
- ✅ **Database Integration**: Recurring investments and FIRE profile tables
- ❌ **Automated Batch Processing**: Daily scheduler for recurring investments
- ❌ **Dividend Tracking**: Automated dividend detection and processing
- ❌ **Market Holiday Handling**: Skip/postpone logic for non-trading days

## 🎯 **Current Status: Milestone 4 - 70% Complete** ⭐ **NEW FEATURES!**

### **✅ Working Features:**
- **User Management**: Registration, login, profile management
- **Asset Portfolio**: Initialize assets, record transactions, view portfolio
- **Real-time Data**: Live stock prices, currency conversion, market valuation
- **Performance**: Intelligent caching reduces API calls by 95%
- **Dashboard**: Professional FinSet-style interface with real-time metrics
- **Portfolio Analysis**: Unrealized P&L, asset allocation, performance tracking
- **🆕 Recurring Investments**: Create, manage, and track recurring investment plans
- **🆕 FIRE Calculator**: Traditional, Barista, and Coast FIRE progress tracking
- **🆕 Goal Setting**: Interactive FIRE profile configuration and progress visualization

### **🔧 Recent Enhancements:**
- **Recurring Investment Management**: Full CRUD operations for automated investment plans
- **FIRE Progress Dashboard**: Visual tracking of Traditional, Barista, and Coast FIRE goals
- **Interactive Calculators**: Set financial independence parameters and track progress
- **Professional UI**: New navigation with recurring investments and goals sections
- **Backend APIs**: Complete implementation of recurring investments and FIRE profile endpoints

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

### **Complete Milestone 4: Recurring Investments & Automation**
- ✅ Recurring investment plan management (COMPLETE)
- ✅ FIRE calculator and progress tracking (COMPLETE)
- ❌ Automated batch processing for recurring investments
- ❌ Market holiday handling and scheduling
- ❌ Dividend tracking and automation

### **Milestone 5: Advanced Features & Optimization**
- Enhanced portfolio analytics and insights
- Performance optimization and monitoring
- Advanced FIRE projections and scenarios
- Mobile responsiveness improvements

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
**Current Version**: Milestone 4 - 70% Complete (Recurring Investments + FIRE Calculator)
**Status**: Production Ready ✅
