import { Asset } from '../types/assets';
import { PortfolioReturns, AssetReturn, ReturnFormat, AdvancedMetrics } from '../types/returns';
import { assetAPI } from './assetApi';
import { exchangeRateService } from './exchangeRateService';
import { assetValuationService } from './assetValuationService';
interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor: string | string[];
    borderColor?: string | string[];
    borderWidth?: number;
    fill?: boolean;
  }>;
}

class ReturnsCalculationService {
  private returnsCache = new Map<string, { data: PortfolioReturns; timestamp: number }>();
  private transactionsCache = new Map<number, { data: any[]; timestamp: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly TRANSACTIONS_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

  /**
   * Clear all caches - useful after bug fixes or data updates
   */
  clearCache(): void {
    this.returnsCache.clear();
    this.transactionsCache.clear();
    console.log('📊 Returns calculation cache cleared');
  }

  /**
   * Get asset transactions with caching
   */
  private async getAssetTransactionsWithCache(assetId: number): Promise<any[]> {
    // Check cache first
    const cached = this.transactionsCache.get(assetId);
    if (cached && Date.now() - cached.timestamp < this.TRANSACTIONS_CACHE_TTL) {
      console.log(`📊 Using cached transactions for asset ${assetId}`);
      return cached.data;
    }

    // Fetch transactions
    try {
      console.log(`🔄 Fetching transactions for asset ${assetId}`);
      const response = await assetAPI.getAssetTransactions(assetId);
      const transactions = response.transactions;

      // Cache the result
      this.transactionsCache.set(assetId, {
        data: transactions,
        timestamp: Date.now()
      });

      return transactions;
    } catch (error: any) {
      console.error(`❌ Error fetching transactions for asset ${assetId}:`, error);

      // If it's a 400 error (endpoint not found), try to get transactions from asset details
      if (error.response?.status === 400) {
        console.log(`🔄 Trying to get transactions from asset details for asset ${assetId}`);
        try {
          const assetResponse = await assetAPI.getAsset(assetId);
          const transactions = assetResponse.transactions || [];

          // Cache the result
          this.transactionsCache.set(assetId, {
            data: transactions,
            timestamp: Date.now()
          });

          return transactions;
        } catch (fallbackError) {
          console.error(`❌ Fallback error for asset ${assetId}:`, fallbackError);
          return [];
        }
      }

      return [];
    }
  }

  /**
   * Calculate portfolio returns including annualized returns (XIRR/CAGR)
   * and total returns with dividends
   */
  async calculatePortfolioReturns(assets: Asset[], baseCurrency: string): Promise<PortfolioReturns> {
    // Create cache key based on assets and currency
    const cacheKey = `${baseCurrency}-${assets.map(a => `${a.asset_id}-${a.updated_at || a.created_at}`).join(',')}`;

    // Check cache first
    const cached = this.returnsCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      console.log('📊 Using cached returns data');
      return cached.data;
    }

    console.log('🧮 Calculating returns for', assets.length, 'assets');

    // Get current portfolio valuation for real-time prices
    const portfolioValuation = await assetValuationService.valuatePortfolio(assets, baseCurrency);

    const assetReturns: AssetReturn[] = [];
    let totalInitialInvestment = 0;
    let totalCurrentValue = 0;
    let totalDividends = 0;

    // Process each asset
    for (const asset of assets) {
      // Skip cash assets for return calculations
      if (asset.asset_type === 'Cash') {
        continue;
      }

      try {
        // Get transactions for this asset using cache
        const transactions = await this.getAssetTransactionsWithCache(asset.asset_id);

        if (transactions.length === 0) {
          continue;
        }

        // Get current valuation for this asset
        const assetValuation = portfolioValuation.assets.find(av => av.asset.asset_id === asset.asset_id);
        if (!assetValuation) {
          console.warn(`No valuation found for asset ${asset.ticker_symbol}`);
          continue;
        }

        // Use average_cost_basis * total_shares as cost basis — this is maintained as a
        // weighted average by the backend and is reliable across all transaction types.
        // Summing transaction prices is unreliable because Initialization transactions
        // may carry a snapshot price at the time of app setup, not per-lot purchase prices.
        const assetCostBasis = asset.total_shares * asset.average_cost_basis;
        let initialInvestmentInBaseCurrency: number;
        if (asset.currency !== baseCurrency) {
          const rate = await exchangeRateService.getExchangeRate(asset.currency, baseCurrency);
          initialInvestmentInBaseCurrency = assetCostBasis * rate;
        } else {
          initialInvestmentInBaseCurrency = assetCostBasis;
        }

        // Get current value from valuation service (already in base currency)
        const currentValueInBaseCurrency = assetValuation.totalValueInBaseCurrency;

        // Calculate total return
        const totalReturn = currentValueInBaseCurrency - initialInvestmentInBaseCurrency;
        const totalReturnPercent = initialInvestmentInBaseCurrency > 0
          ? (totalReturn / initialInvestmentInBaseCurrency) * 100
          : 0;

        // Holding period: use earliest non-Initialization transaction date so the CAGR
        // reflects real market exposure, not the app enrollment date.
        const nonInitTx = transactions
          .filter(t => t.transaction_type !== 'Initialization' && t.transaction_type !== 'Dividend')
          .map(t => new Date(t.transaction_date || t.date))
          .filter(d => !isNaN(d.getTime()));
        const earliestDate = nonInitTx.length > 0
          ? new Date(Math.min(...nonInitTx.map(d => d.getTime())))
          : new Date(asset.created_at);
        const now = new Date();
        const holdingPeriodDays = Math.max(1, (now.getTime() - earliestDate.getTime()) / (1000 * 60 * 60 * 24));
        const holdingPeriodYears = holdingPeriodDays / 365.25;

        // Always use CAGR — linear annualization amplifies errors for short periods.
        // For periods under 30 days just show the actual return (too short to annualize meaningfully).
        let annualizedReturnPercent = 0;

        if (initialInvestmentInBaseCurrency > 0) {
          if (holdingPeriodDays < 30) {
            annualizedReturnPercent = totalReturnPercent;
          } else {
            const ratio = currentValueInBaseCurrency / initialInvestmentInBaseCurrency;
            if (ratio > 0) {
              annualizedReturnPercent = (Math.pow(ratio, 1 / holdingPeriodYears) - 1) * 100;
            }
          }
        }

        // Calculate annualized return amount
        const annualizedReturn = (annualizedReturnPercent / 100) * initialInvestmentInBaseCurrency;

        // Calculate dividends from transactions
        const dividendTransactions = transactions.filter(t => t.transaction_type === 'Dividend');
        let totalDividendsForAsset = 0;

        for (const divTransaction of dividendTransactions) {
          // Dividend amount is stored as shares * price_per_share
          let dividendAmount = divTransaction.shares * divTransaction.price_per_share;

          // Convert dividend to base currency if needed
          if (divTransaction.currency !== baseCurrency) {
            const rate = await exchangeRateService.getExchangeRate(divTransaction.currency, baseCurrency);
            dividendAmount *= rate;
          }

          totalDividendsForAsset += dividendAmount;
        }

        // Add to asset returns
        assetReturns.push({
          asset,
          initialInvestment: initialInvestmentInBaseCurrency,
          currentValue: currentValueInBaseCurrency,
          totalReturn,
          totalReturnPercent,
          annualizedReturn,
          annualizedReturnPercent,
          holdingPeriodYears,
          totalDividends: totalDividendsForAsset
        });

        // Add to portfolio totals
        totalInitialInvestment += initialInvestmentInBaseCurrency;
        totalCurrentValue += currentValueInBaseCurrency;
        totalDividends += totalDividendsForAsset;

      } catch (error) {
        console.error(`Error calculating returns for asset ${asset.ticker_symbol}:`, error);
      }
    }

    // Calculate portfolio level metrics
    const portfolioTotalReturn = totalCurrentValue - totalInitialInvestment;
    const portfolioTotalReturnPercent = totalInitialInvestment > 0
      ? (portfolioTotalReturn / totalInitialInvestment) * 100
      : 0;

    // Calculate weighted average holding period
    let weightedHoldingPeriod = 0;
    let totalWeight = 0;

    assetReturns.forEach(assetReturn => {
      const weight = assetReturn.initialInvestment;
      weightedHoldingPeriod += assetReturn.holdingPeriodYears * weight;
      totalWeight += weight;
    });

    const weightedAverageHoldingPeriod = totalWeight > 0 ? weightedHoldingPeriod / totalWeight : 0;

    let portfolioAnnualizedReturnPercent = 0;
    if (totalInitialInvestment > 0 && weightedAverageHoldingPeriod > 0) {
      const portfolioHoldingPeriodDays = weightedAverageHoldingPeriod * 365.25;
      if (portfolioHoldingPeriodDays < 30) {
        portfolioAnnualizedReturnPercent = portfolioTotalReturnPercent;
      } else {
        const ratio = totalCurrentValue / totalInitialInvestment;
        if (ratio > 0) {
          portfolioAnnualizedReturnPercent = (Math.pow(ratio, 1 / weightedAverageHoldingPeriod) - 1) * 100;
        }
      }
    }

    // Calculate portfolio annualized return amount
    const portfolioAnnualizedReturn = (portfolioAnnualizedReturnPercent / 100) * totalInitialInvestment;

    // Calculate advanced metrics
    const advancedMetrics = this.calculateAdvancedMetrics(
      assetReturns,
      portfolioAnnualizedReturnPercent,
      portfolioTotalReturn,
      totalDividends,
      totalInitialInvestment
    );

    // Debug portfolio-level calculation
    console.log('📊 Portfolio CAGR Debug:', {
      totalCurrentValue,
      totalInitialInvestment,
      portfolioRatio: totalCurrentValue / totalInitialInvestment,
      weightedAverageHoldingPeriod,
      portfolioTotalReturnPercent,
      portfolioAnnualizedReturnPercent
    });

    console.log('✅ Returns calculation completed:', {
      totalAssets: assetReturns.length,
      portfolioTotalReturn,
      portfolioAnnualizedReturnPercent,
      weightedAverageHoldingPeriod
    });

    const result = {
      assets: assetReturns,
      portfolioTotalReturn,
      portfolioTotalReturnPercent,
      portfolioAnnualizedReturn,
      portfolioAnnualizedReturnPercent,
      weightedAverageHoldingPeriod,
      totalDividendsReceived: totalDividends,
      advancedMetrics
    };

    // Cache the result
    this.returnsCache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });

    return result;
  }

  /**
   * Calculate advanced portfolio metrics
   */
  private calculateAdvancedMetrics(
    assetReturns: AssetReturn[],
    portfolioAnnualizedReturnPercent: number,
    portfolioTotalReturn: number,
    totalDividends: number,
    totalInvestment: number
  ): AdvancedMetrics {
    // Calculate Sharpe Ratio
    const sharpeRatio = this.calculateSharpeRatio(portfolioAnnualizedReturnPercent / 100);

    // Calculate max drawdown (simplified)
    const maxDrawdown = portfolioTotalReturn < 0 ? Math.abs(portfolioTotalReturn / totalInvestment) * 100 : 0;

    // Calculate dividend yield
    const dividendYield = totalInvestment > 0 ? (totalDividends / totalInvestment) * 100 : 0;

    // Get performance grade
    const performanceGrade = this.getPerformanceGrade(portfolioAnnualizedReturnPercent).grade;

    // Calculate risk-adjusted return
    const riskAdjustedReturn = sharpeRatio * (portfolioAnnualizedReturnPercent / 100);

    // Find best and worst performers
    let bestPerformer = '';
    let worstPerformer = '';

    if (assetReturns.length > 0) {
      const sorted = [...assetReturns].sort((a, b) => b.annualizedReturnPercent - a.annualizedReturnPercent);
      bestPerformer = sorted[0].asset.ticker_symbol;
      worstPerformer = sorted[sorted.length - 1].asset.ticker_symbol;
    }

    // Estimate portfolio volatility
    const volatility = Math.abs(portfolioAnnualizedReturnPercent) * 0.3; // Simplified estimate

    return {
      sharpeRatio,
      maxDrawdown,
      dividendYield,
      performanceGrade,
      riskAdjustedReturn,
      bestPerformer,
      worstPerformer,
      volatility
    };
  }

  /**
   * Generate chart data for asset allocation
   */
  generateAllocationChartData(portfolioReturns: PortfolioReturns): ChartData {
    const assetTypes = new Map<string, number>();

    // Group assets by type
    portfolioReturns.assets.forEach(assetReturn => {
      const type = assetReturn.asset.asset_type;
      const currentValue = assetReturn.currentValue;

      if (assetTypes.has(type)) {
        assetTypes.set(type, assetTypes.get(type)! + currentValue);
      } else {
        assetTypes.set(type, currentValue);
      }
    });

    // Sort by value
    const sortedTypes = Array.from(assetTypes.entries())
      .sort((a, b) => b[1] - a[1]);

    // Generate chart data
    return {
      labels: sortedTypes.map(([type]) => type),
      datasets: [{
        label: 'Asset Allocation',
        data: sortedTypes.map(([, value]) => value),
        backgroundColor: [
          '#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#43e97b',
          '#a8edea', '#fed6e3', '#ffecd2', '#fcb69f'
        ],
        borderWidth: 1
      }]
    };
  }

  /**
   * Generate chart data for returns comparison
   */
  generateReturnsComparisonChartData(portfolioReturns: PortfolioReturns): ChartData {
    // Sort assets by annualized return
    const sortedAssets = [...portfolioReturns.assets]
      .sort((a, b) => b.annualizedReturnPercent - a.annualizedReturnPercent)
      .slice(0, 10); // Top 10 assets

    // Generate colors based on return values
    const colors = sortedAssets.map(asset => {
      return asset.annualizedReturnPercent >= 0 ? '#4caf50' : '#f44336';
    });

    return {
      labels: sortedAssets.map(asset => asset.asset.ticker_symbol),
      datasets: [{
        label: 'Annualized Return (%)',
        data: sortedAssets.map(asset => asset.annualizedReturnPercent),
        backgroundColor: colors,
        borderColor: colors,
        borderWidth: 1
      }]
    };
  }

  /**
   * Generate chart data for performance over time
   * Note: This is a simplified version that would need real historical data
   */
  generatePerformanceChartData(portfolioReturns: PortfolioReturns): ChartData {
    // This would normally use historical data points
    // For now, we'll create a simplified simulation based on current returns

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonth = new Date().getMonth();

    // Create labels for the last 12 months
    const labels = [];
    for (let i = 11; i >= 0; i--) {
      const monthIndex = (currentMonth - i + 12) % 12;
      labels.push(months[monthIndex]);
    }

    // Simulate growth based on annualized return
    const annualizedReturn = portfolioReturns.portfolioAnnualizedReturnPercent / 100;
    const monthlyReturn = Math.pow(1 + annualizedReturn, 1 / 12) - 1;

    // Start with current value and work backwards
    const totalValue = portfolioReturns.assets.reduce((sum, asset) => sum + asset.currentValue, 0);
    let currentValue = totalValue;
    const dataPoints = [];

    for (let i = 0; i < 12; i++) {
      dataPoints.unshift(currentValue);
      currentValue = currentValue / (1 + monthlyReturn);
    }

    return {
      labels,
      datasets: [{
        label: 'Portfolio Value',
        data: dataPoints,
        backgroundColor: 'rgba(102, 126, 234, 0.2)',
        borderColor: '#667eea',
        borderWidth: 2,
        fill: true
      }]
    };
  }

  /**
   * Generate data for export
   */
  generateExportData(portfolioReturns: PortfolioReturns, baseCurrency: string): any[] {
    const exportData = [];

    // Add portfolio summary
    exportData.push({
      type: 'Portfolio Summary',
      name: 'Total Portfolio',
      value: portfolioReturns.portfolioTotalReturn,
      returnPercent: portfolioReturns.portfolioTotalReturnPercent,
      annualizedReturn: portfolioReturns.portfolioAnnualizedReturnPercent,
      holdingPeriod: portfolioReturns.weightedAverageHoldingPeriod,
      dividends: portfolioReturns.totalDividendsReceived,
      currency: baseCurrency
    });

    // Add individual assets
    portfolioReturns.assets.forEach(asset => {
      exportData.push({
        type: asset.asset.asset_type,
        name: asset.asset.ticker_symbol,
        value: asset.currentValue,
        returnPercent: asset.totalReturnPercent,
        annualizedReturn: asset.annualizedReturnPercent,
        holdingPeriod: asset.holdingPeriodYears,
        dividends: asset.totalDividends,
        currency: baseCurrency
      });
    });

    return exportData;
  }

  /**
   * Format return percentage with color coding
   */
  formatReturnPercent(percent: number): ReturnFormat {
    if (isNaN(percent) || !isFinite(percent)) {
      return {
        value: 'N/A',
        color: 'text.secondary'
      };
    }

    if (percent > 0) {
      return {
        value: `+${percent.toFixed(2)}%`,
        color: 'success.main'
      };
    } else if (percent < 0) {
      return {
        value: `${percent.toFixed(2)}%`,
        color: 'error.main'
      };
    } else {
      return {
        value: `0.00%`,
        color: 'text.secondary'
      };
    }
  }

  /**
   * Calculate Sharpe Ratio for an asset or portfolio
   * Sharpe Ratio = (Return - Risk-free rate) / Standard Deviation
   */
  calculateSharpeRatio(annualizedReturn: number, riskFreeRate: number = 0.02): number {
    // For simplicity, we'll use a basic calculation
    // In a real implementation, you'd need historical price data to calculate standard deviation
    const excessReturn = annualizedReturn - riskFreeRate;
    const estimatedVolatility = Math.abs(annualizedReturn) * 0.3; // Rough estimate

    return estimatedVolatility > 0 ? excessReturn / estimatedVolatility : 0;
  }

  /**
   * Calculate maximum drawdown for an asset
   * This is a simplified version - real implementation would need historical price data
   */
  calculateMaxDrawdown(currentReturn: number): number {
    // Simplified calculation based on current performance
    // In reality, this would require historical price data
    if (currentReturn >= 0) {
      return 0; // No drawdown if currently profitable
    }

    return Math.abs(currentReturn); // Use current loss as proxy for max drawdown
  }

  /**
   * Get performance grade based on annualized return
   */
  getPerformanceGrade(annualizedReturnPercent: number): { grade: string; color: string } {
    if (annualizedReturnPercent >= 15) {
      return { grade: 'A+', color: 'success.main' };
    } else if (annualizedReturnPercent >= 10) {
      return { grade: 'A', color: 'success.main' };
    } else if (annualizedReturnPercent >= 7) {
      return { grade: 'B+', color: 'info.main' };
    } else if (annualizedReturnPercent >= 5) {
      return { grade: 'B', color: 'info.main' };
    } else if (annualizedReturnPercent >= 0) {
      return { grade: 'C', color: 'warning.main' };
    } else {
      return { grade: 'D', color: 'error.main' };
    }
  }
}

export const returnsCalculationService = new ReturnsCalculationService();
