export interface Dividend {
  dividend_id: number;
  asset_id: number;
  ticker_symbol: string;
  dividend_per_share: number;
  ex_dividend_date: string;
  payment_date: string;
  total_dividend: number;
  total_dividend_base_currency?: number; // Converted to user's base currency
  shares_owned: number;
  currency: string;
  base_currency?: string; // User's base currency
  exchange_rate_used?: number; // Exchange rate used for conversion
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
  total_pending: number; // In user's base currency
  total_processed: number; // In user's base currency
  base_currency?: string;
  exchange_rates_available?: boolean;
  summary?: {
    pending_count: number;
    processed_count: number;
    total_count: number;
    currencies_involved: string[];
  };
}

export interface YahooDividendData {
  symbol: string;
  dividendDate: string;
  dividendRate: number;
  exDividendDate: string;
  payDate: string;
}
