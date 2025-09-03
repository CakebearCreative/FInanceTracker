import React, { useState, useEffect } from 'react';
import { Edit2, Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import { db, type Asset, type Account } from '../lib/database';
import { formatCurrency, formatPercentage, calculateAssetGainLoss } from '../lib/portfolioUtils';

interface AssetListProps {
  refreshTrigger: number;
}

interface AssetWithAccount extends Asset {
  account: Account;
}

export const AssetList: React.FC<AssetListProps> = ({ refreshTrigger }) => {
  const [assets, setAssets] = useState<AssetWithAccount[]>([]);

  useEffect(() => {
    loadAssets();
  }, [refreshTrigger]);

  const loadAssets = async () => {
    const assetList = await db.assets.toArray();
    const accounts = await db.accounts.toArray();
    
    const assetsWithAccounts = assetList.map(asset => ({
      ...asset,
      account: accounts.find(acc => acc.id === asset.accountId)!
    }));
    
    setAssets(assetsWithAccounts);
  };

  const handleDelete = async (assetId: number) => {
    if (confirm('Are you sure you want to delete this asset?')) {
      await db.assets.delete(assetId);
      await db.valueHistory.where('assetId').equals(assetId).delete();
      loadAssets();
    }
  };

  const updateAssetValue = async (assetId: number, newValue: number) => {
    await db.assets.update(assetId, {
      currentValue: newValue,
      updatedAt: new Date()
    });
    
    // Add to history
    await db.valueHistory.add({
      assetId,
      value: newValue,
      date: new Date()
    });
    
    loadAssets();
  };

  return (
    <div className="card">
      <h3 className="text-xl font-bold mb-4">Assets</h3>
      
      {assets.length === 0 ? (
        <p className="text-muted text-center py-8">
          No assets added yet. Click "Add Asset" to get started.
        </p>
      ) : (
        <div className="space-y-3">
          {assets.map(asset => {
            const { gainLoss, gainLossPercentage } = calculateAssetGainLoss(asset);
            const isPositive = gainLoss >= 0;
            
            return (
              <div key={asset.id} className="card">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-semibold text-lg">{asset.name}</h4>
                    <p className="text-muted text-sm">
                      {asset.account.name} • {asset.type}
                      {asset.symbol && ` • ${asset.symbol}`}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const newValue = prompt('Enter new value:', asset.currentValue.toString());
                        if (newValue && !isNaN(parseFloat(newValue))) {
                          updateAssetValue(asset.id!, parseFloat(newValue));
                        }
                      }}
                      className="btn"
                      title="Update value"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(asset.id!)}
                      className="btn text-danger"
                      title="Delete asset"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-3 mb-3">
                  <div>
                    <p className="text-muted text-sm">Current Value</p>
                    <p className="font-semibold">{formatCurrency(asset.currentValue, asset.currency)}</p>
                    <p className="text-muted text-xs">{formatCurrency(asset.currentPrice, asset.currency)} × {asset.quantity}</p>
                  </div>
                  <div>
                    <p className="text-muted text-sm">Initial Value</p>
                    <p className="font-semibold">{formatCurrency(asset.initialValue, asset.currency)}</p>
                    <p className="text-muted text-xs">{formatCurrency(asset.initialPrice, asset.currency)} × {asset.quantity}</p>
                  </div>
                  <div>
                    <p className="text-muted text-sm">Quantity</p>
                    <p className="font-semibold">{asset.quantity}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {isPositive ? (
                    <TrendingUp className="w-4 h-4 text-success" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-danger" />
                  )}
                  <span className={`font-semibold ${isPositive ? 'text-success' : 'text-danger'}`}>
                    {formatCurrency(gainLoss, asset.currency)} ({formatPercentage(gainLossPercentage)})
                  </span>
                  {asset.lastPriceUpdate && (
                    <span className="text-xs text-muted ml-2">
                      Updated: {asset.lastPriceUpdate.toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
