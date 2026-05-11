import axios from 'axios';

import { API_BASE_URL } from './config';

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

export type SnapshotRange = '1W' | '1M' | '3M' | '1Y' | 'ALL';

export interface PortfolioSnapshot {
  date: string;
  total_value: number;
  total_invested: number;
  invest_value: number;
  invest_invested: number;
  cumulative_dividends: number;
  asset_count: number;
}

export interface PortfolioSnapshotsResponse {
  snapshots: PortfolioSnapshot[];
  range: SnapshotRange;
  base_currency: string;
  count: number;
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
    // Use snapshot history for accurate period comparisons
    const res = await this.getPortfolioSnapshots('1Y');
    const snapshots = res.snapshots;
    const baseCurrency = res.base_currency;

    const today = new Date();
    const latest = snapshots[snapshots.length - 1];
    const currentValue = latest?.total_value ?? 0;

    const findSnapshotDaysAgo = (days: number) => {
      const target = new Date(today);
      target.setDate(target.getDate() - days);
      const targetStr = target.toISOString().slice(0, 10);
      // Find closest snapshot on or before target date
      const candidates = snapshots.filter(s => s.date <= targetStr);
      return candidates[candidates.length - 1] ?? snapshots[0];
    };

    const makeChange = (period: string, daysAgo: number): PortfolioValueChange => {
      const prior = findSnapshotDaysAgo(daysAgo);
      const previousValue = prior?.total_value ?? currentValue;
      const absoluteChange = currentValue - previousValue;
      const percentageChange = previousValue > 0 ? (absoluteChange / previousValue) * 100 : 0;
      return {
        period,
        current_value: currentValue,
        previous_value: previousValue,
        absolute_change: absoluteChange,
        percentage_change: percentageChange,
        start_date: prior?.date ?? latest?.date ?? '',
        end_date: latest?.date ?? '',
        base_currency: baseCurrency,
      };
    };

    return {
      value_changes: {
        '1W': makeChange('1W', 7),
        '1M': makeChange('1M', 30),
        '3M': makeChange('3M', 90),
        '1Y': makeChange('1Y', 365),
      },
      current_value: currentValue,
      base_currency: baseCurrency,
    };
  }

  async getPortfolioSnapshots(range: SnapshotRange = '1Y'): Promise<PortfolioSnapshotsResponse> {
    const response = await axios.get(
      `${API_BASE_URL}/portfolio/snapshots?range=${range}`,
      { headers: this.getAuthHeaders() }
    );
    return response.data;
  }
}

export const portfolioAPI = new PortfolioAPI();
