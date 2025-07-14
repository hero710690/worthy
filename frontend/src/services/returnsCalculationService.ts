// Returns Calculation Service
// Calculates Annualized Rate of Return and Total Return including Interest/Dividends

import { assetAPI } from './assetApi';
import { enhancedStockPriceService } from './enhancedStockPriceService';
import { exchangeRateService } from './exchangeRateService';
import type { Asset, Transaction } from '../types/assets';

export interface AssetReturns {
  asset: Asset;
  totalReturn: number;
  totalReturnPercent: number;
  annualizedReturn: number;
  annualizedReturnPercent: number;
  totalDividends: number;
  totalInterest: number;
  holdingPeriodDays: number;
  holdingPeriodYears: number;
  initialInvestment: number;
  currentValue: number;
  totalCashFlow: number;
  irr?: number; // Internal Rate of Return
  lastUpdated: Date;
}

export interface PortfolioReturns {
  assets: AssetReturns[];
  portfolioTotalReturn: number;
  portfolioTotalReturnPercent: number;
  portfolioAnnualizedReturn: number;
  portfolioAnnualizedReturnPercent: number;
  totalDividendsReceived: number;
  totalInterestReceived: number;
  totalInvested: number;
  currentPortfolioValue: number;
  weightedAverageHoldingPeriod: number;
  lastUpdated: Date;
}

export class ReturnsCalculationService {
  private static instance: ReturnsCalculationService;

  private constructor() {}

  public static getInstance(): ReturnsCalculationService {
    if (!ReturnsCalculationService.instance) {
      ReturnsCalculationService.instance = new ReturnsCalculationService();
    }
    return ReturnsCalculationService.instance;
  }

  /**
   * Calculate returns for a single asset
   */
  public async calculateAssetReturns(asset: Asset, baseCurrency: string): Promise<AssetReturns> {
    try {
      // Get asset with transaction history
      const assetWithTransactions = await assetAPI.getAsset(asset.asset_id);
      const transactions = assetWithTransactions.transactions || [];

      // Get current market price
      let currentPrice = asset.average_cost_basis;
      if (asset.asset_type !== 'Cash') {
        try {
          const stockPrice = await enhancedStockPriceService.getStockPrice(asset.ticker_symbol);
          if (stockPrice) {
            currentPrice = stockPrice.price;
          }
        } catch (error) {
          console.warn(`Failed to get current price for ${asset.ticker_symbol}, using cost basis`);
        }
      }

      // Convert current price to base currency if needed
      let currentPriceInBaseCurrency = currentPrice;
      if (asset.currency !== baseCurrency) {
        currentPriceInBaseCurrency = exchangeRateService.convertCurrency(
          currentPrice,
          asset.currency,
          baseCurrency
        );
      }

      // Calculate current value
      const currentValue = asset.total_shares * currentPriceInBaseCurrency;

      // Process transactions to calculate cash flows and returns
      const cashFlows: { date: Date; amount: number }[] = [];
      let totalDividends = 0;
      let totalInterest = 0;
      let totalInvested = 0;
      let earliestDate = new Date();

      // Sort transactions by date
      const sortedTransactions = transactions.sort((a, b) => 
        new Date(a.date || a.transaction_date || '').getTime() - 
        new Date(b.date || b.transaction_date || '').getTime()
      );

      for (const transaction of sortedTransactions) {
        const transactionDate = new Date(transaction.date || transaction.transaction_date || '');
        
        // Convert transaction amount to base currency
        let transactionAmount = transaction.shares * transaction.price_per_share;
        if (asset.currency !== baseCurrency) {
          transactionAmount = exchangeRateService.convertCurrency(
            transactionAmount,
            asset.currency,
            baseCurrency
          );
        }

        switch (transaction.transaction_type) {
          case 'Initialization':
          case 'LumpSum':
          case 'Recurring':
            // These are investments (negative cash flow)
            cashFlows.push({ date: transactionDate, amount: -transactionAmount });
            totalInvested += transactionAmount;
            if (transactionDate < earliestDate) {
              earliestDate = transactionDate;
            }
            break;

          case 'Dividend':
            // Dividends are positive cash flow
            const dividendAmount = transaction.total_dividend_amount || 
              (transaction.dividend_per_share || 0) * transaction.shares;
            
            let dividendInBaseCurrency = dividendAmount;
            if (asset.currency !== baseCurrency) {
              dividendInBaseCurrency = exchangeRateService.convertCurrency(
                dividendAmount,
                asset.currency,
                baseCurrency
              );
            }

            if (!transaction.is_reinvested) {
              cashFlows.push({ date: transactionDate, amount: dividendInBaseCurrency });
            }
            totalDividends += dividendInBaseCurrency;
            break;

          case 'Sell':
            // Sales are positive cash flow
            cashFlows.push({ date: transactionDate, amount: transactionAmount });
            break;
        }
      }

      // If no transactions, use asset creation date as earliest date
      if (sortedTransactions.length === 0) {
        earliestDate = new Date(asset.created_at);
        totalInvested = asset.total_shares * asset.average_cost_basis;
        if (asset.currency !== baseCurrency) {
          totalInvested = exchangeRateService.convertCurrency(
            totalInvested,
            asset.currency,
            baseCurrency
          );
        }
      }

      // Calculate holding period
      const now = new Date();
      const holdingPeriodDays = Math.max(1, Math.floor((now.getTime() - earliestDate.getTime()) / (1000 * 60 * 60 * 24)));
      const holdingPeriodYears = holdingPeriodDays / 365.25;

      // Calculate total return
      const totalReturn = currentValue + totalDividends + totalInterest - totalInvested;
      const totalReturnPercent = totalInvested > 0 ? (totalReturn / totalInvested) * 100 : 0;

      // Calculate annualized return
      let annualizedReturnPercent = 0;
      if (holdingPeriodYears > 0 && totalInvested > 0) {
        const finalValue = currentValue + totalDividends + totalInterest;
        annualizedReturnPercent = (Math.pow(finalValue / totalInvested, 1 / holdingPeriodYears) - 1) * 100;
      }

      const annualizedReturn = (annualizedReturnPercent / 100) * totalInvested;

      return {
        asset,
        totalReturn,
        totalReturnPercent,
        annualizedReturn,
        annualizedReturnPercent,
        totalDividends,
        totalInterest,
        holdingPeriodDays,
        holdingPeriodYears,
        initialInvestment: totalInvested,
        currentValue,
        totalCashFlow: totalReturn,
        lastUpdated: new Date()
      };

    } catch (error) {
      console.error(`Failed to calculate returns for ${asset.ticker_symbol}:`, error);
      
      // Return fallback calculation
      return {
        asset,
        totalReturn: 0,
        totalReturnPercent: 0,
        annualizedReturn: 0,
        annualizedReturnPercent: 0,
        totalDividends: 0,
        totalInterest: 0,
        holdingPeriodDays: 1,
        holdingPeriodYears: 0,
        initialInvestment: asset.total_shares * asset.average_cost_basis,
        currentValue: asset.total_shares * asset.average_cost_basis,
        totalCashFlow: 0,
        lastUpdated: new Date()
      };
    }
  }

