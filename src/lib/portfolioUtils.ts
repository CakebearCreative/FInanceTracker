import type { Asset, ValueHistory } from './database';
import { convertMultipleAmounts } from './currencyConverter';

export interface PortfolioSummary {
  totalValue: number;
  totalInitialValue: number;
  totalGainLoss: number;
  totalGainLossPercentage: number;
  assetCount: number;
  accountCount: number;
  displayCurrency: string;
}

export interface AssetWithHistory extends Asset {
  history: ValueHistory[];
  gainLoss: number;
  gainLossPercentage: number;
}

export const calculatePortfolioSummary = async (
  assets: Asset[], 
  displayCurrency: string = 'SEK'
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
  const totalGainLoss = totalValue - totalInitialValue;
  const totalGainLossPercentage = totalInitialValue > 0 ? (totalGainLoss / totalInitialValue) * 100 : 0;
  
  return {
    totalValue,
    totalInitialValue,
    totalGainLoss,
    totalGainLossPercentage,
    assetCount: assets.length,
    accountCount: new Set(assets.map(a => a.accountId)).size,
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
