import React from 'react';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import type { PortfolioSummary as PortfolioSummaryType } from '../lib/portfolioUtils';
import { formatCurrency, formatPercentage } from '../lib/portfolioUtils';

interface PortfolioSummaryProps {
  summary: PortfolioSummaryType;
}

export const PortfolioSummary: React.FC<PortfolioSummaryProps> = ({ summary }) => {
  const isPositive = summary.totalGainLoss >= 0;

  return (
    <div className="card">
      <h2 className="text-2xl font-bold mb-6">Portfolio Overview</h2>
      
      <div className="grid grid-2 mb-6">
        <div className="card">
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className="w-5 h-5 text-blue-400" />
            <span className="text-lg font-semibold">Total Value</span>
          </div>
          <p className="text-2xl font-bold">{formatCurrency(summary.totalValue, summary.displayCurrency)}</p>
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
            {formatCurrency(summary.totalGainLoss, summary.displayCurrency)}
          </p>
          <p className={`text-sm ${isPositive ? 'text-success' : 'text-danger'}`}>
            {formatPercentage(summary.totalGainLossPercentage)}
          </p>
        </div>
      </div>

      <div className="grid grid-3">
        <div className="text-center">
          <p className="text-muted">Initial Investment</p>
          <p className="text-lg font-semibold">{formatCurrency(summary.totalInitialValue, summary.displayCurrency)}</p>
        </div>
        
        <div className="text-center">
          <p className="text-muted">Assets</p>
          <p className="text-lg font-semibold">{summary.assetCount}</p>
        </div>
        
        <div className="text-center">
          <p className="text-muted">Accounts</p>
          <p className="text-lg font-semibold">{summary.accountCount}</p>
        </div>
      </div>
    </div>
  );
};
