// Stock Price Service with Backend Proxy Integration
// Milestone 3: External API Integration & Real-time Data

export interface StockPrice {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  currency: string;
  lastUpdated: Date;
  marketStatus: 'OPEN' | 'CLOSED' | 'PRE_MARKET' | 'AFTER_HOURS';
}

export interface StockPriceApiResponse {
  success: boolean;
  data: {
    symbol: string;
    price: number;
    change: number;
    change_percent: string;
    volume: string;
    latest_trading_day: string;
    previous_close: number;
    currency: string;
    source: string;
    last_updated: string;
  };
}

export interface MultipleStockPricesApiResponse {
  success: boolean;
  data: { [symbol: string]: any };
  errors: string[];
  source: string;
}

// Mock prices for fallback and testing
const MOCK_STOCK_PRICES: { [symbol: string]: StockPrice } = {
  'AAPL': {
    symbol: 'AAPL',
    price: 175.50,
    change: 2.30,
    changePercent: 1.33,
    currency: 'USD',
    lastUpdated: new Date(),
    marketStatus: 'CLOSED'
  },
  'TSLA': {
    symbol: 'TSLA',
    price: 248.75,
    change: -5.20,
    changePercent: -2.05,
    currency: 'USD',
    lastUpdated: new Date(),
    marketStatus: 'CLOSED'
  },
  'VTI': {
    symbol: 'VTI',
    price: 245.80,
    change: 1.15,
    changePercent: 0.47,
    currency: 'USD',
    lastUpdated: new Date(),
    marketStatus: 'CLOSED'
  },
  'SPY': {
    symbol: 'SPY',
    price: 485.20,
    change: 3.45,
    changePercent: 0.72,
    currency: 'USD',
    lastUpdated: new Date(),
    marketStatus: 'CLOSED'
  }
};

export class StockPriceService {
  private static instance: StockPriceService;
  private priceCache: Map<string, StockPrice> = new Map();
  private isUsingRealPrices: boolean = false;
  private apiBaseUrl: string = 'https://mreda8g340.execute-api.ap-northeast-1.amazonaws.com/development';
  private cacheDuration: number = 5 * 60 * 1000; // 5 minutes cache for stock prices
  private rateLimitDelay: number = 12000; // 12 seconds between API calls (5 calls per minute limit)
  private lastApiCall: number = 0;

  private constructor() {
    // Initialize with mock data
    Object.values(MOCK_STOCK_PRICES).forEach(price => {
      this.priceCache.set(price.symbol, price);
    });
  }

  public static getInstance(): StockPriceService {
    if (!StockPriceService.instance) {
      StockPriceService.instance = new StockPriceService();
    }
    return StockPriceService.instance;
  }

