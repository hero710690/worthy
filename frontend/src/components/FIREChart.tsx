/**
 * FIRE Chart Component - Shows Traditional, Coast, and Barista FIRE projections
 * 
 * This chart displays the portfolio growth over time for all three FIRE types,
 * similar to the coast-fire-calculator visualization.
 */

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { Box, Typography, Card, CardContent, useTheme } from '@mui/material';

interface FIREChartProps {
  parameters: {
    currentAge: number;
    retireAge: number;
    pmtMonthly: number;
    rate: number;
    fireNumber: number;
    principal: number;
    pmtMonthlyBarista: number;
  };
  formatCurrency: (amount: number) => string;
}

interface ChartDataPoint {
  age: number;
  year: number;
  traditional: number;
  coast: number;
  barista: number;
  fireTarget: number;
}

export const FIREChart: React.FC<FIREChartProps> = ({ parameters, formatCurrency }) => {
  const theme = useTheme();
  
  // Generate chart data
  const generateChartData = (): ChartDataPoint[] => {
    const data: ChartDataPoint[] = [];
    const { currentAge, retireAge, pmtMonthly, rate, fireNumber, principal, pmtMonthlyBarista } = parameters;
    
    console.log('🔍 Chart Parameters:', { currentAge, retireAge, pmtMonthly, rate, fireNumber, principal, pmtMonthlyBarista });
    
    const annualRate = rate / 100; // Convert percentage to decimal
    const startAge = currentAge;
    const endAge = 75; // Fixed end age at 75 instead of 85
    const safeWithdrawalRate = 0.04; // 4% safe withdrawal rate
    const annualWithdrawal = fireNumber * safeWithdrawalRate; // Annual withdrawal amount
    const annualContribution = pmtMonthly * 12;
    const annualBaristaContribution = pmtMonthlyBarista * 12;
    
    console.log('🔍 Calculated values:', { 
      annualRate, 
      annualWithdrawal, 
      annualContribution, 
      annualBaristaContribution 
    });
    
    // Find Coast FIRE age (when you can stop contributing and still reach FIRE by retirement)
    let coastFireAge = retireAge;
    let coastFireAmount = principal;
    
    for (let testAge = currentAge; testAge <= retireAge; testAge++) {
      const yearsContributing = testAge - currentAge;
      let testPortfolio = principal;
      
      // Add contributions for this many years
      for (let year = 0; year < yearsContributing; year++) {
        testPortfolio = testPortfolio * (1 + annualRate) + annualContribution;
      }
      
      // See if it grows to FIRE number by retirement without more contributions
      const yearsToRetirement = retireAge - testAge;
      const finalValue = testPortfolio * Math.pow(1 + annualRate, yearsToRetirement);
      
      if (finalValue >= fireNumber) {
        coastFireAge = testAge;
        coastFireAmount = testPortfolio;
        console.log(`🎯 Coast FIRE: Stop contributing at age ${testAge}, portfolio will be ${testPortfolio.toFixed(0)}`);
        break;
      }
    }
    
    // Generate data points for each age
    for (let age = startAge; age <= endAge; age++) {
      const currentYear = new Date().getFullYear() + (age - currentAge);
      
      // Calculate Traditional FIRE
      let traditionalValue = calculateTraditionalFIRE(age, currentAge, retireAge, principal, annualContribution, annualRate, fireNumber, annualWithdrawal);
      
      // Calculate Coast FIRE  
      let coastValue = calculateCoastFIRE(age, currentAge, coastFireAge, coastFireAmount, principal, annualContribution, annualRate, fireNumber, annualWithdrawal);
      
      // Calculate Barista FIRE
      let baristaValue = calculateBaristaFIRE(age, currentAge, coastFireAge, coastFireAmount, principal, annualContribution, annualBaristaContribution, annualRate, fireNumber, annualWithdrawal);
      
      data.push({
        age,
        year: currentYear,
        traditional: Math.max(0, traditionalValue),
        coast: Math.max(0, coastValue),
        barista: Math.max(0, baristaValue),
        fireTarget: fireNumber
      });
    }
    
    console.log('📊 Sample data points:');
    console.log('Age 35:', data.find(d => d.age === 35));
    console.log('Age 45:', data.find(d => d.age === 45));
    console.log('Age 65:', data.find(d => d.age === 65));
    
    return data;
  };
  
  // Helper function for Traditional FIRE calculation
  const calculateTraditionalFIRE = (age: number, currentAge: number, retireAge: number, principal: number, annualContribution: number, annualRate: number, fireNumber: number, annualWithdrawal: number): number => {
    if (age === currentAge) return principal;
    
    let portfolio = principal;
    let fireAchievedAge = null;
    
    // Build portfolio year by year
    for (let yearAge = currentAge + 1; yearAge <= age; yearAge++) {
      if (fireAchievedAge === null) {
        // Still building up to FIRE
        if (yearAge <= retireAge) {
          // Add contributions until retirement
          portfolio = portfolio * (1 + annualRate) + annualContribution;
        } else {
          // Past retirement, no contributions
          portfolio = portfolio * (1 + annualRate);
        }
        
        // Check if FIRE achieved
        if (portfolio >= fireNumber) {
          fireAchievedAge = yearAge;
          console.log(`🎯 Traditional FIRE achieved at age ${fireAchievedAge}`);
        }
      } else {
        // FIRE achieved, start withdrawing
        portfolio = portfolio * (1 + annualRate) - annualWithdrawal;
      }
    }
    
    return portfolio;
  };
  
  // Helper function for Coast FIRE calculation
  const calculateCoastFIRE = (age: number, currentAge: number, coastFireAge: number, coastFireAmount: number, principal: number, annualContribution: number, annualRate: number, fireNumber: number, annualWithdrawal: number): number => {
    if (age === currentAge) return principal;
    
    let portfolio = principal;
    let fireAchievedAge = null;
    
    // Build portfolio year by year
    for (let yearAge = currentAge + 1; yearAge <= age; yearAge++) {
      if (fireAchievedAge === null) {
        // Still building up to FIRE
        if (yearAge <= coastFireAge) {
          // Add contributions until coast age
          portfolio = portfolio * (1 + annualRate) + annualContribution;
        } else {
          // Past coast age, no contributions
          portfolio = portfolio * (1 + annualRate);
        }
        
        // Check if FIRE achieved
        if (portfolio >= fireNumber) {
          fireAchievedAge = yearAge;
          console.log(`🎯 Coast FIRE achieved at age ${fireAchievedAge}`);
        }
      } else {
        // FIRE achieved, start withdrawing
        portfolio = portfolio * (1 + annualRate) - annualWithdrawal;
      }
    }
    
    return portfolio;
  };
  
  // Helper function for Barista FIRE calculation
  const calculateBaristaFIRE = (age: number, currentAge: number, coastFireAge: number, coastFireAmount: number, principal: number, annualContribution: number, annualBaristaContribution: number, annualRate: number, fireNumber: number, annualWithdrawal: number): number => {
    if (age === currentAge) return principal;
    
    let portfolio = principal;
    let fireAchievedAge = null;
    
    // Build portfolio year by year
    for (let yearAge = currentAge + 1; yearAge <= age; yearAge++) {
      if (fireAchievedAge === null) {
        // Still building up to FIRE
        if (yearAge <= coastFireAge) {
          // Full contributions until coast age
          portfolio = portfolio * (1 + annualRate) + annualContribution;
        } else {
          // Reduced barista contributions after coast age
          portfolio = portfolio * (1 + annualRate) + annualBaristaContribution;
        }
        
        // Check if FIRE achieved
        if (portfolio >= fireNumber) {
          fireAchievedAge = yearAge;
          console.log(`🎯 Barista FIRE achieved at age ${fireAchievedAge}`);
        }
      } else {
        // FIRE achieved, start withdrawing
        portfolio = portfolio * (1 + annualRate) - annualWithdrawal;
      }
    }
    
    return portfolio;
  };
  
  const chartData = generateChartData();
  
  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <Card sx={{ p: 2, maxWidth: 300 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Age {label} ({payload[0]?.payload?.year})
          </Typography>
          {payload.map((entry: any, index: number) => (
            <Typography
              key={index}
              variant="body2"
              sx={{ color: entry.color, fontWeight: 'bold' }}
            >
              {entry.name}: {formatCurrency(entry.value)}
            </Typography>
          ))}
        </Card>
      );
    }
    return null;
  };
  
  return (
    <Card elevation={2} sx={{ mt: 3 }}>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
          🔥 FIRE Projection Chart
        </Typography>
        
        <Box sx={{ width: '100%', height: '500px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 20,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
              <XAxis 
                dataKey="age" 
                stroke={theme.palette.text.secondary}
                tick={{ fontSize: 12 }}
                domain={[parameters.currentAge, 75]}
                type="number"
                scale="linear"
              />
              <YAxis 
                stroke={theme.palette.text.secondary}
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => formatCurrency(value).replace(/\.\d+/, '')}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              
              {/* FIRE Target Line */}
              <ReferenceLine 
                y={parameters.fireNumber} 
                stroke={theme.palette.error.main}
                strokeDasharray="5 5"
                label={{ value: "FIRE Target", position: "topRight" }}
              />
              
              {/* Retirement Age Line */}
              <ReferenceLine 
                x={parameters.retireAge} 
                stroke={theme.palette.warning.main}
                strokeDasharray="3 3"
                label={{ value: "Retirement", position: "topLeft" }}
              />
              
              {/* Traditional FIRE Line */}
              <Line
                type="monotone"
                dataKey="traditional"
                stroke={theme.palette.primary.main}
                strokeWidth={3}
                name="🎯 Traditional FIRE"
                dot={false}
                activeDot={{ r: 6 }}
              />
              
              {/* Coast FIRE Line */}
              <Line
                type="monotone"
                dataKey="coast"
                stroke={theme.palette.info.main}
                strokeWidth={3}
                name="🏖️ Coast FIRE"
                dot={false}
                activeDot={{ r: 6 }}
              />
              
              {/* Barista FIRE Line */}
              <Line
                type="monotone"
                dataKey="barista"
                stroke={theme.palette.warning.main}
                strokeWidth={3}
                name="☕ Barista FIRE"
                dot={false}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Box>
        
        <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
          This chart shows how your portfolio would grow under different FIRE strategies, including withdrawals after reaching FIRE. 
          Traditional FIRE continues full contributions until retirement or FIRE achievement. Coast FIRE stops contributions 
          once you reach the coast number. Barista FIRE reduces to part-time contributions after reaching the coast number.
          After achieving FIRE, the chart shows portfolio decline due to 4% annual withdrawals for living expenses.
        </Typography>
      </CardContent>
    </Card>
  );
};
