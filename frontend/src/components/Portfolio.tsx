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
} from '@mui/material';
import {
  PieChart,
  TrendingUp,
  AccountBalance,
  ShowChart,
  Assessment,
  Refresh,
  TrendingDown,
} from '@mui/icons-material';
import { useAuthStore } from '../store/authStore';
import { assetAPI } from '../services/assetApi';
import { assetValuationService, type PortfolioValuation } from '../services/assetValuationService';
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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allocation, setAllocation] = useState<PortfolioAllocation | null>(null);

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

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchPortfolioData();
    setRefreshing(false);
  };

  useEffect(() => {
    if (user) {
      fetchPortfolioData();
    }
  }, [user]);

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
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
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
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
            Portfolio Analysis
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Comprehensive view of your investment portfolio allocation and performance
          </Typography>
        </Box>
        <Tooltip title="Refresh portfolio data">
          <Button
            variant="outlined"
            onClick={handleRefresh}
            disabled={refreshing}
            startIcon={refreshing ? <CircularProgress size={20} /> : <Refresh />}
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </Tooltip>
      </Box>

      {/* Portfolio Summary */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={3}>
          <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'grey.200', height: '100%' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 2,
                    bgcolor: 'primary.main',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white'
                  }}
                >
                  <AccountBalance />
                </Box>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                    {portfolioValuation ? formatCurrency(portfolioValuation.totalValueInBaseCurrency) : '$0.00'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Portfolio Value
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'grey.200', height: '100%' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 2,
                    bgcolor: portfolioValuation && portfolioValuation.totalUnrealizedGainLoss >= 0 ? 'success.main' : 'error.main',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white'
                  }}
                >
                  {portfolioValuation && portfolioValuation.totalUnrealizedGainLoss >= 0 ? <TrendingUp /> : <TrendingDown />}
                </Box>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 'bold', color: portfolioValuation && portfolioValuation.totalUnrealizedGainLoss >= 0 ? 'success.main' : 'error.main' }}>
                    {portfolioValuation ? formatCurrency(portfolioValuation.totalUnrealizedGainLoss) : '$0.00'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Unrealized P&L ({portfolioValuation ? `${portfolioValuation.totalUnrealizedGainLossPercent >= 0 ? '+' : ''}${portfolioValuation.totalUnrealizedGainLossPercent.toFixed(2)}%` : '0.00%'})
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'grey.200', height: '100%' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 2,
                    bgcolor: 'info.main',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white'
                  }}
                >
                  <Assessment />
                </Box>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
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

        <Grid item xs={12} md={3}>
          <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'grey.200', height: '100%' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 2,
                    bgcolor: 'warning.main',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white'
                  }}
                >
                  <PieChart />
                </Box>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                    {allocation ? Object.keys(allocation.byType).length : 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Asset Types
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Currencies
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Allocation Analysis */}
      <Grid container spacing={3}>
        {/* Asset Type Allocation */}
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'grey.200', height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 3 }}>
                Allocation by Asset Type
              </Typography>
              
              {allocation && Object.keys(allocation.byType).length > 0 ? (
                <Stack spacing={2}>
                  {Object.entries(allocation.byType)
                    .sort(([,a], [,b]) => b.value - a.value)
                    .map(([type, data]) => (
                      <Box key={type}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <Box
                              sx={{
                                width: 12,
                                height: 12,
                                borderRadius: 1,
                                bgcolor: getTypeColor(type)
                              }}
                            />
                            <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                              {type}
                            </Typography>
                          </Stack>
                          <Stack direction="row" alignItems="center" spacing={2}>
                            <Typography variant="body2" color="text.secondary">
                              {formatCurrency(data.value)}
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 'bold', minWidth: 45 }}>
                              {data.percentage.toFixed(1)}%
                            </Typography>
                          </Stack>
                        </Stack>
                        <LinearProgress
                          variant="determinate"
                          value={data.percentage}
                          sx={{
                            height: 8,
                            borderRadius: 4,
                            bgcolor: 'grey.200',
                            '& .MuiLinearProgress-bar': {
                              bgcolor: getTypeColor(type),
                              borderRadius: 4
                            }
                          }}
                        />
                      </Box>
                    ))}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                  No assets to display
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Currency Allocation */}
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'grey.200', height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 3 }}>
                Allocation by Currency
              </Typography>
              
              {allocation && Object.keys(allocation.byCurrency).length > 0 ? (
                <Stack spacing={2}>
                  {Object.entries(allocation.byCurrency)
                    .sort(([,a], [,b]) => b.value - a.value)
                    .map(([currency, data]) => (
                      <Box key={currency}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <Chip
                              label={currency}
                              size="small"
                              variant="outlined"
                              sx={{ fontSize: '0.75rem', height: 24 }}
                            />
                          </Stack>
                          <Stack direction="row" alignItems="center" spacing={2}>
                            <Typography variant="body2" color="text.secondary">
                              {formatCurrency(data.value)}
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 'bold', minWidth: 45 }}>
                              {data.percentage.toFixed(1)}%
                            </Typography>
                          </Stack>
                        </Stack>
                        <LinearProgress
                          variant="determinate"
                          value={data.percentage}
                          sx={{
                            height: 8,
                            borderRadius: 4,
                            bgcolor: 'grey.200',
                            '& .MuiLinearProgress-bar': {
                              borderRadius: 4
                            }
                          }}
                        />
                      </Box>
                    ))}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                  No currencies to display
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Top Holdings */}
        <Grid item xs={12}>
          <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'grey.200' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 3 }}>
                Top Holdings
              </Typography>
              
              {allocation && allocation.byAsset.length > 0 ? (
                <Grid container spacing={2}>
                  {allocation.byAsset.slice(0, 6).map((asset, index) => (
                    <Grid item xs={12} sm={6} md={4} key={asset.symbol}>
                      <Paper
                        sx={{
                          p: 2,
                          borderRadius: 2,
                          border: '1px solid',
                          borderColor: 'grey.200',
                          bgcolor: 'grey.50'
                        }}
                      >
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                          <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                            {asset.symbol}
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                            #{index + 1}
                          </Typography>
                        </Stack>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                          <Typography variant="body2" color="text.secondary">
                            Value
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                            {formatCurrency(asset.value)}
                          </Typography>
                        </Stack>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="body2" color="text.secondary">
                            Allocation
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                            {asset.percentage.toFixed(1)}%
                          </Typography>
                        </Stack>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                  No holdings to display
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};
