// Asset Valuation Service with Real-time Data Integration
// Milestone 3: External API Integration & Real-time Data
// Combines exchange rates and stock prices for comprehensive asset valuation

import { exchangeRateService } from './exchangeRateService';
import { stockPriceService, type StockPrice } from './stockPriceService';
import type { Asset } from '../types/assets';

export interface AssetValuation {
  asset: Asset;
  currentPrice?: number;
  currentPriceInBaseCurrency: number;
  totalValueInOriginalCurrency: number;
  totalValueInBaseCurrency: number;
  unrealizedGainLoss: number;
  unrealizedGainLossPercent: number;
  lastUpdated: Date;
  priceSource: 'API' | 'MOCK' | 'MANUAL';
  exchangeRateUsed?: number;
}

export interface PortfolioValuation {
  assets: AssetValuation[];
  totalValueInBaseCurrency: number;
  totalUnrealizedGainLoss: number;
  totalUnrealizedGainLossPercent: number;
  baseCurrency: string;
  lastUpdated: Date;
  apiStatus: {
    exchangeRates: boolean;
    stockPrices: boolean;
  };
}

export class AssetValuationService {
  private static instance: AssetValuationService;

  private constructor() {}

  public static getInstance(): AssetValuationService {
    if (!AssetValuationService.instance) {
      AssetValuationService.instance = new AssetValuationService();
    }
    return AssetValuationService.instance;
  }

  /**
   * Value a single asset with current market data
   * @param asset - Asset to value
   * @param baseCurrency - Base currency for conversion
   * @returns Asset valuation
   */
  public async valuateAsset(asset: Asset, baseCurrency: string): Promise<AssetValuation> {
    let currentPrice: number | undefined;
    let priceSource: 'API' | 'MOCK' | 'MANUAL' = 'MANUAL';
    
    // Get current market price for non-cash assets
    if (asset.asset_type !== 'Cash') {
      try {
        const stockPrice = await stockPriceService.getStockPrice(asset.ticker_symbol);
        if (stockPrice) {
          currentPrice = stockPrice.price;
          priceSource = stockPriceService.getServiceStatus().isUsingRealPrices ? 'API' : 'MOCK';
        }
      } catch (error) {
        console.warn(`Failed to get current price for ${asset.ticker_symbol}:`, error);
      }
    }

    // Use current price if available, otherwise use average cost basis
    const pricePerUnit = currentPrice || asset.average_cost_basis;
    
    // Calculate total value in original currency
    const totalValueInOriginalCurrency = asset.total_shares * pricePerUnit;
    
    // Convert to base currency
    let totalValueInBaseCurrency = totalValueInOriginalCurrency;
    let exchangeRateUsed: number | undefined;
    
    if (asset.currency !== baseCurrency) {
      try {
        // Ensure exchange rates are fresh
        await exchangeRateService.getRatesWithRefresh();
        
        totalValueInBaseCurrency = exchangeRateService.convertCurrency(
          totalValueInOriginalCurrency,
          asset.currency,
          baseCurrency
        );
        
        exchangeRateUsed = exchangeRateService.getExchangeRate(asset.currency, baseCurrency);
      } catch (error) {
        console.warn(`Failed to convert currency for ${asset.ticker_symbol}:`, error);
        // Keep original value if conversion fails
      }
    }

    // Calculate unrealized gain/loss
    const originalTotalCost = asset.total_shares * asset.average_cost_basis;
    const originalTotalCostInBaseCurrency = asset.currency !== baseCurrency
      ? exchangeRateService.convertCurrency(originalTotalCost, asset.currency, baseCurrency)
      : originalTotalCost;
    
    const unrealizedGainLoss = totalValueInBaseCurrency - originalTotalCostInBaseCurrency;
    const unrealizedGainLossPercent = originalTotalCostInBaseCurrency > 0
      ? (unrealizedGainLoss / originalTotalCostInBaseCurrency) * 100
      : 0;

    return {
      asset,
      currentPrice,
      currentPriceInBaseCurrency: asset.currency !== baseCurrency && currentPrice
        ? exchangeRateService.convertCurrency(currentPrice, asset.currency, baseCurrency)
        : pricePerUnit,
      totalValueInOriginalCurrency,
      totalValueInBaseCurrency,
      unrealizedGainLoss,
      unrealizedGainLossPercent,
      lastUpdated: new Date(),
      priceSource,
      exchangeRateUsed
    };
  }

