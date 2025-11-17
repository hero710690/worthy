import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, CircularProgress, Box, useMediaQuery } from '@mui/material';
import { ResponsiveLayout } from './components/ResponsiveLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { PerformanceMonitor } from './components/PerformanceMonitor';
import { useAuth } from './hooks/useAuth';

// Lazy load components for better performance
const Login = React.lazy(() => import('./components/auth/Login').then(module => ({ default: module.Login })));
const Register = React.lazy(() => import('./components/auth/Register').then(module => ({ default: module.Register })));
const ForgotPassword = React.lazy(() => import('./components/auth/ForgotPassword').then(module => ({ default: module.ForgotPassword })));
const ResetPassword = React.lazy(() => import('./components/auth/ResetPassword').then(module => ({ default: module.ResetPassword })));
const Dashboard = React.lazy(() => import('./components/Dashboard').then(module => ({ default: module.Dashboard })));
const AssetsList = React.lazy(() => import('./components/assets/AssetsList').then(module => ({ default: module.AssetsList })));
const TransactionHistory = React.lazy(() => import('./components/transactions/TransactionHistory').then(module => ({ default: module.TransactionHistory })));
const Portfolio = React.lazy(() => import('./components/Portfolio').then(module => ({ default: module.Portfolio })));
const Goals = React.lazy(() => import('./components/Goals').then(module => ({ default: module.Goals })));
const Analytics = React.lazy(() => import('./components/Analytics').then(module => ({ default: module.Analytics })));
const UserProfile = React.lazy(() => import('./components/UserProfile').then(module => ({ default: module.UserProfile })));
const RecurringInvestments = React.lazy(() => import('./components/RecurringInvestments').then(module => ({ default: module.RecurringInvestments })));
const Dividends = React.lazy(() => import('./components/Dividends').then(module => ({ default: module.Dividends })));

// Loading component
const LoadingSpinner = () => (
  <Box 
    display="flex" 
    justifyContent="center" 
    alignItems="center" 
    minHeight="200px"
    flexDirection="column"
    gap={2}
  >
    <CircularProgress size={40} />
    <div style={{ fontSize: '14px', color: '#666' }}>Loading...</div>
  </Box>
);

// Create Material-UI theme with mobile optimizations
const theme = createTheme({
  palette: {
    primary: {
      main: '#667eea',
      dark: '#5a6fd8',
    },
    secondary: {
      main: '#764ba2',
      dark: '#6a4190',
    },
    background: {
      default: '#f8fafc',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 700,
    },
    h6: {
      fontWeight: 600,
    },
    // Mobile-optimized typography
    h5: {
      '@media (max-width:600px)': {
        fontSize: '1.25rem',
      },
    },
    body1: {
      '@media (max-width:600px)': {
        fontSize: '0.9rem',
      },
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          // Better touch targets on mobile
          minHeight: 44,
          '@media (max-width:600px)': {
            minHeight: 48,
            fontSize: '0.9rem',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
          // Better mobile spacing
          '@media (max-width:600px)': {
            borderRadius: 8,
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          // Better touch targets
          '@media (max-width:600px)': {
            padding: 12,
          },
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          // Better touch targets for navigation
          '@media (max-width:600px)': {
            minHeight: 56,
          },
        },
      },
    },
    // Improve form inputs on mobile
    MuiTextField: {
      styleOverrides: {
        root: {
          '@media (max-width:600px)': {
            '& .MuiInputBase-root': {
              fontSize: '16px', // Prevents zoom on iOS
            },
          },
        },
      },
    },
  },
});

function App() {
  // Initialize authentication state on app load
  useAuth();

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          
          {/* Protected routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <ResponsiveLayout>
                  <Dashboard />
                </ResponsiveLayout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/assets"
            element={
              <ProtectedRoute>
                <ResponsiveLayout>
                  <AssetsList />
                </ResponsiveLayout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/transactions"
            element={
              <ProtectedRoute>
                <ResponsiveLayout>
                  <TransactionHistory />
                </ResponsiveLayout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/portfolio"
            element={
              <ProtectedRoute>
                <ResponsiveLayout>
                  <Portfolio />
                </ResponsiveLayout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/goals"
            element={
              <ProtectedRoute>
                <ResponsiveLayout>
                  <Goals />
                </ResponsiveLayout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/recurring"
            element={
              <ProtectedRoute>
                <ResponsiveLayout>
                  <RecurringInvestments />
                </ResponsiveLayout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/dividends"
            element={
              <ProtectedRoute>
                <ResponsiveLayout>
                  <Dividends />
                </ResponsiveLayout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/analytics"
            element={
              <ProtectedRoute>
                <ResponsiveLayout>
                  <Analytics />
                </ResponsiveLayout>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <ResponsiveLayout>
                  <UserProfile />
                </ResponsiveLayout>
              </ProtectedRoute>
            }
          />
          
          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          
          {/* Catch all route */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Suspense>
      </Router>
      <PerformanceMonitor />
    </ThemeProvider>
  );
}

export default App;
