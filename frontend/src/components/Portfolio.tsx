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
} from '@mui/material';
import {
  PieChart,
  TrendingUp,
  AccountBalance,
  ShowChart,
  Assessment,
} from '@mui/icons-material';
import { useAuthStore } from '../store/authStore';
import { assetAPI } from '../services/assetApi';
import { exchangeRateService } from '../services/exchangeRateService';
import type { Asset } from '../types/assets';

interface PortfolioAllocation {
  byType: { [type: string]: { value: number; percentage: number } };
  byCurrency: { [currency: string]: { value: number; percentage: number } };
  byAsset: { symbol: string; value: number; percentage: number }[];
}

export const Portfolio: React.FC = () => {
  const { user } = useAuthStore();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allocation, setAllocation] = useState<PortfolioAllocation | null>(null);
  const [totalValue, setTotalValue] = useState(0);

  const fetchPortfolioData = async () => {
    try {
      setLoading(true);
      const response = await assetAPI.getAssets();
      setAssets(response.assets);
      
      // Calculate portfolio allocation and total value
      const baseCurrency = user?.base_currency || 'USD';
      let total = 0;
      const byType: { [type: string]: { value: number; percentage: number } } = {};
      const byCurrency: { [currency: string]: { value: number; percentage: number } } = {};
      const byAsset: { symbol: string; value: number; percentage: number }[] = [];

      // Calculate values for each asset
      response.assets.forEach(asset => {
        const assetValue = asset.total_shares * asset.average_cost_basis;
        const convertedValue = exchangeRateService.convertCurrency(
          assetValue,
          asset.currency,
          baseCurrency
        );
        
        total += convertedValue;

        // By asset type
        if (!byType[asset.asset_type]) {
          byType[asset.asset_type] = { value: 0, percentage: 0 };
        }
        byType[asset.asset_type].value += convertedValue;

        // By currency
        if (!byCurrency[asset.currency]) {
          byCurrency[asset.currency] = { value: 0, percentage: 0 };
        }
        byCurrency[asset.currency].value += convertedValue;

        // By individual asset
        byAsset.push({
          symbol: asset.ticker_symbol,
          value: convertedValue,
          percentage: 0 // Will be calculated after total is known
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
      setTotalValue(total);
      setError(null);
    } catch (error: any) {
      console.error('Failed to fetch portfolio data:', error);
      setError(error.response?.data?.message || 'Failed to fetch portfolio data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortfolioData();
  }, [user?.base_currency]);

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

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
          Portfolio Analysis
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Comprehensive view of your investment portfolio allocation and performance
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

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
                    {formatCurrency(totalValue)}
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
                    bgcolor: 'success.main',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white'
                  }}
                >
                  <ShowChart />
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
                    bgcolor: 'info.main',
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
                  <Assessment />
                </Box>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                    {allocation ? Object.keys(allocation.byCurrency).length : 0}
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
