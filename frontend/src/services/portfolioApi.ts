import axios from 'axios';

const API_BASE_URL = 'https://mreda8g340.execute-api.ap-northeast-1.amazonaws.com/development';

// Portfolio performance types
export interface PortfolioPerformance {
  real_annual_return: number;
  total_return_percentage: number;
  total_invested: number;
  current_value: number;
  absolute_gain_loss: number;
  period_months: number;
  start_date: string;
  end_date: string;
  base_currency: string;
  annualized_return: number;
  time_weighted_return?: number;
  money_weighted_return?: number;
}

export interface PortfolioPerformanceResponse {
  portfolio_performance: PortfolioPerformance;
}

export interface PortfolioValueChange {
  period: string;
  current_value: number;
  previous_value: number;
  absolute_change: number;
  percentage_change: number;
  start_date: string;
  end_date: string;
  base_currency: string;
}

export interface PortfolioValueChangesResponse {
  value_changes: {
    '1W': PortfolioValueChange;
    '1M': PortfolioValueChange;
    '3M': PortfolioValueChange;
    '1Y': PortfolioValueChange;
  };
  current_value: number;
  base_currency: string;
}

class PortfolioAPI {
  private getAuthHeaders() {
    const token = localStorage.getItem('worthy_token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  async getPortfolioPerformance(periodMonths: number = 12): Promise<PortfolioPerformanceResponse> {
    const response = await axios.get(
      `${API_BASE_URL}/portfolio/performance?period=${periodMonths}`,
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }

  async getPortfolioValueChanges(): Promise<PortfolioValueChangesResponse> {
    // Get performance data for different periods
    // Use more accurate period calculations
    const [weekData, monthData, threeMonthData, yearData] = await Promise.all([
      this.getPortfolioPerformance(0.23), // ~1 week (1/4.3 months)
      this.getPortfolioPerformance(1),    // 1 month
      this.getPortfolioPerformance(3),    // 3 months
      this.getPortfolioPerformance(12),   // 1 year
    ]);

    // Calculate previous values based on current value and returns
    const currentValue = yearData.portfolio_performance.current_value;
    const baseCurrency = yearData.portfolio_performance.base_currency;

    const calculatePreviousValue = (current: number, returnPercentage: number): number => {
      // Handle edge cases
      if (returnPercentage === 0 || current === 0) return current;
      return current / (1 + returnPercentage / 100);
    };

    const createValueChange = (data: PortfolioPerformance, period: string): PortfolioValueChange => {
      const previousValue = calculatePreviousValue(currentValue, data.total_return_percentage);
      return {
        period,
        current_value: currentValue,
        previous_value: previousValue,
        absolute_change: currentValue - previousValue,
        percentage_change: data.total_return_percentage,
        start_date: data.start_date,
        end_date: data.end_date,
        base_currency: baseCurrency,
      };
    };

    return {
      value_changes: {
        '1W': createValueChange(weekData.portfolio_performance, '1W'),
        '1M': createValueChange(monthData.portfolio_performance, '1M'),
        '3M': createValueChange(threeMonthData.portfolio_performance, '3M'),
        '1Y': createValueChange(yearData.portfolio_performance, '1Y'),
      },
      current_value: currentValue,
      base_currency: baseCurrency,
    };
  }
}

export const portfolioAPI = new PortfolioAPI();
