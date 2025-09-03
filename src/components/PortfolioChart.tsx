import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { db } from '../lib/database';
import { formatCurrency } from '../lib/portfolioUtils';

interface ChartData {
  date: string;
  value: number;
  gainLoss: number;
}

export const PortfolioChart: React.FC = () => {
  const [chartData, setChartData] = useState<ChartData[]>([]);

  useEffect(() => {
    loadChartData();
  }, []);

  const loadChartData = async () => {
    const assets = await db.assets.toArray();
    const valueHistory = await db.valueHistory.orderBy('date').toArray();
    
    // Group by date and calculate total portfolio value
    const dateGroups = valueHistory.reduce((acc: Record<string, typeof valueHistory>, entry) => {
      const dateKey = entry.date.toISOString().split('T')[0];
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(entry);
      return acc;
    }, {});

    const chartPoints: ChartData[] = [];
    
    Object.entries(dateGroups).forEach(([date, entries]) => {
      // For each date, calculate total portfolio value
      const totalValue = entries.reduce((sum: number, entry) => sum + entry.value, 0);
      const totalInitialValue = assets.reduce((sum: number, asset) => sum + asset.initialValue, 0);
      const gainLoss = totalValue - totalInitialValue;
      
      chartPoints.push({
        date,
        value: totalValue,
        gainLoss
      });
    });

    // Sort by date
    chartPoints.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    setChartData(chartPoints);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-lg">
          <p className="text-sm text-gray-300">{new Date(label).toLocaleDateString()}</p>
          <p className="text-lg font-semibold text-white">
            {formatCurrency(data.value)}
          </p>
          <p className={`text-sm ${data.gainLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {data.gainLoss >= 0 ? '+' : ''}{formatCurrency(data.gainLoss)}
          </p>
        </div>
      );
    }
    return null;
  };

  if (chartData.length === 0) {
    return (
      <div className="card">
        <h3 className="text-xl font-bold mb-4">Portfolio Performance</h3>
        <p className="text-muted text-center py-8">
          No data available yet. Add some assets and update their values to see the chart.
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <h3 className="text-xl font-bold mb-4">Portfolio Performance</h3>
      <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis 
              dataKey="date" 
              stroke="#64748b"
              tickFormatter={(value: string) => new Date(value).toLocaleDateString()}
            />
            <YAxis 
              stroke="#64748b"
              tickFormatter={(value: number) => `$${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke="#3b82f6" 
              strokeWidth={2}
              dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
