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

export interface PortfolioPerformance {
  real_annual_return: number;
  total_return: number;
  total_invested: number;
  current_value: number;
  period_months: number;
  calculation_method: string;
  timestamp: string;
  user_id: number;
  error?: string;
}

export interface PortfolioPerformanceResponse {
  portfolio_performance: PortfolioPerformance;
}

class PortfolioPerformanceAPI {
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
   * Get multiple period performance for comparison
   */
  async getMultiPeriodPerformance(): Promise<{
    ytd: PortfolioPerformance;
    oneYear: PortfolioPerformance;
    threeYear: PortfolioPerformance;
    fiveYear: PortfolioPerformance;
  }> {
    try {
      const currentDate = new Date();
      const ytdMonths = currentDate.getMonth() + 1; // Months since January

      const [ytd, oneYear, threeYear, fiveYear] = await Promise.all([
        this.getPortfolioPerformance(ytdMonths),
        this.getPortfolioPerformance(12),
        this.getPortfolioPerformance(36),
        this.getPortfolioPerformance(60)
      ]);

      return { ytd, oneYear, threeYear, fiveYear };
    } catch (error) {
      console.error('Error fetching multi-period performance:', error);
      throw error;
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
