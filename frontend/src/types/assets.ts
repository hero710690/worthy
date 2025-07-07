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
}

export interface Transaction {
  transaction_id: number;
  asset_id: number;
  transaction_type: 'Initialization' | 'LumpSum' | 'Recurring';
  transaction_date: string;
  shares: number;
  price_per_share: number;
  currency: string;
  created_at: string;
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
