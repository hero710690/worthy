// Mock Exchange Rate Service
// This will be replaced with real API integration in Milestone 3

export interface ExchangeRates {
  [currency: string]: number;
}

// Mock exchange rates (relative to USD as base)
// In real implementation, this will come from external API
const MOCK_EXCHANGE_RATES: ExchangeRates = {
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
  private rates: ExchangeRates = MOCK_EXCHANGE_RATES;
  private lastUpdated: Date = new Date();

  private constructor() {}

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

  // TODO: Replace with real API integration in Milestone 3
  /**
   * Fetch latest exchange rates from external API
   * This is a placeholder for future implementation
   */
  public async fetchLatestRates(): Promise<void> {
    // TODO: Implement real API call
    // const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
    // const data = await response.json();
    // this.rates = data.rates;
    // this.lastUpdated = new Date();
    
    console.log('Mock exchange rates in use. Real API integration coming in Milestone 3.');
  }
}

// Export singleton instance
export const exchangeRateService = ExchangeRateService.getInstance();
