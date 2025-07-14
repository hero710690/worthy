/**
 * Coast Fire Calculator Tab - Complete Implementation
 * 
 * This component provides the exact same interface and functionality as the original
 * coast-fire-calculator, allowing users to directly input and adjust all parameters.
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Stack,
  Slider,
  TextField,
  LinearProgress,
  Chip,
  Paper,
  Divider,
  ToggleButton,
  ToggleButtonGroup,
  Alert
} from '@mui/material';
import {
  GpsFixed,
  TrendingUp,
  Coffee,
  BeachAccess,
  CheckCircle,
  Calculate
} from '@mui/icons-material';

import { calculateAllFireTypes, type CoastFireInput } from '../services/coastFireCalculator';
import type { PortfolioValuation } from '../services/assetValuationService';

interface CoastFireCalculatorTabProps {
  portfolioValuation: PortfolioValuation | null;
  user: any;
  formatCurrency: (amount: number) => string;
  fireProfile?: any; // Add FIRE profile to get target retirement age and FIRE number
}

export const CoastFireCalculatorTab: React.FC<CoastFireCalculatorTabProps> = ({
  portfolioValuation,
  user,
  formatCurrency,
  fireProfile
}) => {
  // 🔥 EXACT SAME STATE as original coast-fire-calculator
  const [currentAge, setCurrentAge] = useState(35);
  const [retireAge, setRetireAge] = useState(67);
  const [pmtMonthly, setPmtMonthly] = useState(2500);
  const [rate, setRate] = useState(7); // Percentage (will convert to decimal)
  const [fireNumber, setFireNumber] = useState(2000000);
  const [principal, setPrincipal] = useState(0);
  const [pmtMonthlyBarista, setPmtMonthlyBarista] = useState(0);
  const [calcMode, setCalcMode] = useState<"coast" | "barista">("coast");
  
  // Results state
  const [results, setResults] = useState<any>(null);

  // Initialize with user's actual data when available
  useEffect(() => {
    if (portfolioValuation && user) {
      const currentYear = new Date().getFullYear();
      const userAge = currentYear - (user.birth_year || 1990);
      
      setCurrentAge(userAge);
      setPrincipal(portfolioValuation.totalValueInBaseCurrency);
    }
    
    // Initialize with FIRE profile data if available
    if (fireProfile) {
      setRetireAge(fireProfile.target_retirement_age || 67);
      // Use annual_expenses as the FIRE number (simplified approach)
      setFireNumber(fireProfile.annual_expenses || 2000000);
    }
  }, [portfolioValuation, user, fireProfile]);

  // Calculate results whenever parameters change
  useEffect(() => {
    // 🔧 FIXED: Always pass the actual barista contribution value
    // Let the individual calculation functions handle whether to use it or not
    const input: CoastFireInput = {
      fireNumber: fireNumber,
      currentAge: currentAge,
      retirementAge: retireAge,
      rate: rate / 100, // Convert percentage to decimal
      pmtMonthly: pmtMonthly,
      principal: principal,
      pmtMonthlyBarista: pmtMonthlyBarista  // Always pass the actual value
    };

    const calculationResults = calculateAllFireTypes(input);
    setResults(calculationResults);
  }, [currentAge, retireAge, pmtMonthly, rate, fireNumber, principal, pmtMonthlyBarista, calcMode]);

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Calculate color="primary" />
        🔥 Coast FIRE Calculator
      </Typography>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        <strong>Exact Implementation:</strong> This uses the same proven algorithms and interface as the original coast-fire-calculator.
        Adjust the parameters below to see real-time results.
      </Alert>

      <Grid container spacing={4}>
        {/* Input Controls - Full Width on Small Screens, Half Width on Large */}
        <Grid item xs={12} lg={6}>
          <Card elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 'bold' }}>
              Parameters
            </Typography>

            {/* Calculation Mode Toggle */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Calculation Mode
              </Typography>
              <ToggleButtonGroup
                value={calcMode}
                exclusive
                onChange={(_, newMode) => newMode && setCalcMode(newMode)}
                fullWidth
              >
                <ToggleButton value="coast">
                  <BeachAccess sx={{ mr: 1 }} />
                  Coast FIRE
                </ToggleButton>
                <ToggleButton value="barista">
                  <Coffee sx={{ mr: 1 }} />
                  Barista FIRE
                </ToggleButton>
              </ToggleButtonGroup>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                Mode only controls which slider is enabled. Both calculations are always shown.
              </Typography>
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Current Age */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Current Age: {currentAge}
              </Typography>
              <Slider
                value={currentAge}
                onChange={(_, value) => setCurrentAge(value as number)}
                min={18}
                max={80}
                step={1}
                marks={[
                  { value: 25, label: '25' },
                  { value: 40, label: '40' },
                  { value: 55, label: '55' }
                ]}
              />
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Retirement Age */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Retirement Age: {retireAge}
              </Typography>
              <Slider
                value={retireAge}
                onChange={(_, value) => setRetireAge(value as number)}
                min={currentAge}
                max={80}
                step={1}
                marks={[
                  { value: 50, label: '50' },
                  { value: 65, label: '65' },
                  { value: 75, label: '75' }
                ]}
              />
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Initial Principal */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Initial Principal: {formatCurrency(principal)}
              </Typography>
              <Slider
                value={principal}
                onChange={(_, value) => setPrincipal(value as number)}
                min={0}
                max={1000000}
                step={10000}
                marks={[
                  { value: 0, label: '$0' },
                  { value: 500000, label: '$500K' },
                  { value: 1000000, label: '$1M' }
                ]}
              />
              <TextField
                size="small"
                type="number"
                value={principal}
                onChange={(e) => setPrincipal(Number(e.target.value))}
                sx={{ mt: 1, width: '150px' }}
                InputProps={{
                  startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>
                }}
              />
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* FIRE Number */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                FIRE Number: {formatCurrency(fireNumber)}
              </Typography>
              <Slider
                value={fireNumber}
                onChange={(_, value) => setFireNumber(value as number)}
                min={100000}
                max={5000000}
                step={50000}
                marks={[
                  { value: 1000000, label: '$1M' },
                  { value: 2500000, label: '$2.5M' },
                  { value: 5000000, label: '$5M' }
                ]}
              />
              <TextField
                size="small"
                type="number"
                value={fireNumber}
                onChange={(e) => setFireNumber(Number(e.target.value))}
                sx={{ mt: 1, width: '150px' }}
                InputProps={{
                  startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>
                }}
              />
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Monthly Contributions */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Contributions (monthly): {formatCurrency(pmtMonthly)}
              </Typography>
              <Slider
                value={pmtMonthly}
                onChange={(_, value) => setPmtMonthly(value as number)}
                min={0}
                max={10000}
                step={100}
                marks={[
                  { value: 0, label: '$0' },
                  { value: 2500, label: '$2.5K' },
                  { value: 5000, label: '$5K' },
                  { value: 10000, label: '$10K' }
                ]}
              />
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Barista FIRE Contributions */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Barista FIRE Contributions (monthly): {formatCurrency(pmtMonthlyBarista)}
              </Typography>
              <Slider
                value={pmtMonthlyBarista}
                onChange={(_, value) => setPmtMonthlyBarista(value as number)}
                min={0}
                max={5000}
                step={100}
                disabled={calcMode === "coast"}
                marks={[
                  { value: 0, label: '$0' },
                  { value: 1000, label: '$1K' },
                  { value: 2500, label: '$2.5K' },
                  { value: 5000, label: '$5K' }
                ]}
              />
              {calcMode === "coast" && (
                <Typography variant="caption" color="text.secondary">
                  Disabled for Coast FIRE mode
                </Typography>
              )}
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* APR (Real Return) */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                APR (real return): {rate}%
              </Typography>
              <Slider
                value={rate}
                onChange={(_, value) => setRate(value as number)}
                min={0}
                max={15}
                step={0.1}
                marks={[
                  { value: 4, label: '4%' },
                  { value: 7, label: '7%' },
                  { value: 10, label: '10%' }
                ]}
              />
            </Box>
          </Card>
        </Grid>

        {/* Results Summary - Right Side */}
        <Grid item xs={12} lg={6}>
          {results && (
            <Paper sx={{ p: 3, bgcolor: 'grey.50' }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                📊 Quick Summary
              </Typography>
              <Stack spacing={1}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Years to Retirement:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                    {retireAge - currentAge} years
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Monthly Contributions:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                    {formatCurrency(pmtMonthly)}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Expected Return:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                    {rate}% annually
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Fastest Path:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                    {results.summary.fastestFireType} FIRE
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          )}
        </Grid>
      </Grid>

      {/* All FIRE Types Results - Full Width Grid */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="h5" sx={{ mb: 3, textAlign: 'center' }}>
          🔥 FIRE Calculation Results
        </Typography>
        
        <Grid container spacing={3}>
          {/* Traditional FIRE */}
          <Grid item xs={12} md={4}>
            <Card elevation={2} sx={{ 
              border: '2px solid', 
              borderColor: results?.traditional.achieved ? 'success.main' : 'primary.main',
              height: '100%'
            }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <GpsFixed sx={{ color: 'primary.main', mr: 1 }} />
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    Traditional FIRE
                  </Typography>
                  {results?.traditional.achieved && <CheckCircle sx={{ color: 'success.main', ml: 1 }} />}
                </Box>
                
                <Typography variant="h4" sx={{ 
                  fontWeight: 'bold', 
                  color: results?.traditional.achieved ? 'success.main' : 'primary.main',
                  mb: 2 
                }}>
                  {formatCurrency(results?.traditional.target || 0)}
                </Typography>
                
                <LinearProgress 
                  variant="determinate" 
                  value={results?.traditional.progress || 0} 
                  sx={{ mb: 2, height: 8, borderRadius: 4 }}
                />
                
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Progress: {(results?.traditional.progress || 0).toFixed(1)}%
                </Typography>
                
                <Stack spacing={1}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption">Years Remaining:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      {results?.traditional.yearsRemaining > 0 ? 
                        `${results.traditional.yearsRemaining.toFixed(1)} years` : 'Achieved!'}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="caption">Final Amount:</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      {formatCurrency(results?.traditional.finalAmount || 0)}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Coast FIRE */}
          <Grid item xs={12} md={4}>
            <Card elevation={2} sx={{ 
              border: '2px solid', 
              borderColor: results?.coast.alreadyCoastFire ? 'success.main' : 'success.light',
              height: '100%'
            }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <BeachAccess sx={{ color: 'success.main', mr: 1 }} />
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    Coast FIRE
                  </Typography>
                  {results?.coast.alreadyCoastFire && <CheckCircle sx={{ color: 'success.main', ml: 1 }} />}
                </Box>
                
                <Typography variant="h4" sx={{ 
                  fontWeight: 'bold', 
                  color: results?.coast.alreadyCoastFire ? 'success.main' : 'success.dark',
                  mb: 2 
                }}>
                  {formatCurrency(results?.coast.target || 0)}
                </Typography>
                
                <LinearProgress 
                  variant="determinate" 
                  value={results?.coast.progress || 0} 
                  sx={{ mb: 2, height: 8, borderRadius: 4 }}
                  color="success"
                />
                
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Progress: {(results?.coast.progress || 0).toFixed(1)}%
                </Typography>
                
                {results?.coast.isPossible ? (
                  <Stack spacing={1}>
                    {results.coast.coastFireAge && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="caption">Coast Age:</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          {results.coast.coastFireAge.toFixed(1)} years old
                        </Typography>
                      </Box>
                    )}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="caption">Final Amount:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        {formatCurrency(results.coast.finalAmount || 0)}
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
          <Grid item xs={12} md={4}>
            <Card elevation={2} sx={{ 
              border: '2px solid', 
              borderColor: results?.barista.alreadyCoastFire ? 'success.main' : 'warning.main',
              height: '100%'
            }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Coffee sx={{ color: 'warning.main', mr: 1 }} />
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    Barista FIRE
                  </Typography>
                  {results?.barista.alreadyCoastFire && <CheckCircle sx={{ color: 'success.main', ml: 1 }} />}
                </Box>
                
                <Typography variant="h4" sx={{ 
                  fontWeight: 'bold', 
                  color: results?.barista.alreadyCoastFire ? 'success.main' : 'warning.main',
                  mb: 2 
                }}>
                  {formatCurrency(results?.barista.target || 0)}
                </Typography>
                
                <LinearProgress 
                  variant="determinate" 
                  value={results?.barista.progress || 0} 
                  sx={{ mb: 2, height: 8, borderRadius: 4 }}
                  color="warning"
                />
                
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Progress: {(results?.barista.progress || 0).toFixed(1)}%
                </Typography>
                
                {results?.barista.isPossible ? (
                  <Stack spacing={1}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="caption">Full-time:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        {formatCurrency(results.barista.fullTimeMonthlyContribution)}/mo
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="caption">Part-time:</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        {formatCurrency(results.barista.baristaMonthlyContribution)}/mo
                      </Typography>
                    </Box>
                    {results.barista.coastFireAge && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="caption">Switch Age:</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          {results.barista.coastFireAge.toFixed(1)} years old
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
    </Box>
  );
};
