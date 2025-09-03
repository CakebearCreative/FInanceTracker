import type { Asset, ValueHistory } from './database';
import { convertMultipleAmounts } from './currencyConverter';

export interface PortfolioSummary {
  totalValue: number;
  totalCurrentValue: number; // Alias for totalValue for backwards compatibility
  totalInitialValue: number;
  totalGainLoss: number;
  totalGainLossPercentage: number;
  assetCount: number;
  accountCount: number;
  totalAssets: number; // Alias for assetCount
  totalAccounts: number; // Alias for accountCount
  displayCurrency: string;
}

export interface AssetWithHistory extends Asset {
  history: ValueHistory[];
  gainLoss: number;
  gainLossPercentage: number;
}

export const calculatePortfolioSummary = async (
  assets: Asset[], 
  displayCurrency: string = 'SEK',
  performanceMode: 'absolute' | 'relative' = 'absolute'
): Promise<PortfolioSummary> => {
  // Convert all asset values to display currency
  const currentValues = assets.map(asset => ({
    amount: asset.currentValue,
    currency: asset.currency
  }));
  
  const initialValues = assets.map(asset => ({
    amount: asset.initialValue,
    currency: asset.currency
  }));
  
  const totalValue = await convertMultipleAmounts(currentValues, displayCurrency);
  const totalInitialValue = await convertMultipleAmounts(initialValues, displayCurrency);
  
  let totalGainLoss: number;
  let totalGainLossPercentage: number;
  
  if (performanceMode === 'absolute') {
    // Absolute mode: Total current value - Total initial value
    totalGainLoss = totalValue - totalInitialValue;
    totalGainLossPercentage = totalInitialValue > 0 ? (totalGainLoss / totalInitialValue) * 100 : 0;
  } else {
    // Relative mode: Calculate performance based on price changes only
    // For each asset, calculate: (current_price - initial_price) * initial_quantity
    let relativeGainLoss = 0;
    
    for (const asset of assets) {
      // Calculate the gain/loss based on price change of the original investment
      const priceChange = asset.currentPrice - asset.initialPrice;
      const originalQuantity = asset.initialValue / asset.initialPrice; // Back-calculate original quantity
      const assetRelativeGainLoss = priceChange * originalQuantity;
      
      // Convert to display currency
      const convertedGainLoss = await convertMultipleAmounts([{
        amount: assetRelativeGainLoss,
        currency: asset.currency
      }], displayCurrency);
      
      relativeGainLoss += convertedGainLoss;
    }
    
    totalGainLoss = relativeGainLoss;
    totalGainLossPercentage = totalInitialValue > 0 ? (totalGainLoss / totalInitialValue) * 100 : 0;
  }
  
  return {
    totalValue,
    totalCurrentValue: totalValue, // Alias
    totalInitialValue,
    totalGainLoss,
    totalGainLossPercentage,
    assetCount: assets.length,
    accountCount: new Set(assets.map(a => a.accountId)).size,
    totalAssets: assets.length, // Alias
    totalAccounts: new Set(assets.map(a => a.accountId)).size, // Alias
    displayCurrency
  };
};

export const calculateAssetGainLoss = (asset: Asset) => {
  const gainLoss = asset.currentValue - asset.initialValue;
  const gainLossPercentage = asset.initialValue > 0 ? (gainLoss / asset.initialValue) * 100 : 0;
  return { gainLoss, gainLossPercentage };
};

export const formatCurrency = (amount: number, currency: string = 'SEK'): string => {
  const locale = currency === 'SEK' ? 'sv-SE' : currency === 'EUR' ? 'de-DE' : 'en-US';
  
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

export const formatPercentage = (percentage: number): string => {
  return `${percentage >= 0 ? '+' : ''}${percentage.toFixed(2)}%`;
};
