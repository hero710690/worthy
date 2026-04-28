import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Stack,
  LinearProgress,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  InputAdornment,
  useTheme,
  Skeleton,
  Alert,
  Divider,
  Paper,
} from '@mui/material';
import {
  GpsFixed,
  Edit,
  CheckCircle,
  RadioButtonUnchecked,
  TrendingUp,
  AccountBalance,
  Work,
  BeachAccess,
  Timeline,
  Close,
  Save,
} from '@mui/icons-material';
import { useAuthStore } from '../store/authStore';
import { fireAPI } from '../services/fireApi';
import type { FIREProfile } from '../types/fire';

interface MobileGoalsProps {
  totalAssets: number;
  loading: boolean;
  error: string | null;
}

export const MobileGoals: React.FC<MobileGoalsProps> = ({
  totalAssets,
  loading,
  error
}) => {
  const { user } = useAuthStore();
  const theme = useTheme();
  const [fireProfile, setFireProfile] = useState<FIREProfile | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    annual_expenses: 0,
    safe_withdrawal_rate: 3.6,
    expected_annual_return: 7.0,
    target_retirement_age: 65,
    barista_annual_income: 0,
  });

  useEffect(() => {
    fetchFireProfile();
  }, []);

  const fetchFireProfile = async () => {
    try {
      const profile = await fireAPI.getProfile();
      setFireProfile(profile);
      if (profile) {
        setEditForm({
          annual_expenses: profile.annual_expenses,
          safe_withdrawal_rate: profile.safe_withdrawal_rate,
          expected_annual_return: profile.expected_annual_return,
          target_retirement_age: profile.target_retirement_age,
          barista_annual_income: profile.barista_annual_income,
        });
      }
    } catch (error) {
      console.error('Error fetching FIRE profile:', error);
    }
  };

  const handleSaveProfile = async () => {
    try {
      const savedProfile = await fireAPI.updateProfile(editForm);
      setFireProfile(savedProfile);
      setEditDialogOpen(false);
    } catch (error) {
      console.error('Error saving FIRE profile:', error);
    }
  };

  const formatCurrency = (amount: number, currency: string = user?.base_currency || 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const calculateFIRETargets = () => {
    if (!fireProfile) return null;

    const currentAge = new Date().getFullYear() - (user?.birth_year || 1990);
    const yearsToRetirement = fireProfile.target_retirement_age - currentAge;
    
    const traditionalFIRE = fireProfile.annual_expenses / (fireProfile.safe_withdrawal_rate / 100);
    const baristaFIRE = (fireProfile.annual_expenses - fireProfile.barista_annual_income) / (fireProfile.safe_withdrawal_rate / 100);
    const coastFIRE = traditionalFIRE / Math.pow(1 + fireProfile.expected_annual_return / 100, yearsToRetirement);

    return {
      traditional: {
        target: traditionalFIRE,
        progress: (totalAssets / traditionalFIRE) * 100,
        achieved: totalAssets >= traditionalFIRE,
      },
      barista: {
        target: baristaFIRE,
        progress: (totalAssets / baristaFIRE) * 100,
        achieved: totalAssets >= baristaFIRE,
      },
      coast: {
        target: coastFIRE,
        progress: (totalAssets / coastFIRE) * 100,
        achieved: totalAssets >= coastFIRE,
      },
    };
  };

  if (loading) {
    return (
      <Box sx={{ p: 2 }}>
        <Skeleton variant="text" width="60%" height={32} sx={{ mb: 2 }} />
        {[1, 2, 3].map((i) => (
          <Card key={i} sx={{ mb: 2 }}>
            <CardContent>
              <Skeleton variant="text" width="40%" height={24} sx={{ mb: 1 }} />
              <Skeleton variant="text" width="80%" height={20} sx={{ mb: 2 }} />
              <Skeleton variant="rectangular" width="100%" height={8} sx={{ mb: 1 }} />
              <Skeleton variant="text" width="60%" height={16} />
            </CardContent>
          </Card>
        ))}
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      </Box>
    );
  }

  const fireTargets = calculateFIRETargets();

  return (
    <Box>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
          FIRE Goals
        </Typography>
        <IconButton 
          onClick={() => setEditDialogOpen(true)}
          sx={{ bgcolor: 'primary.main', color: 'white', '&:hover': { bgcolor: 'primary.dark' } }}
        >
          <Edit />
        </IconButton>
      </Stack>

      {!fireProfile ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <GpsFixed sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" sx={{ mb: 1 }}>
              Set Your FIRE Goals
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Configure your financial independence targets to track your progress
            </Typography>
            <Button
              variant="contained"
              startIcon={<Edit />}
              onClick={() => setEditDialogOpen(true)}
            >
              Get Started
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Stack spacing={3}>
          {/* Current Assets */}
          <Card>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                <AccountBalance color="primary" />
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  Current Assets
                </Typography>
              </Stack>
              <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                {formatCurrency(totalAssets)}
              </Typography>
            </CardContent>
          </Card>

          {/* FIRE Progress Cards */}
          {fireTargets && (
            <>
              {/* Coast FIRE */}
              <Card sx={{ 
                border: fireTargets.coast.achieved ? '2px solid' : '1px solid',
                borderColor: fireTargets.coast.achieved ? 'success.main' : 'divider'
              }}>
                <CardContent>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <BeachAccess color={fireTargets.coast.achieved ? 'success' : 'primary'} />
                      <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                        Coast FIRE
                      </Typography>
                    </Stack>
                    {fireTargets.coast.achieved ? (
                      <CheckCircle color="success" />
                    ) : (
                      <RadioButtonUnchecked color="disabled" />
                    )}
                  </Stack>

                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Stop contributing and let compound growth reach traditional FIRE by retirement
                  </Typography>

                  <Box sx={{ mb: 2 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        Progress
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                        {Math.min(fireTargets.coast.progress, 100).toFixed(1)}%
                      </Typography>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(fireTargets.coast.progress, 100)}
                      sx={{
                        height: 8,
                        borderRadius: 4,
                        bgcolor: 'grey.200',
                        '& .MuiLinearProgress-bar': {
                          bgcolor: fireTargets.coast.achieved ? 'success.main' : 'primary.main',
                          borderRadius: 4,
                        }
                      }}
                    />
                  </Box>

                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2" color="text.secondary">
                      Target: {formatCurrency(fireTargets.coast.target)}
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                      {formatCurrency(Math.max(0, fireTargets.coast.target - totalAssets))} to go
                    </Typography>
                  </Stack>
                </CardContent>
              </Card>

              {/* Barista FIRE */}
              <Card sx={{ 
                border: fireTargets.barista.achieved ? '2px solid' : '1px solid',
                borderColor: fireTargets.barista.achieved ? 'success.main' : 'divider'
              }}>
                <CardContent>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Work color={fireTargets.barista.achieved ? 'success' : 'primary'} />
                      <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                        Barista FIRE
                      </Typography>
                    </Stack>
                    {fireTargets.barista.achieved ? (
                      <CheckCircle color="success" />
                    ) : (
                      <RadioButtonUnchecked color="disabled" />
                    )}
                  </Stack>

                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Work part-time ({formatCurrency(fireProfile.barista_annual_income)}/year) to cover some expenses
                  </Typography>

                  <Box sx={{ mb: 2 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        Progress
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                        {Math.min(fireTargets.barista.progress, 100).toFixed(1)}%
                      </Typography>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(fireTargets.barista.progress, 100)}
                      sx={{
                        height: 8,
                        borderRadius: 4,
                        bgcolor: 'grey.200',
                        '& .MuiLinearProgress-bar': {
                          bgcolor: fireTargets.barista.achieved ? 'success.main' : 'warning.main',
                          borderRadius: 4,
                        }
                      }}
                    />
                  </Box>

                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2" color="text.secondary">
                      Target: {formatCurrency(fireTargets.barista.target)}
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                      {formatCurrency(Math.max(0, fireTargets.barista.target - totalAssets))} to go
                    </Typography>
                  </Stack>
                </CardContent>
              </Card>

              {/* Traditional FIRE */}
              <Card sx={{ 
                border: fireTargets.traditional.achieved ? '2px solid' : '1px solid',
                borderColor: fireTargets.traditional.achieved ? 'success.main' : 'divider'
              }}>
                <CardContent>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <TrendingUp color={fireTargets.traditional.achieved ? 'success' : 'primary'} />
                      <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                        Traditional FIRE
                      </Typography>
                    </Stack>
                    {fireTargets.traditional.achieved ? (
                      <CheckCircle color="success" />
                    ) : (
                      <RadioButtonUnchecked color="disabled" />
                    )}
                  </Stack>

                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Complete financial independence - cover all expenses ({formatCurrency(fireProfile.annual_expenses)}/year)
                  </Typography>

                  <Box sx={{ mb: 2 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        Progress
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                        {Math.min(fireTargets.traditional.progress, 100).toFixed(1)}%
                      </Typography>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(fireTargets.traditional.progress, 100)}
                      sx={{
                        height: 8,
                        borderRadius: 4,
                        bgcolor: 'grey.200',
                        '& .MuiLinearProgress-bar': {
                          bgcolor: fireTargets.traditional.achieved ? 'success.main' : 'error.main',
                          borderRadius: 4,
                        }
                      }}
                    />
                  </Box>

                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2" color="text.secondary">
                      Target: {formatCurrency(fireTargets.traditional.target)}
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                      {formatCurrency(Math.max(0, fireTargets.traditional.target - totalAssets))} to go
                    </Typography>
                  </Stack>
                </CardContent>
              </Card>

              {/* Summary Stats */}
              <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2 }}>
                  Your FIRE Journey
                </Typography>
                <Stack spacing={1}>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">
                      Goals Achieved
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                      {[fireTargets.coast.achieved, fireTargets.barista.achieved, fireTargets.traditional.achieved].filter(Boolean).length} of 3
                    </Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">
                      Next Milestone
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                      {!fireTargets.coast.achieved ? 'Coast FIRE' :
                       !fireTargets.barista.achieved ? 'Barista FIRE' :
                       !fireTargets.traditional.achieved ? 'Traditional FIRE' : 'All Complete! 🎉'}
                    </Typography>
                  </Stack>
                </Stack>
              </Paper>
            </>
          )}
        </Stack>
      )}

      {/* Edit Profile Dialog */}
      <Dialog 
        open={editDialogOpen} 
        onClose={() => setEditDialogOpen(false)}
        fullScreen
        sx={{
          '& .MuiDialog-paper': {
            bgcolor: 'grey.50'
          }
        }}
      >
        <DialogTitle>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              FIRE Profile Settings
            </Typography>
            <IconButton onClick={() => setEditDialogOpen(false)}>
              <Close />
            </IconButton>
          </Stack>
        </DialogTitle>
        
        <DialogContent sx={{ px: 2 }}>
          <Stack spacing={3} sx={{ mt: 1 }}>
            <TextField
              label="Annual Expenses"
              type="number"
              fullWidth
              value={editForm.annual_expenses}
              onChange={(e) => setEditForm({ ...editForm, annual_expenses: Number(e.target.value) })}
              InputProps={{
                startAdornment: <InputAdornment position="start">$</InputAdornment>,
              }}
              helperText="Your expected annual expenses in retirement"
            />

            <TextField
              label="Safe Withdrawal Rate"
              type="number"
              fullWidth
              value={editForm.safe_withdrawal_rate}
              onChange={(e) => setEditForm({ ...editForm, safe_withdrawal_rate: Number(e.target.value) })}
              InputProps={{
                endAdornment: <InputAdornment position="end">%</InputAdornment>,
              }}
              helperText="Percentage of portfolio to withdraw annually (typically 3-4%)"
            />

            <TextField
              label="Expected Annual Return"
              type="number"
              fullWidth
              value={editForm.expected_annual_return}
              onChange={(e) => setEditForm({ ...editForm, expected_annual_return: Number(e.target.value) })}
              InputProps={{
                endAdornment: <InputAdornment position="end">%</InputAdornment>,
              }}
              helperText="Expected annual investment return (typically 6-8%)"
            />

            <TextField
              label="Target Retirement Age"
              type="number"
              fullWidth
              value={editForm.target_retirement_age}
              onChange={(e) => setEditForm({ ...editForm, target_retirement_age: Number(e.target.value) })}
              helperText="Age when you want to achieve traditional FIRE"
            />

            <TextField
              label="Barista Annual Income"
              type="number"
              fullWidth
              value={editForm.barista_annual_income}
              onChange={(e) => setEditForm({ ...editForm, barista_annual_income: Number(e.target.value) })}
              InputProps={{
                startAdornment: <InputAdornment position="start">$</InputAdornment>,
              }}
              helperText="Expected annual income from part-time work"
            />
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button 
            onClick={() => setEditDialogOpen(false)}
            sx={{ mr: 1 }}
          >
            Cancel
          </Button>
          <Button 
            variant="contained" 
            onClick={handleSaveProfile}
            startIcon={<Save />}
            fullWidth
          >
            Save Profile
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
