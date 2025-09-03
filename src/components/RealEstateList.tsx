import React, { useState, useEffect } from 'react';
import { Home, TrendingUp, TrendingDown, Edit, Trash2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { db, type RealEstate } from '../lib/database';
import { formatCurrency, formatPercentage } from '../lib/portfolioUtils';
import { convertToDisplayCurrency } from '../lib/currencyConverter';
import { getSettings } from '../lib/settings';

interface RealEstateWithSummary extends RealEstate {
  netEquity: number;
  gainLoss: number;
  gainLossPercentage: number;
  displayCurrency: string;
}

interface ChartData {
  date: string;
  value: number;
  equity: number;
}

interface RealEstateListProps {
  refreshTrigger: number;
}

export const RealEstateList: React.FC<RealEstateListProps> = ({ refreshTrigger }) => {
  const [realEstate, setRealEstate] = useState<RealEstateWithSummary[]>([]);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    loadRealEstate();
  }, [refreshTrigger]);

  const loadRealEstate = async () => {
    try {
      setLoading(true);
      
      const allRealEstate = await db.realEstate.toArray();
      const settings = await getSettings();
      
      const realEstateWithSummary: RealEstateWithSummary[] = [];

      for (const property of allRealEstate) {
        // Convert values to display currency
        const convertedCurrentValue = await convertToDisplayCurrency(
          property.currentValue,
          property.currency,
          settings.displayCurrency
        );
        const convertedInitialValue = await convertToDisplayCurrency(
          property.initialValue,
          property.currency,
          settings.displayCurrency
        );
        const convertedLoanAmount = await convertToDisplayCurrency(
          property.loanAmount,
          property.currency,
          settings.displayCurrency
        );

        const netEquity = convertedCurrentValue - convertedLoanAmount;
        const initialEquity = convertedInitialValue - convertedLoanAmount;
        const gainLoss = netEquity - initialEquity;
        const gainLossPercentage = initialEquity > 0 ? (gainLoss / initialEquity) * 100 : 0;

        realEstateWithSummary.push({
          ...property,
          netEquity,
          gainLoss,
          gainLossPercentage,
          displayCurrency: settings.displayCurrency
        });
      }

      setRealEstate(realEstateWithSummary);
      await loadChartData(settings.displayCurrency);

    } catch (error) {
      console.error('Error loading real estate:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadChartData = async (displayCurrency: string) => {
    try {
      // Get all real estate history
      const allHistory = await db.realEstateHistory.toArray();
      const allProperties = await db.realEstate.toArray();

      // Group by date and sum values
      const dateGroups: Record<string, { totalValue: number; totalEquity: number; entries: Array<{ value: number; loanAmount: number; currency: string }> }> = {};

      for (const record of allHistory) {
        const dateKey = new Date(record.date).toISOString().split('T')[0];
        if (!dateGroups[dateKey]) {
          dateGroups[dateKey] = { totalValue: 0, totalEquity: 0, entries: [] };
        }
        
        const property = allProperties.find(p => p.id === record.realEstateId);
        if (property) {
          dateGroups[dateKey].entries.push({
            value: record.value,
            loanAmount: record.loanAmount,
            currency: property.currency
          });
        }
      }

      // Convert to display currency and format for chart
      const chartPoints: ChartData[] = [];
      
      for (const [dateKey, group] of Object.entries(dateGroups)) {
        let convertedTotalValue = 0;
        let convertedTotalEquity = 0;
        
        for (const entry of group.entries) {
          const convertedValue = await convertToDisplayCurrency(
            entry.value,
            entry.currency,
            displayCurrency
          );
          const convertedLoan = await convertToDisplayCurrency(
            entry.loanAmount,
            entry.currency,
            displayCurrency
          );
          
          convertedTotalValue += convertedValue;
          convertedTotalEquity += (convertedValue - convertedLoan);
        }

        chartPoints.push({
          date: dateKey,
          value: convertedTotalValue,
          equity: convertedTotalEquity
        });
      }

      // Sort by date and set chart data
      chartPoints.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      setChartData(chartPoints);

    } catch (error) {
      console.error('Error loading chart data:', error);
    }
  };

  const handleDelete = async (propertyId: number) => {
    if (!confirm('Are you sure you want to delete this property? This action cannot be undone.')) {
      return;
    }

    try {
      // Delete history first
      await db.realEstateHistory.where('realEstateId').equals(propertyId).delete();
      // Delete property
      await db.realEstate.delete(propertyId);
      
      // Reload data
      loadRealEstate();
    } catch (error) {
      console.error('Error deleting property:', error);
      alert('Error deleting property. Please try again.');
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('sv-SE', {
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTooltipValue = (value: number, displayCurrency: string) => {
    return formatCurrency(value, displayCurrency);
  };

  const getPropertyTypeLabel = (type: string) => {
    switch (type) {
      case 'apartment': return 'Apartment';
      case 'house': return 'House';
      case 'commercial': return 'Commercial';
      case 'land': return 'Land';
      default: return type;
    }
  };

  const totalValue = realEstate.reduce((sum, property) => sum + property.currentValue, 0);
  const totalEquity = realEstate.reduce((sum, property) => sum + property.netEquity, 0);
  const totalGainLoss = realEstate.reduce((sum, property) => sum + property.gainLoss, 0);
  const displayCurrency = realEstate[0]?.displayCurrency || 'SEK';

  if (loading) {
    return (
      <div className="card">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Real Estate Summary */}
      {realEstate.length > 0 && (
        <div className="grid grid-3 gap-6">
          <div className="card">
            <div className="flex items-center gap-3 mb-2">
              <Home className="w-5 h-5 text-blue-400" />
              <span className="text-lg font-semibold">Total Property Value</span>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(totalValue, displayCurrency)}</p>
          </div>

          <div className="card">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-5 h-5 text-green-400" />
              <span className="text-lg font-semibold">Net Equity</span>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(totalEquity, displayCurrency)}</p>
          </div>

          <div className="card">
            <div className="flex items-center gap-3 mb-2">
              {totalGainLoss >= 0 ? (
                <TrendingUp className="w-5 h-5 text-green-400" />
              ) : (
                <TrendingDown className="w-5 h-5 text-red-400" />
              )}
              <span className="text-lg font-semibold">Total Gain/Loss</span>
            </div>
            <p className={`text-2xl font-bold ${totalGainLoss >= 0 ? 'text-success' : 'text-danger'}`}>
              {formatCurrency(totalGainLoss, displayCurrency)}
            </p>
          </div>
        </div>
      )}

      {/* Real Estate Chart */}
      {chartData.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Real Estate Performance</h3>
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
                  formatter={(value: number, name: string) => [
                    formatTooltipValue(value, displayCurrency), 
                    name === 'value' ? 'Property Value' : 'Net Equity'
                  ]}
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
                  name="value"
                  dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="equity" 
                  stroke="#10B981" 
                  strokeWidth={2}
                  name="equity"
                  dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Properties List */}
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Properties ({realEstate.length})</h3>
        
        {realEstate.length === 0 ? (
          <div className="text-center py-8">
            <Home className="w-12 h-12 text-muted mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Properties Yet</h3>
            <p className="text-muted">Add your first property to track real estate investments.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {realEstate.map((property) => {
              const isPositive = property.gainLoss >= 0;

              return (
                <div key={property.id} className="border border-border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="font-semibold flex items-center gap-2">
                        <Home className="w-4 h-4" />
                        {property.name}
                      </h4>
                      <p className="text-sm text-muted">
                        {getPropertyTypeLabel(property.type)} • {property.currency}
                      </p>
                      {property.address && (
                        <p className="text-xs text-muted mt-1">{property.address}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        className="btn-icon"
                        title="Edit property"
                        onClick={() => {/* TODO: Implement edit */}}
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        className="btn-icon text-danger"
                        title="Delete property"
                        onClick={() => handleDelete(property.id!)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-4 gap-4 text-sm mb-4">
                    <div>
                      <p className="text-muted">Current Value</p>
                      <p className="font-semibold">{formatCurrency(property.currentValue, property.currency)}</p>
                    </div>
                    <div>
                      <p className="text-muted">Outstanding Loan</p>
                      <p>{formatCurrency(property.loanAmount, property.currency)}</p>
                    </div>
                    <div>
                      <p className="text-muted">Net Equity</p>
                      <p className="font-semibold">{formatCurrency(property.netEquity, property.displayCurrency)}</p>
                    </div>
                    <div>
                      <p className="text-muted">Gain/Loss</p>
                      <p className={`font-semibold ${isPositive ? 'text-success' : 'text-danger'}`}>
                        {formatCurrency(property.gainLoss, property.displayCurrency)}
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted">
                      Added: {new Date(property.createdAt).toLocaleDateString('sv-SE')}
                    </span>
                    <span className={`font-semibold ${isPositive ? 'text-success' : 'text-danger'}`}>
                      {formatPercentage(property.gainLossPercentage)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
