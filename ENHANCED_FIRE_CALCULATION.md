# Enhanced FIRE Calculation with Inflation & Barista Contribution

## Overview
Sophisticated FIRE calculation that accounts for inflation and uses barista annual contribution instead of income.

## Key Improvements

### 1. Inflation-Adjusted Retirement Targets
- Calculate **real purchasing power** needed at retirement
- Account for inflation between now and retirement age
- Provide both nominal and real values

### 2. Barista FIRE Contribution Model
- Use `baristaAnnualContribution` (investment capacity during part-time work)
- More intuitive than trying to derive from part-time income
- Clearer user input and calculation logic

## Mathematical Formulas

### Core Variables
- `A` = annual_expenses (today's dollars)
- `i` = inflation_rate (e.g., 2.5%)
- `r` = expected_return_rate (e.g., 7%)
- `SWR` = safe_withdrawal_rate (e.g., 4%)
- `n` = years_to_retirement (target_age - current_age)
- `BC` = barista_annual_contribution (investment capacity during part-time)

### 1. Traditional FIRE
```
Future Annual Expenses = A × (1 + i)^n
Traditional FIRE Target = Future Annual Expenses ÷ SWR
```

### 2. Coast FIRE
```
Coast FIRE Target = Traditional FIRE Target ÷ (1 + r)^n
```

### 3. Barista FIRE (Enhanced)
```
Phase 1: Build to transition point
Phase 2: Part-time work + reduced contributions until Traditional FIRE

Barista Transition Target = Amount where:
  - Portfolio withdrawal (4%) + Barista contributions can sustain growth to Traditional FIRE
  - Accounts for reduced contribution capacity during part-time phase
```

## Implementation Plan

### Backend Changes (worthy_lambda_function.py)
1. Update FIRE profile table to include `barista_annual_contribution`
2. Enhance calculation logic with inflation adjustment
3. Implement sophisticated Barista FIRE simulation

### Frontend Changes (Goals.tsx)
1. Update FIRE profile form to use contribution instead of income
2. Display both nominal and inflation-adjusted targets
3. Show timeline with inflation impact

### Database Schema Update
```sql
ALTER TABLE fire_profile 
ADD COLUMN barista_annual_contribution DECIMAL(15,2) DEFAULT 0,
ADD COLUMN inflation_rate DECIMAL(5,4) DEFAULT 0.025;
```
