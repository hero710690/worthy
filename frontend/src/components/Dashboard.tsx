import React from 'react';
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

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const portfolioStats = [
    {
      title: 'Total Assets',
      value: '$0.00',
      change: '+0.0%',
      changeType: 'positive',
      icon: <AccountBalance />,
      color: '#667eea'
    },
    {
      title: 'Portfolio Value',
      value: '$0.00',
      change: '+0.0%',
      changeType: 'positive',
      icon: <TrendingUp />,
      color: '#764ba2'
    },
    {
      title: 'Monthly Investment',
      value: '$0.00',
      change: '+0.0%',
      changeType: 'positive',
      icon: <ShowChart />,
      color: '#f093fb'
    },
    {
      title: 'FIRE Progress',
      value: '0%',
      change: 'vs target',
      changeType: 'neutral',
      icon: <GpsFixed />,
      color: '#f5576c'
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
              It is the best time to manage your finances
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
                    {stat.value}
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
                    <Typography variant="body2" color="text.secondary">
                      vs last month
                    </Typography>
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
              Get Started with Worthy
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
                        Manage Your Assets
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Initialize and track your investment portfolio
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
                        Analyze your investment performance
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
