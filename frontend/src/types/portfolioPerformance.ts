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

export interface PortfolioPerformanceMetrics {
  ytd: PortfolioPerformance;
  oneYear: PortfolioPerformance;
  threeYear: PortfolioPerformance;
  fiveYear: PortfolioPerformance;
}

export interface PerformanceDisplayData {
  label: string;
  period: string;
  annualReturn: number;
  totalReturn: number;
  totalInvested: number;
  currentValue: number;
  gainLoss: number;
  color: 'success' | 'error' | 'warning';
}

export type PerformancePeriod = 'ytd' | 'oneYear' | 'threeYear' | 'fiveYear';

export interface PerformanceChartData {
  period: string;
  return: number;
  color: string;
}
