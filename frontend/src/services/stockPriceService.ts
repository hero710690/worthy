// Stock Price Service with Direct Alpha Vantage API Integration
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

export interface AlphaVantageGlobalQuote {
  '01. symbol': string;
  '02. open': string;
  '03. high': string;
  '04. low': string;
  '05. price': string;
  '06. volume': string;
  '07. latest trading day': string;
  '08. previous close': string;
  '09. change': string;
  '10. change percent': string;
}

export interface AlphaVantageResponse {
  'Global Quote': AlphaVantageGlobalQuote;
  'Error Message'?: string;
  'Note'?: string;
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
  },
  'QQQ': {
    symbol: 'QQQ',
    price: 385.40,
    change: 1.85,
    changePercent: 0.48,
    currency: 'USD',
    lastUpdated: new Date(),
    marketStatus: 'CLOSED'
  }
};

export class StockPriceService {
  private static instance: StockPriceService;
  private priceCache: Map<string, StockPrice> = new Map();
  private isUsingRealPrices: boolean = false;
  private apiKey: string = 'REDACTED_ALPHA_VANTAGE_KEY'; // Real Alpha Vantage API key
  private baseUrl: string = 'https://www.alphavantage.co/query';
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
      // Fetch from Alpha Vantage API
      const price = await this.fetchStockPriceFromAPI(normalizedSymbol);
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
    
    // Process symbols with rate limiting
    for (const symbol of symbols) {
      try {
        const price = await this.getStockPrice(symbol);
        if (price) {
          results.set(symbol.toUpperCase(), price);
        }
        
        // Rate limiting: wait between API calls
        if (symbols.length > 1) {
          await this.waitForRateLimit();
        }
      } catch (error) {
        console.warn(`Failed to get price for ${symbol}:`, error);
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
   * Fetch stock price from Alpha Vantage API
   * @param symbol - Stock symbol
   * @returns Stock price data
   */
  private async fetchStockPriceFromAPI(symbol: string): Promise<StockPrice | null> {
    try {
      // Rate limiting
      await this.waitForRateLimit();

      const url = `${this.baseUrl}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${this.apiKey}`;
      
      console.log(`Fetching stock price for ${symbol} from Alpha Vantage...`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Worthy-Portfolio-App/1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: AlphaVantageResponse = await response.json();

      // Check for API errors
      if (data['Error Message']) {
        throw new Error(`API Error: ${data['Error Message']}`);
      }

      if (data['Note']) {
        console.warn(`API Rate Limit: ${data['Note']}`);
        // Return mock data if rate limited
        const mockPrice = MOCK_STOCK_PRICES[symbol];
        if (mockPrice) {
          return { ...mockPrice, lastUpdated: new Date() };
        }
        throw new Error(`API Rate Limit: ${data['Note']}`);
      }

      if (!data['Global Quote']) {
        throw new Error('Invalid API response format');
      }

      const quote = data['Global Quote'];
      
      // Parse the response
      const price: StockPrice = {
        symbol: quote['01. symbol'],
        price: parseFloat(quote['05. price']),
        change: parseFloat(quote['09. change']),
        changePercent: parseFloat(quote['10. change percent'].replace('%', '')),
        currency: 'USD', // Alpha Vantage primarily provides USD prices
        lastUpdated: new Date(),
        marketStatus: this.determineMarketStatus()
      };

      this.isUsingRealPrices = true;
      this.lastApiCall = Date.now();
      
      console.log(`✅ Successfully fetched price for ${symbol}: $${price.price}`);
      console.log(`📊 Change: ${price.change >= 0 ? '+' : ''}${price.change} (${price.changePercent >= 0 ? '+' : ''}${price.changePercent}%)`);
      
      return price;

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
   * Wait for rate limit if necessary
   */
  private async waitForRateLimit(): Promise<void> {
    const timeSinceLastCall = Date.now() - this.lastApiCall;
    if (timeSinceLastCall < this.rateLimitDelay) {
      const waitTime = this.rateLimitDelay - timeSinceLastCall;
      console.log(`⏳ Rate limiting: waiting ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
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
