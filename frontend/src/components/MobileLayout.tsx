import React, { useState } from 'react';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  IconButton,
  Typography,
  Stack,
  Avatar,
  Paper,
  useTheme,
  useMediaQuery,
  AppBar,
  Toolbar,
  Fab,
  BottomNavigation,
  BottomNavigationAction,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  TrendingUp,
  ShowChart,
  Menu,
  Person,
  Settings,
  Analytics,
  Receipt,
  Assessment,
  Paid,
  GpsFixed,
  Schedule,
  Help,
  Logout,
  Close,
  Add,
  Home,
  AccountBalance,
  Timeline,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const drawerWidth = 280;

interface MobileLayoutProps {
  children: React.ReactNode;
}

export const MobileLayout: React.FC<MobileLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.down('lg'));

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleDrawerClose = () => {
    setMobileOpen(false);
  };

  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
    { text: 'Assets', icon: <TrendingUp />, path: '/assets' },
    { text: 'Transactions', icon: <Receipt />, path: '/transactions' },
    { text: 'Portfolio', icon: <Assessment />, path: '/portfolio' },
    { text: 'Recurring', icon: <Schedule />, path: '/recurring-investments' },
    { text: 'Dividends', icon: <Paid />, path: '/dividends' },
    { text: 'Goals', icon: <GpsFixed />, path: '/goals' },
    { text: 'Analytics', icon: <Analytics />, path: '/analytics' },
  ];

  // Bottom navigation items for mobile
  const bottomNavItems = [
    { label: 'Dashboard', icon: <Home />, path: '/dashboard' },
    { label: 'Portfolio', icon: <AccountBalance />, path: '/portfolio' },
    { label: 'Goals', icon: <GpsFixed />, path: '/goals' },
    { label: 'Analytics', icon: <Timeline />, path: '/analytics' },
  ];

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Mobile Header */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        p: 2,
        borderBottom: '1px solid',
        borderColor: 'divider'
      }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 'bold',
              fontSize: '1.1rem'
            }}
          >
            W
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
            Worthy
          </Typography>
        </Stack>
        <IconButton onClick={handleDrawerClose} size="small">
          <Close />
        </IconButton>
      </Box>

      {/* User Profile Section */}
      <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Paper
          elevation={0}
          sx={{
            p: 2,
            bgcolor: 'grey.50',
            border: '1px solid',
            borderColor: 'grey.200',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            '&:hover': {
              bgcolor: 'grey.100',
              borderColor: 'grey.300'
            }
          }}
          onClick={() => {
            navigate('/profile');
            handleDrawerClose();
          }}
        >
          <Stack direction="row" spacing={2} alignItems="center">
            <Avatar 
              sx={{ 
                width: 48, 
                height: 48,
                bgcolor: 'primary.main',
                fontSize: '1.4rem',
                fontWeight: 'bold'
              }}
            >
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography 
                variant="body1" 
                sx={{ 
                  fontWeight: 'bold',
                  fontSize: '1.1rem',
                  mb: 0.5,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {user?.name || 'User'}
              </Typography>
              <Typography 
                variant="body2" 
                color="text.secondary"
                sx={{ 
                  fontSize: '0.9rem',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {user?.email || 'user@example.com'}
              </Typography>
            </Box>
          </Stack>
        </Paper>
      </Box>

      {/* Navigation Menu */}
      <Box sx={{ flex: 1, overflow: 'auto', py: 1 }}>
        <List sx={{ px: 1 }}>
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            
            return (
              <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton
                  onClick={() => {
                    navigate(item.path);
                    handleDrawerClose();
                  }}
                  sx={{
                    borderRadius: 2,
                    py: 2,
                    px: 2,
                    bgcolor: isActive ? 'primary.main' : 'transparent',
                    color: isActive ? 'white' : 'text.primary',
                    '&:hover': {
                      bgcolor: isActive ? 'primary.dark' : 'grey.100',
                    },
                    minHeight: 60,
                  }}
                >
                  <ListItemIcon 
                    sx={{ 
                      minWidth: 52,
                      color: isActive ? 'white' : 'text.secondary'
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText 
                    primary={item.text}
                    primaryTypographyProps={{
                      fontSize: '1.1rem',
                      fontWeight: isActive ? 600 : 500
                    }}
                  />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </Box>

      {/* Bottom Actions */}
      <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
        <List>
          <ListItem disablePadding>
            <ListItemButton
              sx={{
                borderRadius: 2,
                py: 2,
                px: 2,
                '&:hover': { bgcolor: 'grey.100' },
                minHeight: 60,
              }}
            >
              <ListItemIcon sx={{ minWidth: 52 }}>
                <Help />
              </ListItemIcon>
              <ListItemText 
                primary="Help & Support" 
                primaryTypographyProps={{
                  fontSize: '1.1rem'
                }}
              />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton
              onClick={() => {
                handleLogout();
                handleDrawerClose();
              }}
              sx={{
                borderRadius: 2,
                py: 2,
                px: 2,
                '&:hover': { bgcolor: 'grey.100' },
                minHeight: 60,
              }}
            >
              <ListItemIcon sx={{ minWidth: 52 }}>
                <Logout />
              </ListItemIcon>
              <ListItemText 
                primary="Log out" 
                primaryTypographyProps={{
                  fontSize: '1.1rem'
                }}
              />
            </ListItemButton>
          </ListItem>
        </List>
      </Box>
    </Box>
  );

  if (isMobile) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        {/* Mobile App Bar */}
        <AppBar 
          position="fixed" 
          sx={{ 
            bgcolor: 'white',
            color: 'text.primary',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            zIndex: theme.zIndex.drawer + 1
          }}
        >
          <Toolbar sx={{ justifyContent: 'space-between', minHeight: '64px !important' }}>
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2 }}
            >
              <Menu />
            </IconButton>
            
            <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
              Worthy
            </Typography>
            
            <Avatar 
              sx={{ 
                width: 36, 
                height: 36,
                bgcolor: 'primary.main',
                fontSize: '1rem',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
              onClick={() => navigate('/profile')}
            >
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </Avatar>
          </Toolbar>
        </AppBar>

        {/* Mobile Drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerClose}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile
          }}
          sx={{
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
            },
          }}
        >
          {drawer}
        </Drawer>

        {/* Main Content */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            pt: '64px', // AppBar height
            pb: '56px', // BottomNavigation height
            bgcolor: 'grey.50',
            minHeight: '100vh',
            overflow: 'auto'
          }}
        >
          <Box sx={{ p: 2 }}>
            {children}
          </Box>
        </Box>

        {/* Bottom Navigation */}
        <BottomNavigation
          value={location.pathname}
          onChange={(event, newValue) => {
            navigate(newValue);
          }}
          sx={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            bgcolor: 'white',
            borderTop: '1px solid',
            borderColor: 'divider',
            zIndex: theme.zIndex.appBar,
            '& .MuiBottomNavigationAction-root': {
              minWidth: 'auto',
              '&.Mui-selected': {
                color: 'primary.main',
              }
            }
          }}
        >
          {bottomNavItems.map((item) => (
            <BottomNavigationAction
              key={item.path}
              label={item.label}
              value={item.path}
              icon={item.icon}
              sx={{
                fontSize: '0.75rem',
                '& .MuiBottomNavigationAction-label': {
                  fontSize: '0.75rem',
                  '&.Mui-selected': {
                    fontSize: '0.75rem',
                  }
                }
              }}
            />
          ))}
        </BottomNavigation>

        {/* Floating Action Button */}
        <Fab
          color="primary"
          aria-label="add"
          sx={{
            position: 'fixed',
            bottom: 72, // Above bottom navigation
            right: 16,
            zIndex: theme.zIndex.fab,
          }}
          onClick={() => navigate('/assets')}
        >
          <Add />
        </Fab>
      </Box>
    );
  }

  // Desktop layout (existing layout)
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'grey.50' }}>
      {/* Desktop Drawer */}
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            bgcolor: 'white',
            borderRight: '1px solid',
            borderColor: 'divider',
          },
        }}
      >
        {drawer}
      </Drawer>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          bgcolor: 'grey.50',
          minHeight: '100vh',
          overflow: 'auto'
        }}
      >
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
};
