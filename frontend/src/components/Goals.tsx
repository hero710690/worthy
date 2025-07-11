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
  Tabs,
  Tab,
  Slider,
  Tooltip
} from '@mui/material';
import {
  GpsFixed,
  TrendingUp,
  Coffee,
  BeachAccess,
  CheckCircle,
  Calculate,
  Timeline,
  TuneRounded,
  PieChart,
  Warning
} from '@mui/icons-material';

import { useAuthStore } from '../store/authStore';
import { assetAPI } from '../services/assetApi';
import { assetValuationService } from '../services/assetValuationService';
import { fireApi } from '../services/fireApi';
import { recurringInvestmentApi } from '../services/recurringInvestmentApi';
import { exchangeRateService } from '../services/exchangeRateService';
import type { Asset, RecurringInvestment } from '../types/assets';
import type { 
  FIREProfile, 
  FIREProgress, 
  FIRECalculation, 
  CreateFIREProfileRequest 
} from '../types/fire';
import type { PortfolioValuation } from '../services/assetValuationService';

export const Goals: React.FC = () => {
  const { user } = useAuthStore();
  
  // Core state
  const [assets, setAssets] = useState<Asset[]>([]);
  const [portfolioValuation, setPortfolioValuation] = useState<PortfolioValuation | null>(null);
  const [fireProfile, setFireProfile] = useState<FIREProfile | null>(null);
  const [fireProgress, setFireProgress] = useState<FIREProgress | null>(null);
  const [calculations, setCalculations] = useState<FIRECalculation[]>([]);
  const [recurringInvestments, setRecurringInvestments] = useState<RecurringInvestment[]>([]);
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  
  // Form state - Initialize with user's existing profile or reasonable defaults
  const [formData, setFormData] = useState<CreateFIREProfileRequest>({
    annual_income: 0,
    annual_expenses: 60000,
    target_retirement_age: 65,
    safe_withdrawal_rate: 0.04,
    expected_return_pre_retirement: 0.07,
    expected_return_post_retirement: 0.05,
    expected_inflation_rate: 0.025, // This will be updated when profile loads
    other_passive_income: 0,
    effective_tax_rate: 0.15,
    barista_annual_contribution: 0,
    inflation_rate: 0.025, // This will be updated when profile loads
    barista_annual_income: 30000
  });

  // What-if simulator state
  const [whatIfValues, setWhatIfValues] = useState({
    monthlyContribution: 5000,
    annualExpenses: 60000,
    targetRetirementAge: 65,
    expectedReturn: 0.07
  });

  // 🆕 Inflation analysis state
  const [inflationAnalysis, setInflationAnalysis] = useState<any>(null);

  // Load data on component mount
  useEffect(() => {
    loadFIREData();
    loadRecurringInvestments();
  }, []);

  const loadFIREData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get user's base currency
      const userBaseCurrency = user?.base_currency || 'USD';
      
      // Load assets and calculate portfolio value
      const assetsResponse = await assetAPI.getAssets();
      setAssets(assetsResponse.assets);
      
      const valuation = await assetValuationService.valuatePortfolio(
        assetsResponse.assets, 
        userBaseCurrency
      );
      setPortfolioValuation(valuation);
      
      // Load FIRE profile
      const profileResponse = await fireApi.getFIREProfile();
      setFireProfile(profileResponse.fire_profile);
      
      if (profileResponse.fire_profile) {
        // 🆕 Get inflation-aware FIRE progress from backend
        const progressResponse = await fireApi.getFIREProgress();
        
        setFireProgress(progressResponse.fire_progress);
        setCalculations(progressResponse.calculations || []);
        
        // 🆕 Store inflation analysis if available
        if (progressResponse.inflation_analysis) {
          setInflationAnalysis(progressResponse.inflation_analysis);
        }
        
        // Update form data with existing profile - use actual values, not defaults
        setFormData({
          annual_income: profileResponse.fire_profile.annual_income || 0,
          annual_expenses: profileResponse.fire_profile.annual_expenses,
          target_retirement_age: profileResponse.fire_profile.target_retirement_age,
          safe_withdrawal_rate: profileResponse.fire_profile.safe_withdrawal_rate,
          expected_return_pre_retirement: profileResponse.fire_profile.expected_return_pre_retirement || 0.07,
          expected_return_post_retirement: profileResponse.fire_profile.expected_return_post_retirement || 0.05,
          // 🔧 Use user's actual inflation rate, not default
          expected_inflation_rate: profileResponse.fire_profile.expected_inflation_rate,
          other_passive_income: profileResponse.fire_profile.other_passive_income || 0,
          effective_tax_rate: profileResponse.fire_profile.effective_tax_rate || 0.15,
          barista_annual_contribution: profileResponse.fire_profile.barista_annual_contribution || 0,
          // 🔧 Use user's actual inflation rate, not default
          inflation_rate: profileResponse.fire_profile.inflation_rate,
          barista_annual_income: profileResponse.fire_profile.barista_annual_income || 30000
        });
        
        // ✅ FIXED: Use backend-calculated monthly contribution (already currency-converted)
        // The backend handles all currency conversion in get_monthly_recurring_total()
        const monthlyRecurringTotal = progressResponse.fire_progress.current_monthly_contribution || 0;
        
        setWhatIfValues({
          monthlyContribution: monthlyRecurringTotal || 5000, // Default to 5000 if no recurring investments
          annualExpenses: profileResponse.fire_profile.annual_expenses,
          targetRetirementAge: profileResponse.fire_profile.target_retirement_age,
          expectedReturn: profileResponse.fire_profile.expected_return_pre_retirement || 0.07
        });
      }
      
    } catch (err: any) {
      console.error('Failed to load FIRE data:', err);
      setError(err.response?.data?.message || 'Failed to load FIRE data');
    } finally {
      setLoading(false);
    }
  };

  const loadRecurringInvestments = async () => {
    try {
      const response = await recurringInvestmentApi.getRecurringInvestments();
      setRecurringInvestments(response.recurring_investments);
    } catch (err) {
      console.error('Failed to load recurring investments:', err);
    }
  };

  const handleSaveProfile = async () => {
    try {
      await fireApi.createOrUpdateFIREProfile(formData);
      setOpenDialog(false);
      loadFIREData(); // Reload to get updated calculations
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save FIRE profile');
    }
  };

  const formatCurrency = (amount: number, currency: string = user?.base_currency || 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getFIREColor = (fireType: string) => {
    switch (fireType) {
      case 'Coast': return '#4CAF50';
      case 'Barista': return '#FF9800';
      case 'Traditional': return '#2196F3';
      default: return '#666';
    }
  };

  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: 400,
        gap: 2
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
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1, color: 'primary.main' }}>
            FIRE Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Track your journey to Financial Independence, Retire Early
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Calculate />}
          onClick={() => setOpenDialog(true)}
          sx={{ borderRadius: 2 }}
        >
          {fireProfile ? 'Update Goals' : 'Set FIRE Goals'}
        </Button>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Main Content */}
      {!fireProfile ? (
        <FIRESetupPrompt onSetup={() => setOpenDialog(true)} />
      ) : (
        <FIREDashboardTabs 
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          calculations={calculations}
          portfolioValuation={portfolioValuation}
          fireProfile={fireProfile}
          fireProgress={fireProgress}
          inflationAnalysis={inflationAnalysis}
          whatIfValues={whatIfValues}
          setWhatIfValues={setWhatIfValues}
          recurringInvestments={recurringInvestments}
          user={user}
          formatCurrency={formatCurrency}
        />
      )}

      {/* FIRE Profile Dialog */}
      <FIREProfileDialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        formData={formData}
        setFormData={setFormData}
        onSave={handleSaveProfile}
        fireProfile={fireProfile}
        user={user}
      />
    </Box>
  );
};

