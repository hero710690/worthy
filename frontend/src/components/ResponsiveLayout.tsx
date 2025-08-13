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
  SwipeableDrawer,
  Backdrop,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  TrendingUp,
  Menu,
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
  Person,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const DRAWER_WIDTH = 280;
const MOBILE_DRAWER_WIDTH = 320;

interface ResponsiveLayoutProps {
  children: React.ReactNode;
}

export const ResponsiveLayout: React.FC<ResponsiveLayoutProps> = ({ children }) => {
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
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard', mobileShow: true },
    { text: 'Assets', icon: <TrendingUp />, path: '/assets', mobileShow: true },
    { text: 'Transactions', icon: <Receipt />, path: '/transactions', mobileShow: true },
    { text: 'Portfolio', icon: <Assessment />, path: '/portfolio', mobileShow: true },
    { text: 'Recurring', icon: <Schedule />, path: '/recurring', mobileShow: true },
    { text: 'Dividends', icon: <Paid />, path: '/dividends', mobileShow: true },
    { text: 'Goals', icon: <GpsFixed />, path: '/goals', mobileShow: true },
    { text: 'Analytics', icon: <Analytics />, path: '/analytics', mobileShow: true },
    { text: 'Settings', icon: <Settings />, path: '/profile', mobileShow: true },
  ];

  // Bottom navigation items for mobile (most important screens)
  const bottomNavItems = [
    { label: 'Dashboard', icon: <Home />, path: '/dashboard' },
    { label: 'Assets', icon: <TrendingUp />, path: '/assets' },
    { label: 'Portfolio', icon: <AccountBalance />, path: '/portfolio' },
    { label: 'Analytics', icon: <Timeline />, path: '/analytics' },
    { label: 'More', icon: <Menu />, path: '/more' }, // This will open the drawer for other features
  ];

  const renderUserProfile = () => (
    <Paper 
      elevation={0}
      sx={{ 
        p: isMobile ? 2.5 : 2,
        borderRadius: 2,
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
        if (isMobile) handleDrawerClose();
      }}
    >
      <Stack direction="row" spacing={2} alignItems="center">
        <Avatar 
          sx={{ 
            width: isMobile ? 48 : 40, 
            height: isMobile ? 48 : 40,
            bgcolor: 'primary.main',
            fontSize: isMobile ? '1.4rem' : '1.2rem',
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
              fontSize: isMobile ? '1.1rem' : '0.95rem',
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
              fontSize: isMobile ? '0.9rem' : '0.8rem',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
          >
            {user?.email || 'user@example.com'}
          </Typography>
        </Box>
        {!isMobile && (
          <IconButton size="small" sx={{ color: 'text.secondary' }}>
            <Settings fontSize="small" />
          </IconButton>
        )}
      </Stack>
    </Paper>
  );

  const renderDrawerContent = () => (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Logo/Brand */}
      <Box sx={{ 
        p: isMobile ? 2 : 3, 
        borderBottom: '1px solid', 
        borderColor: 'divider',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Box
            sx={{
              width: isMobile ? 36 : 40,
              height: isMobile ? 36 : 40,
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 'bold',
              fontSize: isMobile ? '1.1rem' : '1.2rem'
            }}
          >
            W
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
            Worthy
          </Typography>
        </Stack>
        {isMobile && (
          <IconButton onClick={handleDrawerClose} size="small">
            <Close />
          </IconButton>
        )}
      </Box>

      {/* User Profile Section - Top on mobile, bottom on desktop */}
      {isMobile && (
        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
          {renderUserProfile()}
        </Box>
      )}

      {/* Navigation Menu */}
      <Box sx={{ flex: 1, py: isMobile ? 1 : 2, overflow: 'auto' }}>
        <List sx={{ px: isMobile ? 1 : 2 }}>
          {menuItems
            .filter(item => !isMobile || item.mobileShow)
            .map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <ListItem key={item.text} disablePadding sx={{ mb: isMobile ? 0.5 : 1 }}>
                  <ListItemButton
                    onClick={() => {
                      navigate(item.path);
                      if (isMobile) handleDrawerClose();
                    }}
                    sx={{
                      borderRadius: 2,
                      py: isMobile ? 2 : 1.5,
                      px: 2,
                      minHeight: isMobile ? 60 : 'auto',
                      ...(isActive && {
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                        '&:hover': {
                          background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)',
                        }
                      }),
                      ...(!isActive && {
                        '&:hover': {
                          bgcolor: 'grey.100'
                        }
                      })
                    }}
                  >
                    <ListItemIcon sx={{ 
                      minWidth: isMobile ? 52 : 40,
                      color: isActive ? 'white' : 'text.secondary'
                    }}>
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText 
                      primary={item.text}
                      primaryTypographyProps={{
                        fontWeight: isActive ? 'bold' : 'medium',
                        fontSize: isMobile ? '1.1rem' : '0.95rem'
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              );
            })}
        </List>
      </Box>

      {/* User Profile Section - Desktop only (at bottom) */}
      {!isMobile && (
        <Box sx={{ px: 3, mt: 'auto', pb: 2 }}>
          {renderUserProfile()}
        </Box>
      )}

      {/* Bottom Section */}
      <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
        <List>
          <ListItem disablePadding>
            <ListItemButton
              sx={{
                borderRadius: 2,
                py: isMobile ? 2 : 1.5,
                px: 2,
                minHeight: isMobile ? 60 : 'auto',
                '&:hover': { bgcolor: 'grey.100' }
              }}
            >
              <ListItemIcon sx={{ minWidth: isMobile ? 52 : 40 }}>
                <Help />
              </ListItemIcon>
              <ListItemText 
                primary={isMobile ? "Help & Support" : "Help"}
                primaryTypographyProps={{
                  fontSize: isMobile ? '1.1rem' : '0.95rem'
                }}
              />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton
              onClick={() => {
                handleLogout();
                if (isMobile) handleDrawerClose();
              }}
              sx={{
                borderRadius: 2,
                py: isMobile ? 2 : 1.5,
                px: 2,
                minHeight: isMobile ? 60 : 'auto',
                '&:hover': { bgcolor: 'grey.100' }
              }}
            >
              <ListItemIcon sx={{ minWidth: isMobile ? 52 : 40 }}>
                <Logout />
              </ListItemIcon>
              <ListItemText 
                primary="Log out"
                primaryTypographyProps={{
                  fontSize: isMobile ? '1.1rem' : '0.95rem'
                }}
              />
            </ListItemButton>
          </ListItem>
        </List>
      </Box>
    </Box>
  );

  // Mobile Layout
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
              sx={{ 
                mr: 2,
                p: 1.5,
                '&:hover': { bgcolor: 'grey.100' }
              }}
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

        {/* Mobile Drawer with SwipeableDrawer for better performance */}
        <SwipeableDrawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerClose}
          onOpen={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile
          }}
          sx={{
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: MOBILE_DRAWER_WIDTH,
              bgcolor: 'white',
            },
          }}
        >
          {renderDrawerContent()}
        </SwipeableDrawer>

        {/* Main Content */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            pt: '64px', // AppBar height
            pb: '72px', // BottomNavigation height + padding
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
            if (newValue === '/more') {
              handleDrawerToggle();
            } else {
              navigate(newValue);
            }
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
            height: 64,
            '& .MuiBottomNavigationAction-root': {
              minWidth: 'auto',
              padding: '6px 12px 8px',
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
          aria-label="add transaction"
          sx={{
            position: 'fixed',
            bottom: 80, // Above bottom navigation
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

  // Desktop/Tablet Layout
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'grey.50' }}>
      {/* Desktop Sidebar */}
      <Box
        component="nav"
        sx={{ width: { sm: DRAWER_WIDTH }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: DRAWER_WIDTH,
              bgcolor: 'white',
              borderRight: '1px solid',
              borderColor: 'divider'
            },
          }}
          open
        >
          {renderDrawerContent()}
        </Drawer>
      </Box>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { sm: `calc(100% - ${DRAWER_WIDTH}px)` },
          minHeight: '100vh',
          p: isTablet ? 2 : 3
        }}
      >
        {children}
      </Box>
    </Box>
  );
};
