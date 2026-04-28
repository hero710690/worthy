/**
 * Coast FIRE Calculator - Using Actual coast-fire-calculator Logic
 * 
 * This implements the exact same algorithms from /Users/jeanlee/coast-fire-calculator
 * for accurate and proven FIRE calculations.
 */

export interface CoastFireResult {
  isPossible: boolean;
  alreadyCoastFire: boolean;
  coastFireNumber?: number;
  coastFireAge?: number;
  coastFireDate?: Date;
  finalAmount?: number;
}

export interface CoastFireInput {
  fireNumber: number;           // FIRE target amount
  currentAge: number;           // User's current age
  retirementAge: number;        // Target retirement age
  rate: number;                 // Expected annual return (as decimal, e.g., 0.07)
  pmtMonthly: number;          // Monthly contributions during accumulation
  principal: number;            // Current portfolio value (Initial Principal)
  pmtMonthlyBarista: number;   // Monthly contributions during barista phase
}

export interface TraditionalFireResult {
  target: number;
  achieved: boolean;
  finalAmount: number;
  yearsRemaining: number;
  monthlyInvestmentNeeded: number;
  currentMonthlyContribution: number;
  achievementDate?: Date; // When FIRE will be achieved
  achievementAge?: number; // Age when FIRE will be achieved
  canAchieveBeforeRetirement?: boolean; // 🆕 NEW: Can achieve before set retirement age
  achievementMoment?: string; // 🆕 NEW: Human readable achievement moment
}

export interface BaristaFireResult extends CoastFireResult {
  baristaMonthlyContribution: number;
  fullTimeMonthlyContribution: number;
}

/**
 * Simple compound interest formula
 * Reference: https://www.thecalculatorsite.com/finance/calculators/compound-interest-formula
 */
export const futureValue = (p: number, r: number, n: number, t: number): number => {
  return p * Math.pow(1 + (r / n), n * t);
};

/**
 * Future value of a series of payments
 * Reference: https://www.thecalculatorsite.com/articles/finance/future-value-formula.php
 */
export const futureValueSeries = (pmt: number, r: number, n: number, t: number, p: number = 0): number => {
  if (r > 0) {
    return pmt * ((Math.pow(1 + (r / n), n * t) - 1) / (r / n)) + futureValue(p, r, n, t);
  }
  return p + (pmt * n * t); // no interest accumulation
};

/**
 * Convert monthly payments to daily for calculations
 */
const pmtMonthlyToDaily = (monthlyPmt: number): number => {
  return monthlyPmt * 12 / 365;
};

/**
 * NPER (Number of Periods) calculation - Excel/Google Sheets equivalent
 * Calculates the number of periods required to reach a future value
 * Based on the formula: NPER(rate, pmt, pv, fv, type)
 * 
 * @param rate - Interest rate per period
 * @param pmt - Payment made each period (negative for outflows)
 * @param pv - Present value (negative for outflows)
 * @param fv - Future value (target amount)
 * @param type - When payments are due (0 = end of period, 1 = beginning)
 * @returns Number of periods required
 */
const calculateNPER = (rate: number, pmt: number, pv: number, fv: number, type: number = 0): number => {
  console.log('🔍 NPER Debug - Input values:', { rate, pmt, pv, fv, type });
  
  // Validate inputs
  if (!isFinite(rate) || !isFinite(pmt) || !isFinite(pv) || !isFinite(fv)) {
    console.error('❌ NPER: Invalid input values');
    return NaN;
  }
  
  // Handle edge cases
  if (rate === 0) {
    // No interest case: nper = -(fv + pv) / pmt
    if (pmt === 0) {
      console.error('❌ NPER: Cannot calculate with zero rate and zero payment');
      return NaN;
    }
    const result = -(fv + pv) / pmt;
    console.log('🔍 NPER Debug - Zero rate result:', result);
    return result;
  }

  // Check if payment is sufficient to reach target
  if (pmt === 0 && pv !== fv) {
    console.error('❌ NPER: Cannot reach target with zero payments');
    return NaN;
  }

  // Adjust for payment timing
  const pvAdjusted = pv * (1 + rate * type);
  const pmtAdjusted = pmt * (1 + rate * type);
  
  console.log('🔍 NPER Debug - Adjusted values:', { pvAdjusted, pmtAdjusted });

  // NPER formula: ln((fv * rate + pmt) / (pv * rate + pmt)) / ln(1 + rate)
  const numeratorPart1 = fv * rate + pmtAdjusted;
  const numeratorPart2 = pvAdjusted * rate + pmtAdjusted;
  
  console.log('🔍 NPER Debug - Formula parts:', {
    numeratorPart1,
    numeratorPart2,
    ratio: numeratorPart1 / numeratorPart2
  });
  
  // Check for invalid logarithm inputs
  if (numeratorPart2 === 0) {
    console.error('❌ NPER: Division by zero in formula');
    return NaN;
  }
  
  const ratio = numeratorPart1 / numeratorPart2;
  if (ratio <= 0) {
    console.error('❌ NPER: Cannot take logarithm of non-positive number:', ratio);
    
    // 🔧 FIX: Use iterative approach when formula fails
    console.log('🔧 Falling back to iterative calculation...');
    return calculateNPERIterative(rate, pmt, pv, fv);
  }
  
  const numerator = Math.log(ratio);
  const denominator = Math.log(1 + rate);
  
  if (denominator === 0) {
    console.error('❌ NPER: Invalid rate causing zero denominator');
    return NaN;
  }
  
  console.log('🔍 NPER Debug - Log values:', {
    numerator,
    denominator
  });
  
  const result = numerator / denominator;
  console.log('🔍 NPER Debug - Final result:', result);
  
  return result;
};

