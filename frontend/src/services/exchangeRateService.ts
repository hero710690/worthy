// Exchange Rate Service with Real API Integration
// Milestone 3: External API Integration & Real-time Data

export interface ExchangeRates {
  [currency: string]: number;
}

export interface ExchangeRateResponse {
  result: string;
  documentation: string;
  terms_of_use: string;
  time_last_update_unix: number;
  time_last_update_utc: string;
  time_next_update_unix: number;
  time_next_update_utc: string;
  base_code: string;
  conversion_rates: ExchangeRates;
}

// Fallback mock rates in case API fails
const FALLBACK_EXCHANGE_RATES: ExchangeRates = {
  'USD': 1.0,        // Base rate
  'TWD': 31.5,       // 1 USD = 31.5 TWD
  'EUR': 0.85,       // 1 USD = 0.85 EUR
  'GBP': 0.73,       // 1 USD = 0.73 GBP
  'JPY': 110.0,      // 1 USD = 110 JPY
  'KRW': 1200.0,     // 1 USD = 1200 KRW
  'SGD': 1.35,       // 1 USD = 1.35 SGD
  'HKD': 7.8,        // 1 USD = 7.8 HKD
};

export class ExchangeRateService {
  private static instance: ExchangeRateService;
  private rates: ExchangeRates = FALLBACK_EXCHANGE_RATES;
  private lastUpdated: Date = new Date();
  private isUsingRealRates: boolean = false;
  private apiKey: string = ''; // Free tier doesn't require API key for ExchangeRate-API
  private baseUrl: string = 'https://api.exchangerate-api.com/v4/latest';
  private cacheDuration: number = 60 * 60 * 1000; // 1 hour cache

  private constructor() {
    // Try to fetch real rates on initialization
    this.fetchLatestRates().catch(error => {
      console.warn('Failed to fetch initial exchange rates, using fallback rates:', error);
    });
  }

  public static getInstance(): ExchangeRateService {
    if (!ExchangeRateService.instance) {
      ExchangeRateService.instance = new ExchangeRateService();
    }
    return ExchangeRateService.instance;
  }

  /**
   * Convert amount from one currency to another
   * @param amount - Amount to convert
   * @param fromCurrency - Source currency code
   * @param toCurrency - Target currency code
   * @returns Converted amount
   */
  public convertCurrency(amount: number, fromCurrency: string, toCurrency: string): number {
    if (fromCurrency === toCurrency) {
      return amount;
    }

    if (!this.isCurrencySupported(fromCurrency) || !this.isCurrencySupported(toCurrency)) {
      console.warn(`Unsupported currency conversion: ${fromCurrency} to ${toCurrency}`);
      return amount; // Return original amount if conversion not supported
    }

    // Convert to USD first, then to target currency
    const usdAmount = amount / this.rates[fromCurrency];
    const convertedAmount = usdAmount * this.rates[toCurrency];

    return convertedAmount;
  }

  /**
   * Get exchange rate between two currencies
   * @param fromCurrency - Source currency
   * @param toCurrency - Target currency
   * @returns Exchange rate
   */
  public getExchangeRate(fromCurrency: string, toCurrency: string): number {
    if (fromCurrency === toCurrency) {
      return 1.0;
    }

    if (!this.isCurrencySupported(fromCurrency) || !this.isCurrencySupported(toCurrency)) {
      return 1.0; // Return 1:1 if currencies not supported
    }

    return this.rates[toCurrency] / this.rates[fromCurrency];
  }

  /**
   * Check if currency is supported
   * @param currency - Currency code to check
   * @returns True if supported
   */
  public isCurrencySupported(currency: string): boolean {
    return currency in this.rates;
  }

  /**
   * Get all supported currencies
   * @returns Array of supported currency codes
   */
  public getSupportedCurrencies(): string[] {
    return Object.keys(this.rates);
  }

  /**
   * Get last updated timestamp
   * @returns Date when rates were last updated
   */
  public getLastUpdated(): Date {
    return this.lastUpdated;
  }

