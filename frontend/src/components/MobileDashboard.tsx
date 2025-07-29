import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  Stack,
  Paper,
  CircularProgress,
  Alert,
  Chip,
  IconButton,
  useTheme,
  useMediaQuery,
  Skeleton,
  Divider,
  LinearProgress,
} from '@mui/material';
import {
  TrendingUp,
  AccountBalance,
  Add,
  GpsFixed,
  Refresh,
  CheckCircle,
  Warning,
  ArrowUpward,
  ArrowDownward,
  Visibility,
  VisibilityOff,
  SwapHoriz,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { assetAPI } from '../services/assetApi';
import { assetValuationService, type PortfolioValuation } from '../services/assetValuationService';
import type { Asset } from '../types/assets';

interface MobileDashboardProps {
  assets: Asset[];
  portfolioValuation: PortfolioValuation | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  onRefresh: () => void;
}

export const MobileDashboard: React.FC<MobileDashboardProps> = ({
  assets,
  portfolioValuation,
  loading,
  refreshing,
  error,
  onRefresh
}) => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [showBalance, setShowBalance] = useState(true);

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

  if (loading) {
    return (
      <Box sx={{ p: 2 }}>
        {/* Header Skeleton */}
        <Box sx={{ mb: 3 }}>
          <Skeleton variant="text" width="60%" height={32} />
          <Skeleton variant="text" width="40%" height={24} />
        </Box>

        {/* Balance Card Skeleton */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Skeleton variant="text" width="30%" height={20} />
            <Skeleton variant="text" width="70%" height={48} />
            <Skeleton variant="text" width="50%" height={20} />
          </CardContent>
        </Card>

        {/* Quick Stats Skeleton */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[1, 2].map((i) => (
            <Grid item xs={6} key={i}>
              <Card>
                <CardContent>
                  <Skeleton variant="text" width="60%" height={20} />
                  <Skeleton variant="text" width="80%" height={32} />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Assets Skeleton */}
        <Box>
          <Skeleton variant="text" width="40%" height={24} sx={{ mb: 2 }} />
          {[1, 2, 3].map((i) => (
            <Card key={i} sx={{ mb: 2 }}>
              <CardContent>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Skeleton variant="circular" width={40} height={40} />
                  <Box sx={{ flex: 1 }}>
                    <Skeleton variant="text" width="60%" height={20} />
                    <Skeleton variant="text" width="40%" height={16} />
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Skeleton variant="text" width={80} height={20} />
                    <Skeleton variant="text" width={60} height={16} />
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Box>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert 
          severity="error" 
          action={
            <Button color="inherit" size="small" onClick={onRefresh}>
              Retry
            </Button>
          }
        >
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
    <Box sx={{ pb: 2 }}>
      {/* Welcome Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 0.5 }}>
          Welcome back, {user?.name?.split(' ')[0] || 'User'}!
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Here's your portfolio overview
        </Typography>
      </Box>

      {/* Portfolio Balance Card */}
      <Card 
        sx={{ 
          mb: 3,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
            <Box>
              <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>
                Total Portfolio Value
              </Typography>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                  {showBalance ? formatCurrency(totalValue) : '••••••'}
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => setShowBalance(!showBalance)}
                  sx={{ color: 'white', opacity: 0.8 }}
                >
                  {showBalance ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                </IconButton>
              </Stack>
            </Box>
            <IconButton
              onClick={onRefresh}
              disabled={refreshing}
              sx={{ color: 'white', opacity: 0.8 }}
            >
              {refreshing ? <CircularProgress size={20} color="inherit" /> : <Refresh />}
            </IconButton>
          </Stack>

          {/* Gain/Loss */}
          <Stack direction="row" alignItems="center" spacing={1}>
            {isPositive ? (
              <ArrowUpward fontSize="small" sx={{ color: '#4caf50' }} />
            ) : (
              <ArrowDownward fontSize="small" sx={{ color: '#f44336' }} />
            )}
            <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
              {showBalance ? formatCurrency(Math.abs(totalGainLoss)) : '••••'}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              ({formatPercentage(totalGainLossPercentage)})
            </Typography>
          </Stack>

          {/* Background decoration */}
          <Box
            sx={{
              position: 'absolute',
              top: -20,
              right: -20,
              width: 100,
              height: 100,
              borderRadius: '50%',
              bgcolor: 'rgba(255,255,255,0.1)',
            }}
          />
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <AccountBalance color="primary" sx={{ fontSize: 32, mb: 1 }} />
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                {assets.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Assets
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <GpsFixed color="primary" sx={{ fontSize: 32, mb: 1 }} />
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                {portfolioValuation?.currencies?.length || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Currencies
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Quick Actions */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ py: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2 }}>
            Quick Actions
          </Typography>
          <Grid container spacing={1}>
            <Grid item xs={6}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<Add />}
                onClick={() => navigate('/assets')}
                sx={{ py: 1.5 }}
              >
                Add Asset
              </Button>
            </Grid>
            <Grid item xs={6}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<SwapHoriz />}
                onClick={() => navigate('/transactions')}
                sx={{ py: 1.5 }}
              >
                Record Transaction
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Top Holdings */}
      <Box>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
            Top Holdings
          </Typography>
          <Button
            size="small"
            onClick={() => navigate('/portfolio')}
            sx={{ textTransform: 'none' }}
          >
            View All
          </Button>
        </Stack>

        {assets.length === 0 ? (
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 4 }}>
              <AccountBalance sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" sx={{ mb: 1 }}>
                No assets yet
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Start building your portfolio by adding your first asset
              </Typography>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => navigate('/assets')}
              >
                Add First Asset
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Stack spacing={2}>
            {assets.slice(0, 5).map((asset) => {
              const valuation = portfolioValuation?.assets.find(a => a.asset_id === asset.asset_id);
              const currentValue = valuation?.current_value || 0;
              const gainLoss = valuation?.unrealized_gain_loss || 0;
              const gainLossPercentage = valuation?.unrealized_gain_loss_percentage || 0;
              const isAssetPositive = gainLoss >= 0;

              return (
                <Card 
                  key={asset.asset_id}
                  sx={{ 
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: theme.shadows[4]
                    }
                  }}
                  onClick={() => navigate(`/assets/${asset.asset_id}`)}
                >
                  <CardContent sx={{ py: 2 }}>
                    <Stack direction="row" spacing={2} alignItems="center">
                      {/* Asset Icon */}
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: '50%',
                          bgcolor: 'primary.main',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontWeight: 'bold',
                          fontSize: '0.9rem'
                        }}
                      >
                        {asset.ticker_symbol.substring(0, 2)}
                      </Box>

                      {/* Asset Info */}
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                          {asset.ticker_symbol}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" noWrap>
                          {asset.total_shares} shares
                        </Typography>
                      </Box>

                      {/* Value & Performance */}
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                          {showBalance ? formatCurrency(currentValue) : '••••'}
                        </Typography>
                        <Stack direction="row" alignItems="center" spacing={0.5}>
                          {isAssetPositive ? (
                            <ArrowUpward 
                              fontSize="small" 
                              sx={{ color: 'success.main', fontSize: '14px' }} 
                            />
                          ) : (
                            <ArrowDownward 
                              fontSize="small" 
                              sx={{ color: 'error.main', fontSize: '14px' }} 
                            />
                          )}
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              color: isAssetPositive ? 'success.main' : 'error.main',
                              fontWeight: 'medium',
                              fontSize: '0.75rem'
                            }}
                          >
                            {formatPercentage(gainLossPercentage)}
                          </Typography>
                        </Stack>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              );
            })}
          </Stack>
        )}
      </Box>

      {/* Performance Indicator */}
      {refreshing && (
        <LinearProgress 
          sx={{ 
            position: 'fixed',
            top: 64, // Below app bar
            left: 0,
            right: 0,
            zIndex: theme.zIndex.appBar - 1
          }} 
        />
      )}
    </Box>
  );
};
