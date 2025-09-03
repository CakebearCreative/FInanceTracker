import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';
import { TimeRangeSelector, type TimeRange } from './TimeRangeSelector';
import { getAssetChartData, type ChartDataPoint, type AssetChartData } from '../lib/chartDataService';
import { formatCurrency, formatPercentage } from '../lib/portfolioUtils';
import { getSettings } from '../lib/settings';
import { db, type Asset } from '../lib/database';

interface AssetChartProps {
  assetId: number;
  refreshTrigger?: number;
}

export const AssetChart: React.FC<AssetChartProps> = ({ assetId, refreshTrigger }) => {
  const [chartData, setChartData] = useState<AssetChartData>({ investmentValue: [], stockPrice: [] });
  const [selectedRange, setSelectedRange] = useState<TimeRange>('1M');
  const [viewMode, setViewMode] = useState<'investment' | 'stock'>('investment');
  const [loading, setLoading] = useState(true);
  const [asset, setAsset] = useState<Asset | null>(null);
  const [displayCurrency, setDisplayCurrency] = useState('SEK');

  useEffect(() => {
    loadAssetData();
  }, [assetId, selectedRange, refreshTrigger]);

  const loadAssetData = async () => {
    setLoading(true);
    try {
      const assetData = await db.assets.get(assetId);
      setAsset(assetData || null);
      
      const settings = await getSettings();
      setDisplayCurrency(settings.displayCurrency);
      
      const data = await getAssetChartData(assetId, selectedRange);
      setChartData(data);
    } catch (error) {
      console.error('Error loading asset chart data:', error);
    } finally {
      setLoading(false);
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as ChartDataPoint;
      return (
        <div className="tooltip-card">
          <p className="font-semibold text-sm mb-2">{new Date(label).toLocaleDateString()}</p>
          <div className="space-y-1">
            <p className="text-lg font-bold">
              {formatCurrency(data.value, displayCurrency)}
            </p>
            <div className="flex items-center gap-2">
              {data.gainLoss >= 0 ? (
                <TrendingUp className="w-4 h-4 text-success" />
              ) : (
                <TrendingDown className="w-4 h-4 text-danger" />
              )}
              <span className={`text-sm font-medium ${data.gainLoss >= 0 ? 'text-success' : 'text-danger'}`}>
                {data.gainLoss >= 0 ? '+' : ''}{formatCurrency(data.gainLoss, displayCurrency)}
              </span>
              <span className={`text-sm ${data.gainLoss >= 0 ? 'text-success' : 'text-danger'}`}>
                ({formatPercentage(data.gainLossPercentage)})
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const formatYAxisTick = (value: number): string => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}k`;
    }
    return value.toString();
  };

  const formatXAxisTick = (value: string): string => {
    const date = new Date(value);
    if (selectedRange === '1D') {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (selectedRange === '5D' || selectedRange === '1M') {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } else {
      return date.toLocaleDateString([], { month: 'short', year: '2-digit' });
    }
  };

  const currentData = viewMode === 'investment' ? chartData.investmentValue : chartData.stockPrice;
  const currentPoint = currentData[currentData.length - 1];
  const firstPoint = currentData[0];
  const periodGainLoss = currentPoint && firstPoint ? currentPoint.value - firstPoint.value : 0;
  const periodGainLossPercentage = currentPoint && firstPoint && firstPoint.value > 0 
    ? ((currentPoint.value - firstPoint.value) / firstPoint.value) * 100 
    : 0;

  if (loading) {
    return (
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">{asset?.name || 'Asset'} Performance</h3>
          <TimeRangeSelector
            selectedRange={selectedRange}
            onRangeChange={setSelectedRange}
          />
        </div>
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-muted">Loading asset data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!asset || currentData.length === 0) {
    return (
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">{asset?.name || 'Asset'} Performance</h3>
          <TimeRangeSelector
            selectedRange={selectedRange}
            onRangeChange={setSelectedRange}
          />
        </div>
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <BarChart3 className="w-8 h-8 text-gray-400" />
          </div>
          <h4 className="font-semibold mb-2">No Performance Data</h4>
          <p className="text-muted text-sm max-w-sm mx-auto">
            Historical price data will be generated as the asset gets price updates over time.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-xl font-bold">{asset.name} Performance</h3>
          <p className="text-sm text-muted">{asset.symbol} • {asset.type}</p>
          {currentPoint && (
            <div className="flex items-center gap-3 mt-2">
              <span className="text-2xl font-bold">
                {formatCurrency(currentPoint.value, displayCurrency)}
              </span>
              <div className="flex items-center gap-1">
                {periodGainLoss >= 0 ? (
                  <TrendingUp className="w-5 h-5 text-success" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-danger" />
                )}
                <span className={`font-semibold ${periodGainLoss >= 0 ? 'text-success' : 'text-danger'}`}>
                  {periodGainLoss >= 0 ? '+' : ''}{formatCurrency(periodGainLoss, displayCurrency)}
                </span>
                <span className={`text-sm ${periodGainLoss >= 0 ? 'text-success' : 'text-danger'}`}>
                  ({formatPercentage(periodGainLossPercentage)})
                </span>
              </div>
            </div>
          )}
        </div>
        <TimeRangeSelector
          selectedRange={selectedRange}
          onRangeChange={setSelectedRange}
        />
      </div>

      {/* View Mode Toggle */}
      <div className="flex gap-1 mb-4">
        <button
          onClick={() => setViewMode('investment')}
          className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
            viewMode === 'investment'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
          }`}
        >
          My Investment Value
        </button>
        <button
          onClick={() => setViewMode('stock')}
          className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
            viewMode === 'stock'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
          }`}
        >
          Stock Price
        </button>
      </div>
      
      <div style={{ width: '100%', height: 400 }}>
        <ResponsiveContainer>
          <LineChart data={currentData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
            <XAxis 
              dataKey="date" 
              stroke="#64748b"
              tickFormatter={formatXAxisTick}
              fontSize={12}
              axisLine={false}
              tickLine={false}
            />
            <YAxis 
              stroke="#64748b"
              tickFormatter={formatYAxisTick}
              fontSize={12}
              axisLine={false}
              tickLine={false}
              domain={['dataMin - dataMin * 0.01', 'dataMax + dataMax * 0.01']}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke={viewMode === 'investment' ? '#10b981' : '#3b82f6'}
              strokeWidth={2.5}
              dot={false}
              activeDot={{ 
                r: 6, 
                stroke: viewMode === 'investment' ? '#10b981' : '#3b82f6', 
                strokeWidth: 2,
                fill: viewMode === 'investment' ? '#065f46' : '#1e40af'
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 p-3 bg-gray-800 rounded-lg">
        <div className="grid grid-2 gap-4 text-sm">
          <div>
            <p className="text-muted">Purchase Date</p>
            <p className="font-semibold">{asset.purchaseDate ? asset.purchaseDate.toLocaleDateString() : asset.createdAt.toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-muted">Quantity Owned</p>
            <p className="font-semibold">{asset.quantity}</p>
          </div>
          <div>
            <p className="text-muted">Purchase Price</p>
            <p className="font-semibold">{formatCurrency(asset.initialPrice, asset.currency)}</p>
          </div>
          <div>
            <p className="text-muted">Current Price</p>
            <p className="font-semibold">{formatCurrency(asset.currentPrice, asset.currency)}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