  /**
   * Calculate returns for entire portfolio
   */
  public async calculatePortfolioReturns(assets: Asset[], baseCurrency: string): Promise<PortfolioReturns> {
    console.log(`📊 Calculating portfolio returns for ${assets.length} assets...`);

    // Filter out cash assets for return calculations
    const investmentAssets = assets.filter(asset => asset.asset_type !== 'Cash');
    
    // Calculate returns for each asset
    const assetReturns: AssetReturns[] = [];
    for (const asset of investmentAssets) {
      try {
        const returns = await this.calculateAssetReturns(asset, baseCurrency);
        assetReturns.push(returns);
      } catch (error) {
        console.error(`Failed to calculate returns for ${asset.ticker_symbol}:`, error);
      }
    }

    // Calculate portfolio totals
    const totalInvested = assetReturns.reduce((sum, returns) => sum + returns.initialInvestment, 0);
    const currentPortfolioValue = assetReturns.reduce((sum, returns) => sum + returns.currentValue, 0);
    const totalDividendsReceived = assetReturns.reduce((sum, returns) => sum + returns.totalDividends, 0);
    const totalInterestReceived = assetReturns.reduce((sum, returns) => sum + returns.totalInterest, 0);

    // Calculate portfolio total return
    const portfolioTotalReturn = currentPortfolioValue + totalDividendsReceived + totalInterestReceived - totalInvested;
    const portfolioTotalReturnPercent = totalInvested > 0 ? (portfolioTotalReturn / totalInvested) * 100 : 0;

    // Calculate weighted average holding period
    const weightedHoldingPeriod = assetReturns.reduce((sum, returns) => {
      const weight = returns.initialInvestment / totalInvested;
      return sum + (returns.holdingPeriodYears * weight);
    }, 0);

    // Calculate portfolio annualized return
    let portfolioAnnualizedReturnPercent = 0;
    if (weightedHoldingPeriod > 0 && totalInvested > 0) {
      const finalValue = currentPortfolioValue + totalDividendsReceived + totalInterestReceived;
      portfolioAnnualizedReturnPercent = (Math.pow(finalValue / totalInvested, 1 / weightedHoldingPeriod) - 1) * 100;
    }

    const portfolioAnnualizedReturn = (portfolioAnnualizedReturnPercent / 100) * totalInvested;

    console.log(`✅ Portfolio returns calculated:`);
    console.log(`   Total Return: ${exchangeRateService.formatCurrency(portfolioTotalReturn, baseCurrency)} (${portfolioTotalReturnPercent.toFixed(2)}%)`);
    console.log(`   Annualized Return: ${portfolioAnnualizedReturnPercent.toFixed(2)}%`);

    return {
      assets: assetReturns,
      portfolioTotalReturn,
      portfolioTotalReturnPercent,
      portfolioAnnualizedReturn,
      portfolioAnnualizedReturnPercent,
      totalDividendsReceived,
      totalInterestReceived,
      totalInvested,
      currentPortfolioValue,
      weightedAverageHoldingPeriod: weightedHoldingPeriod,
      lastUpdated: new Date()
    };
  }

  /**
   * Format return percentage with color coding
   */
  public formatReturnPercent(percent: number): { value: string; color: string } {
    const formatted = `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`;
    const color = percent >= 0 ? '#4caf50' : '#f44336';
    return { value: formatted, color };
  }

  /**
   * Format currency amount
   */
  public formatCurrency(amount: number, currency: string): string {
    return exchangeRateService.formatCurrency(amount, currency);
  }
}

// Export singleton instance
export const returnsCalculationService = ReturnsCalculationService.getInstance();
