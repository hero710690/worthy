import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  Button,
  Grid,
  Stack,
  Chip,
  Divider,
} from '@mui/material';
import {
  Assessment,
  TrendingUp,
  TrendingDown,
  TrendingFlat,
  Refresh,
} from '@mui/icons-material';
import { useAuthStore } from '../store/authStore';
import { assetAPI } from '../services/assetApi';
import { portfolioAPI, type PortfolioValueChangesResponse } from '../services/portfolioApi';
import { returnsCalculationService } from '../services/returnsCalculationService';
import { fireApi } from '../services/fireApi';
import type { PortfolioReturns } from '../types/returns';

export const Analytics: React.FC = () => {
  const { user } = useAuthStore();
  const [assets, setAssets] = useState<any[]>([]);
  const [portfolioChanges, setPortfolioChanges] = useState<PortfolioValueChangesResponse | null>(null);
  const [portfolioReturns, setPortfolioReturns] = useState<PortfolioReturns | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingFIREProfile, setUpdatingFIREProfile] = useState(false);

  const fetchAssetData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔄 Fetching asset data for analytics...');
      const response = await assetAPI.getAssets();
      console.log('✅ Assets fetched:', response.assets.length, 'assets');
      setAssets(response.assets);

      setError(null);
    } catch (error: any) {
      console.error('❌ Failed to fetch asset data:', error);
      setError(error.response?.data?.message || error.message || 'Failed to fetch asset data');
    } finally {
      setLoading(false);
    }
  };

  const fetchPortfolioChanges = async () => {
    try {
      setRefreshing(true);
      console.log('🔄 Fetching portfolio value changes...');
      const changes = await portfolioAPI.getPortfolioValueChanges();
      console.log('✅ Portfolio changes fetched:', changes);
      setPortfolioChanges(changes);
    } catch (error: any) {
      console.error('❌ Failed to fetch portfolio changes:', error);
      // Don't set error state for portfolio changes, just log it
      // The component can still show assets without performance data
    } finally {
      setRefreshing(false);
    }
  };

  const fetchPortfolioReturns = async () => {
    try {
      if (assets.length === 0) {
        setPortfolioReturns(null);
        return;
      }

      console.log('🔄 Calculating portfolio returns...');
      // Clear cache to ensure we get fresh calculations with the bug fixes
      returnsCalculationService.clearCache();

      const baseCurrency = user?.base_currency || 'USD';
      const returns = await returnsCalculationService.calculatePortfolioReturns(assets, baseCurrency);
      console.log('✅ Portfolio returns calculated:', returns);
      setPortfolioReturns(returns);
    } catch (error: any) {
      console.error('❌ Failed to calculate portfolio returns:', error);
      // Don't set error state for returns calculation failure
      setPortfolioReturns(null);
    }
  };

  const fetchAllData = async () => {
    await Promise.all([
      fetchAssetData(),
      fetchPortfolioChanges(),
    ]);

    // Calculate returns after assets are loaded
    if (assets.length > 0) {
      await fetchPortfolioReturns();
    }
  };

  useEffect(() => {
    if (user) {
      fetchAllData();
    }
  }, [user]);

  // Calculate returns when assets change
  useEffect(() => {
    if (assets.length > 0) {
      fetchPortfolioReturns();
    }
  }, [assets]);

  const updateFIREProfileWithCalculatedReturn = async () => {
    if (!portfolioReturns || !user) {
      return;
    }

    try {
      setUpdatingFIREProfile(true);

      // Get current FIRE profile
      const profileResponse = await fireApi.getFIREProfile();

      if (!profileResponse.fire_profile) {
        alert('Please set up your FIRE profile first in the Goals page before using calculated returns.');
        return;
      }

      const currentProfile = profileResponse.fire_profile;
      const calculatedReturn = portfolioReturns.portfolioAnnualizedReturnPercent / 100; // Convert to decimal

      // Update the profile with calculated return
      const updatedProfile = {
        annual_expenses: currentProfile.annual_expenses,
        target_retirement_age: currentProfile.target_retirement_age,
        annual_income: currentProfile.annual_income || 100000,
        safe_withdrawal_rate: currentProfile.safe_withdrawal_rate,
        expected_return_pre_retirement: calculatedReturn,
        expected_return_post_retirement: currentProfile.expected_return_post_retirement || 0.05,
        expected_inflation_rate: currentProfile.expected_inflation_rate,
        other_passive_income: currentProfile.other_passive_income || 0,
        effective_tax_rate: currentProfile.effective_tax_rate || 0.15,
        barista_monthly_contribution: currentProfile.barista_monthly_contribution || 0,
        inflation_rate: currentProfile.inflation_rate
      };

      await fireApi.createOrUpdateFIREProfile(updatedProfile);

      alert(`✅ FIRE profile updated! Expected return set to ${portfolioReturns.portfolioAnnualizedReturnPercent.toFixed(2)}% based on your portfolio performance.`);

    } catch (error: any) {
      console.error('❌ Failed to update FIRE profile:', error);
      alert('Failed to update FIRE profile. Please try again.');
    } finally {
      setUpdatingFIREProfile(false);
    }
  };

  // Helper function to format currency
  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Helper function to get trend icon and color
  const getTrendDisplay = (change: number) => {
    if (change > 0) {
      return {
        icon: <TrendingUp />,
        color: 'success.main',
        sign: '+',
      };
    } else if (change < 0) {
      return {
        icon: <TrendingDown />,
        color: 'error.main',
        sign: '',
      };
    } else {
      return {
        icon: <TrendingFlat />,
        color: 'text.secondary',
        sign: '',
      };
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
          Loading analytics data...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
        <Button onClick={() => fetchAllData()} sx={{ ml: 2 }}>
          Retry
        </Button>
      </Alert>
    );
  }

  // Handle case where user has no assets
  if (assets.length === 0) {
    return (
      <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1, color: 'primary.main' }}>
            Portfolio Analytics
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Advanced performance metrics and investment analysis
          </Typography>
        </Box>

        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            No Assets Found
          </Typography>
          <Typography variant="body1">
            You need to add assets to your portfolio before you can view analytics.
            Start by adding your first investment asset to see detailed performance metrics,
            returns analysis, and portfolio insights.
          </Typography>
        </Alert>

        <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'grey.200' }}>
          <CardContent sx={{ p: 4, textAlign: 'center' }}>
            <Assessment sx={{ fontSize: 80, color: 'primary.main', mb: 2 }} />
            <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 2 }}>
              Ready to Track Your Investments?
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Add your first asset to unlock powerful analytics features.
            </Typography>
            <Button
              variant="contained"
              size="large"
              href="/portfolio"
              sx={{ borderRadius: 2, px: 4 }}
            >
              Add Your First Asset
            </Button>
          </CardContent>
        </Card>
      </Box>
    );
  }

  // Simple analytics view for users with assets
  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1, color: 'primary.main' }}>
              Portfolio Analytics
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Advanced performance metrics and investment analysis
            </Typography>
          </Box>
          <Button
            variant="outlined"
            startIcon={refreshing ? <CircularProgress size={16} /> : <Refresh />}
            onClick={fetchAllData}
            disabled={refreshing}
            sx={{ borderRadius: 2 }}
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </Stack>
      </Box>

      {/* Portfolio Value Change Tracker */}
      {portfolioChanges && (
        <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'grey.200', mb: 4 }}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 'bold' }}>
              Portfolio Value Changes
            </Typography>

            {/* Current Portfolio Value */}
            <Box sx={{ mb: 4, p: 3, bgcolor: 'primary.50', borderRadius: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Current Portfolio Value
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                {formatCurrency(portfolioChanges.current_value, portfolioChanges.base_currency)}
              </Typography>
            </Box>

            {/* Period Changes Grid */}
            <Grid container spacing={3}>
              {Object.entries(portfolioChanges.value_changes).map(([period, change]) => {
                const trend = getTrendDisplay(change.percentage_change);

                return (
                  <Grid item xs={12} sm={6} md={3} key={period}>
                    <Card sx={{
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: 'grey.100',
                      height: '100%',
                    }}>
                      <CardContent sx={{ p: 3 }}>
                        <Stack spacing={2}>
                          {/* Period Header */}
                          <Stack direction="row" alignItems="center" justifyContent="space-between">
                            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                              {period}
                            </Typography>
                            <Box sx={{ color: trend.color }}>
                              {trend.icon}
                            </Box>
                          </Stack>

                          {/* Absolute Change */}
                          <Box>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                              Change
                            </Typography>
                            <Typography
                              variant="h6"
                              sx={{
                                fontWeight: 'bold',
                                color: trend.color,
                              }}
                            >
                              {trend.sign}{formatCurrency(Math.abs(change.absolute_change), change.base_currency)}
                            </Typography>
                          </Box>

                          {/* Percentage Change */}
                          <Box>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                              Return
                            </Typography>
                            <Chip
                              label={`${trend.sign}${Math.abs(change.percentage_change).toFixed(2)}%`}
                              size="small"
                              sx={{
                                bgcolor: trend.color === 'success.main' ? 'success.50' :
                                  trend.color === 'error.main' ? 'error.50' : 'grey.100',
                                color: trend.color,
                                fontWeight: 'bold',
                              }}
                            />
                          </Box>

                          {/* Period Info */}
                          <Divider />
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              {new Date(change.start_date).toLocaleDateString()} - {new Date(change.end_date).toLocaleDateString()}
                            </Typography>
                          </Box>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>

            {/* Performance Notes */}
            <Alert severity="info" sx={{ mt: 3 }}>
              <Typography variant="body2">
                <strong>Performance Calculation:</strong> Returns are calculated using time-weighted methodology,
                excluding cash assets from performance calculations. Values are converted to your base currency
                ({portfolioChanges.base_currency}) using current exchange rates.
              </Typography>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* Estimated Annual Return Section */}
      {portfolioReturns && (
        <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'grey.200', mb: 4 }}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 'bold' }}>
              📊 Estimated Annual Return Rate
            </Typography>

            {/* Main Return Display with Enhanced Information */}
            <Box sx={{ mb: 4, p: 3, bgcolor: 'success.50', borderRadius: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Based on Your Portfolio Performance
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 'bold', color: 'success.main', mb: 1 }}>
                {portfolioReturns.portfolioAnnualizedReturnPercent.toFixed(2)}%
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {portfolioReturns.weightedAverageHoldingPeriod < 1 
                  ? `Actual Return over ${(portfolioReturns.weightedAverageHoldingPeriod * 365.25).toFixed(0)} days`
                  : `Annualized Return (CAGR) over ${portfolioReturns.weightedAverageHoldingPeriod.toFixed(1)} years`
                }
              </Typography>
              
              {/* Performance Context */}
              {portfolioReturns.weightedAverageHoldingPeriod < 0.25 && (
                <Alert severity="info" sx={{ mt: 2, textAlign: 'left' }}>
                  <Typography variant="body2">
                    <strong>Short-term Performance:</strong> This return is based on a short holding period. 
                    Long-term performance may differ significantly.
                  </Typography>
                </Alert>
              )}
            </Box>

            {/* Performance Details */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ textAlign: 'center', p: 2 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Total Return
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    {portfolioReturns.portfolioTotalReturnPercent.toFixed(2)}%
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ textAlign: 'center', p: 2 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Holding Period
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    {portfolioReturns.weightedAverageHoldingPeriod.toFixed(1)} years
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ textAlign: 'center', p: 2 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Total Assets
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    {portfolioReturns.totalAssets}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ textAlign: 'center', p: 2 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Performance Grade
                  </Typography>
                  <Chip
                    label={portfolioReturns.advancedMetrics.performanceGrade}
                    size="medium"
                    sx={{
                      bgcolor: portfolioReturns.portfolioAnnualizedReturnPercent >= 10 ? 'success.50' :
                        portfolioReturns.portfolioAnnualizedReturnPercent >= 7 ? 'info.50' :
                          portfolioReturns.portfolioAnnualizedReturnPercent >= 0 ? 'warning.50' : 'error.50',
                      color: portfolioReturns.portfolioAnnualizedReturnPercent >= 10 ? 'success.main' :
                        portfolioReturns.portfolioAnnualizedReturnPercent >= 7 ? 'info.main' :
                          portfolioReturns.portfolioAnnualizedReturnPercent >= 0 ? 'warning.main' : 'error.main',
                      fontWeight: 'bold',
                    }}
                  />
                </Box>
              </Grid>
            </Grid>

            {/* Use in FIRE Settings */}
            <Box sx={{ p: 3, bgcolor: 'primary.50', borderRadius: 2 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'stretch', sm: 'center' }} spacing={2}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'primary.main', mb: 1 }}>
                    🎯 Use in FIRE Calculations
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Apply this calculated return rate to your FIRE profile for more accurate projections based on your actual investment performance.
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  size="large"
                  onClick={updateFIREProfileWithCalculatedReturn}
                  disabled={updatingFIREProfile}
                  startIcon={updatingFIREProfile ? <CircularProgress size={16} /> : <TrendingUp />}
                  sx={{ borderRadius: 2, minWidth: { xs: '100%', sm: 'auto' } }}
                >
                  {updatingFIREProfile ? 'Updating...' : 'Update FIRE Settings'}
                </Button>
              </Stack>
            </Box>

            {/* Calculation Notes */}
            <Alert severity="info" sx={{ mt: 3 }}>
              <Typography variant="body2">
                <strong>How it's calculated:</strong> This annualized return rate (CAGR) is based on your actual investment transactions and current portfolio value.
                It represents the compound annual growth rate of your investments, excluding cash positions.
                This rate can be used as your "Expected Return" in FIRE calculations for more personalized projections.
              </Typography>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* Individual Asset Performance */}
      {portfolioReturns && portfolioReturns.assets.length > 0 && (
        <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'grey.200', mb: 4 }}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 'bold' }}>
              📈 Individual Asset Performance
            </Typography>
            
            <Box sx={{ overflowX: 'auto' }}>
              <Grid container spacing={2}>
                {portfolioReturns.assets
                  .sort((a, b) => b.annualizedReturnPercent - a.annualizedReturnPercent)
                  .map((assetReturn, index) => (
                    <Grid item xs={12} sm={6} md={4} key={assetReturn.asset.asset_id}>
                      <Card sx={{ 
                        borderRadius: 2, 
                        border: '1px solid', 
                        borderColor: 'grey.100',
                        height: '100%',
                        background: index === 0 ? 'success.50' : 
                                   index === portfolioReturns.assets.length - 1 ? 'error.50' : 'grey.50'
                      }}>
                        <CardContent sx={{ p: 3 }}>
                          <Stack spacing={2}>
                            {/* Asset Header */}
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                                {assetReturn.asset.ticker_symbol}
                              </Typography>
                              <Chip 
                                label={assetReturn.asset.asset_type} 
                                size="small" 
                                variant="outlined"
                              />
                            </Box>

                            {/* Performance Metrics */}
                            <Box>
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                {assetReturn.holdingPeriodYears < 1 ? 'Actual Return' : 'Annualized Return'}
                              </Typography>
                              <Typography variant="h5" sx={{ 
                                fontWeight: 'bold',
                                color: assetReturn.annualizedReturnPercent >= 0 ? 'success.main' : 'error.main'
                              }}>
                                {assetReturn.annualizedReturnPercent >= 0 ? '+' : ''}{assetReturn.annualizedReturnPercent.toFixed(2)}%
                              </Typography>
                            </Box>

                            {/* Total Return */}
                            <Box>
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                Total Return
                              </Typography>
                              <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                                {formatCurrency(assetReturn.totalReturn, user?.base_currency)}
                              </Typography>
                            </Box>

                            {/* Holding Period */}
                            <Box>
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                Holding Period
                              </Typography>
                              <Typography variant="body2">
                                {assetReturn.holdingPeriodYears < 1 
                                  ? `${(assetReturn.holdingPeriodYears * 365.25).toFixed(0)} days`
                                  : `${assetReturn.holdingPeriodYears.toFixed(1)} years`
                                }
                              </Typography>
                            </Box>

                            {/* Current Value */}
                            <Divider />
                            <Box>
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                                Current Value
                              </Typography>
                              <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                                {formatCurrency(assetReturn.currentValue, user?.base_currency)}
                              </Typography>
                            </Box>
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
              </Grid>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Asset Allocation Analysis */}
      {portfolioReturns && (
        <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'grey.200', mb: 4 }}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 'bold' }}>
              🥧 Asset Allocation Analysis
            </Typography>
            
            <Grid container spacing={3}>
              {/* By Asset Type */}
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold' }}>
                  By Asset Type
                </Typography>
                {(() => {
                  const typeAllocation = portfolioReturns.assets.reduce((acc, asset) => {
                    const type = asset.asset.asset_type;
                    if (!acc[type]) {
                      acc[type] = { value: 0, count: 0 };
                    }
                    acc[type].value += asset.currentValue;
                    acc[type].count += 1;
                    return acc;
                  }, {} as Record<string, { value: number; count: number }>);

                  const totalValue = Object.values(typeAllocation).reduce((sum, item) => sum + item.value, 0);

                  return Object.entries(typeAllocation)
                    .sort(([,a], [,b]) => b.value - a.value)
                    .map(([type, data]) => (
                      <Box key={type} sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography variant="body2">{type}</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                            {((data.value / totalValue) * 100).toFixed(1)}%
                          </Typography>
                        </Box>
                        <Box sx={{ 
                          height: 8, 
                          bgcolor: 'grey.200', 
                          borderRadius: 1,
                          overflow: 'hidden'
                        }}>
                          <Box sx={{ 
                            height: '100%', 
                            bgcolor: 'primary.main',
                            width: `${(data.value / totalValue) * 100}%`,
                            transition: 'width 0.3s ease'
                          }} />
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          {formatCurrency(data.value, user?.base_currency)} • {data.count} asset{data.count !== 1 ? 's' : ''}
                        </Typography>
                      </Box>
                    ));
                })()}
              </Grid>

              {/* Performance Distribution */}
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold' }}>
                  Performance Distribution
                </Typography>
                {(() => {
                  const performanceBuckets = {
                    'Excellent (>20%)': portfolioReturns.assets.filter(a => a.annualizedReturnPercent > 20).length,
                    'Good (10-20%)': portfolioReturns.assets.filter(a => a.annualizedReturnPercent >= 10 && a.annualizedReturnPercent <= 20).length,
                    'Average (0-10%)': portfolioReturns.assets.filter(a => a.annualizedReturnPercent >= 0 && a.annualizedReturnPercent < 10).length,
                    'Poor (<0%)': portfolioReturns.assets.filter(a => a.annualizedReturnPercent < 0).length,
                  };

                  const totalAssets = portfolioReturns.assets.length;

                  return Object.entries(performanceBuckets).map(([bucket, count]) => (
                    <Box key={bucket} sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2">{bucket}</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          {count} asset{count !== 1 ? 's' : ''}
                        </Typography>
                      </Box>
                      <Box sx={{ 
                        height: 8, 
                        bgcolor: 'grey.200', 
                        borderRadius: 1,
                        overflow: 'hidden'
                      }}>
                        <Box sx={{ 
                          height: '100%', 
                          bgcolor: bucket.includes('Excellent') ? 'success.main' :
                                   bucket.includes('Good') ? 'info.main' :
                                   bucket.includes('Average') ? 'warning.main' : 'error.main',
                          width: `${(count / totalAssets) * 100}%`,
                          transition: 'width 0.3s ease'
                        }} />
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        {((count / totalAssets) * 100).toFixed(1)}% of portfolio
                      </Typography>
                    </Box>
                  ));
                })()}
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Portfolio Summary */}
      <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'grey.200' }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            📊 Portfolio Summary
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            You have {assets.length} asset{assets.length !== 1 ? 's' : ''} in your portfolio.
          </Typography>

          {!portfolioChanges && (
            <Alert severity="warning" sx={{ mt: 3, mb: 3 }}>
              <Typography variant="body1">
                <strong>Performance data unavailable</strong><br />
                Portfolio performance tracking requires transaction history.
                Make sure you have recorded some transactions to see performance metrics.
              </Typography>
            </Alert>
          )}

          {/* Quick Stats */}
          {portfolioReturns && (
            <Grid container spacing={3} sx={{ mt: 2 }}>
              <Grid item xs={6} sm={3}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'primary.50', borderRadius: 2 }}>
                  <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                    {portfolioReturns.assets.filter(a => a.annualizedReturnPercent > 0).length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Profitable Assets
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'success.50', borderRadius: 2 }}>
                  <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                    {portfolioReturns.advancedMetrics.bestPerformer}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Best Performer
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'info.50', borderRadius: 2 }}>
                  <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'info.main' }}>
                    {formatCurrency(portfolioReturns.totalDividendsReceived, user?.base_currency)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Dividends
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'warning.50', borderRadius: 2 }}>
                  <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'warning.main' }}>
                    {portfolioReturns.advancedMetrics.dividendYield.toFixed(2)}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Dividend Yield
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};
