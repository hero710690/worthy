import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Tabs,
  Tab,
  Stack,
  Chip,
  IconButton,
  useTheme,
  useMediaQuery,
  Skeleton,
  Alert,
  SwipeableViews,
  Paper,
  LinearProgress,
  Divider,
} from '@mui/material';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Refresh,
  ArrowUpward,
  ArrowDownward,
  AccountBalance,
  Public,
} from '@mui/icons-material';
import { useAuthStore } from '../store/authStore';
import { assetAPI } from '../services/assetApi';
import { assetValuationService, type PortfolioValuation } from '../services/assetValuationService';
import type { Asset } from '../types/assets';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`mobile-tabpanel-${index}`}
      aria-labelledby={`mobile-tab-${index}`}
      {...other}
    >
      {value === index && <Box>{children}</Box>}
    </div>
  );
}

interface MobilePortfolioProps {
  assets: Asset[];
  portfolioValuation: PortfolioValuation | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  onRefresh: () => void;
}

export const MobilePortfolio: React.FC<MobilePortfolioProps> = ({
  assets,
  portfolioValuation,
  loading,
  refreshing,
  error,
  onRefresh
}) => {
  const { user } = useAuthStore();
  const theme = useTheme();
  const [tabValue, setTabValue] = useState(0);

  const formatCurrency = (amount: number, currency: string = user?.base_currency || 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleChangeIndex = (index: number) => {
    setTabValue(index);
  };

  // Prepare chart data
  const assetAllocationData = portfolioValuation?.assets.map(asset => {
    const assetInfo = assets.find(a => a.asset_id === asset.asset_id);
    return {
      name: assetInfo?.ticker_symbol || 'Unknown',
      value: asset.current_value,
      percentage: ((asset.current_value / (portfolioValuation?.totalValue || 1)) * 100).toFixed(1),
    };
  }) || [];

  const currencyAllocationData = portfolioValuation?.currencies.map(currency => ({
    name: currency.currency,
    value: currency.total_value,
    percentage: ((currency.total_value / (portfolioValuation?.totalValue || 1)) * 100).toFixed(1),
  })) || [];

  const COLORS = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe', '#43e97b', '#38f9d7'];

  if (loading) {
    return (
      <Box sx={{ p: 2 }}>
        <Skeleton variant="text" width="60%" height={32} sx={{ mb: 2 }} />
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Skeleton variant="text" width="40%" height={24} sx={{ mb: 2 }} />
            <Skeleton variant="rectangular" width="100%" height={200} />
          </CardContent>
        </Card>
        {[1, 2, 3].map((i) => (
          <Card key={i} sx={{ mb: 2 }}>
            <CardContent>
              <Stack direction="row" spacing={2} alignItems="center">
                <Skeleton variant="circular" width={40} height={40} />
                <Box sx={{ flex: 1 }}>
                  <Skeleton variant="text" width="60%" height={20} />
                  <Skeleton variant="text" width="40%" height={16} />
                </Box>
                <Skeleton variant="text" width={80} height={20} />
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      </Box>
    );
  }

  const totalValue = portfolioValuation?.totalValue || 0;
  const totalGainLoss = portfolioValuation?.totalUnrealizedGainLoss || 0;
  const totalGainLossPercentage = portfolioValuation?.totalUnrealizedGainLossPercentage || 0;
  const isPositive = totalGainLoss >= 0;

  return (
    <Box>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
          Portfolio
        </Typography>
        <IconButton onClick={onRefresh} disabled={refreshing}>
          {refreshing ? <Refresh className="animate-spin" /> : <Refresh />}
        </IconButton>
      </Stack>

      {/* Portfolio Summary */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Total Value
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 2 }}>
            {formatCurrency(totalValue)}
          </Typography>
          
          <Stack direction="row" alignItems="center" spacing={1}>
            {isPositive ? (
              <ArrowUpward sx={{ color: 'success.main', fontSize: 20 }} />
            ) : (
              <ArrowDownward sx={{ color: 'error.main', fontSize: 20 }} />
            )}
            <Typography 
              variant="h6" 
              sx={{ 
                color: isPositive ? 'success.main' : 'error.main',
                fontWeight: 'bold'
              }}
            >
              {formatCurrency(Math.abs(totalGainLoss))}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              ({formatPercentage(totalGainLossPercentage)})
            </Typography>
          </Stack>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Paper sx={{ mb: 2 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          variant="fullWidth"
          sx={{
            '& .MuiTab-root': {
              minHeight: 48,
              fontSize: '0.9rem',
              fontWeight: 'medium',
            }
          }}
        >
          <Tab label="Holdings" />
          <Tab label="Allocation" />
          <Tab label="Performance" />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      <SwipeableViews
        axis={theme.direction === 'rtl' ? 'x-reverse' : 'x'}
        index={tabValue}
        onChangeIndex={handleChangeIndex}
      >
        {/* Holdings Tab */}
        <TabPanel value={tabValue} index={0}>
          <Stack spacing={2}>
            {assets.map((asset) => {
              const valuation = portfolioValuation?.assets.find(a => a.asset_id === asset.asset_id);
              const currentValue = valuation?.current_value || 0;
              const gainLoss = valuation?.unrealized_gain_loss || 0;
              const gainLossPercentage = valuation?.unrealized_gain_loss_percentage || 0;
              const isAssetPositive = gainLoss >= 0;

              return (
                <Card key={asset.asset_id}>
                  <CardContent sx={{ py: 2 }}>
                    <Stack direction="row" spacing={2} alignItems="center">
                      {/* Asset Icon */}
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: '12px',
                          bgcolor: 'primary.main',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontWeight: 'bold',
                          fontSize: '1rem'
                        }}
                      >
                        {asset.ticker_symbol.substring(0, 2)}
                      </Box>

                      {/* Asset Details */}
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                          {asset.ticker_symbol}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {asset.total_shares} shares
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Avg: {formatCurrency(asset.average_cost_basis)}
                        </Typography>
                      </Box>

                      {/* Value & Performance */}
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                          {formatCurrency(currentValue)}
                        </Typography>
                        <Stack direction="row" alignItems="center" spacing={0.5} justifyContent="flex-end">
                          {isAssetPositive ? (
                            <TrendingUp sx={{ color: 'success.main', fontSize: 16 }} />
                          ) : (
                            <TrendingDown sx={{ color: 'error.main', fontSize: 16 }} />
                          )}
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              color: isAssetPositive ? 'success.main' : 'error.main',
                              fontWeight: 'medium'
                            }}
                          >
                            {formatPercentage(gainLossPercentage)}
                          </Typography>
                        </Stack>
                        <Typography variant="body2" color="text.secondary">
                          {formatCurrency(Math.abs(gainLoss))}
                        </Typography>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              );
            })}
          </Stack>
        </TabPanel>

        {/* Allocation Tab */}
        <TabPanel value={tabValue} index={1}>
          <Stack spacing={3}>
            {/* Asset Allocation */}
            <Card>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                  <AccountBalance color="primary" />
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    By Asset
                  </Typography>
                </Stack>
                
                <Box sx={{ height: 200, mb: 2 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={assetAllocationData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {assetAllocationData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>

                <Stack spacing={1}>
                  {assetAllocationData.map((item, index) => (
                    <Stack key={item.name} direction="row" alignItems="center" spacing={2}>
                      <Box
                        sx={{
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          bgcolor: COLORS[index % COLORS.length]
                        }}
                      />
                      <Typography variant="body2" sx={{ flex: 1 }}>
                        {item.name}
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                        {item.percentage}%
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
              </CardContent>
            </Card>

            {/* Currency Allocation */}
            <Card>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                  <Public color="primary" />
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    By Currency
                  </Typography>
                </Stack>

                <Stack spacing={2}>
                  {currencyAllocationData.map((currency, index) => (
                    <Box key={currency.name}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                        <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                          {currency.name}
                        </Typography>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Typography variant="body2" color="text.secondary">
                            {currency.percentage}%
                          </Typography>
                          <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                            {formatCurrency(currency.value)}
                          </Typography>
                        </Stack>
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={parseFloat(currency.percentage)}
                        sx={{
                          height: 8,
                          borderRadius: 4,
                          bgcolor: 'grey.200',
                          '& .MuiLinearProgress-bar': {
                            bgcolor: COLORS[index % COLORS.length],
                            borderRadius: 4,
                          }
                        }}
                      />
                    </Box>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </TabPanel>

        {/* Performance Tab */}
        <TabPanel value={tabValue} index={2}>
          <Stack spacing={2}>
            {/* Performance Summary */}
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                  Performance Summary
                </Typography>
                
                <Stack spacing={2}>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">
                      Total Invested
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                      {formatCurrency(totalValue - totalGainLoss)}
                    </Typography>
                  </Stack>
                  
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">
                      Current Value
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                      {formatCurrency(totalValue)}
                    </Typography>
                  </Stack>
                  
                  <Divider />
                  
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                      Total Gain/Loss
                    </Typography>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      {isPositive ? (
                        <ArrowUpward sx={{ color: 'success.main', fontSize: 16 }} />
                      ) : (
                        <ArrowDownward sx={{ color: 'error.main', fontSize: 16 }} />
                      )}
                      <Typography 
                        variant="body1" 
                        sx={{ 
                          fontWeight: 'bold',
                          color: isPositive ? 'success.main' : 'error.main'
                        }}
                      >
                        {formatCurrency(Math.abs(totalGainLoss))}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        ({formatPercentage(totalGainLossPercentage)})
                      </Typography>
                    </Stack>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>

            {/* Individual Asset Performance */}
            <Card>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                  Asset Performance
                </Typography>
                
                <Stack spacing={2}>
                  {assets.map((asset) => {
                    const valuation = portfolioValuation?.assets.find(a => a.asset_id === asset.asset_id);
                    const gainLoss = valuation?.unrealized_gain_loss || 0;
                    const gainLossPercentage = valuation?.unrealized_gain_loss_percentage || 0;
                    const isAssetPositive = gainLoss >= 0;

                    return (
                      <Stack key={asset.asset_id} direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                          {asset.ticker_symbol}
                        </Typography>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          {isAssetPositive ? (
                            <TrendingUp sx={{ color: 'success.main', fontSize: 16 }} />
                          ) : (
                            <TrendingDown sx={{ color: 'error.main', fontSize: 16 }} />
                          )}
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              color: isAssetPositive ? 'success.main' : 'error.main',
                              fontWeight: 'medium',
                              minWidth: 60,
                              textAlign: 'right'
                            }}
                          >
                            {formatPercentage(gainLossPercentage)}
                          </Typography>
                        </Stack>
                      </Stack>
                    );
                  })}
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </TabPanel>
      </SwipeableViews>

      {/* Loading indicator */}
      {refreshing && (
        <LinearProgress 
          sx={{ 
            position: 'fixed',
            top: 64,
            left: 0,
            right: 0,
            zIndex: theme.zIndex.appBar - 1
          }} 
        />
      )}
    </Box>
  );
};
