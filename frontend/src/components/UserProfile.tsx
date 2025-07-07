import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  Avatar,
  Stack,
  TextField,
  MenuItem,
  Paper,
  Divider,
  Alert,
  IconButton,
  Chip,
} from '@mui/material';
import {
  Edit,
  Save,
  Cancel,
  Person,
  Email,
  CalendarToday,
  Language,
  AccountBalance,
  Camera,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

const currencies = [
  { value: 'USD', label: 'US Dollar (USD)' },
  { value: 'TWD', label: 'Taiwan Dollar (TWD)' },
  { value: 'EUR', label: 'Euro (EUR)' },
  { value: 'GBP', label: 'British Pound (GBP)' },
  { value: 'JPY', label: 'Japanese Yen (JPY)' },
  { value: 'KRW', label: 'Korean Won (KRW)' },
  { value: 'SGD', label: 'Singapore Dollar (SGD)' },
  { value: 'HKD', label: 'Hong Kong Dollar (HKD)' },
];

export const UserProfile: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    base_currency: user?.base_currency || 'USD',
    birth_year: user?.birth_year || new Date().getFullYear() - 30,
  });

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // TODO: Implement API call to update user profile
      // await userAPI.updateProfile(formData);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSuccess(true);
      setIsEditing(false);
      
      setTimeout(() => setSuccess(false), 3000);
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: user?.name || '',
      email: user?.email || '',
      base_currency: user?.base_currency || 'USD',
      birth_year: user?.birth_year || new Date().getFullYear() - 30,
    });
    setIsEditing(false);
    setError(null);
  };

  const profileDetails = [
    {
      label: 'Full Name',
      value: user?.name || 'Not set',
      icon: <Person color="primary" />,
      field: 'name'
    },
    {
      label: 'Email Address',
      value: user?.email || 'Not set',
      icon: <Email color="primary" />,
      field: 'email'
    },
    {
      label: 'Base Currency',
      value: currencies.find(c => c.value === user?.base_currency)?.label || 'USD',
      icon: <Language color="primary" />,
      field: 'base_currency'
    },
    {
      label: 'Birth Year',
      value: user?.birth_year?.toString() || 'Not set',
      icon: <CalendarToday color="primary" />,
      field: 'birth_year'
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
              Profile Settings
            </Typography>
            <Typography 
              variant="body1" 
              color="text.secondary"
              sx={{ fontSize: { xs: '0.95rem', md: '1rem' } }}
            >
              Manage your personal information and preferences
            </Typography>
          </Box>
          
          <Stack direction="row" spacing={2} alignItems="center">
            {!isEditing ? (
              <Button
                variant="contained"
                startIcon={<Edit />}
                onClick={() => setIsEditing(true)}
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
                Edit Profile
              </Button>
            ) : (
              <Stack direction="row" spacing={1}>
                <Button
                  variant="outlined"
                  startIcon={<Cancel />}
                  onClick={handleCancel}
                  disabled={loading}
                  sx={{
                    borderRadius: 2,
                    px: 2,
                    py: 1.5,
                    textTransform: 'none',
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  startIcon={<Save />}
                  onClick={handleSave}
                  disabled={loading}
                  sx={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    borderRadius: 2,
                    px: 2,
                    py: 1.5,
                    textTransform: 'none',
                    fontWeight: 'bold',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)',
                    }
                  }}
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </Button>
              </Stack>
            )}
          </Stack>
        </Stack>
      </Box>

      {/* Content */}
      <Box sx={{ p: { xs: 3, md: 4 } }}>
        {success && (
          <Alert severity="success" sx={{ mb: 3 }}>
            Profile updated successfully!
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={4}>
          {/* Profile Overview */}
          <Grid item xs={12} md={4}>
            <Card 
              elevation={0}
              sx={{ 
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'grey.200',
                height: 'fit-content'
              }}
            >
              <CardContent sx={{ p: 4, textAlign: 'center' }}>
                <Box sx={{ position: 'relative', display: 'inline-block', mb: 3 }}>
                  <Avatar 
                    sx={{ 
                      width: 80, 
                      height: 80,
                      bgcolor: 'primary.main',
                      fontSize: '2rem',
                      fontWeight: 'bold',
                      mx: 'auto'
                    }}
                  >
                    {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </Avatar>
                  <IconButton
                    sx={{
                      position: 'absolute',
                      bottom: -5,
                      right: -5,
                      bgcolor: 'white',
                      border: '2px solid',
                      borderColor: 'grey.200',
                      width: 32,
                      height: 32,
                      '&:hover': {
                        bgcolor: 'grey.50'
                      }
                    }}
                  >
                    <Camera fontSize="small" />
                  </IconButton>
                </Box>
                
                <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
                  {user?.name || 'User Name'}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {user?.email || 'user@example.com'}
                </Typography>
                
                <Chip 
                  label={`Member since ${user?.created_at ? new Date(user.created_at).getFullYear() : '2025'}`}
                  color="primary"
                  variant="outlined"
                  size="small"
                />
              </CardContent>
            </Card>
          </Grid>

          {/* Profile Details */}
          <Grid item xs={12} md={8}>
            <Card 
              elevation={0}
              sx={{ 
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'grey.200'
              }}
            >
              <CardContent sx={{ p: 4 }}>
                <Typography 
                  variant="h6" 
                  sx={{ 
                    fontWeight: 'bold',
                    mb: 3,
                    fontSize: { xs: '1.25rem', md: '1.5rem' }
                  }}
                >
                  Personal Information
                </Typography>

                <Grid container spacing={3}>
                  {isEditing ? (
                    <>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Full Name"
                          value={formData.name}
                          onChange={(e) => handleInputChange('name', e.target.value)}
                          variant="outlined"
                          InputProps={{
                            startAdornment: <Person sx={{ mr: 1, color: 'text.secondary' }} />
                          }}
                        />
                      </Grid>
                      
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Email Address"
                          value={formData.email}
                          onChange={(e) => handleInputChange('email', e.target.value)}
                          variant="outlined"
                          type="email"
                          InputProps={{
                            startAdornment: <Email sx={{ mr: 1, color: 'text.secondary' }} />
                          }}
                        />
                      </Grid>
                      
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          select
                          label="Base Currency"
                          value={formData.base_currency}
                          onChange={(e) => handleInputChange('base_currency', e.target.value)}
                          variant="outlined"
                          InputProps={{
                            startAdornment: <Language sx={{ mr: 1, color: 'text.secondary' }} />
                          }}
                        >
                          {currencies.map((currency) => (
                            <MenuItem key={currency.value} value={currency.value}>
                              {currency.label}
                            </MenuItem>
                          ))}
                        </TextField>
                      </Grid>
                      
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Birth Year"
                          value={formData.birth_year}
                          onChange={(e) => handleInputChange('birth_year', parseInt(e.target.value))}
                          variant="outlined"
                          type="number"
                          inputProps={{
                            min: 1900,
                            max: new Date().getFullYear()
                          }}
                          InputProps={{
                            startAdornment: <CalendarToday sx={{ mr: 1, color: 'text.secondary' }} />
                          }}
                        />
                      </Grid>
                    </>
                  ) : (
                    profileDetails.map((detail, index) => (
                      <Grid item xs={12} sm={6} key={index}>
                        <Paper 
                          elevation={0}
                          sx={{ 
                            p: 3,
                            borderRadius: 2,
                            bgcolor: 'grey.50',
                            border: '1px solid',
                            borderColor: 'grey.200',
                            height: '100%'
                          }}
                        >
                          <Stack direction="row" spacing={2} alignItems="center">
                            <Box sx={{ fontSize: 24 }}>
                              {detail.icon}
                            </Box>
                            <Box sx={{ flex: 1 }}>
                              <Typography 
                                variant="body2" 
                                color="text.secondary" 
                                sx={{ fontSize: '0.875rem', mb: 0.5 }}
                              >
                                {detail.label}
                              </Typography>
                              <Typography 
                                variant="body1" 
                                sx={{ fontWeight: 'medium', fontSize: '1rem' }}
                              >
                                {detail.value}
                              </Typography>
                            </Box>
                          </Stack>
                        </Paper>
                      </Grid>
                    ))
                  )}
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};
