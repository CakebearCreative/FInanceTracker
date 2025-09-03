import React, { useState, useEffect } from 'react';
import { ArrowLeft, TrendingUp, TrendingDown, DollarSign, BarChart3 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { db, type Account, type Asset, type ValueHistory } from '../lib/database';
import { formatCurrency, formatPercentage } from '../lib/portfolioUtils';
import { convertToDisplayCurrency } from '../lib/currencyConverter';
import { getSettings } from '../lib/settings';

interface AccountViewProps {
  accountId: number;
  onBack: () => void;
}

interface AccountSummary {
  account: Account;
  assets: Asset[];
  totalValue: number;
  totalInitialValue: number;
  totalGainLoss: number;
  totalGainLossPercentage: number;
  displayCurrency: string;
}

interface ChartData {
  date: string;
  value: number;
}

export const AccountView: React.FC<AccountViewProps> = ({ accountId, onBack }) => {
  const [accountSummary, setAccountSummary] = useState<AccountSummary | null>(null);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAccountData();
  }, [accountId]);

  const loadAccountData = async () => {
    try {
      setLoading(true);
      
      // Get account and its assets
      const account = await db.accounts.get(accountId);
      if (!account) return;

      const assets = await db.assets.where('accountId').equals(accountId).toArray();
      const settings = await getSettings();

      // Calculate totals in display currency
      let totalValue = 0;
      let totalInitialValue = 0;

      for (const asset of assets) {
        const convertedCurrentValue = await convertToDisplayCurrency(
          asset.currentValue, 
          asset.currency, 
          settings.displayCurrency
        );
        const convertedInitialValue = await convertToDisplayCurrency(
          asset.initialValue, 
          asset.currency, 
          settings.displayCurrency
        );
        
        totalValue += convertedCurrentValue;
        totalInitialValue += convertedInitialValue;
      }

      const totalGainLoss = totalValue - totalInitialValue;
      const totalGainLossPercentage = totalInitialValue > 0 ? (totalGainLoss / totalInitialValue) * 100 : 0;

      setAccountSummary({
        account,
        assets,
        totalValue,
        totalInitialValue,
        totalGainLoss,
        totalGainLossPercentage,
        displayCurrency: settings.displayCurrency
      });

      // Load chart data
      await loadChartData(assets, settings.displayCurrency);

    } catch (error) {
      console.error('Error loading account data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadChartData = async (assets: Asset[], displayCurrency: string) => {
    try {
      // Get all value history for assets in this account
      const assetIds = assets.map(asset => asset.id!).filter(id => id !== undefined);
      if (assetIds.length === 0) return;

      const allHistory: ValueHistory[] = [];
      for (const assetId of assetIds) {
        const history = await db.valueHistory.where('assetId').equals(assetId).toArray();
        allHistory.push(...history);
      }

      // Group by date and sum values
      const dateGroups: Record<string, { totalValue: number; assets: Array<{ value: number; currency: string }> }> = {};

      for (const record of allHistory) {
        const dateKey = new Date(record.date).toISOString().split('T')[0];
        if (!dateGroups[dateKey]) {
          dateGroups[dateKey] = { totalValue: 0, assets: [] };
        }
        
        const asset = assets.find(a => a.id === record.assetId);
        if (asset) {
          dateGroups[dateKey].assets.push({
            value: record.value,
            currency: asset.currency
          });
        }
      }

      // Convert to display currency and format for chart
      const chartPoints: ChartData[] = [];
      
      for (const [dateKey, group] of Object.entries(dateGroups)) {
        let convertedTotal = 0;
        
        for (const assetValue of group.assets) {
          const converted = await convertToDisplayCurrency(
            assetValue.value,
            assetValue.currency,
            displayCurrency
          );
          convertedTotal += converted;
        }

        chartPoints.push({
          date: dateKey,
          value: convertedTotal
        });
      }

      // Sort by date and set chart data
      chartPoints.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      setChartData(chartPoints);

    } catch (error) {
      console.error('Error loading chart data:', error);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('sv-SE', {
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTooltipValue = (value: number) => {
    return accountSummary ? formatCurrency(value, accountSummary.displayCurrency) : value.toString();
  };

  if (loading || !accountSummary) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <p>Loading account data...</p>
        </div>
      </div>
    );
  }

  const { account, assets, totalValue, totalGainLoss, totalGainLossPercentage, displayCurrency } = accountSummary;
  const isPositive = totalGainLoss >= 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={onBack} className="btn">
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h1 className="text-2xl font-bold">{account.name}</h1>
                <p className="text-muted">{account.bank} • {account.type}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container py-6">
        {/* Account Summary */}
        <div className="grid grid-2 gap-6 mb-6">
          <div className="card">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="w-5 h-5 text-blue-400" />
              <span className="text-lg font-semibold">Total Value</span>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(totalValue, displayCurrency)}</p>
          </div>

          <div className="card">
            <div className="flex items-center gap-3 mb-2">
              {isPositive ? (
                <TrendingUp className="w-5 h-5 text-green-400" />
              ) : (
                <TrendingDown className="w-5 h-5 text-red-400" />
              )}
              <span className="text-lg font-semibold">Total Gain/Loss</span>
            </div>
            <p className={`text-2xl font-bold ${isPositive ? 'text-success' : 'text-danger'}`}>
              {formatCurrency(totalGainLoss, displayCurrency)}
            </p>
            <p className={`text-sm ${isPositive ? 'text-success' : 'text-danger'}`}>
              {formatPercentage(totalGainLossPercentage)}
            </p>
          </div>
        </div>

        {/* Account Performance Chart */}
        {chartData.length > 0 && (
          <div className="card mb-6">
            <div className="flex items-center gap-3 mb-4">
              <BarChart3 className="w-5 h-5 text-blue-400" />
              <h3 className="text-lg font-semibold">Account Performance</h3>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={formatDate}
                    stroke="#9CA3AF"
                  />
                  <YAxis 
                    tickFormatter={(value) => `${Math.round(value / 1000)}k`}
                    stroke="#9CA3AF"
                  />
                  <Tooltip 
                    formatter={(value: number) => [formatTooltipValue(value), 'Value']}
                    labelFormatter={(label) => formatDate(label)}
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: '1px solid #374151',
                      borderRadius: '8px'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#3B82F6" 
                    strokeWidth={2}
                    dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: '#3B82F6', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Assets in Account */}
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="w-5 h-5 text-blue-400" />
            <h3 className="text-lg font-semibold">Assets ({assets.length})</h3>
          </div>
          
          {assets.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted">No assets in this account yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {assets.map((asset) => {
                const gainLoss = asset.currentValue - asset.initialValue;
                const gainLossPercentage = asset.initialValue > 0 ? (gainLoss / asset.initialValue) * 100 : 0;
                const isAssetPositive = gainLoss >= 0;

                return (
                  <div key={asset.id} className="border border-border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-semibold">{asset.name}</h4>
                        <p className="text-sm text-muted">
                          {asset.type} • {asset.symbol && `${asset.symbol} • `}{asset.currency}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">
                          {formatCurrency(asset.currentValue, asset.currency)}
                        </p>
                        <p className={`text-sm ${isAssetPositive ? 'text-success' : 'text-danger'}`}>
                          {formatCurrency(gainLoss, asset.currency)} ({formatPercentage(gainLossPercentage)})
                        </p>
                      </div>
                    </div>
                    
                    <div className="grid grid-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted">Current Price</p>
                        <p>{formatCurrency(asset.currentPrice, asset.currency)}</p>
                      </div>
                      <div>
                        <p className="text-muted">Initial Price</p>
                        <p>{formatCurrency(asset.initialPrice, asset.currency)}</p>
                      </div>
                      <div>
                        <p className="text-muted">Quantity</p>
                        <p>{asset.quantity}</p>
                      </div>
                    </div>

                    {asset.lastPriceUpdate && (
                      <p className="text-xs text-muted mt-2">
                        Last updated: {new Date(asset.lastPriceUpdate).toLocaleString('sv-SE')}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
