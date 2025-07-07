// Enhanced Stock Price Service with Multi-API Backend Integration
// Uses backend APIs with Polygon, Finnhub, Alpha Vantage, and Yahoo Finance fallback

import api from './api';

export interface StockPrice {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  currency: string;
  lastUpdated: Date;
  marketStatus: 'OPEN' | 'CLOSED' | 'PRE_MARKET' | 'AFTER_HOURS';
  source: 'polygon' | 'finnhub' | 'alphavantage' | 'yahoo' | 'mock';
  high?: number;
  low?: number;
  open?: number;
  previousClose?: number;
  volume?: number;
}

export class EnhancedStockPriceService {
  private static instance: EnhancedStockPriceService;
  private priceCache: Map<string, StockPrice> = new Map();
  private cacheDuration: number = 5 * 60 * 1000; // 5 minutes cache

  private constructor() {}

  public static getInstance(): EnhancedStockPriceService {
    if (!EnhancedStockPriceService.instance) {
      EnhancedStockPriceService.instance = new EnhancedStockPriceService();
    }
    return EnhancedStockPriceService.instance;
  }

  /**
   * Get stock price using multi-API backend fallback
   */
  public async getStockPrice(symbol: string): Promise<StockPrice | null> {
    const normalizedSymbol = symbol.toUpperCase();

    // Check cache first
    const cachedPrice = this.priceCache.get(normalizedSymbol);
    if (cachedPrice && !this.shouldRefreshPrice(cachedPrice)) {
      return cachedPrice;
    }

    try {
      console.log(`📡 Fetching ${normalizedSymbol} using multi-API backend...`);
      
      const response = await api.get(`/api/stock-prices-multi?symbols=${normalizedSymbol}`);
      const data = response.data;
      
      if (data.prices && data.prices[normalizedSymbol]) {
        const priceData = data.prices[normalizedSymbol];
        
        const stockPrice: StockPrice = {
          symbol: priceData.symbol,
          price: priceData.price,
          change: priceData.change,
          changePercent: priceData.changePercent,
          currency: priceData.currency,
          lastUpdated: new Date(priceData.lastUpdated),
          marketStatus: priceData.marketStatus,
          source: priceData.source,
          high: priceData.high,
          low: priceData.low,
          open: priceData.open,
          previousClose: priceData.previousClose,
          volume: priceData.volume
        };
        
        this.priceCache.set(normalizedSymbol, stockPrice);
        console.log(`✅ Successfully fetched ${normalizedSymbol} from ${priceData.source}: $${priceData.price}`);
        
        return stockPrice;
      }
      
      return null;
    } catch (error) {
      console.error(`❌ Failed to fetch stock price for ${normalizedSymbol}:`, error);
      
      // Return cached price if available
      if (cachedPrice) {
        console.log(`🔄 Using cached price for ${normalizedSymbol}`);
        return cachedPrice;
      }
      
      return null;
    }
  }

  /**
   * Get multiple stock prices with backend multi-API
   */
  public async getMultipleStockPrices(symbols: string[]): Promise<Map<string, StockPrice>> {
    const results = new Map<string, StockPrice>();
    
    if (symbols.length === 0) {
      return results;
    }

    try {
      const symbolsParam = symbols.map(s => s.toUpperCase()).join(',');
      console.log(`📡 Fetching multiple prices using multi-API backend: ${symbolsParam}`);
      
      const response = await api.get(`/api/stock-prices-multi?symbols=${symbolsParam}`);
      const data = response.data;
      
      if (data.prices) {
        Object.entries(data.prices).forEach(([symbol, priceData]: [string, any]) => {
          const stockPrice: StockPrice = {
            symbol: priceData.symbol,
            price: priceData.price,
            change: priceData.change,
            changePercent: priceData.changePercent,
            currency: priceData.currency,
            lastUpdated: new Date(priceData.lastUpdated),
            marketStatus: priceData.marketStatus,
            source: priceData.source,
            high: priceData.high,
            low: priceData.low,
            open: priceData.open,
            previousClose: priceData.previousClose,
            volume: priceData.volume
          };
          
          this.priceCache.set(symbol, stockPrice);
          results.set(symbol, stockPrice);
        });
        
        console.log(`✅ Successfully fetched ${results.size}/${symbols.length} stock prices`);
      }
      
    } catch (error) {
      console.error('❌ Failed to fetch multiple stock prices:', error);
      
      // Try individual requests as fallback
      for (const symbol of symbols) {
        try {
          const price = await this.getStockPrice(symbol);
          if (price) {
            results.set(symbol.toUpperCase(), price);
          }
        } catch (err) {
          console.error(`Failed to fetch ${symbol}:`, err);
        }
      }
    }

    return results;
  }

  /**
   * Check if price should be refreshed
   */
  private shouldRefreshPrice(price: StockPrice): boolean {
    return Date.now() - price.lastUpdated.getTime() > this.cacheDuration;
  }

  /**
   * Get service status
   */
  public getServiceStatus(): {
    isUsingRealPrices: boolean;
    cachedSymbols: string[];
    lastSuccessfulSource: string | null;
    cacheSize: number;
  } {
    const cachedPrices = Array.from(this.priceCache.values());
    const lastPrice = cachedPrices
      .sort((a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime())[0];

    return {
      isUsingRealPrices: lastPrice ? lastPrice.source !== 'mock' : false,
      cachedSymbols: Array.from(this.priceCache.keys()),
      lastSuccessfulSource: lastPrice?.source || null,
      cacheSize: this.priceCache.size
    };
  }

  /**
   * Check if showing live prices (not mock)
   */
  public isShowingLivePrices(): boolean {
    const status = this.getServiceStatus();
    return status.isUsingRealPrices;
  }

  /**
   * Get user-friendly status message
   */
  public getStatusMessage(): string {
    const status = this.getServiceStatus();
    
    if (!status.lastSuccessfulSource) {
      return 'No price data fetched yet';
    }
    
    if (status.lastSuccessfulSource === 'mock') {
      return 'Using mock prices - All APIs unavailable';
    }
    
    const sourceNames = {
      polygon: 'Polygon.io',
      finnhub: 'Finnhub',
      alphavantage: 'Alpha Vantage',
      yahoo: 'Yahoo Finance'
    };
    
    const sourceName = sourceNames[status.lastSuccessfulSource as keyof typeof sourceNames] || status.lastSuccessfulSource;
    return `Live prices from ${sourceName}`;
  }

  /**
   * Clear cache
   */
  public clearCache(): void {
    this.priceCache.clear();
    console.log('🗑️ Stock price cache cleared');
  }

  /**
   * Get cached price count
   */
  public getCacheInfo(): { size: number; symbols: string[] } {
    return {
      size: this.priceCache.size,
      symbols: Array.from(this.priceCache.keys())
    };
  }
}

// Export singleton instance
export const enhancedStockPriceService = EnhancedStockPriceService.getInstance();
