import React, { useState, useEffect } from 'react';
import { Edit2, Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import { db, type Asset, type Account } from '../lib/database';
import { formatCurrency, formatPercentage, calculateAssetGainLoss } from '../lib/portfolioUtils';
import { MiniAssetChart } from './MiniAssetChart';
import { TransactionModal } from './TransactionModal';

interface AssetListProps {
  refreshTrigger: number;
}

interface AssetWithAccount extends Asset {
  account: Account;
}

export const AssetList: React.FC<AssetListProps> = ({ refreshTrigger }) => {
  const [assets, setAssets] = useState<AssetWithAccount[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<AssetWithAccount | null>(null);

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
                <div className="flex gap-6">
                  {/* Asset Info - Left Side */}
                  <div className="flex-1">
                    <div className="mb-4">
                      <h4 className="font-semibold text-xl mb-1">{asset.name}</h4>
                      <p className="text-muted text-sm">
                        {asset.account.name} • {asset.type}
                        {asset.symbol && ` • ${asset.symbol}`}
                      </p>
                    </div>
                    
                    <div className="grid grid-3 gap-6 mb-4">
                      <div>
                        <p className="text-muted text-sm">Current Value</p>
                        <p className="font-semibold text-xl">{formatCurrency(asset.currentValue, asset.currency)}</p>
                        <p className="text-muted text-xs">{formatCurrency(asset.currentPrice, asset.currency)} per share</p>
                      </div>
                      <div>
                        <p className="text-muted text-sm">Purchase Value</p>
                        <p className="font-semibold text-xl">{formatCurrency(asset.initialValue, asset.currency)}</p>
                        <p className="text-muted text-xs">{asset.purchaseDate ? asset.purchaseDate.toLocaleDateString() : 'Unknown date'}</p>
                      </div>
                      <div>
                        <p className="text-muted text-sm">Gain/Loss</p>
                        <div className="flex items-center gap-2">
                          {isPositive ? (
                            <TrendingUp className="w-4 h-4 text-success" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-danger" />
                          )}
                          <span className={`font-semibold text-lg ${isPositive ? 'text-success' : 'text-danger'}`}>
                            {formatCurrency(gainLoss, asset.currency)}
                          </span>
                        </div>
                        <p className={`text-xs ${isPositive ? 'text-success' : 'text-danger'}`}>
                          {formatPercentage(gainLossPercentage)}
                        </p>
                      </div>
                    </div>
                    
                    {asset.lastPriceUpdate && (
                      <p className="text-xs text-muted">
                        Last updated: {asset.lastPriceUpdate.toLocaleString()}
                      </p>
                    )}
                  </div>
                  
                  {/* Chart Section - Right Side */}
                  <div className="w-[500px]">
                    {/* Action Buttons - Above Chart */}
                    <div className="flex justify-end gap-2 mb-3">
                      <button
                        onClick={() => setSelectedAsset(asset)}
                        className="btn-icon bg-gray-700 hover:bg-blue-600 transition-colors"
                        title="Buy/Sell shares"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(asset.id!)}
                        className="btn-icon bg-gray-700 hover:bg-red-600 transition-colors"
                        title="Delete asset"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                    
                    {/* Larger Chart */}
                    <MiniAssetChart assetId={asset.id!} height={240} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedAsset && (
        <TransactionModal
          asset={selectedAsset}
          onClose={() => setSelectedAsset(null)}
          onTransactionAdded={() => {
            setSelectedAsset(null);
            loadAssets();
          }}
        />
      )}
    </div>
  );
};
