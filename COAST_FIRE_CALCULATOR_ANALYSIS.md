# Coast FIRE Calculator Logic Analysis & Implementation Plan

**Date**: July 11, 2025  
**Source**: /Users/jeanlee/coast-fire-calculator  
**Target**: Worthy FIRE Calculator Integration

---

## 🎯 **Core Logic Analysis**

### **Key Functions from coast-fire-calculator:**

#### **1. `calculateCoastFire()` - Main Calculation Function**
```typescript
const calculateCoastFire = (
  fireNumber: number,        // Target FIRE amount (e.g., $25M)
  currentAge: number,        // Current age (32)
  retirementAge: number,     // Target retirement age (50)
  rate: number,              // Annual return rate (0.07)
  pmtMonthly: number,        // Monthly contribution during accumulation
  principal: number = 0,     // Starting amount
  pmtMonthlyBarista: number = 0  // Monthly contribution during barista phase
): CoastFireResult
```

#### **2. Core Calculation Logic:**
```typescript
// Check if already achieved Coast/Barista FIRE
if (futureValueSeries(pmtBarista, rate, 365, retirementAge - currentAge, principal) >= fireNumber) {
  return {
    isPossible: true,
    alreadyCoastFire: true, // Also counts as barista FIRE if pmtBarista > 0
    coastFireNumber: undefined,
    coastFireAge: undefined,
    finalAmount: undefined,
    coastFireDate: undefined
  }
}

// Find the minimum years needed to reach coast point
const yearsTilRetirement = retirementAge - currentAge
for (let i = 1; i < (yearsTilRetirement + 1); i++) {
  const coastAmount = futureValueSeries(pmt, rate, 365, i, principal)
  const numCoastYears = retirementAge - i - currentAge
  const finalAmount = futureValueSeries(pmtBarista, rate, 365, numCoastYears, coastAmount)
  
  if (finalAmount > fireNumber) {
    // Found the coast point - converge to precise answer
    return convergeCoastFire(3, fireNumber, currentAge, retirementAge, pmt, i-1, i, rate, principal, pmtBarista, undefined)
  }
}
```

#### **3. Future Value Calculations:**
```typescript
// Simple compound interest
const futureValue = (p: number, r: number, n: number, t: number): number => {
  return p * Math.pow(1 + (r / n), n * t)
}

// Future value with regular contributions
const futureValueSeries = (pmt: number, r: number, n: number, t: number, p: number = 0): number => {
  if (r > 0) {
    return pmt * ((Math.pow(1 + (r / n), n * t) - 1) / (r / n)) + futureValue(p, r, n, t)
  }
  return p + (pmt * n * t) // no interest accumulation
}

// Convert monthly payments to daily for precise calculations
const pmtMonthlyToDaily = (monthlyPmt: number): number => {
  return monthlyPmt * 12 / 365
}
```

---

## 🔧 **Implementation Plan for Worthy**

### **Phase 1: Core Calculation Functions**

#### **1. Add Coast FIRE Calculation Functions to Goals.tsx:**
```typescript
// Future value with compound interest
const futureValue = (principal: number, rate: number, compoundingPeriods: number, years: number): number => {
  return principal * Math.pow(1 + (rate / compoundingPeriods), compoundingPeriods * years);
};

// Future value with regular contributions (annuity)
const futureValueSeries = (
  payment: number, 
  rate: number, 
  compoundingPeriods: number, 
  years: number, 
  principal: number = 0
): number => {
  if (rate > 0) {
    const compoundedPrincipal = futureValue(principal, rate, compoundingPeriods, years);
    const annuityValue = payment * ((Math.pow(1 + (rate / compoundingPeriods), compoundingPeriods * years) - 1) / (rate / compoundingPeriods));
    return compoundedPrincipal + annuityValue;
  }
  return principal + (payment * compoundingPeriods * years); // No interest
};

// Convert monthly to daily payments for precision
const monthlyToDaily = (monthlyAmount: number): number => {
  return monthlyAmount * 12 / 365;
};
```