/**
 * Iterative NPER calculation as fallback
 * Simulates month-by-month growth until target is reached
 */
const calculateNPERIterative = (rate: number, pmt: number, pv: number, fv: number): number => {
  console.log('🔄 Starting iterative NPER calculation...');
  
  let balance = -pv; // Convert to positive (current value)
  let periods = 0;
  const maxPeriods = 600; // Max 50 years
  const payment = -pmt; // Convert to positive (monthly contribution)
  
  console.log('🔄 Initial values:', { balance, payment, target: fv, rate });
  
  while (balance < fv && periods < maxPeriods) {
    // Apply interest
    balance = balance * (1 + rate);
    // Add payment
    balance = balance + payment;
    periods++;
    
    // Log progress every 12 months
    if (periods % 12 === 0) {
      console.log(`🔄 Year ${periods/12}: Balance = ${balance.toFixed(0)}, Target = ${fv}`);
    }
  }
  
  if (periods >= maxPeriods) {
    console.error('❌ Iterative NPER: Target not reachable within 50 years');
    return NaN;
  }
  
  console.log('✅ Iterative NPER result:', periods, 'months =', (periods/12).toFixed(1), 'years');
  return periods;
};

/**
 * Convergence algorithm for precise coast fire calculation
 * EXACT IMPLEMENTATION from /Users/jeanlee/coast-fire-calculator
 */
const convergeCoastFire = (
  iterations: number,
  fireNumber: number,
  currentAge: number,
  retirementAge: number,
  pmt: number,
  min: number,
  max: number,
  rate: number,
  principal: number = 0,
  pmtBarista: number = 0,
  coastFireResult?: CoastFireResult
): CoastFireResult => {
  
  // default response indicating failure to compute coast fire number and year
  let result: CoastFireResult = coastFireResult !== undefined ? coastFireResult : {
    isPossible: false,
    alreadyCoastFire: false,
    coastFireNumber: undefined,
    coastFireAge: undefined,
    coastFireDate: undefined,
    finalAmount: undefined,
  };

  // return base case
  if (iterations === 0 && coastFireResult !== undefined) {
    return coastFireResult;
  }

  // otherwise continue iteration and converge onto a suitable coast fire result
  const step = (max - min) / 10;
  for (let i = 1; i < 11; i++) {
    const numSavingYears = min + (i * step);
    const coastAmount = futureValueSeries(pmt, rate, 365, numSavingYears, principal);
    const numCoastingYears = retirementAge - numSavingYears - currentAge;
    const finalAmount = futureValueSeries(pmtBarista, rate, 365, numCoastingYears, coastAmount);

    if (finalAmount > fireNumber) {
      const newMin = min + ((i - 1) * step);
      const newMax = numSavingYears;
      const newResult: CoastFireResult = {
        isPossible: true,
        alreadyCoastFire: false,
        coastFireNumber: coastAmount,
        coastFireAge: numSavingYears + currentAge,
        coastFireDate: new Date(Date.now() + numSavingYears * 365.25 * 24 * 60 * 60 * 1000),
        finalAmount: finalAmount
      };
      return convergeCoastFire(iterations - 1, fireNumber, currentAge, retirementAge, pmt, newMin, newMax, rate, principal, pmtBarista, newResult);
    }
  }

  return result;
};

/**
 * Calculate Coast FIRE using exact coast-fire-calculator algorithm
 */
