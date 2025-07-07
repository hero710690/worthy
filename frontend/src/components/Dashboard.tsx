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

  const upcomingFeatures = [
    { 
      label: 'Asset Portfolio Management', 
      icon: <TrendingUp color="warning" />, 
      description: 'Initialize and manage your investment assets',
      status: 'In Development'
    },
    { 
      label: 'Investment Recording', 
      icon: <AccountBalance color="warning" />, 
      description: 'Record lump-sum purchases and transactions',
      status: 'In Development'
    },
    { label: 'FIRE Calculator', icon: <Calculate color="info" />, status: 'Planned' },
    { label: 'Performance Analytics', icon: <Analytics color="info" />, status: 'Planned' },
    { label: 'Real-time Price Updates', icon: <ShowChart color="info" />, status: 'Planned' },
    { label: 'Recurring Investments', icon: <Language color="info" />, status: 'Planned' },
  ];

  const statusCards = [
    { title: 'Backend API', status: 'Connected', color: 'success', icon: <CheckCircle /> },
    { title: 'Database', status: 'Active', color: 'primary', icon: <AccountBalance /> },
    { title: 'Authentication', status: 'Secured', color: 'success', icon: <CheckCircle /> },
    { title: 'Asset Management', status: 'In Development', color: 'warning', icon: <TrendingUp /> },
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
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Grid container spacing={3}>
          {/* Welcome Section */}
          <Grid item xs={12}>
            <Card elevation={2} sx={{ borderRadius: 3, mb: 2 }}>
              <CardContent sx={{ p: 4 }}>
                <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                  <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
                    Welcome to Worthy! 👋
                  </Typography>
                  <Chip 
                    icon={<CheckCircle />} 
                    label="Asset Management Ready" 
                    color="success" 
                    variant="filled"
                    size="small"
                  />
                </Stack>
                
                <Typography variant="body1" color="text.secondary" sx={{ mb: 3, fontSize: '1.1rem' }}>
                  Your financial tracking system is ready! Asset management features are being finalized and will be available soon.
                </Typography>

                <Stack direction="row" spacing={2}>
                  <Button
                    variant="contained"
                    size="large"
                    startIcon={<Add />}
                    disabled
                    sx={{
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)',
                      }
                    }}
                  >
                    Manage Assets (Coming Soon)
                  </Button>
                  <Button
                    variant="outlined"
                    size="large"
                    startIcon={<ShowChart />}
                    disabled
                  >
                    View Portfolio (Coming Soon)
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Coming Soon Features */}
          <Grid item xs={12} lg={8}>
            <Card elevation={2} sx={{ borderRadius: 3, mb: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
                  Features Status
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
                          secondary={feature.description}
                          primaryTypographyProps={{ 
                            variant: 'body1',
                            fontWeight: 'medium'
                          }}
                          secondaryTypographyProps={{
                            variant: 'body2',
                            color: 'text.secondary'
                          }}
                        />
                        <Chip 
                          label={feature.status} 
                          color={feature.status === 'In Development' ? 'warning' : 'info'} 
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
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', mb: 3 }}>
                  Your Profile
                </Typography>
                
                <Grid container spacing={3}>
                  {userDetails.map((detail, index) => (
                    <Grid item xs={12} sm={6} key={index}>
                      <Paper 
                        elevation={0} 
                        sx={{ 
                          p: 2, 
                          bgcolor: 'grey.50',
                          borderRadius: 2,
                          border: '1px solid',
                          borderColor: 'grey.200'
                        }}
                      >
                        <Stack direction="row" spacing={2} alignItems="center">
                          {detail.icon}
                          <Box>
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                              {detail.label}
                            </Typography>
                            <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                              {detail.value}
                            </Typography>
                          </Box>
                        </Stack>
                      </Paper>
                    </Grid>
                  ))}
                  {user?.created_at && (
                    <Grid item xs={12} sm={6}>
                      <Paper 
                        elevation={0} 
                        sx={{ 
                          p: 2, 
                          bgcolor: 'grey.50',
                          borderRadius: 2,
                          border: '1px solid',
                          borderColor: 'grey.200'
                        }}
                      >
                        <Stack direction="row" spacing={2} alignItems="center">
                          <CalendarToday color="primary" />
                          <Box>
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                              Member Since
                            </Typography>
                            <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
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

          {/* Development Status */}
          <Grid item xs={12} lg={4}>
            <Card elevation={2} sx={{ borderRadius: 3, height: 'fit-content' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
                  Development Progress
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Asset management features are currently being finalized. Stay tuned for updates!
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
                      width: '85%', 
                      bgcolor: 'warning.main', 
                      height: '100%', 
                      borderRadius: 1 
                    }} />
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    85% Complete - Asset Management UI
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Status Cards */}
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
              System Status
            </Typography>
            <Grid container spacing={2}>
              {statusCards.map((card, index) => (
                <Grid item xs={6} sm={3} key={index}>
                  <Card 
                    elevation={1} 
                    sx={{ 
                      borderRadius: 2, 
                      textAlign: 'center', 
                      p: 2,
                      transition: 'transform 0.2s ease',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                        elevation: 3
                      }
                    }}
                  >
                    <Box sx={{ color: `${card.color}.main`, mb: 1 }}>
                      {React.cloneElement(card.icon, { sx: { fontSize: 32 } })}
                    </Box>
                    <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>
                      {card.title}
                    </Typography>
                    <Chip 
                      label={card.status} 
                      color={card.color as any} 
                      size="small" 
                      variant="filled"
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
