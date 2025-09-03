import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { TrendingUp, DollarSign } from 'lucide-react';
import { getAssetChartData } from '../lib/chartDataService';

interface MiniAssetChartProps {
  assetId: number;
  height?: number;
}

interface ChartPoint {
  date: string;
  value: number;
}

type ChartMode = 'investment' | 'stock';

export const MiniAssetChart: React.FC<MiniAssetChartProps> = ({ assetId, height = 80 }) => {
  const [investmentData, setInvestmentData] = useState<ChartPoint[]>([]);
  const [stockData, setStockData] = useState<ChartPoint[]>([]);
  const [chartMode, setChartMode] = useState<ChartMode>('investment');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChartData();
  }, [assetId]);

  const loadChartData = async () => {
    setLoading(true);
    try {
      const data = await getAssetChartData(assetId, '1M');
      
      const investmentChartData = data.investmentValue.map(point => ({
        date: point.date,
        value: point.value
      }));
      
      const stockChartData = data.stockPrice.map(point => ({
        date: point.date,
        value: point.value
      }));
      
      setInvestmentData(investmentChartData);
      setStockData(stockChartData);
    } catch (error) {
      console.error('Error loading mini chart data:', error);
    } finally {
      setLoading(false);
    }
  };

  const currentData = chartMode === 'investment' ? investmentData : stockData;
  
  if (loading || currentData.length === 0) {
    return (
      <div 
        className="flex flex-col items-center justify-center bg-gray-800 rounded"
        style={{ height }}
      >
        <div className="text-xs text-gray-500 mb-2">
          {loading ? 'Loading...' : 'No data'}
        </div>
      </div>
    );
  }

  const isPositive = currentData.length > 1 && 
    currentData[currentData.length - 1].value > currentData[0].value;

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
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div style={{ width: '100%', height }}>
      {/* Chart Mode Toggle */}
      <div className="flex justify-between items-center mb-3">
        <p className="text-muted text-sm">
          {chartMode === 'investment' ? 'Investment Value' : 'Stock Price'} (30 days)
        </p>
        <div className="flex gap-1">
          <button
            onClick={() => setChartMode('investment')}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              chartMode === 'investment'
                ? 'bg-green-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
            title="Show your investment value"
          >
            <DollarSign className="w-3 h-3 inline mr-1" />
            My Value
          </button>
          <button
            onClick={() => setChartMode('stock')}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              chartMode === 'stock'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
            title="Show stock price"
          >
            <TrendingUp className="w-3 h-3 inline mr-1" />
            Stock Price
          </button>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={height - 40}>
        <LineChart data={currentData} margin={{ top: 5, right: 5, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="2 2" stroke="#374151" opacity={0.3} />
          <XAxis 
            dataKey="date" 
            stroke="#64748b"
            tickFormatter={formatXAxisTick}
            fontSize={10}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis 
            stroke="#64748b"
            tickFormatter={formatYAxisTick}
            fontSize={10}
            axisLine={false}
            tickLine={false}
            width={35}
          />
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke={chartMode === 'investment' ? (isPositive ? '#10b981' : '#ef4444') : '#3b82f6'}
            strokeWidth={2}
            dot={false}
            activeDot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
