export interface Asset {
  asset_id: number;
  ticker_symbol: string;
  asset_type: string;
  total_shares: number;
  average_cost_basis: number;
  currency: string;
  transaction_count?: number;
  created_at: string;
  updated_at?: string;
  transactions?: Transaction[];
  
  // CD-specific fields
  interest_rate?: number; // Annual interest rate as percentage
  maturity_date?: string; // ISO date string
  cd_details?: CDDetails; // Compound interest calculations
  current_market_value?: number; // For CDs, this includes accrued interest
  accrued_interest?: number; // Interest earned so far
}

export interface CDDetails {
  current_value: number;
  accrued_interest: number;
  total_days: number;
  elapsed_days: number;
  maturity_value: number;
  annual_rate: number;
  is_matured: boolean;
  compounding_frequency: string;
  effective_annual_rate: number;
}

export interface Transaction {
  id?: number;
  transaction_id?: number;
  asset_id: number;
  transaction_type: 'Initialization' | 'LumpSum' | 'Recurring' | 'Dividend' | 'Split' | 'Sell';
  date: string;
  transaction_date?: string;
  shares: number;
  price_per_share: number;
  currency: string;
  created_at?: string;
  // Additional fields for display
  asset_ticker?: string;
  asset_type?: string;
  // Dividend-specific fields
  dividend_per_share?: number;
  total_dividend_amount?: number;
  ex_dividend_date?: string;
  payment_date?: string;
  is_reinvested?: boolean;
}

export interface AssetWithTransactions {
  asset: Asset;
  transactions: Transaction[];
}

export interface CreateAssetRequest {
  ticker_symbol: string;
  asset_type: string;
  total_shares: number;
  average_cost_basis: number;
  currency: string;
  
  // CD-specific fields
  interest_rate?: number; // Annual interest rate as percentage
  maturity_date?: string; // ISO date string (YYYY-MM-DD)
  start_date?: string; // ISO date string (YYYY-MM-DD) - when the CD was purchased
}

export interface CreateTransactionRequest {
  asset_id: number;
  transaction_type: 'LumpSum' | 'Recurring' | 'Dividend' | 'Split' | 'Sell';
  shares: number;
  price_per_share: number;
  currency: string;
  transaction_date?: string;
  // Dividend-specific fields
  dividend_per_share?: number;
  total_dividend_amount?: number;
  ex_dividend_date?: string;
  payment_date?: string;
  is_reinvested?: boolean;
  // Split-specific fields
  split_ratio?: string; // e.g., "2:1", "3:2"
}

export interface AssetsResponse {
  assets: Asset[];
  total_assets: number;
}

// Recurring Investment Types
export interface RecurringInvestment {
  recurring_id: number;
  ticker_symbol: string;
  amount: number;
  currency: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  start_date: string;
  next_run_date: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateRecurringInvestmentRequest {
  ticker_symbol: string;
  amount: number;
  currency: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  start_date: string;
}

export interface UpdateRecurringInvestmentRequest {
  amount?: number;
  frequency?: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  is_active?: boolean;
  start_date?: string;
  next_run_date?: string;
}

export interface RecurringInvestmentsResponse {
  recurring_investments: RecurringInvestment[];
  total_plans: number;
}