  /**
   * Check if using real API rates or fallback rates
   * @returns True if using real rates from API
   */
  public isUsingRealApiRates(): boolean {
    return this.isUsingRealRates;
  }

  /**
   * Check if rates need refresh based on cache duration
   * @returns True if rates should be refreshed
   */
  public shouldRefreshRates(): boolean {
    const now = new Date();
    const timeSinceUpdate = now.getTime() - this.lastUpdated.getTime();
    return timeSinceUpdate > this.cacheDuration;
  }

  /**
   * Format currency with proper symbol and locale
   * @param amount - Amount to format
   * @param currency - Currency code
   * @returns Formatted currency string
   */
  public formatCurrency(amount: number, currency: string): string {
    const currencyMap: { [key: string]: { locale: string; currency: string } } = {
      'USD': { locale: 'en-US', currency: 'USD' },
      'TWD': { locale: 'zh-TW', currency: 'TWD' },
      'EUR': { locale: 'de-DE', currency: 'EUR' },
      'GBP': { locale: 'en-GB', currency: 'GBP' },
      'JPY': { locale: 'ja-JP', currency: 'JPY' },
      'KRW': { locale: 'ko-KR', currency: 'KRW' },
      'SGD': { locale: 'en-SG', currency: 'SGD' },
      'HKD': { locale: 'en-HK', currency: 'HKD' },
    };

    const config = currencyMap[currency] || { locale: 'en-US', currency: currency };

    return new Intl.NumberFormat(config.locale, {
      style: 'currency',
      currency: config.currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  /**
   * Fetch latest exchange rates from external API
   * Implements caching and error handling
   */
  public async fetchLatestRates(): Promise<void> {
    try {
      console.log('Fetching latest exchange rates from API...');
      
      // Use USD as base currency for the API call
      const response = await fetch(`${this.baseUrl}/USD`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Worthy-Portfolio-App/1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ExchangeRateResponse = await response.json();

      if (data.result === 'success' && data.conversion_rates) {
        // Update rates with real API data
        this.rates = {
          'USD': 1.0, // Base currency
          ...data.conversion_rates
        };
        
        this.lastUpdated = new Date();
        this.isUsingRealRates = true;
        
        console.log('✅ Successfully updated exchange rates from API');
        console.log(`📊 Loaded ${Object.keys(this.rates).length} currency rates`);
        console.log(`🕒 Last updated: ${this.lastUpdated.toISOString()}`);
      } else {
        throw new Error('Invalid API response format');
      }

    } catch (error) {
      console.error('❌ Failed to fetch exchange rates from API:', error);
      
      // Fall back to mock rates if API fails
      if (Object.keys(this.rates).length === 0) {
        this.rates = FALLBACK_EXCHANGE_RATES;
        this.isUsingRealRates = false;
        console.log('🔄 Using fallback exchange rates');
      }
      
      throw error; // Re-throw for caller to handle
    }
  }

  /**
   * Force refresh rates (bypass cache)
   */
  public async forceRefreshRates(): Promise<void> {
    await this.fetchLatestRates();
  }

  /**
   * Get rates with automatic refresh if needed
   */
  public async getRatesWithRefresh(): Promise<ExchangeRates> {
    if (this.shouldRefreshRates()) {
      try {
        await this.fetchLatestRates();
      } catch (error) {
        console.warn('Failed to refresh rates, using cached rates:', error);
      }
    }
    return this.rates;
  }

  /**
   * Get API status information
   */
  public getApiStatus(): {
    isUsingRealRates: boolean;
    lastUpdated: Date;
    supportedCurrencies: number;
    shouldRefresh: boolean;
  } {
    return {
      isUsingRealRates: this.isUsingRealRates,
      lastUpdated: this.lastUpdated,
      supportedCurrencies: Object.keys(this.rates).length,
      shouldRefresh: this.shouldRefreshRates()
    };
  }
}

// Export singleton instance
export const exchangeRateService = ExchangeRateService.getInstance();
