import React, { useState } from 'react';
import { X, TrendingUp, TrendingDown } from 'lucide-react';
import { db, type Asset, type Transaction } from '../lib/database';
import { formatCurrency } from '../lib/portfolioUtils';

interface TransactionModalProps {
  asset: Asset;
  onClose: () => void;
  onTransactionAdded: () => void;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({ 
  asset, 
  onClose, 
  onTransactionAdded 
}) => {
  const [formData, setFormData] = useState({
    type: 'buy' as Transaction['type'],
    quantity: '1',
    pricePerUnit: asset.currentPrice.toString(),
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const quantity = parseFloat(formData.quantity);
      const pricePerUnit = parseFloat(formData.pricePerUnit);
      const totalValue = quantity * pricePerUnit;

      // Add transaction record
      await db.transactions.add({
        assetId: asset.id!,
        type: formData.type,
        quantity,
        pricePerUnit,
        totalValue,
        date: new Date(formData.date),
        notes: formData.notes || undefined,
        createdAt: new Date()
      });

      // Update asset based on transaction type
      let newQuantity = asset.quantity;
      let newCurrentValue = asset.currentValue;

      if (formData.type === 'buy') {
        newQuantity += quantity;
        newCurrentValue += totalValue;
      } else { // sell
        newQuantity = Math.max(0, newQuantity - quantity);
        newCurrentValue = Math.max(0, newCurrentValue - totalValue);
      }

      // Update asset
      await db.assets.update(asset.id!, {
        quantity: newQuantity,
        currentValue: newCurrentValue,
        currentPrice: pricePerUnit, // Update to latest transaction price
        updatedAt: new Date()
      });

      // Add to value history
      await db.valueHistory.add({
        assetId: asset.id!,
        value: newCurrentValue,
        price: pricePerUnit,
        date: new Date(formData.date)
      });

      onTransactionAdded();
      onClose();
    } catch (error) {
      console.error('Error adding transaction:', error);
      alert('Error adding transaction. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const totalValue = parseFloat(formData.quantity) * parseFloat(formData.pricePerUnit);
  const isSell = formData.type === 'sell';
  const maxSellQuantity = asset.quantity;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">
            {isSell ? 'Sell' : 'Buy'} {asset.name}
          </h2>
          <button onClick={onClose} className="btn-icon">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-4 p-3 bg-gray-800 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-semibold">{asset.name}</span>
            <span className="text-sm text-muted">({asset.symbol})</span>
          </div>
          <div className="grid grid-2 gap-4 text-sm">
            <div>
              <p className="text-muted">Current Holdings</p>
              <p className="font-semibold">{asset.quantity} shares</p>
            </div>
            <div>
              <p className="text-muted">Current Price</p>
              <p className="font-semibold">{formatCurrency(asset.currentPrice, asset.currency)}</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Transaction Type</label>
            <div className="grid grid-2 gap-2">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, type: 'buy' }))}
                className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg border transition-colors ${
                  formData.type === 'buy'
                    ? 'bg-green-600 border-green-500 text-white'
                    : 'bg-gray-700 border-gray-600 text-gray-300 hover:border-green-500'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                Buy More
              </button>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, type: 'sell' }))}
                className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg border transition-colors ${
                  formData.type === 'sell'
                    ? 'bg-red-600 border-red-500 text-white'
                    : 'bg-gray-700 border-gray-600 text-gray-300 hover:border-red-500'
                }`}
              >
                <TrendingDown className="w-4 h-4" />
                Sell Shares
              </button>
            </div>
          </div>

          <div className="grid grid-2 gap-4">
            <div className="form-group">
              <label className="form-label">Quantity</label>
              <input
                type="number"
                name="quantity"
                value={formData.quantity}
                onChange={handleChange}
                className="input"
                step="0.001"
                min="0.001"
                max={isSell ? maxSellQuantity : undefined}
                required
              />
              {isSell && (
                <p className="text-xs text-muted mt-1">
                  Max: {maxSellQuantity} shares available
                </p>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Price per Share</label>
              <input
                type="number"
                name="pricePerUnit"
                value={formData.pricePerUnit}
                onChange={handleChange}
                className="input"
                step="0.01"
                min="0.01"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Transaction Date</label>
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              className="input"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Notes (Optional)</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              className="input"
              rows={2}
              placeholder="e.g., Quarterly investment, Profit taking, etc."
            />
          </div>

          <div className="bg-gray-800 rounded-lg p-4 mb-6">
            <div className="flex justify-between items-center">
              <span className="font-semibold">Total Transaction Value:</span>
              <span className={`text-xl font-bold ${isSell ? 'text-green-400' : 'text-blue-400'}`}>
                {isSell ? '+' : '-'}{formatCurrency(totalValue || 0, asset.currency)}
              </span>
            </div>
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn flex-1">
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading || (isSell && parseFloat(formData.quantity) > maxSellQuantity)}
              className={`btn flex-1 ${isSell ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
            >
              {loading ? 'Processing...' : `${isSell ? 'Sell' : 'Buy'} Shares`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
