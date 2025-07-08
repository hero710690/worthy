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
    const baristaIncome = profile.barista_annual_income;
    
    // FIRE Target Calculations (simplified for compatibility)
    const traditionalFireTarget = annualExpenses / safeWithdrawalRate;
    const baristaFireTarget = Math.max((annualExpenses - baristaIncome) / safeWithdrawalRate, 0);
    const coastFireTarget = yearsToRetirement > 0 
      ? traditionalFireTarget / Math.pow(1 + expectedReturn, yearsToRetirement)
      : traditionalFireTarget;
    
    // Progress percentages
    const traditionalProgress = traditionalFireTarget > 0 ? (currentPortfolioValue / traditionalFireTarget * 100) : 0;
    const baristaProgress = baristaFireTarget > 0 ? (currentPortfolioValue / baristaFireTarget * 100) : 0;
    const coastProgress = coastFireTarget > 0 ? (currentPortfolioValue / coastFireTarget * 100) : 0;
    
    // Simplified calculation functions
    const calculateYearsToFI = (target: number, currentValue: number, monthlyInvestment: number = 0): number => {
      if (target <= currentValue) return 0;
      if (monthlyInvestment <= 0) return 999;
      
      const monthlyRate = expectedReturn / 12;
      if (monthlyRate === 0) return (target - currentValue) / (monthlyInvestment * 12);
      
      try {
        const years = Math.log((target * monthlyRate / monthlyInvestment) + 1) / (12 * Math.log(1 + monthlyRate));
        return Math.max(years, 0);
      } catch {
        return 999;
      }
    };
    
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
    
    // Calculate metrics for each FIRE type
    const traditionalYears = calculateYearsToFI(traditionalFireTarget, currentPortfolioValue, formData.annual_savings / 12);
    const baristaYears = calculateYearsToFI(baristaFireTarget, currentPortfolioValue, formData.annual_savings / 12);
    const coastYears = calculateYearsToFI(coastFireTarget, currentPortfolioValue, 0); // Coast FIRE doesn't need additional contributions
    
    const traditionalMonthly = calculateMonthlyNeeded(traditionalFireTarget, currentPortfolioValue, Math.min(traditionalYears, 30));
    const baristaMonthly = calculateMonthlyNeeded(baristaFireTarget, currentPortfolioValue, Math.min(baristaYears, 30));
    const coastMonthly = 0; // Coast FIRE doesn't require additional monthly contributions
    
    const progress: FIREProgress = {
      current_total_assets: currentPortfolioValue,
      current_age: currentAge,
      years_to_retirement: yearsToRetirement,
      
      traditional_fire_target: traditionalFireTarget,
      traditional_fire_target_real: traditionalFireTarget, // Simplified for now
      barista_fire_target: baristaFireTarget,
      barista_fire_target_real: baristaFireTarget, // Simplified for now
      coast_fire_target: coastFireTarget,
      coast_fire_target_real: coastFireTarget, // Simplified for now
      
      traditional_fire_progress: Math.min(traditionalProgress, 100),
      barista_fire_progress: Math.min(baristaProgress, 100),
      coast_fire_progress: Math.min(coastProgress, 100),
      
      years_to_traditional_fire: traditionalYears,
      years_to_barista_fire: baristaYears,
      years_to_coast_fire: coastYears,
      
      monthly_investment_needed_traditional: traditionalMonthly,
      monthly_investment_needed_barista: baristaMonthly,
      annual_savings_rate: formData.annual_income > 0 ? (formData.annual_savings / formData.annual_income) : 0,
      required_savings_rate_traditional: 0, // Simplified for now
      
      is_coast_fire_achieved: coastProgress >= 100,
      financial_independence_date: undefined, // Simplified for now
      purchasing_power_at_retirement: traditionalFireTarget // Simplified for now
    };
    
    const calculations: FIRECalculation[] = [
      {
        fire_type: 'Traditional',
        target_amount: traditionalFireTarget,
        target_amount_real: traditionalFireTarget,
        current_progress: currentPortfolioValue,
        progress_percentage: Math.min(traditionalProgress, 100),
        years_remaining: traditionalYears,
        monthly_investment_needed: traditionalMonthly,
        annual_savings_rate_required: 0,
        achieved: traditionalProgress >= 100,
        projected_fi_date: undefined,
        real_purchasing_power: traditionalFireTarget,
        tax_adjusted_withdrawal: traditionalFireTarget * safeWithdrawalRate
      },
      {
        fire_type: 'Barista',
        target_amount: baristaFireTarget,
        target_amount_real: baristaFireTarget,
        current_progress: currentPortfolioValue,
        progress_percentage: Math.min(baristaProgress, 100),
        years_remaining: baristaYears,
        monthly_investment_needed: baristaMonthly,
        annual_savings_rate_required: 0,
        achieved: baristaProgress >= 100,
        projected_fi_date: undefined,
        real_purchasing_power: baristaFireTarget,
        tax_adjusted_withdrawal: baristaFireTarget * safeWithdrawalRate
      },
      {
        fire_type: 'Coast',
        target_amount: coastFireTarget,
        target_amount_real: coastFireTarget,
        current_progress: currentPortfolioValue,
        progress_percentage: Math.min(coastProgress, 100),
        years_remaining: coastYears,
        monthly_investment_needed: coastMonthly,
        annual_savings_rate_required: 0,
        achieved: coastProgress >= 100,
        projected_fi_date: undefined,
        real_purchasing_power: coastFireTarget,
        tax_adjusted_withdrawal: coastFireTarget * safeWithdrawalRate
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
        
        // Update form with existing data, mapping to new comprehensive structure
        const existingProfile = profileResponse.fire_profile;
        setFormData({
          // Map existing fields to new structure
          annual_income: 1000000, // Default, will be user-configurable
          annual_savings: 200000, // Default, will be user-configurable
          annual_expenses: existingProfile.annual_expenses,
          target_retirement_age: existingProfile.target_retirement_age,
          safe_withdrawal_rate: existingProfile.safe_withdrawal_rate,
          expected_return_pre_retirement: existingProfile.expected_annual_return,
          expected_return_post_retirement: existingProfile.expected_annual_return * 0.8, // Conservative estimate
          expected_inflation_rate: 0.025, // Default 2.5%
          other_passive_income: 0, // Default
          effective_tax_rate: 0.15, // Default 15%
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
      case 'Traditional': return <BeachAccess />;
      case 'Barista': return <Coffee />;
      case 'Coast': return <GpsFixed />;
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
        return 'Let current investments grow to traditional FIRE by retirement age';
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
        return 'Coast FIRE: Saving enough early so that investments grow without additional contributions. You can "coast" to traditional FIRE by letting compound interest do the work.';
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
                                  {calc.years_remaining.toFixed(1)}
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

          {/* Current Settings */}
          <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'grey.200' }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 'bold' }}>
                Current FIRE Settings
              </Typography>
              
              {/* Current Financial Snapshot */}
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold', color: 'primary.main' }}>
                💰 Current Financial Snapshot
              </Typography>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6} md={4}>
                  <Paper sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Annual Income
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                      {formatBaseCurrency(formData.annual_income)}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <Paper sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Annual Savings
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                      {formatBaseCurrency(formData.annual_savings)}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <Paper sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Savings Rate
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                      {formData.annual_income > 0 ? ((formData.annual_savings / formData.annual_income) * 100).toFixed(1) : 0}%
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>

              {/* Retirement Goals */}
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold', color: 'success.main' }}>
                🎯 Retirement Goals
              </Typography>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6} md={4}>
                  <Paper sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Annual Expenses in Retirement
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                      {formatBaseCurrency(fireProfile.annual_expenses)}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <Paper sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Target Retirement Age
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                      {fireProfile.target_retirement_age}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <Paper sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Current Age
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                      {userAge}
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>

              {/* Core Assumptions */}
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold', color: 'warning.main' }}>
                ⚙️ Core Assumptions
              </Typography>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6} md={4}>
                  <Paper sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Safe Withdrawal Rate
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                      {(formData.safe_withdrawal_rate * 100).toFixed(1)}%
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <Paper sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Expected Inflation Rate
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                      {(formData.expected_inflation_rate * 100).toFixed(1)}%
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <Paper sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Pre-Retirement Return
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                      {(formData.expected_return_pre_retirement * 100).toFixed(1)}%
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <Paper sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Post-Retirement Return
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                      {(formData.expected_return_post_retirement * 100).toFixed(1)}%
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <Paper sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Other Passive Income
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                      {formatBaseCurrency(formData.other_passive_income)}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                  <Paper sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Effective Tax Rate
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                      {(formData.effective_tax_rate * 100).toFixed(1)}%
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>

              {/* Barista FIRE Options */}
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold', color: 'info.main' }}>
                ☕ Barista FIRE Options
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={4}>
                  <Paper sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Barista Annual Income
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                      {formatBaseCurrency(fireProfile.barista_annual_income)}
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
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
