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
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const drawerWidth = 280;

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
    { text: 'Assets', icon: <TrendingUp />, path: '/assets' },
    { text: 'Transactions', icon: <Receipt />, path: '/transactions' },
    { text: 'Portfolio', icon: <Assessment />, path: '/portfolio' },
    { text: 'Recurring', icon: <Schedule />, path: '/recurring' },
    { text: 'Dividends', icon: <Paid />, path: '/dividends' },
    { text: 'Goals', icon: <GpsFixed />, path: '/goals' },
    { text: 'Analytics', icon: <Analytics />, path: '/analytics' },
    { text: 'Settings', icon: <Settings />, path: '/settings' },
  ];

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Logo/Brand */}
      <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 'bold',
              fontSize: '1.2rem'
            }}
          >
            W
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
            Worthy
          </Typography>
        </Stack>
      </Box>

      {/* Navigation Menu */}
      <Box sx={{ flex: 1, py: 2 }}>
        <List sx={{ px: 2 }}>
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <ListItem key={item.text} disablePadding sx={{ mb: 1 }}>
                <ListItemButton
                  onClick={() => navigate(item.path)}
                  sx={{
                    borderRadius: 2,
                    py: 1.5,
                    px: 2,
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
                    minWidth: 40,
                    color: isActive ? 'white' : 'text.secondary'
                  }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText 
                    primary={item.text}
                    primaryTypographyProps={{
                      fontWeight: isActive ? 'bold' : 'medium',
                      fontSize: '0.95rem'
                    }}
                  />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
        
        {/* User Profile Section - At Bottom */}
        <Box sx={{ px: 3, mt: 'auto', pb: 2 }}>
          <Paper 
            elevation={0}
            sx={{ 
              p: 2.5,
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
            onClick={() => navigate('/profile')}
          >
            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar 
                sx={{ 
                  width: 40, 
                  height: 40,
                  bgcolor: 'primary.main',
                  fontSize: '1.2rem',
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
                    fontSize: '0.95rem',
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
                    fontSize: '0.8rem',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {user?.email || 'user@example.com'}
                </Typography>
              </Box>
              <IconButton size="small" sx={{ color: 'text.secondary' }}>
                <Settings fontSize="small" />
              </IconButton>
            </Stack>
          </Paper>
        </Box>
      </Box>

      {/* Bottom Section */}
      <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'divider' }}>
        <List>
          <ListItem disablePadding>
            <ListItemButton
              sx={{
                borderRadius: 2,
                py: 1.5,
                px: 2,
                '&:hover': { bgcolor: 'grey.100' }
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                <Help />
              </ListItemIcon>
              <ListItemText primary="Help" />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton
              onClick={handleLogout}
              sx={{
                borderRadius: 2,
                py: 1.5,
                px: 2,
                '&:hover': { bgcolor: 'grey.100' }
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                <Logout />
              </ListItemIcon>
              <ListItemText primary="Log out" />
            </ListItemButton>
          </ListItem>
        </List>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'grey.50' }}>
      {/* Mobile Menu Button */}
      <IconButton
        color="inherit"
        aria-label="open drawer"
        edge="start"
        onClick={handleDrawerToggle}
        sx={{ 
          position: 'fixed',
          top: 16,
          left: 16,
          zIndex: 1300,
          display: { sm: 'none' },
          bgcolor: 'white',
          boxShadow: 2,
          '&:hover': { bgcolor: 'grey.100' }
        }}
      >
        <Menu />
      </IconButton>

      {/* Sidebar */}
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
      >
        {/* Mobile drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: drawerWidth,
              bgcolor: 'white',
              borderRight: '1px solid',
              borderColor: 'divider'
            },
          }}
        >
          {drawer}
        </Drawer>
        
        {/* Desktop drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: drawerWidth,
              bgcolor: 'white',
              borderRight: '1px solid',
              borderColor: 'divider'
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          minHeight: '100vh'
        }}
      >
        {children}
      </Box>
    </Box>
  );
};
