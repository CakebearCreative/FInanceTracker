import { db } from './database';
import { fetchMultipleStockPrices } from './priceService';
import { getSettings } from './settings';
import { updateSavingsAccountValues } from './interestCalculator';

export const updateAllAssetPrices = async (): Promise<void> => {
  try {
    // Get all assets that have auto-update enabled and have symbols
    const assetsToUpdate = await db.assets
      .where('autoUpdate')
      .equals(1)
      .and(asset => !!asset.symbol)
      .toArray();

    if (assetsToUpdate.length === 0) {
      console.log('No assets to update');
      return;
    }

    console.log(`Updating prices for ${assetsToUpdate.length} assets...`);

    // Prepare symbols for batch fetch
    const symbolData = assetsToUpdate.map(asset => ({
      symbol: asset.symbol!,
      exchange: asset.exchange
    }));

    // Fetch all prices in batch
    const priceData = await fetchMultipleStockPrices(symbolData);

    // Update each asset
    const updatePromises = assetsToUpdate.map(async (asset) => {
      const priceInfo = priceData.find(p => 
        p.symbol.includes(asset.symbol!) || asset.symbol!.includes(p.symbol.replace('.ST', ''))
      );

      if (priceInfo && priceInfo.price > 0) {
        const newCurrentValue = priceInfo.price * asset.quantity;
        
        // Update asset in database
        await db.assets.update(asset.id!, {
          currentPrice: priceInfo.price,
          currentValue: newCurrentValue,
          lastPriceUpdate: new Date(),
          updatedAt: new Date()
        });

        // Add to value history
        await db.valueHistory.add({
          assetId: asset.id!,
          value: newCurrentValue,
          price: priceInfo.price,
          date: new Date()
        });

        // Also store in price history for chart generation
        await db.priceHistory.add({
          symbol: asset.symbol!,
          exchange: asset.exchange || '',
          price: priceInfo.price,
          currency: asset.currency,
          date: new Date()
        });

        console.log(`Updated ${asset.name}: ${priceInfo.price} ${asset.currency}`);
      } else {
        console.warn(`No price data found for ${asset.symbol}`);
      }
    });

    await Promise.allSettled(updatePromises);
    console.log('Price update completed');

    // Also update savings account interest
    await updateSavingsAccountValues();

  } catch (error) {
    console.error('Error updating asset prices:', error);
  }
};

// Set up periodic price updates (every 15 minutes during market hours)
let priceUpdateInterval: number | null = null;

export const startPriceUpdates = async (): Promise<void> => {
  if (priceUpdateInterval) {
    clearInterval(priceUpdateInterval);
  }

  // Get settings for update interval
  const settings = await getSettings();
  const intervalMinutes = settings.autoUpdateInterval || 15;

  // Update immediately
  updateAllAssetPrices();

  // Then update based on settings
  priceUpdateInterval = setInterval(() => {
    updateAllAssetPrices();
  }, intervalMinutes * 60 * 1000);

  console.log(`Started automatic price updates (every ${intervalMinutes} minutes)`);
};

export const stopPriceUpdates = (): void => {
  if (priceUpdateInterval) {
    clearInterval(priceUpdateInterval);
    priceUpdateInterval = null;
    console.log('Stopped automatic price updates');
  }
};

// Manual price update for a single asset
export const updateSingleAssetPrice = async (assetId: number): Promise<boolean> => {
  try {
    const asset = await db.assets.get(assetId);
    if (!asset || !asset.symbol || !asset.autoUpdate) {
      return false;
    }

    const symbolData = [{
      symbol: asset.symbol,
      exchange: asset.exchange
    }];

    const priceData = await fetchMultipleStockPrices(symbolData);
    const priceInfo = priceData[0];

    if (priceInfo && priceInfo.price > 0) {
      const newCurrentValue = priceInfo.price * asset.quantity;
      
      await db.assets.update(assetId, {
        currentPrice: priceInfo.price,
        currentValue: newCurrentValue,
        lastPriceUpdate: new Date(),
        updatedAt: new Date()
      });

      await db.valueHistory.add({
        assetId: assetId,
        value: newCurrentValue,
        price: priceInfo.price,
        date: new Date()
      });

      return true;
    }

    return false;
  } catch (error) {
    console.error('Error updating single asset price:', error);
    return false;
  }
};
