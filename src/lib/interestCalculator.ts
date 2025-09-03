import { db } from './database';

export const calculateCompoundInterest = (
  principal: number,
  annualRate: number,
  years: number,
  compoundFrequency: number = 1 // 1 = annually, 12 = monthly, 365 = daily
): number => {
  return principal * Math.pow(1 + annualRate / 100 / compoundFrequency, compoundFrequency * years);
};

export const updateSavingsAccountValues = async (): Promise<void> => {
  try {
    const savingsAssets = await db.assets
      .where('type')
      .equals('savings')
      .and(asset => !!asset.interestRate && asset.interestRate > 0)
      .toArray();

    if (savingsAssets.length === 0) {
      console.log('No savings accounts with interest rates found');
      return;
    }

    const now = new Date();
    
    for (const asset of savingsAssets) {
      if (!asset.interestRate) continue;

      // Calculate time since creation in years
      const createdDate = new Date(asset.createdAt);
      const yearsSinceCreation = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24 * 365);

      if (yearsSinceCreation > 0) {
        // Calculate new value with compound interest (monthly compounding)
        const newValue = calculateCompoundInterest(
          asset.initialValue,
          asset.interestRate,
          yearsSinceCreation,
          12 // Monthly compounding
        );

        // Update the asset
        await db.assets.update(asset.id!, {
          currentValue: newValue,
          currentPrice: newValue / asset.quantity, // Adjust price per unit
          updatedAt: now
        });

        // Add to value history
        await db.valueHistory.add({
          assetId: asset.id!,
          value: newValue,
          date: now
        });

        console.log(`Updated savings account ${asset.name}: ${asset.initialValue} → ${newValue.toFixed(2)} ${asset.currency}`);
      }
    }

    console.log('Savings account interest calculation completed');
  } catch (error) {
    console.error('Error updating savings account values:', error);
  }
};

// Calculate projected interest for a savings account
export const projectSavingsGrowth = (
  initialValue: number,
  annualRate: number,
  years: number
): Array<{ year: number; value: number }> => {
  const projections = [];
  
  for (let year = 0; year <= years; year++) {
    const value = calculateCompoundInterest(initialValue, annualRate, year, 12);
    projections.push({ year, value });
  }
  
  return projections;
};
