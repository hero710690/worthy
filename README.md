# Worthy - Personal Financial Strategy Tool

A personalized financial strategy tool that helps users track investment assets and calculate FIRE (Financial Independence, Retire Early) progress across multiple currencies.

## Overview

Worthy solves the tedious problem of manually recording and updating multi-currency assets. Through simple initial setup and automated recurring investment tracking, it provides a clear, accurate, and motivating dashboard to help users plan their path to financial freedom.

## Features

### Core Features
- **Multi-Currency Asset Tracking**: Track investments in different currencies (USD, TWD, etc.) with automatic conversion to your base currency
- **Asset Initialization**: Quick setup of existing portfolio without entering historical transactions
- **Lump-Sum Purchases**: Record one-time investment transactions
- **Recurring Investments**: Set up automated recurring investment plans
- **Real-Time Data**: Automatic fetching of current market prices and exchange rates
- **Portfolio Dashboard**: Comprehensive view of total assets, allocation, and performance

### FIRE Calculator
- **Traditional FIRE**: Calculate full financial independence target
- **Barista FIRE**: Calculate partial financial independence with part-time income
- **Coast FIRE**: Calculate early investment target for future financial independence
- **Progress Tracking**: Visual progress indicators for each FIRE type

## Technology Stack

### Backend
- **Framework**: Node.js with Express.js
- **Database**: PostgreSQL
- **Authentication**: JWT tokens
- **External APIs**: Alpha Vantage (stock prices), ExchangeRate-API (currency conversion)
- **Scheduler**: node-cron for automated batch processing

### Frontend
- **Framework**: React.js with TypeScript
- **State Management**: Redux Toolkit
- **UI Library**: Material-UI
- **Charts**: Chart.js
- **Build Tool**: Vite

### Deployment
- **Backend**: AWS Lambda + RDS
- **Frontend**: AWS S3 + CloudFront
- **Scheduling**: AWS EventBridge

## Getting Started

### Prerequisites
- Node.js 18+ 
- PostgreSQL 15+
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/worthy.git
   cd worthy
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   
   # Set up environment variables
   cp .env.example .env
   # Edit .env with your database and API credentials
   
   # Run database migrations
   npm run migrate
   
   # Start development server
   npm run dev
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   
   # Set up environment variables
   cp .env.example .env
   # Edit .env with your API endpoint
   
   # Start development server
   npm run dev
   ```

### Environment Variables

**Backend (.env)**
```env
DATABASE_URL=postgresql://username:password@localhost:5432/worthy
JWT_SECRET=your-jwt-secret-key
ALPHA_VANTAGE_API_KEY=your-alpha-vantage-key
EXCHANGE_RATE_API_KEY=your-exchange-rate-key
NODE_ENV=development
PORT=3001
```

**Frontend (.env)**
```env
VITE_API_BASE_URL=http://localhost:3001/api
VITE_APP_NAME=Worthy
```

## API Documentation

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout

### Assets
- `GET /api/assets` - Get user's assets
- `POST /api/assets` - Create new asset (initialization)
- `PUT /api/assets/:id` - Update asset
- `DELETE /api/assets/:id` - Delete asset

### Transactions
- `GET /api/transactions` - Get transaction history
- `POST /api/transactions` - Record new transaction
- `PUT /api/transactions/:id` - Update transaction
- `DELETE /api/transactions/:id` - Delete transaction

### Recurring Investments
- `GET /api/recurring` - Get recurring investment plans
- `POST /api/recurring` - Create recurring plan
- `PUT /api/recurring/:id` - Update recurring plan
- `DELETE /api/recurring/:id` - Delete recurring plan

### FIRE Calculator
- `GET /api/fire/profile` - Get FIRE profile
- `POST /api/fire/profile` - Save FIRE profile
- `GET /api/fire/progress` - Get FIRE progress data

## Database Schema

### Users
```sql
CREATE TABLE users (
  user_id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  base_currency VARCHAR(3) DEFAULT 'USD',
  birth_year INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Assets
```sql
CREATE TABLE assets (
  asset_id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(user_id),
  ticker_symbol VARCHAR(10) NOT NULL,
  asset_type VARCHAR(50) DEFAULT 'Stock',
  total_shares DECIMAL(15,6) NOT NULL,
  average_cost_basis DECIMAL(15,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Transactions
```sql
CREATE TABLE transactions (
  transaction_id SERIAL PRIMARY KEY,
  asset_id INTEGER REFERENCES assets(asset_id),
  transaction_type VARCHAR(20) NOT NULL, -- 'LumpSum', 'Recurring', 'Initialization'
  date DATE NOT NULL,
  shares DECIMAL(15,6) NOT NULL,
  price_per_share DECIMAL(15,2) NOT NULL,
  currency VARCHAR(3) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Deployment

### AWS Deployment

1. **Set up AWS credentials**
   ```bash
   aws configure
   ```

2. **Deploy backend**
   ```bash
   cd backend
   npm run deploy:prod
   ```

3. **Deploy frontend**
   ```bash
   cd frontend
   npm run build
   npm run deploy:prod
   ```

### Environment Setup
- Development: Local PostgreSQL + Node.js
- Production: AWS RDS + Lambda + S3 + CloudFront

## Development

### Running Tests
```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test
```

### Code Quality
```bash
# Linting
npm run lint

# Formatting
npm run format

# Type checking (frontend)
npm run type-check
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## FIRE Calculator Formulas

- **Traditional FIRE**: `Annual Expenses / Safe Withdrawal Rate`
- **Barista FIRE**: `(Annual Expenses - Part-time Income) / Safe Withdrawal Rate`
- **Coast FIRE**: `Traditional FIRE Target / ((1 + Expected Return)^Years to Retirement)`

## External APIs

- **Stock Prices**: Alpha Vantage API
- **Exchange Rates**: ExchangeRate-API
- **Market Holidays**: Custom holiday calendar implementation

## Security

- Password hashing with bcrypt
- JWT token authentication
- Input validation and sanitization
- SQL injection prevention
- CORS configuration
- Rate limiting

## Performance

- Database indexing for optimal query performance
- API response caching
- Frontend code splitting and lazy loading
- CDN for static assets
- Image optimization

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, email support@worthy-app.com or create an issue in this repository.

## Roadmap

### V1.0 (Current)
- ✅ Multi-currency asset tracking
- ✅ FIRE calculator
- ✅ Automated recurring investments
- ✅ Real-time market data

### V2.0 (Future)
- [ ] Mobile app
- [ ] Advanced portfolio analytics
- [ ] Tax optimization tools
- [ ] Cryptocurrency support
- [ ] Brokerage account integration

---

**Built with ❤️ for the FIRE community**
