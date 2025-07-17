import { Asset } from './assets';

export interface AssetReturn {
  asset: Asset;
  initialInvestment: number;
  currentValue: number;
  totalReturn: number;
  totalReturnPercent: number;
  annualizedReturn: number;
  annualizedReturnPercent: number;
  holdingPeriodYears: number;
  totalDividends: number;
  volatility?: number;
  sharpeRatio?: number;
  maxDrawdown?: number;
  riskLevel?: string;
}

export interface PortfolioReturns {
  assets: AssetReturn[];
  portfolioTotalReturn: number;
  portfolioTotalReturnPercent: number;
  portfolioAnnualizedReturn: number;
  portfolioAnnualizedReturnPercent: number;
  weightedAverageHoldingPeriod: number;
  totalDividendsReceived: number;
  advancedMetrics?: AdvancedMetrics;
}

export interface AdvancedMetrics {
  sharpeRatio: number;
  maxDrawdown: number;
  dividendYield: number;
  performanceGrade: string;
  riskAdjustedReturn: number;
  bestPerformer: string;
  worstPerformer: string;
  volatility: number;
}

export interface ReturnFormat {
  value: string;
  color: string;
}

export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
    borderWidth?: number;
    fill?: boolean;
  }[];
}
