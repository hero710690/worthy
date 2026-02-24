import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  LinearProgress,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
  Paper,
  Grid
} from '@mui/material';
import {
  TrendingUp,
  Settings,
  TuneRounded
} from '@mui/icons-material';

import { useAuthStore } from '../store/authStore';
import { assetAPI } from '../services/assetApi';
import { assetValuationService } from '../services/assetValuationService';
import { fireApi } from '../services/fireApi';
import { recurringInvestmentApi } from '../services/recurringInvestmentApi';
import { exchangeRateService } from '../services/exchangeRateService';
import { calculatePreciseAge } from '../utils/dateUtils';
// 🆕 NEW: Import coast-fire-calculator proven algorithms
import { calculateAllFireTypes, type CoastFireInput } from '../services/coastFireCalculator';
// Import new tab components
import { DashboardTab } from './DashboardTab';
import { WhatIfSimulatorTab } from './WhatIfSimulatorTab';
import { SettingsTab } from './SettingsTab';
import type { Asset, RecurringInvestment } from '../types/assets';
import type { 
  FIREProfile, 
  CreateFIREProfileRequest, 
  FIREProgressResponse 
} from '../types/fire';
import type { PortfolioValuation } from '../services/assetValuationService';

const Goals: React.FC = () => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // FIRE data state
  const [fireProfile, setFireProfile] = useState<FIREProfile | null>(null);
  const [fireProgress, setFireProgress] = useState<FIREProgressResponse | null>(null);
  const [calculations, setCalculations] = useState<any[]>([]);
  const [portfolioValuation, setPortfolioValuation] = useState<PortfolioValuation | null>(null);
  const [recurringInvestments, setRecurringInvestments] = useState<RecurringInvestment[]>([]);
  const [includeCashInFIRE, setIncludeCashInFIRE] = useState<boolean>(true); // New state for cash/CD inclusion
  
  // Calculate portfolio value for FIRE calculations (with optional cash/CD exclusion)
  const getPortfolioValueForFIRE = () => {
    if (!portfolioValuation) return 0;
    
    if (includeCashInFIRE) {
      return portfolioValuation.totalValueInBaseCurrency;
    } else {
      // Exclude Cash and CD assets from FIRE calculations
      const investmentAssetsValue = portfolioValuation.assets
        .filter(assetVal => assetVal.asset.asset_type !== 'Cash' && assetVal.asset.asset_type !== 'CD')
        .reduce((total, assetVal) => total + assetVal.totalValueInBaseCurrency, 0);
      
      console.log('💰 Portfolio value for FIRE calculations:', {
        totalValue: portfolioValuation.totalValueInBaseCurrency,
        investmentAssetsValue,
        includeCashInFIRE,
        excludedAssets: portfolioValuation.assets.filter(assetVal => 
          assetVal.asset.asset_type === 'Cash' || assetVal.asset.asset_type === 'CD'
        ).map(assetVal => ({
          symbol: assetVal.asset.ticker_symbol,
          type: assetVal.asset.asset_type,
          value: assetVal.totalValueInBaseCurrency
        }))
      });
      
      return investmentAssetsValue;
    }
  };
  
  // Dialog state
  const [openDialog, setOpenDialog] = useState(false);
  const [formData, setFormData] = useState<CreateFIREProfileRequest>({
    annual_expenses: 60000,
    target_retirement_age: 65,
    annual_income: 100000,
    safe_withdrawal_rate: 0.036,
    expected_return_pre_retirement: 0.07,
    expected_return_post_retirement: 0.05,
    expected_inflation_rate: 0.025,
    other_passive_income: 0,
    effective_tax_rate: 0.15,
    barista_monthly_contribution: 0,
    inflation_rate: 0.025
  });

  // 🆕 NEW: Barista FIRE monthly contribution (user input)
  const [baristaMonthlyContribution, setBaristaMonthlyContribution] = useState(2000);

  // 🆕 NEW: Parameters for What-If simulator (moved from Coast FIRE Calculator tab)
  // Note: principal will be updated to actual portfolio value when data loads
  const [parameters, setParameters] = useState({
    currentAge: user?.birth_date ? calculatePreciseAge(user.birth_date) : 35,
    retireAge: 67,
    pmtMonthly: 2500,
    rate: 7, // Percentage
    fireNumber: 2000000,
    principal: 1000000, // Default to $1M, will be updated to actual portfolio value when loaded
    pmtMonthlyBarista: 2000,
    calcMode: "coast" as "coast" | "barista",
    withdrawalRate: 3.6 // 🔧 ADDED: Default withdrawal rate to prevent crashes
  });

  // 🆕 NEW: Function to sync important parameter changes back to FIRE profile
  const syncParametersToProfile = async (updatedParams: any) => {
    if (!fireProfile) return; // Only sync if profile exists
    
    try {
      // Check if important parameters have changed significantly
      const currentRate = fireProfile.expected_return_pre_retirement * 100;
      const newRate = updatedParams.rate;
      const currentWithdrawalRate = fireProfile.safe_withdrawal_rate * 100;
      const newWithdrawalRate = updatedParams.withdrawalRate;
      
      // Only update if there's a significant change (more than 0.5%)
      const rateChanged = Math.abs(currentRate - newRate) > 0.5;
      const withdrawalRateChanged = Math.abs(currentWithdrawalRate - newWithdrawalRate) > 0.1;
      const fireNumberChanged = Math.abs(fireProfile.annual_expenses - updatedParams.fireNumber) > 10000;
      const retirementAgeChanged = fireProfile.target_retirement_age !== updatedParams.retireAge;
      
      if (rateChanged || withdrawalRateChanged || fireNumberChanged || retirementAgeChanged) {
        console.log('🔄 Syncing parameter changes to FIRE profile...');
        
        const updatedProfile = {
          ...formData,
          expected_return_pre_retirement: newRate / 100, // Convert back to decimal
          safe_withdrawal_rate: newWithdrawalRate / 100, // Convert back to decimal
          annual_expenses: updatedParams.fireNumber,
          target_retirement_age: updatedParams.retireAge
        };
        
        // Update the form data
        setFormData(updatedProfile);
        
        // Optionally auto-save to backend (commented out to avoid too many API calls)
        // await fireApi.createOrUpdateFIREProfile(updatedProfile);
        // await loadFIREData();
        
        console.log('✅ Parameters synced to form data');
      }
    } catch (error) {
      console.error('❌ Error syncing parameters to profile:', error);
    }
  };

  // 🆕 NEW: FIRE calculation results for Dashboard tab
  const [fireResults, setFireResults] = useState<any>(null);

  // Load data on component mount
  useEffect(() => {
    loadFIREData();
    loadRecurringInvestments();
  }, []);

  // 🆕 NEW: Calculate FIRE results when parameters change
  useEffect(() => {
    if (portfolioValuation && fireProfile) {
      calculateFIREResults();
    }
  }, [portfolioValuation, fireProfile, parameters, baristaMonthlyContribution, includeCashInFIRE]); // Added includeCashInFIRE dependency

  // 🆕 NEW: Update parameters when portfolio valuation changes to use actual portfolio value
  useEffect(() => {
    if (portfolioValuation) {
      const portfolioValueForFIRE = getPortfolioValueForFIRE();
      console.log('📊 Updating parameters with portfolio value:', portfolioValueForFIRE);
      
      setParameters(prev => ({
        ...prev,
        principal: portfolioValueForFIRE
      }));
    }
  }, [portfolioValuation, includeCashInFIRE]); // Update when portfolio or cash inclusion changes

  const calculateFIREResults = () => {
    if (!portfolioValuation || !fireProfile) return;

    const portfolioValueForFIRE = getPortfolioValueForFIRE(); // Use filtered value

    console.log('🔥 calculateFIREResults called with:', {
      portfolioValuation: portfolioValuation,
      portfolioValueForFIRE: portfolioValueForFIRE,
      includeCashInFIRE: includeCashInFIRE,
      fireProfile: fireProfile
    });

    const currentAge = user?.birth_date ? calculatePreciseAge(user.birth_date) : 35;
    
    // 🔧 FIXED: Use same calculation logic as RecurringInvestments page
    const monthlyRecurringTotal = recurringInvestments
      .filter(inv => inv.is_active)
      .reduce((sum, inv) => {
        // Use the proper convertCurrency method from exchange rate service
        const convertedAmount = exchangeRateService.convertCurrency(
          inv.amount, 
          inv.currency, 
          user?.base_currency || 'USD'
        );
        
        // Convert to monthly equivalent based on frequency
        let monthlyEquivalent = convertedAmount;
        switch (inv.frequency.toLowerCase()) {
          case 'daily':
            monthlyEquivalent = convertedAmount * 30;
            break;
          case 'weekly':
            monthlyEquivalent = convertedAmount * 4.33;
            break;
          case 'monthly':
            monthlyEquivalent = convertedAmount;
            break;
          case 'quarterly':
            monthlyEquivalent = convertedAmount / 3;
            break;
          default:
            monthlyEquivalent = convertedAmount;
        }
        
        return sum + monthlyEquivalent;
      }, 0);

    console.log('🔥 FIRE Calculation Input:', {
      fireNumber: fireProfile.annual_expenses,
      currentAge: currentAge,
      retirementAge: fireProfile.target_retirement_age,
      rate: fireProfile.expected_return_pre_retirement || 0.07,
      pmtMonthly: monthlyRecurringTotal,
      principal: portfolioValueForFIRE, // Use filtered value instead of total
      pmtMonthlyBarista: baristaMonthlyContribution,
      portfolioValueFromValuation: portfolioValueForFIRE // Use filtered value
    });

    const input: CoastFireInput = {
      fireNumber: fireProfile.annual_expenses, // Using as FIRE number directly
      currentAge: currentAge,
      retirementAge: fireProfile.target_retirement_age,
      rate: fireProfile.expected_return_pre_retirement || 0.07,
      pmtMonthly: monthlyRecurringTotal, // 🔧 FIXED: Same calculation as Recurring page
      principal: portfolioValueForFIRE, // Use filtered value instead of total
      pmtMonthlyBarista: baristaMonthlyContribution
    };

    const results = calculateAllFireTypes(input);
    console.log('🔥 FIRE Results calculated:', results);
    setFireResults(results);
  };

  const loadFIREData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔥 Loading FIRE data...');
      
      // Get user's base currency
      const userBaseCurrency = user?.base_currency || 'USD';
      console.log('💰 User base currency:', userBaseCurrency);
      
      // Load assets and calculate portfolio value
      try {
        console.log('📊 Loading assets...');
        const assetsResponse = await assetAPI.getAssets();
        console.log('📊 Assets response:', assetsResponse);
        
        if (assetsResponse.assets && assetsResponse.assets.length > 0) {
          console.log('💼 Calculating portfolio valuation...');
          const valuation = await assetValuationService.valuatePortfolio(
            assetsResponse.assets,
            userBaseCurrency
          );
          console.log('💼 Portfolio valuation:', valuation);
          setPortfolioValuation(valuation);
        } else {
          console.log('📊 No assets found, setting empty portfolio');
          setPortfolioValuation({
            assets: [],
            totalValueInBaseCurrency: 0,
            totalUnrealizedGainLoss: 0,
            totalUnrealizedGainLossPercent: 0,
            baseCurrency: userBaseCurrency,
            lastUpdated: new Date(),
            apiStatus: {
              exchangeRates: false,
              stockPrices: false
            }
          });
        }
      } catch (assetError) {
        console.error('❌ Error loading assets:', assetError);
        // Continue without assets - set empty portfolio
        setPortfolioValuation({
          assets: [],
          totalValueInBaseCurrency: 0,
          totalUnrealizedGainLoss: 0,
          totalUnrealizedGainLossPercent: 0,
          baseCurrency: userBaseCurrency,
          lastUpdated: new Date(),
          apiStatus: {
            exchangeRates: false,
            stockPrices: false
          }
        });
      }

      // Try to load existing FIRE profile and progress
      try {
        console.log('🔥 Loading FIRE profile...');
        const profileResponse = await fireApi.getFIREProfile();
        console.log('🔥 FIRE profile response:', profileResponse);
        console.log('🔥 Profile exists?', !!profileResponse?.fire_profile);
        
        if (profileResponse.fire_profile) {
          console.log('✅ FIRE profile found:', profileResponse.fire_profile);
          setFireProfile(profileResponse.fire_profile);
          
          // Update form data with existing profile
          setFormData({
            annual_expenses: profileResponse.fire_profile.annual_expenses,
            target_retirement_age: profileResponse.fire_profile.target_retirement_age,
            annual_income: profileResponse.fire_profile.annual_income || 100000,
            safe_withdrawal_rate: profileResponse.fire_profile.safe_withdrawal_rate,
            expected_return_pre_retirement: profileResponse.fire_profile.expected_return_pre_retirement || 0.07,
            expected_return_post_retirement: profileResponse.fire_profile.expected_return_post_retirement || 0.05,
            expected_inflation_rate: profileResponse.fire_profile.expected_inflation_rate,
            other_passive_income: profileResponse.fire_profile.other_passive_income || 0,
            effective_tax_rate: profileResponse.fire_profile.effective_tax_rate || 0.15,
            barista_monthly_contribution: profileResponse.fire_profile.barista_monthly_contribution ?? fireProfile.barista_monthly_contribution,
            inflation_rate: profileResponse.fire_profile.inflation_rate
          });
          
          // Initialize parameters with user data
          const userAge = user?.birth_date ? calculatePreciseAge(user.birth_date) : 35;
          
          // Set barista monthly contribution from profile
          setBaristaMonthlyContribution(profileResponse.fire_profile.barista_monthly_contribution || 2000);
          
          setParameters(prev => ({
            ...prev,
            currentAge: userAge,
            retireAge: profileResponse.fire_profile.target_retirement_age,
            fireNumber: profileResponse.fire_profile.annual_expenses, // Using as FIRE number
            rate: Math.round((profileResponse.fire_profile.expected_return_pre_retirement || 0.07) * 100 * 10) / 10, // Convert to percentage and round to 1 decimal
            withdrawalRate: 3.6, // 🔧 ALWAYS default to 3.6% for what-if simulator, regardless of saved profile
            principal: getPortfolioValueForFIRE() // Use filtered value
          }));
          
          console.log('✅ FIRE profile loaded successfully');
        } else {
          console.log('❌ No FIRE profile found in response');
          console.log('🔍 Response structure:', Object.keys(profileResponse || {}));
          setFireProfile(null);
        }
        
        // Try to load FIRE progress (optional)
        try {
          console.log('📈 Loading FIRE progress...');
          const progressResponse = await fireApi.getFIREProgress();
          console.log('📈 FIRE progress response:', progressResponse);
          setFireProgress(progressResponse);
          setCalculations(progressResponse.calculations || []);
        } catch (progressError) {
          console.log('ℹ️ No FIRE progress found (this is normal for new profiles)');
          setFireProgress(null);
          setCalculations([]);
        }
        
      } catch (profileError: any) {
        console.log('ℹ️ No existing FIRE profile found, will need to create one');
        console.log('Profile error details:', profileError);
        setFireProfile(null);
        setFireProgress(null);
        setCalculations([]);
      }
      
      console.log('✅ FIRE data loading completed');
      
    } catch (err: any) {
      console.error('❌ Failed to load FIRE data:', err);
      console.error('Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      });
      setError(err.response?.data?.message || err.message || 'Failed to load FIRE data');
    } finally {
      setLoading(false);
    }
  };

  const loadRecurringInvestments = async () => {
    try {
      const response = await recurringInvestmentApi.getRecurringInvestments();
      setRecurringInvestments(response.recurring_investments || []);
    } catch (error) {
      console.error('Failed to load recurring investments:', error);
    }
  };

  const handleSaveProfile = async () => {
    try {
      // Include barista monthly contribution in the form data
      const profileData = {
        ...formData,
        barista_monthly_contribution: baristaMonthlyContribution
      };
      
      if (fireProfile) {
        await fireApi.updateFIREProfile(profileData);
      } else {
        await fireApi.createFIREProfile(profileData);
      }
      
      setOpenDialog(false);
      await loadFIREData(); // Reload data after saving
    } catch (error: any) {
      console.error('Failed to save FIRE profile:', error);
      setError(error.response?.data?.message || 'Failed to save FIRE profile');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: user?.base_currency || 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        width: '100%',
        gap: 2
      }}>
        <LinearProgress sx={{ width: '200px' }} />
        <Typography variant="body2" color="text.secondary">
          Loading your FIRE goals and progress...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 3 }}>
        <Typography variant="h6">Error Loading FIRE Data</Typography>
        <Typography variant="body2">{error}</Typography>
        <Button 
          variant="outlined" 
          onClick={loadFIREData} 
          sx={{ mt: 2 }}
        >
          Retry
        </Button>
      </Alert>
    );
  }

  return (
    <Box sx={{ 
      p: 3,
      maxWidth: '100%', // Ensure container doesn't exceed viewport
      mx: 'auto' // Center the container
    }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
          🔥 FIRE Goals & Progress
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Track your journey to Financial Independence, Retire Early
        </Typography>
        
        {!fireProfile && (
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              Get started by setting your FIRE goals to see personalized calculations and progress tracking.
            </Typography>
            <Button 
              variant="contained" 
              onClick={() => setOpenDialog(true)}
              sx={{ mt: 1 }}
            >
              Set FIRE Goals
            </Button>
          </Alert>
        )}
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
          <Tab 
            icon={<TrendingUp />} 
            label="Dashboard" 
            sx={{ minHeight: 64 }}
          />
          <Tab 
            icon={<TuneRounded />} 
            label="What-If Simulator" 
            sx={{ minHeight: 64 }}
          />
          <Tab 
            icon={<Settings />} 
            label="Settings" 
            sx={{ minHeight: 64 }}
          />
        </Tabs>
      </Box>

      {/* Tab Content Container with consistent width */}
      <Box sx={{ 
        width: '100%',
        overflow: 'hidden' // Prevent horizontal scroll
      }}>
        {/* Tab Content */}
        {activeTab === 0 && (
          <DashboardTab 
            fireResults={fireResults}
            fireProfile={fireProfile}
            portfolioValuation={portfolioValuation}
            formatCurrency={formatCurrency}
            onOpenSettings={() => setOpenDialog(true)}
            includeCashInFIRE={includeCashInFIRE}
            onToggleIncludeCash={setIncludeCashInFIRE}
            getPortfolioValueForFIRE={getPortfolioValueForFIRE}
          />
        )}

        {activeTab === 1 && (
          <WhatIfSimulatorTab 
            parameters={parameters}
            setParameters={setParameters}
            baristaMonthlyContribution={baristaMonthlyContribution}
            setBaristaMonthlyContribution={setBaristaMonthlyContribution}
            formatCurrency={formatCurrency}
            onParametersChange={syncParametersToProfile}
          />
        )}

        {activeTab === 2 && (
          <SettingsTab 
            fireProfile={fireProfile}
            onOpenDialog={() => setOpenDialog(true)}
            formatCurrency={formatCurrency}
          />
        )}
      </Box>

      {/* FIRE Profile Dialog */}
      <FIREProfileDialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        formData={formData}
        setFormData={setFormData}
        onSave={handleSaveProfile}
        fireProfile={fireProfile}
        user={user}
        baristaMonthlyContribution={baristaMonthlyContribution}
        setBaristaMonthlyContribution={setBaristaMonthlyContribution}
      />
    </Box>
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
  baristaMonthlyContribution: number;
  setBaristaMonthlyContribution: (value: number) => void;
}> = ({ 
  open, 
  onClose, 
  formData, 
  setFormData, 
  onSave, 
  fireProfile, 
  user,
  baristaMonthlyContribution,
  setBaristaMonthlyContribution
}) => {
  
  const handleInputChange = (field: keyof CreateFIREProfileRequest) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = parseFloat(event.target.value) || 0;
    setFormData({ ...formData, [field]: value });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
          {fireProfile ? 'Update FIRE Goals' : 'Set Your FIRE Goals'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Set your target retirement age and FIRE number for personalized calculations
        </Typography>
      </DialogTitle>
      
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 2 }}>
          {/* Simplified FIRE Goals */}
          <Paper elevation={0} sx={{ p: 3, bgcolor: 'primary.50' }}>
            <Typography variant="h6" sx={{ mb: 3, color: 'primary.main', display: 'flex', alignItems: 'center', gap: 1 }}>
              🎯 Your FIRE Goals
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Target Retirement Age"
                  type="number"
                  value={formData.target_retirement_age}
                  onChange={handleInputChange('target_retirement_age')}
                  inputProps={{ min: 40, max: 80 }}
                  helperText="When you want to achieve financial independence"
                  sx={{ mb: 2 }}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Target FIRE Number"
                  type="number"
                  value={formData.annual_expenses}
                  onChange={handleInputChange('annual_expenses')}
                  InputProps={{
                    startAdornment: <Typography sx={{ mr: 1 }}>{user?.base_currency || 'USD'}</Typography>
                  }}
                  helperText="Your target portfolio value for financial independence (e.g., $2,000,000)"
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Expected Annual Return"
                  type="number"
                  value={(formData.expected_return_pre_retirement * 100).toFixed(1)}
                  onChange={(e) => {
                    const value = Number(e.target.value) / 100; // Convert percentage to decimal
                    setFormData(prev => ({ ...prev, expected_return_pre_retirement: value }));
                  }}
                  InputProps={{
                    endAdornment: <Typography sx={{ ml: 1 }}>%</Typography>
                  }}
                  inputProps={{ min: 1, max: 20, step: 0.1 }}
                  helperText="Expected annual return on your investments (e.g., 7% for stock market average)"
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Safe Withdrawal Rate"
                  type="number"
                  value={(formData.safe_withdrawal_rate * 100).toFixed(1)}
                  onChange={(e) => {
                    const value = Number(e.target.value) / 100; // Convert percentage to decimal
                    setFormData(prev => ({ ...prev, safe_withdrawal_rate: value }));
                  }}
                  InputProps={{
                    endAdornment: <Typography sx={{ ml: 1 }}>%</Typography>
                  }}
                  inputProps={{ min: 1, max: 10, step: 0.1 }}
                  helperText="Safe withdrawal rate for retirement (e.g., 3.6% for conservative approach)"
                />
              </Grid>
            </Grid>

            <Box sx={{ mt: 3, p: 2, bgcolor: 'info.50', borderRadius: 1 }}>
              <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'info.dark' }}>
                💡 <strong>How it works:</strong><br/>
                • <strong>Current Portfolio:</strong> Uses your actual portfolio value<br/>
                • <strong>Monthly Contributions:</strong> Uses your recurring investments<br/>
                • <strong>Expected Return:</strong> Used in all FIRE calculations and projections<br/>
                • <strong>Coast-Fire-Calculator:</strong> Provides proven FIRE calculations<br/>
                • <strong>Real-time Updates:</strong> Adjust parameters in the calculator tab
              </Typography>
            </Box>
          </Paper>

          {/* Barista FIRE Monthly Contribution */}
          <Paper elevation={0} sx={{ p: 3, bgcolor: 'warning.50' }}>
            <Typography variant="h6" sx={{ mb: 2, color: 'warning.main' }}>
              ☕ Barista FIRE Contribution
            </Typography>
            
            <TextField
              fullWidth
              label="Barista FIRE Monthly Contribution"
              type="number"
              value={baristaMonthlyContribution}
              onChange={(e) => setBaristaMonthlyContribution(Number(e.target.value))}
              InputProps={{
                startAdornment: <Typography sx={{ mr: 1 }}>{user?.base_currency || 'USD'}</Typography>
              }}
              helperText="Monthly amount you can invest while working part-time"
            />
            
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              This only affects Barista FIRE calculations. Coast FIRE assumes $0 contributions after reaching the target.
            </Typography>
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
          {fireProfile ? 'Update Goals' : 'Set FIRE Goals'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export { Goals as default };
export { Goals };