export const calculateCoastFire = (input: CoastFireInput): CoastFireResult => {
  const { fireNumber, currentAge, retirementAge, rate, pmtMonthly, principal, pmtMonthlyBarista } = input;
  
  const pmt = pmtMonthlyToDaily(pmtMonthly);
  const pmtBarista = pmtMonthlyToDaily(pmtMonthlyBarista);

  // Check if coast/barista FIRE has already been achieved
  if (futureValueSeries(pmtBarista, rate, 365, retirementAge - currentAge, principal) >= fireNumber) {
    return {
      isPossible: true,
      alreadyCoastFire: true,
      coastFireNumber: principal,
      coastFireAge: currentAge,
      finalAmount: futureValueSeries(pmtBarista, rate, 365, retirementAge - currentAge, principal),
      coastFireDate: new Date()
    };
  }

  const yearsTilRetirement = retirementAge - currentAge;
  
  for (let i = 1; i < (yearsTilRetirement + 1); i++) {
    const coastAmount = futureValueSeries(pmt, rate, 365, i, principal);
    const numCoastYears = retirementAge - i - currentAge;
    const finalAmount = futureValueSeries(pmtBarista, rate, 365, numCoastYears, coastAmount);

    if (finalAmount > fireNumber) {
      // Use convergence algorithm for precision - EXACT same call as original
      return convergeCoastFire(3, fireNumber, currentAge, retirementAge, pmt, i - 1, i, rate, principal, pmtBarista, undefined);
    }
  }

  return {
    isPossible: false,
    alreadyCoastFire: false,
    coastFireNumber: undefined,
    coastFireAge: undefined,
    finalAmount: undefined,
    coastFireDate: undefined
  };
};

/**
 * Calculate Traditional FIRE using NPER formula
 * Based on the provided FIRE Goal Calculation methodology
 */
export const calculateTraditionalFire = (input: CoastFireInput): TraditionalFireResult => {
  const { fireNumber, currentAge, retirementAge, rate, pmtMonthly, principal } = input;
  
  // 🔧 FIXED: Achievement should be based on current portfolio vs target, not future projection
  const achieved = principal >= fireNumber;
  
  const yearsToRetirement = retirementAge - currentAge;
  const finalAmount = futureValueSeries(pmtMonthly, rate, 12, yearsToRetirement, principal);
  
  // Calculate required monthly payment if not achieved
  let monthlyNeeded = 0;
  if (!achieved && yearsToRetirement > 0) {
    const remainingNeeded = fireNumber - futureValue(principal, rate, 365, yearsToRetirement);
    if (remainingNeeded > 0) {
      const monthlyRate = rate / 12;
      const periods = yearsToRetirement * 12;
      if (monthlyRate > 0) {
        monthlyNeeded = remainingNeeded * monthlyRate / (Math.pow(1 + monthlyRate, periods) - 1);
      } else {
        monthlyNeeded = remainingNeeded / periods;
      }
    }
  }

  // 🆕 NEW: NPER Calculation - Excel/Google Sheets equivalent
  // Formula: =NPER(rate, pmt, pv, fv)
  // Variables:
  // - rate: r/m = annual rate / 12 (monthly compounding)
  // - pmt: -pmtMonthly (negative as outflow/investment)
  // - pv: -principal (negative as outflow/initial investment)
  // - fv: fireNumber (target future value)
  
  let achievementDate: Date | undefined;
  let achievementAge: number | undefined;
  let actualYearsRemaining = yearsToRetirement;
  let canAchieveBeforeRetirement = false;
  let achievementMoment: string | undefined;

  if (!achieved && pmtMonthly > 0) {
    try {
      const monthlyRate = rate / 12; // r/m = 0.07/12
      const pv = -principal; // Negative as outflow
      const pmt = -pmtMonthly; // Negative as outflow
      const fv = fireNumber; // Target amount
      
      console.log('🧮 NPER Calculation Input:', {
        monthlyRate: monthlyRate,
        pv: pv,
        pmt: pmt,
        fv: fv,
        principal: principal,
        pmtMonthly: pmtMonthly,
        fireNumber: fireNumber
      });
      
      // Calculate number of months using NPER formula
      const totalMonths = calculateNPER(monthlyRate, pmt, pv, fv);
      
      // 🔍 Manual verification calculation
      console.log('🔍 Manual Verification:');
      console.log('Need to grow from', principal, 'to', fireNumber);
      console.log('Difference needed:', fireNumber - principal);
      console.log('Monthly contribution:', pmtMonthly);
      console.log('Monthly rate:', monthlyRate);
      
      // Simple approximation: How long with just contributions (no growth)
      const simpleMonths = (fireNumber - principal) / pmtMonthly;
      console.log('Simple calculation (no interest):', simpleMonths, 'months =', (simpleMonths/12).toFixed(1), 'years');
      
      // Test with Excel-like calculation
      // Using iterative approach to verify
      let testBalance = principal;
      let testMonths = 0;
      while (testBalance < fireNumber && testMonths < 600) {
        testBalance = testBalance * (1 + monthlyRate) + pmtMonthly;
        testMonths++;
      }
      console.log('Iterative verification:', testMonths, 'months =', (testMonths/12).toFixed(1), 'years');
      
      console.log('🧮 NPER Calculation Result:', {
        totalMonths: totalMonths,
        isFinite: isFinite(totalMonths),
        isPositive: totalMonths > 0
      });
      
      if (totalMonths > 0 && isFinite(totalMonths)) {
        const yearsToAchievement = totalMonths / 12;
        actualYearsRemaining = yearsToAchievement;
        achievementAge = currentAge + yearsToAchievement;
        achievementDate = new Date(Date.now() + yearsToAchievement * 365.25 * 24 * 60 * 60 * 1000);
        
        // Check if can achieve before retirement age
        canAchieveBeforeRetirement = achievementAge < retirementAge;
        
        // Create human-readable achievement moment
        const achievementYear = new Date().getFullYear() + Math.floor(yearsToAchievement);
        const achievementMonth = Math.ceil((yearsToAchievement % 1) * 12);
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                           'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthName = monthNames[achievementMonth - 1] || 'Dec';
        
        achievementMoment = `${monthName} ${achievementYear} (Age ${achievementAge.toFixed(1)})`;
        
        console.log('🎯 NPER Calculation Results:', {
          totalMonths: totalMonths.toFixed(1),
          yearsToAchievement: yearsToAchievement.toFixed(2),
          achievementAge: achievementAge.toFixed(1),
          canAchieveBeforeRetirement,
          achievementMoment,
          retirementAge
        });
      } else {
        console.warn('⚠️ NPER calculation returned invalid result:', totalMonths);
      }
    } catch (error) {
      console.error('❌ NPER calculation failed:', error);
      // Fallback to original calculation method
      actualYearsRemaining = yearsToRetirement;
    }
  } else if (achieved) {
    // Already achieved
    actualYearsRemaining = 0;
    achievementAge = currentAge;
    achievementDate = new Date();
    canAchieveBeforeRetirement = true;
    achievementMoment = `Already Achieved!`;
  }
  
  return {
    target: fireNumber,
    achieved,
    finalAmount,
    yearsRemaining: actualYearsRemaining,
    monthlyInvestmentNeeded: monthlyNeeded,
    currentMonthlyContribution: pmtMonthly,
    achievementDate,
    achievementAge,
    canAchieveBeforeRetirement,
    achievementMoment
  };
};

