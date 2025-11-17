/**
 * What-If Simulator Tab - Interactive Retirement Strategy Simulator
 * Multi-path retirement planning with dynamic stages and inflation adjustment
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  Grid,
  Stack,
  Slider,
  TextField,
  Button,
  Paper,
  Divider,
  IconButton,
  Alert
} from '@mui/material';
import {
  Add,
  Delete
} from '@mui/icons-material';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface DynamicStage {
  endAge: number;
  monthlyInvestment: number;
}

interface LumpSum {
  age: number;
  amount: number;
  description: string;
}

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
  onParametersChange?: (params: any) => void;
}

export const WhatIfSimulatorTab: React.FC<WhatIfSimulatorTabProps> = ({
  parameters,
  setParameters,
  baristaMonthlyContribution,
  setBaristaMonthlyContribution,
  formatCurrency,
  onParametersChange
}) => {
  // Core parameters
  const [initialCapital, setInitialCapital] = useState(parameters.principal || 8000000);
  const [annualReturnRate, setAnnualReturnRate] = useState(parameters.rate || 6.74);
  const [inflationRate, setInflationRate] = useState(2.5);
  const [adjustGoalForInflation, setAdjustGoalForInflation] = useState(true);
  const [currentAge, setCurrentAge] = useState(parameters.currentAge || 32.5);
  const [currentAgeYears, setCurrentAgeYears] = useState(Math.floor(parameters.currentAge || 32));
  const [currentAgeMonths, setCurrentAgeMonths] = useState(Math.round(((parameters.currentAge || 32.5) % 1) * 12));
  const [retirementGoal, setRetirementGoal] = useState(parameters.fireNumber || 34300000);
  const [withdrawalRate, setWithdrawalRate] = useState(parameters.withdrawalRate || 3.6);
  
  const [lumpSums, setLumpSums] = useState<LumpSum[]>([]);
  const [dynamicStages, setDynamicStages] = useState<DynamicStage[]>([
    { endAge: 40, monthlyInvestment: 50000 },
    { endAge: 50, monthlyInvestment: 30000 },
    { endAge: 65, monthlyInvestment: 0 }
  ]);

  const [results, setResults] = useState<any>(null);

  // Sync with parent parameters
  useEffect(() => {
    setInitialCapital(parameters.principal || 8000000);
    setAnnualReturnRate(parameters.rate || 6.74);
    const newAge = parameters.currentAge || 32.5;
    setCurrentAge(newAge);
    setCurrentAgeYears(Math.floor(newAge));
    setCurrentAgeMonths(Math.round((newAge % 1) * 12));
    setRetirementGoal(parameters.fireNumber || 34300000);
    setWithdrawalRate(parameters.withdrawalRate || 3.6);
  }, [parameters]);

  const handleAgeYearsChange = (years: number) => {
    const clampedYears = Math.max(18, Math.min(80, years));
    setCurrentAgeYears(clampedYears);
    setCurrentAge(clampedYears + currentAgeMonths / 12);
  };

  const handleAgeMonthsChange = (months: number) => {
    const clampedMonths = Math.max(0, Math.min(11, months));
    setCurrentAgeMonths(clampedMonths);
    setCurrentAge(currentAgeYears + clampedMonths / 12);
  };

  const runProjection = (config: any, strategyParams: any = { type: 'dynamic' }) => {
    const dataPoints: number[] = [];
    const realReturnRate = ((1 + Math.max(0.01, config.annualReturnRate) / 100) / (1 + config.inflationRate / 100)) - 1;
    const monthlyRate = Math.pow(1 + realReturnRate, 1 / 12) - 1;
    let currentValue = Math.max(0, config.initialCapital);
    
    const maxAge = 80;
    const totalMonths = Math.round((maxAge - config.currentAge) * 12);

    if (totalMonths <= 0) return { dataPoints: [] };

    for (let i = 0; i <= totalMonths; i++) {
      const currentAge = config.currentAge + i / 12;
      
      dataPoints.push(Math.round(Math.max(0, currentValue)));

      let monthlyInvestment = 0;
      let monthlyWithdrawal = 0;

      if (i < totalMonths && currentAge < config.retirementAge) {
        let currentStagePlan = 0;
        for (const stage of config.dynamicStages) {
          if ((currentAge + 0.001) < stage.endAge) {
            currentStagePlan = Math.max(0, stage.monthlyInvestment);
            break;
          }
        }

        switch(strategyParams.type) {
          case 'dynamic':
            monthlyInvestment = currentStagePlan;
            break;
          case 'variant':
            monthlyInvestment = (currentAge < strategyParams.switchAge) ? currentStagePlan : Math.max(0, strategyParams.investmentAfterSwitch);
            break;
        }
      } else if (currentAge >= config.retirementAge) {
        const yearsToRetirement = config.retirementAge - config.currentAge;
        const inflationAdjustedGoal = config.adjustGoalForInflation 
          ? config.retirementGoal * Math.pow(1 + config.inflationRate / 100, yearsToRetirement)
          : config.retirementGoal;
        
        if (currentValue >= inflationAdjustedGoal) {
          monthlyWithdrawal = (currentValue * config.withdrawalRate / 100) / 12;
        }
      }
      
      // Add lump sums AFTER calculating monthly investment/withdrawal
      if (config.lumpSums && config.lumpSums.length > 0) {
        config.lumpSums.forEach((ls: LumpSum) => {
          const lsMonth = Math.round((ls.age - config.currentAge) * 12);
          if (i === lsMonth) {
            console.log(`💰 Adding lump sum at age ${currentAge.toFixed(1)}: ${ls.amount}`);
            currentValue += ls.amount;
          }
        });
      }
      
      currentValue = Math.max(0, (currentValue + monthlyInvestment - monthlyWithdrawal) * (1 + monthlyRate));
    }
    return { dataPoints };
  };

  const findOptimalSwitchAge = (config: any, monthlyInvestmentAfterSwitch: number) => {
    if (!config.retirementAge) return null;
    const totalMonths = Math.round((config.retirementAge - config.currentAge) * 12);

    for (let switchMonth = 0; switchMonth <= totalMonths; switchMonth++) {
      const switchAge = config.currentAge + switchMonth / 12;
      const { dataPoints } = runProjection(config, { type: 'variant', switchAge, investmentAfterSwitch: monthlyInvestmentAfterSwitch });
      if (dataPoints.length > 0) {
        const retirementIndex = Math.round((config.retirementAge - config.currentAge) * 12);
        const finalValue = dataPoints[Math.min(retirementIndex, dataPoints.length - 1)];
        const yearsToRetirement = config.retirementAge - config.currentAge;
        const inflationAdjustedGoal = config.adjustGoalForInflation 
          ? config.retirementGoal * Math.pow(1 + config.inflationRate / 100, yearsToRetirement)
          : config.retirementGoal;
        if (finalValue >= inflationAdjustedGoal) return switchAge;
      }
    }
    return null;
  };

  useEffect(() => {
    if (dynamicStages.length === 0) return;

    const config = {
      initialCapital: Math.max(0, initialCapital || 100000),
      annualReturnRate: Math.max(0.1, Math.min(20, annualReturnRate || 7)),
      inflationRate: Math.max(0, Math.min(10, inflationRate || 2.5)),
      adjustGoalForInflation,
      currentAge: Math.max(18, Math.min(80, currentAge || 35)),
      retirementGoal: Math.max(1000, retirementGoal || 2000000),
      dynamicStages: [...dynamicStages].sort((a, b) => a.endAge - b.endAge).map(stage => ({
        endAge: Math.max(currentAge + 1, stage.endAge),
        monthlyInvestment: Math.max(0, stage.monthlyInvestment)
      })),
      lumpSums: lumpSums.map(ls => ({
        age: Math.max(currentAge, ls.age),
        amount: Math.max(0, ls.amount),
        description: ls.description
      })),
      baristaMonthlyInvestment: Math.max(0, baristaMonthlyContribution || 1000),
      retirementAge: Math.max(currentAge + 1, Math.max(...dynamicStages.map(s => s.endAge))),
      withdrawalRate: Math.max(0, Math.min(10, withdrawalRate || 3.6))
    };

    try {
      console.log('🔍 Config lumpSums:', config.lumpSums);
      const optimalBaristaAge = findOptimalSwitchAge(config, config.baristaMonthlyInvestment);
      const optimalCoastAge = findOptimalSwitchAge(config, 0);

      const { dataPoints: dynamicData } = runProjection(config, { type: 'dynamic' });
      const { dataPoints: baristaData } = runProjection(config, { type: 'variant', switchAge: optimalBaristaAge || 999, investmentAfterSwitch: config.baristaMonthlyInvestment });
      const { dataPoints: coastData } = runProjection(config, { type: 'variant', switchAge: optimalCoastAge || 999, investmentAfterSwitch: 0 });

      if (dynamicData.length > 0) {
        const retirementIndex = Math.round((config.retirementAge - config.currentAge) * 12);
        const finalDynamic = dynamicData[Math.min(retirementIndex, dynamicData.length - 1)];
        const finalBarista = baristaData[Math.min(retirementIndex, baristaData.length - 1)] || finalDynamic;
        const finalCoast = coastData[Math.min(retirementIndex, coastData.length - 1)] || finalDynamic;

        setResults({
          config,
          optimalBaristaAge,
          optimalCoastAge,
          finalDynamic,
          finalBarista,
          finalCoast,
          dynamicData,
          baristaData: baristaData.length > 0 ? baristaData : dynamicData,
          coastData: coastData.length > 0 ? coastData : dynamicData
        });
      }
    } catch (error) {
      console.error('Calculation error:', error);
    }
  }, [initialCapital, annualReturnRate, inflationRate, adjustGoalForInflation, currentAge, retirementGoal, dynamicStages, lumpSums, baristaMonthlyContribution, withdrawalRate]);

  const updateStage = (index: number, field: keyof DynamicStage, value: number) => {
    const newStages = [...dynamicStages];
    newStages[index] = { ...newStages[index], [field]: value };
    setDynamicStages(newStages);
  };

  const addStage = () => {
    const lastAge = dynamicStages.length > 0 ? Math.max(...dynamicStages.map(s => s.endAge)) : currentAge;
    setDynamicStages([...dynamicStages, { endAge: lastAge + 5, monthlyInvestment: 10000 }]);
  };

  const removeStage = (index: number) => {
    if (dynamicStages.length > 1) {
      setDynamicStages(dynamicStages.filter((_, i) => i !== index));
    }
  };

  const addLumpSum = () => {
    const newLumpSum = { age: currentAge + 5, amount: 100000, description: 'Bonus' };
    console.log('➕ Adding lump sum:', newLumpSum);
    setLumpSums([...lumpSums, newLumpSum]);
    console.log('📊 LumpSums after add:', [...lumpSums, newLumpSum]);
  };

  const updateLumpSum = (index: number, field: keyof LumpSum, value: any) => {
    const newLumpSums = [...lumpSums];
    newLumpSums[index] = { ...newLumpSums[index], [field]: value };
    setLumpSums(newLumpSums);
  };

  const removeLumpSum = (index: number) => {
    setLumpSums(lumpSums.filter((_, i) => i !== index));
  };

  // Chart data - show monthly points to see lump sum jumps
  const chartData = results ? {
    labels: Array.from({ length: results.dynamicData.length }, (_, i) => 
      (currentAge + i / 12).toFixed(1)
    ).filter((_, i) => i % 3 === 0), // Show every 3 months for better visibility
    datasets: [
      {
        label: 'Dynamic Plan',
        data: results.dynamicData.filter((_: any, i: number) => i % 3 === 0),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.1)',
        borderWidth: 2,
        tension: 0.1,
        pointRadius: 0
      },
      {
        label: `Barista FIRE (switch at ${results.optimalBaristaAge?.toFixed(1) || 'N/A'})`,
        data: results.baristaData.filter((_: any, i: number) => i % 3 === 0),
        borderColor: 'rgb(255, 159, 64)',
        backgroundColor: 'rgba(255, 159, 64, 0.1)',
        borderWidth: 2,
        tension: 0.1,
        pointRadius: 0
      },
      {
        label: `Coast FIRE (switch at ${results.optimalCoastAge?.toFixed(1) || 'N/A'})`,
        data: results.coastData.filter((_: any, i: number) => i % 3 === 0),
        borderColor: 'rgb(153, 102, 255)',
        backgroundColor: 'rgba(153, 102, 255, 0.1)',
        borderWidth: 2,
        tension: 0.1,
        pointRadius: 0
      },
      {
        label: 'Retirement Goal',
        data: Array(results.dynamicData.filter((_: any, i: number) => i % 3 === 0).length).fill(
          adjustGoalForInflation 
            ? retirementGoal * Math.pow(1 + inflationRate / 100, results.config.retirementAge - currentAge)
            : retirementGoal
        ),
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.1)',
        borderWidth: 2,
        borderDash: [5, 5],
        tension: 0,
        pointRadius: 0
      }
    ]
  } : null;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: { position: 'top' as const },
      title: { display: true, text: 'Retirement Projection Scenarios' },
      tooltip: {
        enabled: true,
        mode: 'index' as const,
        intersect: false,
        callbacks: {
          label: (context: any) => {
            const label = context.dataset.label || '';
            const value = formatCurrency(context.parsed.y);
            return `${label}: ${value}`;
          },
          title: (tooltipItems: any) => {
            return `Age: ${tooltipItems[0].label}`;
          }
        }
      },
      annotation: lumpSums.length > 0 ? {
        annotations: lumpSums.reduce((acc: any, ls, idx) => {
          acc[`lumpsum${idx}`] = {
            type: 'line',
            xMin: ls.age.toFixed(1),
            xMax: ls.age.toFixed(1),
            borderColor: 'rgb(255, 99, 132)',
            borderWidth: 2,
            borderDash: [5, 5],
            label: {
              display: true,
              content: `${ls.description}: ${formatCurrency(ls.amount)}`,
              position: 'start'
            }
          };
          return acc;
        }, {})
      } : undefined
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Age'
        }
      },
      y: {
        title: {
          display: true,
          text: 'Portfolio Value'
        },
        ticks: {
          callback: (value: any) => formatCurrency(value)
        }
      }
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3, height: '100%' }}>
      {/* Parameters Panel */}
      <Box sx={{ width: { xs: '100%', md: '20%' }, flexShrink: 0 }}>
        <Card elevation={2} sx={{ p: 3, height: '100%', overflowY: 'auto' }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>Parameters</Typography>

          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ mb: 0.5 }}>Initial Capital: {formatCurrency(initialCapital)}</Typography>
            <TextField size="small" type="number" value={Math.round(initialCapital)} 
              onChange={(e) => setInitialCapital(Number(e.target.value))} fullWidth />
          </Box>

          <Divider sx={{ my: 2 }} />

          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>Annual Return: {annualReturnRate.toFixed(2)}%</Typography>
            <Slider value={annualReturnRate} onChange={(_, v) => setAnnualReturnRate(v as number)}
              min={2} max={12} step={0.01} marks={[{value: 4, label: '4%'}, {value: 7, label: '7%'}, {value: 10, label: '10%'}]} />
          </Box>

          <Divider sx={{ my: 2 }} />

          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>Inflation Rate: {inflationRate.toFixed(2)}%</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
              Real return: {(((1 + annualReturnRate / 100) / (1 + inflationRate / 100) - 1) * 100).toFixed(2)}%
            </Typography>
            <Slider value={inflationRate} onChange={(_, v) => setInflationRate(v as number)}
              min={0} max={6} step={0.1} marks={[{value: 1, label: '1%'}, {value: 2.5, label: '2.5%'}, {value: 4, label: '4%'}]} />
          </Box>

          <Divider sx={{ my: 2 }} />

          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ mb: 0.5 }}>Current Age: {currentAgeYears}y {currentAgeMonths}m</Typography>
            <Grid container spacing={1}>
              <Grid item xs={6}>
                <TextField size="small" type="number" label="Years" value={currentAgeYears}
                  onChange={(e) => handleAgeYearsChange(Number(e.target.value))} fullWidth />
              </Grid>
              <Grid item xs={6}>
                <TextField size="small" type="number" label="Months" value={currentAgeMonths}
                  onChange={(e) => handleAgeMonthsChange(Number(e.target.value))} fullWidth />
              </Grid>
            </Grid>
          </Box>

          <Divider sx={{ my: 2 }} />

          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>Retirement Goal: {formatCurrency(retirementGoal)}</Typography>
            <TextField size="small" type="number" value={retirementGoal}
              onChange={(e) => setRetirementGoal(Number(e.target.value))} fullWidth />
            <Box sx={{ mt: 2, p: 1.5, bgcolor: 'info.50', borderRadius: 1 }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Typography variant="caption" sx={{ fontWeight: 600 }}>Adjust for inflation?</Typography>
                <Button size="small" variant={adjustGoalForInflation ? "contained" : "outlined"}
                  onClick={() => setAdjustGoalForInflation(!adjustGoalForInflation)} sx={{ minWidth: 60 }}>
                  {adjustGoalForInflation ? 'ON' : 'OFF'}
                </Button>
              </Stack>
              {adjustGoalForInflation && dynamicStages.length > 0 && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  At retirement: {formatCurrency(retirementGoal * Math.pow(1 + inflationRate / 100, 
                    Math.max(...dynamicStages.map(s => s.endAge)) - currentAge))}
                </Typography>
              )}
            </Box>
          </Box>

          <Divider sx={{ my: 2 }} />

          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>Withdrawal Rate: {withdrawalRate.toFixed(1)}%</Typography>
            <Slider value={withdrawalRate} onChange={(_, v) => setWithdrawalRate(v as number)}
              min={2} max={8} step={0.1} marks={[{value: 3, label: '3%'}, {value: 4, label: '4%'}]} />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              At goal {formatCurrency(adjustGoalForInflation && dynamicStages.length > 0 
                ? retirementGoal * Math.pow(1 + inflationRate / 100, Math.max(...dynamicStages.map(s => s.endAge)) - currentAge)
                : retirementGoal)}:
            </Typography>
            <Typography variant="caption" color="primary" sx={{ display: 'block', fontWeight: 600 }}>
              Monthly: {formatCurrency((adjustGoalForInflation && dynamicStages.length > 0 
                ? retirementGoal * Math.pow(1 + inflationRate / 100, Math.max(...dynamicStages.map(s => s.endAge)) - currentAge)
                : retirementGoal) * withdrawalRate / 100 / 12)}
            </Typography>
            <Typography variant="caption" color="primary" sx={{ display: 'block', fontWeight: 600 }}>
              Yearly: {formatCurrency((adjustGoalForInflation && dynamicStages.length > 0 
                ? retirementGoal * Math.pow(1 + inflationRate / 100, Math.max(...dynamicStages.map(s => s.endAge)) - currentAge)
                : retirementGoal) * withdrawalRate / 100)}
            </Typography>
          </Box>

          <Divider sx={{ my: 2 }} />

          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>Barista Monthly Investment: {formatCurrency(baristaMonthlyContribution)}</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
              Part-time work contribution for Barista FIRE path
            </Typography>
            <TextField size="small" type="number" value={baristaMonthlyContribution}
              onChange={(e) => setBaristaMonthlyContribution(Number(e.target.value))} fullWidth />
          </Box>

          <Divider sx={{ my: 2 }} />

          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 1, fontSize: '0.9rem' }}>📈 Dynamic Investment Plan</Typography>
            {dynamicStages.map((stage, index) => (
              <Paper key={index} sx={{ p: 1.5, mb: 1.5, bgcolor: 'grey.50' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="subtitle2">Stage {index + 1}</Typography>
                  <IconButton size="small" color="error" onClick={() => removeStage(index)} disabled={dynamicStages.length === 1}>
                    <Delete fontSize="small" />
                  </IconButton>
                </Box>
                <Stack spacing={1}>
                  <TextField label="End at Age" type="number" value={stage.endAge} size="small"
                    onChange={(e) => updateStage(index, 'endAge', Number(e.target.value))} />
                  <TextField label="Monthly Investment" type="number" value={stage.monthlyInvestment} size="small"
                    onChange={(e) => updateStage(index, 'monthlyInvestment', Number(e.target.value))} />
                </Stack>
              </Paper>
            ))}
            <Button startIcon={<Add />} onClick={addStage} variant="outlined" size="small" fullWidth>Add Stage</Button>
          </Box>

          <Divider sx={{ my: 2 }} />

          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 1, fontSize: '0.9rem' }}>💰 Lump Sum Investments</Typography>
            {lumpSums.map((ls, index) => (
              <Paper key={index} sx={{ p: 1.5, mb: 1.5, bgcolor: 'warning.50' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="subtitle2">Lump Sum {index + 1}</Typography>
                  <IconButton size="small" color="error" onClick={() => removeLumpSum(index)}>
                    <Delete fontSize="small" />
                  </IconButton>
                </Box>
                <Stack spacing={1}>
                  <TextField label="Age" type="number" value={ls.age} size="small"
                    onChange={(e) => updateLumpSum(index, 'age', Number(e.target.value))} />
                  <TextField label="Amount" type="number" value={ls.amount} size="small"
                    onChange={(e) => updateLumpSum(index, 'amount', Number(e.target.value))} />
                  <TextField label="Description" value={ls.description} size="small"
                    onChange={(e) => updateLumpSum(index, 'description', e.target.value)} />
                </Stack>
              </Paper>
            ))}
            <Button startIcon={<Add />} onClick={addLumpSum} variant="outlined" size="small" fullWidth>Add Lump Sum</Button>
          </Box>
        </Card>
      </Box>

      {/* Chart Panel */}
      <Box sx={{ flex: 1 }}>
        <Card elevation={2} sx={{ p: 3, height: '100%' }}>
          {results && chartData ? (
            <>
              <Box sx={{ height: 400, mb: 3 }}>
                <Line data={chartData} options={chartOptions} />
              </Box>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <Paper sx={{ p: 2, bgcolor: 'success.50' }}>
                    <Typography variant="subtitle2">Dynamic Plan</Typography>
                    <Typography variant="h6">{formatCurrency(results.finalDynamic)}</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Paper sx={{ p: 2, bgcolor: 'warning.50' }}>
                    <Typography variant="subtitle2">Barista FIRE (switch at {results.optimalBaristaAge?.toFixed(1) || 'N/A'})</Typography>
                    <Typography variant="h6">{formatCurrency(results.finalBarista)}</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Paper sx={{ p: 2, bgcolor: 'info.50' }}>
                    <Typography variant="subtitle2">Coast FIRE (switch at {results.optimalCoastAge?.toFixed(1) || 'N/A'})</Typography>
                    <Typography variant="h6">{formatCurrency(results.finalCoast)}</Typography>
                  </Paper>
                </Grid>
              </Grid>
            </>
          ) : (
            <Alert severity="info">Adjust parameters to see projections</Alert>
          )}
        </Card>
      </Box>
    </Box>
  );
};