  /**
   * Value entire portfolio with current market data
   * @param assets - Array of assets to value
   * @param baseCurrency - Base currency for conversion
   * @returns Portfolio valuation
   */
  public async valuatePortfolio(assets: Asset[], baseCurrency: string): Promise<PortfolioValuation> {
    console.log(`📊 Valuating portfolio of ${assets.length} assets in ${baseCurrency}...`);
    
    // Refresh exchange rates first
    try {
      await exchangeRateService.getRatesWithRefresh();
    } catch (error) {
      console.warn('Failed to refresh exchange rates:', error);
    }

    // Get unique stock symbols for batch fetching
    const stockSymbols = assets
      .filter(asset => asset.asset_type !== 'Cash')
      .map(asset => asset.ticker_symbol);
    
    // Pre-fetch stock prices for better performance
    if (stockSymbols.length > 0) {
      try {
        console.log(`🔄 Pre-fetching prices for ${stockSymbols.length} symbols...`);
        await stockPriceService.getMultipleStockPrices(stockSymbols);
      } catch (error) {
        console.warn('Failed to pre-fetch stock prices:', error);
      }
    }

    // Value each asset
    const assetValuations: AssetValuation[] = [];
    for (const asset of assets) {
      try {
        const valuation = await this.valuateAsset(asset, baseCurrency);
        assetValuations.push(valuation);
      } catch (error) {
        console.error(`Failed to value asset ${asset.ticker_symbol}:`, error);
        
        // Create fallback valuation
        const fallbackValuation: AssetValuation = {
          asset,
          currentPriceInBaseCurrency: asset.average_cost_basis,
          totalValueInOriginalCurrency: asset.total_shares * asset.average_cost_basis,
          totalValueInBaseCurrency: asset.total_shares * asset.average_cost_basis,
          unrealizedGainLoss: 0,
          unrealizedGainLossPercent: 0,
          lastUpdated: new Date(),
          priceSource: 'MANUAL'
        };
        
        assetValuations.push(fallbackValuation);
      }
    }

    // Calculate portfolio totals
    const totalValueInBaseCurrency = assetValuations.reduce(
      (sum, valuation) => sum + valuation.totalValueInBaseCurrency,
      0
    );

    const totalUnrealizedGainLoss = assetValuations.reduce(
      (sum, valuation) => sum + valuation.unrealizedGainLoss,
      0
    );

    const totalOriginalCost = assetValuations.reduce(
      (sum, valuation) => {
        const originalCost = valuation.asset.total_shares * valuation.asset.average_cost_basis;
        return sum + (valuation.asset.currency !== baseCurrency
          ? exchangeRateService.convertCurrency(originalCost, valuation.asset.currency, baseCurrency)
          : originalCost);
      },
      0
    );

    const totalUnrealizedGainLossPercent = totalOriginalCost > 0
      ? (totalUnrealizedGainLoss / totalOriginalCost) * 100
      : 0;

    const portfolioValuation: PortfolioValuation = {
      assets: assetValuations,
      totalValueInBaseCurrency,
      totalUnrealizedGainLoss,
      totalUnrealizedGainLossPercent,
      baseCurrency,
      lastUpdated: new Date(),
      apiStatus: {
        exchangeRates: exchangeRateService.isUsingRealApiRates(),
        stockPrices: stockPriceService.getServiceStatus().isUsingRealPrices
      }
    };

    console.log(`✅ Portfolio valuation complete:`);
    console.log(`   Total Value: ${exchangeRateService.formatCurrency(totalValueInBaseCurrency, baseCurrency)}`);
    console.log(`   Unrealized P&L: ${exchangeRateService.formatCurrency(totalUnrealizedGainLoss, baseCurrency)} (${totalUnrealizedGainLossPercent.toFixed(2)}%)`);
    console.log(`   API Status: Exchange Rates: ${portfolioValuation.apiStatus.exchangeRates ? '✅' : '❌'}, Stock Prices: ${portfolioValuation.apiStatus.stockPrices ? '✅' : '❌'}`);

    return portfolioValuation;
  }

  /**
   * Get asset allocation breakdown
   * @param portfolioValuation - Portfolio valuation data
   * @returns Asset allocation by type and currency
   */
  public getAssetAllocation(portfolioValuation: PortfolioValuation): {
    byType: { [type: string]: { value: number; percentage: number } };
    byCurrency: { [currency: string]: { value: number; percentage: number } };
    byAsset: { symbol: string; value: number; percentage: number }[];
  } {
    const { assets, totalValueInBaseCurrency } = portfolioValuation;

    // By asset type
    const byType: { [type: string]: { value: number; percentage: number } } = {};
    assets.forEach(valuation => {
      const type = valuation.asset.asset_type;
      if (!byType[type]) {
        byType[type] = { value: 0, percentage: 0 };
      }
      byType[type].value += valuation.totalValueInBaseCurrency;
    });

    Object.keys(byType).forEach(type => {
      byType[type].percentage = totalValueInBaseCurrency > 0
        ? (byType[type].value / totalValueInBaseCurrency) * 100
        : 0;
    });

    // By currency
    const byCurrency: { [currency: string]: { value: number; percentage: number } } = {};
    assets.forEach(valuation => {
      const currency = valuation.asset.currency;
      if (!byCurrency[currency]) {
        byCurrency[currency] = { value: 0, percentage: 0 };
      }
      byCurrency[currency].value += valuation.totalValueInBaseCurrency;
    });

    Object.keys(byCurrency).forEach(currency => {
      byCurrency[currency].percentage = totalValueInBaseCurrency > 0
        ? (byCurrency[currency].value / totalValueInBaseCurrency) * 100
        : 0;
    });

    // By individual asset
    const byAsset = assets.map(valuation => ({
      symbol: valuation.asset.ticker_symbol,
      value: valuation.totalValueInBaseCurrency,
      percentage: totalValueInBaseCurrency > 0
        ? (valuation.totalValueInBaseCurrency / totalValueInBaseCurrency) * 100
        : 0
    })).sort((a, b) => b.value - a.value);

    return { byType, byCurrency, byAsset };
  }

  /**
   * Format currency using exchange rate service
   * @param amount - Amount to format
   * @param currency - Currency code
   * @returns Formatted currency string
   */
  public formatCurrency(amount: number, currency: string): string {
    return exchangeRateService.formatCurrency(amount, currency);
  }

  /**
   * Get service status
   */
  public getServiceStatus(): {
    exchangeRates: ReturnType<typeof exchangeRateService.getApiStatus>;
    stockPrices: ReturnType<typeof stockPriceService.getServiceStatus>;
  } {
    return {
      exchangeRates: exchangeRateService.getApiStatus(),
      stockPrices: stockPriceService.getServiceStatus()
    };
  }
}

// Export singleton instance
export const assetValuationService = AssetValuationService.getInstance();
