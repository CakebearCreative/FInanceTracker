// Price service using Finnhub API (free tier: 60 API calls/minute)
// For production, you'd want to add your own API key

const FINNHUB_API_KEY = 'demo'; // Demo key for testing - replace with real key
const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';

export interface PriceData {
  symbol: string;
  price: number;
  currency: string;
  timestamp: Date;
}

export interface ExchangeRate {
  from: string;
  to: string;
  rate: number;
}

// Common Swedish stock symbols with their correct Finnhub format
const SWEDISH_SYMBOL_MAP: Record<string, string> = {
  'VOLV-B': 'VOLV-B.ST',  // Volvo B
  'ASSA-B': 'ASSA-B.ST',  // ASSA ABLOY B
  'SEB-A': 'SEB-A.ST',    // SEB A
  'SWED-A': 'SWED-A.ST',  // Swedbank A
  'TEL2-B': 'TEL2-B.ST',  // Tele2 B
  'ERIC-B': 'ERIC-B.ST',  // Ericsson B
};

export const formatSymbolForFinnhub = (symbol: string, exchange?: string): string => {
  if (!symbol) return '';
  
  // Handle Swedish stocks
  if (exchange === 'STO' || exchange === 'Stockholm') {
    return SWEDISH_SYMBOL_MAP[symbol] || `${symbol}.ST`;
  }
  
  // Handle US stocks (default)
  return symbol;
};

export const fetchStockPrice = async (symbol: string, exchange?: string): Promise<PriceData | null> => {
  try {
    const finnhubSymbol = formatSymbolForFinnhub(symbol, exchange);
    const response = await fetch(
      `${FINNHUB_BASE_URL}/quote?symbol=${finnhubSymbol}&token=${FINNHUB_API_KEY}`
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.c && data.c > 0) { // 'c' is current price
      return {
        symbol: finnhubSymbol,
        price: data.c,
        currency: getCurrencyForExchange(exchange),
        timestamp: new Date()
      };
    }
    
    return null;
  } catch (error) {
    console.error(`Error fetching price for ${symbol}:`, error);
    return null;
  }
};

export const fetchMultipleStockPrices = async (
  symbols: Array<{ symbol: string; exchange?: string }>
): Promise<PriceData[]> => {
  const promises = symbols.map(({ symbol, exchange }) => 
    fetchStockPrice(symbol, exchange)
  );
  
  const results = await Promise.allSettled(promises);
  return results
    .filter((result): result is PromiseFulfilledResult<PriceData> => 
      result.status === 'fulfilled' && result.value !== null
    )
    .map(result => result.value);
};

// Simple currency detection based on exchange
const getCurrencyForExchange = (exchange?: string): string => {
  switch (exchange) {
    case 'STO':
    case 'Stockholm':
      return 'SEK';
    case 'NYSE':
    case 'NASDAQ':
    case 'AMEX':
      return 'USD';
    case 'LSE':
      return 'GBP';
    case 'FRA':
    case 'PAR':
    case 'AMS':
      return 'EUR';
    default:
      return 'USD';
  }
};

// Exchange rate service (using a free API like exchangerate-api.com)
export const fetchExchangeRate = async (from: string, to: string): Promise<number> => {
  if (from === to) return 1;
  
  try {
    // Using a free exchange rate API
    const response = await fetch(
      `https://api.exchangerate-api.com/v4/latest/${from}`
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data.rates[to] || 1;
  } catch (error) {
    console.error(`Error fetching exchange rate ${from} to ${to}:`, error);
    return 1; // Fallback to 1:1 rate
  }
};

// Convert amount from one currency to another
export const convertCurrency = async (
  amount: number,
  from: string,
  to: string
): Promise<number> => {
  if (from === to) return amount;
  
  const rate = await fetchExchangeRate(from, to);
  return amount * rate;
};
