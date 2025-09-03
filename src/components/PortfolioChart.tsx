import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { TimeRangeSelector, type TimeRange } from './TimeRangeSelector';
import { getPortfolioChartData, type ChartDataPoint } from '../lib/chartDataService';
import { formatCurrency, formatPercentage } from '../lib/portfolioUtils';
import { getSettings } from '../lib/settings';

interface PortfolioChartProps {
  refreshTrigger?: number;
}

export const PortfolioChart: React.FC<PortfolioChartProps> = ({ refreshTrigger }) => {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [selectedRange, setSelectedRange] = useState<TimeRange>('1M');
  const [loading, setLoading] = useState(true);
  const [displayCurrency, setDisplayCurrency] = useState('SEK');

  useEffect(() => {
    loadChartData();
  }, [selectedRange, refreshTrigger]);

  const loadChartData = async () => {
    setLoading(true);
    try {
      const settings = await getSettings();
      setDisplayCurrency(settings.displayCurrency);
      
      const data = await getPortfolioChartData(selectedRange);
      setChartData(data);
    } catch (error) {
      console.error('Error loading portfolio chart data:', error);
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

  // Calculate current performance metrics
  const currentData = chartData[chartData.length - 1];
  const firstData = chartData[0];
  const periodGainLoss = currentData && firstData ? currentData.value - firstData.value : 0;
  const periodGainLossPercentage = currentData && firstData && firstData.value > 0 
    ? ((currentData.value - firstData.value) / firstData.value) * 100 
    : 0;



  if (chartData.length === 0) {
    return (
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">Portfolio Performance</h3>
          <TimeRangeSelector
            selectedRange={selectedRange}
            onRangeChange={setSelectedRange}
          />
        </div>
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <TrendingUp className="w-8 h-8 text-gray-400" />
          </div>
          <h4 className="font-semibold mb-2">No Performance Data</h4>
          <p className="text-muted text-sm max-w-sm mx-auto">
            Add some assets and wait for price updates to see your portfolio performance over time.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="mb-4">
        <h3 className="text-xl font-bold">Portfolio Performance</h3>
        {currentData && (
          <div className="flex items-center gap-3 mt-2">
            <span className="text-2xl font-bold">
              {formatCurrency(currentData.value, displayCurrency)}
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
      
      <div style={{ width: '100%', height: 280, minHeight: 280 }}>
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-muted">Loading chart data...</p>
            </div>
          </div>
        ) : (
          <ResponsiveContainer>
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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
                stroke="#3b82f6" 
                strokeWidth={2.5}
                dot={false}
                activeDot={{ 
                  r: 6, 
                  stroke: '#3b82f6', 
                  strokeWidth: 2,
                  fill: '#1e40af'
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
      
      <div className="flex justify-center mt-4">
        <TimeRangeSelector
          selectedRange={selectedRange}
          onRangeChange={setSelectedRange}
        />
      </div>
    </div>
  );
};
