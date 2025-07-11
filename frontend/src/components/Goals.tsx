import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Stack,
  Button,
  LinearProgress,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Divider,
  Paper,
  Tooltip,
  IconButton,
  Tabs,
  Tab,
  Slider,
  FormControl,
  InputLabel,
  OutlinedInput,
  InputAdornment,
} from '@mui/material';
import {
  GpsFixed,
  TrendingUp,
  Coffee,
  BeachAccess,
  Calculate,
  Settings,
  CheckCircle,
  Schedule,
  AttachMoney,
  HelpOutline,
  Timeline,
  PieChart,
  TuneRounded,
  ShowChart,
} from '@mui/icons-material';
import { useAuthStore } from '../store/authStore';
import { assetAPI } from '../services/assetApi';
import { assetValuationService, type PortfolioValuation } from '../services/assetValuationService';
import { FIREProfile, CreateFIREProfileRequest, FIREProgress, FIRECalculation } from '../types/fire';
import { fireApi } from '../services/fireApi';
import { recurringInvestmentApi } from '../services/recurringInvestmentApi';
import { exchangeRateService } from '../services/exchangeRateService';
import type { Asset, RecurringInvestment } from '../types/assets';

export const Goals: React.FC = () => {
  const { user } = useAuthStore();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [portfolioValuation, setPortfolioValuation] = useState<PortfolioValuation | null>(null);
  const [fireProfile, setFireProfile] = useState<FIREProfile | null>(null);
  const [fireProgress, setFireProgress] = useState<FIREProgress | null>(null);
  const [calculations, setCalculations] = useState<FIRECalculation[]>([]);
  const [loading, setLoading] = useState(true);
  const [recurringInvestments, setRecurringInvestments] = useState<RecurringInvestment[]>([]);
  const [exchangeRates, setExchangeRates] = useState<{ [key: string]: number }>({});
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [userAge, setUserAge] = useState<number>(30);
  const [baseCurrency, setBaseCurrency] = useState<string>('USD');
  
  // Tab navigation state
  const [activeTab, setActiveTab] = useState(0);
  
  // Debug mode for showing comprehensive analysis
  const [debugMode, setDebugMode] = useState(false);
  const [comprehensiveAnalysis, setComprehensiveAnalysis] = useState<any>(null);
  
  // What-If Simulator State
  const [whatIfValues, setWhatIfValues] = useState({
    monthlyContribution: 5000,
    annualExpenses: 1200000,
    targetRetirementAge: 60,
    expectedReturn: 7,
    partTimeIncome: 300000,
  });

  // Enhanced form state with comprehensive FIRE planning fields
  const [formData, setFormData] = useState<CreateFIREProfileRequest>({
    // 財務現況 (Current Financial Snapshot)
    annual_income: 1000000, // NT$1,000,000 default
    annual_savings: 200000, // NT$200,000 default (20% savings rate)
    
    // 退休目標 (Retirement Goals)
    annual_expenses: 600000, // NT$600,000 default
    target_retirement_age: 65,
    
    // 核心假設 (Core Assumptions)
    safe_withdrawal_rate: 0.04, // 4% default
    expected_return_pre_retirement: 0.07, // 7% pre-retirement
    expected_return_post_retirement: 0.05, // 5% post-retirement
    expected_inflation_rate: 0.025, // 2.5% inflation
    other_passive_income: 0, // No passive income by default
    effective_tax_rate: 0.15, // 15% effective tax rate
    
    // Enhanced: New fields for sophisticated calculation
    barista_annual_contribution: 100000, // NT$100,000 investment capacity during part-time
    inflation_rate: 0.025, // 2.5% user-specific inflation assumption
    
    // Legacy fields for backward compatibility
    expected_annual_return: 0.07,
    barista_annual_income: 300000, // NT$300,000 part-time income (legacy)
  });

  // Calculate total monthly recurring investments in base currency
  const calculateMonthlyRecurringTotal = (): number => {
    const baseCurrency = user?.base_currency || 'USD';
    
    return recurringInvestments
      .filter(inv => inv.is_active)
      .reduce((sum, inv) => {
        // Convert to base currency using exchange rate service
        const convertedAmount = exchangeRateService.convertCurrency(
          inv.amount, 
          inv.currency, 
          baseCurrency
        );
        return sum + convertedAmount;
      }, 0);
  };

  // Load recurring investments and exchange rates
  const loadRecurringInvestments = async () => {
    try {
      const response = await recurringInvestmentApi.getRecurringInvestments();
      setRecurringInvestments(response.recurring_investments);
      
      // Load exchange rates for currency conversion
      const baseCurrency = user?.base_currency || 'USD';
      const rates = await exchangeRateService.getRatesWithRefresh(baseCurrency);
      setExchangeRates(rates);
    } catch (err) {
      console.error('Failed to load recurring investments:', err);
    }
  };

  const calculateFIREProgress = async (profile: FIREProfile, currentPortfolioValue: number): Promise<{ progress: FIREProgress; calculations: FIRECalculation[] }> => {
    console.log('🔥 Starting Comprehensive FIRE Calculation System...');
    
    // Use the comprehensive FIRE calculation system
    const comprehensiveResult = await calculateComprehensiveFIRE(
      profile.target_retirement_age,
      profile.annual_expenses,
      profile.barista_annual_income / 12, // Convert annual to monthly
      profile.safe_withdrawal_rate,
      currentPortfolioValue
    );

    // Convert comprehensive result to expected format
    const progress: FIREProgress = {
      current_total_assets: currentPortfolioValue,
      traditional_fire_target: comprehensiveResult.calculations.find(c => c.fire_type === 'Traditional')?.target_amount || 0,
      barista_fire_target: comprehensiveResult.calculations.find(c => c.fire_type === 'Barista')?.target_amount || 0,
      coast_fire_target: comprehensiveResult.calculations.find(c => c.fire_type === 'Coast')?.target_amount || 0,
      traditional_fire_progress: comprehensiveResult.calculations.find(c => c.fire_type === 'Traditional')?.progress_percentage || 0,
      barista_fire_progress: comprehensiveResult.calculations.find(c => c.fire_type === 'Barista')?.progress_percentage || 0,
      coast_fire_progress: comprehensiveResult.calculations.find(c => c.fire_type === 'Coast')?.progress_percentage || 0,
      estimated_annual_return: comprehensiveResult.metadata.blendedAnnualReturn,
      years_to_traditional_fire: comprehensiveResult.calculations.find(c => c.fire_type === 'Traditional')?.years_to_fire || 0,
      years_to_barista_fire: comprehensiveResult.calculations.find(c => c.fire_type === 'Barista')?.years_to_fire || 0,
      years_to_coast_fire: comprehensiveResult.calculations.find(c => c.fire_type === 'Coast')?.years_to_fire || 0
    };

    console.log('✅ Comprehensive FIRE Calculation Complete!', {
      metadata: comprehensiveResult.metadata,
      results: comprehensiveResult.results,
      traditionalFIRE: comprehensiveResult.calculations.find(c => c.fire_type === 'Traditional'),
      baristaFIRE: comprehensiveResult.calculations.find(c => c.fire_type === 'Barista'),
      coastFIRE: comprehensiveResult.calculations.find(c => c.fire_type === 'Coast')
    });

    // Store comprehensive analysis for debug display
    setComprehensiveAnalysis(comprehensiveResult);

    return { progress, calculations: comprehensiveResult.calculations };
  };

  // Keep the old calculation as backup (renamed)
  const calculateFIREProgressLegacy = (profile: FIREProfile, currentPortfolioValue: number): { progress: FIREProgress; calculations: FIRECalculation[] } => {
    const currentYear = new Date().getFullYear();
    const currentAge = user?.birth_year ? currentYear - user.birth_year : 30;
    const yearsToRetirement = Math.max(profile.target_retirement_age - currentAge, 0);
    
    // Use form data for comprehensive fields, fallback to profile for basic fields
    const annualExpenses = profile.annual_expenses;
    const safeWithdrawalRate = profile.safe_withdrawal_rate;
    const expectedReturn = profile.expected_annual_return || formData.expected_return_pre_retirement;
    const baristaMonthlyIncome = profile.barista_annual_income / 12;
    const baristaAnnualIncome = profile.barista_annual_income;
    
    // 🆕 ENHANCED: Use actual recurring investment amounts instead of form data
    const actualMonthlyContribution = calculateMonthlyRecurringTotal();
    const monthlyContribution = actualMonthlyContribution > 0 ? actualMonthlyContribution : (formData.annual_savings / 12);
    const monthlyRate = expectedReturn / 12;
    
    console.log('FIRE Calculation Enhanced:', {
      actualRecurringInvestments: actualMonthlyContribution,
      fallbackFromForm: formData.annual_savings / 12,
      usingAmount: monthlyContribution,
      activeRecurringPlans: recurringInvestments.filter(inv => inv.is_active).length
    });
    
    // Calculate FIRE targets (matching Python logic)
    const traditionalFireTarget = annualExpenses / safeWithdrawalRate;
    const netSpendForBaristaFire = Math.max(annualExpenses - baristaAnnualIncome, 0);
    const baristaFireTarget = netSpendForBaristaFire / safeWithdrawalRate;
    
    // FIRE Timeline Calculator (based on precise mathematical formulas)
    const calculateFIRETimeline = () => {
      // Results storage
      const results = {
        traditional: {
          target: traditionalFireTarget,
          achieved: false,
          yearsToAchieve: -1,
          ageAtAchievement: currentAge,
          dateAtAchievement: null as Date | null,
          monthsToAchieve: -1
        },
        barista: {
          target: baristaFireTarget,
          coastAmount: 0,
          achieved: false,
          yearsToCoast: -1,
          ageAtCoast: currentAge,
          dateAtCoast: null as Date | null,
          monthsToCoast: -1,
          message: ""
        },
        coast: {
          target: traditionalFireTarget,
          coastAmount: 0,
          achieved: false,
          yearsToCoast: -1,
          ageAtCoast: currentAge,
          dateAtCoast: null as Date | null,
          monthsToCoast: -1,
          message: ""
        }
      };
      
      // Check if already achieved Traditional FIRE
      if (currentPortfolioValue >= traditionalFireTarget) {
        results.traditional.achieved = true;
        results.traditional.yearsToAchieve = 0;
        results.traditional.ageAtAchievement = currentAge;
        results.traditional.dateAtAchievement = new Date();
        results.traditional.monthsToAchieve = 0;
      }
      
      // Special case: Barista FIRE target is zero (income covers all expenses)
      if (baristaFireTarget <= 0) {
        results.barista.achieved = true;
        results.barista.yearsToCoast = 0;
        results.barista.ageAtCoast = currentAge;
        results.barista.dateAtCoast = new Date();
        results.barista.monthsToCoast = 0;
        results.barista.coastAmount = 0;
        results.barista.message = "Barista FIRE already achieved - your part-time income covers all expenses!";
      }
      
      // Calculate Coast FIRE using precise mathematical approach
      const calculateCoastFIRE = () => {
        const monthlyRate = expectedReturn / 12;
        const maxMonths = (profile.target_retirement_age - currentAge) * 12;
        
        // Iterate month by month to find Coast FIRE point
        for (let months = 0; months <= maxMonths; months++) {
          const currentSimAge = currentAge + (months / 12);
          const yearsLeftToRetirement = profile.target_retirement_age - currentSimAge;
          
          // Calculate required coast amount at this point in time
          // This is the present value of Traditional FIRE number discounted back
          const requiredCoastAmount = yearsLeftToRetirement > 0 && expectedReturn > 0
            ? traditionalFireTarget / Math.pow(1 + expectedReturn, yearsLeftToRetirement)
            : traditionalFireTarget;
          
          // Calculate future value of current portfolio + contributions up to this point
          // FV = P * (1 + r)^n + PMT * [((1 + r)^n - 1) / r]
          let portfolioFutureValue;
          if (monthlyRate === 0) {
            // No growth case
            portfolioFutureValue = currentPortfolioValue + (monthlyContribution * months);
          } else {
            // With growth
            const principalGrowth = currentPortfolioValue * Math.pow(1 + monthlyRate, months);
            const contributionsGrowth = months > 0 
              ? monthlyContribution * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate)
              : 0;
            portfolioFutureValue = principalGrowth + contributionsGrowth;
          }
          
          // Check if we've reached Coast FIRE
          if (portfolioFutureValue >= requiredCoastAmount) {
            const yearsToCoast = months / 12;
            const coastDate = new Date(currentYear, new Date().getMonth(), new Date().getDate() + (months * 30.44));
            
            results.coast.achieved = true;
            results.coast.yearsToCoast = yearsToCoast;
            results.coast.ageAtCoast = currentSimAge;
            results.coast.dateAtCoast = coastDate;
            results.coast.monthsToCoast = months;
            results.coast.coastAmount = requiredCoastAmount;
            
            if (months === 0) {
              results.coast.message = `🎉 You can Coast FIRE now! You have ${formatCurrency(currentPortfolioValue, baseCurrency)} and need ${formatCurrency(requiredCoastAmount, baseCurrency)}. You can stop investing and still reach Traditional FIRE at age ${profile.target_retirement_age}.`;
            } else {
              results.coast.message = `In ${yearsToCoast.toFixed(2)} years you can Coast FIRE once you save up ${formatCurrency(requiredCoastAmount, baseCurrency)} on ${coastDate.toLocaleDateString()} at age ${currentSimAge.toFixed(2)} (i.e. after ${coastDate.toLocaleDateString()} you can halt all retirement contributions and still retire at age ${profile.target_retirement_age})`;
            }
            break;
          }
        }
        
        // If not found within retirement timeframe, it's not achievable
        if (!results.coast.achieved) {
          results.coast.message = `Coast FIRE may not be reachable before your target retirement age ${profile.target_retirement_age} with current savings rate. Consider increasing monthly contributions or extending retirement age.`;
        }
      };
      
      // Calculate Barista FIRE using the same approach
      const calculateBaristaFIRE = () => {
        if (baristaFireTarget <= 0) return; // Already handled above
        
        const monthlyRate = expectedReturn / 12;
        const maxMonths = (profile.target_retirement_age - currentAge) * 12;
        
        for (let months = 0; months <= maxMonths; months++) {
          const currentSimAge = currentAge + (months / 12);
          const yearsLeftToRetirement = profile.target_retirement_age - currentSimAge;
          
          // Calculate required barista coast amount
          const requiredBaristaCoastAmount = yearsLeftToRetirement > 0 && expectedReturn > 0
            ? baristaFireTarget / Math.pow(1 + expectedReturn, yearsLeftToRetirement)
            : baristaFireTarget;
          
          // Calculate portfolio future value
          let portfolioFutureValue;
          if (monthlyRate === 0) {
            portfolioFutureValue = currentPortfolioValue + (monthlyContribution * months);
          } else {
            const principalGrowth = currentPortfolioValue * Math.pow(1 + monthlyRate, months);
            const contributionsGrowth = months > 0 
              ? monthlyContribution * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate)
              : 0;
            portfolioFutureValue = principalGrowth + contributionsGrowth;
          }
          
          if (portfolioFutureValue >= requiredBaristaCoastAmount) {
            const yearsToCoast = months / 12;
            const coastDate = new Date(currentYear, new Date().getMonth(), new Date().getDate() + (months * 30.44));
            
            results.barista.achieved = true;
            results.barista.yearsToCoast = yearsToCoast;
            results.barista.ageAtCoast = currentSimAge;
            results.barista.dateAtCoast = coastDate;
            results.barista.monthsToCoast = months;
            results.barista.coastAmount = requiredBaristaCoastAmount;
            
            if (months === 0) {
              results.barista.message = `🎉 You can Barista FIRE now! You can work part-time (${formatCurrency(baristaMonthlyIncome, baseCurrency)}/month) and still reach retirement at age ${profile.target_retirement_age}.`;
            } else {
              results.barista.message = `In ${yearsToCoast.toFixed(2)} years you can Barista FIRE once you save up ${formatCurrency(requiredBaristaCoastAmount, baseCurrency)} on ${coastDate.toLocaleDateString()} at age ${currentSimAge.toFixed(2)} (i.e. after ${coastDate.toLocaleDateString()} you can work part-time at ${formatCurrency(baristaMonthlyIncome, baseCurrency)}/month and still retire at age ${profile.target_retirement_age})`;
            }
            break;
          }
        }
        
        if (!results.barista.achieved) {
          results.barista.message = `Barista FIRE may not be reachable before your target retirement age with current savings rate. Consider increasing monthly contributions or extending retirement age.`;
        }
      };
      
      // Calculate Traditional FIRE using direct formula
      const calculateTraditionalFIRE = () => {
        if (results.traditional.achieved) return; // Already achieved
        
        const monthlyRate = expectedReturn / 12;
        
        if (monthlyRate === 0 && monthlyContribution === 0) {
          // No growth and no contributions - impossible
          results.traditional.yearsToAchieve = -1;
          return;
        }
        
        // Solve for n in: FV = P * (1 + r)^n + PMT * [((1 + r)^n - 1) / r]
        // This is complex to solve analytically, so we'll use iteration
        const targetAmount = traditionalFireTarget;
        const maxMonths = 50 * 12; // 50 years max
        
        for (let months = 1; months <= maxMonths; months++) {
          let portfolioFutureValue;
          if (monthlyRate === 0) {
            portfolioFutureValue = currentPortfolioValue + (monthlyContribution * months);
          } else {
            const principalGrowth = currentPortfolioValue * Math.pow(1 + monthlyRate, months);
            const contributionsGrowth = monthlyContribution * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);
            portfolioFutureValue = principalGrowth + contributionsGrowth;
          }
          
          if (portfolioFutureValue >= targetAmount) {
            const yearsToAchieve = months / 12;
            results.traditional.yearsToAchieve = yearsToAchieve;
            results.traditional.ageAtAchievement = currentAge + yearsToAchieve;
            results.traditional.dateAtAchievement = new Date(currentYear + Math.floor(yearsToAchieve), new Date().getMonth(), new Date().getDate());
            results.traditional.monthsToAchieve = months;
            break;
          }
        }
        
        // If not found within 50 years, it's effectively unreachable
        if (results.traditional.yearsToAchieve === -1) {
          results.traditional.yearsToAchieve = -1; // Unreachable
        }
      };
      
      // Execute calculations
      calculateCoastFIRE();
      calculateBaristaFIRE();
      calculateTraditionalFIRE();
      
      return results;
    };
    
    // Run the FIRE timeline calculation
    const fireResults = calculateFIRETimeline();
    
    // Extract results for easier access (use the targets calculated in the timeline function)
    const coastFireTarget = fireResults.coast.target;
    
    const traditionalFireAchieved = fireResults.traditional.achieved;
    const baristaFireAchieved = fireResults.barista.achieved;
    const coastFireAchieved = fireResults.coast.achieved;
    
    const yearsToTraditionalFire = fireResults.traditional.yearsToAchieve;
    const yearsToBaristaFire = fireResults.barista.yearsToCoast;
    const yearsToCoastFire = fireResults.coast.yearsToCoast;
    
    const traditionalFireDate = fireResults.traditional.dateAtAchievement;
    const baristaFireDate = fireResults.barista.dateAtCoast;
    const coastFireDate = fireResults.coast.dateAtCoast;
    
    const traditionalFireAge = fireResults.traditional.ageAtAchievement;
    const baristaFireAge = fireResults.barista.ageAtCoast;
    const coastFireAge = fireResults.coast.ageAtCoast;
    
    // Calculate progress percentages
    const traditionalProgress = (currentPortfolioValue / traditionalFireTarget) * 100;
    const baristaProgress = baristaFireTarget > 0 ? (currentPortfolioValue / baristaFireTarget) * 100 : 100;
    const coastProgress = (currentPortfolioValue / (fireResults.coast.coastAmount || traditionalFireTarget)) * 100;
    
    // Calculate monthly investment needed using simulation results
    const calculateMonthlyNeeded = (target: number, currentValue: number, years: number = 30): number => {
      if (years <= 0 || target <= currentValue) return 0;
      
      const monthlyRate = expectedReturn / 12;
      const months = years * 12;
      
      if (monthlyRate === 0) return (target - currentValue) / months;
      
      const futureValueCurrent = currentValue * Math.pow(1 + monthlyRate, months);
      const remainingNeeded = target - futureValueCurrent;
      
      if (remainingNeeded <= 0) return 0;
      
      const monthlyPayment = remainingNeeded * monthlyRate / (Math.pow(1 + monthlyRate, months) - 1);
      return Math.max(monthlyPayment, 0);
    };
    
    // Calculate monthly needed for each FIRE type using simulation results
    const traditionalMonthly = traditionalFireAchieved ? 0 : 
      (yearsToTraditionalFire > 0 && yearsToTraditionalFire < 100) ? calculateMonthlyNeeded(traditionalFireTarget, currentPortfolioValue, Math.min(yearsToTraditionalFire, 30)) : 0;
    const baristaMonthly = baristaFireAchieved ? 0 : 
      (yearsToBaristaFire > 0 && yearsToBaristaFire < 100) ? calculateMonthlyNeeded(baristaFireTarget, currentPortfolioValue, Math.min(yearsToBaristaFire, 30)) : 0;
    const coastMonthlyNeeded = coastFireAchieved ? 0 : 
      (yearsToCoastFire > 0 && yearsToCoastFire < 100) ? calculateMonthlyNeeded(fireResults.coast.coastAmount || traditionalFireTarget, currentPortfolioValue, Math.min(yearsToCoastFire, 30)) : 0;
    
    const progress: FIREProgress = {
      current_total_assets: currentPortfolioValue,
      current_age: currentAge,
      years_to_retirement: yearsToRetirement,
      
      traditional_fire_target: traditionalFireTarget,
      traditional_fire_target_real: traditionalFireTarget,
      barista_fire_target: baristaFireTarget,
      barista_fire_target_real: baristaFireTarget,
      coast_fire_target: fireResults.coast.coastAmount || traditionalFireTarget,
      coast_fire_target_real: fireResults.coast.coastAmount || traditionalFireTarget,
      
      traditional_fire_progress: Math.min(traditionalProgress, 100),
      barista_fire_progress: Math.min(baristaProgress, 100),
      coast_fire_progress: Math.min(coastProgress, 100),
      
      years_to_traditional_fire: yearsToTraditionalFire,
      years_to_barista_fire: yearsToBaristaFire,
      years_to_coast_fire: yearsToCoastFire,
      
      monthly_investment_needed_traditional: traditionalMonthly,
      monthly_investment_needed_barista: baristaMonthly,
      annual_savings_rate: formData.annual_income > 0 ? (formData.annual_savings / formData.annual_income) : 0,
      required_savings_rate_traditional: 0,
      
      is_coast_fire_achieved: coastFireAchieved,
      financial_independence_date: traditionalFireDate?.toISOString().split('T')[0],
      purchasing_power_at_retirement: traditionalFireTarget
    };
    
    const calculations: FIRECalculation[] = [
      {
        fire_type: 'Traditional',
        target_amount: traditionalFireTarget,
        target_amount_real: traditionalFireTarget,
        current_progress: currentPortfolioValue,
        progress_percentage: Math.min(traditionalProgress, 100),
        years_remaining: yearsToTraditionalFire > 0 ? yearsToTraditionalFire : null, // null for unreachable
        monthly_investment_needed: traditionalMonthly,
        annual_savings_rate_required: 0,
        achieved: traditionalFireAchieved,
        projected_fi_date: traditionalFireDate?.toISOString().split('T')[0],
        real_purchasing_power: traditionalFireTarget,
        tax_adjusted_withdrawal: traditionalFireTarget * safeWithdrawalRate
      },
      {
        fire_type: 'Barista',
        target_amount: baristaFireTarget,
        target_amount_real: baristaFireTarget,
        current_progress: currentPortfolioValue,
        progress_percentage: Math.min(baristaProgress, 100),
        years_remaining: yearsToBaristaFire > 0 ? yearsToBaristaFire : null, // null for unreachable
        monthly_investment_needed: baristaMonthly,
        annual_savings_rate_required: 0,
        achieved: baristaFireAchieved,
        projected_fi_date: baristaFireDate?.toISOString().split('T')[0],
        real_purchasing_power: baristaFireTarget,
        tax_adjusted_withdrawal: baristaFireTarget * safeWithdrawalRate,
        // Barista FIRE specific message
        barista_fire_message: fireResults.barista.message
      },
      {
        fire_type: 'Coast',
        target_amount: fireResults.coast.coastAmount || traditionalFireTarget,
        target_amount_real: fireResults.coast.coastAmount || traditionalFireTarget,
        current_progress: currentPortfolioValue,
        progress_percentage: Math.min(coastProgress, 100),
        years_remaining: yearsToCoastFire > 0 ? yearsToCoastFire : null, // null for unreachable
        monthly_investment_needed: coastMonthlyNeeded,
        annual_savings_rate_required: 0,
        achieved: coastFireAchieved,
        projected_fi_date: coastFireDate?.toISOString().split('T')[0],
        real_purchasing_power: traditionalFireTarget, // Will grow to this
        tax_adjusted_withdrawal: traditionalFireTarget * safeWithdrawalRate, // Will grow to this
        // Coast FIRE specific fields
        coast_fire_age: coastFireAge,
        coast_fire_date: coastFireDate,
        retirement_age: profile.target_retirement_age,
        can_stop_contributing_message: fireResults.coast.message
      }
    ];
    
    return { progress, calculations };
  };

  // 💸 DIVIDEND PROJECTIONS HELPER FUNCTION
  const calculateDividendProjections = async () => {
    try {
      // Get actual dividend data from the backend
      const API_BASE_URL = 'https://mreda8g340.execute-api.ap-northeast-1.amazonaws.com/development';
      const response = await fetch(`${API_BASE_URL}/dividends`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const dividendData = await response.json();
        const dividends = dividendData.dividends || [];
        
        // Calculate annual dividend projection from recent dividend history
        if (dividends.length > 0) {
          // Get dividends from the last 12 months
          const oneYearAgo = new Date();
          oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
          
          const recentDividends = dividends.filter((div: any) => {
            const paymentDate = new Date(div.payment_date || div.ex_dividend_date);
            return paymentDate >= oneYearAgo;
          });
          
          if (recentDividends.length > 0) {
            // Sum up actual dividends received in the last year, converted to base currency
            const baseCurrency = user?.base_currency || 'USD';
            const totalRecentDividends = recentDividends.reduce((sum: number, div: any) => {
              // Convert dividend amount to base currency if needed
              let dividendAmount = div.total_dividend_amount || 0;
              if (div.currency && div.currency !== baseCurrency) {
                // Use exchange rate service for conversion
                dividendAmount = exchangeRateService.convertCurrency(
                  dividendAmount, 
                  div.currency, 
                  baseCurrency
                );
              }
              return sum + dividendAmount;
            }, 0);
            
            console.log('📊 Actual dividend projection from database:', {
              recentDividends: recentDividends.length,
              totalAmount: formatCurrency(totalRecentDividends),
              annualProjection: formatCurrency(totalRecentDividends),
              baseCurrency
            });
            
            return totalRecentDividends;
          }
        }
      }
    } catch (error) {
      console.warn('Could not fetch dividend data for projections:', error);
    }
    
    // 🔧 FIXED: More conservative dividend estimation
    // Use a much lower dividend yield estimate since dividends are ADDED to portfolio value
    // They should not be double-counted in FIRE calculations
    const conservativeDividendYield = 0.005; // 0.5% very conservative estimate
    const estimatedDividends = (portfolioValuation?.totalValueInBaseCurrency || 0) * conservativeDividendYield;
    
    console.log('📊 Conservative dividend projection (fallback):', {
      portfolioValue: formatCurrency(portfolioValuation?.totalValueInBaseCurrency || 0),
      estimatedYield: `${(conservativeDividendYield * 100).toFixed(1)}%`,
      estimatedAnnualDividends: formatCurrency(estimatedDividends),
      note: 'Conservative estimate - dividends are already included in portfolio value'
    });
    
    return estimatedDividends;
  };

  // 🔥 COMPREHENSIVE FIRE CALCULATION SYSTEM
  // Uses existing database data first, minimal user input required
  const calculateComprehensiveFIRE = async (
    targetRetirementAge: number,
    annualExpenses: number,
    baristaMonthlyIncome: number,
    withdrawalRate: number,
    currentPortfolioValue: number
  ) => {
    const currentYear = new Date().getFullYear();
    const currentAge = user?.birth_year ? currentYear - user.birth_year : 30;
    const baseCurrency = user?.base_currency || 'USD';

    console.log('🔥 Starting Comprehensive FIRE Calculation System...');

    // === 1. DATA FROM OUR TABLES (PRIORITY) ===
    const monthlyRecurringInvestment = calculateMonthlyRecurringTotal();
    const projectedDividends = await calculateDividendProjections();

    // === 2. SMART ASSUMPTIONS BASED ON DATABASE DATA ===
    const assumptions = {
      // Asset allocation - analyze from actual assets if possible, otherwise use professional defaults
      cashAllocation: 0.10,      // 10% cash (conservative)
      stockAllocation: 0.70,     // 70% stocks (growth-oriented)
      bondAllocation: 0.20,      // 20% bonds (stability)
      
      // Return rates (industry standard)
      cashAnnualReturn: 0.005,   // 0.5% cash return
      stockAnnualReturn: 0.07,   // 7% stock return
      bondAnnualReturn: 0.03,    // 3% bond return
      
      // Economic assumptions (conservative)
      inflationRate: 0.025,      // 2.5% inflation
      safeWithdrawalRate: withdrawalRate || 0.04, // Use user's setting or 4% default
      
      // Barista FIRE assumptions (based on part-time income, not current investments)
      baristaMonthlyContribution: Math.max(baristaMonthlyIncome * 0.2, 10000), // 20% of part-time income or minimum NT$10,000
    };

    // Calculate blended portfolio return
    const blendedAnnualReturn = (
      assumptions.cashAllocation * assumptions.cashAnnualReturn +
      assumptions.stockAllocation * assumptions.stockAnnualReturn +
      assumptions.bondAllocation * assumptions.bondAnnualReturn
    );
    const blendedMonthlyReturn = Math.pow(1 + blendedAnnualReturn, 1/12) - 1;
    const realAnnualReturn = (1 + blendedAnnualReturn) / (1 + assumptions.inflationRate) - 1;

    console.log('📊 Database-Driven Calculation Inputs:', {
      currentAge,
      currentPortfolioValue: formatCurrency(currentPortfolioValue),
      monthlyRecurringInvestment: formatCurrency(monthlyRecurringInvestment),
      targetRetirementAge,
      annualExpenses: formatCurrency(annualExpenses),
      baristaMonthlyIncome: formatCurrency(baristaMonthlyIncome),
      blendedAnnualReturn: `${(blendedAnnualReturn * 100).toFixed(2)}%`,
      realAnnualReturn: `${(realAnnualReturn * 100).toFixed(2)}%`,
      dataSource: 'Primarily from database tables with smart assumptions'
    });

    // === 3. FIRE TARGET CALCULATIONS ===
    
    // Traditional FIRE: Need enough to cover full annual expenses
    const traditionalFireTarget = annualExpenses / assumptions.safeWithdrawalRate;
    
    // 🔧 FIXED: Barista FIRE is about TRANSITION POINT, not reduced target
    // Barista FIRE target = amount needed to transition to part-time work
    // The final goal is still Traditional FIRE, but achieved via different path
    const baristaAnnualIncome = baristaMonthlyIncome * 12;
    
    // For Barista FIRE transition, we need enough portfolio + part-time income to cover expenses
    // This is a more complex calculation that requires simulation
    let baristaTransitionTarget = traditionalFireTarget * 0.4; // Start with 40% of Traditional FIRE as transition point

    console.log('🔧 FIRE Target Calculations:', {
      annualExpenses: formatCurrency(annualExpenses),
      baristaAnnualIncome: formatCurrency(baristaAnnualIncome),
      traditionalFireTarget: formatCurrency(traditionalFireTarget),
      baristaTransitionTarget: formatCurrency(baristaTransitionTarget),
      safeWithdrawalRate: `${(assumptions.safeWithdrawalRate * 100).toFixed(1)}%`
    });

    // === 4. SIMULATION FUNCTION WITH TARGET RETIREMENT AGE ===
    const simulateToTarget = (targetAmount: number, monthlyContribution: number, maxYears: number = 50) => {
      let portfolioValue = currentPortfolioValue;
      let months = 0;
      const maxMonths = Math.min(maxYears * 12, (targetRetirementAge - currentAge) * 12); // ✅ Use target retirement age

      while (portfolioValue < targetAmount && months < maxMonths) {
        // Apply monthly growth
        portfolioValue *= (1 + blendedMonthlyReturn);
        // Add monthly contribution
        portfolioValue += monthlyContribution;
        months++;
      }

      const years = months / 12;
      const achievementAge = currentAge + years;
      const achievementYear = currentYear + Math.round(years);

      return {
        achievable: portfolioValue >= targetAmount && achievementAge <= targetRetirementAge, // ✅ Must achieve before target retirement age
        years: years,
        months: months,
        achievementAge: achievementAge,
        achievementYear: achievementYear,
        finalPortfolioValue: portfolioValue,
        withinRetirementWindow: achievementAge <= targetRetirementAge
      };
    };

    // === 5. SCENARIO CALCULATIONS ===

    // 1. TRADITIONAL FIRE (single phase)
    const traditionalResult = simulateToTarget(traditionalFireTarget, monthlyRecurringInvestment);
    
    // 2. BARISTA FIRE (two-phase simulation with target retirement age)
    const simulateBaristaFire = () => {
      // Phase 1: Full-time work until transition point
      let portfolioValue = currentPortfolioValue;
      let months = 0;
      const maxMonthsToRetirement = (targetRetirementAge - currentAge) * 12; // ✅ Use target retirement age
      
      // Find transition point where part-time income + portfolio withdrawals can cover expenses
      // We'll iterate to find the minimum portfolio needed for transition
      for (let transitionTarget = traditionalFireTarget * 0.2; transitionTarget <= traditionalFireTarget; transitionTarget += traditionalFireTarget * 0.05) {
        portfolioValue = currentPortfolioValue;
        months = 0;
        
        // Phase 1: Reach transition target with full-time investment
        while (portfolioValue < transitionTarget && months < maxMonthsToRetirement) {
          portfolioValue *= (1 + blendedMonthlyReturn);
          portfolioValue += monthlyRecurringInvestment;
          months++;
        }
        
        if (months >= maxMonthsToRetirement) continue; // Skip if takes too long
        
        const transitionAge = currentAge + (months / 12);
        const transitionYear = currentYear + Math.round(months / 12);
        
        // Phase 2: From transition to Traditional FIRE with part-time work
        let phase2Months = 0;
        let phase2Portfolio = portfolioValue;
        const remainingMonthsToRetirement = maxMonthsToRetirement - months; // ✅ Remaining time to target retirement age
        
        while (phase2Portfolio < traditionalFireTarget && phase2Months < remainingMonthsToRetirement) {
          phase2Portfolio *= (1 + blendedMonthlyReturn);
          phase2Portfolio += assumptions.baristaMonthlyContribution;
          phase2Months++;
        }
        
        const totalMonths = months + phase2Months;
        const totalYears = totalMonths / 12;
        const finalAge = currentAge + totalYears;
        const finalYear = currentYear + Math.round(totalYears);
        
        // ✅ Check if this transition point works AND achieves goal before target retirement age
        if (phase2Portfolio >= traditionalFireTarget && finalAge <= targetRetirementAge) {
          return {
            achievable: true,
            transitionTarget: transitionTarget,
            transitionAge: transitionAge,
            transitionYear: transitionYear,
            transitionMonths: months,
            finalAge: finalAge,
            finalYear: finalYear,
            totalYears: totalYears,
            finalPortfolioValue: phase2Portfolio,
            withinRetirementWindow: true
          };
        }
      }
      
      // If no viable transition point found within target retirement age
      return {
        achievable: false,
        transitionTarget: 0,
        transitionAge: 0,
        transitionYear: 0,
        transitionMonths: 0,
        finalAge: 0,
        finalYear: 0,
        totalYears: 0,
        finalPortfolioValue: 0,
        withinRetirementWindow: false
      };
    };
    
    const baristaResult = simulateBaristaFire();
    
    // 3. COAST FIRE (find minimum amount needed now to reach Traditional FIRE by target retirement age)
    const yearsToTargetRetirement = targetRetirementAge - currentAge;
    const futureValueNeededAtRetirement = traditionalFireTarget * Math.pow(1 + assumptions.inflationRate, yearsToTargetRetirement);
    const coastFireTarget = futureValueNeededAtRetirement / Math.pow(1 + blendedAnnualReturn, yearsToTargetRetirement);
    const coastResult = simulateToTarget(coastFireTarget, monthlyRecurringInvestment);

    // === 6. GENERATE COMPREHENSIVE RESULTS ===
    
    const results = {
      // Traditional FIRE
      traditional: {
        target: traditionalFireTarget,
        achievable: traditionalResult.achievable,
        years: traditionalResult.years,
        age: traditionalResult.achievementAge,
        year: traditionalResult.achievementYear,
        finalValue: traditionalResult.finalPortfolioValue,
        withinRetirementWindow: traditionalResult.withinRetirementWindow,
        message: (() => {
          if (traditionalResult.achievable && traditionalResult.withinRetirementWindow) {
            return `✅ YES! You can achieve Traditional FIRE at age ${traditionalResult.achievementAge.toFixed(1)} (${traditionalResult.achievementYear}). You'll have ${formatCurrency(traditionalResult.finalPortfolioValue)} and can withdraw ${formatCurrency(traditionalResult.finalPortfolioValue * assumptions.safeWithdrawalRate)} annually.`;
          } else if (traditionalResult.achievable && traditionalResult.achievementAge > targetRetirementAge) {
            return `⚠️ Traditional FIRE achievable at age ${traditionalResult.achievementAge.toFixed(1)} (${traditionalResult.achievementYear}), but this is after your target retirement age of ${targetRetirementAge}. Consider increasing savings rate or extending retirement age.`;
          } else {
            // Calculate what portfolio value would be reached by target retirement age
            const yearsToTargetRetirement = targetRetirementAge - currentAge;
            const monthsToTargetRetirement = yearsToTargetRetirement * 12;
            let projectedValue = currentPortfolioValue;
            for (let i = 0; i < monthsToTargetRetirement; i++) {
              projectedValue *= (1 + blendedMonthlyReturn);
              projectedValue += monthlyRecurringInvestment;
            }
            return `❌ Traditional FIRE not achievable by your target retirement age of ${targetRetirementAge}. You would need ${formatCurrency(traditionalFireTarget)} but current trajectory reaches ${formatCurrency(projectedValue)} by age ${targetRetirementAge}.`;
          }
        })()
      },
      
      // Coast FIRE
      coast: {
        target: coastFireTarget,
        achievable: coastResult.achievable,
        years: coastResult.years,
        age: coastResult.achievementAge,
        year: coastResult.achievementYear,
        finalValue: coastResult.finalPortfolioValue,
        message: coastResult.achievable ?
          `✅ YES! You can Coast FIRE at age ${coastResult.achievementAge.toFixed(1)} (${coastResult.achievementYear}). Save ${formatCurrency(coastFireTarget)} by then, STOP investing completely, and you'll still reach Traditional FIRE by age ${targetRetirementAge}.` :
          `❌ Coast FIRE not achievable before target retirement age. You need ${formatCurrency(coastFireTarget)} by age ${targetRetirementAge} to coast, but current trajectory won't reach this amount.`
      },
      
      // Barista FIRE (two-phase approach)
      barista: {
        target: baristaResult.transitionTarget,
        achievable: baristaResult.achievable,
        years: baristaResult.achievable ? baristaResult.totalYears : -1,
        age: baristaResult.achievable ? baristaResult.finalAge : 0,
        year: baristaResult.achievable ? baristaResult.finalYear : 0,
        finalValue: baristaResult.finalPortfolioValue,
        partTimeIncome: baristaAnnualIncome,
        reducedContribution: assumptions.baristaMonthlyContribution,
        transitionAge: baristaResult.transitionAge,
        transitionYear: baristaResult.transitionYear,
        message: (() => {
          if (baristaResult.achievable && baristaResult.withinRetirementWindow) {
            return `✅ YES! You can transition to Barista FIRE at age ${baristaResult.transitionAge.toFixed(1)} (${baristaResult.transitionYear}) with ${formatCurrency(baristaResult.transitionTarget)}. Then work part-time (${formatCurrency(baristaMonthlyIncome)}/month), invest ${formatCurrency(assumptions.baristaMonthlyContribution)}/month, and reach Traditional FIRE at age ${baristaResult.finalAge.toFixed(1)} (${baristaResult.finalYear}).`;
          } else if (baristaResult.achievable && baristaResult.finalAge > targetRetirementAge) {
            return `⚠️ Barista FIRE transition possible, but Traditional FIRE would be achieved at age ${baristaResult.finalAge.toFixed(1)}, after your target retirement age of ${targetRetirementAge}. Consider increasing part-time investment or extending retirement age.`;
          } else {
            return `❌ Barista FIRE transition not achievable within your target retirement age of ${targetRetirementAge}. Consider increasing savings rate or adjusting part-time income expectations.`;
          }
        })()
      }
    };

    return {
      metadata: {
        currentAge,
        currentPortfolioValue,
        monthlyRecurringInvestment,
        targetRetirementAge,
        annualExpenses,
        assumptions,
        blendedAnnualReturn,
        realAnnualReturn,
        baseCurrency,
        calculationMethod: 'Database-First FIRE System',
        dataSourcesUsed: [
          '📊 Current portfolio value from assets table',
          '💰 Monthly recurring investments from recurring_investments table',
          '👤 User age from users table (birth_year)',
          '🎯 Minimal user input (only retirement age, expenses, barista income)',
          '📈 Smart assumptions based on professional standards',
          '🔄 Monthly simulation with compound growth'
        ]
      },
      results,
      calculations: [
        {
          fire_type: 'Traditional',
          target_amount: traditionalFireTarget,
          current_progress: currentPortfolioValue,
          progress_percentage: Math.min((currentPortfolioValue / traditionalFireTarget) * 100, 100),
          years_to_fire: results.traditional.achievable && results.traditional.withinRetirementWindow ? results.traditional.years : -1,
          achieved: (currentPortfolioValue >= traditionalFireTarget) && 
                   (results.traditional.achievable && results.traditional.withinRetirementWindow),
          monthly_investment_needed: monthlyRecurringInvestment,
          coast_fire_explanation: results.traditional.message,
          blended_return: blendedAnnualReturn,
          real_return: realAnnualReturn,
          within_retirement_window: results.traditional.withinRetirementWindow
        },
        {
          fire_type: 'Coast',
          target_amount: coastFireTarget,
          current_progress: currentPortfolioValue,
          progress_percentage: Math.min((currentPortfolioValue / coastFireTarget) * 100, 100),
          years_to_fire: results.coast.achievable ? results.coast.years : -1,
          achieved: (currentPortfolioValue >= coastFireTarget) && results.coast.achievable,
          monthly_investment_needed: monthlyRecurringInvestment,
          coast_fire_explanation: results.coast.message,
          blended_return: blendedAnnualReturn,
          real_return: realAnnualReturn
        },
        {
          fire_type: 'Barista',
          target_amount: results.barista.target || 0,
          current_progress: currentPortfolioValue,
          progress_percentage: results.barista.target > 0 ? Math.min((currentPortfolioValue / results.barista.target) * 100, 100) : 0,
          years_to_fire: results.barista.achievable && results.barista.withinRetirementWindow ? results.barista.years : -1,
          achieved: results.barista.target > 0 ? 
            (currentPortfolioValue >= results.barista.target && results.barista.achievable && results.barista.withinRetirementWindow) : 
            false,
          monthly_investment_needed: monthlyRecurringInvestment,
          barista_annual_income: baristaAnnualIncome,
          coast_fire_explanation: results.barista.message,
          contribution_after_barista: assumptions.baristaMonthlyContribution,
          transition_age: results.barista.transitionAge || 0,
          transition_year: results.barista.transitionYear || 0,
          blended_return: blendedAnnualReturn,
          real_return: realAnnualReturn,
          within_retirement_window: results.barista.withinRetirementWindow
        }
      ]
    };
  };

  useEffect(() => {
    loadFIREData();
    loadRecurringInvestments();
  }, []);

  const loadFIREData = async () => {
    try {
      setLoading(true);
      
      // Get user's base currency
      const userBaseCurrency = user?.base_currency || 'USD';
      setBaseCurrency(userBaseCurrency);
      
      // Calculate user age
      const currentYear = new Date().getFullYear();
      const age = user?.birth_year ? currentYear - user.birth_year : 30;
      setUserAge(age);
      
      // Load assets and calculate real-time portfolio value
      const assetsResponse = await assetAPI.getAssets();
      setAssets(assetsResponse.assets);
      
      // Calculate portfolio valuation using the same service as Dashboard
      const valuation = await assetValuationService.valuatePortfolio(assetsResponse.assets, userBaseCurrency);
      setPortfolioValuation(valuation);
      
      // Load FIRE profile
      const profileResponse = await fireApi.getFIREProfile();
      setFireProfile(profileResponse.fire_profile);
      
      if (profileResponse.fire_profile) {
        // Calculate FIRE progress using real-time portfolio value with comprehensive analysis
        const { progress, calculations } = await calculateFIREProgress(
          profileResponse.fire_profile, 
          valuation.totalValueInBaseCurrency
        );
        setFireProgress(progress);
        setCalculations(calculations);
        
        // Update form with existing data, mapping all comprehensive fields including new ones
        const existingProfile = profileResponse.fire_profile;
        setFormData({
          // Use saved values or fallback to reasonable defaults
          annual_income: existingProfile.annual_income || 1000000,
          annual_savings: existingProfile.annual_savings || 200000,
          annual_expenses: existingProfile.annual_expenses,
          target_retirement_age: existingProfile.target_retirement_age,
          safe_withdrawal_rate: existingProfile.safe_withdrawal_rate,
          expected_return_pre_retirement: existingProfile.expected_return_pre_retirement || existingProfile.expected_annual_return,
          expected_return_post_retirement: existingProfile.expected_return_post_retirement || (existingProfile.expected_annual_return * 0.8),
          expected_inflation_rate: existingProfile.expected_inflation_rate || 0.025,
          other_passive_income: existingProfile.other_passive_income || 0,
          effective_tax_rate: existingProfile.effective_tax_rate || 0.15,
          
          // Enhanced: New fields for sophisticated calculation
          barista_annual_contribution: existingProfile.barista_annual_contribution || 100000,
          inflation_rate: existingProfile.inflation_rate || 0.025,
          
          // Legacy fields for backward compatibility
          expected_annual_return: existingProfile.expected_annual_return,
          barista_annual_income: existingProfile.barista_annual_income,
        });
      }
      
      setError(null);
    } catch (err: any) {
      console.error('Failed to load FIRE data:', err);
      setError(err.response?.data?.message || 'Failed to load FIRE data');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      // Save the FIRE profile
      await fireApi.createOrUpdateFIREProfile(formData);
      setOpenDialog(false);
      
      // Recalculate FIRE progress with current portfolio value using comprehensive analysis
      if (portfolioValuation) {
        const { progress, calculations } = await calculateFIREProgress(
          { ...formData } as FIREProfile, 
          portfolioValuation.totalValueInBaseCurrency
        );
        setFireProgress(progress);
        setCalculations(calculations);
      }
      
      // Reload full data to ensure consistency
      loadFIREData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save FIRE profile');
    }
  };

  const formatCurrency = (amount: number, currency: string = baseCurrency) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatBaseCurrency = (amount: number) => {
    const currency = user?.base_currency || 'USD';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return 'success';
    if (percentage >= 75) return 'info';
    if (percentage >= 50) return 'warning';
    return 'error';
  };

  const getFIREIcon = (fireType: string) => {
    switch (fireType) {
      case 'Traditional': return <GpsFixed />;
      case 'Barista': return <Coffee />;
      case 'Coast': return <BeachAccess />;
      default: return <TrendingUp />;
    }
  };

  const getFIREDescription = (fireType: string) => {
    switch (fireType) {
      case 'Traditional':
        return 'Complete financial independence - live entirely off investment returns';
      case 'Barista':
        return 'Partial financial independence - supplement with part-time income';
      case 'Coast':
        return 'Stop investing now and still reach Traditional FIRE by retirement';
      default:
        return '';
    }
  };

  const getFIRETooltip = (fireType: string) => {
    switch (fireType) {
      case 'Traditional':
        return 'Traditional FIRE: Accumulating a larger portfolio for a higher standard of living. This is the classic FIRE approach where you save enough to maintain your current lifestyle indefinitely without working.';
      case 'Barista':
        return 'Barista FIRE: Working part-time to supplement passive income while enjoying early retirement. You need less savings because you\'ll earn some income from flexible work.';
      case 'Coast':
        return `Coast FIRE: Having enough saved NOW that you can stop investing completely and still reach Traditional FIRE by age ${fireProfile?.target_retirement_age || 'your target retirement age'}. Your current investments will grow through compound interest alone.`;
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '60vh',
        flexDirection: 'column',
        gap: 2,
        p: { xs: 2, md: 3 }
      }}>
        <CircularProgress size={60} />
        <Typography variant="h6" color="text.secondary">
          Loading FIRE calculator...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
      {/* Enhanced Header */}
      <Box sx={{ mb: 4, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1, color: 'primary.main' }}>
            FIRE Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Track your journey to Financial Independence, Retire Early
          </Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          <Button
            variant={debugMode ? "contained" : "outlined"}
            size="small"
            onClick={() => setDebugMode(!debugMode)}
            sx={{ 
              borderRadius: 2,
              color: debugMode ? 'white' : 'text.secondary',
              backgroundColor: debugMode ? 'secondary.main' : 'transparent'
            }}
          >
            🔍 Debug
          </Button>
          <Button
            variant="outlined"
            startIcon={<Calculate />}
            onClick={() => setActiveTab(2)}
            sx={{ borderRadius: 2 }}
          >
            What-If Simulator
          </Button>
          <Button
            variant="contained"
            startIcon={fireProfile ? <Settings /> : <Calculate />}
            onClick={() => setOpenDialog(true)}
            sx={{ 
              borderRadius: 2,
              px: 3,
              py: 1.5,
              textTransform: 'none',
              fontWeight: 'bold',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)',
              }
            }}
          >
            {fireProfile ? 'Update Goals' : 'Set Goals'}
          </Button>
        </Stack>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {!fireProfile ? (
        // Enhanced FIRE setup prompt
        <Card sx={{ 
          borderRadius: 3, 
          border: '1px solid', 
          borderColor: 'grey.200', 
          textAlign: 'center', 
          py: 8,
          background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'
        }}>
          <CardContent>
            <Calculate sx={{ fontSize: 80, color: 'primary.main', mb: 3 }} />
            <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 2 }}>
              Welcome to Your FIRE Journey
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 700, mx: 'auto', fontSize: '1.1rem' }}>
              Set up your Financial Independence goals to unlock powerful insights about your path to early retirement. 
              We'll calculate your Traditional FIRE, Barista FIRE, and Coast FIRE targets based on your personal situation.
            </Typography>
            <Button
              variant="contained"
              size="large"
              startIcon={<Calculate />}
              onClick={() => setOpenDialog(true)}
              sx={{ 
                borderRadius: 3,
                px: 4,
                py: 1.5,
                fontSize: '1.1rem',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)',
                }
              }}
            >
              Start Your FIRE Planning
            </Button>
          </CardContent>
        </Card>
      ) : (
        // Clean FIRE Dashboard with Tab Navigation
        <Box>
          {/* Current Portfolio Status Dashboard */}
          {fireProgress && (
            <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'grey.200', mb: 4 }}>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 3 }}>
                  Current Portfolio Status
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6} md={2.4}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'primary.main', mb: 1 }}>
                        {formatCurrency(fireProgress.current_total_assets)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Current Portfolio Value
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={2.4}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'success.main', mb: 1 }}>
                        {formatCurrency(calculateMonthlyRecurringTotal())}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Monthly Recurring Investments
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={2.4}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'warning.main', mb: 1 }}>
                        {calculations.filter(c => (portfolioValuation?.totalValueInBaseCurrency || 0) >= c.target_amount).length}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Goals Achieved
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={2.4}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'info.main', mb: 1 }}>
                        {recurringInvestments.filter(inv => inv.is_active).length}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Active Investment Plans
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} sm={6} md={2.4}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'secondary.main', mb: 1 }}>
                        {fireProfile?.expected_annual_return || 7}%
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Expected Annual Return
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          )}

          {/* Tab Navigation */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 4 }}>
            <Tabs 
              value={activeTab} 
              onChange={(e, newValue) => setActiveTab(newValue)}
              sx={{
                '& .MuiTab-root': {
                  textTransform: 'none',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  minWidth: 120,
                }
              }}
            >
              <Tab 
                icon={<ShowChart />} 
                label="Dashboard" 
                iconPosition="start"
              />
              <Tab 
                icon={<Timeline />} 
                label="Projections" 
                iconPosition="start"
              />
              <Tab 
                icon={<TuneRounded />} 
                label="What-If Simulator" 
                iconPosition="start"
              />
              <Tab 
                icon={<PieChart />} 
                label="Income Breakdown" 
                iconPosition="start"
              />
            </Tabs>
          </Box>

          {/* Tab Content */}
          {activeTab === 0 && (
            <FIREDashboardContent 
              calculations={calculations}
              portfolioValuation={portfolioValuation}
              fireProfile={fireProfile}
              user={user}
            />
          )}
          
          {activeTab === 1 && (
            <ProjectionsTab 
              fireProgress={fireProgress}
              calculations={calculations}
              portfolioValuation={portfolioValuation}
              fireProfile={fireProfile}
            />
          )}
          
          {activeTab === 2 && (
            <WhatIfSimulatorTab 
              whatIfValues={whatIfValues}
              setWhatIfValues={setWhatIfValues}
              fireProfile={fireProfile}
              portfolioValuation={portfolioValuation}
              recurringInvestments={recurringInvestments}
              calculateMonthlyRecurringTotal={calculateMonthlyRecurringTotal}
            />
          )}
          
          {activeTab === 3 && (
            <IncomeBreakdownTab 
              fireProfile={fireProfile}
              calculations={calculations}
            />
          )}
        </Box>
      )}

      {/* 🔍 Debug Mode: Comprehensive Analysis Display */}
      {debugMode && comprehensiveAnalysis && (
        <Card elevation={0} sx={{ borderRadius: 3, border: '2px solid', borderColor: 'secondary.main', mt: 4 }}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 3, color: 'secondary.main' }}>
              🔍 Comprehensive FIRE Calculation System
            </Typography>
            
            {/* Metadata Display */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                📊 Analysis Metadata
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper elevation={1} sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                      {(comprehensiveAnalysis.metadata.historicalReturn * 100).toFixed(1)}%
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Historical Return
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper elevation={1} sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                      {formatCurrency(comprehensiveAnalysis.metadata.projectedAnnualDividends)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Projected Annual Dividends
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper elevation={1} sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'warning.main' }}>
                      {(comprehensiveAnalysis.metadata.riskAnalysis.volatility * 100).toFixed(1)}%
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Portfolio Volatility
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper elevation={1} sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'info.main' }}>
                      {formatCurrency(comprehensiveAnalysis.metadata.monthlyContributions * 12)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Annual Contributions
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </Box>

            {/* Data Sources */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                🗄️ Database Sources Used
              </Typography>
              <Grid container spacing={1}>
                {comprehensiveAnalysis.metadata.dataSourcesUsed.map((source: string, index: number) => (
                  <Grid item xs={12} sm={6} key={index}>
                    <Chip 
                      label={source} 
                      variant="outlined" 
                      size="small"
                      sx={{ width: '100%', justifyContent: 'flex-start' }}
                    />
                  </Grid>
                ))}
              </Grid>
            </Box>

            {/* Enhanced FIRE Calculations */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                🔥 Enhanced FIRE Calculations
              </Typography>
              <Grid container spacing={3}>
                {comprehensiveAnalysis.calculations.map((calc: any) => (
                  <Grid item xs={12} md={4} key={calc.fire_type}>
                    <Paper elevation={1} sx={{ p: 3 }}>
                      <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, color: 'primary.main' }}>
                        {calc.fire_type} FIRE
                      </Typography>
                      <Stack spacing={1}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2">Target:</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                            {formatCurrency(calc.target_amount)}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2">Progress:</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                            {calc.progress_percentage.toFixed(1)}%
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2">Years to FIRE:</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                            {calc.years_to_fire > 0 ? calc.years_to_fire.toFixed(1) : 'Achieved!'}
                          </Typography>
                        </Box>
                        {calc.monte_carlo_success_rate && (
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="body2">Success Rate:</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                              {calc.monte_carlo_success_rate.toFixed(1)}%
                            </Typography>
                          </Box>
                        )}
                        {calc.dividend_income_annual && (
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="body2">Annual Dividends:</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                              {formatCurrency(calc.dividend_income_annual)}
                            </Typography>
                          </Box>
                        )}
                      </Stack>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Box>

            {/* Calculation Enhancements */}
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                ⚡ Calculation Enhancements
              </Typography>
              <Grid container spacing={1}>
                {comprehensiveAnalysis.metadata.calculationEnhancements.map((enhancement: string, index: number) => (
                  <Grid item xs={12} sm={6} key={index}>
                    <Chip 
                      label={enhancement} 
                      color="secondary"
                      variant="outlined" 
                      size="small"
                      sx={{ width: '100%', justifyContent: 'flex-start' }}
                    />
                  </Grid>
                ))}
              </Grid>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Simplified FIRE Profile Dialog - Database-First Approach */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {fireProfile ? 'Update FIRE Goals' : 'Set FIRE Goals'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <Alert severity="info">
              <Typography variant="body2">
                We'll use your existing portfolio data and recurring investments. 
                Just provide these 3 essential retirement planning details:
              </Typography>
            </Alert>

            {/* Essential Information Only */}
            <Paper elevation={0} sx={{ p: 3, bgcolor: 'grey.50' }}>
              <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>
                🎯 Essential Retirement Information
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    label="Annual Expenses in Retirement"
                    type="number"
                    value={formData.annual_expenses}
                    onChange={(e) => setFormData({ ...formData, annual_expenses: parseFloat(e.target.value) || 0 })}
                    helperText="How much do you expect to spend per year in retirement? (in today's dollars)"
                    fullWidth
                    required
                    InputProps={{
                      startAdornment: <Typography sx={{ mr: 1 }}>{user?.base_currency || 'USD'}</Typography>
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Target Retirement Age"
                    type="number"
                    value={formData.target_retirement_age}
                    onChange={(e) => setFormData({ ...formData, target_retirement_age: parseInt(e.target.value) || 65 })}
                    helperText="When do you want to fully retire?"
                    fullWidth
                    required
                    inputProps={{ min: 40, max: 80 }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Barista FIRE Annual Contribution"
                    type="number"
                    value={formData.barista_annual_contribution}
                    onChange={(e) => setFormData({ ...formData, barista_annual_contribution: parseFloat(e.target.value) || 0 })}
                    helperText="How much can you invest annually while working part-time?"
                    fullWidth
                    InputProps={{
                      startAdornment: <Typography sx={{ mr: 1 }}>{user?.base_currency || 'USD'}</Typography>
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Inflation Rate"
                    type="number"
                    value={(formData.inflation_rate * 100).toFixed(1)}
                    onChange={(e) => setFormData({ ...formData, inflation_rate: (parseFloat(e.target.value) || 2.5) / 100 })}
                    helperText="Expected annual inflation rate (2-4% typical)"
                    fullWidth
                    inputProps={{ min: 1, max: 6, step: 0.1 }}
                    InputProps={{
                      endAdornment: <Typography sx={{ ml: 1 }}>%</Typography>
                    }}
                  />
                </Grid>
              </Grid>
            </Paper>

            {/* Optional Advanced Settings */}
            <Paper elevation={0} sx={{ p: 3, bgcolor: 'grey.50' }}>
              <Typography variant="h6" sx={{ mb: 2, color: 'warning.main' }}>
                ⚙️ Advanced Settings (Optional)
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Safe Withdrawal Rate"
                    type="number"
                    value={(formData.safe_withdrawal_rate * 100).toFixed(1)}
                    onChange={(e) => setFormData({ ...formData, safe_withdrawal_rate: (parseFloat(e.target.value) || 4) / 100 })}
                    helperText="3-5% recommended (4% is standard)"
                    fullWidth
                    inputProps={{ min: 3, max: 5, step: 0.1 }}
                    InputProps={{
                      endAdornment: <Typography sx={{ ml: 1 }}>%</Typography>
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Expected Annual Return"
                    type="number"
                    value={(formData.expected_annual_return * 100).toFixed(1)}
                    onChange={(e) => setFormData({ ...formData, expected_annual_return: (parseFloat(e.target.value) || 7) / 100 })}
                    helperText="Expected portfolio return (6-8% typical)"
                    fullWidth
                    inputProps={{ min: 4, max: 12, step: 0.1 }}
                    InputProps={{
                      endAdornment: <Typography sx={{ ml: 1 }}>%</Typography>
                    }}
                  />
                </Grid>
              </Grid>
            </Paper>

            {/* Data We'll Use From Database */}
            <Paper elevation={0} sx={{ p: 3, bgcolor: 'success.50' }}>
              <Typography variant="h6" sx={{ mb: 2, color: 'success.main' }}>
                ✅ Data We'll Use From Your Account
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Current Portfolio Value:</strong><br />
                    {formatCurrency(portfolioValuation?.totalValueInBaseCurrency || 0)}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Monthly Recurring Investments:</strong><br />
                    {formatCurrency(calculateMonthlyRecurringTotal())}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Your Current Age:</strong><br />
                    {user?.birth_year ? new Date().getFullYear() - user.birth_year : 'Not set'} years old
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Base Currency:</strong><br />
                    {user?.base_currency || 'USD'}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSaveProfile}
            disabled={
              formData.annual_expenses <= 0 ||
              formData.target_retirement_age <= 0
            }
          >
            {fireProfile ? 'Update Goals' : 'Calculate FIRE Goals'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// FIRE Dashboard Content Component (Tab 0)
const FIREDashboardContent: React.FC<{
  calculations: FIRECalculation[];
  portfolioValuation: PortfolioValuation | null;
  fireProfile: FIREProfile | null;
  user: any;
}> = ({ calculations, portfolioValuation, fireProfile, user }) => {
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: user?.base_currency || 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getTimeToFIRE = (calculation: FIRECalculation) => {
    // If already achieved
    if (calculation.achieved) {
      return 'Already achieved!';
    }
    
    // If not achievable
    if (!calculation.years_remaining || calculation.years_remaining <= 0) {
      return 'Not achievable with current plan';
    }
    
    const years = Math.floor(calculation.years_remaining);
    const months = Math.round((calculation.years_remaining - years) * 12);
    
    if (years === 0) {
      return `${months} months`;
    } else if (months === 0) {
      return `${years} years`;
    } else {
      return `${years} years, ${months} months`;
    }
  };

  const getAchievementDate = (calculation: FIRECalculation) => {
    // If already achieved
    if (calculation.achieved) {
      return 'Now';
    }
    
    // If not achievable
    if (!calculation.years_remaining || calculation.years_remaining <= 0) {
      return 'Not achievable';
    }
    
    const currentYear = new Date().getFullYear();
    const currentAge = user?.birth_year ? currentYear - user.birth_year : 30;
    const achievementAge = Math.round(currentAge + calculation.years_remaining);
    const achievementYear = Math.round(currentYear + calculation.years_remaining);
    
    return `Age ${achievementAge} (${achievementYear})`;
  };

  const getFIREColor = (fireType: string) => {
    switch (fireType) {
      case 'Coast': return '#4CAF50';
      case 'Barista': return '#FF9800';
      case 'Traditional': return '#2196F3';
      default: return '#666';
    }
  };

  const getFIREDescription = (fireType: string) => {
    switch (fireType) {
      case 'Traditional':
        return 'Complete financial independence - live entirely off investment returns';
      case 'Barista':
        return 'Partial financial independence - supplement with part-time income';
      case 'Coast':
        return 'Stop investing now and still reach Traditional FIRE by retirement';
      default:
        return '';
    }
  };

  return (
    <Grid container spacing={3}>
      {calculations.map((calc, index) => {
        // ✅ Use backend's progress_percentage directly (already capped at 100%)
        const progressPercentage = calc.progress_percentage;
        
        // ✅ Use backend's achieved status directly
        const isAchieved = calc.achieved;
        
        // ✅ Get raw progress for over-achievement display
        const rawProgress = calc.raw_progress_percentage || progressPercentage;
        
        // ✅ Add validation to ensure consistency
        const isConsistent = isAchieved ? progressPercentage >= 99.9 : progressPercentage < 100;
        
        if (!isConsistent) {
          console.warn(`FIRE Card Inconsistency Detected:`, {
            fireType: calc.fire_type,
            achieved: isAchieved,
            progressPercentage: progressPercentage,
            rawProgress: rawProgress,
            currentProgress: calc.current_progress,
            targetAmount: calc.target_amount
          });
        }
        
        return (
          <Grid item xs={12} md={4} key={calc.fire_type}>
            <Card 
              elevation={0}
              sx={{ 
                borderRadius: 3,
                border: '2px solid',
                borderColor: isAchieved ? getFIREColor(calc.fire_type) : 'grey.200',
                background: isAchieved 
                  ? `linear-gradient(135deg, ${getFIREColor(calc.fire_type)}15 0%, ${getFIREColor(calc.fire_type)}05 100%)`
                  : 'white',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: 3
                },
                minHeight: 320 // Ensure consistent card height
              }}
            >
              <CardContent sx={{ p: 3 }}>
                {/* Header with Icon and Title */}
                <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 2,
                      bgcolor: `${getFIREColor(calc.fire_type)}20`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: getFIREColor(calc.fire_type)
                    }}
                  >
                    {calc.fire_type === 'Coast' && <GpsFixed />}
                    {calc.fire_type === 'Barista' && <Coffee />}
                    {calc.fire_type === 'Traditional' && <BeachAccess />}
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                      {calc.fire_type} FIRE
                    </Typography>
                    {/* ✅ Consistent badge logic */}
                    {isAchieved && (
                      <Chip 
                        label="Achieved!" 
                        size="small" 
                        sx={{ 
                          bgcolor: getFIREColor(calc.fire_type), 
                          color: 'white',
                          fontWeight: 'bold'
                        }} 
                      />
                    )}
                  </Box>
                  {/* ✅ Consistent achievement icon */}
                  {isAchieved && (
                    <CheckCircle sx={{ color: getFIREColor(calc.fire_type), fontSize: 32 }} />
                  )}
                </Stack>

                {/* Target Amount - Prominent Display */}
                <Box sx={{ mb: 3, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Target Amount
                  </Typography>
                  <Typography 
                    variant="h4" 
                    sx={{ 
                      fontWeight: 'bold',
                      color: isAchieved ? getFIREColor(calc.fire_type) : 'text.primary',
                      mb: 1
                    }}
                  >
                    {formatCurrency(calc.target_amount)}
                  </Typography>
                </Box>

                {/* When - Achievement Timeline */}
                <Box sx={{ mb: 3, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {isAchieved ? 'Achieved' : 'Target Achievement'}
                  </Typography>
                  <Typography 
                    variant="h6" 
                    sx={{ 
                      fontWeight: 'bold',
                      color: isAchieved ? getFIREColor(calc.fire_type) : 'text.primary'
                    }}
                  >
                    {getAchievementDate(calc)}
                  </Typography>
                  {!isAchieved && (
                    <Typography variant="body2" color="text.secondary">
                      {getTimeToFIRE(calc)} to go
                    </Typography>
                  )}
                </Box>

                {/* ✅ Consistent Progress Bar */}
                <Box sx={{ mb: 2 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      Progress
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      {/* ✅ Show actual progress, even if >100% */}
                      {isAchieved && rawProgress > 100 
                        ? `${rawProgress.toFixed(1)}%` 
                        : `${progressPercentage.toFixed(1)}%`
                      }
                    </Typography>
                  </Stack>
                  <LinearProgress 
                    variant="determinate" 
                    value={Math.min(progressPercentage, 100)} // Cap visual progress at 100%
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: 'grey.200',
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: getFIREColor(calc.fire_type),
                        borderRadius: 4,
                      }
                    }}
                  />
                  {/* ✅ Show over-achievement indicator */}
                  {isAchieved && rawProgress > 100 && (
                    <Typography variant="caption" color="success.main" sx={{ mt: 0.5, display: 'block', textAlign: 'center' }}>
                      🎉 {(rawProgress - 100).toFixed(1)}% over target!
                    </Typography>
                  )}
                </Box>

                {/* Description */}
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem', lineHeight: 1.4 }}>
                  {getFIREDescription(calc.fire_type)}
                </Typography>

                {/* Special Messages for Each FIRE Type */}
                {calc.coast_fire_explanation && (
                  <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                    <Typography variant="body2" sx={{ fontSize: '0.8rem', fontStyle: 'italic' }}>
                      {calc.coast_fire_explanation}
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        );
      })}
    </Grid>
  );
};

// Projections Tab Component
const ProjectionsTab: React.FC<{
  fireProgress: FIREProgress | null;
  calculations: FIRECalculation[];
  portfolioValuation: PortfolioValuation | null;
  fireProfile: FIREProfile | null;
}> = ({ fireProgress, calculations, portfolioValuation, fireProfile }) => {
  const [projectionYears, setProjectionYears] = useState(30);
  const [showDetails, setShowDetails] = useState(false);
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Generate projection data for visualization
  const generateProjectionData = () => {
    if (!fireProfile || !portfolioValuation) return [];
    
    const currentValue = portfolioValuation.totalValueInBaseCurrency;
    const monthlyContribution = 5000; // Default or from recurring investments
    const annualReturn = fireProfile.expected_annual_return || 0.07;
    const monthlyReturn = Math.pow(1 + annualReturn, 1/12) - 1;
    
    const data = [];
    let portfolioValue = currentValue;
    
    for (let year = 0; year <= projectionYears; year++) {
      const months = year * 12;
      
      // Calculate future value with monthly contributions
      if (months === 0) {
        portfolioValue = currentValue;
      } else {
        // Reset and recalculate from beginning
        portfolioValue = currentValue;
        for (let m = 0; m < months; m++) {
          portfolioValue = portfolioValue * (1 + monthlyReturn) + monthlyContribution;
        }
      }
      
      data.push({
        year: new Date().getFullYear() + year,
        portfolioValue: portfolioValue,
        age: (fireProfile.target_retirement_age - projectionYears) + year,
      });
    }
    
    return data;
  };

  const projectionData = generateProjectionData();
  const maxValue = Math.max(...projectionData.map(d => d.portfolioValue));
  const traditionalTarget = calculations.find(c => c.fire_type === 'Traditional')?.target_amount || 0;
  const baristaTarget = calculations.find(c => c.fire_type === 'Barista')?.target_amount || 0;
  const coastTarget = calculations.find(c => c.fire_type === 'Coast')?.target_amount || 0;

  return (
    <Box>
      <Grid container spacing={3}>
        {/* Projection Chart */}
        <Grid item xs={12}>
          <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'grey.200', p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                Portfolio Growth Projection
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <Typography variant="body2">Years to project:</Typography>
                <Slider
                  value={projectionYears}
                  onChange={(e, value) => setProjectionYears(value as number)}
                  min={10}
                  max={50}
                  step={5}
                  sx={{ width: 120 }}
                  valueLabelDisplay="auto"
                />
                <Button
                  size="small"
                  variant={showDetails ? "contained" : "outlined"}
                  onClick={() => setShowDetails(!showDetails)}
                >
                  Details
                </Button>
              </Box>
            </Box>
            
            {/* Simple Visual Chart */}
            <Box sx={{ height: 300, position: 'relative', bgcolor: 'grey.50', borderRadius: 2, p: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', height: '100%' }}>
                {projectionData.filter((_, index) => index % 5 === 0).map((point, index) => {
                  const height = (point.portfolioValue / maxValue) * 250;
                  const isCurrentYear = point.year === new Date().getFullYear();
                  
                  return (
                    <Box key={point.year} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <Tooltip title={`${point.year}: ${formatCurrency(point.portfolioValue)}`}>
                        <Box
                          sx={{
                            width: 20,
                            height: height,
                            bgcolor: isCurrentYear ? 'primary.main' : 'info.main',
                            borderRadius: 1,
                            mb: 1,
                            cursor: 'pointer',
                            '&:hover': { opacity: 0.8 }
                          }}
                        />
                      </Tooltip>
                      <Typography variant="caption" sx={{ transform: 'rotate(-45deg)', fontSize: '0.7rem' }}>
                        {point.year}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
              
              {/* FIRE Target Lines */}
              {traditionalTarget > 0 && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: 16 + (250 - (traditionalTarget / maxValue) * 250),
                    left: 16,
                    right: 16,
                    height: 2,
                    bgcolor: 'success.main',
                    opacity: 0.7,
                    '&::after': {
                      content: '"Traditional FIRE"',
                      position: 'absolute',
                      right: 0,
                      top: -20,
                      fontSize: '0.75rem',
                      color: 'success.main',
                      fontWeight: 'bold'
                    }
                  }}
                />
              )}
            </Box>
          </Card>
        </Grid>

        {/* Projection Details */}
        {showDetails && (
          <Grid item xs={12}>
            <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'grey.200', p: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 3 }}>
                Detailed Projections
              </Typography>
              <Grid container spacing={2}>
                {projectionData.filter((_, index) => index % 5 === 0).map((point) => (
                  <Grid item xs={12} sm={6} md={4} key={point.year}>
                    <Paper elevation={1} sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                        {point.year}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        Age {point.age}
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                        {formatCurrency(point.portfolioValue)}
                      </Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Card>
          </Grid>
        )}

        {/* Key Milestones */}
        <Grid item xs={12}>
          <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'grey.200', p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 3 }}>
              Key Milestones
            </Typography>
            <Grid container spacing={2}>
              {calculations.map((calc) => (
                <Grid item xs={12} md={4} key={calc.fire_type}>
                  <Paper elevation={1} sx={{ p: 3, textAlign: 'center' }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
                      {calc.fire_type} FIRE
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'primary.main', mb: 1 }}>
                      {formatCurrency(calc.target_amount)}
                    </Typography>
                    {calc.years_remaining && calc.years_remaining > 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        {calc.years_remaining.toFixed(1)} years to achieve
                      </Typography>
                    ) : calc.achieved ? (
                      <Chip label="Achieved!" color="success" size="small" />
                    ) : (
                      <Typography variant="body2" color="error">
                        Not achievable with current plan
                      </Typography>
                    )}
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

// What-If Simulator Tab Component
const WhatIfSimulatorTab: React.FC<{
  whatIfValues: any;
  setWhatIfValues: (values: any) => void;
  fireProfile: FIREProfile | null;
  portfolioValuation: PortfolioValuation | null;
  recurringInvestments: RecurringInvestment[];
  calculateMonthlyRecurringTotal: () => number;
}> = ({ whatIfValues, setWhatIfValues, fireProfile, portfolioValuation, recurringInvestments, calculateMonthlyRecurringTotal }) => {
  
  const handleSliderChange = (key: string) => (event: Event, newValue: number | number[]) => {
    setWhatIfValues(prev => ({
      ...prev,
      [key]: newValue as number
    }));
  };

  const currentMonthlyInvestment = calculateMonthlyRecurringTotal();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Real-time FIRE calculations based on what-if values
  const calculateWhatIfFIRE = () => {
    if (!fireProfile || !portfolioValuation) return null;

    const currentValue = portfolioValuation.totalValueInBaseCurrency;
    const monthlyContribution = whatIfValues.monthlyContribution;
    const annualExpenses = whatIfValues.annualExpenses;
    const expectedReturn = whatIfValues.expectedReturn / 100;
    const targetRetirementAge = whatIfValues.targetRetirementAge;
    const safeWithdrawalRate = fireProfile.safe_withdrawal_rate || 0.04;
    
    // Calculate FIRE targets
    const traditionalFireTarget = annualExpenses / safeWithdrawalRate;
    const baristaFireTarget = Math.max(0, (annualExpenses - whatIfValues.partTimeIncome) / safeWithdrawalRate);
    
    // Calculate years to achieve each target
    const calculateYearsToTarget = (targetAmount: number) => {
      if (currentValue >= targetAmount) return 0;
      
      const monthlyRate = Math.pow(1 + expectedReturn, 1/12) - 1;
      let portfolioValue = currentValue;
      let months = 0;
      const maxMonths = 50 * 12; // 50 years max
      
      while (portfolioValue < targetAmount && months < maxMonths) {
        portfolioValue = portfolioValue * (1 + monthlyRate) + monthlyContribution;
        months++;
      }
      
      return months < maxMonths ? months / 12 : -1; // -1 means not achievable
    };

    const yearsToTraditional = calculateYearsToTarget(traditionalFireTarget);
    const yearsToBarista = calculateYearsToTarget(baristaFireTarget);
    
    // Calculate current age
    const currentYear = new Date().getFullYear();
    const currentAge = 30; // Default, should get from user
    
    return {
      traditionalFire: {
        target: traditionalFireTarget,
        years: yearsToTraditional,
        achievementAge: yearsToTraditional > 0 ? currentAge + yearsToTraditional : currentAge,
        achievable: yearsToTraditional > 0 && (currentAge + yearsToTraditional) <= targetRetirementAge
      },
      baristaFire: {
        target: baristaFireTarget,
        years: yearsToBarista,
        achievementAge: yearsToBarista > 0 ? currentAge + yearsToBarista : currentAge,
        achievable: yearsToBarista > 0 && (currentAge + yearsToBarista) <= targetRetirementAge
      },
      currentScenario: {
        monthlyContribution,
        annualExpenses,
        expectedReturn: expectedReturn * 100,
        targetRetirementAge
      }
    };
  };

  const whatIfResults = calculateWhatIfFIRE();

  // Calculate impact compared to current plan
  const calculateImpact = () => {
    if (!whatIfResults) return null;
    
    const currentMonthlyDiff = whatIfValues.monthlyContribution - currentMonthlyInvestment;
    const currentExpensesDiff = whatIfValues.annualExpenses - (fireProfile?.annual_expenses || 0);
    
    return {
      monthlyContributionDiff: currentMonthlyDiff,
      annualExpensesDiff: currentExpensesDiff,
      monthlyContributionImpact: currentMonthlyDiff > 0 ? 'increase' : currentMonthlyDiff < 0 ? 'decrease' : 'same',
      expensesImpact: currentExpensesDiff > 0 ? 'increase' : currentExpensesDiff < 0 ? 'decrease' : 'same'
    };
  };

  const impact = calculateImpact();

  return (
    <Box>
      <Grid container spacing={4}>
        <Grid item xs={12} md={6}>
          <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'grey.200', p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 3 }}>
              Adjust Your Parameters
            </Typography>
            
            <Box sx={{ mb: 4 }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Monthly Contribution: {formatCurrency(whatIfValues.monthlyContribution)}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                Current actual: {formatCurrency(currentMonthlyInvestment)}
                {impact && impact.monthlyContributionDiff !== 0 && (
                  <Chip 
                    label={`${impact.monthlyContributionImpact === 'increase' ? '+' : ''}${formatCurrency(impact.monthlyContributionDiff)}`}
                    size="small"
                    color={impact.monthlyContributionImpact === 'increase' ? 'success' : 'warning'}
                    sx={{ ml: 1 }}
                  />
                )}
              </Typography>
              <Slider
                value={whatIfValues.monthlyContribution}
                onChange={handleSliderChange('monthlyContribution')}
                min={1000}
                max={20000}
                step={500}
                valueLabelDisplay="auto"
                valueLabelFormat={(value) => formatCurrency(value)}
              />
            </Box>

            <Box sx={{ mb: 4 }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Annual Expenses: {formatCurrency(whatIfValues.annualExpenses)}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                Current plan: {formatCurrency(fireProfile?.annual_expenses || 0)}
                {impact && impact.annualExpensesDiff !== 0 && (
                  <Chip 
                    label={`${impact.annualExpensesDiff > 0 ? '+' : ''}${formatCurrency(impact.annualExpensesDiff)}`}
                    size="small"
                    color={impact.expensesImpact === 'decrease' ? 'success' : 'warning'}
                    sx={{ ml: 1 }}
                  />
                )}
              </Typography>
              <Slider
                value={whatIfValues.annualExpenses}
                onChange={handleSliderChange('annualExpenses')}
                min={500000}
                max={3000000}
                step={50000}
                valueLabelDisplay="auto"
                valueLabelFormat={(value) => formatCurrency(value)}
              />
            </Box>

            <Box sx={{ mb: 4 }}>
              <Typography variant="body2" sx={{ mb: 2 }}>
                Target Retirement Age: {whatIfValues.targetRetirementAge}
              </Typography>
              <Slider
                value={whatIfValues.targetRetirementAge}
                onChange={handleSliderChange('targetRetirementAge')}
                min={40}
                max={70}
                step={1}
                valueLabelDisplay="auto"
              />
            </Box>

            <Box sx={{ mb: 4 }}>
              <Typography variant="body2" sx={{ mb: 2 }}>
                Expected Annual Return: {whatIfValues.expectedReturn}%
              </Typography>
              <Slider
                value={whatIfValues.expectedReturn}
                onChange={handleSliderChange('expectedReturn')}
                min={4}
                max={12}
                step={0.5}
                valueLabelDisplay="auto"
                valueLabelFormat={(value) => `${value}%`}
              />
            </Box>

            <Box sx={{ mb: 4 }}>
              <Typography variant="body2" sx={{ mb: 2 }}>
                Part-time Annual Income: {formatCurrency(whatIfValues.partTimeIncome)}
              </Typography>
              <Slider
                value={whatIfValues.partTimeIncome}
                onChange={handleSliderChange('partTimeIncome')}
                min={0}
                max={1000000}
                step={50000}
                valueLabelDisplay="auto"
                valueLabelFormat={(value) => formatCurrency(value)}
              />
            </Box>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'grey.200', p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 3 }}>
              Real-time Impact Analysis
            </Typography>
            
            {whatIfResults ? (
              <Stack spacing={3}>
                {/* Traditional FIRE Results */}
                <Paper elevation={1} sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, color: 'primary.main' }}>
                    Traditional FIRE
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Target Amount:</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                        {formatCurrency(whatIfResults.traditionalFire.target)}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Time to Achieve:</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                        {whatIfResults.traditionalFire.years > 0 
                          ? `${whatIfResults.traditionalFire.years.toFixed(1)} years`
                          : whatIfResults.traditionalFire.years === 0 
                            ? 'Already achieved!'
                            : 'Not achievable'
                        }
                      </Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="body2" color="text.secondary">Achievement Age:</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                        Age {whatIfResults.traditionalFire.achievementAge.toFixed(0)}
                        {whatIfResults.traditionalFire.achievable ? (
                          <Chip label="Within target!" color="success" size="small" sx={{ ml: 1 }} />
                        ) : (
                          <Chip label="After target age" color="warning" size="small" sx={{ ml: 1 }} />
                        )}
                      </Typography>
                    </Grid>
                  </Grid>
                </Paper>

                {/* Barista FIRE Results */}
                <Paper elevation={1} sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, color: 'warning.main' }}>
                    Barista FIRE
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Target Amount:</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                        {formatCurrency(whatIfResults.baristaFire.target)}
                      </Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2" color="text.secondary">Time to Achieve:</Typography>
                      <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                        {whatIfResults.baristaFire.years > 0 
                          ? `${whatIfResults.baristaFire.years.toFixed(1)} years`
                          : whatIfResults.baristaFire.years === 0 
                            ? 'Already achieved!'
                            : 'Not achievable'
                        }
                      </Typography>
                    </Grid>
                    <Grid item xs={12}>
                      <Typography variant="body2" color="text.secondary">Achievement Age:</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                        Age {whatIfResults.baristaFire.achievementAge.toFixed(0)}
                        {whatIfResults.baristaFire.achievable ? (
                          <Chip label="Within target!" color="success" size="small" sx={{ ml: 1 }} />
                        ) : (
                          <Chip label="After target age" color="warning" size="small" sx={{ ml: 1 }} />
                        )}
                      </Typography>
                    </Grid>
                  </Grid>
                </Paper>

                {/* Key Insights */}
                <Paper elevation={1} sx={{ p: 3, bgcolor: 'info.50' }}>
                  <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, color: 'info.main' }}>
                    💡 Key Insights
                  </Typography>
                  <Stack spacing={1}>
                    {impact && impact.monthlyContributionDiff > 0 && (
                      <Typography variant="body2">
                        📈 Increasing monthly contributions by {formatCurrency(impact.monthlyContributionDiff)} could accelerate your FIRE timeline
                      </Typography>
                    )}
                    {impact && impact.annualExpensesDiff < 0 && (
                      <Typography variant="body2">
                        💰 Reducing annual expenses by {formatCurrency(Math.abs(impact.annualExpensesDiff))} significantly lowers your FIRE target
                      </Typography>
                    )}
                    {whatIfResults.traditionalFire.years > 0 && whatIfResults.baristaFire.years > 0 && (
                      <Typography variant="body2">
                        ⚡ Barista FIRE is {(whatIfResults.traditionalFire.years - whatIfResults.baristaFire.years).toFixed(1)} years faster than Traditional FIRE
                      </Typography>
                    )}
                  </Stack>
                </Paper>
              </Stack>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <TuneRounded sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
                <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                  Adjust the parameters to see real-time impact analysis
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Current monthly investment: {formatCurrency(currentMonthlyInvestment)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Active plans: {recurringInvestments.filter(inv => inv.is_active).length}
                </Typography>
              </Box>
            )}
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

// Income Breakdown Tab Component
const IncomeBreakdownTab: React.FC<{
  fireProfile: FIREProfile | null;
  calculations: FIRECalculation[];
}> = ({ fireProfile, calculations }) => {
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const calculateIncomeBreakdown = () => {
    if (!fireProfile || calculations.length === 0) return null;

    const safeWithdrawalRate = fireProfile.safe_withdrawal_rate || 0.04;
    const traditionalCalc = calculations.find(c => c.fire_type === 'Traditional');
    const baristaCalc = calculations.find(c => c.fire_type === 'Barista');
    
    if (!traditionalCalc || !baristaCalc) return null;

    // Traditional FIRE Income
    const traditionalInvestmentIncome = traditionalCalc.target_amount * safeWithdrawalRate;
    
    // Barista FIRE Income
    const baristaInvestmentIncome = baristaCalc.target_amount * safeWithdrawalRate;
    const baristaPartTimeIncome = fireProfile.barista_annual_income || 0;
    const baristaTotalIncome = baristaInvestmentIncome + baristaPartTimeIncome;

    return {
      traditional: {
        investmentIncome: traditionalInvestmentIncome,
        totalIncome: traditionalInvestmentIncome,
        breakdown: [
          { source: 'Investment Returns', amount: traditionalInvestmentIncome, percentage: 100 }
        ]
      },
      barista: {
        investmentIncome: baristaInvestmentIncome,
        partTimeIncome: baristaPartTimeIncome,
        totalIncome: baristaTotalIncome,
        breakdown: [
          { 
            source: 'Investment Returns', 
            amount: baristaInvestmentIncome, 
            percentage: (baristaInvestmentIncome / baristaTotalIncome) * 100 
          },
          { 
            source: 'Part-time Work', 
            amount: baristaPartTimeIncome, 
            percentage: (baristaPartTimeIncome / baristaTotalIncome) * 100 
          }
        ]
      }
    };
  };

  const incomeData = calculateIncomeBreakdown();

  if (!incomeData) {
    return (
      <Box>
        <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'grey.200', p: 4, textAlign: 'center' }}>
          <PieChart sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
          <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 2 }}>
            Retirement Income Breakdown
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Set up your FIRE profile to see detailed retirement income breakdowns.
          </Typography>
        </Card>
      </Box>
    );
  }

  return (
    <Box>
      <Grid container spacing={3}>
        {/* Traditional FIRE Income */}
        <Grid item xs={12} md={6}>
          <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'grey.200', p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 3, color: 'primary.main' }}>
              Traditional FIRE Income
            </Typography>
            
            {/* Total Income Display */}
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                {formatCurrency(incomeData.traditional.totalIncome)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Annual Retirement Income
              </Typography>
            </Box>

            {/* Visual Breakdown */}
            <Box sx={{ mb: 3 }}>
              <Box
                sx={{
                  height: 120,
                  width: '100%',
                  bgcolor: 'primary.main',
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 'bold'
                }}
              >
                100% Investment Returns
              </Box>
            </Box>

            {/* Detailed Breakdown */}
            <Stack spacing={2}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2">Investment Portfolio:</Typography>
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                  {formatCurrency(calculations.find(c => c.fire_type === 'Traditional')?.target_amount || 0)}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2">Safe Withdrawal Rate:</Typography>
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                  {((fireProfile?.safe_withdrawal_rate || 0.04) * 100).toFixed(1)}%
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2">Monthly Income:</Typography>
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                  {formatCurrency(incomeData.traditional.totalIncome / 12)}
                </Typography>
              </Box>
            </Stack>
          </Card>
        </Grid>

        {/* Barista FIRE Income */}
        <Grid item xs={12} md={6}>
          <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'grey.200', p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 3, color: 'warning.main' }}>
              Barista FIRE Income
            </Typography>
            
            {/* Total Income Display */}
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'warning.main' }}>
                {formatCurrency(incomeData.barista.totalIncome)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Annual Retirement Income
              </Typography>
            </Box>

            {/* Visual Breakdown */}
            <Box sx={{ mb: 3 }}>
              <Stack direction="row" sx={{ height: 120, borderRadius: 2, overflow: 'hidden' }}>
                {incomeData.barista.breakdown.map((item, index) => (
                  <Box
                    key={item.source}
                    sx={{
                      width: `${item.percentage}%`,
                      bgcolor: index === 0 ? 'warning.main' : 'info.main',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: 'bold',
                      fontSize: '0.9rem',
                      textAlign: 'center',
                      p: 1
                    }}
                  >
                    {item.percentage.toFixed(0)}%<br />
                    {item.source}
                  </Box>
                ))}
              </Stack>
            </Box>

            {/* Detailed Breakdown */}
            <Stack spacing={2}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2">Investment Income:</Typography>
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                  {formatCurrency(incomeData.barista.investmentIncome)}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2">Part-time Income:</Typography>
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                  {formatCurrency(incomeData.barista.partTimeIncome)}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2">Monthly Total:</Typography>
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                  {formatCurrency(incomeData.barista.totalIncome / 12)}
                </Typography>
              </Box>
            </Stack>
          </Card>
        </Grid>

        {/* Income Comparison */}
        <Grid item xs={12}>
          <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'grey.200', p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 3 }}>
              Income Strategy Comparison
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Paper elevation={1} sx={{ p: 3, textAlign: 'center' }}>
                  <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
                    Traditional FIRE
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'primary.main', mb: 1 }}>
                    {formatCurrency(incomeData.traditional.totalIncome)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    100% passive income
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    No work required
                  </Typography>
                </Paper>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Paper elevation={1} sx={{ p: 3, textAlign: 'center' }}>
                  <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
                    Barista FIRE
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'warning.main', mb: 1 }}>
                    {formatCurrency(incomeData.barista.totalIncome)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {incomeData.barista.breakdown[0].percentage.toFixed(0)}% passive income
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {incomeData.barista.breakdown[1].percentage.toFixed(0)}% part-time work
                  </Typography>
                </Paper>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Paper elevation={1} sx={{ p: 3, textAlign: 'center' }}>
                  <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
                    Difference
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'info.main', mb: 1 }}>
                    {formatCurrency(Math.abs(incomeData.traditional.totalIncome - incomeData.barista.totalIncome))}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {incomeData.traditional.totalIncome > incomeData.barista.totalIncome ? 'Traditional higher' : 'Barista higher'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Monthly: {formatCurrency(Math.abs(incomeData.traditional.totalIncome - incomeData.barista.totalIncome) / 12)}
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </Card>
        </Grid>

        {/* Key Insights */}
        <Grid item xs={12}>
          <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'info.200', p: 3, bgcolor: 'info.50' }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 3, color: 'info.main' }}>
              💡 Income Strategy Insights
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  <strong>Traditional FIRE Benefits:</strong>
                </Typography>
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  <li>Complete financial freedom</li>
                  <li>No work obligations</li>
                  <li>Predictable passive income</li>
                  <li>Maximum flexibility</li>
                </ul>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  <strong>Barista FIRE Benefits:</strong>
                </Typography>
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  <li>Earlier retirement possible</li>
                  <li>Lower savings target</li>
                  <li>Maintain social connections</li>
                  <li>Flexible work schedule</li>
                </ul>
              </Grid>
            </Grid>

            <Box sx={{ mt: 3, p: 2, bgcolor: 'white', borderRadius: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                💰 Portfolio Requirements:
              </Typography>
              <Typography variant="body2">
                • Traditional FIRE: {formatCurrency(calculations.find(c => c.fire_type === 'Traditional')?.target_amount || 0)} portfolio
              </Typography>
              <Typography variant="body2">
                • Barista FIRE: {formatCurrency(calculations.find(c => c.fire_type === 'Barista')?.target_amount || 0)} portfolio + part-time income
              </Typography>
            </Box>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};
