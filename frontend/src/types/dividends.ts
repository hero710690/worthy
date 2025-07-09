export interface Dividend {
  dividend_id: number;
  asset_id: number;
  ticker_symbol: string;
  dividend_per_share: number;
  ex_dividend_date: string;
  payment_date: string;
  total_dividend: number;
  shares_owned: number;
  currency: string;
  status: 'pending' | 'processed';
  created_at: string;
  updated_at?: string;
}

export interface CreateDividendRequest {
  asset_id: number;
  dividend_per_share: number;
  ex_dividend_date: string;
  payment_date: string;
  currency: string;
}

export interface ProcessDividendRequest {
  dividend_id: number;
  action: 'reinvest' | 'cash';
  reinvest_asset_id?: number; // For reinvestment
}

export interface DividendResponse {
  dividends: Dividend[];
  total_pending: number;
  total_processed: number;
}

export interface YahooDividendData {
  symbol: string;
  dividendDate: string;
  dividendRate: number;
  exDividendDate: string;
  payDate: string;
}
