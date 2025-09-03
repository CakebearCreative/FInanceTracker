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
    exchange: '',
    currentPrice: '',
    initialPrice: '',
    quantity: '1',
    currency: 'SEK' as Asset['currency'],
    autoUpdate: false,
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
      const currentPrice = parseFloat(formData.currentPrice);
      const initialPrice = parseFloat(formData.initialPrice);
      const quantity = parseFloat(formData.quantity);
      const currentValue = currentPrice * quantity;
      const initialValue = initialPrice * quantity;

      await db.assets.add({
        accountId: parseInt(formData.accountId),
        name: formData.name,
        type: formData.type,
        symbol: formData.symbol || undefined,
        exchange: formData.exchange || undefined,
        currentPrice,
        currentValue,
        initialPrice,
        initialValue,
        quantity,
        currency: formData.currency,
        autoUpdate: formData.autoUpdate,
        interestRate: formData.interestRate ? parseFloat(formData.interestRate) : undefined,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Get the newly added asset ID
      const newAsset = await db.assets.orderBy('id').last();
      if (newAsset?.id) {
        // Add initial value to history
        await db.valueHistory.add({
          assetId: newAsset.id,
          value: currentValue,
          date: new Date()
        });
      }
      
      onAssetAdded();
      onClose();
    } catch (error) {
      console.error('Error adding asset:', error);
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

          <div className="form-group">
            <label className="form-label">Asset Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="input"
              placeholder="e.g., Apple Inc., S&P 500 Index"
              required
            />
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
                <option value="bond">Bond</option>
                <option value="cash">Cash</option>
                <option value="savings">Savings Account</option>
                <option value="crypto">Cryptocurrency</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Symbol</label>
              <input
                type="text"
                name="symbol"
                value={formData.symbol}
                onChange={handleChange}
                className="input"
                placeholder="e.g., VOLV-B, AAPL, SPY"
                required={formData.autoUpdate}
              />
            </div>
          </div>

          <div className="grid grid-2">
            <div className="form-group">
              <label className="form-label">Exchange</label>
              <select
                name="exchange"
                value={formData.exchange}
                onChange={handleChange}
                className="select"
              >
                <option value="">Select Exchange</option>
                <option value="STO">Stockholm (STO)</option>
                <option value="NYSE">New York (NYSE)</option>
                <option value="NASDAQ">NASDAQ</option>
                <option value="LSE">London (LSE)</option>
                <option value="FRA">Frankfurt (FRA)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Currency</label>
              <select
                name="currency"
                value={formData.currency}
                onChange={handleChange}
                className="select"
                required
              >
                <option value="SEK">SEK</option>
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>

          <div className="grid grid-3">
            <div className="form-group">
              <label className="form-label">Quantity</label>
              <input
                type="number"
                name="quantity"
                value={formData.quantity}
                onChange={handleChange}
                className="input"
                step="0.001"
                min="0"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Initial Price</label>
              <input
                type="number"
                name="initialPrice"
                value={formData.initialPrice}
                onChange={handleChange}
                className="input"
                step="0.01"
                min="0"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Current Price</label>
              <input
                type="number"
                name="currentPrice"
                value={formData.currentPrice}
                onChange={handleChange}
                className="input"
                step="0.01"
                min="0"
                required
              />
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
              />
            </div>
          )}

          {formData.type !== 'savings' && formData.type !== 'cash' && (
            <div className="form-group">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="autoUpdate"
                  checked={formData.autoUpdate}
                  onChange={handleChange}
                  className="checkbox"
                />
                <span className="form-label mb-0">Enable automatic price updates</span>
              </label>
              <p className="text-sm text-muted mt-1">
                Automatically fetch live prices for this asset (requires valid symbol and exchange)
              </p>
            </div>
          )}

          <div className="flex gap-3 mt-6">
            <button type="button" onClick={onClose} className="btn flex-1">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary flex-1">
              Add Asset
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
