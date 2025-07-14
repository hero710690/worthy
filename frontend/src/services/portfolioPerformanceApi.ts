import axios from 'axios';

// API base URL - using our deployed backend
const API_BASE_URL = 'https://mreda8g340.execute-api.ap-northeast-1.amazonaws.com/development';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('worthy_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export interface SevenDayTWRPerformance {
  seven_day_return: number;
  seven_day_return_percent: number;
  annualized_return: number;
  annualized_return_percent: number;
  start_value: number;
  end_value: number;
  cash_flows: Array<{
    date: string;
    ticker: string;
    amount: number;
    type: string;
    currency: string;
  }>;
  total_cash_flows: number;
  calculation_method: string;
  period_days: number;
  start_date: string;
  end_date: string;
  base_currency: string;
  start_value_details?: Array<{
    ticker: string;
    shares: number;
    price: number;
    value: number;
    currency: string;
    has_price_data?: boolean;
    is_fallback_price?: boolean;
    error?: string;
  }>;
  end_value_details?: Array<{
    ticker: string;
    shares: number;
    price: number;
    value: number;
    currency: string;
    has_price_data?: boolean;
    is_fallback_price?: boolean;
    error?: string;
  }>;
  timestamp: string;
  user_id: number;
  error_message?: string;
  first_transaction_date?: string;
  days_since_first_investment?: number;
  is_adjusted_period?: boolean;
  original_requested_days?: number;
}

export interface SevenDayTWRResponse {
  seven_day_twr_performance: SevenDayTWRPerformance;
}

export interface PortfolioPerformance {
  real_annual_return: number;
  total_return: number;
  total_invested: number;
  current_value: number;
  period_months: number;
  calculation_method: string;
  timestamp: string;
  user_id: number;
  base_currency?: string;
  error?: string;
}

export interface PortfolioPerformanceResponse {
  portfolio_performance: PortfolioPerformance;
}

class PortfolioPerformanceAPI {
  /**
   * Get 7-day Time-Weighted Return performance
   */
  async get7DayTWRPerformance(): Promise<SevenDayTWRPerformance> {
    try {
      const response = await api.get<SevenDayTWRResponse>(
        `/portfolio/performance/7-day-twr`
      );
      return response.data.seven_day_twr_performance;
    } catch (error) {
      console.error('Error fetching 7-day TWR performance:', error);
      throw error;
    }
  }

  /**
   * Get portfolio performance metrics
   * @param periodMonths - Period in months for performance calculation (default: 12)
   */
  async getPortfolioPerformance(periodMonths: number = 12): Promise<PortfolioPerformance> {
    try {
      const response = await api.get<PortfolioPerformanceResponse>(
        `/portfolio/performance?period=${periodMonths}`
      );
      return response.data.portfolio_performance;
    } catch (error) {
      console.error('Error fetching portfolio performance:', error);
      throw error;
    }
  }

  /**
   * Get since inception performance (all available data)
   */
  async getSinceInceptionPerformance(): Promise<PortfolioPerformance> {
    try {
      // Use the dedicated since inception endpoint for accurate calculation
      const response = await api.get<PortfolioPerformanceResponse>(
        `/portfolio/performance/since-inception`
      );
      return response.data.portfolio_performance;
    } catch (error) {
      console.error('Error fetching since inception performance:', error);
      // Fallback to large period if dedicated endpoint fails
      try {
        const response = await api.get<PortfolioPerformanceResponse>(
          `/portfolio/performance?period=999`
        );
        return response.data.portfolio_performance;
      } catch (fallbackError) {
        console.error('Error fetching fallback since inception performance:', fallbackError);
        throw fallbackError;
      }
    }
  }

  /**
   * Get multiple period performance for comparison (only for periods with sufficient data)
   */
  async getMultiPeriodPerformance(): Promise<{
    sinceInception: PortfolioPerformance;
    ytd?: PortfolioPerformance;
    oneYear?: PortfolioPerformance;
    threeYear?: PortfolioPerformance;
    fiveYear?: PortfolioPerformance;
  }> {
    try {
      // First get since inception to determine available periods
      const sinceInception = await this.getSinceInceptionPerformance();
      const actualMonths = sinceInception.period_months || 0;
      
      const result: any = { sinceInception };
      
      // Only fetch periods where user has sufficient transaction history
      const currentDate = new Date();
      const ytdMonths = currentDate.getMonth() + 1;
      
      const periodPromises: Promise<PortfolioPerformance>[] = [];
      const periodKeys: string[] = [];
      
      // YTD (if we're past January and have data)
      if (ytdMonths >= 1 && actualMonths >= ytdMonths) {
        periodPromises.push(this.getPortfolioPerformance(ytdMonths));
        periodKeys.push('ytd');
      }
      
      // 1 Year (if user has at least 12 months of data)
      if (actualMonths >= 12) {
        periodPromises.push(this.getPortfolioPerformance(12));
        periodKeys.push('oneYear');
      }
      
      // 3 Years (if user has at least 36 months of data)
      if (actualMonths >= 36) {
        periodPromises.push(this.getPortfolioPerformance(36));
        periodKeys.push('threeYear');
      }
      
      // 5 Years (if user has at least 60 months of data)
      if (actualMonths >= 60) {
        periodPromises.push(this.getPortfolioPerformance(60));
        periodKeys.push('fiveYear');
      }
      
      // Fetch all available periods
      if (periodPromises.length > 0) {
        const periodResults = await Promise.allSettled(periodPromises);
        
        periodResults.forEach((promiseResult, index) => {
          if (promiseResult.status === 'fulfilled') {
            result[periodKeys[index]] = promiseResult.value;
          } else {
            console.warn(`Failed to fetch ${periodKeys[index]} performance:`, promiseResult.reason);
          }
        });
      }
      
      return result;
    } catch (error) {
      console.error('Error fetching multi-period performance:', error);
      throw error;
    }
  }

  /**
   * Check which performance periods are available for a user
   */
  async getAvailablePeriods(): Promise<{
    sinceInception: boolean;
    ytd: boolean;
    oneYear: boolean;
    threeYear: boolean;
    fiveYear: boolean;
    actualMonths: number;
  }> {
    try {
      const sinceInception = await this.getSinceInceptionPerformance();
      const actualMonths = sinceInception.period_months || 0;
      
      const currentDate = new Date();
      const ytdMonths = currentDate.getMonth() + 1;
      
      return {
        sinceInception: true, // Always available
        ytd: ytdMonths >= 1 && actualMonths >= ytdMonths,
        oneYear: actualMonths >= 12,
        threeYear: actualMonths >= 36,
        fiveYear: actualMonths >= 60,
        actualMonths,
      };
    } catch (error) {
      console.error('Error checking available periods:', error);
      return {
        sinceInception: true,
        ytd: false,
        oneYear: false,
        threeYear: false,
        fiveYear: false,
        actualMonths: 0,
      };
    }
  }

  /**
   * Format performance percentage for display
   */
  formatPerformancePercent(value: number): string {
    return `${(value * 100).toFixed(2)}%`;
  }

  /**
   * Format currency value for display
   */
  formatCurrency(value: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }

  /**
   * Get performance color based on value
   */
  getPerformanceColor(value: number): 'success' | 'error' | 'warning' {
    if (value > 0.05) return 'success'; // > 5%
    if (value < -0.05) return 'error';  // < -5%
    return 'warning'; // Between -5% and 5%
  }
}

export const portfolioPerformanceAPI = new PortfolioPerformanceAPI();