// Setup Prompt Component
const FIRESetupPrompt: React.FC<{ onSetup: () => void }> = ({ onSetup }) => (
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
        Start Your FIRE Journey
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 700, mx: 'auto', fontSize: '1.1rem' }}>
        Set your financial goals and discover your path to Financial Independence. 
        Calculate Traditional FIRE, Barista FIRE, and Coast FIRE targets based on your personal situation.
      </Typography>
      <Button
        variant="contained"
        size="large"
        onClick={onSetup}
        sx={{
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
);

// FIRE Dashboard Tabs Component
const FIREDashboardTabs: React.FC<{
  activeTab: number;
  setActiveTab: (tab: number) => void;
  calculations: FIRECalculation[];
  portfolioValuation: PortfolioValuation | null;
  fireProfile: FIREProfile;
  fireProgress: FIREProgress | null;
  inflationAnalysis: any;
  whatIfValues: any;
  setWhatIfValues: (values: any) => void;
  recurringInvestments: RecurringInvestment[];
  user: any;
  formatCurrency: (amount: number, currency?: string) => string;
}> = ({ 
  activeTab, 
  setActiveTab, 
  calculations, 
  portfolioValuation, 
  fireProfile, 
  fireProgress,
  inflationAnalysis,
  whatIfValues,
  setWhatIfValues,
  recurringInvestments,
  user,
  formatCurrency 
}) => {
  return (
    <Box>
      {/* Portfolio Status Summary */}
      {portfolioValuation && (
        <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'grey.200', mb: 4 }}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 3 }}>
              Current Portfolio Status
            </Typography>
            <Grid container spacing={4}>
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'primary.main', mb: 1 }}>
                    {formatCurrency(portfolioValuation.totalValueInBaseCurrency)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">Total Portfolio Value</Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'success.main', mb: 1 }}>
                    {formatCurrency(portfolioValuation.totalUnrealizedGainLoss)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">Unrealized P&L</Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'warning.main', mb: 1 }}>
                    {formatCurrency(
                      (() => {
                        // Group recurring investments by currency and sum them
                        const currencyTotals: { [currency: string]: number } = {};
                        
                        recurringInvestments
                          .filter(inv => inv.is_active)
                          .forEach(inv => {
                            // Convert to monthly amount based on frequency
                            let monthlyAmount = 0;
                            if (inv.frequency === 'monthly') {
                              monthlyAmount = inv.amount;
                            } else if (inv.frequency === 'weekly') {
                              monthlyAmount = inv.amount * 4.33; // ~4.33 weeks per month
                            } else if (inv.frequency === 'daily') {
                              monthlyAmount = inv.amount * 30; // ~30 days per month
                            }
                            
                            // Sum by currency
                            if (!currencyTotals[inv.currency]) {
                              currencyTotals[inv.currency] = 0;
                            }
                            currencyTotals[inv.currency] += monthlyAmount;
                          });
                        
                        // Convert each currency total to user's base currency
                        let totalInBaseCurrency = 0;
                        Object.entries(currencyTotals).forEach(([currency, amount]) => {
                          if (currency === user?.base_currency) {
                            totalInBaseCurrency += amount;
                          } else {
                            try {
                              const convertedAmount = exchangeRateService.convertCurrency(
                                amount,
                                currency,
                                user?.base_currency || 'USD'
                              );
                              totalInBaseCurrency += convertedAmount;
                            } catch (error) {
                              console.warn(`Failed to convert ${currency} to ${user?.base_currency}:`, error);
                              // Keep original amount if conversion fails
                              totalInBaseCurrency += amount;
                            }
                          }
                        });
                        
                        return totalInBaseCurrency;
                      })()
                    )}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">Monthly Savings</Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'info.main', mb: 1 }}>
                    {recurringInvestments.filter(inv => inv.is_active).length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">Active Plans</Typography>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* 🆕 Inflation Analysis Summary */}
      {inflationAnalysis && (
        <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'warning.200', mb: 4, bgcolor: 'warning.50' }}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 3, color: 'warning.main', display: 'flex', alignItems: 'center' }}>
              <Warning sx={{ mr: 1 }} />
              Inflation Impact Analysis
            </Typography>
            
            <Grid container spacing={4}>
              <Grid item xs={12} md={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'warning.main', mb: 1 }}>
                    {(fireProfile.expected_inflation_rate * 100).toFixed(1)}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">Your Inflation Rate Setting</Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'error.main', mb: 1 }}>
                    {inflationAnalysis.purchasing_power_erosion || 'N/A'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">Purchasing Power Loss</Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'info.main', mb: 1 }}>
                    {((fireProfile.expected_return_pre_retirement - fireProfile.expected_inflation_rate) * 100).toFixed(2)}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">Real Return Rate</Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={3}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'primary.main', mb: 1 }}>
                    {fireProfile?.target_retirement_age && user?.birth_year ? fireProfile.target_retirement_age - (new Date().getFullYear() - user.birth_year) : 'N/A'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">Years to Retirement</Typography>
                </Box>
              </Grid>
            </Grid>
            
            <Box sx={{ mt: 3, p: 2, bgcolor: 'white', borderRadius: 2, border: '1px solid', borderColor: 'warning.200' }}>
              <Typography variant="body2" sx={{ fontStyle: 'italic', textAlign: 'center' }}>
                💡 All FIRE calculations now include inflation adjustments for more realistic planning. 
                Traditional FIRE shows both current and inflation-adjusted targets.
              </Typography>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Tab Navigation */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 4 }}>
        <Tabs 
          value={activeTab} 
          onChange={(_, newValue) => setActiveTab(newValue)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab icon={<GpsFixed />} label="Dashboard" />
          <Tab icon={<Timeline />} label="Projections" />
          <Tab icon={<TuneRounded />} label="What-If" />
          <Tab icon={<PieChart />} label="Income Breakdown" />
        </Tabs>
      </Box>

      {/* Tab Content */}
      {activeTab === 0 && (
        <FIREDashboardContent 
          calculations={calculations}
          portfolioValuation={portfolioValuation}
          fireProfile={fireProfile}
          inflationAnalysis={inflationAnalysis}
          formatCurrency={formatCurrency}
          user={user}
        />
      )}
      
      {activeTab === 1 && (
        <ProjectionsTab 
          calculations={calculations}
          portfolioValuation={portfolioValuation}
          fireProfile={fireProfile}
          formatCurrency={formatCurrency}
        />
      )}
      
      {activeTab === 2 && (
        <WhatIfSimulatorTab 
          whatIfValues={whatIfValues}
          setWhatIfValues={setWhatIfValues}
          fireProfile={fireProfile}
          portfolioValuation={portfolioValuation}
          formatCurrency={formatCurrency}
          user={user}
        />
      )}
      
      {activeTab === 3 && (
        <IncomeBreakdownTab 
          fireProfile={fireProfile}
          calculations={calculations}
          formatCurrency={formatCurrency}
        />
      )}
    </Box>
  );
};

