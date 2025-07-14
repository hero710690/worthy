# Worthy App - System Inventory

**Document Version**: 1.0  
**Last Updated**: July 14, 2025  
**Status**: Production Ready

---

## 📋 Overview

This document provides a comprehensive inventory of all data structures, database schemas, API endpoints, and system components in the Worthy financial tracking application.

---

## 🗄️ Database Schema

### Core Tables

#### 1. Users Table
```sql
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    base_currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    birth_year INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Purpose**: Store user account information and preferences  
**Key Fields**:
- `user_id`: Primary key, auto-increment
- `email`: Unique identifier for login
- `password_hash`: Hashed password using hashlib
- `base_currency`: User's preferred currency for calculations
- `birth_year`: Used for FIRE age calculations

#### 2. Assets Table
```sql
CREATE TABLE assets (
    asset_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    ticker_symbol VARCHAR(10) NOT NULL,
    asset_type VARCHAR(20) NOT NULL CHECK (asset_type IN ('Stock', 'ETF', 'Bond', 'Cash', 'Other')),
    total_shares DECIMAL(15,4) NOT NULL DEFAULT 0,
    average_cost_basis DECIMAL(10,4) NOT NULL DEFAULT 0,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Purpose**: Store user's investment assets and holdings  
**Key Fields**:
- `asset_id`: Primary key, auto-increment
- `ticker_symbol`: Stock/ETF symbol (e.g., 'AAPL', 'VTI')
- `total_shares`: Current total shares owned
- `average_cost_basis`: Weighted average cost per share
- `currency`: Currency of the asset

#### 3. Transactions Table
```sql
CREATE TABLE transactions (
    transaction_id SERIAL PRIMARY KEY,
    asset_id INTEGER NOT NULL REFERENCES assets(asset_id) ON DELETE CASCADE,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('LumpSum', 'Recurring', 'Initialization', 'Dividend')),
    transaction_date DATE NOT NULL,
    shares DECIMAL(15,4) NOT NULL,
    price_per_share DECIMAL(10,4) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Purpose**: Record all investment transactions  
**Key Fields**:
- `transaction_type`: Type of transaction (LumpSum, Recurring, Initialization, Dividend)
- `shares`: Number of shares in transaction
- `price_per_share`: Price per share at transaction time

#### 4. Recurring Investments Table
```sql
CREATE TABLE recurring_investments (
    recurring_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    ticker_symbol VARCHAR(10) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'quarterly')),
    start_date DATE NOT NULL,
    next_run_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Purpose**: Manage automated recurring investment plans  
**Key Fields**:
- `amount`: Fixed amount to invest per period
- `frequency`: How often to invest
- `next_run_date`: Next scheduled investment date
- `is_active`: Whether the plan is currently active

