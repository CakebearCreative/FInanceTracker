import React, { useState, useEffect } from 'react';
import { ChevronRight, Building, Wallet, TrendingUp, TrendingDown } from 'lucide-react';
import { db, type Account } from '../lib/database';
import { formatCurrency } from '../lib/portfolioUtils';
import { convertToDisplayCurrency } from '../lib/currencyConverter';
import { getSettings } from '../lib/settings';

interface AccountWithSummary extends Account {
  assetCount: number;
  totalValue: number;
  totalGainLoss: number;
  displayCurrency: string;
}

interface AccountsListProps {
  onAccountSelect: (accountId: number) => void;
  refreshTrigger: number;
}

export const AccountsList: React.FC<AccountsListProps> = ({ onAccountSelect, refreshTrigger }) => {
  const [accounts, setAccounts] = useState<AccountWithSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAccounts();
  }, [refreshTrigger]);

  const loadAccounts = async () => {
    try {
      setLoading(true);
      
      const allAccounts = await db.accounts.toArray();
      const settings = await getSettings();
      
      const accountsWithSummary: AccountWithSummary[] = [];

      for (const account of allAccounts) {
        const assets = await db.assets.where('accountId').equals(account.id!).toArray();
        
        let totalValue = 0;
        let totalInitialValue = 0;

        // Convert all asset values to display currency
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

        accountsWithSummary.push({
          ...account,
          assetCount: assets.length,
          totalValue,
          totalGainLoss,
          displayCurrency: settings.displayCurrency
        });
      }

      setAccounts(accountsWithSummary);
    } catch (error) {
      console.error('Error loading accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAccountIcon = (type: Account['type']) => {
    switch (type) {
      case 'investment':
        return <TrendingUp className="w-5 h-5 text-blue-400" />;
      case 'savings':
        return <Building className="w-5 h-5 text-green-400" />;
      case 'checking':
        return <Wallet className="w-5 h-5 text-yellow-400" />;
      case 'credit':
        return <Wallet className="w-5 h-5 text-red-400" />;
      default:
        return <Wallet className="w-5 h-5 text-gray-400" />;
    }
  };

  const getAccountTypeLabel = (type: Account['type']) => {
    switch (type) {
      case 'investment':
        return 'Investment';
      case 'savings':
        return 'Savings';
      case 'checking':
        return 'Checking';
      case 'credit':
        return 'Credit';
      default:
        return 'Account';
    }
  };

  if (loading) {
    return (
      <div className="card">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
        </div>
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="card">
        <div className="text-center py-8">
          <Wallet className="w-12 h-12 text-muted mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Accounts Yet</h3>
          <p className="text-muted">Add your first account to get started tracking your investments.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-4">Accounts ({accounts.length})</h3>
      
      <div className="space-y-3">
        {accounts.map((account) => {
          const isPositive = account.totalGainLoss >= 0;
          
          return (
            <div
              key={account.id}
              onClick={() => onAccountSelect(account.id!)}
              className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-card-hover cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-4">
                {getAccountIcon(account.type)}
                <div>
                  <h4 className="font-semibold">{account.name}</h4>
                  <p className="text-sm text-muted">
                    {account.bank} • {getAccountTypeLabel(account.type)} • {account.currency}
                  </p>
                  <p className="text-xs text-muted">
                    {account.assetCount} asset{account.assetCount !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <p className="font-semibold">
                  {formatCurrency(account.totalValue, account.displayCurrency)}
                </p>
                {account.totalGainLoss !== 0 && (
                  <div className="flex items-center gap-1">
                    {isPositive ? (
                      <TrendingUp className="w-3 h-3 text-green-400" />
                    ) : (
                      <TrendingDown className="w-3 h-3 text-red-400" />
                    )}
                    <p className={`text-sm ${isPositive ? 'text-success' : 'text-danger'}`}>
                      {formatCurrency(Math.abs(account.totalGainLoss), account.displayCurrency)}
                    </p>
                  </div>
                )}
                <ChevronRight className="w-4 h-4 text-muted mt-1" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
