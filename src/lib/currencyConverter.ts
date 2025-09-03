import { convertCurrency } from './priceService';

export interface MultiCurrencyValue {
  SEK: number;
  EUR: number;
  USD: number;
}

export const convertToDisplayCurrency = async (
  amount: number,
  fromCurrency: string,
  toCurrency: string
): Promise<number> => {
  if (fromCurrency === toCurrency) return amount;
  
  try {
    return await convertCurrency(amount, fromCurrency, toCurrency);
  } catch (error) {
    console.error(`Error converting ${fromCurrency} to ${toCurrency}:`, error);
    return amount; // Fallback to original amount
  }
};

export const convertMultipleAmounts = async (
  amounts: Array<{ amount: number; currency: string }>,
  toCurrency: string
): Promise<number> => {
  const conversions = await Promise.all(
    amounts.map(({ amount, currency }) => 
      convertToDisplayCurrency(amount, currency, toCurrency)
    )
  );
  
  return conversions.reduce((total, converted) => total + converted, 0);
};
