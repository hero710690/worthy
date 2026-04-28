/**
 * Settings Tab - FIRE Profile Management
 * 
 * This tab allows users to manage their FIRE profile settings.
 */

import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Stack,
  Alert,
  Paper
} from '@mui/material';
import {
  Settings,
  Edit
} from '@mui/icons-material';

interface SettingsTabProps {
  fireProfile: any;
  onOpenDialog: () => void;
  formatCurrency: (amount: number) => string;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  fireProfile,
  onOpenDialog,
  formatCurrency
}) => {
  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Settings color="primary" />
        FIRE Settings
      </Typography>

      {fireProfile ? (
        <Card elevation={2}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 'bold' }}>
              Current FIRE Profile
            </Typography>
            
            <Stack spacing={2}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">Target FIRE Number:</Typography>
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                  {formatCurrency(fireProfile.annual_expenses)}
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">Target Retirement Age:</Typography>
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                  {fireProfile.target_retirement_age} years old
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">Expected Return:</Typography>
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                  {(fireProfile.expected_return_pre_retirement * 100).toFixed(1)}% annually
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">Safe Withdrawal Rate:</Typography>
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                  {(fireProfile.safe_withdrawal_rate * 100).toFixed(1)}%
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2">☕ Barista FIRE Monthly Contribution:</Typography>
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                  {formatCurrency(fireProfile.barista_monthly_contribution || 0)}/month
                </Typography>
              </Box>
            </Stack>
            
            <Button
              variant="contained"
              startIcon={<Edit />}
              onClick={onOpenDialog}
              sx={{ mt: 3 }}
            >
              Update FIRE Goals
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Alert severity="info">
          <Typography variant="h6">No FIRE Profile Set</Typography>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Create your FIRE profile to start tracking your progress.
          </Typography>
          <Button variant="contained" onClick={onOpenDialog}>
            Set FIRE Goals
          </Button>
        </Alert>
      )}

      <Paper sx={{ mt: 4, p: 3, bgcolor: 'grey.50' }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          💡 About FIRE Calculations
        </Typography>
        <Typography variant="body2" sx={{ mb: 2 }}>
          This app uses the proven algorithms from the coast-fire-calculator to provide accurate FIRE calculations:
        </Typography>
        <Stack spacing={1}>
          <Typography variant="body2">
            • <strong>Traditional FIRE:</strong> Full financial independence with 3.6% withdrawal rule
          </Typography>
          <Typography variant="body2">
            • <strong>Coast FIRE:</strong> Save enough now to coast to FIRE without additional contributions
          </Typography>
          <Typography variant="body2">
            • <strong>Barista FIRE:</strong> Partial FIRE with part-time income to bridge the gap
          </Typography>
        </Stack>
        
        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="body2">
            <strong>💡 Pro Tip:</strong> Your Expected Return setting is automatically used in all FIRE calculations. 
            You can experiment with different values in the What-If Simulator tab to see how they affect your projections.
          </Typography>
        </Alert>
      </Paper>
    </Box>
  );
};