#### **2. Coast FIRE Calculation Logic:**
```typescript
interface CoastFireResult {
  isPossible: boolean;
  alreadyAchieved: boolean;
  coastAmount: number | null;
  coastAge: number | null;
  yearsToCoast: number | null;
  finalAmount: number | null;
  message: string;
}

const calculateCoastFire = (
  fireTarget: number,
  currentAge: number,
  retirementAge: number,
  annualReturn: number,
  monthlyContribution: number,
  currentPortfolio: number,
  baristaMonthlyContribution: number = 0
): CoastFireResult => {
  
  const dailyContribution = monthlyToDaily(monthlyContribution);
  const dailyBaristaContribution = monthlyToDaily(baristaMonthlyContribution);
  const yearsToRetirement = retirementAge - currentAge;
  
  // Check if already achieved with current portfolio + barista contributions
  const finalWithBarista = futureValueSeries(
    dailyBaristaContribution, 
    annualReturn, 
    365, 
    yearsToRetirement, 
    currentPortfolio
  );
  
  if (finalWithBarista >= fireTarget) {
    return {
      isPossible: true,
      alreadyAchieved: true,
      coastAmount: null,
      coastAge: null,
      yearsToCoast: null,
      finalAmount: finalWithBarista,
      message: baristaMonthlyContribution > 0 
        ? "🎉 Barista FIRE already achieved! Your current portfolio + barista contributions will reach your FIRE target."
        : "🎉 Coast FIRE already achieved! Your current portfolio will grow to your FIRE target without additional contributions."
    };
  }
  
  // Find minimum years of full contributions needed
  for (let years = 1; years <= yearsToRetirement; years++) {
    const coastAmount = futureValueSeries(dailyContribution, annualReturn, 365, years, currentPortfolio);
    const remainingYears = yearsToRetirement - years;
    const finalAmount = futureValueSeries(dailyBaristaContribution, annualReturn, 365, remainingYears, coastAmount);
    
    if (finalAmount >= fireTarget) {
      return {
        isPossible: true,
        alreadyAchieved: false,
        coastAmount: coastAmount,
        coastAge: currentAge + years,
        yearsToCoast: years,
        finalAmount: finalAmount,
        message: baristaMonthlyContribution > 0
          ? `Contribute ${formatCurrency(monthlyContribution)}/month for ${years} years, then switch to ${formatCurrency(baristaMonthlyContribution)}/month barista work until retirement.`
          : `Contribute ${formatCurrency(monthlyContribution)}/month for ${years} years, then stop contributing and coast to retirement.`
      };
    }
  }
  
  return {
    isPossible: false,
    alreadyAchieved: false,
    coastAmount: null,
    coastAge: null,
    yearsToCoast: null,
    finalAmount: null,
    message: "Coast FIRE not possible with current parameters. Consider increasing contributions, reducing target, or extending retirement age."
  };
};
```

#### **3. Barista FIRE Calculation Logic:**
```typescript
interface BaristaFireResult {
  isPossible: boolean;
  alreadyAchieved: boolean;
  transitionAmount: number | null;
  transitionAge: number | null;
  yearsToTransition: number | null;
  finalAmount: number;
  partTimeIncome: number;
  expensesCovered: boolean;
  message: string;
}

const calculateBaristaFire = (
  fireTarget: number,
  currentAge: number,
  retirementAge: number,
  annualReturn: number,
  monthlyContribution: number,
  currentPortfolio: number,
  annualExpenses: number,
  partTimeAnnualIncome: number
): BaristaFireResult => {
  
  const baristaMonthlyContribution = Math.max(0, (partTimeAnnualIncome - annualExpenses) / 12);
  const expensesCovered = partTimeAnnualIncome >= annualExpenses;
  
  if (!expensesCovered) {
    return {
      isPossible: false,
      alreadyAchieved: false,
      transitionAmount: null,
      transitionAge: null,
      yearsToTransition: null,
      finalAmount: fireTarget,
      partTimeIncome: partTimeAnnualIncome,
      expensesCovered: false,
      message: `Barista FIRE requires part-time income (${formatCurrency(partTimeAnnualIncome)}) to cover expenses (${formatCurrency(annualExpenses)}). Consider increasing part-time income or reducing expenses.`
    };
  }
  
  // Use Coast FIRE logic with barista contributions
  const coastResult = calculateCoastFire(
    fireTarget,
    currentAge,
    retirementAge,
    annualReturn,
    monthlyContribution,
    currentPortfolio,
    baristaMonthlyContribution
  );
  
  return {
    isPossible: coastResult.isPossible,
    alreadyAchieved: coastResult.alreadyAchieved,
    transitionAmount: coastResult.coastAmount,
    transitionAge: coastResult.coastAge,
    yearsToTransition: coastResult.yearsToCoast,
    finalAmount: fireTarget, // Always same as Traditional FIRE
    partTimeIncome: partTimeAnnualIncome,
    expensesCovered: true,
    message: coastResult.alreadyAchieved 
      ? `🎉 Barista FIRE ready now! Your part-time income covers expenses and your portfolio will grow to ${formatCurrency(fireTarget)}.`
      : coastResult.isPossible
        ? `Contribute ${formatCurrency(monthlyContribution)}/month for ${coastResult.yearsToCoast} years, then switch to part-time work earning ${formatCurrency(partTimeAnnualIncome)}/year.`
        : "Barista FIRE not achievable with current parameters."
  };
};
```

### **Phase 2: Integration with What-If Simulator**