  /**
   * Get authorization header with JWT token
   */
  private getAuthHeaders(): { [key: string]: string } {
    const token = localStorage.getItem('worthy_token');
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    };
  }

  /**
   * Get stock price for a symbol
   * @param symbol - Stock symbol (e.g., 'AAPL', 'TSLA')
   * @returns Stock price data
   */
  public async getStockPrice(symbol: string): Promise<StockPrice | null> {
    const normalizedSymbol = symbol.toUpperCase();

    // Check cache first
    const cachedPrice = this.priceCache.get(normalizedSymbol);
    if (cachedPrice && !this.shouldRefreshPrice(cachedPrice)) {
      return cachedPrice;
    }

    try {
      // Fetch from backend proxy
      const price = await this.fetchStockPriceFromBackend(normalizedSymbol);
      if (price) {
        this.priceCache.set(normalizedSymbol, price);
        return price;
      }
    } catch (error) {
      console.warn(`Failed to fetch price for ${normalizedSymbol}:`, error);
    }

    // Return cached price if available, even if stale
    return cachedPrice || null;
  }

  /**
   * Get multiple stock prices
   * @param symbols - Array of stock symbols
   * @returns Map of symbol to price data
   */
  public async getMultipleStockPrices(symbols: string[]): Promise<Map<string, StockPrice>> {
    const results = new Map<string, StockPrice>();
    
    try {
      // Use backend batch endpoint
      const response = await fetch(`${this.apiBaseUrl}/api/stock-prices`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ symbols: symbols.map(s => s.toUpperCase()) })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: MultipleStockPricesApiResponse = await response.json();

      if (data.success && data.data) {
        // Process successful results
        Object.entries(data.data).forEach(([symbol, priceData]) => {
          const price: StockPrice = {
            symbol: priceData.symbol,
            price: priceData.price,
            change: priceData.change,
            changePercent: parseFloat(priceData.change_percent),
            currency: priceData.currency || 'USD',
            lastUpdated: new Date(priceData.last_updated),
            marketStatus: this.determineMarketStatus()
          };
          
          results.set(symbol, price);
          this.priceCache.set(symbol, price);
        });

        this.isUsingRealPrices = true;
        console.log(`✅ Successfully fetched ${results.size} stock prices from backend`);
        
        if (data.errors && data.errors.length > 0) {
          console.warn('Some symbols had errors:', data.errors);
        }
      }

    } catch (error) {
      console.error('Failed to fetch multiple stock prices:', error);
      
      // Fall back to individual requests or cached data
      for (const symbol of symbols) {
        const cachedPrice = this.priceCache.get(symbol.toUpperCase());
        if (cachedPrice) {
          results.set(symbol.toUpperCase(), cachedPrice);
        }
      }
    }

    return results;
  }

  /**
   * Check if price data should be refreshed
   * @param price - Cached price data
   * @returns True if should refresh
   */
  private shouldRefreshPrice(price: StockPrice): boolean {
    const now = new Date();
    const timeSinceUpdate = now.getTime() - price.lastUpdated.getTime();
    return timeSinceUpdate > this.cacheDuration;
  }

  /**
   * Fetch stock price from backend proxy
   * @param symbol - Stock symbol
   * @returns Stock price data
   */
  private async fetchStockPriceFromBackend(symbol: string): Promise<StockPrice | null> {
    try {
      console.log(`Fetching stock price for ${symbol} from backend...`);
      
      const response = await fetch(`${this.apiBaseUrl}/api/stock-price/${symbol}`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication required');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: StockPriceApiResponse = await response.json();

      if (data.success && data.data) {
        const price: StockPrice = {
          symbol: data.data.symbol,
          price: data.data.price,
          change: data.data.change,
          changePercent: parseFloat(data.data.change_percent),
          currency: data.data.currency,
          lastUpdated: new Date(data.data.last_updated),
          marketStatus: this.determineMarketStatus()
        };

        this.isUsingRealPrices = true;
        this.lastApiCall = Date.now();
        
        console.log(`✅ Successfully fetched price for ${symbol}: $${price.price}`);
        console.log(`📡 Source: ${data.data.source}`);
        
        return price;
      }

      throw new Error('Invalid API response format');

    } catch (error) {
      console.error(`❌ Failed to fetch stock price for ${symbol}:`, error);
      
      // Return mock data if available
      const mockPrice = MOCK_STOCK_PRICES[symbol];
      if (mockPrice) {
        console.log(`🔄 Using mock price for ${symbol}`);
        return {
          ...mockPrice,
          lastUpdated: new Date()
        };
      }
      
      return null;
    }
  }

  /**
   * Determine market status (simplified)
   */
  private determineMarketStatus(): 'OPEN' | 'CLOSED' | 'PRE_MARKET' | 'AFTER_HOURS' {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();

    // Weekend
    if (day === 0 || day === 6) {
      return 'CLOSED';
    }

    // Weekday market hours (9:30 AM - 4:00 PM EST, simplified)
    if (hour >= 9 && hour < 16) {
      return 'OPEN';
    } else if (hour >= 4 && hour < 9) {
      return 'PRE_MARKET';
    } else {
      return 'AFTER_HOURS';
    }
  }

  /**
   * Get cached prices
   */
  public getCachedPrices(): Map<string, StockPrice> {
    return new Map(this.priceCache);
  }

  /**
   * Clear price cache
   */
  public clearCache(): void {
    this.priceCache.clear();
    console.log('🗑️ Stock price cache cleared');
  }

  /**
   * Get service status
   */
  public getServiceStatus(): {
    isUsingRealPrices: boolean;
    cachedSymbols: string[];
    lastApiCall: Date | null;
    rateLimitStatus: string;
  } {
    return {
      isUsingRealPrices: this.isUsingRealPrices,
      cachedSymbols: Array.from(this.priceCache.keys()),
      lastApiCall: this.lastApiCall > 0 ? new Date(this.lastApiCall) : null,
      rateLimitStatus: this.getRateLimitStatus()
    };
  }

  /**
   * Get rate limit status
   */
  private getRateLimitStatus(): string {
    const timeSinceLastCall = Date.now() - this.lastApiCall;
    if (timeSinceLastCall >= this.rateLimitDelay) {
      return 'Ready';
    } else {
      const waitTime = Math.ceil((this.rateLimitDelay - timeSinceLastCall) / 1000);
      return `Wait ${waitTime}s`;
    }
  }
}

// Export singleton instance
export const stockPriceService = StockPriceService.getInstance();
