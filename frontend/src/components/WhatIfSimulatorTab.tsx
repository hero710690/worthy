/**
 * What-If Simulator Tab - Parameters and Controls
 * 
 * This tab contains all the parameter controls from the original coast-fire-calculator
 * allowing users to adjust values and see real-time FIRE calculations.
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
  ToggleButton,
  ToggleButtonGroup,
  Divider,
  Paper,
  Alert
} from '@mui/material';
import {
  BeachAccess,
  Coffee,
  Calculate
} from '@mui/icons-material';

import { calculateAllFireTypes, type CoastFireInput } from '../services/coastFireCalculator';
import { FIREChart } from './FIREChart';

interface WhatIfSimulatorTabProps {
  parameters: {
    currentAge: number;
    retireAge: number;
    pmtMonthly: number;
    rate: number;
    fireNumber: number;
    principal: number;
    pmtMonthlyBarista: number;
    calcMode: "coast" | "barista";
  };
  setParameters: (params: any) => void;
  baristaMonthlyContribution: number;
  setBaristaMonthlyContribution: (value: number) => void;
  formatCurrency: (amount: number) => string;
}

export const WhatIfSimulatorTab: React.FC<WhatIfSimulatorTabProps> = ({
  parameters,
  setParameters,
  baristaMonthlyContribution,
  setBaristaMonthlyContribution,
  formatCurrency
}) => {
  const [results, setResults] = useState<any>(null);

  // Calculate results whenever parameters change
  useEffect(() => {
    const input: CoastFireInput = {
      fireNumber: parameters.fireNumber,
      currentAge: parameters.currentAge,
      retirementAge: parameters.retireAge,
      rate: parameters.rate / 100, // Convert percentage to decimal
      pmtMonthly: parameters.pmtMonthly,
      principal: parameters.principal,
      pmtMonthlyBarista: parameters.pmtMonthlyBarista
    };

    const calculationResults = calculateAllFireTypes(input);
    setResults(calculationResults);
  }, [parameters]);

  const updateParameter = (key: string, value: number) => {
    setParameters((prev: any) => ({
      ...prev,
      [key]: value
    }));
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Calculate color="primary" />
        What-If Simulator
      </Typography>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        <strong>Interactive Parameters:</strong> Adjust the values below to explore different FIRE scenarios.
        All calculations use the proven coast-fire-calculator algorithms.
      </Alert>

      <Grid container spacing={4}>
        {/* Parameters - Left Side (25% width) */}
        <Grid item xs={12} sm={3} md={3} lg={3} xl={3}>
          <Card elevation={2} sx={{ p: 2, height: '600px', overflowY: 'auto' }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
              Parameters
            </Typography>

            {/* Calculation Mode Toggle */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ mb: 1, fontSize: '0.875rem' }}>
                Calculation Mode
              </Typography>
              <ToggleButtonGroup
                value={parameters.calcMode}
                exclusive
                onChange={(_, newMode) => newMode && updateParameter('calcMode', newMode)}
                fullWidth
                size="small"
              >
                <ToggleButton value="coast">
                  <BeachAccess sx={{ mr: 0.5, fontSize: '1rem' }} />
                  <Typography variant="caption">Coast</Typography>
                </ToggleButton>
                <ToggleButton value="barista">
                  <Coffee sx={{ mr: 0.5, fontSize: '1rem' }} />
                  <Typography variant="caption">Barista</Typography>
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>

            <Divider sx={{ my: 1 }} />

            {/* Current Age */}
            <Box sx={{ mb: 1.5 }}>
              <Typography variant="body2" sx={{ mb: 0.5, fontSize: '0.875rem' }}>
                Current Age: {parameters.currentAge}
              </Typography>
              <Slider
                value={parameters.currentAge}
                onChange={(_, value) => updateParameter('currentAge', value as number)}
                min={18}
                max={80}
                step={1}
                size="small"
                marks={[
                  { value: 25, label: '25' },
                  { value: 55, label: '55' }
                ]}
              />
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Retirement Age */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Retirement Age: {parameters.retireAge}
              </Typography>
              <Slider
                value={parameters.retireAge}
                onChange={(_, value) => updateParameter('retireAge', value as number)}
                min={parameters.currentAge}
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
                Initial Principal: {formatCurrency(parameters.principal)}
              </Typography>
              <Slider
                value={parameters.principal}
                onChange={(_, value) => updateParameter('principal', value as number)}
                min={0}
                max={10000000} // 🔧 UPDATED: $10M upper bound (reduced from $100M)
                step={50000} // Reduced step size for better precision
                marks={[
                  { value: 0, label: '$0' },
                  { value: 2500000, label: '$2.5M' },
                  { value: 5000000, label: '$5M' },
                  { value: 10000000, label: '$10M' }
                ]}
              />
              <TextField
                size="small"
                type="number"
                value={parameters.principal}
                onChange={(e) => updateParameter('principal', Number(e.target.value))}
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
                FIRE Number: {formatCurrency(parameters.fireNumber)}
              </Typography>
              <Slider
                value={parameters.fireNumber}
                onChange={(_, value) => updateParameter('fireNumber', value as number)}
                min={100000}
                max={10000000} // 🔧 UPDATED: $10M upper bound (reduced from $1B)
                step={100000} // Reduced step size for better precision
                marks={[
                  { value: 1000000, label: '$1M' },
                  { value: 5000000, label: '$5M' },
                  { value: 10000000, label: '$10M' }
                ]}
              />
              <TextField
                size="small"
                type="number"
                value={parameters.fireNumber}
                onChange={(e) => updateParameter('fireNumber', Number(e.target.value))}
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
                Contributions (monthly): {formatCurrency(parameters.pmtMonthly)}
              </Typography>
              <Slider
                value={parameters.pmtMonthly}
                onChange={(_, value) => updateParameter('pmtMonthly', value as number)}
                min={0}
                max={200000} // 🔧 UPDATED: 200K upper bound
                step={1000} // Increased step size for larger range
                marks={[
                  { value: 0, label: '$0' },
                  { value: 50000, label: '$50K' },
                  { value: 100000, label: '$100K' },
                  { value: 200000, label: '$200K' }
                ]}
              />
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Barista FIRE Contributions */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Barista FIRE Contributions (monthly): {formatCurrency(parameters.pmtMonthlyBarista)}
              </Typography>
              <Slider
                value={parameters.pmtMonthlyBarista}
                onChange={(_, value) => updateParameter('pmtMonthlyBarista', value as number)}
                min={0}
                max={100000} // 🔧 UPDATED: 100K upper bound
                step={1000} // Increased step size for larger range
                disabled={parameters.calcMode === "coast"}
                marks={[
                  { value: 0, label: '$0' },
                  { value: 25000, label: '$25K' },
                  { value: 50000, label: '$50K' },
                  { value: 100000, label: '$100K' }
                ]}
              />
              {parameters.calcMode === "coast" && (
                <Typography variant="caption" color="text.secondary">
                  Disabled for Coast FIRE mode
                </Typography>
              )}
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* APR (Real Return) */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                APR (real return): {parameters.rate}%
              </Typography>
              <Slider
                value={parameters.rate}
                onChange={(_, value) => updateParameter('rate', value as number)}
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

        {/* FIRE Chart - Right Side (75% width) */}
        <Grid item xs={12} sm={9} md={9} lg={9} xl={9}>
          <Box sx={{ height: '600px' }}>
            <FIREChart 
              parameters={parameters}
              formatCurrency={formatCurrency}
            />
          </Box>
        </Grid>
      </Grid>
      
      {/* Bottom Row: Results Summary - Horizontal Layout */}
      {results && (
        <Grid container spacing={3}>
          {/* Quick Results */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3, bgcolor: 'grey.50' }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                📊 Quick Results
              </Typography>
              <Stack spacing={1}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Years to Retirement:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                    {parameters.retireAge - parameters.currentAge} years
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Monthly Contributions:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                    {formatCurrency(parameters.pmtMonthly)}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Expected Return:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                    {parameters.rate}% annually
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
          </Grid>

          {/* FIRE Targets */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3, bgcolor: 'primary.50' }}>
              <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>
                🎯 FIRE Targets
              </Typography>
              <Stack spacing={1}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Traditional FIRE:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                    {formatCurrency(results.traditional.target)}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Coast FIRE:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                    {formatCurrency(results.coast.target)}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Barista FIRE:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                    {formatCurrency(results.barista.target)}
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          </Grid>

          {/* Progress */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3, bgcolor: 'success.50' }}>
              <Typography variant="h6" sx={{ mb: 2, color: 'success.main' }}>
                📈 Progress
              </Typography>
              <Stack spacing={1}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Traditional:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                    {results.traditional.progress.toFixed(1)}%
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Coast:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                    {results.coast.progress.toFixed(1)}%
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Barista:</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                    {results.barista.progress.toFixed(1)}%
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};
