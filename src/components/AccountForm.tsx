import React, { useState } from 'react';
import { X } from 'lucide-react';
import { db, type Account } from '../lib/database';

interface AccountFormProps {
  onClose: () => void;
  onAccountAdded: () => void;
}

export const AccountForm: React.FC<AccountFormProps> = ({ onClose, onAccountAdded }) => {
  const [formData, setFormData] = useState({
    name: '',
    type: 'investment' as Account['type'],
    bank: '',
    currency: 'SEK' as Account['currency']
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await db.accounts.add({
        ...formData,
        createdAt: new Date()
      });
      
      onAccountAdded();
      onClose();
    } catch (error) {
      console.error('Error adding account:', error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">Add New Account</h3>
          <button onClick={onClose} className="btn">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Account Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="input"
              placeholder="e.g., Fidelity Brokerage"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Account Type</label>
            <select
              name="type"
              value={formData.type}
              onChange={handleChange}
              className="select"
              required
            >
              <option value="investment">Investment</option>
              <option value="savings">Savings</option>
              <option value="checking">Checking</option>
              <option value="credit">Credit</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Bank/Institution</label>
            <input
              type="text"
              name="bank"
              value={formData.bank}
              onChange={handleChange}
              className="input"
              placeholder="e.g., Nordea, Swedbank, Avanza"
              required
            />
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
              <option value="SEK">SEK (Swedish Krona)</option>
              <option value="EUR">EUR (Euro)</option>
              <option value="USD">USD (US Dollar)</option>
            </select>
          </div>

          <div className="flex gap-3 mt-6">
            <button type="button" onClick={onClose} className="btn flex-1">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary flex-1">
              Add Account
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
