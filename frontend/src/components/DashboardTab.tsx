/**
 * Dashboard Tab - Shows FIRE Calculation Results
 * 
 * This tab displays the three FIRE types (Traditional, Coast, Barista) 
 * using the actual coast-fire-calculator logic and results.
 */

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
  Alert,
  Paper,
  Switch,
  FormControlLabel,
  Tooltip
} from '@mui/material';
import {
  GpsFixed,
  Coffee,
  BeachAccess,
  CheckCircle,
  Settings
} from '@mui/icons-material';

interface DashboardTabProps {
  fireResults: any;
  fireProfile: any;
  portfolioValuation: any;
  formatCurrency: (amount: number) => string;
  onOpenSettings: () => void;
  includeCashInFIRE: boolean;
  onToggleIncludeCash: (include: boolean) => void;
  getPortfolioValueForFIRE: () => number;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  fireResults,
  fireProfile,
  portfolioValuation,
  formatCurrency,
  onOpenSettings,
  includeCashInFIRE,
  onToggleIncludeCash,
  getPortfolioValueForFIRE
}) => {
  // 🔍 DEBUG: Log portfolio valuation
  console.log('📊 DashboardTab received portfolioValuation:', portfolioValuation);
  console.log('📊 DashboardTab portfolioValuation.totalValueInBaseCurrency:', portfolioValuation?.totalValueInBaseCurrency);

  if (!fireProfile) {
    return (
      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="h6">Set Your FIRE Goals</Typography>
        <Typography variant="body2" sx={{ mb: 2 }}>
          Configure your FIRE goals to see personalized calculations and progress tracking.
        </Typography>
        <Button variant="contained" onClick={onOpenSettings}>
          Set FIRE Goals
        </Button>
      </Alert>
    );
  }

  if (!fireResults) {
    return (
      <Alert severity="warning" sx={{ mb: 3 }}>
        <Typography variant="body2">
          Loading FIRE calculations...
        </Typography>
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 3, textAlign: 'center' }}>
        🔥 Your FIRE Progress
      </Typography>
      
      {/* Portfolio Calculation Toggle - Prominent Position */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        mb: 3,
        p: 2,
        bgcolor: 'background.paper',
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider'
      }}>
        <Stack alignItems="center" spacing={1}>
          <Tooltip title={includeCashInFIRE ? "Cash and CD assets are included in FIRE calculations" : "Cash and CD assets are excluded from FIRE calculations"}>
            <FormControlLabel
              control={
                <Switch
                  checked={includeCashInFIRE}
                  onChange={(e) => onToggleIncludeCash(e.target.checked)}
                  size="medium"
                  color="primary"
                />
              }
              label={
                <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                  Include Cash & CD in FIRE Calculations
                </Typography>
              }
              sx={{ margin: 0 }}
            />
          </Tooltip>
          
          {portfolioValuation && (
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                Portfolio for FIRE: {formatCurrency(getPortfolioValueForFIRE())}
              </Typography>
              {!includeCashInFIRE && (
                <Typography variant="caption" sx={{ 
                  color: 'text.secondary',
                  display: 'block'
                }}>
                  Total Portfolio: {formatCurrency(portfolioValuation.totalValueInBaseCurrency)} 
                  (Excluded: {formatCurrency(portfolioValuation.totalValueInBaseCurrency - getPortfolioValueForFIRE())})
                </Typography>
              )}
            </Box>
          )}
        </Stack>
      </Box>
      
      {/* FIRE Cards Container - Equal width cards */}
      <Box sx={{ 
        width: '100%',
        mx: 0,
        px: 0
      }}>
        <Grid container spacing={3} sx={{ 
          width: '100%',
          margin: 0,
          // Ensure equal width distribution on wider screens
          '@media (min-width: 900px)': {
            display: 'flex',
            '& > .MuiGrid-item': {
              flex: '1 1 0px', // Equal flex basis for true equal width
              maxWidth: 'none' // Override MUI's default maxWidth
            }
          }
        }}>
          {/* Traditional FIRE */}
          <Grid item xs={12} md={4} sx={{ 
            display: 'flex',
            width: '100%'
          }}>
            <Card elevation={2} sx={{ 
              border: '2px solid', 
              borderColor: fireResults?.traditional.achieved ? 'success.main' : 'primary.main',
              height: '100%',
              width: '100%',
              flex: 1,
              display: 'flex',
              flexDirection: 'column'
            }}>
            <CardContent sx={{ 
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              height: '100%'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <GpsFixed sx={{ color: 'primary.main', mr: 1 }} />
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  Traditional FIRE
                </Typography>
                {fireResults?.traditional.achieved && <CheckCircle sx={{ color: 'success.main', ml: 1 }} />}
              </Box>
              
              <Typography variant="h4" sx={{ 
                fontWeight: 'bold', 
                color: fireResults?.traditional.achieved ? 'success.main' : 'primary.main',
                mb: 2 
              }}>
                {formatCurrency(fireResults?.traditional.target || 0)}
              </Typography>
              
              <LinearProgress 
                variant="determinate" 
                value={fireResults?.traditional.progress || 0} 
                sx={{ mb: 2, height: 8, borderRadius: 4 }}
              />
              
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Progress: {(fireResults?.traditional.progress || 0).toFixed(1)}%
              </Typography>
              
              <Stack spacing={1} sx={{ flexGrow: 1 }}>
                {fireResults?.traditional.achieved ? (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption">Status:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                      🎉 Achieved!
                    </Typography>
                  </Box>
                ) : (
                  <>
                    {/* Achievement Moment */}
                    {fireResults?.traditional.achievementMoment && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="caption">Achievement:</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          {fireResults.traditional.achievementMoment}
                        </Typography>
                      </Box>
                    )}
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="caption">Years Remaining:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        {fireResults?.traditional.yearsRemaining > 0 ? 
                          `${fireResults.traditional.yearsRemaining.toFixed(1)} years` : 'Achieved!'}
                      </Typography>
                    </Box>
                    
                    {fireResults?.traditional.achievementAge && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="caption">Achievement Age:</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          {fireResults.traditional.achievementAge.toFixed(1)} years old
                        </Typography>
                      </Box>
                    )}
                  </>
                )}
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption">Current Portfolio:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                    {formatCurrency(getPortfolioValueForFIRE())}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption">Monthly Contributions:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                    {formatCurrency(fireResults?.traditional.currentMonthlyContribution || 0)}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Coast FIRE */}
        <Grid item xs={12} md={4} sx={{ 
          display: 'flex',
          width: '100%'
        }}>
          <Card elevation={2} sx={{ 
            border: '2px solid', 
            borderColor: fireResults?.coast.alreadyCoastFire ? 'success.main' : 'success.light',
            height: '100%',
            width: '100%',
            flex: 1,
            display: 'flex',
            flexDirection: 'column'
          }}>
            <CardContent sx={{ 
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              height: '100%'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <BeachAccess sx={{ color: 'success.main', mr: 1 }} />
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  Coast FIRE
                </Typography>
                {fireResults?.coast.alreadyCoastFire && <CheckCircle sx={{ color: 'success.main', ml: 1 }} />}
              </Box>
              
              <Typography variant="h4" sx={{ 
                fontWeight: 'bold', 
                color: fireResults?.coast.alreadyCoastFire ? 'success.main' : 'success.dark',
                mb: 2 
              }}>
                {formatCurrency(fireResults?.coast.target || 0)}
              </Typography>
              
              <LinearProgress 
                variant="determinate" 
                value={fireResults?.coast.progress || 0} 
                sx={{ mb: 2, height: 8, borderRadius: 4 }}
                color="success"
              />
              
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Progress: {(fireResults?.coast.progress || 0).toFixed(1)}%
              </Typography>
              
              {fireResults?.coast.isPossible ? (
                <Stack spacing={1} sx={{ flexGrow: 1 }}>
                  {fireResults.coast.coastFireAge && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="caption">Coast Age:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        {fireResults.coast.coastFireAge.toFixed(1)} years old
                      </Typography>
                    </Box>
                  )}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption">Final Amount:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      {formatCurrency(fireResults.coast.finalAmount || 0)}
                    </Typography>
                  </Box>
                </Stack>
              ) : (
                <Alert severity="warning" sx={{ mt: 1 }}>
                  Coast FIRE not possible with current parameters
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Barista FIRE */}
        <Grid item xs={12} md={4} sx={{ 
          display: 'flex',
          width: '100%'
        }}>
          <Card elevation={2} sx={{ 
            border: '2px solid', 
            borderColor: fireResults?.barista.alreadyCoastFire ? 'success.main' : 'warning.main',
            height: '100%',
            width: '100%',
            flex: 1,
            display: 'flex',
            flexDirection: 'column'
          }}>
            <CardContent sx={{ 
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              height: '100%'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Coffee sx={{ color: 'warning.main', mr: 1 }} />
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                  Barista FIRE
                </Typography>
                {fireResults?.barista.alreadyCoastFire && <CheckCircle sx={{ color: 'success.main', ml: 1 }} />}
              </Box>
              
              <Typography variant="h4" sx={{ 
                fontWeight: 'bold', 
                color: fireResults?.barista.alreadyCoastFire ? 'success.main' : 'warning.main',
                mb: 2 
              }}>
                {formatCurrency(fireResults?.barista.target || 0)}
              </Typography>
              
              <LinearProgress 
                variant="determinate" 
                value={fireResults?.barista.progress || 0} 
                sx={{ mb: 2, height: 8, borderRadius: 4 }}
                color="warning"
              />
              
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Progress: {(fireResults?.barista.progress || 0).toFixed(1)}%
              </Typography>
              
              {fireResults?.barista.isPossible ? (
                <Stack spacing={1} sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption">Before barista:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      {formatCurrency(fireResults.barista.fullTimeMonthlyContribution)}/mo
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption">After barista:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      {formatCurrency(fireResults.barista.baristaMonthlyContribution)}/mo
                    </Typography>
                  </Box>
                  {fireResults.barista.coastFireAge && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="caption">Switch Age:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        {fireResults.barista.coastFireAge.toFixed(1)} years old
                      </Typography>
                    </Box>
                  )}
                </Stack>
              ) : (
                <Alert severity="warning" sx={{ mt: 1 }}>
                  Barista FIRE not possible with current parameters
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>
        </Grid>
      </Box>
      {/* End of FIRE Cards Container */}

      {/* Summary */}
      {fireResults && (
        <Paper sx={{ mt: 4, p: 3, bgcolor: 'grey.50' }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            📊 Summary
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2">
                <strong>Current Portfolio:</strong> {formatCurrency(getPortfolioValueForFIRE())}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2">
                <strong>Monthly Contributions:</strong> {formatCurrency(fireResults.summary.monthlyContribution)}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2">
                <strong>Years to Retirement:</strong> {fireResults.summary.yearsToRetirement} years
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2">
                <strong>Fastest Path:</strong> {fireResults.summary.fastestFireType} FIRE
              </Typography>
            </Grid>
          </Grid>
        </Paper>
      )}
    </Box>
  );
};
