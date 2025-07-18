// Exchange Rate Service with Direct API Integration
// Milestone 3: External API Integration & Real-time Data

export interface ExchangeRates {
  [currency: string]: number;
}

export interface ExchangeRateApiResponse {
  base: string;
  rates: ExchangeRates;
  date: string;
}

// Fallback mock rates in case API fails (updated with recent rates)
const FALLBACK_EXCHANGE_RATES: ExchangeRates = {
  'USD': 1.0,        // Base rate
  'TWD': 28.85,      // 1 USD = 28.85 TWD (updated)
  'EUR': 0.849,      // 1 USD = 0.849 EUR (updated)
  'GBP': 0.733,      // 1 USD = 0.733 GBP (updated)
  'JPY': 144.5,      // 1 USD = 144.5 JPY (updated)
  'KRW': 1200.0,     // 1 USD = 1200 KRW
  'SGD': 1.35,       // 1 USD = 1.35 SGD
  'HKD': 7.8,        // 1 USD = 7.8 HKD
  'CAD': 1.25,       // 1 USD = 1.25 CAD
  'AUD': 1.45,       // 1 USD = 1.45 AUD
};

export class ExchangeRateService {
  private static instance: ExchangeRateService;
  private rates: ExchangeRates = FALLBACK_EXCHANGE_RATES;
  private lastUpdated: Date = new Date();
  private isUsingRealRates: boolean = false;
  private apiBaseUrl: string = 'https://api.exchangerate-api.com/v4/latest';
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
      'TWD': { locale: 'en-US', currency: 'TWD' }, // Use en-US for TWD to get NT$ symbol
      'EUR': { locale: 'de-DE', currency: 'EUR' },
      'GBP': { locale: 'en-GB', currency: 'GBP' },
      'JPY': { locale: 'ja-JP', currency: 'JPY' },
      'KRW': { locale: 'ko-KR', currency: 'KRW' },
      'SGD': { locale: 'en-SG', currency: 'SGD' },
      'HKD': { locale: 'en-HK', currency: 'HKD' },
    };

    const config = currencyMap[currency] || { locale: 'en-US', currency: currency };

    try {
      return new Intl.NumberFormat(config.locale, {
        style: 'currency',
        currency: config.currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
    } catch (error) {
      // Fallback for unsupported currencies
      console.warn(`Currency formatting failed for ${currency}, using fallback`);
      return `${this.getCurrencySymbol(currency)}${amount.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    }
  }

  /**
   * Get currency symbol for fallback formatting
   */
  private getCurrencySymbol(currency: string): string {
    const symbols: { [key: string]: string } = {
      'USD': '$',
      'TWD': 'NT$',
      'EUR': '€',
      'GBP': '£',
      'JPY': '¥',
      'KRW': '₩',
      'SGD': 'S$',
      'HKD': 'HK$',
      'CAD': 'C$',
      'AUD': 'A$',
    };
    return symbols[currency] || currency + ' ';
  }

  /**
   * Fetch latest exchange rates from ExchangeRate-API (free tier)
   * Implements caching and error handling
   */
  public async fetchLatestRates(baseCurrency: string = 'USD'): Promise<void> {
    try {
      console.log('Fetching latest exchange rates from ExchangeRate-API...');
      
      const response = await fetch(`${this.apiBaseUrl}/${baseCurrency}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Worthy-Portfolio-App/1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ExchangeRateApiResponse = await response.json();

      if (data.base && data.rates) {
        // Update rates with real API data
        this.rates = {
          [baseCurrency]: 1.0, // Base currency
          ...data.rates
        };
        
        this.lastUpdated = new Date(data.date || new Date());
        this.isUsingRealRates = true;
        
        console.log('✅ Successfully updated exchange rates from ExchangeRate-API');
        console.log(`📊 Loaded ${Object.keys(this.rates).length} currency rates`);
        console.log(`🕒 Last updated: ${this.lastUpdated.toISOString()}`);
        console.log(`📡 Base currency: ${baseCurrency}`);
        console.log(`💱 Sample rates: USD/TWD=${this.rates.TWD}, USD/EUR=${this.rates.EUR}`);
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
  public async forceRefreshRates(baseCurrency: string = 'USD'): Promise<void> {
    await this.fetchLatestRates(baseCurrency);
  }

  /**
   * Get rates with automatic refresh if needed
   */
  public async getRatesWithRefresh(baseCurrency: string = 'USD'): Promise<ExchangeRates> {
    if (this.shouldRefreshRates()) {
      try {
        await this.fetchLatestRates(baseCurrency);
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