// FIRE Dashboard Content Component (Tab 0)
const FIREDashboardContent: React.FC<{
  calculations: FIRECalculation[];
  portfolioValuation: PortfolioValuation | null;
  fireProfile: FIREProfile;
  inflationAnalysis: any;
  formatCurrency: (amount: number, currency?: string) => string;
  user: any;
}> = ({ calculations, portfolioValuation, fireProfile, inflationAnalysis, formatCurrency, user }) => {
  
  const getFIREIcon = (fireType: string) => {
    switch (fireType) {
      case 'Coast': return <BeachAccess />;
      case 'Barista': return <Coffee />;
      case 'Traditional': return <TrendingUp />;
      default: return <GpsFixed />;
    }
  };

  const getFIREColor = (fireType: string) => {
    switch (fireType) {
      case 'Coast': return '#4CAF50';
      case 'Barista': return '#FF9800';
      case 'Traditional': return '#2196F3';
      default: return '#666';
    }
  };

  const getTimeToFIRE = (calculation: FIRECalculation) => {
    if (calculation.achieved) {
      return 'Already achieved!';
    }
    
    if (!calculation.years_remaining || calculation.years_remaining <= 0) {
      return 'Not achievable with current plan';
    }
    
    const years = Math.floor(calculation.years_remaining);
    const months = Math.round((calculation.years_remaining - years) * 12);
    
    if (years === 0) {
      return `${months} months`;
    } else {
      return `${years} years, ${months} months`;
    }
  };

  return (
    <Grid container spacing={4}>
      {calculations.map((calc) => {
        const currentValue = portfolioValuation?.totalValueInBaseCurrency || 0;
        const progress = Math.min((currentValue / calc.target_amount) * 100, 100);
        const isAchieved = calc.achieved || progress >= 100;
        const rawProgress = (currentValue / calc.target_amount) * 100;

        return (
          <Grid item xs={12} md={6} lg={4} key={calc.fire_type}>
            <Card 
              elevation={0} 
              sx={{ 
                borderRadius: 3, 
                border: '2px solid', 
                borderColor: isAchieved ? getFIREColor(calc.fire_type) : 'grey.200',
                height: '100%',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 4
                }
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
                  <Box 
                    sx={{ 
                      p: 1.5, 
                      borderRadius: 2, 
                      bgcolor: `${getFIREColor(calc.fire_type)}20`,
                      color: getFIREColor(calc.fire_type)
                    }}
                  >
                    {getFIREIcon(calc.fire_type)}
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                      {calc.fire_type} FIRE
                    </Typography>
                    <Typography 
                      variant="body2" 
                      color="text.secondary"
                      sx={{ 
                        fontSize: '0.85rem',
                        fontWeight: isAchieved ? 'bold' : 'normal',
                        color: isAchieved ? getFIREColor(calc.fire_type) : 'text.secondary'
                      }} 
                    />
                  </Box>
                  {isAchieved && (
                    <CheckCircle sx={{ color: getFIREColor(calc.fire_type), fontSize: 32 }} />
                  )}
                </Stack>

                {/* Target Amount */}
                <Box sx={{ mb: 3, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Target Amount
                  </Typography>
                  <Typography 
                    variant="h4" 
                    sx={{ 
                      fontWeight: 'bold', 
                      color: getFIREColor(calc.fire_type),
                      mb: 1
                    }}
                  >
                    {formatCurrency(calc.target_amount)}
                  </Typography>

                  {/* 🆕 Enhanced Inflation Impact Analysis */}
                  {calc.fire_type === 'Traditional' && calc.target_inflation_adjusted && calc.inflation_impact && (
                    <Box sx={{ mt: 2 }}>
                      <Alert 
                        severity="warning" 
                        sx={{ 
                          textAlign: 'left',
                          '& .MuiAlert-message': { width: '100%' },
                          border: '1px solid',
                          borderColor: 'warning.main'
                        }}
                      >
                        <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1, display: 'flex', alignItems: 'center' }}>
                          <Warning sx={{ mr: 1, fontSize: 18 }} />
                          Inflation Impact Analysis
                        </Typography>
                        
                        <Grid container spacing={2} sx={{ mb: 2 }}>
                          <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary">Today's Purchasing Power:</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                              {formatCurrency(calc.target_amount)}
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary">Inflation-Adjusted Target:</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'error.main' }}>
                              {formatCurrency(calc.target_inflation_adjusted)}
                            </Typography>
                          </Grid>
                        </Grid>
                        
                        <Box sx={{ p: 2, bgcolor: 'error.50', borderRadius: 1, mb: 2 }}>
                          <Typography variant="body2" sx={{ color: 'error.main', fontWeight: 'bold', textAlign: 'center' }}>
                            💰 Additional Required: {formatCurrency(calc.inflation_impact)}
                          </Typography>
                        </Box>
                        
                        {inflationAnalysis && (
                          <Box>
                            <Typography variant="caption" sx={{ display: 'block', fontStyle: 'italic', mb: 1 }}>
                              📊 Analysis Details:
                            </Typography>
                            <Typography variant="caption" sx={{ display: 'block' }}>
                              • Inflation Rate: {(fireProfile.expected_inflation_rate * 100).toFixed(1)}% annually (your setting)
                            </Typography>
                            <Typography variant="caption" sx={{ display: 'block' }}>
                              • Years to Retirement: {fireProfile?.target_retirement_age && user?.birth_year ? fireProfile.target_retirement_age - (new Date().getFullYear() - user.birth_year) : 'N/A'}
                            </Typography>
                            <Typography variant="caption" sx={{ display: 'block' }}>
                              • Purchasing Power Loss: {inflationAnalysis.purchasing_power_erosion || 'N/A'}
                            </Typography>
                          </Box>
                        )}
                      </Alert>
                    </Box>
                  )}
                  
                  {/* 🆕 Enhanced Real Return Information for Coast FIRE */}
                  {calc.fire_type === 'Coast' && calc.real_return_used && inflationAnalysis && (
                    <Box sx={{ mt: 2 }}>
                      <Alert 
                        severity="info" 
                        sx={{ 
                          textAlign: 'left',
                          '& .MuiAlert-message': { width: '100%' },
                          border: '1px solid',
                          borderColor: 'info.main'
                        }}
                      >
                        <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 2, display: 'flex', alignItems: 'center' }}>
                          📊 Inflation-Adjusted Return Analysis
                        </Typography>
                        
                        <Grid container spacing={2} sx={{ mb: 2 }}>
                          <Grid item xs={4}>
                            <Typography variant="caption" color="text.secondary">Nominal Return:</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                              {(fireProfile.expected_return_pre_retirement * 100).toFixed(1)}%
                            </Typography>
                          </Grid>
                          <Grid item xs={4}>
                            <Typography variant="caption" color="text.secondary">Inflation Rate:</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'warning.main' }}>
                              {(fireProfile.expected_inflation_rate * 100).toFixed(1)}%
                            </Typography>
                          </Grid>
                          <Grid item xs={4}>
                            <Typography variant="caption" color="text.secondary">Real Return:</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'info.main' }}>
                              {calc.real_return_used ? (calc.real_return_used * 100).toFixed(2) : ((fireProfile.expected_return_pre_retirement - fireProfile.expected_inflation_rate) * 100).toFixed(2)}%
                            </Typography>
                          </Grid>
                        </Grid>
                        
                        <Box sx={{ p: 2, bgcolor: 'info.50', borderRadius: 1 }}>
                          <Typography variant="caption" sx={{ display: 'block', fontStyle: 'italic', textAlign: 'center' }}>
                            💡 Coast FIRE uses inflation-adjusted returns for realistic long-term projections
                          </Typography>
                        </Box>
                      </Alert>
                    </Box>
                  )}
                  
                  {/* 🆕 Enhanced Explanation for Barista FIRE */}
                  {calc.fire_type === 'Barista' && calc.concept === 'coast_fire_variation' && (
                    <Box sx={{ mt: 2 }}>
                      <Alert 
                        severity="info" 
                        sx={{ 
                          textAlign: 'left',
                          '& .MuiAlert-message': { width: '100%' },
                          border: '1px solid',
                          borderColor: 'info.main'
                        }}
                      >
                        <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 2, display: 'flex', alignItems: 'center' }}>
                          ☕ Barista FIRE - Coast FIRE Variation
                        </Typography>
                        
                        <Typography variant="body2" sx={{ mb: 2 }}>
                          {calc.explanation}
                        </Typography>
                        
                        <Grid container spacing={2} sx={{ mb: 2 }}>
                          <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary">Full-time Contributions:</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                              {formatCurrency(calc.full_time_contribution)}/year
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary">Part-time Contributions:</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'warning.main' }}>
                              {formatCurrency(calc.barista_annual_contribution)}/year
                            </Typography>
                          </Grid>
                        </Grid>
                        
                        <Box sx={{ p: 2, bgcolor: 'info.50', borderRadius: 1, mb: 2 }}>
                          <Typography variant="body2" sx={{ color: 'info.main', fontWeight: 'bold', textAlign: 'center' }}>
                            💡 Reach this amount, then switch to part-time work while still achieving Traditional FIRE!
                          </Typography>
                        </Box>
                        
                        <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                          <Typography variant="caption" sx={{ display: 'block', fontStyle: 'italic' }}>
                            📋 This is the crossover point where reduced contributions still get you to {formatCurrency(calc.traditional_fire_target)} by retirement
                          </Typography>
                        </Box>
                      </Alert>
                    </Box>
                  )}
                </Box>

                {/* Timeline */}
                <Box sx={{ mb: 3, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Time to Achievement
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
                    {getTimeToFIRE(calc)}
                  </Typography>
                  {!calc.achieved && calc.years_remaining && calc.years_remaining > 0 && (
                    <Typography variant="body2" color="text.secondary">
                      Target age: {Math.round((new Date().getFullYear() - (user?.birth_year || 1990)) + calc.years_remaining)}
                    </Typography>
                  )}
                </Box>

                {/* Progress Bar */}
                <Box sx={{ mb: 2 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">Progress</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      {progress.toFixed(1)}%
                    </Typography>
                  </Stack>
                  <LinearProgress 
                    variant="determinate" 
                    value={Math.min(progress, 100)} 
                    sx={{ 
                      height: 8, 
                      borderRadius: 4,
                      bgcolor: 'grey.200',
                      '& .MuiLinearProgress-bar': {
                        bgcolor: getFIREColor(calc.fire_type),
                        borderRadius: 4
                      }
                    }} 
                  />
                  {rawProgress > 100 && (
                    <Typography variant="caption" color="success.main" sx={{ mt: 0.5, display: 'block', textAlign: 'center' }}>
                      🎉 {(rawProgress - 100).toFixed(1)}% over target!
                    </Typography>
                  )}
                </Box>

                {/* Description */}
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem', lineHeight: 1.4 }}>
                  {calc.fire_type === 'Coast' && 'Stop saving now, let compound growth reach your FIRE target by retirement age.'}
                  {calc.fire_type === 'Barista' && 'Switch to part-time work at this point and still reach Traditional FIRE by retirement.'}
                  {calc.fire_type === 'Traditional' && 'Complete financial independence with full retirement capability.'}
                </Typography>
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
  calculations: FIRECalculation[];
  portfolioValuation: PortfolioValuation | null;
  fireProfile: FIREProfile;
  formatCurrency: (amount: number, currency?: string) => string;
}> = ({ calculations, portfolioValuation, fireProfile, formatCurrency }) => {
  const currentValue = portfolioValuation?.totalValueInBaseCurrency || 0;
  const currentAge = new Date().getFullYear() - (fireProfile.target_retirement_age - 30); // Approximate
  const projectionYears = 30;
  
  // Generate projection data
  const projectionData = [];
  for (let year = 0; year <= projectionYears; year++) {
    const futureValue = currentValue * Math.pow(1 + (fireProfile.expected_return_pre_retirement || 0.07), year);
    projectionData.push({
      year: new Date().getFullYear() + year,
      age: currentAge + year,
      portfolioValue: futureValue
    });
  }

  return (
    <Grid container spacing={4}>
      <Grid item xs={12}>
        <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'grey.200', p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 3 }}>
            Portfolio Growth Projection
          </Typography>
          
          {/* Simple projection visualization */}
          <Box sx={{ height: 300, position: 'relative', bgcolor: 'grey.50', borderRadius: 2, p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', height: '100%' }}>
              {projectionData.filter((_, index) => index % 5 === 0).map((point, index) => {
                const height = Math.min((point.portfolioValue / (currentValue * 3)) * 100, 100);
                return (
                  <Box key={point.year} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <Tooltip title={`${point.year}: ${formatCurrency(point.portfolioValue)}`}>
                      <Box 
                        sx={{ 
                          width: 40, 
                          height: `${height}%`, 
                          bgcolor: 'primary.main', 
                          borderRadius: 1,
                          mb: 1,
                          minHeight: 20
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
          </Box>

          {/* FIRE Target Lines */}
          <Box sx={{ mt: 3 }}>
            <Typography variant="body2" sx={{ mb: 2, fontWeight: 'bold' }}>
              FIRE Targets:
            </Typography>
            {calculations.map((calc) => (
              <Box key={calc.fire_type} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Box 
                  sx={{ 
                    width: 16, 
                    height: 16, 
                    bgcolor: calc.fire_type === 'Coast' ? '#4CAF50' : calc.fire_type === 'Barista' ? '#FF9800' : '#2196F3',
                    borderRadius: 1,
                    mr: 2
                  }} 
                />
                <Typography variant="body2">
                  {calc.fire_type} FIRE: {formatCurrency(calc.target_amount)}
                </Typography>
              </Box>
            ))}
          </Box>
        </Card>
      </Grid>
    </Grid>
  );
};

// What-If Simulator Tab Component
const WhatIfSimulatorTab: React.FC<{
  whatIfValues: any;
  setWhatIfValues: (values: any) => void;
  fireProfile: FIREProfile;
  portfolioValuation: PortfolioValuation | null;
  formatCurrency: (amount: number, currency?: string) => string;
  user: any;
}> = ({ whatIfValues, setWhatIfValues, fireProfile, portfolioValuation, formatCurrency, user }) => {
  
  // Simple FIRE calculation
  const calculateSimpleFIRE = (monthlyContribution: number, annualExpenses: number, targetAge: number, expectedReturn: number) => {
    const currentValue = portfolioValuation?.totalValueInBaseCurrency || 0;
    const currentAge = new Date().getFullYear() - (user?.birth_year || 1990);
    const yearsToRetirement = targetAge - currentAge;
    const traditionalTarget = annualExpenses / 0.04;
    
    // Simple compound growth calculation
    const monthlyRate = expectedReturn / 12;
    const months = yearsToRetirement * 12;
    
    let futureValue = currentValue;
    if (monthlyRate > 0) {
      futureValue = currentValue * Math.pow(1 + monthlyRate, months) + 
                   monthlyContribution * (Math.pow(1 + monthlyRate, months) - 1) / monthlyRate;
    }
    
    const yearsToFIRE = Math.max(0, Math.log(traditionalTarget / currentValue) / Math.log(1 + expectedReturn));
    
    return {
      traditionalFire: {
        target: traditionalTarget,
        achievementAge: currentAge + yearsToFIRE,
        years: yearsToFIRE,
        achievable: yearsToFIRE <= yearsToRetirement
      }
    };
  };

  const whatIfResults = calculateSimpleFIRE(
    whatIfValues.monthlyContribution,
    whatIfValues.annualExpenses,
    whatIfValues.targetRetirementAge,
    whatIfValues.expectedReturn
  );

  return (
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
            <Slider
              value={whatIfValues.monthlyContribution}
              onChange={(_, value) => setWhatIfValues({...whatIfValues, monthlyContribution: value as number})}
              min={1000}
              max={20000}
              step={500}
              sx={{ mb: 3 }}
            />
          </Box>

          <Box sx={{ mb: 4 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              Annual Expenses: {formatCurrency(whatIfValues.annualExpenses)}
            </Typography>
            <Slider
              value={whatIfValues.annualExpenses}
              onChange={(_, value) => setWhatIfValues({...whatIfValues, annualExpenses: value as number})}
              min={30000}
              max={150000}
              step={5000}
              sx={{ mb: 3 }}
            />
          </Box>

          <Box sx={{ mb: 4 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              Target Retirement Age: {whatIfValues.targetRetirementAge}
            </Typography>
            <Slider
              value={whatIfValues.targetRetirementAge}
              onChange={(_, value) => setWhatIfValues({...whatIfValues, targetRetirementAge: value as number})}
              min={40}
              max={75}
              step={1}
              sx={{ mb: 3 }}
            />
          </Box>

          <Box sx={{ mb: 4 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              Expected Return: {(whatIfValues.expectedReturn * 100).toFixed(1)}%
            </Typography>
            <Slider
              value={whatIfValues.expectedReturn}
              onChange={(_, value) => setWhatIfValues({...whatIfValues, expectedReturn: value as number})}
              min={0.04}
              max={0.12}
              step={0.005}
              sx={{ mb: 3 }}
            />
          </Box>
        </Card>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'grey.200', p: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 3 }}>
            Impact Analysis
          </Typography>

          {whatIfResults ? (
            <Stack spacing={3}>
              {/* Traditional FIRE Results */}
              <Paper elevation={1} sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, color: 'primary.main' }}>
                  Traditional FIRE
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">Target Amount:</Typography>
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                      {formatCurrency(whatIfResults.traditionalFire.target)}
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
            </Stack>
          ) : (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <TuneRounded sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
              <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                Adjust the parameters to see real-time impact analysis
              </Typography>
            </Box>
          )}
        </Card>
      </Grid>
    </Grid>
  );
};

// Income Breakdown Tab Component
const IncomeBreakdownTab: React.FC<{
  fireProfile: FIREProfile;
  calculations: FIRECalculation[];
  formatCurrency: (amount: number, currency?: string) => string;
}> = ({ fireProfile, calculations, formatCurrency }) => {
  return (
    <Grid container spacing={4}>
      {calculations.map((calc) => (
        <Grid item xs={12} md={4} key={calc.fire_type}>
          <Card elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'grey.200', p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 3, color: calc.fire_type === 'Coast' ? 'success.main' : calc.fire_type === 'Barista' ? 'warning.main' : 'primary.main' }}>
              {calc.fire_type} FIRE Income
            </Typography>
            
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <Typography variant="h4" sx={{ fontWeight: 'bold', color: calc.fire_type === 'Coast' ? 'success.main' : calc.fire_type === 'Barista' ? 'warning.main' : 'primary.main' }}>
                {formatCurrency(fireProfile.annual_expenses)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Annual Income Needed
              </Typography>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Stack spacing={2}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2">Investment Income:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                    {formatCurrency(calc.target_amount * (fireProfile.safe_withdrawal_rate || 0.04))}
                  </Typography>
                </Box>
                
                {calc.fire_type === 'Barista' && calc.concept === 'coast_fire_variation' && (
                  <>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2">Full-time Contributions:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                        {formatCurrency(calc.full_time_contribution || 0)}/year
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2">Part-time Contributions:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'warning.main' }}>
                        {formatCurrency(calc.barista_annual_contribution || 0)}/year
                      </Typography>
                    </Box>
                  </>
                )}
                
                <Divider />
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>Total Income:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                    {formatCurrency(calc.target_amount * (fireProfile.safe_withdrawal_rate || 0.04))}
                  </Typography>
                </Box>
              </Stack>
            </Box>

            <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic', textAlign: 'center' }}>
              {calc.fire_type === 'Traditional' && 'Complete financial independence through investment income only'}
              {calc.fire_type === 'Barista' && 'Coast FIRE variation - switch to part-time work and still reach Traditional FIRE'}
              {calc.fire_type === 'Coast' && 'Let investments grow to full FIRE target by retirement age'}
            </Typography>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};

// FIRE Profile Dialog Component
const FIREProfileDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  formData: CreateFIREProfileRequest;
  setFormData: (data: CreateFIREProfileRequest) => void;
  onSave: () => void;
  fireProfile: FIREProfile | null;
  user: any;
}> = ({ open, onClose, formData, setFormData, onSave, fireProfile, user }) => {
  
  const handleInputChange = (field: keyof CreateFIREProfileRequest) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = parseFloat(event.target.value) || 0;
    setFormData({ ...formData, [field]: value });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
          {fireProfile ? 'Update FIRE Goals' : 'Set Your FIRE Goals'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Configure your financial parameters to calculate personalized FIRE targets
        </Typography>
      </DialogTitle>
      
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          {/* Basic Financial Information */}
          <Paper elevation={0} sx={{ p: 3, bgcolor: 'grey.50' }}>
            <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>
              💰 Basic Financial Information
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Annual Expenses"
                  type="number"
                  value={formData.annual_expenses}
                  onChange={handleInputChange('annual_expenses')}
                  InputProps={{
                    startAdornment: <Typography sx={{ mr: 1 }}>{user?.base_currency || 'USD'}</Typography>
                  }}
                  helperText="Your expected annual spending in retirement"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Target Retirement Age"
                  type="number"
                  value={formData.target_retirement_age}
                  onChange={handleInputChange('target_retirement_age')}
                  inputProps={{ min: 40, max: 80 }}
                  helperText="When you want to achieve FIRE"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Expected Return (Pre-Retirement)"
                  type="number"
                  value={(formData.expected_return_pre_retirement * 100).toFixed(1)}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value) / 100;
                    if (!isNaN(value) && value >= 0) {
                      setFormData({ ...formData, expected_return_pre_retirement: value });
                    }
                  }}
                  inputProps={{ min: 4, max: 12, step: 0.1 }}
                  InputProps={{
                    endAdornment: <Typography sx={{ ml: 1 }}>%</Typography>
                  }}
                  helperText="Expected portfolio return (7% typical)"
                />
              </Grid>
            </Grid>
          </Paper>

          {/* Advanced Settings */}
          <Paper elevation={0} sx={{ p: 3, bgcolor: 'grey.50' }}>
            <Typography variant="h6" sx={{ mb: 2, color: 'warning.main' }}>
              ⚙️ Advanced Settings
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Safe Withdrawal Rate"
                  type="number"
                  value={(formData.safe_withdrawal_rate * 100).toFixed(1)}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value) / 100;
                    if (!isNaN(value) && value >= 0) {
                      setFormData({ ...formData, safe_withdrawal_rate: value });
                    }
                  }}
                  inputProps={{ min: 3, max: 5, step: 0.1 }}
                  InputProps={{
                    endAdornment: <Typography sx={{ ml: 1 }}>%</Typography>
                  }}
                  helperText="Annual withdrawal rate (4% rule typical)"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="🆕 Expected Inflation Rate"
                  type="number"
                  value={(formData.expected_inflation_rate * 100).toFixed(1)}
                  onChange={(e) => {
                    const value = parseFloat(e.target.value) / 100;
                    if (!isNaN(value) && value >= 0) {
                      setFormData({ ...formData, expected_inflation_rate: value });
                    }
                  }}
                  inputProps={{ min: 1, max: 6, step: 0.1 }}
                  InputProps={{
                    endAdornment: <Typography sx={{ ml: 1 }}>%</Typography>
                  }}
                  helperText="Expected annual inflation (affects all FIRE calculations)"
                />
              </Grid>
            </Grid>
          </Paper>

          {/* Barista FIRE Settings */}
          <Paper elevation={0} sx={{ p: 3, bgcolor: 'warning.50' }}>
            <Typography variant="h6" sx={{ mb: 2, color: 'warning.main' }}>
              ☕ Barista FIRE Settings
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Full-time Annual Contribution"
                  type="number"
                  value={formData.annual_income - formData.annual_expenses} // Approximate full-time savings
                  InputProps={{
                    startAdornment: <Typography sx={{ mr: 1 }}>{user?.base_currency || 'USD'}</Typography>,
                    readOnly: true
                  }}
                  helperText="Your current full-time investment capacity"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Part-time Annual Contribution"
                  type="number"
                  value={formData.barista_annual_contribution}
                  onChange={handleInputChange('barista_annual_contribution')}
                  InputProps={{
                    startAdornment: <Typography sx={{ mr: 1 }}>{user?.base_currency || 'USD'}</Typography>
                  }}
                  helperText="How much you can invest while working part-time"
                />
              </Grid>
            </Grid>
            <Box sx={{ mt: 2, p: 2, bgcolor: 'warning.100', borderRadius: 1 }}>
              <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'warning.dark' }}>
                💡 Barista FIRE finds the crossover point where you can switch to part-time work 
                and still reach Traditional FIRE by your retirement age.
              </Typography>
            </Box>
          </Paper>
        </Stack>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={onSave}
          disabled={
            formData.annual_expenses <= 0 ||
            formData.target_retirement_age <= 0
          }
        >
          {fireProfile ? 'Update Goals' : 'Calculate FIRE Goals'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default Goals;
