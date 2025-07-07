# Worthy - Personal Financial Strategy Tool

Worthy is a personalized financial strategy tool that helps users track investment assets and calculate FIRE (Financial Independence, Retire Early) progress across multiple currencies.

## 🎯 Project Overview

Worthy enables users to:
- Track investment portfolios across multiple currencies
- Record and manage investment transactions
- Calculate progress toward different FIRE goals (Traditional, Barista, Coast)
- Automate recurring investment tracking
- Visualize financial progress and projections

## 🏗️ Architecture

### Backend
- **Framework**: Python with AWS Lambda
- **Database**: PostgreSQL on AWS RDS
- **Authentication**: JWT tokens with hashlib password hashing
- **API**: RESTful API with AWS API Gateway
- **Deployment**: Serverless architecture on AWS

### Frontend
- **Framework**: React.js with TypeScript
- **State Management**: Zustand
- **UI Library**: Material-UI v7
- **Deployment**: AWS S3 + CloudFront CDN

## 🚀 Current Status

### ✅ Milestone 1: Foundation & Authentication (COMPLETE)
- **User Authentication**: Registration, login, logout with JWT tokens
- **Database Integration**: PostgreSQL with user management
- **Frontend**: React + Material-UI with responsive design
- **Deployment**: Full-stack deployed on AWS
- **Security**: Password hashing, input validation, CORS protection

### 🔄 Milestone 2: Core Data Models & Asset Management (75% COMPLETE)
- **Database Schema**: ✅ Assets, Transactions, RecurringInvestments, FIREProfile tables
- **Backend API**: ✅ Asset management endpoints implemented
- **Authentication**: ✅ JWT-protected asset endpoints
- **Frontend Components**: ✅ Asset initialization, transaction recording, portfolio view
- **Asset Management**: ✅ Create assets, record transactions, view portfolio
- **Remaining**: Transaction history view, user profile settings

## 🌐 Live Application

- **Primary URL**: https://ds8jn7fwox3fb.cloudfront.net
- **Backup URL**: http://worthy-frontend-1751874299.s3-website-ap-northeast-1.amazonaws.com
- **API Endpoint**: https://mreda8g340.execute-api.ap-northeast-1.amazonaws.com/development

**Latest Deployment**: July 7, 2025 - Frontend updated with Milestone 2 asset management features

## 🔐 Features

### Authentication System
- User registration with name, email, password, base currency, birth year
- Secure login with JWT token persistence
- Protected routes and dashboard
- User profile management
- Logout functionality

### Asset Management (Milestone 2 - 75% Complete)
- ✅ Asset initialization for existing portfolios
- ✅ Transaction recording (lump-sum purchases)
- ✅ Portfolio overview and asset list
- ✅ Multi-currency support
- ✅ Asset creation and management forms
- 🔄 Transaction history display (next)
- 🔄 User profile settings (next)

### FIRE Calculator (Planned - Milestone 5)
- Traditional FIRE calculation
- Barista FIRE calculation
- Coast FIRE calculation
- Progress tracking and visualization

## 🛠️ Development

### Prerequisites
- Node.js 18+
- Python 3.11+
- AWS CLI configured
- PostgreSQL access

### Backend Setup
```bash
cd backend
pip install -r requirements.txt
# Configure environment variables
python -m pytest  # Run tests
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev  # Development server
npm run build  # Production build
npm run build-with-types  # Build with TypeScript checking
```

### Database Schema
```sql
-- Users table with authentication
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    base_currency VARCHAR(3) DEFAULT 'USD',
    birth_year INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Assets table for portfolio tracking
CREATE TABLE assets (
    asset_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id),
    ticker_symbol VARCHAR(20) NOT NULL,
    asset_type VARCHAR(50) DEFAULT 'Stock',
    total_shares DECIMAL(15,6) NOT NULL,
    average_cost_basis DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transactions table for investment history
CREATE TABLE transactions (
    transaction_id SERIAL PRIMARY KEY,
    asset_id INTEGER REFERENCES assets(asset_id),
    transaction_type VARCHAR(20) NOT NULL,
    transaction_date DATE NOT NULL,
    shares DECIMAL(15,6) NOT NULL,
    price_per_share DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
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

## 🎯 Roadmap

### Milestone 3: External API Integration (Next)
- Stock price API integration (Alpha Vantage/Yahoo Finance)
- Currency exchange rate API
- Real-time portfolio valuation
- Automated price updates

### Milestone 4: Recurring Investments (Planned)
- Recurring investment plan setup
- Automated batch processing
- Market holiday handling
- Investment calendar

### Milestone 5: FIRE Calculator (Planned)
- FIRE goal setting and tracking
- Progress visualization
- Financial projections
- Scenario modeling

## 🔧 Technology Stack

- **Backend**: Python, AWS Lambda, PostgreSQL, JWT
- **Frontend**: React 19, TypeScript, Material-UI v7, Zustand
- **Infrastructure**: AWS (Lambda, RDS, S3, CloudFront, API Gateway)
- **Development**: Git, npm, pip, AWS CLI

## 📝 Recent Updates

### July 7, 2025
- ✅ **Frontend Deployment**: Updated with Milestone 2 asset management features
- ✅ **Asset Management UI**: Complete asset initialization and transaction forms
- ✅ **Portfolio View**: Asset list with portfolio overview
- ✅ **Material-UI v7**: Updated to latest version with modern components
- ✅ **CloudFront CDN**: Cache invalidated for immediate updates

## 📝 License

This project is licensed under the MIT License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📞 Support

For questions or issues, please open a GitHub issue or contact the development team.

---

**Worthy** - Your path to financial independence, tracked and visualized. 🎯💰
