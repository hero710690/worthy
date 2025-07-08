export interface FIREProfile {
  profile_id: number;
  user_id: number;
  annual_expenses: number;
  safe_withdrawal_rate: number;
  expected_annual_return: number;
  target_retirement_age: number;
  barista_annual_income: number;
  created_at: string;
  updated_at: string;
}

export interface CreateFIREProfileRequest {
  annual_expenses: number;
  safe_withdrawal_rate: number;
  expected_annual_return: number;
  target_retirement_age: number;
  barista_annual_income: number;
}

export interface FIREProgress {
  current_total_assets: number;
  traditional_fire_target: number;
  barista_fire_target: number;
  coast_fire_target: number;
  traditional_fire_progress: number;
  barista_fire_progress: number;
  coast_fire_progress: number;
  years_to_traditional_fire: number;
  years_to_barista_fire: number;
  years_to_coast_fire: number;
  monthly_investment_needed_traditional: number;
  monthly_investment_needed_barista: number;
  is_coast_fire_achieved: boolean;
}

export interface FIRECalculation {
  fire_type: 'Traditional' | 'Barista' | 'Coast';
  target_amount: number;
  current_progress: number;
  progress_percentage: number;
  years_remaining: number;
  monthly_investment_needed: number;
  achieved: boolean;
}

export interface FIREProfileResponse {
  fire_profile: FIREProfile | null;
  message?: string;
}

export interface FIREProgressResponse {
  fire_progress: FIREProgress;
  calculations: FIRECalculation[];
  user_age: number;
  base_currency: string;
}
