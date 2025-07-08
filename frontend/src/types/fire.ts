// Enhanced FIRE Profile with comprehensive financial planning fields
export interface FIREProfile {
  profile_id: number;
  user_id: number;
  
  // 財務現況 (Current Financial Snapshot)
  current_age?: number; // Calculated from birth_year, but can be overridden
  annual_income: number; // 年收入
  annual_savings: number; // 年儲蓄/投入金額
  
  // 退休目標 (Retirement Goals)
  annual_expenses: number; // 預計退休後年支出
  target_retirement_age: number; // 目標退休年齡
  
  // 核心假設 (Core Assumptions)
  safe_withdrawal_rate: number; // 安全提領率 (3-5%, default 4%)
  expected_return_pre_retirement: number; // 退休前預期年化報酬率 (6-8%)
  expected_return_post_retirement: number; // 退休後預期年化報酬率 (4-6%)
  expected_inflation_rate: number; // 預期通膨率 (2-3%)
  other_passive_income: number; // 其他被動收入 (房租、版稅等)
  effective_tax_rate: number; // 有效稅率 (資本利得稅率)
  
  // Legacy fields for backward compatibility
  expected_annual_return: number; // Will be deprecated in favor of pre/post retirement rates
  barista_annual_income: number; // Part-time income for Barista FIRE
  
  created_at: string;
  updated_at: string;
}

export interface CreateFIREProfileRequest {
  // 財務現況 (Current Financial Snapshot)
  current_age?: number;
  annual_income: number;
  annual_savings: number;
  
  // 退休目標 (Retirement Goals)
  annual_expenses: number;
  target_retirement_age: number;
  
  // 核心假設 (Core Assumptions)
  safe_withdrawal_rate: number;
  expected_return_pre_retirement: number;
  expected_return_post_retirement: number;
  expected_inflation_rate: number;
  other_passive_income: number;
  effective_tax_rate: number;
  
  // Legacy/Optional fields
  expected_annual_return?: number;
  barista_annual_income: number;
}

// Enhanced FIRE Progress with inflation-adjusted calculations
export interface FIREProgress {
  // Current Status
  current_total_assets: number;
  current_age: number;
  years_to_retirement: number;
  
  // FIRE Targets (nominal and real values)
  traditional_fire_target: number;
  traditional_fire_target_real: number; // Inflation-adjusted
  barista_fire_target: number;
  barista_fire_target_real: number;
  coast_fire_target: number;
  coast_fire_target_real: number;
  
  // Progress Percentages
  traditional_fire_progress: number;
  barista_fire_progress: number;
  coast_fire_progress: number;
  
  // Time to Goals
  years_to_traditional_fire: number;
  years_to_barista_fire: number;
  years_to_coast_fire: number;
  
  // Required Savings
  monthly_investment_needed_traditional: number;
  monthly_investment_needed_barista: number;
  annual_savings_rate: number; // Current savings rate as percentage of income
  required_savings_rate_traditional: number; // Required savings rate to reach Traditional FIRE
  
  // Additional Metrics
  is_coast_fire_achieved: boolean;
  financial_independence_date?: string; // Projected FI date
  purchasing_power_at_retirement: number; // Real value considering inflation
}

export interface FIRECalculation {
  fire_type: 'Traditional' | 'Barista' | 'Coast';
  target_amount: number;
  target_amount_real: number; // Inflation-adjusted
  current_progress: number;
  progress_percentage: number;
  years_remaining: number;
  monthly_investment_needed: number;
  annual_savings_rate_required: number; // As percentage of income
  achieved: boolean;
  
  // Enhanced metrics
  projected_fi_date?: string;
  real_purchasing_power: number; // What the money will be worth in today's dollars
  tax_adjusted_withdrawal: number; // After-tax withdrawal amount
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
  message?: string;
}

// Helper interfaces for form validation and defaults
export interface FIREFormDefaults {
  safe_withdrawal_rate: { min: 0.03, max: 0.05, default: 0.04 };
  expected_return_pre_retirement: { min: 0.04, max: 0.12, default: 0.07 };
  expected_return_post_retirement: { min: 0.03, max: 0.08, default: 0.05 };
  expected_inflation_rate: { min: 0.01, max: 0.05, default: 0.025 };
  effective_tax_rate: { min: 0, max: 0.5, default: 0.15 };
}

export interface FIREFormValidation {
  annual_income: { min: 0, required: true };
  annual_savings: { min: 0, max_percentage_of_income: 1.0 };
  annual_expenses: { min: 0, required: true };
  target_retirement_age: { min: 18, max: 100 };
}

export interface FIREProgressResponse {
  fire_progress: FIREProgress;
  calculations: FIRECalculation[];
  user_age: number;
  base_currency: string;
}
