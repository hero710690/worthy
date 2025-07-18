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

import { FIREChart } from './FIREChart';

import { calculateAllFireTypes, type CoastFireInput } from '../services/coastFireCalculator';

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
    withdrawalRate: number;
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

  // Calculate results whenever parameters change - using same logic as Goals page
  useEffect(() => {
    console.log('🔄 WhatIfSimulatorTab - Parameters changed:', parameters);

    try {
      // Use the same calculation logic as Goals page dashboard
      const input: CoastFireInput = {
        fireNumber: parameters.fireNumber, // Using FIRE number directly
        currentAge: parameters.currentAge,
        retirementAge: parameters.retireAge,
        rate: parameters.rate / 100, // Convert percentage to decimal
        pmtMonthly: parameters.pmtMonthly,
        principal: parameters.principal,
        pmtMonthlyBarista: parameters.pmtMonthlyBarista
      };

      console.log('🔥 WhatIfSimulator - CoastFireInput:', input);

      const calculationResults = calculateAllFireTypes(input);
      console.log('🔥 WhatIfSimulator - Calculation results:', {
        traditional: calculationResults.traditional?.target,
        coast: calculationResults.coast?.target,
        barista: calculationResults.barista?.target,
        progress: {
          traditional: calculationResults.traditional?.progress,
          coast: calculationResults.coast?.progress,
          barista: calculationResults.barista?.progress
        }
      });

      setResults(calculationResults);

    } catch (error) {
      console.error('❌ Error in FIRE calculations:', error);
      setResults(null);
    }
  }, [parameters]);

  // Debug effect to track results changes
  useEffect(() => {
    if (results) {
      console.log('📈 Results updated:', {
        traditional: results.traditional?.target,
        coast: results.coast?.target,
        barista: results.barista?.target
      });
    }
  }, [results]);

  const updateParameter = (key: string, value: number) => {
    console.log(`🔄 Parameter updated: ${key} = ${value}`);
    setParameters((prev: any) => {
      const newParams = {
        ...prev,
        [key]: value
      };
      console.log('📊 New parameters:', newParams);
      return newParams;
    });
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

      {/* Main Layout Container */}
      <Box sx={{
        display: 'flex',
        height: '850px',
        gap: 3,
        width: '100%'
      }}>
        {/* Left Side - Parameters (25% width) */}
        <Box sx={{
          width: '25%',
          flexShrink: 0
        }}>
          <Card elevation={2} sx={{
            p: 3,
            px: 4, // Add more horizontal padding
            height: '100%',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column'
          }}>
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
                max={10000000}
                step={50000}
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
                min={1000000}
                max={30000000}
                step={100000}
                marks={[
                  { value: 10000000, label: '$10M' },
                  { value: 15000000, label: '$15M' },
                  { value: 30000000, label: '$30M' }
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
                max={200000}
                step={1000}
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
                max={100000}
                step={1000}
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

            {/* Withdrawal Rate */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Withdrawal Rate: {parameters.withdrawalRate || 4}%
              </Typography>
              <Slider
                value={parameters.withdrawalRate || 4}
                onChange={(_, value) => updateParameter('withdrawalRate', value as number)}
                min={2}
                max={8}
                step={0.1}
                marks={[
                  { value: 3, label: '3%' },
                  { value: 4, label: '4%' },
                  { value: 5, label: '5%' }
                ]}
              />
              <Typography variant="caption" color="text.secondary">
                Safe withdrawal rate for retirement
              </Typography>
            </Box>
          </Card>
        </Box>

        {/* Right Side - Chart and Results (75% width) */}
        <Box sx={{
          width: '75%',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          height: '100%'
        }}>
          {/* Top - FIRE Chart (takes most of the space) */}
          <Card elevation={2} sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minHeight: '500px'
          }}>
            <CardContent sx={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              p: 3
            }}>
              {/* Chart visualization area - No title here, let FIREChart handle it */}
              <Box sx={{
                flex: 1,
                width: '100%',
                height: '600px', // Increased height for the chart
                position: 'relative'
              }}>
                <FIREChart
                  parameters={{
                    currentAge: parameters.currentAge || 35,
                    retireAge: parameters.retireAge || 67,
                    pmtMonthly: parameters.pmtMonthly || 2500,
                    rate: parameters.rate || 7,
                    fireNumber: parameters.fireNumber || 2000000,
                    principal: parameters.principal || 0,
                    pmtMonthlyBarista: parameters.pmtMonthlyBarista || 2000,
                    calcMode: parameters.calcMode || "coast",
                    withdrawalRate: parameters.withdrawalRate || 4.0
                  }}
                  formatCurrency={formatCurrency}
                />
              </Box>
            </CardContent>
          </Card>

          {/* Bottom - Results Cards (fixed height) */}
          {results && (
            <Card elevation={2} sx={{
              height: '250px',
              flexShrink: 0
            }}>
              <CardContent sx={{ p: 2, pb: 6, height: '100%' }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
                  📊 Calculation Results
                </Typography>

                {/* Three Result Cards in a Row */}
                <Box sx={{ 
                  display: 'flex', 
                  gap: 2, 
                  height: 'calc(100% - 60px)',
                  width: '100%'
                }}>
                  {/* Quick Results */}
                  <Box sx={{ flex: 1 }}>
                    <Paper sx={{
                      p: 2,
                      bgcolor: 'grey.50',
                      height: '100%',
                      width: '100%',
                      display: 'flex',
                      flexDirection: 'column'
                    }}>
                      <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold', fontSize: '0.9rem' }}>
                        📊 Quick Results
                      </Typography>
                      <Stack spacing={0.3} sx={{ flex: 1, overflow: 'hidden' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>Years to Retirement:</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}>
                            {parameters.retireAge - parameters.currentAge} years
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>Monthly Contributions:</Typography>
                          <Typography variant="body2" sx={{
                            fontWeight: 'bold',
                            fontSize: '0.75rem',
                            wordBreak: 'break-all',
                            textAlign: 'right',
                            maxWidth: '50%'
                          }}>
                            {formatCurrency(parameters.pmtMonthly)}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>Expected Return:</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}>
                            {parameters.rate}% annually
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>Withdrawal Rate:</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}>
                            {parameters.withdrawalRate || 4}% annually
                          </Typography>
                        </Box>
                      </Stack>
                    </Paper>
                  </Box>

                  {/* FIRE Targets */}
                  <Box sx={{ flex: 1 }}>
                    <Paper sx={{
                      p: 2,
                      bgcolor: 'primary.50',
                      height: '100%',
                      width: '100%',
                      display: 'flex',
                      flexDirection: 'column'
                    }}>
                      <Typography variant="subtitle1" sx={{ mb: 1, color: 'primary.main', fontWeight: 'bold', fontSize: '0.9rem' }}>
                        🎯 FIRE Targets
                      </Typography>
                      <Stack spacing={0.3} sx={{ flex: 1, overflow: 'hidden' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>Traditional FIRE:</Typography>
                          <Typography variant="body2" sx={{
                            fontWeight: 'bold',
                            fontSize: '0.75rem',
                            wordBreak: 'break-all',
                            textAlign: 'right',
                            maxWidth: '50%'
                          }}>
                            {formatCurrency(results?.traditional?.target || parameters.fireNumber)}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>Coast FIRE:</Typography>
                          <Typography variant="body2" sx={{
                            fontWeight: 'bold',
                            fontSize: '0.75rem',
                            wordBreak: 'break-all',
                            textAlign: 'right',
                            maxWidth: '50%'
                          }}>
                            {formatCurrency(results?.coast?.target || (parameters.fireNumber * 0.75))}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>Barista FIRE:</Typography>
                          <Typography variant="body2" sx={{
                            fontWeight: 'bold',
                            fontSize: '0.75rem',
                            wordBreak: 'break-all',
                            textAlign: 'right',
                            maxWidth: '50%'
                          }}>
                            {formatCurrency(results?.barista?.target || (parameters.fireNumber * 0.5))}
                          </Typography>
                        </Box>
                      </Stack>
                    </Paper>
                  </Box>

                  {/* Progress */}
                  <Box sx={{ flex: 1 }}>
                    <Paper sx={{
                      p: 2,
                      bgcolor: 'success.50',
                      height: '100%',
                      width: '100%',
                      display: 'flex',
                      flexDirection: 'column'
                    }}>
                      <Typography variant="subtitle1" sx={{ mb: 1, color: 'success.main', fontWeight: 'bold', fontSize: '0.9rem' }}>
                        📈 Progress
                      </Typography>
                      <Stack spacing={0.3} sx={{ flex: 1, overflow: 'hidden' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>Traditional:</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}>
                            {results?.traditional?.progress?.toFixed(1) || ((parameters.principal / parameters.fireNumber * 100) || 0).toFixed(1)}%
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>Coast:</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}>
                            {results.coast.progress.toFixed(1)}%
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>Barista:</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}>
                            {results.barista.progress.toFixed(1)}%
                          </Typography>
                        </Box>
                      </Stack>
                    </Paper>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          )}
        </Box>
      </Box>
    </Box>
  );
};