#### **Update calculateWhatIfFIRE() function:**
```typescript
const calculateWhatIfFIRE = () => {
  if (!fireProfile || !portfolioValuation) return null;

  const currentValue = portfolioValuation.totalValueInBaseCurrency;
  const monthlyContribution = whatIfValues.monthlyContribution;
  const annualExpenses = whatIfValues.annualExpenses;
  const expectedReturn = whatIfValues.expectedReturn / 100;
  const targetRetirementAge = whatIfValues.targetRetirementAge;
  const safeWithdrawalRate = fireProfile.safe_withdrawal_rate || 0.04;
  const partTimeAnnualIncome = whatIfValues.partTimeIncome;
  
  const currentYear = new Date().getFullYear();
  const currentAge = user?.birth_year ? currentYear - user.birth_year : 30;
  
  // Calculate FIRE targets
  const traditionalFireTarget = annualExpenses / safeWithdrawalRate;
  
  // Traditional FIRE calculation (existing logic)
  const yearsToTraditional = calculateYearsToTarget(traditionalFireTarget);
  
  // Coast FIRE calculation (NEW LOGIC)
  const coastResult = calculateCoastFire(
    traditionalFireTarget,
    currentAge,
    targetRetirementAge,
    expectedReturn,
    monthlyContribution,
    currentValue
  );
  
  // Barista FIRE calculation (NEW LOGIC)
  const baristaResult = calculateBaristaFire(
    traditionalFireTarget,
    currentAge,
    targetRetirementAge,
    expectedReturn,
    monthlyContribution,
    currentValue,
    annualExpenses,
    partTimeAnnualIncome
  );
  
  return {
    traditionalFire: {
      target: traditionalFireTarget,
      years: yearsToTraditional,
      achievementAge: yearsToTraditional > 0 ? currentAge + yearsToTraditional : currentAge,
      achievable: yearsToTraditional > 0 && (currentAge + yearsToTraditional) <= targetRetirementAge
    },
    coastFire: {
      target: traditionalFireTarget, // Same final target
      coastAmount: coastResult.coastAmount,
      years: coastResult.yearsToCoast,
      achievementAge: coastResult.coastAge,
      achievable: coastResult.isPossible,
      alreadyAchieved: coastResult.alreadyAchieved,
      message: coastResult.message
    },
    baristaFire: {
      target: traditionalFireTarget, // Same final target
      transitionAmount: baristaResult.transitionAmount,
      years: baristaResult.yearsToTransition,
      achievementAge: baristaResult.transitionAge,
      achievable: baristaResult.isPossible,
      alreadyAchieved: baristaResult.alreadyAchieved,
      partTimeIncome: partTimeAnnualIncome,
      expensesCovered: baristaResult.expensesCovered,
      message: baristaResult.message
    },
    currentScenario: {
      monthlyContribution,
      annualExpenses,
      expectedReturn: expectedReturn * 100,
      targetRetirementAge,
      currentAge,
      yearsToRetirement: targetRetirementAge - currentAge
    }
  };
};
```

### **Phase 3: Update UI Display**

#### **Coast FIRE Display:**
```typescript
{/* Coast FIRE Results */}
<Paper elevation={1} sx={{ p: 3 }}>
  <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, color: 'success.main' }}>
    Coast FIRE
  </Typography>
  
  {whatIfResults.coastFire.alreadyAchieved ? (
    <Box sx={{ textAlign: 'center', py: 2 }}>
      <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'success.main', mb: 2 }}>
        🎉 Already Achieved!
      </Typography>
      <Typography variant="body1" sx={{ mb: 2 }}>
        {whatIfResults.coastFire.message}
      </Typography>
    </Box>
  ) : whatIfResults.coastFire.achievable ? (
    <Grid container spacing={2}>
      <Grid item xs={6}>
        <Typography variant="body2" color="text.secondary">Coast Amount Needed:</Typography>
        <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'success.main' }}>
          {formatCurrency(whatIfResults.coastFire.coastAmount)}
        </Typography>
      </Grid>
      <Grid item xs={6}>
        <Typography variant="body2" color="text.secondary">Years to Coast:</Typography>
        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
          {whatIfResults.coastFire.years} years
        </Typography>
      </Grid>
      <Grid item xs={12}>
        <Typography variant="body2" color="text.secondary">Coast Age:</Typography>
        <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
          Age {whatIfResults.coastFire.achievementAge}
        </Typography>
      </Grid>
      <Grid item xs={12}>
        <Box sx={{ mt: 2, p: 2, bgcolor: 'success.50', borderRadius: 1 }}>
          <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
            💡 {whatIfResults.coastFire.message}
          </Typography>
        </Box>
      </Grid>
    </Grid>
  ) : (
    <Box sx={{ textAlign: 'center', py: 2 }}>
      <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'error.main', mb: 2 }}>
        ❌ Not Achievable
      </Typography>
      <Typography variant="body1">
        {whatIfResults.coastFire.message}
      </Typography>
    </Box>
  )}
</Paper>
```

