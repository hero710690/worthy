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
  Stack,
  useTheme,
  useMediaQuery,
  Fade,
} from '@mui/material';
import {
  Email as EmailIcon,
  ArrowBack,
  TrendingUp,
  CheckCircle,
} from '@mui/icons-material';
import { ButtonLoadingSpinner } from '../common/LoadingSpinner';
import api from '../../services/api';

export const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await api.post('/auth/forgot-password', { email });
      setSuccess(true);
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to send reset email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          background: isMobile 
            ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
            : '#f8fafc',
          alignItems: 'center',
          justifyContent: 'center',
          p: 2,
        }}
      >
        <Container maxWidth="sm">
          <Fade in timeout={800}>
            <Paper
              elevation={0}
              sx={{
                p: isMobile ? 3 : 6,
                borderRadius: 3,
                background: isMobile 
                  ? 'rgba(255, 255, 255, 0.95)'
                  : 'white',
                backdropFilter: isMobile ? 'blur(20px)' : 'none',
                border: isMobile 
                  ? '1px solid rgba(255, 255, 255, 0.2)'
                  : '1px solid #e2e8f0',
                boxShadow: isMobile 
                  ? 'none'
                  : '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                textAlign: 'center',
              }}
            >
              <CheckCircle 
                sx={{ 
                  fontSize: 64, 
                  color: '#10b981', 
                  mb: 3 
                }} 
              />
              
              <Typography 
                variant="h4" 
                component="h1" 
                sx={{ 
                  fontWeight: 'bold', 
                  mb: 2, 
                  color: '#1e293b',
                  fontSize: isMobile ? '1.75rem' : '2.125rem'
                }}
              >
                Check Your Email
              </Typography>
              
              <Typography 
                variant="body1" 
                color="text.secondary" 
                sx={{ 
                  mb: 4, 
                  fontSize: isMobile ? '1rem' : '1.1rem',
                  lineHeight: 1.6
                }}
              >
                We've sent a password reset link to <strong>{email}</strong>. 
                Please check your email and follow the instructions to reset your password.
              </Typography>

              <Stack spacing={2} direction={isMobile ? 'column' : 'row'} justifyContent="center">
                <Button
                  variant="outlined"
                  startIcon={<ArrowBack />}
                  onClick={() => navigate('/login')}
                  sx={{
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 600,
                    borderColor: '#667eea',
                    color: '#667eea',
                    '&:hover': {
                      borderColor: '#5a6fd8',
                      backgroundColor: 'rgba(102, 126, 234, 0.04)',
                    },
                  }}
                >
                  Back to Login
                </Button>
                
                <Button
                  variant="contained"
                  onClick={() => setSuccess(false)}
                  sx={{
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 600,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)',
                    },
                  }}
                >
                  Send Another Email
                </Button>
              </Stack>
            </Paper>
          </Fade>
        </Container>
      </Box>
    );
  }

  if (isMobile) {
    // Mobile Layout
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
                  Reset Password
                </Typography>
                <Typography variant="body1" sx={{ opacity: 0.85 }}>
                  Enter your email to get reset link
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
                        <ButtonLoadingSpinner message="Sending..." />
                      ) : (
                        'Send Reset Link'
                      )}
                    </Button>

                    <Button
                      variant="text"
                      startIcon={<ArrowBack />}
                      onClick={() => navigate('/login')}
                      disabled={isLoading}
                      sx={{
                        color: '#667eea',
                        textTransform: 'none',
                        fontWeight: 500,
                      }}
                    >
                      Back to Login
                    </Button>
                  </Stack>
                </Box>
              </CardContent>
            </Paper>
          </Fade>
        </Container>
      </Box>
    );
  }

  // Desktop Layout
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        background: '#f8fafc',
        alignItems: 'center',
        justifyContent: 'center',
        p: 4,
      }}
    >
      <Fade in timeout={800}>
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
            {/* Header */}
            <Box sx={{ mb: 6, textAlign: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 3 }}>
                <TrendingUp sx={{ fontSize: 48, mr: 1.5, color: '#667eea' }} />
                <Typography variant="h3" component="h1" sx={{ fontWeight: 'bold', color: '#1e293b' }}>
                  Worthy
                </Typography>
              </Box>
              
              <Typography variant="h4" component="h2" sx={{ fontWeight: 'bold', mb: 2, color: '#1e293b' }}>
                Reset Your Password
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ fontSize: '1.1rem' }}>
                Enter your email address and we'll send you a link to reset your password.
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

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  disabled={isLoading}
                  sx={{
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
                    <ButtonLoadingSpinner message="Sending Reset Link..." />
                  ) : (
                    'Send Reset Link'
                  )}
                </Button>

                <Button
                  variant="text"
                  startIcon={<ArrowBack />}
                  onClick={() => navigate('/login')}
                  disabled={isLoading}
                  sx={{
                    color: '#667eea',
                    textTransform: 'none',
                    fontWeight: 500,
                    fontSize: '1rem',
                    '&:hover': {
                      backgroundColor: 'rgba(102, 126, 234, 0.04)',
                    },
                  }}
                >
                  Back to Login
                </Button>
              </Stack>
            </Box>
          </Paper>
        </Box>
      </Fade>
    </Box>
  );
};