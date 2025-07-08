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

  // Form state
  const [formData, setFormData] = useState<CreateFIREProfileRequest>({
    annual_expenses: 50000,
    safe_withdrawal_rate: 0.04,
    expected_annual_return: 0.07,
    target_retirement_age: 65,
    barista_annual_income: 25000,
  });

  const calculateFIREProgress = (profile: FIREProfile, currentPortfolioValue: number): { progress: FIREProgress; calculations: FIRECalculation[] } => {
    const currentYear = new Date().getFullYear();
    const currentAge = user?.birth_year ? currentYear - user.birth_year : 30;
    const yearsToRetirement = Math.max(profile.target_retirement_age - currentAge, 0);
    
    // FIRE Calculations
    const traditionalFireTarget = profile.annual_expenses / profile.safe_withdrawal_rate;
    const baristaFireTarget = Math.max((profile.annual_expenses - profile.barista_annual_income) / profile.safe_withdrawal_rate, 0);
    const coastFireTarget = yearsToRetirement > 0 
      ? traditionalFireTarget / Math.pow(1 + profile.expected_annual_return, yearsToRetirement)
      : traditionalFireTarget;
    
    // Progress percentages
    const traditionalProgress = traditionalFireTarget > 0 ? (currentPortfolioValue / traditionalFireTarget * 100) : 0;
    const baristaProgress = baristaFireTarget > 0 ? (currentPortfolioValue / baristaFireTarget * 100) : 0;
    const coastProgress = coastFireTarget > 0 ? (currentPortfolioValue / coastFireTarget * 100) : 0;
    
    // Helper functions for years and monthly calculations
    const calculateYearsRemaining = (target: number, currentValue: number, monthlyInvestment: number = 0, annualReturn: number = profile.expected_annual_return): number => {
      if (target <= currentValue) return 0;
      if (monthlyInvestment <= 0) return 999;
      
      const monthlyRate = annualReturn / 12;
      if (monthlyRate === 0) return (target - currentValue) / (monthlyInvestment * 12);
      
      try {
        const years = Math.log((target * monthlyRate / monthlyInvestment) + 1) / (12 * Math.log(1 + monthlyRate));
        return Math.max(years, 0);
      } catch {
        return 999;
      }
    };
    
    const calculateMonthlyNeeded = (target: number, currentValue: number, years: number = 30, annualReturn: number = profile.expected_annual_return): number => {
      if (years <= 0 || target <= currentValue) return 0;
      
      const monthlyRate = annualReturn / 12;
      const months = years * 12;
      
      if (monthlyRate === 0) return (target - currentValue) / months;
      
      const futureValueCurrent = currentValue * Math.pow(1 + monthlyRate, months);
      const remainingNeeded = target - futureValueCurrent;
      
      if (remainingNeeded <= 0) return 0;
      
      const monthlyPayment = remainingNeeded * monthlyRate / (Math.pow(1 + monthlyRate, months) - 1);
      return Math.max(monthlyPayment, 0);
    };
    
    // Calculate metrics for each FIRE type
    const traditionalYears = calculateYearsRemaining(traditionalFireTarget, currentPortfolioValue);
    const baristaYears = calculateYearsRemaining(baristaFireTarget, currentPortfolioValue);
    const coastYears = calculateYearsRemaining(coastFireTarget, currentPortfolioValue);
    
    const traditionalMonthly = calculateMonthlyNeeded(traditionalFireTarget, currentPortfolioValue, Math.min(traditionalYears, 30));
    const baristaMonthly = calculateMonthlyNeeded(baristaFireTarget, currentPortfolioValue, Math.min(baristaYears, 30));
    const coastMonthly = calculateMonthlyNeeded(coastFireTarget, currentPortfolioValue, Math.min(coastYears, 30));
    
    const progress: FIREProgress = {
      current_total_assets: currentPortfolioValue,
      traditional_fire_target: traditionalFireTarget,
      barista_fire_target: baristaFireTarget,
      coast_fire_target: coastFireTarget,
      traditional_fire_progress: Math.min(traditionalProgress, 100),
      barista_fire_progress: Math.min(baristaProgress, 100),
      coast_fire_progress: Math.min(coastProgress, 100),
      years_to_traditional_fire: traditionalYears,
      years_to_barista_fire: baristaYears,
      years_to_coast_fire: coastYears,
      monthly_investment_needed_traditional: traditionalMonthly,
      monthly_investment_needed_barista: baristaMonthly,
      is_coast_fire_achieved: coastProgress >= 100
    };
    
    const calculations: FIRECalculation[] = [
      {
        fire_type: 'Traditional',
        target_amount: traditionalFireTarget,
        current_progress: currentPortfolioValue,
        progress_percentage: Math.min(traditionalProgress, 100),
        years_remaining: traditionalYears,
        monthly_investment_needed: traditionalMonthly,
        achieved: traditionalProgress >= 100
      },
      {
        fire_type: 'Barista',
        target_amount: baristaFireTarget,
        current_progress: currentPortfolioValue,
        progress_percentage: Math.min(baristaProgress, 100),
        years_remaining: baristaYears,
        monthly_investment_needed: baristaMonthly,
        achieved: baristaProgress >= 100
      },
      {
        fire_type: 'Coast',
        target_amount: coastFireTarget,
        current_progress: currentPortfolioValue,
        progress_percentage: Math.min(coastProgress, 100),
        years_remaining: coastYears,
        monthly_investment_needed: coastMonthly,
        achieved: coastProgress >= 100
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
        
        // Update form with existing data
        setFormData({
          annual_expenses: profileResponse.fire_profile.annual_expenses,
          safe_withdrawal_rate: profileResponse.fire_profile.safe_withdrawal_rate,
          expected_annual_return: profileResponse.fire_profile.expected_annual_return,
          target_retirement_age: profileResponse.fire_profile.target_retirement_age,
          barista_annual_income: profileResponse.fire_profile.barista_annual_income,
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
                          <Box>
                            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                              {calc.fire_type} FIRE
                            </Typography>
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
              
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6} md={4}>
                  <Paper sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Annual Expenses
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                      {formatCurrency(fireProfile.annual_expenses)}
                    </Typography>
                  </Paper>
                </Grid>

                <Grid item xs={12} sm={6} md={4}>
                  <Paper sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Safe Withdrawal Rate
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                      {formatPercentage(fireProfile.safe_withdrawal_rate)}
                    </Typography>
                  </Paper>
                </Grid>

                <Grid item xs={12} sm={6} md={4}>
                  <Paper sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      Expected Annual Return
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                      {formatPercentage(fireProfile.expected_annual_return)}
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
                      Barista Annual Income
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                      {formatCurrency(fireProfile.barista_annual_income)}
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
          <Stack spacing={3} sx={{ mt: 1 }}>
            <Alert severity="info">
              <Typography variant="body2">
                Configure your FIRE parameters to calculate your progress toward different types of financial independence.
              </Typography>
            </Alert>

            <TextField
              label="Annual Expenses (after retirement)"
              type="number"
              value={formData.annual_expenses}
              onChange={(e) => setFormData({ ...formData, annual_expenses: parseFloat(e.target.value) || 0 })}
              helperText="How much you expect to spend per year in retirement"
              fullWidth
            />

            <TextField
              label="Safe Withdrawal Rate"
              type="number"
              value={formData.safe_withdrawal_rate}
              onChange={(e) => setFormData({ ...formData, safe_withdrawal_rate: parseFloat(e.target.value) || 0 })}
              helperText="Percentage of portfolio you can safely withdraw annually (typically 3-4%)"
              inputProps={{ step: 0.01, min: 0.01, max: 0.1 }}
              fullWidth
            />

            <TextField
              label="Expected Annual Return"
              type="number"
              value={formData.expected_annual_return}
              onChange={(e) => setFormData({ ...formData, expected_annual_return: parseFloat(e.target.value) || 0 })}
              helperText="Expected annual return on your investments (typically 6-8%)"
              inputProps={{ step: 0.01, min: 0.01, max: 0.2 }}
              fullWidth
            />

            <TextField
              label="Target Retirement Age"
              type="number"
              value={formData.target_retirement_age}
              onChange={(e) => setFormData({ ...formData, target_retirement_age: parseInt(e.target.value) || 0 })}
              helperText="Age at which you want to achieve traditional FIRE"
              inputProps={{ min: 30, max: 100 }}
              fullWidth
            />

            <TextField
              label="Barista Annual Income"
              type="number"
              value={formData.barista_annual_income}
              onChange={(e) => setFormData({ ...formData, barista_annual_income: parseFloat(e.target.value) || 0 })}
              helperText="Expected annual income from part-time work (for Barista FIRE)"
              fullWidth
            />
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
