import React from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Button,
  Container,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Avatar,
  Paper,
  Grid,
  Stack,
  Divider,
} from '@mui/material';
import {
  AccountCircle,
  ExitToApp,
  TrendingUp,
  AccountBalance,
  Calculate,
  Analytics,
  Language,
  CheckCircle,
  Person,
  Email,
  AttachMoney,
  CalendarToday,
  ShowChart,
  Add,
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

export const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
  };

  const userDetails = [
    { label: 'Name', value: user?.name, icon: <Person color="primary" /> },
    { label: 'Email', value: user?.email, icon: <Email color="primary" /> },
    { label: 'User ID', value: `#${user?.user_id}`, icon: <Person color="primary" /> },
    { label: 'Base Currency', value: user?.base_currency, icon: <AttachMoney color="primary" /> },
    { label: 'Birth Year', value: user?.birth_year, icon: <CalendarToday color="primary" /> },
  ];

  const availableFeatures = [
    { 
      label: 'Asset Portfolio Management', 
      icon: <TrendingUp color="success" />, 
      description: 'Initialize and manage your investment assets',
      action: () => navigate('/assets'),
      status: 'Available'
    },
    { 
      label: 'Investment Recording', 
      icon: <AccountBalance color="success" />, 
      description: 'Record lump-sum purchases and transactions',
      action: () => navigate('/assets'),
      status: 'Available'
    },
  ];

  const upcomingFeatures = [
    { label: 'FIRE Calculator', icon: <Calculate color="info" />, status: 'Planned' },
    { label: 'Performance Analytics', icon: <Analytics color="info" />, status: 'Planned' },
    { label: 'Real-time Price Updates', icon: <ShowChart color="info" />, status: 'Planned' },
    { label: 'Recurring Investments', icon: <Language color="info" />, status: 'Planned' },
  ];

  const statusCards = [
    { title: 'Backend API', status: 'Connected', color: 'success', icon: <CheckCircle /> },
    { title: 'Database', status: 'Active', color: 'primary', icon: <AccountBalance /> },
    { title: 'Authentication', status: 'Secured', color: 'success', icon: <CheckCircle /> },
    { title: 'Asset Management', status: 'Available', color: 'success', icon: <TrendingUp /> },
  ];

  return (
    <Box sx={{ flexGrow: 1, bgcolor: 'grey.50', minHeight: '100vh' }}>
      {/* Header */}
      <AppBar 
        position="static" 
        elevation={0}
        sx={{ 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        }}
      >
        <Toolbar sx={{ py: 1 }}>
          <Typography variant="h5" component="div" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
            Worthy Dashboard
          </Typography>
          <Stack direction="row" spacing={2} alignItems="center">
            <Button
              color="inherit"
              onClick={() => navigate('/assets')}
              startIcon={<ShowChart />}
              variant="outlined"
              size="small"
              sx={{ 
                borderColor: 'rgba(255,255,255,0.3)',
                '&:hover': { 
                  borderColor: 'rgba(255,255,255,0.5)',
                  bgcolor: 'rgba(255,255,255,0.1)'
                }
              }}
            >
              Assets
            </Button>
            <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 32, height: 32 }}>
              <AccountCircle />
            </Avatar>
            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                {user?.name}
              </Typography>
            </Box>
            <Button
              color="inherit"
              onClick={handleLogout}
              startIcon={<ExitToApp />}
              variant="outlined"
              size="small"
              sx={{ 
                borderColor: 'rgba(255,255,255,0.3)',
                '&:hover': { 
                  borderColor: 'rgba(255,255,255,0.5)',
                  bgcolor: 'rgba(255,255,255,0.1)'
                }
              }}
            >
              Logout
            </Button>
          </Stack>
        </Toolbar>
      </AppBar>

      {/* Main Content */}
      <Container maxWidth="xl" sx={{ py: { xs: 2, md: 4 }, px: { xs: 2, md: 3 } }}>
        <Grid container spacing={{ xs: 2, md: 4 }}>
          {/* Welcome Section */}
          <Grid item xs={12}>
            <Card elevation={2} sx={{ borderRadius: 3, mb: { xs: 2, md: 3 } }}>
              <CardContent sx={{ p: { xs: 3, md: 5 } }}>
                <Stack 
                  direction={{ xs: 'column', sm: 'row' }} 
                  spacing={2} 
                  alignItems={{ xs: 'flex-start', sm: 'center' }} 
                  sx={{ mb: 3 }}
                >
                  <Typography 
                    variant={{ xs: 'h5', md: 'h4' }} 
                    component="h1" 
                    sx={{ fontWeight: 'bold' }}
                  >
                    Welcome to Worthy! 👋
                  </Typography>
                  <Chip 
                    icon={<CheckCircle />} 
                    label="Asset Management Ready" 
                    color="success" 
                    variant="filled"
                    size="medium"
                  />
                </Stack>
                
                <Typography 
                  variant="body1" 
                  color="text.secondary" 
                  sx={{ 
                    mb: 4, 
                    fontSize: { xs: '1rem', md: '1.1rem' },
                    lineHeight: 1.6
                  }}
                >
                  Your financial tracking system is ready! Start by managing your investment assets and recording transactions.
                </Typography>

                <Stack 
                  direction={{ xs: 'column', sm: 'row' }} 
                  spacing={{ xs: 2, sm: 3 }}
                  sx={{ alignItems: { xs: 'stretch', sm: 'center' } }}
                >
                  <Button
                    variant="contained"
                    size="large"
                    startIcon={<Add />}
                    onClick={() => navigate('/assets')}
                    sx={{
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      py: { xs: 1.5, md: 2 },
                      px: { xs: 3, md: 4 },
                      fontSize: { xs: '1rem', md: '1.1rem' },
                      '&:hover': {
                        background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)',
                      }
                    }}
                  >
                    Manage Assets
                  </Button>
                  <Button
                    variant="outlined"
                    size="large"
                    startIcon={<ShowChart />}
                    onClick={() => navigate('/assets')}
                    sx={{
                      py: { xs: 1.5, md: 2 },
                      px: { xs: 3, md: 4 },
                      fontSize: { xs: '1rem', md: '1.1rem' },
                    }}
                  >
                    View Portfolio
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Available Features */}
          <Grid item xs={12} lg={8}>
            <Card elevation={2} sx={{ borderRadius: 3, mb: { xs: 2, md: 3 } }}>
              <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                <Typography 
                  variant="h6" 
                  gutterBottom 
                  sx={{ 
                    fontWeight: 'bold', 
                    mb: { xs: 2, md: 3 },
                    fontSize: { xs: '1.25rem', md: '1.5rem' }
                  }}
                >
                  Available Features
                </Typography>
                
                <Grid container spacing={{ xs: 2, md: 3 }}>
                  {availableFeatures.map((feature, index) => (
                    <Grid item xs={12} md={6} key={index}>
                      <Paper 
                        elevation={0} 
                        sx={{ 
                          p: { xs: 2.5, md: 3.5 }, 
                          bgcolor: 'success.50',
                          borderRadius: 3,
                          border: '1px solid',
                          borderColor: 'success.200',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease',
                          height: '100%',
                          '&:hover': {
                            bgcolor: 'success.100',
                            transform: 'translateY(-4px)',
                            boxShadow: 4
                          }
                        }}
                        onClick={feature.action}
                      >
                        <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
                          <Stack direction="row" spacing={2} alignItems="center" sx={{ flex: 1 }}>
                            <Box sx={{ fontSize: { xs: 32, md: 40 } }}>
                              {feature.icon}
                            </Box>
                            <Box sx={{ flex: 1 }}>
                              <Typography 
                                variant="body1" 
                                sx={{ 
                                  fontWeight: 'bold',
                                  fontSize: { xs: '1rem', md: '1.1rem' },
                                  mb: 0.5
                                }}
                              >
                                {feature.label}
                              </Typography>
                              <Typography 
                                variant="body2" 
                                color="text.secondary"
                                sx={{ fontSize: { xs: '0.875rem', md: '0.95rem' } }}
                              >
                                {feature.description}
                              </Typography>
                            </Box>
                          </Stack>
                          <Chip 
                            label={feature.status} 
                            color="success" 
                            size="medium" 
                            variant="filled"
                            sx={{ 
                              fontWeight: 'bold',
                              minWidth: { xs: 80, md: 90 }
                            }}
                          />
                        </Stack>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>

            {/* Coming Soon Features */}
            <Card elevation={2} sx={{ borderRadius: 3, mb: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
                  Coming Soon
                </Typography>
                
                <List dense sx={{ p: 0 }}>
                  {upcomingFeatures.map((feature, index) => (
                    <React.Fragment key={index}>
                      <ListItem sx={{ px: 0, py: 2 }}>
                        <ListItemIcon sx={{ minWidth: 40 }}>
                          {feature.icon}
                        </ListItemIcon>
                        <ListItemText 
                          primary={feature.label}
                          primaryTypographyProps={{ 
                            variant: 'body1',
                            fontWeight: 'medium'
                          }}
                        />
                        <Chip 
                          label={feature.status} 
                          color="info" 
                          size="small" 
                          variant="outlined"
                        />
                      </ListItem>
                      {index < upcomingFeatures.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              </CardContent>
            </Card>

            {/* User Profile Card */}
            <Card elevation={2} sx={{ borderRadius: 3, height: 'fit-content' }}>
              <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                <Typography 
                  variant="h6" 
                  gutterBottom 
                  sx={{ 
                    fontWeight: 'bold', 
                    mb: { xs: 2, md: 3 },
                    fontSize: { xs: '1.25rem', md: '1.5rem' }
                  }}
                >
                  Your Profile
                </Typography>
                
                <Grid container spacing={{ xs: 2, md: 3 }}>
                  {userDetails.map((detail, index) => (
                    <Grid item xs={12} sm={6} lg={12} xl={6} key={index}>
                      <Paper 
                        elevation={0} 
                        sx={{ 
                          p: { xs: 2, md: 2.5 }, 
                          bgcolor: 'grey.50',
                          borderRadius: 2,
                          border: '1px solid',
                          borderColor: 'grey.200',
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            bgcolor: 'grey.100',
                            borderColor: 'grey.300'
                          }
                        }}
                      >
                        <Stack direction="row" spacing={2} alignItems="center">
                          <Box sx={{ fontSize: { xs: 20, md: 24 } }}>
                            {detail.icon}
                          </Box>
                          <Box sx={{ flex: 1 }}>
                            <Typography 
                              variant="body2" 
                              color="text.secondary" 
                              sx={{ 
                                fontSize: { xs: '0.75rem', md: '0.875rem' },
                                mb: 0.5
                              }}
                            >
                              {detail.label}
                            </Typography>
                            <Typography 
                              variant="body1" 
                              sx={{ 
                                fontWeight: 'medium',
                                fontSize: { xs: '0.95rem', md: '1rem' }
                              }}
                            >
                              {detail.value}
                            </Typography>
                          </Box>
                        </Stack>
                      </Paper>
                    </Grid>
                  ))}
                  {user?.created_at && (
                    <Grid item xs={12} sm={6} lg={12} xl={6}>
                      <Paper 
                        elevation={0} 
                        sx={{ 
                          p: { xs: 2, md: 2.5 }, 
                          bgcolor: 'grey.50',
                          borderRadius: 2,
                          border: '1px solid',
                          borderColor: 'grey.200',
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            bgcolor: 'grey.100',
                            borderColor: 'grey.300'
                          }
                        }}
                      >
                        <Stack direction="row" spacing={2} alignItems="center">
                          <Box sx={{ fontSize: { xs: 20, md: 24 } }}>
                            <CalendarToday color="primary" />
                          </Box>
                          <Box sx={{ flex: 1 }}>
                            <Typography 
                              variant="body2" 
                              color="text.secondary" 
                              sx={{ 
                                fontSize: { xs: '0.75rem', md: '0.875rem' },
                                mb: 0.5
                              }}
                            >
                              Member Since
                            </Typography>
                            <Typography 
                              variant="body1" 
                              sx={{ 
                                fontWeight: 'medium',
                                fontSize: { xs: '0.95rem', md: '1rem' }
                              }}
                            >
                              {new Date(user.created_at).toLocaleDateString()}
                            </Typography>
                          </Box>
                        </Stack>
                      </Paper>
                    </Grid>
                  )}
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Milestone Status */}
          <Grid item xs={12} lg={4}>
            <Card elevation={2} sx={{ borderRadius: 3, height: 'fit-content' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
                  Milestone Progress
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Asset management features are now live and ready to use!
                </Typography>
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    Milestone 2 Progress
                  </Typography>
                  <Box sx={{ 
                    width: '100%', 
                    bgcolor: 'grey.200', 
                    borderRadius: 1, 
                    height: 8,
                    mb: 1
                  }}>
                    <Box sx={{ 
                      width: '100%', 
                      bgcolor: 'success.main', 
                      height: '100%', 
                      borderRadius: 1 
                    }} />
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    100% Complete - Asset Management Live
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Status Cards */}
          <Grid item xs={12}>
            <Typography 
              variant="h6" 
              gutterBottom 
              sx={{ 
                fontWeight: 'bold', 
                mb: { xs: 2, md: 3 },
                fontSize: { xs: '1.25rem', md: '1.5rem' }
              }}
            >
              System Status
            </Typography>
            <Grid container spacing={{ xs: 2, md: 3 }}>
              {statusCards.map((card, index) => (
                <Grid item xs={6} sm={3} md={3} lg={3} key={index}>
                  <Card 
                    elevation={2} 
                    sx={{ 
                      borderRadius: 3, 
                      textAlign: 'center', 
                      p: { xs: 2, md: 3 },
                      transition: 'all 0.3s ease',
                      height: '100%',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: 6
                      }
                    }}
                  >
                    <Box sx={{ 
                      color: `${card.color}.main`, 
                      mb: { xs: 1, md: 2 }
                    }}>
                      {React.cloneElement(card.icon, { 
                        sx: { fontSize: { xs: 32, md: 40 } } 
                      })}
                    </Box>
                    <Typography 
                      variant="subtitle2" 
                      gutterBottom 
                      sx={{ 
                        fontWeight: 'bold',
                        fontSize: { xs: '0.875rem', md: '1rem' },
                        mb: { xs: 1, md: 1.5 }
                      }}
                    >
                      {card.title}
                    </Typography>
                    <Chip 
                      label={card.status} 
                      color={card.color as any} 
                      size="medium" 
                      variant="filled"
                      sx={{ 
                        fontWeight: 'bold',
                        fontSize: { xs: '0.75rem', md: '0.875rem' }
                      }}
                    />
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};
