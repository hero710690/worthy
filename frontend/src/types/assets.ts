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
}

export interface Transaction {
  id?: number;
  transaction_id?: number;
  asset_id: number;
  transaction_type: 'Initialization' | 'LumpSum' | 'Recurring';
  date: string;
  transaction_date?: string;
  shares: number;
  price_per_share: number;
  currency: string;
  created_at?: string;
  // Additional fields for display
  asset_ticker?: string;
  asset_type?: string;
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
}

export interface CreateTransactionRequest {
  asset_id: number;
  transaction_type: 'LumpSum' | 'Recurring';
  shares: number;
  price_per_share: number;
  currency: string;
  transaction_date?: string;
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
}

export interface RecurringInvestmentsResponse {
  recurring_investments: RecurringInvestment[];
  total_plans: number;
}
