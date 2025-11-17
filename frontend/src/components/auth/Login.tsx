import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  Container,
  Paper,
  InputAdornment,
  IconButton,
  Stack,
  useTheme,
  useMediaQuery,
  CircularProgress,
  Fade,
} from '@mui/material';
import {
  Email as EmailIcon,
  Lock as LockIcon,
  Visibility,
  VisibilityOff,
  TrendingUp,
} from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';
import { ButtonLoadingSpinner } from '../common/LoadingSpinner';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login, isLoading, error, clearError } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    try {
      await login({ email, password });
      navigate('/dashboard');
    } catch (error) {
      // Error is handled by the store
    }
  };

  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };

  if (isMobile) {
    // Mobile Layout - Simple centered card
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Container
          maxWidth="sm"
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            py: 2,
            px: 2,
          }}
        >
          <Fade in timeout={800}>
            <Paper
              elevation={0}
              sx={{
                width: '100%',
                borderRadius: 3,
                overflow: 'hidden',
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
              }}
            >
              {/* Mobile Header */}
              <Box
                sx={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  py: 4,
                  px: 3,
                  textAlign: 'center',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
                  <TrendingUp sx={{ fontSize: 36, mr: 1.5 }} />
                  <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', fontSize: '2rem' }}>
                    Worthy
                  </Typography>
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 300, opacity: 0.95, mb: 1 }}>
                  Welcome Back
                </Typography>
                <Typography variant="body1" sx={{ opacity: 0.85 }}>
                  Continue your FIRE journey
                </Typography>
              </Box>

              {/* Mobile Form */}
              <CardContent sx={{ p: 3, pb: 4 }}>
                <Box component="form" onSubmit={handleSubmit}>
                  {error && (
                    <Fade in>
                      <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
                        {error}
                      </Alert>
                    </Fade>
                  )}

                  <Stack spacing={3}>
                    <TextField
                      fullWidth
                      label="Email Address"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={isLoading}
                      autoComplete="email"
                      autoFocus
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <EmailIcon color="action" />
                          </InputAdornment>
                        ),
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                          height: 56,
                        },
                      }}
                    />

                    <TextField
                      fullWidth
                      label="Password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={isLoading}
                      autoComplete="current-password"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <LockIcon color="action" />
                          </InputAdornment>
                        ),
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={handleClickShowPassword}
                              edge="end"
                              disabled={isLoading}
                            >
                              {showPassword ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                          height: 56,
                        },
                      }}
                    />

                    <Box sx={{ textAlign: 'right', mb: 1 }}>
                      <Link 
                        to="/forgot-password" 
                        style={{ 
                          color: '#667eea', 
                          textDecoration: 'none', 
                          fontSize: '0.9rem',
                          fontWeight: 500
                        }}
                      >
                        Forgot Password?
                      </Link>
                    </Box>

                    <Button
                      type="submit"
                      fullWidth
                      variant="contained"
                      size="large"
                      disabled={isLoading}
                      sx={{
                        mt: 2,
                        py: 1.75,
                        borderRadius: 2,
                        fontSize: '1.1rem',
                        fontWeight: 600,
                        textTransform: 'none',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        '&:hover': {
                          background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)',
                        },
                      }}
                    >
                      {isLoading ? (
                        <ButtonLoadingSpinner message="Signing in..." />
                      ) : (
                        'Sign In'
                      )}
                    </Button>
                  </Stack>
                </Box>

                <Box sx={{ textAlign: 'center', mt: 4, pt: 3, borderTop: '1px solid rgba(0, 0, 0, 0.08)' }}>
                  <Typography variant="body2" color="text.secondary">
                    Don't have an account?{' '}
                    <Link to="/register" style={{ color: '#667eea', textDecoration: 'none', fontWeight: 600 }}>
                      Create one here
                    </Link>
                  </Typography>
                </Box>
              </CardContent>
            </Paper>
          </Fade>
        </Container>
      </Box>
    );
  }

  // Desktop Layout - Split screen design
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        background: '#f8fafc',
      }}
    >
      {/* Left Side - Branding & Info */}
      <Box
        sx={{
          flex: 1,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
          minHeight: '100vh',
        }}
      >
        {/* Background decorative elements */}
        <Box
          sx={{
            position: 'absolute',
            top: -200,
            left: -200,
            width: 500,
            height: 500,
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            bottom: -300,
            right: -300,
            width: 600,
            height: 600,
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(10px)',
          }}
        />

        {/* Content */}
        <Box sx={{ textAlign: 'center', zIndex: 1, px: 4, maxWidth: 500 }}>
          <Fade in timeout={1000}>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 4 }}>
                <TrendingUp sx={{ fontSize: 64, mr: 2 }} />
                <Typography variant="h2" component="h1" sx={{ fontWeight: 'bold', fontSize: '3.5rem' }}>
                  Worthy
                </Typography>
              </Box>
              
              <Typography variant="h4" sx={{ fontWeight: 300, mb: 3, opacity: 0.95 }}>
                Your FIRE Journey Starts Here
              </Typography>
              
              <Typography variant="h6" sx={{ opacity: 0.85, mb: 4, lineHeight: 1.6 }}>
                Track your progress towards Financial Independence and Retire Early with powerful 
                tools and insights designed for your success.
              </Typography>

              {/* Feature highlights */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 6 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.8)' }} />
                  <Typography variant="body1" sx={{ opacity: 0.9 }}>
                    Advanced Portfolio Tracking
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.8)' }} />
                  <Typography variant="body1" sx={{ opacity: 0.9 }}>
                    FIRE Calculator & Projections
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.8)' }} />
                  <Typography variant="body1" sx={{ opacity: 0.9 }}>
                    Goal Setting & Progress Tracking
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Fade>
        </Box>
      </Box>

      {/* Right Side - Login Form */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 4,
          minHeight: '100vh',
        }}
      >
        <Fade in timeout={1200}>
          <Box sx={{ width: '100%', maxWidth: 480 }}>
            <Paper
              elevation={0}
              sx={{
                p: 6,
                borderRadius: 3,
                background: 'white',
                border: '1px solid #e2e8f0',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              }}
            >
              {/* Form Header */}
              <Box sx={{ mb: 6 }}>
                <Typography variant="h4" component="h2" sx={{ fontWeight: 'bold', mb: 2, color: '#1e293b' }}>
                  Welcome Back
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ fontSize: '1.1rem' }}>
                  Sign in to your account to continue your journey
                </Typography>
              </Box>

              {/* Form */}
              <Box component="form" onSubmit={handleSubmit}>
                {error && (
                  <Fade in>
                    <Alert
                      severity="error"
                      sx={{
                        mb: 4,
                        borderRadius: 2,
                        border: '1px solid #fecaca',
                        background: '#fef2f2',
                      }}
                    >
                      {error}
                    </Alert>
                  </Fade>
                )}

                <Stack spacing={4}>
                  <TextField
                    fullWidth
                    label="Email Address"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                    autoComplete="email"
                    autoFocus
                    variant="outlined"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <EmailIcon color="action" />
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        fontSize: '1.1rem',
                        height: 64,
                        background: '#f8fafc',
                        '& fieldset': {
                          borderColor: '#e2e8f0',
                        },
                        '&:hover fieldset': {
                          borderColor: '#667eea',
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: '#667eea',
                          borderWidth: 2,
                        },
                      },
                      '& .MuiInputLabel-root': {
                        fontSize: '1.1rem',
                      },
                    }}
                  />

                  <TextField
                    fullWidth
                    label="Password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    autoComplete="current-password"
                    variant="outlined"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <LockIcon color="action" />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            aria-label="toggle password visibility"
                            onClick={handleClickShowPassword}
                            edge="end"
                            disabled={isLoading}
                          >
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        fontSize: '1.1rem',
                        height: 64,
                        background: '#f8fafc',
                        '& fieldset': {
                          borderColor: '#e2e8f0',
                        },
                        '&:hover fieldset': {
                          borderColor: '#667eea',
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: '#667eea',
                          borderWidth: 2,
                        },
                      },
                      '& .MuiInputLabel-root': {
                        fontSize: '1.1rem',
                      },
                    }}
                  />

                  <Box sx={{ textAlign: 'right', mb: 2 }}>
                    <Link 
                      to="/forgot-password" 
                      style={{ 
                        color: '#667eea', 
                        textDecoration: 'none', 
                        fontSize: '1rem',
                        fontWeight: 500
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.textDecoration = 'underline';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.textDecoration = 'none';
                      }}
                    >
                      Forgot Password?
                    </Link>
                  </Box>

                  <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    size="large"
                    disabled={isLoading}
                    sx={{
                      mt: 1,
                      py: 2.5,
                      borderRadius: 2,
                      fontSize: '1.2rem',
                      fontWeight: 600,
                      textTransform: 'none',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      boxShadow: '0 10px 25px rgba(102, 126, 234, 0.3)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)',
                        boxShadow: '0 15px 35px rgba(102, 126, 234, 0.4)',
                        transform: 'translateY(-2px)',
                      },
                      '&:disabled': {
                        background: 'rgba(0, 0, 0, 0.12)',
                        boxShadow: 'none',
                        transform: 'none',
                      },
                      transition: 'all 0.3s ease',
                    }}
                  >
                    {isLoading ? (
                      <ButtonLoadingSpinner message="Signing in..." />
                    ) : (
                      'Sign In'
                    )}
                  </Button>
                </Stack>
              </Box>

              {/* Footer */}
              <Box sx={{ textAlign: 'center', mt: 6, pt: 4, borderTop: '1px solid #e2e8f0' }}>
                <Typography variant="body1" color="text.secondary" sx={{ fontSize: '1rem' }}>
                  Don't have an account?{' '}
                  <Link
                    to="/register"
                    style={{
                      color: '#667eea',
                      textDecoration: 'none',
                      fontWeight: 600,
                      fontSize: 'inherit',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.textDecoration = 'underline';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.textDecoration = 'none';
                    }}
                  >
                    Create one here
                  </Link>
                </Typography>
              </Box>
            </Paper>
          </Box>
        </Fade>
      </Box>
    </Box>
  );
};
