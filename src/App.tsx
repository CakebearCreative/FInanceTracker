import { useState, useEffect } from 'react';
import { Plus, Wallet, TrendingUp, RefreshCw, Settings, Home, BarChart3 } from 'lucide-react';
import { PortfolioSummary } from './components/PortfolioSummary';
import { PortfolioChart } from './components/PortfolioChart';
import { AssetList } from './components/AssetList';
import { AccountForm } from './components/AccountForm';
import { AssetForm } from './components/AssetForm';
import { SettingsModal } from './components/SettingsModal';
import { AccountsList } from './components/AccountsList';
import { AccountView } from './components/AccountView';
import { RealEstateForm } from './components/RealEstateForm';
import { RealEstateList } from './components/RealEstateList';
import { db } from './lib/database';
import { calculatePortfolioSummary } from './lib/portfolioUtils';
import { startPriceUpdates, updateAllAssetPrices } from './lib/priceUpdateService';
import { getSettings } from './lib/settings';
import type { PortfolioSummary as PortfolioSummaryType } from './lib/portfolioUtils';

function App() {
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [showAssetForm, setShowAssetForm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showRealEstateForm, setShowRealEstateForm] = useState(false);
  const [currentView, setCurrentView] = useState<'portfolio' | 'accounts' | 'real-estate'>('portfolio');
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [portfolioSummary, setPortfolioSummary] = useState<PortfolioSummaryType>({
    totalValue: 0,
    totalInitialValue: 0,
    totalGainLoss: 0,
    totalGainLossPercentage: 0,
    assetCount: 0,
    accountCount: 0,
    displayCurrency: 'SEK'
  });
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isUpdatingPrices, setIsUpdatingPrices] = useState(false);

  useEffect(() => {
    loadPortfolioData();
    // Start automatic price updates
    startPriceUpdates();
  }, [refreshTrigger]);

  const loadPortfolioData = async () => {
    const assets = await db.assets.toArray();
    const settings = await getSettings();
    const summary = await calculatePortfolioSummary(assets, settings.displayCurrency);
    setPortfolioSummary(summary);
  };

  const handleDataChange = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleAccountSelect = (accountId: number) => {
    setSelectedAccountId(accountId);
  };

  const handleBackToAccounts = () => {
    setSelectedAccountId(null);
  };

  const handleManualPriceUpdate = async () => {
    setIsUpdatingPrices(true);
    await updateAllAssetPrices();
    setRefreshTrigger(prev => prev + 1);
    setIsUpdatingPrices(false);
  };

  // If viewing a specific account, show AccountView
  if (selectedAccountId) {
    return <AccountView accountId={selectedAccountId} onBack={handleBackToAccounts} />;
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)' }}>
      <header style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-secondary)' }}>
        <div className="container">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-blue-400" />
              <h1 className="text-2xl font-bold">Finance Tracker</h1>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowSettings(true)}
                className="btn"
                title="Settings"
              >
                <Settings className="w-4 h-4" />
              </button>
              <button
                onClick={handleManualPriceUpdate}
                disabled={isUpdatingPrices}
                className="btn"
                title="Update all asset prices"
              >
                <RefreshCw className={`w-4 h-4 ${isUpdatingPrices ? 'animate-spin' : ''}`} />
                {isUpdatingPrices ? 'Updating...' : 'Refresh Prices'}
              </button>
              
              {currentView === 'portfolio' && (
                <>
                  <button
                    onClick={() => setShowAccountForm(true)}
                    className="btn btn-primary"
                  >
                    <Wallet className="w-4 h-4" />
                    Add Account
                  </button>
                  <button
                    onClick={() => setShowAssetForm(true)}
                    className="btn btn-primary"
                  >
                    <Plus className="w-4 h-4" />
                    Add Asset
                  </button>
                </>
              )}
              
              {currentView === 'real-estate' && (
                <button
                  onClick={() => setShowRealEstateForm(true)}
                  className="btn btn-primary"
                >
                  <Home className="w-4 h-4" />
                  Add Property
                </button>
              )}
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex gap-1 mt-4">
            <button
              onClick={() => setCurrentView('portfolio')}
              className={`btn ${currentView === 'portfolio' ? 'btn-primary' : ''}`}
            >
              <TrendingUp className="w-4 h-4" />
              Portfolio
            </button>
            <button
              onClick={() => setCurrentView('accounts')}
              className={`btn ${currentView === 'accounts' ? 'btn-primary' : ''}`}
            >
              <BarChart3 className="w-4 h-4" />
              Accounts
            </button>
            <button
              onClick={() => setCurrentView('real-estate')}
              className={`btn ${currentView === 'real-estate' ? 'btn-primary' : ''}`}
            >
              <Home className="w-4 h-4" />
              Real Estate
            </button>
          </div>
        </div>
      </header>

      <main className="container py-6">
        {currentView === 'portfolio' && (
          <>
            <PortfolioSummary summary={portfolioSummary} />
            
            <div className="grid grid-2 gap-6 mt-6">
              <PortfolioChart />
              <AssetList refreshTrigger={refreshTrigger} />
            </div>
          </>
        )}

        {currentView === 'accounts' && (
          <AccountsList 
            onAccountSelect={handleAccountSelect}
            refreshTrigger={refreshTrigger}
          />
        )}

        {currentView === 'real-estate' && (
          <RealEstateList refreshTrigger={refreshTrigger} />
        )}
      </main>

      {showAccountForm && (
        <AccountForm
          onClose={() => setShowAccountForm(false)}
          onAccountAdded={handleDataChange}
        />
      )}

      {showAssetForm && (
        <AssetForm
          onClose={() => setShowAssetForm(false)}
          onAssetAdded={handleDataChange}
        />
      )}

      {showSettings && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
          onSettingsUpdated={handleDataChange}
        />
      )}

      {showRealEstateForm && (
        <RealEstateForm
          onClose={() => setShowRealEstateForm(false)}
          onRealEstateAdded={handleDataChange}
        />
      )}
    </div>
  );
}

export default App;
