import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Stack,
  Button,
  LinearProgress,
  Chip,
  Alert,
} from '@mui/material';
import {
  GpsFixed,
  TrendingUp,
  Coffee,
  BeachAccess,
  Calculate,
  Settings,
} from '@mui/icons-material';

export const Goals: React.FC = () => {
  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', mb: 1 }}>
          FIRE Goals & Planning
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Track your progress toward Financial Independence, Retire Early (FIRE)
        </Typography>
      </Box>

      {/* Coming Soon Alert */}
      <Alert severity="info" sx={{ mb: 4 }}>
        <Typography variant="body2">
          <strong>Coming in Milestone 5:</strong> FIRE Calculator & Financial Planning features will be available soon. 
          This will include Traditional FIRE, Barista FIRE, and Coast FIRE calculations based on your portfolio.
        </Typography>
      </Alert>

      {/* FIRE Types Overview */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'grey.200', height: '100%' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 2,
                    bgcolor: 'primary.main',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white'
                  }}
                >
                  <TrendingUp />
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    Traditional FIRE
                  </Typography>
                  <Chip label="Coming Soon" size="small" color="primary" variant="outlined" />
                </Box>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Complete financial independence where your investments cover all expenses without any work income.
              </Typography>
              <LinearProgress variant="determinate" value={0} sx={{ mb: 1 }} />
              <Typography variant="body2" color="text.secondary">
                Progress: 0% (Calculation coming soon)
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'grey.200', height: '100%' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 2,
                    bgcolor: 'success.main',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white'
                  }}
                >
                  <Coffee />
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    Barista FIRE
                  </Typography>
                  <Chip label="Coming Soon" size="small" color="success" variant="outlined" />
                </Box>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Partial financial independence where investments cover most expenses, supplemented by part-time work.
              </Typography>
              <LinearProgress variant="determinate" value={0} sx={{ mb: 1 }} />
              <Typography variant="body2" color="text.secondary">
                Progress: 0% (Calculation coming soon)
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'grey.200', height: '100%' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: 2,
                    bgcolor: 'info.main',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white'
                  }}
                >
                  <BeachAccess />
                </Box>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    Coast FIRE
                  </Typography>
                  <Chip label="Coming Soon" size="small" color="info" variant="outlined" />
                </Box>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Enough invested now that compound growth will reach FIRE by retirement age without additional contributions.
              </Typography>
              <LinearProgress variant="determinate" value={0} sx={{ mb: 1 }} />
              <Typography variant="body2" color="text.secondary">
                Progress: 0% (Calculation coming soon)
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Goal Setting Section */}
      <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'grey.200', mb: 4 }}>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              FIRE Goal Configuration
            </Typography>
            <Button
              variant="outlined"
              startIcon={<Settings />}
              disabled
              sx={{ textTransform: 'none' }}
            >
              Configure Goals
            </Button>
          </Stack>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="body2" sx={{ fontWeight: 'medium', mb: 1 }}>
                Annual Expenses Target
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Not set - Configure your expected annual expenses in retirement
              </Typography>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Typography variant="body2" sx={{ fontWeight: 'medium', mb: 1 }}>
                Safe Withdrawal Rate
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Not set - Typically 4% (configure based on your risk tolerance)
              </Typography>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Typography variant="body2" sx={{ fontWeight: 'medium', mb: 1 }}>
                Expected Annual Return
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Not set - Configure your expected investment return rate
              </Typography>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Typography variant="body2" sx={{ fontWeight: 'medium', mb: 1 }}>
                Target Retirement Age
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Not set - Set your desired retirement age for calculations
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* FIRE Calculator Preview */}
      <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'grey.200' }}>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              FIRE Calculator
            </Typography>
            <Button
              variant="contained"
              startIcon={<Calculate />}
              disabled
              sx={{ textTransform: 'none' }}
            >
              Calculate FIRE Numbers
            </Button>
          </Stack>
          
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
            The FIRE calculator will be available in Milestone 5. It will calculate your Traditional FIRE, 
            Barista FIRE, and Coast FIRE targets based on your portfolio value and financial goals.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};