#### 5. FIRE Profile Table
```sql
CREATE TABLE fire_profile (
    profile_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
    annual_expenses DECIMAL(15,2),
    safe_withdrawal_rate DECIMAL(5,4) DEFAULT 0.04,
    expected_annual_return DECIMAL(5,4) DEFAULT 0.07,
    target_retirement_age INTEGER,
    barista_monthly_contribution DECIMAL(15,2) DEFAULT 0,
    barista_annual_income DECIMAL(15,2) DEFAULT 0,
    barista_income_currency VARCHAR(3) DEFAULT 'USD',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Purpose**: Store user's FIRE (Financial Independence, Retire Early) goals and parameters  
**Key Fields**:
- `annual_expenses`: Projected annual expenses in retirement
- `safe_withdrawal_rate`: SWR for FIRE calculations (default 4%)
- `expected_annual_return`: Expected investment return rate
- `barista_annual_income`: Part-time income for Barista FIRE

#### 6. Dividends Table
```sql
CREATE TABLE dividends (
    dividend_id SERIAL PRIMARY KEY,
    asset_id INTEGER NOT NULL REFERENCES assets(asset_id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    ticker_symbol VARCHAR(10) NOT NULL,
    ex_dividend_date DATE NOT NULL,
    payment_date DATE,
    dividend_per_share DECIMAL(10,4) NOT NULL,
    total_dividend_amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    dividend_type VARCHAR(20) DEFAULT 'regular',
    is_reinvested BOOLEAN DEFAULT FALSE,
    reinvest_asset_id INTEGER REFERENCES assets(asset_id),
    cash_asset_id INTEGER REFERENCES assets(asset_id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Purpose**: Track dividend payments and reinvestment options  
**Key Fields**:
- `dividend_per_share`: Dividend amount per share
- `total_dividend_amount`: Total dividend received
- `is_reinvested`: Whether dividend was reinvested
- `reinvest_asset_id`: Asset where dividend was reinvested

---

## 🔌 API Endpoints

### Authentication Endpoints
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `GET /auth/verify` - Token verification
- `POST /auth/logout` - User logout

### Asset Management Endpoints
- `POST /assets` - Create/initialize asset
- `GET /assets` - Get user's assets
- `GET /assets/:id` - Get specific asset details
- `PUT /assets/:id` - Update asset
- `DELETE /assets/:id` - Delete asset

### Transaction Endpoints
- `POST /transactions` - Record transaction
- `GET /transactions` - Get all user transactions
- `PUT /transactions/:id` - Update transaction
- `DELETE /transactions/:id` - Delete transaction
- `GET /assets/:id/transactions` - Get asset transaction history

### Recurring Investment Endpoints
- `POST /recurring-investments` - Create recurring investment plan
- `GET /recurring-investments` - Get user's recurring plans
- `PUT /recurring-investments/:id` - Update recurring plan
- `DELETE /recurring-investments/:id` - Delete recurring plan
- `POST /recurring-investments/process` - Process scheduled investments

### FIRE Calculator Endpoints
- `POST /fire-profile` - Create/update FIRE profile
- `GET /fire-profile` - Get user's FIRE profile
- `GET /fire-progress` - Calculate FIRE progress
- `GET /fire-calculator` - Advanced FIRE calculations

### Dividend Management Endpoints
- `GET /dividends` - Get user's dividends
- `POST /dividends` - Add manual dividend
- `POST /dividends/auto-detect` - Auto-detect dividends
- `POST /dividends/:id/process` - Process dividend (reinvest/cash)
- `DELETE /dividends/:id` - Delete dividend

### External API Endpoints
- `GET /api/stock-prices-multi?symbols=AAPL,TSLA` - Multi-API stock prices
- `GET /api/exchange-rates?base=USD` - Currency exchange rates
- `GET /cache/status` - Cache performance metrics
- `GET /health` - Health check

### Portfolio Analysis Endpoints
- `GET /portfolio/performance` - Portfolio performance metrics
- `GET /portfolio/valuation` - Current portfolio valuation
- `GET /portfolio/allocation` - Asset allocation breakdown

### Admin/Debug Endpoints
- `GET /admin/list-users` - List all users (debug)
- `GET /admin/user-lookup?email=` - Look up user by email
- `DELETE /admin/delete-user?email=` - Delete user account
- `GET /debug/currency-conversion` - Debug currency conversion

---

## 🏗️ Frontend Components

### Core Components

#### Authentication Components (`/components/auth/`)
- `Login.tsx` - User login form
- `Register.tsx` - User registration form
- `ProtectedRoute.tsx` - Route protection wrapper

#### Layout Components
- `Layout.tsx` - Main application layout with navigation
- `Dashboard.tsx` - Main dashboard overview
- `DashboardTab.tsx` - Dashboard tab content

#### Asset Management Components (`/components/assets/`)
- `AssetForm.tsx` - Asset creation/editing form
- `AssetList.tsx` - List of user assets
- `AssetDetails.tsx` - Detailed asset view

#### Transaction Components (`/components/transactions/`)
- `TransactionForm.tsx` - Transaction creation form
- `TransactionList.tsx` - Transaction history
- `Transactions.tsx` - Main transactions page

#### Portfolio Components
- `Portfolio.tsx` - Portfolio overview and management
- `PortfolioPerformance.tsx` - Performance analytics
- `Analytics.tsx` - Portfolio analytics dashboard

#### FIRE Calculator Components
- `Goals.tsx` - FIRE goals and progress tracking
- `FIREChart.tsx` - FIRE progress visualization
- `CoastFireCalculatorTab.tsx` - Coast FIRE calculator
- `WhatIfSimulatorTab.tsx` - FIRE scenario simulator

#### Investment Management Components
- `RecurringInvestments.tsx` - Recurring investment plans
- `Dividends.tsx` - Dividend management interface

#### Settings Components
- `UserProfile.tsx` - User profile management
- `SettingsTab.tsx` - Application settings

---

## 🔧 Services and APIs

### Frontend Services (`/services/`)

#### Core API Services
- `api.ts` - Base API configuration and utilities
- `assetApi.ts` - Asset management API calls
- `dividendApi.ts` - Dividend management API calls
- `recurringInvestmentApi.ts` - Recurring investment API calls
- `fireApi.ts` - FIRE calculator API calls
- `portfolioPerformanceApi.ts` - Portfolio performance API calls

#### External Data Services
- `stockPriceService.ts` - Stock price fetching
- `enhancedStockPriceService.ts` - Enhanced stock price with caching
- `exchangeRateService.ts` - Currency exchange rates
- `assetValuationService.ts` - Asset valuation calculations

#### Calculation Services
- `coastFireCalculator.ts` - Coast FIRE calculation logic

---

## 📊 Data Types and Interfaces

### TypeScript Type Definitions (`/types/`)

#### Core Types
- `auth.ts` - Authentication-related types
- `assets.ts` - Asset and transaction types
- `fire.ts` - FIRE calculator types
- `dividends.ts` - Dividend management types
- `portfolioPerformance.ts` - Portfolio performance types

#### Key Interfaces

```typescript
// User and Authentication
interface User {
  user_id: number;
  name: string;
  email: string;
  base_currency: string;
  birth_year: number;
  created_at: string;
}

// Asset Management
interface Asset {
  asset_id: number;
  user_id: number;
  ticker_symbol: string;
  asset_type: 'Stock' | 'ETF' | 'Bond' | 'Cash' | 'Other';
  total_shares: number;
  average_cost_basis: number;
  currency: string;
  created_at: string;
  updated_at: string;
}

interface Transaction {
  transaction_id: number;
  asset_id: number;
  transaction_type: 'LumpSum' | 'Recurring' | 'Initialization' | 'Dividend';
  transaction_date: string;
  shares: number;
  price_per_share: number;
  currency: string;
  created_at: string;
}

// FIRE Calculator
interface FIREProfile {
  profile_id: number;
  user_id: number;
  annual_expenses: number;
  safe_withdrawal_rate: number;
  expected_annual_return: number;
  target_retirement_age: number;
  barista_annual_income: number;
  barista_income_currency: string;
}

// Dividend Management
interface Dividend {
  dividend_id: number;
  asset_id: number;
  user_id: number;
  ticker_symbol: string;
  ex_dividend_date: string;
  payment_date: string;
  dividend_per_share: number;
  total_dividend_amount: number;
  currency: string;
  is_reinvested: boolean;
}
```

---

## 🔄 External API Integrations

### Stock Price APIs
- **Finnhub** (Primary): Real-time stock prices and market data
- **Alpha Vantage** (Fallback): Stock prices and financial data
- **Yahoo Finance** (Fallback): Additional stock price source

### Currency Exchange APIs
- **ExchangeRate-API**: Real-time currency conversion rates

### API Configuration
```python
# Environment Variables
FINNHUB_API_KEY = "REDACTED_FINNHUB_KEY"
ALPHA_VANTAGE_API_KEY = "REDACTED_ALPHA_VANTAGE_KEY"
EXCHANGE_RATE_API_KEY = "REDACTED_EXCHANGE_RATE_KEY"
```

---

## 💾 Caching System

### Cache Configuration
- **Stock Prices**: TTL 20 minutes (1200 seconds)
- **Exchange Rates**: TTL 1 hour (3600 seconds)
- **Cache Size**: 1000 entries for stock prices, 100 for exchange rates
- **Thread Safety**: RLock for concurrent Lambda executions

### Cache Performance
- **Cache Hit Rate**: 95%+ for repeated requests
- **Speed Improvement**: 25x faster for cached responses
- **API Call Reduction**: 95% reduction in external API calls

---

## 🔐 Security Features

### Authentication
- **JWT Tokens**: 24-hour expiration
- **Password Hashing**: hashlib with salt
- **Token Validation**: On all protected endpoints

### Data Protection
- **Input Validation**: Comprehensive validation on all inputs
- **SQL Injection Prevention**: Parameterized queries
- **CORS Configuration**: Proper cross-origin headers
- **Environment Variables**: Secure API key storage

---

## 📈 Performance Metrics

### Lambda Function
- **Memory**: 512MB allocated
- **Timeout**: 30 seconds
- **Cold Start**: ~2-3 seconds
- **Warm Execution**: ~100-500ms

### Database
- **Connection Pooling**: Efficient connection management
- **Indexed Queries**: Optimized for performance
- **Transaction Management**: Proper ACID compliance

---

## 🚀 Deployment Architecture

### Backend
- **AWS Lambda**: Single-file Python function
- **AWS RDS**: PostgreSQL database
- **AWS API Gateway**: RESTful API endpoints
- **Lambda Layers**: Dependency management

### Frontend
- **AWS S3**: Static website hosting
- **AWS CloudFront**: CDN for global distribution
- **React 19**: Modern frontend framework
- **Material-UI v7**: Component library

### Infrastructure
- **Region**: ap-northeast-1 (Asia Pacific - Tokyo)
- **Environment**: Development/Production separation
- **Monitoring**: CloudWatch logs and metrics

---

## 📝 Version History

- **v1.0** (July 14, 2025): Initial system inventory documentation
- **Milestone 5**: Complete dividend management system
- **Milestone 4**: Recurring investments and FIRE calculator
- **Milestone 3**: External API integration and caching
- **Milestone 2**: Asset management and transactions
- **Milestone 1**: Foundation and authentication

---

**Last Updated**: July 14, 2025  
**Next Review**: August 14, 2025  
**Maintained By**: Development Team

---

*This document should be updated whenever new components, data structures, or system changes are implemented.*
