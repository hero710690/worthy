import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Stack,
  Alert,
  CircularProgress,
  Chip,
  LinearProgress,
  Paper,
  Button,
  Tooltip,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider,
} from '@mui/material';
import {
  PieChart,
  TrendingUp,
  AccountBalance,
  ShowChart,
  Assessment,
  Refresh,
  TrendingDown,
  Timeline,
  MonetizationOn,
  Percent,
} from '@mui/icons-material';
import { useAuthStore } from '../store/authStore';
import { assetAPI } from '../services/assetApi';
import { assetValuationService, type PortfolioValuation } from '../services/assetValuationService';
import { returnsCalculationService, type PortfolioReturns } from '../services/returnsCalculationService';
import { exchangeRateService } from '../services/exchangeRateService';

import type { Asset } from '../types/assets';

interface PortfolioAllocation {
  byType: { [type: string]: { value: number; percentage: number } };
  byCurrency: { [currency: string]: { value: number; percentage: number } };
  byAsset: { symbol: string; value: number; percentage: number; currentPrice?: number; costBasis?: number; gainLoss?: number; gainLossPercent?: number }[];
}

export const Portfolio: React.FC = () => {
  const { user } = useAuthStore();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [portfolioValuation, setPortfolioValuation] = useState<PortfolioValuation | null>(null);
  const [portfolioReturns, setPortfolioReturns] = useState<PortfolioReturns | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allocation, setAllocation] = useState<PortfolioAllocation | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [returnsLoading, setReturnsLoading] = useState(false);

  const fetchPortfolioData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Fetching portfolio data...');
      const response = await assetAPI.getAssets();
      console.log('✅ Assets fetched:', response.assets.length, 'assets');
      setAssets(response.assets);
      
      // Use the same valuation service as Dashboard for consistency
      const baseCurrency = user?.base_currency || 'USD';
      console.log('💰 Base currency:', baseCurrency);
      
      console.log('📊 Calling assetValuationService...');
      const valuation = await assetValuationService.valuatePortfolio(response.assets, baseCurrency);
      console.log('✅ Valuation completed:', valuation);
      setPortfolioValuation(valuation);
      
      // Calculate portfolio allocation using real-time values
      const total = valuation.totalValueInBaseCurrency;
      console.log('💵 Total portfolio value:', total);
      
      const byType: { [type: string]: { value: number; percentage: number } } = {};
      const byCurrency: { [currency: string]: { value: number; percentage: number } } = {};
      const byAsset: { symbol: string; value: number; percentage: number; currentPrice?: number; costBasis?: number; gainLoss?: number; gainLossPercent?: number }[] = [];

      // Calculate values for each asset using real-time data
      response.assets.forEach(asset => {
        console.log('🔍 Processing asset:', asset.ticker_symbol);
        const assetValuation = valuation.assets.find(av => av.asset.ticker_symbol === asset.ticker_symbol);
        console.log('📈 Asset valuation found:', !!assetValuation);
        
        const currentValue = assetValuation?.totalValueInBaseCurrency || 0;
        const costBasisValue = asset.total_shares * asset.average_cost_basis;
        const gainLoss = assetValuation?.unrealizedGainLoss || 0;
        const gainLossPercent = assetValuation?.unrealizedGainLossPercent || 0;
        
        console.log(`💰 ${asset.ticker_symbol}: current=${currentValue}, cost=${costBasisValue}`);
        
        // By asset type
        if (!byType[asset.asset_type]) {
          byType[asset.asset_type] = { value: 0, percentage: 0 };
        }
        byType[asset.asset_type].value += currentValue;

        // By currency
        if (!byCurrency[asset.currency]) {
          byCurrency[asset.currency] = { value: 0, percentage: 0 };
        }
        byCurrency[asset.currency].value += currentValue;

        // By individual asset
        byAsset.push({
          symbol: asset.ticker_symbol,
          value: currentValue,
          percentage: 0, // Will be calculated after total is known
          currentPrice: assetValuation?.currentPrice,
          costBasis: costBasisValue,
          gainLoss: gainLoss,
          gainLossPercent: gainLossPercent
        });
      });

      // Calculate percentages
      Object.keys(byType).forEach(type => {
        byType[type].percentage = total > 0 ? (byType[type].value / total) * 100 : 0;
      });

      Object.keys(byCurrency).forEach(currency => {
        byCurrency[currency].percentage = total > 0 ? (byCurrency[currency].value / total) * 100 : 0;
      });

      byAsset.forEach(asset => {
        asset.percentage = total > 0 ? (asset.value / total) * 100 : 0;
      });

      // Sort by value
      byAsset.sort((a, b) => b.value - a.value);

      setAllocation({ byType, byCurrency, byAsset });
      console.log('✅ Portfolio data processing completed');
      setError(null);
    } catch (error: any) {
      console.error('❌ Failed to fetch portfolio data:', error);
      console.error('Error details:', error.message, error.stack);
      setError(error.response?.data?.message || error.message || 'Failed to fetch portfolio data');
    } finally {
      setLoading(false);
    }
  };

  const fetchReturnsData = async () => {
    if (!user || assets.length === 0) return;
    
    try {
      setReturnsLoading(true);
      console.log('📈 Calculating portfolio returns...');
      
      const baseCurrency = user.base_currency || 'USD';
      const returns = await returnsCalculationService.calculatePortfolioReturns(assets, baseCurrency);
      
      console.log('✅ Returns calculation completed:', returns);
      setPortfolioReturns(returns);
    } catch (error: any) {
      console.error('❌ Failed to calculate returns:', error);
      // Don't set error state for returns calculation failure
    } finally {
      setReturnsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchPortfolioData();
    setRefreshing(false);
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
    
    // Fetch returns data when switching to returns tabs
    if ((newValue === 1 || newValue === 2) && !portfolioReturns && !returnsLoading) {
      fetchReturnsData();
    }
  };

  useEffect(() => {
    if (user) {
      fetchPortfolioData();
    }
  }, [user]);

  // Fetch returns data after assets are loaded
  useEffect(() => {
    if (assets.length > 0 && (activeTab === 1 || activeTab === 2)) {
      fetchReturnsData();
    }
  }, [assets, activeTab]);

  const formatCurrency = (amount: number) => {
    const baseCurrency = user?.base_currency || 'USD';
    return exchangeRateService.formatCurrency(amount, baseCurrency);
  };

  const getTypeColor = (type: string) => {
    const colors: { [key: string]: string } = {
      'Stock': '#667eea',
      'ETF': '#764ba2',
      'Cash': '#f093fb',
      'Bond': '#f5576c',
      'REIT': '#4facfe',
      'Mutual Fund': '#43e97b'
    };
    return colors[type] || '#9ca3af';
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
          Loading your portfolio...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
        <Button onClick={() => fetchPortfolioData()} sx={{ ml: 2 }}>
          Retry
        </Button>
      </Alert>
    );
  }

  if (!portfolioValuation || !allocation) {
    return (
      <Alert severity="info">
        No portfolio data available. Start by adding some assets to your portfolio.
      </Alert>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1400, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1, color: 'primary.main' }}>
            Portfolio Overview
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Track your investments, allocation, and performance in real-time
          </Typography>
        </Box>
        <Tooltip title="Refresh portfolio data">
          <Button
            variant="contained"
            onClick={handleRefresh}
            disabled={refreshing}
            startIcon={refreshing ? <CircularProgress size={20} /> : <Refresh />}
            sx={{ borderRadius: 2, px: 3 }}
          >
            {refreshing ? 'Refreshing...' : 'Refresh Data'}
          </Button>
        </Tooltip>
      </Box>

      {/* Portfolio Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} lg={3}>
          <Card sx={{ 
            borderRadius: 3, 
            border: '1px solid', 
            borderColor: 'grey.200', 
            height: '100%',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            '&:hover': { transform: 'translateY(-2px)', transition: 'transform 0.2s' }
          }}>
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: 2,
                    bgcolor: 'rgba(255,255,255,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white'
                  }}
                >
                  <AccountBalance fontSize="large" />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                    {portfolioValuation ? formatCurrency(portfolioValuation.totalValueInBaseCurrency) : '$0.00'}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Total Portfolio Value
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} lg={3}>
          <Card sx={{ 
            borderRadius: 3, 
            border: '1px solid', 
            borderColor: 'grey.200', 
            height: '100%',
            background: portfolioValuation && portfolioValuation.totalUnrealizedGainLoss >= 0 
              ? 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
              : 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
            color: 'white',
            '&:hover': { transform: 'translateY(-2px)', transition: 'transform 0.2s' }
          }}>
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: 2,
                    bgcolor: 'rgba(255,255,255,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white'
                  }}
                >
                  {portfolioValuation && portfolioValuation.totalUnrealizedGainLoss >= 0 ? 
                    <TrendingUp fontSize="large" /> : <TrendingDown fontSize="large" />}
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                    {portfolioValuation ? formatCurrency(portfolioValuation.totalUnrealizedGainLoss) : '$0.00'}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Unrealized P&L ({portfolioValuation ? `${portfolioValuation.totalUnrealizedGainLossPercent >= 0 ? '+' : ''}${portfolioValuation.totalUnrealizedGainLossPercent.toFixed(2)}%` : '0.00%'})
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} lg={3}>
          <Card sx={{ 
            borderRadius: 3, 
            border: '1px solid', 
            borderColor: 'grey.200', 
            height: '100%',
            background: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
            color: 'text.primary',
            '&:hover': { transform: 'translateY(-2px)', transition: 'transform 0.2s' }
          }}>
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: 2,
                    bgcolor: 'rgba(0,0,0,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'text.primary'
                  }}
                >
                  <Assessment fontSize="large" />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                    {assets.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Assets
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} lg={3}>
          <Card sx={{ 
            borderRadius: 3, 
            border: '1px solid', 
            borderColor: 'grey.200', 
            height: '100%',
            background: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
            color: 'text.primary',
            '&:hover': { transform: 'translateY(-2px)', transition: 'transform 0.2s' }
          }}>
            <CardContent sx={{ p: 3 }}>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: 2,
                    bgcolor: 'rgba(0,0,0,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'text.primary'
                  }}
                >
                  <PieChart fontSize="large" />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                    {allocation ? Object.keys(allocation.byType).length : 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Asset Types
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs Section */}
      <Box sx={{ mb: 4 }}>
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange}
          sx={{ 
            borderBottom: 1, 
            borderColor: 'divider',
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 'bold',
              fontSize: '1rem',
              minWidth: 120,
            }
          }}
        >
          <Tab 
            icon={<PieChart />} 
            label="Portfolio Overview" 
            iconPosition="start"
            sx={{ gap: 1 }}
          />
          <Tab 
            icon={<Percent />} 
            label="Annualized Returns" 
            iconPosition="start"
            sx={{ gap: 1 }}
          />
          <Tab 
            icon={<MonetizationOn />} 
            label="Total Returns + Interest" 
            iconPosition="start"
            sx={{ gap: 1 }}
          />
        </Tabs>
      </Box>



      {/* Tab Content */}
      {activeTab === 0 && (
        /* Main Content Grid */
        <Grid container spacing={4}>
        {/* Top Holdings - Featured Section */}
        <Grid item xs={12}>
          <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'grey.200', mb: 2 }}>
            <CardContent sx={{ p: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <ShowChart sx={{ mr: 2, color: 'primary.main' }} />
                <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                  Top Holdings
                </Typography>
              </Box>
              
              {allocation && allocation.byAsset.length > 0 ? (
                <Grid container spacing={3}>
                  {allocation.byAsset.slice(0, 6).map((asset, index) => (
                    <Grid item xs={12} sm={6} lg={4} key={asset.symbol}>
                      <Paper
                        sx={{
                          p: 3,
                          borderRadius: 3,
                          border: '1px solid',
                          borderColor: 'grey.200',
                          bgcolor: 'background.paper',
                          position: 'relative',
                          height: 180, // Fixed height for consistent box sizes
                          display: 'flex',
                          flexDirection: 'column',
                          '&:hover': { 
                            boxShadow: 3,
                            transform: 'translateY(-2px)',
                            transition: 'all 0.2s ease-in-out'
                          }
                        }}
                      >
                        <Box sx={{ position: 'absolute', top: 12, right: 12 }}>
                          <Chip 
                            label={`#${index + 1}`} 
                            size="small" 
                            color="primary" 
                            variant="outlined"
                          />
                        </Box>
                        
                        <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, pr: 4 }}>
                          {asset.symbol}
                        </Typography>
                        
                        <Stack spacing={1.5} sx={{ flex: 1 }}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="body2" color="text.secondary">
                              Market Value
                            </Typography>
                            <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                              {formatCurrency(asset.value)}
                            </Typography>
                          </Stack>
                          
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="body2" color="text.secondary">
                              Portfolio %
                            </Typography>
                            <Typography variant="body1" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                              {asset.percentage.toFixed(1)}%
                            </Typography>
                          </Stack>
                          
                          {asset.gainLoss !== undefined && (
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                              <Typography variant="body2" color="text.secondary">
                                Unrealized P&L
                              </Typography>
                              <Typography 
                                variant="body1" 
                                sx={{ 
                                  fontWeight: 'bold',
                                  color: asset.gainLoss >= 0 ? 'success.main' : 'error.main'
                                }}
                              >
                                {formatCurrency(asset.gainLoss)}
                                {asset.gainLossPercent !== undefined && (
                                  <Typography component="span" variant="body2" sx={{ ml: 0.5 }}>
                                    ({asset.gainLossPercent >= 0 ? '+' : ''}{asset.gainLossPercent.toFixed(1)}%)
                                  </Typography>
                                )}
                              </Typography>
                            </Stack>
                          )}
                        </Stack>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <Assessment sx={{ fontSize: 64, color: 'grey.300', mb: 2 }} />
                  <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                    No Holdings Yet
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Start by adding some assets to your portfolio
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Allocation Analysis */}
        <Grid item xs={12} lg={6}>
          <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'grey.200', height: '100%' }}>
            <CardContent sx={{ p: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <PieChart sx={{ mr: 2, color: 'primary.main' }} />
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  Asset Type Allocation
                </Typography>
              </Box>
              
              {allocation && Object.keys(allocation.byType).length > 0 ? (
                <Stack spacing={3}>
                  {Object.entries(allocation.byType)
                    .sort(([,a], [,b]) => b.value - a.value)
                    .map(([type, data]) => (
                      <Box key={type}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                          <Stack direction="row" alignItems="center" spacing={2}>
                            <Box
                              sx={{
                                width: 16,
                                height: 16,
                                borderRadius: 2,
                                bgcolor: getTypeColor(type)
                              }}
                            />
                            <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                              {type}
                            </Typography>
                          </Stack>
                          <Stack direction="row" alignItems="center" spacing={3}>
                            <Typography variant="body2" color="text.secondary">
                              {formatCurrency(data.value)}
                            </Typography>
                            <Typography variant="h6" sx={{ fontWeight: 'bold', minWidth: 50, color: 'primary.main' }}>
                              {data.percentage.toFixed(1)}%
                            </Typography>
                          </Stack>
                        </Stack>
                        <LinearProgress
                          variant="determinate"
                          value={data.percentage}
                          sx={{
                            height: 10,
                            borderRadius: 5,
                            bgcolor: 'grey.200',
                            '& .MuiLinearProgress-bar': {
                              bgcolor: getTypeColor(type),
                              borderRadius: 5
                            }
                          }}
                        />
                      </Box>
                    ))}
                </Stack>
              ) : (
                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <PieChart sx={{ fontSize: 64, color: 'grey.300', mb: 2 }} />
                  <Typography variant="body1" color="text.secondary">
                    No asset types to display
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Currency Allocation */}
        <Grid item xs={12} lg={6}>
          <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'grey.200', height: '100%' }}>
            <CardContent sx={{ p: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <AccountBalance sx={{ mr: 2, color: 'primary.main' }} />
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  Currency Allocation
                </Typography>
              </Box>
              
              {allocation && Object.keys(allocation.byCurrency).length > 0 ? (
                <Stack spacing={3}>
                  {Object.entries(allocation.byCurrency)
                    .sort(([,a], [,b]) => b.value - a.value)
                    .map(([currency, data], index) => (
                      <Box key={currency}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                          <Stack direction="row" alignItems="center" spacing={2}>
                            <Chip
                              label={currency}
                              size="medium"
                              variant="outlined"
                              color="primary"
                              sx={{ fontSize: '0.875rem', fontWeight: 'bold' }}
                            />
                          </Stack>
                          <Stack direction="row" alignItems="center" spacing={3}>
                            <Typography variant="body2" color="text.secondary">
                              {formatCurrency(data.value)}
                            </Typography>
                            <Typography variant="h6" sx={{ fontWeight: 'bold', minWidth: 50, color: 'primary.main' }}>
                              {data.percentage.toFixed(1)}%
                            </Typography>
                          </Stack>
                        </Stack>
                        <LinearProgress
                          variant="determinate"
                          value={data.percentage}
                          sx={{
                            height: 10,
                            borderRadius: 5,
                            bgcolor: 'grey.200',
                            '& .MuiLinearProgress-bar': {
                              borderRadius: 5,
                              bgcolor: index === 0 ? 'primary.main' : index === 1 ? 'secondary.main' : 'info.main'
                            }
                          }}
                        />
                      </Box>
                    ))}
                </Stack>
              ) : (
                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <AccountBalance sx={{ fontSize: 64, color: 'grey.300', mb: 2 }} />
                  <Typography variant="body1" color="text.secondary">
                    No currencies to display
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      )}

      {/* Annualized Returns Tab */}
      {activeTab === 1 && (
        <Box>
          {returnsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '40vh', flexDirection: 'column', gap: 2 }}>
              <CircularProgress size={60} />
              <Typography variant="h6" color="text.secondary">
                Calculating annualized returns...
              </Typography>
            </Box>
          ) : portfolioReturns ? (
            <Grid container spacing={4}>
              {/* Portfolio Summary */}
              <Grid item xs={12}>
                <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'grey.200', mb: 3 }}>
                  <CardContent sx={{ p: 4 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                      <Percent sx={{ mr: 2, color: 'primary.main' }} />
                      <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                        Portfolio Annualized Returns
                      </Typography>
                    </Box>
                    
                    <Grid container spacing={3}>
                      <Grid item xs={12} sm={6} md={3}>
                        <Paper sx={{ p: 3, textAlign: 'center', borderRadius: 2, bgcolor: 'primary.50' }}>
                          <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'primary.main', mb: 1 }}>
                            {returnsCalculationService.formatReturnPercent(portfolioReturns.portfolioAnnualizedReturnPercent).value}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Annualized Return
                          </Typography>
                        </Paper>
                      </Grid>
                      
                      <Grid item xs={12} sm={6} md={3}>
                        <Paper sx={{ p: 3, textAlign: 'center', borderRadius: 2, bgcolor: 'success.50' }}>
                          <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'success.main', mb: 1 }}>
                            {formatCurrency(portfolioReturns.portfolioAnnualizedReturn)}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Annual Return Amount
                          </Typography>
                        </Paper>
                      </Grid>
                      
                      <Grid item xs={12} sm={6} md={3}>
                        <Paper sx={{ p: 3, textAlign: 'center', borderRadius: 2, bgcolor: 'info.50' }}>
                          <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'info.main', mb: 1 }}>
                            {portfolioReturns.weightedAverageHoldingPeriod.toFixed(1)}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Avg Holding Period (Years)
                          </Typography>
                        </Paper>
                      </Grid>
                      
                      <Grid item xs={12} sm={6} md={3}>
                        <Paper sx={{ p: 3, textAlign: 'center', borderRadius: 2, bgcolor: 'warning.50' }}>
                          <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'warning.main', mb: 1 }}>
                            {portfolioReturns.assets.length}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Investment Assets
                          </Typography>
                        </Paper>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>

              {/* Individual Asset Returns */}
              <Grid item xs={12}>
                <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'grey.200' }}>
                  <CardContent sx={{ p: 4 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                      <Timeline sx={{ mr: 2, color: 'primary.main' }} />
                      <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                        Asset Annualized Returns (Excluding Cash)
                      </Typography>
                    </Box>
                    
                    <TableContainer>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 'bold' }}>Asset</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>Annualized Return</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>Annual Amount</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>Holding Period</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>Current Value</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>Initial Investment</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {portfolioReturns.assets
                            .sort((a, b) => b.annualizedReturnPercent - a.annualizedReturnPercent)
                            .map((assetReturn) => {
                              const returnFormat = returnsCalculationService.formatReturnPercent(assetReturn.annualizedReturnPercent);
                              return (
                                <TableRow key={assetReturn.asset.asset_id} hover>
                                  <TableCell>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                      <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                                        {assetReturn.asset.ticker_symbol}
                                      </Typography>
                                      <Chip 
                                        label={assetReturn.asset.asset_type} 
                                        size="small" 
                                        variant="outlined"
                                        color="primary"
                                      />
                                    </Box>
                                  </TableCell>
                                  <TableCell align="right">
                                    <Typography 
                                      variant="body1" 
                                      sx={{ 
                                        fontWeight: 'bold',
                                        color: returnFormat.color
                                      }}
                                    >
                                      {returnFormat.value}
                                    </Typography>
                                  </TableCell>
                                  <TableCell align="right">
                                    <Typography variant="body1">
                                      {formatCurrency(assetReturn.annualizedReturn)}
                                    </Typography>
                                  </TableCell>
                                  <TableCell align="right">
                                    <Typography variant="body2" color="text.secondary">
                                      {assetReturn.holdingPeriodYears.toFixed(1)} years
                                    </Typography>
                                  </TableCell>
                                  <TableCell align="right">
                                    <Typography variant="body1">
                                      {formatCurrency(assetReturn.currentValue)}
                                    </Typography>
                                  </TableCell>
                                  <TableCell align="right">
                                    <Typography variant="body2" color="text.secondary">
                                      {formatCurrency(assetReturn.initialInvestment)}
                                    </Typography>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          ) : (
            <Alert severity="info">
              No returns data available. Returns are calculated based on transaction history.
            </Alert>
          )}
        </Box>
      )}

      {/* Total Returns + Interest Tab */}
      {activeTab === 2 && (
        <Box>
          {returnsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '40vh', flexDirection: 'column', gap: 2 }}>
              <CircularProgress size={60} />
              <Typography variant="h6" color="text.secondary">
                Calculating total returns...
              </Typography>
            </Box>
          ) : portfolioReturns ? (
            <Grid container spacing={4}>
              {/* Portfolio Summary */}
              <Grid item xs={12}>
                <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'grey.200', mb: 3 }}>
                  <CardContent sx={{ p: 4 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                      <MonetizationOn sx={{ mr: 2, color: 'primary.main' }} />
                      <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                        Portfolio Total Returns + Interest/Dividends
                      </Typography>
                    </Box>
                    
                    <Grid container spacing={3}>
                      <Grid item xs={12} sm={6} md={3}>
                        <Paper sx={{ p: 3, textAlign: 'center', borderRadius: 2, bgcolor: 'success.50' }}>
                          <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'success.main', mb: 1 }}>
                            {formatCurrency(portfolioReturns.portfolioTotalReturn)}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Total Return Amount
                          </Typography>
                        </Paper>
                      </Grid>
                      
                      <Grid item xs={12} sm={6} md={3}>
                        <Paper sx={{ p: 3, textAlign: 'center', borderRadius: 2, bgcolor: 'primary.50' }}>
                          <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'primary.main', mb: 1 }}>
                            {returnsCalculationService.formatReturnPercent(portfolioReturns.portfolioTotalReturnPercent).value}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Total Return %
                          </Typography>
                        </Paper>
                      </Grid>
                      
                      <Grid item xs={12} sm={6} md={3}>
                        <Paper sx={{ p: 3, textAlign: 'center', borderRadius: 2, bgcolor: 'info.50' }}>
                          <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'info.main', mb: 1 }}>
                            {formatCurrency(portfolioReturns.totalDividendsReceived)}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Total Dividends
                          </Typography>
                        </Paper>
                      </Grid>
                      
                      <Grid item xs={12} sm={6} md={3}>
                        <Paper sx={{ p: 3, textAlign: 'center', borderRadius: 2, bgcolor: 'warning.50' }}>
                          <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'warning.main', mb: 1 }}>
                            {formatCurrency(portfolioReturns.totalInterestReceived)}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Total Interest
                          </Typography>
                        </Paper>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>

              {/* Individual Asset Returns */}
              <Grid item xs={12}>
                <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'grey.200' }}>
                  <CardContent sx={{ p: 4 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                      <ShowChart sx={{ mr: 2, color: 'primary.main' }} />
                      <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                        Asset Total Returns + Interest/Dividends (Excluding Cash)
                      </Typography>
                    </Box>
                    
                    <TableContainer>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 'bold' }}>Asset</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>Total Return</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>Total Return %</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>Dividends</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>Interest</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>Current Value</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>Initial Investment</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {portfolioReturns.assets
                            .sort((a, b) => b.totalReturn - a.totalReturn)
                            .map((assetReturn) => {
                              const returnFormat = returnsCalculationService.formatReturnPercent(assetReturn.totalReturnPercent);
                              return (
                                <TableRow key={assetReturn.asset.asset_id} hover>
                                  <TableCell>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                      <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                                        {assetReturn.asset.ticker_symbol}
                                      </Typography>
                                      <Chip 
                                        label={assetReturn.asset.asset_type} 
                                        size="small" 
                                        variant="outlined"
                                        color="primary"
                                      />
                                    </Box>
                                  </TableCell>
                                  <TableCell align="right">
                                    <Typography 
                                      variant="body1" 
                                      sx={{ 
                                        fontWeight: 'bold',
                                        color: assetReturn.totalReturn >= 0 ? 'success.main' : 'error.main'
                                      }}
                                    >
                                      {formatCurrency(assetReturn.totalReturn)}
                                    </Typography>
                                  </TableCell>
                                  <TableCell align="right">
                                    <Typography 
                                      variant="body1" 
                                      sx={{ 
                                        fontWeight: 'bold',
                                        color: returnFormat.color
                                      }}
                                    >
                                      {returnFormat.value}
                                    </Typography>
                                  </TableCell>
                                  <TableCell align="right">
                                    <Typography variant="body1" color="info.main">
                                      {formatCurrency(assetReturn.totalDividends)}
                                    </Typography>
                                  </TableCell>
                                  <TableCell align="right">
                                    <Typography variant="body1" color="warning.main">
                                      {formatCurrency(assetReturn.totalInterest)}
                                    </Typography>
                                  </TableCell>
                                  <TableCell align="right">
                                    <Typography variant="body1">
                                      {formatCurrency(assetReturn.currentValue)}
                                    </Typography>
                                  </TableCell>
                                  <TableCell align="right">
                                    <Typography variant="body2" color="text.secondary">
                                      {formatCurrency(assetReturn.initialInvestment)}
                                    </Typography>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          ) : (
            <Alert severity="info">
              No returns data available. Returns are calculated based on transaction history.
            </Alert>
          )}
        </Box>
      )}
    </Box>
  );
};
