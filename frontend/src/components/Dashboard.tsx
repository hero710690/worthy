import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  Avatar,
  Stack,
  Paper,
  CircularProgress,
  Alert,
  Chip,
  Tooltip,
  IconButton,
} from '@mui/material';
import {
  TrendingUp,
  AccountBalance,
  ShowChart,
  Add,
  AccountCircle,
  GpsFixed,
  Info,
  Refresh,
  CheckCircle,
  Warning,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { assetAPI } from '../services/assetApi';
import { assetValuationService, type PortfolioValuation } from '../services/assetValuationService';
import { exchangeRateService } from '../services/exchangeRateService';
import { stockPriceService } from '../services/stockPriceService';
import type { Asset } from '../types/assets';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [portfolioValuation, setPortfolioValuation] = useState<PortfolioValuation | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPortfolioData = async (forceRefresh: boolean = false) => {
    try {
      if (forceRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      // Fetch assets from API
      const response = await assetAPI.getAssets();
      setAssets(response.assets);
      
      // Get user's base currency
      const baseCurrency = user?.base_currency || 'USD';
      
      // Valuate portfolio with real-time data
      const valuation = await assetValuationService.valuatePortfolio(response.assets, baseCurrency);
      setPortfolioValuation(valuation);
      
      setError(null);
    } catch (error: any) {
      console.error('Failed to fetch portfolio data:', error);
      setError(error.response?.data?.message || 'Failed to fetch portfolio data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    await fetchPortfolioData(true);
  };

  useEffect(() => {
    fetchPortfolioData();
  }, [user?.base_currency]);

  const calculateUniqueAssets = () => {
    return new Set(assets.map(asset => asset.ticker_symbol)).size;
  };

  const getPortfolioCurrencies = () => {
    return new Set(assets.map(asset => asset.currency));
  };

  const formatBaseCurrency = (amount: number) => {
    const baseCurrency = user?.base_currency || 'USD';
    return exchangeRateService.formatCurrency(amount, baseCurrency);
  };

  const getApiStatusInfo = () => {
    if (!portfolioValuation) return null;
    
    return {
      exchangeRates: portfolioValuation.apiStatus.exchangeRates,
      stockPrices: portfolioValuation.apiStatus.stockPrices,
      lastUpdated: portfolioValuation.lastUpdated
    };
  };

  const portfolioStats = [
    {
      title: 'Total Assets',
      value: assets.length.toString(),
      change: '+0.0%',
      changeType: 'positive',
      icon: <AccountBalance />,
      color: '#667eea',
      subtext: 'vs last month'
    },
    {
      title: 'Portfolio Value',
      value: portfolioValuation ? formatBaseCurrency(portfolioValuation.totalValueInBaseCurrency) : '$0.00',
      change: portfolioValuation && portfolioValuation.totalUnrealizedGainLossPercent !== 0 
        ? `${portfolioValuation.totalUnrealizedGainLossPercent >= 0 ? '+' : ''}${portfolioValuation.totalUnrealizedGainLossPercent.toFixed(2)}%`
        : '+0.0%',
      changeType: portfolioValuation && portfolioValuation.totalUnrealizedGainLossPercent > 0 
        ? 'positive' 
        : portfolioValuation && portfolioValuation.totalUnrealizedGainLossPercent < 0 
        ? 'negative' 
        : 'neutral',
      icon: <TrendingUp />,
      color: '#764ba2',
      subtext: 'unrealized P&L'
    },
    {
      title: 'Unrealized P&L',
      value: portfolioValuation ? formatBaseCurrency(portfolioValuation.totalUnrealizedGainLoss) : '$0.00',
      change: portfolioValuation && portfolioValuation.totalUnrealizedGainLossPercent !== 0 
        ? `${portfolioValuation.totalUnrealizedGainLossPercent >= 0 ? '+' : ''}${portfolioValuation.totalUnrealizedGainLossPercent.toFixed(2)}%`
        : '0.0%',
      changeType: portfolioValuation && portfolioValuation.totalUnrealizedGainLoss > 0 
        ? 'positive' 
        : portfolioValuation && portfolioValuation.totalUnrealizedGainLoss < 0 
        ? 'negative' 
        : 'neutral',
      icon: <ShowChart />,
      color: '#f093fb',
      subtext: 'total gain/loss'
    },
    {
      title: 'Unique Assets',
      value: calculateUniqueAssets().toString(),
      change: 'diversification',
      changeType: 'neutral',
      icon: <GpsFixed />,
      color: '#f5576c',
      subtext: 'different symbols'
    },
  ];

  return (
    <Box sx={{ minHeight: '100vh', maxWidth: 1400, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ p: { xs: 3, md: 4 }, pb: 0 }}>
        <Stack 
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between" 
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          spacing={2}
          sx={{ mb: 1 }}
        >
          <Box>
            <Typography 
              variant="h4" 
              sx={{ 
                fontWeight: 'bold',
                fontSize: { xs: '1.75rem', md: '2.125rem' },
                mb: 0.5,
                color: 'primary.main'
              }}
            >
              Welcome back, {user?.name?.split(' ')[0] || 'User'}!
            </Typography>
            <Typography 
              variant="body1" 
              color="text.secondary"
              sx={{ fontSize: { xs: '0.95rem', md: '1rem' } }}
            >
              {loading ? 'Loading your portfolio...' : 'Track your investments and achieve your financial goals'}
            </Typography>
          </Box>
          
          <Stack direction="row" spacing={2} alignItems="center">
            <Tooltip title="Refresh portfolio data">
              <Button
                variant="outlined"
                onClick={handleRefresh}
                disabled={refreshing}
                startIcon={refreshing ? <CircularProgress size={20} /> : <Refresh />}
                sx={{ borderRadius: 2, px: 3 }}
              >
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </Button>
            </Tooltip>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => navigate('/assets')}
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: 2,
                px: 3,
                py: 1.5,
                textTransform: 'none',
                fontWeight: 'bold',
                '&:hover': {
                  background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)',
                }
              }}
            >
              Add Asset
            </Button>
          </Stack>
        </Stack>
      </Box>

      {/* Content */}
      <Box sx={{ p: { xs: 3, md: 4 } }}>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Real-time Data Status */}
        {portfolioValuation && (
          <Alert 
            severity={portfolioValuation.apiStatus.exchangeRates && portfolioValuation.apiStatus.stockPrices ? "success" : "info"}
            sx={{ mb: 3 }}
            action={
              <Tooltip title="Refresh portfolio data">
                <IconButton
                  color="inherit"
                  size="small"
                  onClick={handleRefresh}
                  disabled={refreshing}
                >
                  {refreshing ? <CircularProgress size={16} /> : <Refresh />}
                </IconButton>
              </Tooltip>
            }
          >
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                Real-time Data Status:
              </Typography>
              
              <Chip 
                icon={portfolioValuation.apiStatus.exchangeRates ? <CheckCircle /> : <Warning />}
                label={`Exchange Rates: ${portfolioValuation.apiStatus.exchangeRates ? 'Live' : 'Mock'}`}
                size="small"
                color={portfolioValuation.apiStatus.exchangeRates ? "success" : "warning"}
                variant="outlined"
              />
              
              <Tooltip 
                title={portfolioValuation.apiStatus.stockPrices 
                  ? "Using live stock prices from Alpha Vantage API" 
                  : "Using mock prices - Alpha Vantage daily limit reached (25 requests/day). Prices will update tomorrow."
                }
                arrow
              >
                <Chip 
                  icon={portfolioValuation.apiStatus.stockPrices ? <CheckCircle /> : <Warning />}
                  label={`Stock Prices: ${portfolioValuation.apiStatus.stockPrices ? 'Live' : 'Mock'}`}
                  size="small"
                  color={portfolioValuation.apiStatus.stockPrices ? "success" : "warning"}
                  variant="outlined"
                />
              </Tooltip>
              
              <Typography variant="body2" color="text.secondary">
                Last updated: {portfolioValuation.lastUpdated.toLocaleTimeString()}
              </Typography>
            </Stack>
          </Alert>
        )}

        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {portfolioStats.map((stat, index) => (
            <Grid item xs={12} sm={6} lg={3} key={index}>
              <Card 
                elevation={0}
                sx={{ 
                  borderRadius: 3,
                  border: '1px solid',
                  borderColor: 'grey.200',
                  height: '100%',
                  background: index === 0 
                    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                    : index === 1
                    ? 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
                    : index === 2
                    ? stat.changeType === 'positive'
                      ? 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)'
                      : 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)'
                    : 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
                  color: index < 3 ? 'white' : 'text.primary',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4
                  }
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        fontWeight: 'medium',
                        color: index < 3 ? 'rgba(255,255,255,0.9)' : 'text.secondary'
                      }}
                    >
                      {stat.title}
                    </Typography>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: 2,
                        bgcolor: index < 3 ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: index < 3 ? 'white' : 'text.primary'
                      }}
                    >
                      {stat.icon}
                    </Box>
                  </Stack>
                  
                  <Typography 
                    variant="h4" 
                    sx={{ 
                      fontWeight: 'bold',
                      mb: 1,
                      fontSize: { xs: '1.75rem', md: '2rem' }
                    }}
                  >
                    {loading ? (
                      <CircularProgress size={24} sx={{ color: index < 3 ? 'white' : stat.color }} />
                    ) : (
                      stat.value
                    )}
                  </Typography>
                  
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        color: index < 3 
                          ? 'rgba(255,255,255,0.8)'
                          : stat.changeType === 'positive' ? 'success.main' : 
                            stat.changeType === 'negative' ? 'error.main' : 'text.secondary',
                        fontWeight: 'medium'
                      }}
                    >
                      {stat.change}
                    </Typography>
                    {stat.subtext && (
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          color: index < 3 ? 'rgba(255,255,255,0.7)' : 'text.secondary'
                        }}
                      >
                        {stat.subtext}
                      </Typography>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Getting Started Section */}
        <Card 
          elevation={0}
          sx={{ 
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'grey.200',
            mb: 3
          }}
        >
          <CardContent sx={{ p: 4 }}>
            <Typography 
              variant="h6" 
              sx={{ 
                fontWeight: 'bold',
                mb: 2,
                fontSize: { xs: '1.25rem', md: '1.5rem' }
              }}
            >
              {assets.length === 0 ? 'Get Started with Worthy' : 'Manage Your Portfolio'}
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Paper 
                  elevation={0}
                  sx={{ 
                    p: 3,
                    borderRadius: 2,
                    bgcolor: 'success.50',
                    border: '1px solid',
                    borderColor: 'success.200',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      bgcolor: 'success.100',
                      transform: 'translateY(-2px)',
                      boxShadow: 2
                    }
                  }}
                  onClick={() => navigate('/assets')}
                >
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: '12px',
                        bgcolor: 'success.main',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white'
                      }}
                    >
                      <TrendingUp />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                        {assets.length === 0 ? 'Initialize Your Assets' : 'Manage Your Assets'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {assets.length === 0 
                          ? 'Add your existing investments to start tracking'
                          : `Track and manage your ${assets.length} asset${assets.length !== 1 ? 's' : ''}`
                        }
                      </Typography>
                    </Box>
                  </Stack>
                </Paper>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Paper 
                  elevation={0}
                  sx={{ 
                    p: 3,
                    borderRadius: 2,
                    bgcolor: 'info.50',
                    border: '1px solid',
                    borderColor: 'info.200',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      bgcolor: 'info.100',
                      transform: 'translateY(-2px)',
                      boxShadow: 2
                    }
                  }}
                  onClick={() => navigate('/assets')}
                >
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: '12px',
                        bgcolor: 'info.main',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white'
                      }}
                    >
                      <ShowChart />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                        View Portfolio
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {portfolioValuation && portfolioValuation.totalValueInBaseCurrency > 0 
                          ? `Analyze your ${formatBaseCurrency(portfolioValuation.totalValueInBaseCurrency)} portfolio with real-time data`
                          : 'Analyze your investment performance with real-time market data'
                        }
                      </Typography>
                    </Box>
                  </Stack>
                </Paper>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};
