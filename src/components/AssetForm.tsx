import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { db, type Asset, type Account } from '../lib/database';

interface AssetFormProps {
  onClose: () => void;
  onAssetAdded: () => void;
}

export const AssetForm: React.FC<AssetFormProps> = ({ onClose, onAssetAdded }) => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [formData, setFormData] = useState({
    accountId: '',
    name: '',
    type: 'stock' as Asset['type'],
    symbol: '',
    purchaseValue: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    interestRate: ''
  });

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    const accountList = await db.accounts.toArray();
    setAccounts(accountList);
    if (accountList.length > 0 && !formData.accountId) {
      setFormData(prev => ({ ...prev, accountId: accountList[0].id!.toString() }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const purchaseValue = parseFloat(formData.purchaseValue);

      // Determine currency and exchange based on symbol
      let currency: 'SEK' | 'EUR' | 'USD' = 'SEK';
      let exchange = '';
      let autoUpdate = false;

      if (formData.symbol) {
        if (formData.symbol.includes('.ST') || formData.symbol.includes('-B') || formData.symbol.includes('-A')) {
          currency = 'SEK';
          exchange = 'STO';
        } else if (formData.symbol.match(/^[A-Z]{1,5}$/)) {
          currency = 'USD';
          exchange = 'NASDAQ';
        }
        autoUpdate = formData.type === 'stock' || formData.type === 'index';
      }

      // For simplicity, we'll use quantity = 1 and price = purchaseValue
      // This way we track value directly without worrying about shares
      const quantity = 1;
      const pricePerUnit = purchaseValue;

      await db.assets.add({
        accountId: parseInt(formData.accountId),
        name: formData.name,
        type: formData.type,
        symbol: formData.symbol || undefined,
        exchange: exchange || undefined,
        currentPrice: pricePerUnit,
        currentValue: purchaseValue,
        initialPrice: pricePerUnit,
        initialValue: purchaseValue,
        quantity,
        currency,
        autoUpdate,
        interestRate: formData.interestRate ? parseFloat(formData.interestRate) : undefined,
        purchaseDate: new Date(formData.purchaseDate),
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Get the newly added asset ID
      const newAsset = await db.assets.orderBy('id').last();
      if (newAsset?.id) {
        // Add initial value to history
        await db.valueHistory.add({
          assetId: newAsset.id,
          value: purchaseValue,
          price: pricePerUnit,
          date: new Date(formData.purchaseDate)
        });
      }
      
      onAssetAdded();
      onClose();
    } catch (error) {
      console.error('Error adding asset:', error);
      alert('Error adding asset. Please check your inputs and try again.');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
    setFormData(prev => ({
      ...prev,
      [e.target.name]: value
    }));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">Add New Asset</h3>
          <button onClick={onClose} className="btn">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Account</label>
            <select
              name="accountId"
              value={formData.accountId}
              onChange={handleChange}
              className="select"
              required
            >
              {accounts.map(account => (
                <option key={account.id} value={account.id}>
                  {account.name} ({account.bank})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-2">
            <div className="form-group">
              <label className="form-label">Asset Type</label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                className="select"
                required
              >
                <option value="stock">Stock</option>
                <option value="index">Index Fund</option>
                <option value="savings">Savings Account</option>
                <option value="bond">Bond</option>
                <option value="crypto">Cryptocurrency</option>
                <option value="cash">Cash</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Asset Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="input"
                placeholder="e.g., NVIDIA Corporation, Volvo B"
                required
              />
            </div>
          </div>

          {(formData.type === 'stock' || formData.type === 'index' || formData.type === 'crypto') && (
            <div className="form-group">
              <label className="form-label">Trading Symbol</label>
              <input
                type="text"
                name="symbol"
                value={formData.symbol}
                onChange={handleChange}
                className="input"
                placeholder="e.g., NVDA, VOLV-B.ST, BTC"
                required
              />
              <p className="text-sm text-muted mt-1">
                For Swedish stocks: Use format like VOLV-B.ST • For US stocks: Use format like NVDA
              </p>
            </div>
          )}

          <div className="grid grid-2">
            <div className="form-group">
              <label className="form-label">Purchase Date</label>
              <input
                type="date"
                name="purchaseDate"
                value={formData.purchaseDate}
                onChange={handleChange}
                className="input"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                {formData.type === 'savings' ? 'Initial Amount' : 'Purchase Value'}
              </label>
              {/* Currency Display */}
              {formData.symbol && (
                <div className="mb-2">
                  <span className="text-xs text-muted bg-gray-700 px-2 py-1 rounded">
                    Currency: {formData.symbol.includes('.ST') || formData.symbol.includes('-B') || formData.symbol.includes('-A') ? 'SEK' : 
                             formData.symbol.match(/^[A-Z]{1,5}$/) ? 'USD' : 'SEK'}
                  </span>
                </div>
              )}
              <input
                type="number"
                name="purchaseValue"
                value={formData.purchaseValue}
                onChange={handleChange}
                className="input"
                step="0.01"
                min="0.01"
                placeholder={formData.type === 'savings' ? "e.g., 50000" : "e.g., 1500"}
                required
              />
              <p className="text-sm text-muted mt-1">
                {formData.type === 'savings' 
                  ? 'The initial amount you deposited'
                  : 'The total value you invested (what you paid)'
                }
              </p>
            </div>
          </div>

          {formData.type === 'savings' && (
            <div className="form-group">
              <label className="form-label">Annual Interest Rate (%)</label>
              <input
                type="number"
                name="interestRate"
                value={formData.interestRate}
                onChange={handleChange}
                className="input"
                step="0.01"
                min="0"
                max="100"
                placeholder="e.g., 2.5"
                required
              />
            </div>
          )}

          <div className="flex gap-3 mt-6">
            <button type="button" onClick={onClose} className="btn flex-1">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary flex-1">
              Add {formData.type === 'savings' ? 'Account' : 'Investment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
