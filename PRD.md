---
# Product Requirements Document (PRD): Worthy

**Document Version**: 1.3 (Complete)
**Last Updated**: July 7, 2025

---
## 1. Overview

This document defines **Worthy**, a personalized financial strategy tool. Its primary purpose is to help users consolidate and track all their investment assets. Based on their total assets and customized financial goals, Worthy will calculate and visualize their progress toward achieving different levels of Financial Independence, Retire Early (FIRE).

This tool will solve the tedious problem of manually recording and updating multi-currency assets. Through a simple initial setup and automated recurring investment tracking, Worthy provides a clear, accurate, and motivating dashboard, empowering users to plan their path to financial freedom, from "working less" to "not working at all."

---
## 2. Target Audience

* **Active Investors**: Salaried employees or freelancers aged 25-45 with a basic understanding of personal finance, stocks, and ETF investing, who have already started their investment journey.
* **Global Investors**: Individuals who actively invest in both domestic and foreign markets (e.g., US stocks).
* **FIRE Followers**: People who are learning about or are already practicing FIRE principles (including Barista FIRE, Coast FIRE) and need a tool to quantify their progress toward their goals.
* **Data-Driven Planners**: Users who prefer to analyze their financial situation through data and charts and make adjustments accordingly.

---
## 3. Goals/Objectives

### User Goals:

* Quickly set up and manage all investment records on a single platform.
* Seamlessly record lump-sum and recurring investments made in different currencies (e.g., TWD, USD).
* Automate the tracking of recurring investments to save time on manual entry.
* Clearly understand their total assets, asset allocation, and investment performance calculated in a self-selected base currency.
* Quantify and visualize their multi-level FIRE progress (Traditional, Barista, Coast) to stay motivated.

### Product Goals:

* Provide an intuitive and easy-to-use interface to minimize the barrier to entry for users.
* Ensure the accuracy and timeliness of asset data and exchange rates.
* Establish a reliable automated batch processing system.
* Become the go-to tool for users to review their financial status and plan future strategies daily.

---
## 4. Features & Functional Requirements

### 4.1 User Stories

#### Onboarding & Setup:

* As a new user, I want to quickly **register an account** to securely save my financial data.
* As a user, I want to **set my Base Currency** (e.g., TWD) so that all asset values on the dashboard are displayed uniformly in this currency.

#### Asset Initialization:

* As a user with an existing investment portfolio, I want to quickly enter my "**current holdings**" (total shares and total cost) in a single step, without needing to input historical transactions one by one, so I can start using the tool immediately.

#### Transaction Recording:

* As a user, I want to record a new "**lump-sum purchase**," with fields for: stock/ETF ticker, purchase date, number of shares, total purchase cost, and transaction currency.
* As a user, I want to set up a "**recurring investment**" plan, with fields for: stock/ETF ticker, start date, contribution frequency, amount per contribution, currency of the contribution, and the transaction day.

#### Automation:

* As a user who has set up a recurring investment plan, I want the system to **automatically fetch the market opening price** on the scheduled day, calculate the number of shares, and generate a transaction record.

#### Dashboard & Portfolio:

* As a user, I want to see a **dashboard that displays my current total asset value** calculated in my "base currency."
* I want to see a **list of all my assets**, including: shares held, average cost, current market price, total market value (converted to base currency), and unrealized profit/loss (converted to base currency).
* I want to see a **chart showing my asset allocation percentages**.

#### FIRE Calculator:

* As a user, I want to **input my financial goals** (annual expenses, retirement age, expected rate of return, part-time income, etc.) to calculate and compare my Traditional FIRE, Barista FIRE, and Coast FIRE targets.
* I want to see a clear dashboard showing **what percentage of these three FIRE goals my current total assets have reached**, so I can understand which stage of financial freedom I am in.

### 4.2 Functional Specifications

#### Data Models:

* **Users**: `user_id`, `email`, `password_hash`, `base_currency` (e.g., 'TWD'), `birth_year` (for Coast FIRE calc).
* **Assets**: `asset_id`, `user_id`, `ticker_symbol`, `asset_type` (e.g., 'Stock'), `total_shares`, `average_cost_basis`.
* **Transactions**: `transaction_id`, `asset_id`, `transaction_type` (enum: `LumpSum`, `Recurring`, `Initialization`), `date`, `shares`, `price_per_share`, `currency` (e.g., 'USD').
* **RecurringInvestments**: `recurring_id`, `user_id`, `ticker_symbol`, `amount`, `currency`, `frequency`, `start_date`, `next_run_date`.
* **FIREProfile**: `profile_id`, `user_id`, `annual_expenses`, `safe_withdrawal_rate`, `expected_annual_return`, `target_retirement_age`, `barista_annual_income`.

#### Core Feature Logic:

* **Asset Initialization (Creating a Position)**: Provide a dedicated function for users to input Ticker Symbol, Total Shares Held, Average Cost Basis, and Currency. The backend will create a special transaction with `transaction_type = Initialization` to form the asset's base.
* **Automated Batch Processing**: A daily scheduler will scan the `RecurringInvestments` table to process tasks for the day. It must handle market holidays (skip or postpone) and have robust error handling (e.g., for failed API calls).

#### FIRE Calculator Logic:

* **User-Input Variables**:
    * $A$ = annual\_expenses (projected annual expenses after retirement)
    * $SWR$ = safe\_withdrawal\_rate
    * $I_B$ = barista\_annual\_income (part-time annual income)
    * $r$ = expected\_annual\_return
    * $n$ = target\_retirement\_age - current\_user\_age (years until retirement)

* **Calculation Formulas**:
    * **Traditional FIRE Target ($FIRE_{Trad}$)**:
        $FIRE_{Trad} = A / SWR$
    * **Barista FIRE Target ($FIRE_{Barista}$)**:
        $FIRE_{Barista} = (A - I_B) / SWR$
    * **Coast FIRE Target ($FIRE_{Coast}$)**:
        $FIRE_{Coast} = FIRE_{Trad} / ((1 + r)^n)$

* **Progress Display**: Compare the user's "current total assets" against each of the three targets above to calculate the completion percentage.

#### External API Integration:

* **Financial Market Data API**: To fetch historical and real-time prices for stocks/ETFs.
* **Real-Time Exchange Rate API**: To convert the value of assets in different currencies into the user's base currency.

---
## 5. Non-Functional Requirements

* **Performance**: The dashboard page should load in under **3 seconds**.
* **Security**: User passwords must be **hashed**. All data transmission must use **SSL/TLS encryption**.
* **Usability**: The interface must be **clean, intuitive, and feature a Responsive Web Design (RWD)**.
* **Reliability**: The system must be available **24/7**, with the success rate of automated batch processing exceeding **99.9%**.

---
## 6. Out of Scope for V1 / Future Plans

* Direct integration with brokerage accounts for automatic transaction syncing.
* Support for a wider range of asset classes, such as cryptocurrencies, real estate, and bonds.
* Tax calculation and optimization suggestions.
* Advanced portfolio analysis (e.g., Beta, Sharpe Ratio).
* Social features (e.g., anonymously sharing progress or asset allocation).

---
## 7. Success Metrics

* **User Activity**: Monthly Active Users (MAU).
* **Core Feature Adoption**: The percentage of users who set up "recurring investment" plans and "multi-currency assets."
* **User Retention**: The return rate of new users after 1 month and 3 months.
* **Data Completeness**: The average number of assets recorded per user.