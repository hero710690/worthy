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
} from '@mui/icons-material';
import { useAuth } from '../hooks/useAuth';

export const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();

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
    { label: 'Asset Portfolio Tracking', icon: <TrendingUp color="info" /> },
    { label: 'Investment Recording', icon: <AccountBalance color="info" /> },
    { label: 'FIRE Calculator', icon: <Calculate color="info" /> },
    { label: 'Performance Analytics', icon: <Analytics color="info" /> },
    { label: 'Multi-Currency Support', icon: <Language color="info" /> },
  ];

  const statusCards = [
    { title: 'Backend API', status: 'Connected', color: 'success', icon: <CheckCircle /> },
    { title: 'Database', status: 'Active', color: 'primary', icon: <AccountBalance /> },
    { title: 'Authentication', status: 'Secured', color: 'success', icon: <CheckCircle /> },
    { title: 'Ready for', status: 'Milestone 2', color: 'info', icon: <TrendingUp /> },
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
                    label="System Online" 
                    color="success" 
                    variant="filled"
                    size="small"
                  />
                </Stack>
                
                <Typography variant="body1" color="text.secondary" sx={{ mb: 3, fontSize: '1.1rem' }}>
                  Your authentication system is working perfectly! You're now ready to start tracking your financial journey toward FIRE.
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* User Profile Card */}
          <Grid item xs={12} lg={8}>
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

          {/* Coming Soon Features */}
          <Grid item xs={12} lg={4}>
            <Card elevation={2} sx={{ borderRadius: 3, height: 'fit-content' }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold', mb: 2 }}>
                  Coming Soon
                </Typography>
                <List dense sx={{ p: 0 }}>
                  {upcomingFeatures.map((feature, index) => (
                    <React.Fragment key={index}>
                      <ListItem sx={{ px: 0, py: 1 }}>
                        <ListItemIcon sx={{ minWidth: 40 }}>
                          {feature.icon}
                        </ListItemIcon>
                        <ListItemText 
                          primary={feature.label}
                          primaryTypographyProps={{ 
                            variant: 'body2',
                            fontWeight: 'medium'
                          }}
                        />
                      </ListItem>
                      {index < upcomingFeatures.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
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
