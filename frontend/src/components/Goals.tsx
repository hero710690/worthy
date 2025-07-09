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
} from '@mui/icons-material';
import { useAuthStore } from '../store/authStore';
import { assetAPI } from '../services/assetApi';
import { assetValuationService, type PortfolioValuation } from '../services/assetValuationService';
import { FIREProfile, CreateFIREProfileRequest, FIREProgress, FIRECalculation } from '../types/fire';
import { fireApi } from '../services/fireApi';
import type { Asset } from '../types/assets';

export const Goals: React.FC = () => {
  const { user } = useAuthStore();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [portfolioValuation, setPortfolioValuation] = useState<PortfolioValuation | null>(null);
  const [fireProfile, setFireProfile] = useState<FIREProfile | null>(null);
  const [fireProgress, setFireProgress] = useState<FIREProgress | null>(null);
  const [calculations, setCalculations] = useState<FIRECalculation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [userAge, setUserAge] = useState<number>(30);
  const [baseCurrency, setBaseCurrency] = useState<string>('USD');

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
    
    // Legacy fields for backward compatibility
    expected_annual_return: 0.07,
    barista_annual_income: 300000, // NT$300,000 part-time income
  });

  const calculateFIREProgress = (profile: FIREProfile, currentPortfolioValue: number): { progress: FIREProgress; calculations: FIRECalculation[] } => {
    const currentYear = new Date().getFullYear();
    const currentAge = user?.birth_year ? currentYear - user.birth_year : 30;
    const yearsToRetirement = Math.max(profile.target_retirement_age - currentAge, 0);
    
    // Use form data for comprehensive fields, fallback to profile for basic fields
    const annualExpenses = profile.annual_expenses;
    const safeWithdrawalRate = profile.safe_withdrawal_rate;
    const expectedReturn = profile.expected_annual_return || formData.expected_return_pre_retirement;
    const baristaMonthlyIncome = profile.barista_annual_income / 12;
    const baristaAnnualIncome = profile.barista_annual_income;
    const monthlyContribution = formData.annual_savings / 12;
    const monthlyRate = expectedReturn / 12;
    
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

  useEffect(() => {
    loadFIREData();
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
        // Calculate FIRE progress using real-time portfolio value
        const { progress, calculations } = calculateFIREProgress(
          profileResponse.fire_profile, 
          valuation.totalValueInBaseCurrency
        );
        setFireProgress(progress);
        setCalculations(calculations);
        
        // Update form with existing data, mapping all comprehensive fields
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
      
      // Recalculate FIRE progress with current portfolio value
      if (portfolioValuation) {
        const { progress, calculations } = calculateFIREProgress(
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
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
            FIRE Goals & Planning
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Track your progress toward Financial Independence, Retire Early (FIRE)
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={fireProfile ? <Settings /> : <Calculate />}
          onClick={() => setOpenDialog(true)}
          sx={{ borderRadius: 2 }}
        >
          {fireProfile ? 'Update Goals' : 'Set Goals'}
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {!fireProfile ? (
        // No FIRE profile - show setup prompt
        <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'grey.200', textAlign: 'center', py: 6 }}>
          <CardContent>
            <Calculate sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
            <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 2 }}>
              Set Your FIRE Goals
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 600, mx: 'auto' }}>
              Configure your financial independence goals to track your progress toward Traditional FIRE, 
              Barista FIRE, and Coast FIRE. We'll calculate how close you are to each milestone.
            </Typography>
            <Button
              variant="contained"
              size="large"
              startIcon={<Calculate />}
              onClick={() => setOpenDialog(true)}
              sx={{ borderRadius: 2 }}
            >
              Configure FIRE Goals
            </Button>
          </CardContent>
        </Card>
      ) : (
        // FIRE profile exists - show progress
        <>
          {/* Progress Overview */}
          {fireProgress && (
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} md={4}>
                <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'grey.200' }}>
                  <CardContent>
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <Box sx={{ p: 1, bgcolor: 'primary.light', borderRadius: 2 }}>
                        <AttachMoney sx={{ color: 'primary.main' }} />
                      </Box>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                          {formatCurrency(fireProgress.current_total_assets)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Current Assets
                        </Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={4}>
                <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'grey.200' }}>
                  <CardContent>
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <Box sx={{ p: 1, bgcolor: 'success.light', borderRadius: 2 }}>
                        <TrendingUp sx={{ color: 'success.main' }} />
                      </Box>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                          {formatPercentage(fireProfile.expected_annual_return)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Expected Return
                        </Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={4}>
                <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'grey.200' }}>
                  <CardContent>
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <Box sx={{ p: 1, bgcolor: 'info.light', borderRadius: 2 }}>
                        <Schedule sx={{ color: 'info.main' }} />
                      </Box>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                          {fireProfile.target_retirement_age}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Target Age
                        </Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          )}

          {/* FIRE Progress Cards */}
          {calculations.length > 0 && (
            <Grid container spacing={3} sx={{ mb: 4 }}>
              {calculations.map((calc) => (
                <Grid item xs={12} md={4} key={calc.fire_type}>
                  <Card sx={{ 
                    borderRadius: 3, 
                    border: '2px solid', 
                    borderColor: calc.achieved ? 'success.main' : 'grey.200',
                    position: 'relative',
                    overflow: 'visible'
                  }}>
                    {calc.achieved && (
                      <Box sx={{ 
                        position: 'absolute', 
                        top: -10, 
                        right: -10, 
                        bgcolor: 'success.main', 
                        borderRadius: '50%',
                        p: 1
                      }}>
                        <CheckCircle sx={{ color: 'white', fontSize: 20 }} />
                      </Box>
                    )}
                    <CardContent>
                      <Stack spacing={2}>
                        <Stack direction="row" alignItems="center" spacing={2}>
                          <Box sx={{ p: 1, bgcolor: `${getProgressColor(calc.progress_percentage)}.light`, borderRadius: 2 }}>
                            {getFIREIcon(calc.fire_type)}
                          </Box>
                          <Box sx={{ flex: 1 }}>
                            <Stack direction="row" alignItems="center" spacing={1}>
                              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                                {calc.fire_type} FIRE
                              </Typography>
                              <Tooltip 
                                title={getFIRETooltip(calc.fire_type)}
                                arrow
                                placement="top"
                              >
                                <IconButton size="small" sx={{ color: 'text.secondary' }}>
                                  <HelpOutline fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                            <Typography variant="body2" color="text.secondary">
                              {getFIREDescription(calc.fire_type)}
                            </Typography>
                          </Box>
                        </Stack>

                        <Box>
                          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                            <Typography variant="body2" color="text.secondary">
                              Progress
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                              {calc.progress_percentage.toFixed(1)}%
                            </Typography>
                          </Stack>
                          <LinearProgress
                            variant="determinate"
                            value={Math.min(calc.progress_percentage, 100)}
                            color={getProgressColor(calc.progress_percentage)}
                            sx={{ height: 8, borderRadius: 4 }}
                          />
                        </Box>

                        <Divider />

                        <Stack spacing={1}>
                          <Stack direction="row" justifyContent="space-between">
                            <Typography variant="body2" color="text.secondary">
                              Target Amount:
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                              {formatCurrency(calc.target_amount)}
                            </Typography>
                          </Stack>
                          
                          <Stack direction="row" justifyContent="space-between">
                            <Typography variant="body2" color="text.secondary">
                              Current Progress:
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                              {formatCurrency(calc.current_progress)}
                            </Typography>
                          </Stack>

                          {!calc.achieved && (
                            <>
                              <Stack direction="row" justifyContent="space-between">
                                <Typography variant="body2" color="text.secondary">
                                  Years Remaining:
                                </Typography>
                                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                  {calc.years_remaining !== null && calc.years_remaining > 0 
                                    ? calc.years_remaining.toFixed(1) 
                                    : 'Not achievable with current plan'}
                                </Typography>
                              </Stack>

                              <Stack direction="row" justifyContent="space-between">
                                <Typography variant="body2" color="text.secondary">
                                  Monthly Needed:
                                </Typography>
                                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                  {formatCurrency(calc.monthly_investment_needed)}
                                </Typography>
                              </Stack>
                            </>
                          )}
                        </Stack>

                        {calc.achieved && (
                          <Chip
                            label="🎉 Goal Achieved!"
                            color="success"
                            sx={{ alignSelf: 'center' }}
                          />
                        )}
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}

        </>
      )}

      {/* FIRE Profile Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {fireProfile ? 'Update FIRE Goals' : 'Set FIRE Goals'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={4} sx={{ mt: 1 }}>
            <Alert severity="info">
              <Typography variant="body2">
                Configure your comprehensive FIRE parameters for accurate financial independence calculations including inflation, taxes, and multiple income sources.
              </Typography>
            </Alert>

            {/* Current Financial Snapshot */}
            <Paper elevation={0} sx={{ p: 3, bgcolor: 'grey.50' }}>
              <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>
                💰 Current Financial Snapshot
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Annual Income"
                    type="number"
                    value={formData.annual_income}
                    onChange={(e) => setFormData({ ...formData, annual_income: parseFloat(e.target.value) || 0 })}
                    helperText="Your total annual income before taxes"
                    fullWidth
                    InputProps={{
                      startAdornment: <Typography sx={{ mr: 1 }}>NT$</Typography>
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Annual Savings"
                    type="number"
                    value={formData.annual_savings}
                    onChange={(e) => setFormData({ ...formData, annual_savings: parseFloat(e.target.value) || 0 })}
                    helperText={`Savings rate: ${formData.annual_income > 0 ? ((formData.annual_savings / formData.annual_income) * 100).toFixed(1) : 0}%`}
                    fullWidth
                    InputProps={{
                      startAdornment: <Typography sx={{ mr: 1 }}>NT$</Typography>
                    }}
                  />
                </Grid>
              </Grid>
            </Paper>

            {/* Retirement Goals */}
            <Paper elevation={0} sx={{ p: 3, bgcolor: 'grey.50' }}>
              <Typography variant="h6" sx={{ mb: 2, color: 'success.main' }}>
                🎯 Retirement Goals
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Annual Expenses in Retirement"
                    type="number"
                    value={formData.annual_expenses}
                    onChange={(e) => setFormData({ ...formData, annual_expenses: parseFloat(e.target.value) || 0 })}
                    helperText="Expected annual spending in retirement (may differ from current expenses)"
                    fullWidth
                    InputProps={{
                      startAdornment: <Typography sx={{ mr: 1 }}>NT$</Typography>
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Target Retirement Age"
                    type="number"
                    value={formData.target_retirement_age}
                    onChange={(e) => setFormData({ ...formData, target_retirement_age: parseInt(e.target.value) || 65 })}
                    helperText="Your ideal retirement age"
                    fullWidth
                  />
                </Grid>
              </Grid>
            </Paper>

            {/* Core Assumptions */}
            <Paper elevation={0} sx={{ p: 3, bgcolor: 'grey.50' }}>
              <Typography variant="h6" sx={{ mb: 2, color: 'warning.main' }}>
                ⚙️ Core Assumptions
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Safe Withdrawal Rate"
                    type="number"
                    value={(formData.safe_withdrawal_rate * 100).toFixed(1)}
                    onChange={(e) => setFormData({ ...formData, safe_withdrawal_rate: (parseFloat(e.target.value) || 4) / 100 })}
                    helperText="3-5% recommended. Lower = more conservative"
                    fullWidth
                    inputProps={{ min: 3, max: 5, step: 0.1 }}
                    InputProps={{
                      endAdornment: <Typography sx={{ ml: 1 }}>%</Typography>
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Expected Inflation Rate"
                    type="number"
                    value={(formData.expected_inflation_rate * 100).toFixed(1)}
                    onChange={(e) => setFormData({ ...formData, expected_inflation_rate: (parseFloat(e.target.value) || 2.5) / 100 })}
                    helperText="Long-term inflation rate (2-3% typical)"
                    fullWidth
                    inputProps={{ min: 1, max: 5, step: 0.1 }}
                    InputProps={{
                      endAdornment: <Typography sx={{ ml: 1 }}>%</Typography>
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Pre-Retirement Expected Return"
                    type="number"
                    value={(formData.expected_return_pre_retirement * 100).toFixed(1)}
                    onChange={(e) => setFormData({ ...formData, expected_return_pre_retirement: (parseFloat(e.target.value) || 7) / 100 })}
                    helperText="Expected annual return during accumulation phase (6-8%)"
                    fullWidth
                    inputProps={{ min: 4, max: 12, step: 0.1 }}
                    InputProps={{
                      endAdornment: <Typography sx={{ ml: 1 }}>%</Typography>
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Post-Retirement Expected Return"
                    type="number"
                    value={(formData.expected_return_post_retirement * 100).toFixed(1)}
                    onChange={(e) => setFormData({ ...formData, expected_return_post_retirement: (parseFloat(e.target.value) || 5) / 100 })}
                    helperText="Expected annual return during withdrawal phase (4-6%)"
                    fullWidth
                    inputProps={{ min: 3, max: 8, step: 0.1 }}
                    InputProps={{
                      endAdornment: <Typography sx={{ ml: 1 }}>%</Typography>
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Other Passive Income"
                    type="number"
                    value={formData.other_passive_income}
                    onChange={(e) => setFormData({ ...formData, other_passive_income: parseFloat(e.target.value) || 0 })}
                    helperText="Rental income, royalties, pensions, etc."
                    fullWidth
                    InputProps={{
                      startAdornment: <Typography sx={{ mr: 1 }}>NT$</Typography>
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Effective Tax Rate"
                    type="number"
                    value={(formData.effective_tax_rate * 100).toFixed(1)}
                    onChange={(e) => setFormData({ ...formData, effective_tax_rate: (parseFloat(e.target.value) || 15) / 100 })}
                    helperText="Expected tax rate on withdrawals (10-25%)"
                    fullWidth
                    inputProps={{ min: 0, max: 50, step: 1 }}
                    InputProps={{
                      endAdornment: <Typography sx={{ ml: 1 }}>%</Typography>
                    }}
                  />
                </Grid>
              </Grid>
            </Paper>

            {/* Barista FIRE Section */}
            <Paper elevation={0} sx={{ p: 3, bgcolor: 'grey.50' }}>
              <Typography variant="h6" sx={{ mb: 2, color: 'info.main' }}>
                ☕ Barista FIRE Options
              </Typography>
              <TextField
                label="Barista Annual Income"
                type="number"
                value={formData.barista_annual_income}
                onChange={(e) => setFormData({ ...formData, barista_annual_income: parseFloat(e.target.value) || 0 })}
                helperText="Expected annual income from part-time work (for Barista FIRE)"
                fullWidth
                InputProps={{
                  startAdornment: <Typography sx={{ mr: 1 }}>NT$</Typography>
                }}
              />
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
              formData.safe_withdrawal_rate <= 0 ||
              formData.expected_annual_return <= 0 ||
              formData.target_retirement_age <= 0
            }
          >
            {fireProfile ? 'Update Goals' : 'Save Goals'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