/**
 * Calculate Barista FIRE (Coast FIRE with barista contributions)
 */
export const calculateBaristaFire = (input: CoastFireInput): BaristaFireResult => {
  const coastResult = calculateCoastFire(input);
  
  return {
    ...coastResult,
    baristaMonthlyContribution: input.pmtMonthlyBarista,
    fullTimeMonthlyContribution: input.pmtMonthly
  };
};

/**
 * Calculate all FIRE types using proven algorithms
 */
export const calculateAllFireTypes = (input: CoastFireInput) => {
  const traditionalFire = calculateTraditionalFire(input);
  
  // 🔧 FIXED: Coast FIRE should NEVER use barista contributions
  // Coast FIRE assumes you stop contributing entirely after reaching the coast fire number
  const coastFireInput = {
    ...input,
    pmtMonthlyBarista: 0  // Always 0 for Coast FIRE
  };
  const coastFire = calculateCoastFire(coastFireInput);
  
  // Barista FIRE uses the original input with barista contributions
  const baristaFire = calculateBaristaFire(input);
  
  // Calculate progress percentages
  const traditionalProgress = Math.min((input.principal / input.fireNumber) * 100, 100);
  const coastProgress = coastFire.coastFireNumber ? 
    Math.min((input.principal / coastFire.coastFireNumber) * 100, 100) : 0;
  const baristaProgress = baristaFire.coastFireNumber ? 
    Math.min((input.principal / baristaFire.coastFireNumber) * 100, 100) : 0;
  
  return {
    traditional: {
      ...traditionalFire,
      progress: traditionalProgress,
      type: 'Traditional' as const
    },
    coast: {
      ...coastFire,
      target: coastFire.coastFireNumber || input.fireNumber,
      progress: coastProgress,
      type: 'Coast' as const
    },
    barista: {
      ...baristaFire,
      target: baristaFire.coastFireNumber || input.fireNumber,
      progress: baristaProgress,
      type: 'Barista' as const
    },
    summary: {
      currentPortfolio: input.principal,
      fireTarget: input.fireNumber,
      yearsToRetirement: Math.round((input.retirementAge - input.currentAge) * 10) / 10,
      monthlyContribution: input.pmtMonthly,
      baristaMonthlyContribution: input.pmtMonthlyBarista,
      fastestFireType: coastFire.isPossible ? 'Coast' : 
                      baristaFire.isPossible ? 'Barista' : 'Traditional'
    }
  };
};
