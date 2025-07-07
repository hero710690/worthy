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
} from '@mui/material';
import {
  TrendingUp,
  AccountBalance,
  ShowChart,
  Add,
  AccountCircle,
  GpsFixed,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { assetAPI } from '../services/assetApi';
import type { Asset } from '../types/assets';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAssets = async () => {
    try {
      setLoading(true);
      const response = await assetAPI.getAssets();
      setAssets(response.assets);
      setError(null);
    } catch (error: any) {
      console.error('Failed to fetch assets:', error);
      setError(error.response?.data?.message || 'Failed to fetch portfolio data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  const calculateTotalValue = () => {
    return assets.reduce((total, asset) => {
      return total + (asset.total_shares * asset.average_cost_basis);
    }, 0);
  };

  const calculateUniqueAssets = () => {
    return new Set(assets.map(asset => asset.ticker_symbol)).size;
  };

  const getPortfolioCurrencies = () => {
    return new Set(assets.map(asset => asset.currency));
  };

  const formatPortfolioValue = () => {
    const currencies = getPortfolioCurrencies();
    
    if (currencies.size === 0) {
      return '$0.00';
    }
    
    if (currencies.size === 1) {
      // Single currency - format normally
      const currency = Array.from(currencies)[0];
      const totalValue = calculateTotalValue();
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
      }).format(totalValue);
    }
    
    // Multiple currencies - show mixed indicator
    return 'Mixed Currencies';
  };

  const getPortfolioValueSubtext = () => {
    const currencies = getPortfolioCurrencies();
    
    if (currencies.size <= 1) {
      return 'vs last month';
    }
    
    // Multiple currencies - show currency list
    return `${Array.from(currencies).join(', ')}`;
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
      value: formatPortfolioValue(),
      change: getPortfolioCurrencies().size > 1 ? 'Multi-currency' : '+0.0%',
      changeType: getPortfolioCurrencies().size > 1 ? 'neutral' : 'positive',
      icon: <TrendingUp />,
      color: '#764ba2',
      subtext: getPortfolioValueSubtext()
    },
    {
      title: 'Unique Assets',
      value: calculateUniqueAssets().toString(),
      change: 'diversification',
      changeType: 'neutral',
      icon: <ShowChart />,
      color: '#f093fb',
      subtext: ''
    },
    {
      title: 'FIRE Progress',
      value: '0%',
      change: 'vs target',
      changeType: 'neutral',
      icon: <GpsFixed />,
      color: '#f5576c',
      subtext: ''
    },
  ];

  return (
    <Box sx={{ minHeight: '100vh' }}>
      {/* Header */}
      <Box sx={{ p: { xs: 3, md: 4 }, pb: 0 }}>
        <Stack 
          direction="row" 
          justifyContent="space-between" 
          alignItems="center"
          sx={{ mb: 1 }}
        >
          <Box>
            <Typography 
              variant="h4" 
              sx={{ 
                fontWeight: 'bold',
                fontSize: { xs: '1.75rem', md: '2.125rem' },
                mb: 0.5
              }}
            >
              Welcome back, {user?.name?.split(' ')[0] || 'User'}!
            </Typography>
            <Typography 
              variant="body1" 
              color="text.secondary"
              sx={{ fontSize: { xs: '0.95rem', md: '1rem' } }}
            >
              {loading ? 'Loading your portfolio...' : 'It is the best time to manage your finances'}
            </Typography>
          </Box>
          
          <Stack direction="row" spacing={2} alignItems="center">
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
              Add new asset
            </Button>
            <Avatar 
              sx={{ 
                width: 40, 
                height: 40,
                bgcolor: 'grey.200',
                color: 'text.primary'
              }}
            >
              <AccountCircle />
            </Avatar>
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
                      color="text.secondary"
                      sx={{ fontWeight: 'medium' }}
                    >
                      {stat.title}
                    </Typography>
                    <Box
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: '8px',
                        bgcolor: `${stat.color}15`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: stat.color
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
                      <CircularProgress size={24} sx={{ color: stat.color }} />
                    ) : (
                      stat.value
                    )}
                  </Typography>
                  
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        color: stat.changeType === 'positive' ? 'success.main' : 
                               stat.changeType === 'negative' ? 'error.main' : 'text.secondary',
                        fontWeight: 'medium'
                      }}
                    >
                      {stat.change}
                    </Typography>
                    {stat.subtext && (
                      <Typography variant="body2" color="text.secondary">
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
                        {getPortfolioCurrencies().size === 0
                          ? 'Analyze your investment performance'
                          : getPortfolioCurrencies().size === 1
                          ? `Analyze your ${formatPortfolioValue()} portfolio`
                          : `Analyze your multi-currency portfolio (${Array.from(getPortfolioCurrencies()).join(', ')})`
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
