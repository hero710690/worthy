/**
 * Enhanced FIRE Chart Component - Shows Traditional, Coast, and Barista FIRE projections
 * 
 * This chart displays the portfolio growth over time for all three FIRE types,
 * similar to the coast-fire-calculator visualization, with enhanced withdrawal visualization
 * during retirement period based on the user's specified withdrawal rate.
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
  ReferenceLine,
  Area,
  ComposedChart
} from 'recharts';
import { Box, Typography, Card, CardContent, useTheme, Alert, Grid } from '@mui/material';

interface FIREChartProps {
  parameters: {
    currentAge: number;
    retireAge: number;
    pmtMonthly: number;
    rate: number;
    fireNumber: number;
    principal: number;
    pmtMonthlyBarista: number;
    withdrawalRate: number; // Add withdrawal rate parameter
  };
  formatCurrency: (amount: number) => string;
}

interface ChartDataPoint {
  age: number;
  year: number;
  month?: number; // Optional month for more precise data points
  traditional: number;
  coast: number;
  barista: number;
  fireTarget: number;
  // Enhanced withdrawal visualization
  traditionalPhase: 'accumulation' | 'withdrawal';
  coastPhase: 'accumulation' | 'coasting' | 'withdrawal';
  baristaPhase: 'accumulation' | 'barista' | 'withdrawal';
  // Annual withdrawal amount for reference
  annualWithdrawal: number;
}

export const FIREChart: React.FC<FIREChartProps> = ({ parameters, formatCurrency }) => {
  const theme = useTheme();
  const [coastFireAge, setCoastFireAge] = React.useState<number>(parameters.retireAge);
  const [baristaFireAge, setBaristaFireAge] = React.useState<number>(parameters.retireAge);
  const [chartData, setChartData] = React.useState<ChartDataPoint[]>([]);
  const [hoveredData, setHoveredData] = React.useState<ChartDataPoint | null>(null);
  
  // Generate chart data when parameters change
  React.useEffect(() => {
    try {
      // Extract parameters
      const { currentAge, retireAge, pmtMonthly, rate, fireNumber, principal, pmtMonthlyBarista, withdrawalRate } = parameters;
      const annualRate = rate / 100;
      const annualContribution = pmtMonthly * 12;
      const annualBaristaContribution = pmtMonthlyBarista * 12;
      const safeWithdrawalRate = (withdrawalRate || 4.0) / 100;
      const annualWithdrawal = fireNumber * safeWithdrawalRate;
      
      console.log('🔥 Enhanced FIRE Chart Parameters:', {
        currentAge, retireAge, pmtMonthly, rate, fireNumber, principal, 
        pmtMonthlyBarista, withdrawalRate, annualWithdrawal
      });
      
      // 🔧 SIMPLIFIED: Use simple, reliable switch point calculation
      console.log('🔥 Enhanced FIRE Chart Parameters:', {
        currentAge, retireAge, pmtMonthly, rate, fireNumber, principal, 
        pmtMonthlyBarista, withdrawalRate, annualWithdrawal
      });
      
      // Calculate Coast FIRE age - simple and reliable
      let coastAge = retireAge;
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
          coastAge = testAge;
          console.log(`🏖️ Coast FIRE: Stop contributing at age ${testAge}, portfolio will grow to ${finalValue.toFixed(0)} by retirement`);
          break;
        }
      }
      
      // Calculate Barista FIRE age - simple and reliable
      let baristaAge = retireAge;
      for (let testAge = currentAge; testAge <= retireAge; testAge++) {
        const yearsContributing = testAge - currentAge;
        let testPortfolio = principal;
        
        // Add full contributions until test age
        for (let year = 0; year < yearsContributing; year++) {
          testPortfolio = testPortfolio * (1 + annualRate) + annualContribution;
        }
        
        // Then add reduced contributions until retirement
        let projectedPortfolio = testPortfolio;
        const yearsToRetirement = retireAge - testAge;
        
        for (let year = 0; year < yearsToRetirement; year++) {
          projectedPortfolio = projectedPortfolio * (1 + annualRate) + annualBaristaContribution;
        }
        
        if (projectedPortfolio >= fireNumber) {
          baristaAge = testAge;
          console.log(`☕ Barista FIRE: Switch to part-time at age ${testAge}, portfolio will grow to ${projectedPortfolio.toFixed(0)} by retirement`);
          break;
        }
      }
      
      // 🔧 VALIDATION: Ensure consistency with FIRE Targets calculator
      console.log('🔍 Chart vs Calculator Consistency Check:');
      console.log('Chart Coast Switch Age:', coastAge);
      console.log('Chart Barista Switch Age:', baristaAge);
      console.log('Parameters used:', {
        currentAge, retireAge, pmtMonthly, pmtMonthlyBarista, 
        fireNumber, principal, rate: annualRate
      });
      
      // Update state with calculated ages
      setCoastFireAge(coastAge);
      setBaristaFireAge(baristaAge);
      
      // Generate enhanced chart data with withdrawal visualization
      const data: ChartDataPoint[] = [];
      const startAge = currentAge;
      const endAge = Math.max(85, retireAge + 20); // Show at least 20 years of retirement
      
      // Convert to monthly rates for more precise calculations
      const monthlyRate = annualRate / 12;
      const monthlyContribution = annualContribution / 12;
      const monthlyBaristaContribution = annualBaristaContribution / 12;
      const monthlyWithdrawal = annualWithdrawal / 12;
      
      // Track when each FIRE type is achieved and withdrawal phases
      let traditionalFireAchieved = false;
      let coastFireAchieved = false;
      let baristaFireAchieved = false;
      
      let traditionalFireAge = retireAge;
      let coastFireAchievedAge = retireAge;
      let baristaFireAchievedAge = retireAge;
      
      // Initialize portfolio values
      let traditionalPortfolio = principal;
      let coastPortfolio = principal;
      let baristaPortfolio = principal;
      
      // Generate data points for each month, but only add every 3rd month to keep chart size manageable
      for (let monthOffset = 0; monthOffset <= (endAge - startAge) * 12; monthOffset++) {
        // Calculate age with decimal precision (e.g., 30.25 for 30 years and 3 months)
        const ageWithPrecision = startAge + (monthOffset / 12);
        const currentYear = new Date().getFullYear() + ((ageWithPrecision - currentAge));
        const month = monthOffset % 12;
        
        // Skip the first month (initial value)
        if (monthOffset > 0) {
          // Traditional FIRE: Apply growth first
          traditionalPortfolio *= (1 + monthlyRate);
          
          // Add contributions until retirement if not yet achieved FIRE
          if (!traditionalFireAchieved && ageWithPrecision <= retireAge) {
            traditionalPortfolio += monthlyContribution;
          }
          
          // Check if Traditional FIRE achieved (after growth and contributions)
          if (!traditionalFireAchieved && traditionalPortfolio >= fireNumber) {
            traditionalFireAchieved = true;
            traditionalFireAge = ageWithPrecision;
            console.log(`🎯 Traditional FIRE achieved at age ${traditionalFireAge.toFixed(2)} with portfolio ${traditionalPortfolio.toFixed(0)}`);
          }
          
          // 🔧 FIXED: Only apply withdrawals if FIRE was achieved in a previous period
          // This prevents withdrawals in the same month FIRE is achieved
          if (traditionalFireAchieved && ageWithPrecision > traditionalFireAge + 0.25) { // Wait at least 3 months after achieving FIRE
            traditionalPortfolio -= monthlyWithdrawal;
          }
          
          // Coast FIRE: Apply growth first
          coastPortfolio *= (1 + monthlyRate);
          
          // Add contributions until coast age (regardless of FIRE achievement)
          if (ageWithPrecision <= coastAge) {
            coastPortfolio += monthlyContribution;
          }
          // After coast age: NO contributions, just growth until retirement
          
          // Check if Coast FIRE target is achieved (for tracking purposes)
          if (!coastFireAchieved && coastPortfolio >= fireNumber) {
            coastFireAchieved = true;
            coastFireAchievedAge = ageWithPrecision;
            console.log(`🏖️ Coast FIRE target reached at age ${coastFireAchievedAge.toFixed(2)} with portfolio ${coastPortfolio.toFixed(0)}`);
          }
          
          // 🔧 ENHANCED: Allow early retirement if FIRE achieved before planned retirement
          if (ageWithPrecision >= retireAge || (coastFireAchieved && ageWithPrecision >= coastFireAchievedAge + 1)) {
            coastPortfolio -= monthlyWithdrawal;
          }
          
          // Barista FIRE: Apply growth first
          baristaPortfolio *= (1 + monthlyRate);
          
          // Add contributions based on strategy (regardless of FIRE achievement)
          if (ageWithPrecision <= baristaAge) {
            // Full contributions until barista age
            baristaPortfolio += monthlyContribution;
          } else if (ageWithPrecision < retireAge) {
            // Reduced barista contributions after barista age until retirement
            baristaPortfolio += monthlyBaristaContribution;
          }
          // After retirement age: NO contributions
          
          // Check if Barista FIRE target is achieved (for tracking purposes)
          if (!baristaFireAchieved && baristaPortfolio >= fireNumber) {
            baristaFireAchieved = true;
            baristaFireAchievedAge = ageWithPrecision;
            console.log(`☕ Barista FIRE target reached at age ${baristaFireAchievedAge.toFixed(2)} with portfolio ${baristaPortfolio.toFixed(0)}`);
          }
          
          // 🔧 ENHANCED: Allow early retirement if FIRE achieved before planned retirement
          if (ageWithPrecision >= retireAge || (baristaFireAchieved && ageWithPrecision >= baristaFireAchievedAge + 1)) {
            baristaPortfolio -= monthlyWithdrawal;
          }
        }
        
        // Only add data points for each quarter to keep chart size manageable
        if (monthOffset % 3 === 0) {
          // Determine phases for each strategy (accounting for early FIRE achievement)
          const traditionalPhase: 'accumulation' | 'withdrawal' = 
            (traditionalFireAchieved && ageWithPrecision > traditionalFireAge + 0.25) ? 'withdrawal' : 'accumulation';
          
          // 🔧 ENHANCED: Coast FIRE phases with early retirement option
          const coastPhase: 'accumulation' | 'coasting' | 'withdrawal' = 
            (ageWithPrecision >= retireAge || (coastFireAchieved && ageWithPrecision >= coastFireAchievedAge + 1)) ? 'withdrawal' : 
            (ageWithPrecision > coastAge ? 'coasting' : 'accumulation');
          
          // 🔧 ENHANCED: Barista FIRE phases with early retirement option
          const baristaPhase: 'accumulation' | 'barista' | 'withdrawal' = 
            (ageWithPrecision >= retireAge || (baristaFireAchieved && ageWithPrecision >= baristaFireAchievedAge + 1)) ? 'withdrawal' : 
            (ageWithPrecision > baristaAge ? 'barista' : 'accumulation');
          
          data.push({
            age: parseFloat(ageWithPrecision.toFixed(2)),
            year: Math.floor(currentYear),
            month: month,
            traditional: Math.max(0, traditionalPortfolio),
            coast: Math.max(0, coastPortfolio),
            barista: Math.max(0, baristaPortfolio),
            fireTarget: fireNumber,
            traditionalPhase,
            coastPhase,
            baristaPhase,
            annualWithdrawal
          });
        }
      }
      
      console.log('📊 Enhanced Chart Data Sample:');
      console.log('Data length:', data.length);
      console.log('Current Age:', data.find(d => Math.abs(d.age - currentAge) < 0.5));
      console.log('Mid-career:', data.find(d => Math.abs(d.age - (currentAge + retireAge) / 2) < 0.5));
      console.log('Retirement:', data.find(d => Math.abs(d.age - retireAge) < 0.5));
      console.log('Late retirement:', data.find(d => Math.abs(d.age - (retireAge + 10)) < 0.5));
      
      // 🔧 ADDED: Ensure we have valid data before setting
      if (data.length > 0) {
        // 🔧 SIMPLIFIED: Basic validation without complex calculator comparison
      console.log('📊 Chart Data Generated Successfully:');
      console.log('Data points:', data.length);
      console.log('Switch Ages - Coast:', coastAge, 'Barista:', baristaAge);
      
      if (data.length > 0) {
        setChartData(data);
        console.log('✅ Chart data set successfully with', data.length, 'points');
      } else {
        console.error('❌ No chart data generated!');
      }
        console.log('✅ Chart data set successfully with', data.length, 'points');
      } else {
        console.error('❌ No chart data generated!');
      }
    } catch (error) {
      console.error("Error in Enhanced FIREChart useEffect:", error);
      // 🔧 ADDED: Fallback chart data to prevent blank page
      const fallbackData = [];
      const startAge = parameters.currentAge;
      const endAge = parameters.retireAge + 10;
      
      for (let age = startAge; age <= endAge; age++) {
        fallbackData.push({
          age,
          year: new Date().getFullYear() + (age - startAge),
          month: 0,
          traditional: parameters.principal * Math.pow(1.05, age - startAge),
          coast: parameters.principal * Math.pow(1.05, age - startAge),
          barista: parameters.principal * Math.pow(1.05, age - startAge),
          traditionalPhase: 'accumulation' as const,
          coastPhase: 'accumulation' as const,
          baristaPhase: 'accumulation' as const
        });
      }
      
      console.log('🔧 Using fallback chart data with', fallbackData.length, 'points');
      setChartData(fallbackData);
    }
  }, [parameters]);
  
  const generateChartData = () => {
    let localCoastFireAge = parameters.retireAge;
    let localBaristaFireAge = parameters.retireAge;
    const data: ChartDataPoint[] = [];
    const { currentAge, retireAge, pmtMonthly, rate, fireNumber, principal, pmtMonthlyBarista } = parameters;
    
    console.log('🔍 Chart Parameters:', { currentAge, retireAge, pmtMonthly, rate, fireNumber, principal, pmtMonthlyBarista });
    
    const annualRate = rate / 100; // Convert percentage to decimal
    const startAge = currentAge;
    const endAge = 75; // Fixed end age at 75 instead of 85
    const withdrawalRate = parameters.withdrawalRate || 4.0; // Use provided withdrawal rate or default to 4%
    const safeWithdrawalRate = withdrawalRate / 100; // Convert percentage to decimal
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
    
    // Find Barista FIRE age (when you can switch to reduced contributions and still reach FIRE)
    let baristaFireAge = retireAge;
    let baristaFireAmount = principal;
    
    for (let testAge = currentAge; testAge <= retireAge; testAge++) {
      const yearsContributing = testAge - currentAge;
      let testPortfolio = principal;
      
      // Add full contributions until test age
      for (let year = 0; year < yearsContributing; year++) {
        testPortfolio = testPortfolio * (1 + annualRate) + annualContribution;
      }
      
      // Then add reduced contributions until retirement
      let projectedPortfolio = testPortfolio;
      const yearsToRetirement = retireAge - testAge;
      
      for (let year = 0; year < yearsToRetirement; year++) {
        projectedPortfolio = projectedPortfolio * (1 + annualRate) + annualBaristaContribution;
      }
      
      if (projectedPortfolio >= fireNumber) {
        baristaFireAge = testAge;
        baristaFireAmount = testPortfolio;
        console.log(`☕ Barista FIRE: Switch to reduced contributions at age ${testAge}, portfolio will be ${testPortfolio.toFixed(0)}`);
        break;
      }
    }
    
    // Generate data points with monthly precision
    // Convert to monthly rates for more precise calculations
    const monthlyRate = annualRate / 12;
    const monthlyContribution = annualContribution / 12;
    const monthlyBaristaContribution = annualBaristaContribution / 12;
    const monthlyWithdrawal = annualWithdrawal / 12;
    
    // Generate data points for each month, but only add every 3rd month to keep chart size manageable
    for (let monthOffset = 0; monthOffset <= (endAge - startAge) * 12; monthOffset++) {
      // Calculate age with decimal precision (e.g., 30.25 for 30 years and 3 months)
      const ageWithPrecision = startAge + (monthOffset / 12);
      const currentYear = new Date().getFullYear() + ((ageWithPrecision - currentAge));
      const month = monthOffset % 12;
      
      // Only add data points for each quarter to keep chart size manageable
      if (monthOffset % 3 === 0) {
        // Calculate portfolio values for each strategy
        // Traditional FIRE: Full contributions until retirement
        let traditionalValue = calculateTraditionalFIREMonthly(
          monthOffset, currentAge, retireAge, principal, monthlyContribution, 
          monthlyRate, fireNumber, monthlyWithdrawal
        );
        
        // Coast FIRE: Contributions until coast age, then no contributions
        let coastValue = calculateCoastFIREMonthly(
          monthOffset, currentAge, coastFireAge, principal, monthlyContribution, 
          monthlyRate, fireNumber, monthlyWithdrawal
        );
        
        // Barista FIRE: Full contributions until barista age, then reduced contributions
        let baristaValue = calculateBaristaFIREMonthly(
          monthOffset, currentAge, baristaFireAge, principal, monthlyContribution, 
          monthlyBaristaContribution, monthlyRate, fireNumber, monthlyWithdrawal
        );
        
        data.push({
          age: parseFloat(ageWithPrecision.toFixed(2)),
          year: Math.floor(currentYear),
          month: month,
          traditional: Math.max(0, traditionalValue),
          coast: Math.max(0, coastValue),
          barista: Math.max(0, baristaValue),
          fireTarget: fireNumber
        });
      }
    }
    
    console.log('📊 Sample data points:');
    console.log('Age 35:', data.find(d => d.age === 35));
    console.log('Age 45:', data.find(d => d.age === 45));
    console.log('Age 65:', data.find(d => d.age === 65));
    
    return data;
  };
  
  // Helper function for Traditional FIRE calculation with monthly precision
  const calculateTraditionalFIREMonthly = (
    monthOffset: number, 
    currentAge: number, 
    retireAge: number, 
    principal: number, 
    monthlyContribution: number, 
    monthlyRate: number, 
    fireNumber: number, 
    monthlyWithdrawal: number
  ): number => {
    if (monthOffset === 0) return principal;
    
    // Convert ages to months for more precise calculations
    const currentAgeInMonths = currentAge * 12;
    const retireAgeInMonths = retireAge * 12;
    const currentMonth = currentAgeInMonths + monthOffset;
    
    let portfolio = principal;
    let fireAchieved = false;
    
    // Build portfolio month by month
    for (let month = currentAgeInMonths + 1; month <= currentMonth; month++) {
      // Apply growth first
      portfolio = portfolio * (1 + monthlyRate);
      
      // Add contributions until retirement if not yet achieved FIRE
      if (!fireAchieved && month <= retireAgeInMonths) {
        portfolio += monthlyContribution;
      }
      
      // Check if FIRE achieved
      if (!fireAchieved && portfolio >= fireNumber) {
        fireAchieved = true;
        const ageAtAchievement = currentAge + ((month - currentAgeInMonths) / 12);
        console.log(`🎯 Traditional FIRE achieved at age ${ageAtAchievement.toFixed(2)}`);
      }
      
      // Apply withdrawals after achieving FIRE
      if (fireAchieved) {
        portfolio -= monthlyWithdrawal;
      }
    }
    
    return portfolio;
  };
  
  // Helper function for Coast FIRE calculation with monthly precision
  const calculateCoastFIREMonthly = (
    monthOffset: number, 
    currentAge: number, 
    coastFireAge: number, 
    principal: number, 
    monthlyContribution: number, 
    monthlyRate: number, 
    fireNumber: number, 
    monthlyWithdrawal: number
  ): number => {
    if (monthOffset === 0) return principal;
    
    // Convert ages to months for more precise calculations
    const currentAgeInMonths = currentAge * 12;
    const coastFireAgeInMonths = coastFireAge * 12;
    const currentMonth = currentAgeInMonths + monthOffset;
    
    let portfolio = principal;
    let fireAchieved = false;
    
    // Build portfolio month by month
    for (let month = currentAgeInMonths + 1; month <= currentMonth; month++) {
      // Apply growth first
      portfolio = portfolio * (1 + monthlyRate);
      
      // Add contributions until coast age if not yet achieved FIRE
      if (!fireAchieved && month <= coastFireAgeInMonths) {
        portfolio += monthlyContribution;
      }
      
      // Check if FIRE achieved
      if (!fireAchieved && portfolio >= fireNumber) {
        fireAchieved = true;
        const ageAtAchievement = currentAge + ((month - currentAgeInMonths) / 12);
        console.log(`🏖️ Coast FIRE achieved at age ${ageAtAchievement.toFixed(2)}`);
      }
      
      // Apply withdrawals after achieving FIRE
      if (fireAchieved) {
        portfolio -= monthlyWithdrawal;
      }
    }
    
    return portfolio;
  };
  
  // Helper function for Barista FIRE calculation with monthly precision
  const calculateBaristaFIREMonthly = (
    monthOffset: number, 
    currentAge: number, 
    baristaFireAge: number, 
    principal: number, 
    monthlyContribution: number, 
    monthlyBaristaContribution: number, 
    monthlyRate: number, 
    fireNumber: number, 
    monthlyWithdrawal: number
  ): number => {
    if (monthOffset === 0) return principal;
    
    // Convert ages to months for more precise calculations
    const currentAgeInMonths = currentAge * 12;
    const baristaFireAgeInMonths = baristaFireAge * 12;
    const currentMonth = currentAgeInMonths + monthOffset;
    
    let portfolio = principal;
    let fireAchieved = false;
    
    // Build portfolio month by month
    for (let month = currentAgeInMonths + 1; month <= currentMonth; month++) {
      // Apply growth first
      portfolio = portfolio * (1 + monthlyRate);
      
      if (!fireAchieved) {
        // Add contributions based on strategy
        if (month <= baristaFireAgeInMonths) {
          // Full contributions until barista age
          portfolio += monthlyContribution;
        } else {
          // Reduced barista contributions after barista age
          portfolio += monthlyBaristaContribution;
        }
        
        // Check if FIRE achieved
        if (portfolio >= fireNumber) {
          fireAchieved = true;
          const ageAtAchievement = currentAge + ((month - currentAgeInMonths) / 12);
          console.log(`☕ Barista FIRE achieved at age ${ageAtAchievement.toFixed(2)}`);
        }
      } else {
        // Apply withdrawals after achieving FIRE
        portfolio -= monthlyWithdrawal;
      }
    }
    
    return portfolio;
  };
  
  // Keep the original annual functions for reference
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
  const calculateBaristaFIRE = (age: number, currentAge: number, baristaFireAge: number, coastFireAmount: number, principal: number, annualContribution: number, annualBaristaContribution: number, annualRate: number, fireNumber: number, annualWithdrawal: number): number => {
    if (age === currentAge) return principal;
    
    let portfolio = principal;
    let fireAchievedAge = null;
    
    // Build portfolio year by year
    for (let yearAge = currentAge + 1; yearAge <= age; yearAge++) {
      if (fireAchievedAge === null) {
        // Still building up to FIRE
        if (yearAge <= baristaFireAge) {
          // Full contributions until barista age
          portfolio = portfolio * (1 + annualRate) + annualContribution;
        } else {
          // Reduced barista contributions after barista age
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
  
  // Don't call generateChartData directly in render
  
  // Enhanced custom tooltip with phase information
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0]?.payload;
      setHoveredData(dataPoint); // Update hovered data for crosshair display
      
      return (
        <Card sx={{ p: 2, maxWidth: 350 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
            Age {label} ({dataPoint?.year})
          </Typography>
          
          {/* Portfolio Values */}
          {payload.map((entry: any, index: number) => (
            <Typography
              key={index}
              variant="body2"
              sx={{ color: entry.color, fontWeight: 'bold', mb: 0.5 }}
            >
              {entry.name}: {formatCurrency(entry.value)}
            </Typography>
          ))}
          
          {/* Phase Information */}
          <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
            <Typography variant="caption" sx={{ display: 'block', mb: 0.5 }}>
              <strong>Phases:</strong>
            </Typography>
            <Typography variant="caption" sx={{ display: 'block', color: 'primary.main' }}>
              🎯 Traditional: {dataPoint?.traditionalPhase === 'withdrawal' ? 'Withdrawing' : 'Accumulating'}
            </Typography>
            <Typography variant="caption" sx={{ display: 'block', color: 'info.main' }}>
              🏖️ Coast: {
                dataPoint?.coastPhase === 'withdrawal' ? 'Withdrawing (Retired)' : 
                dataPoint?.coastPhase === 'coasting' ? 'Coasting (No contributions)' : 'Accumulating'
              }
            </Typography>
            <Typography variant="caption" sx={{ display: 'block', color: 'warning.main' }}>
              ☕ Barista: {
                dataPoint?.baristaPhase === 'withdrawal' ? 'Withdrawing (Retired)' : 
                dataPoint?.baristaPhase === 'barista' ? 'Part-time work' : 'Accumulating'
              }
            </Typography>
            
            {/* Show withdrawal amount if in withdrawal phase */}
            {(dataPoint?.traditionalPhase === 'withdrawal' || 
              dataPoint?.coastPhase === 'withdrawal' || 
              dataPoint?.baristaPhase === 'withdrawal') && (
              <Typography variant="caption" sx={{ 
                display: 'block', 
                mt: 0.5, 
                color: 'error.main',
                fontWeight: 'bold'
              }}>
                💰 Annual Withdrawal: {formatCurrency(dataPoint?.annualWithdrawal || 0)}
              </Typography>
            )}
          </Box>
        </Card>
      );
    } else {
      setHoveredData(null); // Clear hovered data when not hovering
    }
    return null;
  };

  // Handle mouse leave to clear hovered data
  // Compact currency formatter for y-axis
  const formatCompactCurrency = (value: number) => {
    const absValue = Math.abs(value);
    
    if (absValue >= 1000000000) {
      return `${(value / 1000000000).toFixed(1)}B`;
    } else if (absValue >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (absValue >= 1000) {
      return `${(value / 1000).toFixed(0)}K`;
    } else {
      return value.toString();
    }
  };

  const handleMouseLeave = () => {
    setHoveredData(null);
  };
  
  return (
    <>
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
        🔥 Enhanced FIRE Projection Chart
      </Typography>
      
      {/* Withdrawal Information Alert */}
      <Alert severity="info" sx={{ mb: 2 }}>
        <Typography variant="body2">
          <strong>Withdrawal Visualization:</strong> This chart shows portfolio growth during accumulation 
          and decline during retirement. After reaching FIRE, the chart displays the impact of 
          <strong> {parameters.withdrawalRate}% annual withdrawals</strong> 
          ({formatCurrency(parameters.fireNumber * (parameters.withdrawalRate / 100))}/year) 
          for living expenses.
        </Typography>
      </Alert>
      
      <Box sx={{ 
        width: '100%', 
        height: '450px', // Fixed height for chart
          minHeight: '300px',
          maxHeight: '500px', // Prevent excessive growth
          position: 'relative'
        }}>
          {/* 🔧 ADDED: Show loading or error state if no data */}
          {chartData.length === 0 ? (
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              height: '100%',
              flexDirection: 'column',
              gap: 2
            }}>
              <Typography variant="h6" color="text.secondary">
                📊 Generating Chart Data...
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Parameters: Age {parameters.currentAge} → {parameters.retireAge}, 
                FIRE: {formatCurrency(parameters.fireNumber)}
              </Typography>
            </Box>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 60, // Increased from 20 to 60 to provide more space for legend and x-axis title
              }}
              onMouseLeave={handleMouseLeave}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={theme.palette.divider} />
              <XAxis 
                dataKey="age" 
                stroke={theme.palette.text.secondary}
                tick={{ fontSize: 12 }}
                domain={[parameters.currentAge, Math.max(85, parameters.retireAge + 20)]}
                type="number"
                scale="linear"
                tickFormatter={(value) => Math.floor(value).toString()}
                allowDecimals={true}
                interval="preserveStartEnd"
                label={{ 
                  value: "Age (Years)", 
                  position: "insideBottom", 
                  offset: -5,
                  style: { 
                    textAnchor: 'middle',
                    fontSize: 14,
                    fontWeight: 'bold',
                    fill: theme.palette.text.primary
                  }
                }}
              />
              <YAxis 
                stroke={theme.palette.text.secondary}
                tick={{ fontSize: 12 }}
                tickFormatter={formatCompactCurrency}
                domain={[0, dataMax => Math.ceil(dataMax * 1.05)]}
                allowDecimals={false}
                tickCount={12}
                width={60}
                scale="linear"
                label={{ 
                  value: "Portfolio Value", 
                  angle: -90, 
                  position: "insideLeft", 
                  offset: 10,
                  style: { 
                    textAnchor: 'middle',
                    fontSize: 14,
                    fontWeight: 'bold',
                    fill: theme.palette.text.primary
                  }
                }}
                minTickGap={8}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                verticalAlign="bottom"
                height={36}
                iconType="line"
                wrapperStyle={{
                  paddingTop: '20px', // Add padding between legend and chart
                  fontSize: '12px'
                }}
              />
              
              {/* FIRE Target Line */}
              <ReferenceLine 
                y={parameters.fireNumber} 
                stroke={theme.palette.error.main}
                strokeDasharray="5 5"
                strokeWidth={2}
                label={{ 
                  value: `🎯 FIRE Target (${formatCurrency(parameters.fireNumber)})`, 
                  position: "left",
                  offset: 10,
                  style: { 
                    fontSize: 11, 
                    fontWeight: 'bold',
                    fill: theme.palette.error.main
                  }
                }}
              />
              
              {/* Retirement Age Line */}
              <ReferenceLine 
                x={parameters.retireAge} 
                stroke={theme.palette.warning.main}
                strokeDasharray="3 3"
                strokeWidth={2}
                label={{ 
                  value: `🏁 Retirement (${parameters.retireAge})`, 
                  position: "topLeft",
                  offset: 5,
                  style: { 
                    fontSize: 11, 
                    fontWeight: 'bold',
                    fill: theme.palette.warning.main
                  }
                }}
              />
              
              {/* Traditional FIRE Achievement Line - Shows when portfolio reaches FIRE target */}
              {(() => {
                // Find the age when Traditional FIRE is achieved
                const traditionalFireAchievementPoint = chartData.find(point => 
                  point.traditional >= parameters.fireNumber
                );
                
                if (traditionalFireAchievementPoint) {
                  // Smart positioning to avoid overlap with other lines
                  const achievementAge = traditionalFireAchievementPoint.age;
                  const coastAge = coastFireAge;
                  const baristaAge = baristaFireAge;
                  const retireAge = parameters.retireAge;
                  
                  // Check proximity to other important ages
                  const isCloseToCoast = Math.abs(achievementAge - coastAge) < 4;
                  const isCloseToBarista = Math.abs(achievementAge - baristaAge) < 4;
                  const isCloseToRetirement = Math.abs(achievementAge - retireAge) < 4;
                  
                  // Check if achievement happens near the FIRE target value (potential overlap with horizontal line)
                  const achievementValue = traditionalFireAchievementPoint.traditional;
                  const fireTargetValue = parameters.fireNumber;
                  const isNearFireTarget = Math.abs(achievementValue - fireTargetValue) < (fireTargetValue * 0.1); // Within 10% of target
                  
                  // Position to the right, but adjust both horizontal and vertical position to avoid overlaps
                  let labelPosition = "right";
                  let yOffset = 0;
                  
                  // If near FIRE target line, move the text down to avoid overlap with horizontal target line
                  if (isNearFireTarget) {
                    yOffset = 25; // Move down to clear the horizontal FIRE target line
                  }
                  
                  // Additional adjustments based on proximity to vertical lines
                  if (isCloseToCoast || isCloseToBarista || isCloseToRetirement) {
                    if (isCloseToCoast && coastAge < achievementAge) {
                      yOffset = Math.max(yOffset, -20); // Move up if coast line is to the left, but not if already moved down for target
                    } else if (isCloseToBarista && baristaAge < achievementAge) {
                      yOffset = Math.max(yOffset, 20); // Move down if barista line is to the left
                    } else if (isCloseToRetirement && retireAge > achievementAge) {
                      yOffset = Math.min(yOffset, -15); // Move up if retirement line is to the right, but not if already moved down for target
                    }
                  }
                  
                  return (
                    <ReferenceLine 
                      x={traditionalFireAchievementPoint.age} 
                      stroke={theme.palette.success.main}
                      strokeDasharray="2 2"
                      strokeWidth={3}
                      label={{ 
                        value: `🎉 FIRE Achieved (${traditionalFireAchievementPoint.age.toFixed(1)})`, 
                        position: labelPosition as any,
                        offset: 15,
                        style: {
                          fontSize: 11,
                          fontWeight: 'bold',
                          fill: theme.palette.success.main,
                          transform: yOffset !== 0 ? `translateY(${yOffset}px)` : undefined
                        }
                      }}
                    />
                  );
                }
                return null;
              })()}
              
              {/* Coast FIRE Switch Point Line */}
              <ReferenceLine 
                x={coastFireAge} 
                stroke={theme.palette.info.main}
                strokeDasharray="3 3"
                strokeWidth={2}
                label={{ 
                  value: `🏖️ Coast Switch (${coastFireAge.toFixed(0)})`, 
                  position: "insideTopLeft",
                  offset: 5,
                  style: {
                    fontSize: 11,
                    fontWeight: 'bold',
                    fill: theme.palette.info.main
                  }
                }}
              />
              
              {/* Barista FIRE Switch Point Line */}
              {baristaFireAge !== coastFireAge && (
                <ReferenceLine 
                  x={baristaFireAge} 
                  stroke={theme.palette.warning.main}
                  strokeDasharray="3 3"
                  strokeWidth={2}
                  label={{ 
                    value: `☕ Barista Switch (${baristaFireAge.toFixed(0)})`, 
                    position: "insideBottomLeft",
                    offset: 5,
                    style: {
                      fontSize: 11,
                      fontWeight: 'bold',
                      fill: theme.palette.warning.main
                    }
                  }}
                />
              )}
              
              {/* Traditional FIRE Line with Achievement Marker */}
              <Line
                type="monotone"
                dataKey="traditional"
                stroke={theme.palette.primary.main}
                strokeWidth={3}
                name="🎯 Traditional FIRE"
                dot={(props: any) => {
                  // Add a special dot when Traditional FIRE is achieved
                  const { cx, cy, payload } = props;
                  if (payload && payload.traditional >= parameters.fireNumber) {
                    const isFirstAchievement = chartData.findIndex(point => 
                      point.traditional >= parameters.fireNumber
                    ) === chartData.findIndex(point => point.age === payload.age);
                    
                    if (isFirstAchievement) {
                      return (
                        <circle
                          cx={cx}
                          cy={cy}
                          r={5}
                          fill={theme.palette.success.main}
                          stroke={theme.palette.success.dark}
                          strokeWidth={1.5}
                        />
                      );
                    }
                  }
                  return null;
                }}
                activeDot={{ r: 6 }}
                connectNulls={false}
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
                connectNulls={false}
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
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
          )}
        </Box>
        
        {/* Interactive Crosshair Display - Similar to coast-fire-calculator */}
        {hoveredData && (
          <Box sx={{ 
            mt: 2, 
            p: 2, 
            bgcolor: 'primary.50', 
            borderRadius: 1,
            border: '2px solid',
            borderColor: 'primary.main'
          }}>
            <Typography variant="h6" sx={{ mb: 1, color: 'primary.main', fontWeight: 'bold' }}>
              📊 Interactive Data Point
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                  Age: {hoveredData.age} ({hoveredData.year})
                </Typography>
                <Typography variant="body2">
                  🎯 Traditional: {formatCurrency(hoveredData.traditional)}
                </Typography>
                <Typography variant="body2">
                  🏖️ Coast: {formatCurrency(hoveredData.coast)}
                </Typography>
                <Typography variant="body2">
                  ☕ Barista: {formatCurrency(hoveredData.barista)}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                  Current Phases:
                </Typography>
                <Typography variant="caption" sx={{ display: 'block' }}>
                  🎯 Traditional: {hoveredData.traditionalPhase === 'withdrawal' ? 'Withdrawing' : 'Accumulating'}
                </Typography>
                <Typography variant="caption" sx={{ display: 'block' }}>
                  🏖️ Coast: {
                    hoveredData.coastPhase === 'withdrawal' ? 'Withdrawing (Retired)' : 
                    hoveredData.coastPhase === 'coasting' ? 'Coasting (No contributions)' : 'Accumulating'
                  }
                </Typography>
                <Typography variant="caption" sx={{ display: 'block' }}>
                  ☕ Barista: {
                    hoveredData.baristaPhase === 'withdrawal' ? 'Withdrawing (Retired)' : 
                    hoveredData.baristaPhase === 'barista' ? 'Part-time work' : 'Accumulating'
                  }
                </Typography>
                {(hoveredData.traditionalPhase === 'withdrawal' || 
                  hoveredData.coastPhase === 'withdrawal' || 
                  hoveredData.baristaPhase === 'withdrawal') && (
                  <Typography variant="caption" sx={{ 
                    display: 'block', 
                    mt: 0.5, 
                    color: 'error.main',
                    fontWeight: 'bold'
                  }}>
                    💰 Annual Withdrawal: {formatCurrency(hoveredData.annualWithdrawal)}
                  </Typography>
                )}
              </Grid>
            </Grid>
          </Box>
        )}
        
        {/* Enhanced description with withdrawal information */}
        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            <strong>Chart Explanation:</strong>
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
            • <strong>🎯 Traditional FIRE:</strong> Full contributions until FIRE achievement or retirement, then {parameters.withdrawalRate}% annual withdrawals
            {(() => {
              const traditionalFireAchievementPoint = chartData.find(point => 
                point.traditional >= parameters.fireNumber
              );
              if (traditionalFireAchievementPoint) {
                return (
                  <span style={{ color: theme.palette.success.main, fontWeight: 'bold' }}>
                    {' '}(🎉 Achieved at age {traditionalFireAchievementPoint.age.toFixed(1)})
                  </span>
                );
              }
              return null;
            })()}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
            • <strong>🏖️ Coast FIRE:</strong> Stop contributions at age {coastFireAge.toFixed(0)}, coast with growth only until retirement, then withdraw
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
            • <strong>☕ Barista FIRE:</strong> Switch to part-time contributions at age {baristaFireAge.toFixed(0)}, continue until retirement, then withdraw
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, fontWeight: 'bold' }}>
            💰 Annual Withdrawal: {formatCurrency(parameters.fireNumber * (parameters.withdrawalRate / 100))} 
            ({parameters.withdrawalRate}% of {formatCurrency(parameters.fireNumber)})
          </Typography>
        </Box>
    </>
  );
};