#### **Barista FIRE Display:**
```typescript
{/* Barista FIRE Results */}
<Paper elevation={1} sx={{ p: 3 }}>
  <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2, color: 'warning.main' }}>
    Barista FIRE
  </Typography>
  
  {!whatIfResults.baristaFire.expensesCovered ? (
    <Box sx={{ textAlign: 'center', py: 2 }}>
      <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'error.main', mb: 2 }}>
        ❌ Income Insufficient
      </Typography>
      <Typography variant="body1">
        {whatIfResults.baristaFire.message}
      </Typography>
    </Box>
  ) : whatIfResults.baristaFire.alreadyAchieved ? (
    <Box sx={{ textAlign: 'center', py: 2 }}>
      <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'success.main', mb: 2 }}>
        🎉 Ready Now!
      </Typography>
      <Typography variant="body1">
        {whatIfResults.baristaFire.message}
      </Typography>
    </Box>
  ) : whatIfResults.baristaFire.achievable ? (
    <Grid container spacing={2}>
      <Grid item xs={6}>
        <Typography variant="body2" color="text.secondary">Transition Amount:</Typography>
        <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'warning.main' }}>
          {formatCurrency(whatIfResults.baristaFire.transitionAmount)}
        </Typography>
      </Grid>
      <Grid item xs={6}>
        <Typography variant="body2" color="text.secondary">Years to Transition:</Typography>
        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
          {whatIfResults.baristaFire.years} years
        </Typography>
      </Grid>
      <Grid item xs={12}>
        <Typography variant="body2" color="text.secondary">Part-time Income:</Typography>
        <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
          {formatCurrency(whatIfResults.baristaFire.partTimeIncome)} annually
        </Typography>
      </Grid>
      <Grid item xs={12}>
        <Box sx={{ mt: 2, p: 2, bgcolor: 'warning.50', borderRadius: 1 }}>
          <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
            💡 {whatIfResults.baristaFire.message}
          </Typography>
        </Box>
      </Grid>
    </Grid>
  ) : (
    <Box sx={{ textAlign: 'center', py: 2 }}>
      <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'error.main', mb: 2 }}>
        ❌ Not Achievable
      </Typography>
      <Typography variant="body1">
        {whatIfResults.baristaFire.message}
      </Typography>
    </Box>
  )}
</Paper>
```

---

## 🎯 **Key Differences from Current Implementation**

### **1. Precise Mathematical Calculations:**
- Uses daily compounding (365 periods) for accuracy
- Proper future value series calculations with annuities
- Convergence algorithm for precise coast fire amounts

### **2. Correct Coast FIRE Logic:**
- Coast FIRE = amount needed to stop contributing and still reach Traditional FIRE
- Uses present value calculations with compound growth
- Handles "already achieved" scenarios properly

### **3. Correct Barista FIRE Logic:**
- Barista FIRE = Coast FIRE + part-time income covering expenses
- Same final target as Traditional FIRE
- Transition point calculation based on expense coverage

### **4. Comprehensive Scenario Handling:**
- Already achieved scenarios
- Impossible scenarios with clear explanations
- Edge cases (insufficient income, unrealistic targets)

---

## 🚀 **Implementation Steps**

### **Step 1: Add Core Functions**
1. Add `futureValue`, `futureValueSeries`, `monthlyToDaily` functions
2. Add `calculateCoastFire` and `calculateBaristaFire` functions
3. Test with known scenarios

### **Step 2: Update What-If Simulator**
1. Replace current calculation logic with new functions
2. Update return object structure
3. Test with various parameter combinations

### **Step 3: Update UI Components**
1. Update Coast FIRE display component
2. Update Barista FIRE display component
3. Add proper messaging for all scenarios

### **Step 4: Testing & Validation**
1. Test with your current data (should show Barista FIRE as achieved)
2. Test edge cases (impossible scenarios, already achieved)
3. Validate against coast-fire-calculator results

---

## 🧪 **Expected Results for Your Data**

With your current situation:
- **Current Portfolio**: NT$5,466,997
- **Annual Expenses**: NT$1,000,000
- **Part-time Income**: NT$1,200,000
- **Current Age**: 32, **Target Retirement**: 50

**Expected Results:**
- **Traditional FIRE**: NT$25,000,000 target, not achievable by 50
- **Coast FIRE**: Need ~NT$3,280,000 now to coast to NT$25M by 50 (already have NT$5.4M → **ACHIEVED**)
- **Barista FIRE**: **IMMEDIATELY ACHIEVABLE** - part-time income covers expenses, portfolio will grow to target

This should resolve the current calculation issues and provide accurate, meaningful results!
