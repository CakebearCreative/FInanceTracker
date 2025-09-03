import React, { useState } from 'react';
import { X, Home } from 'lucide-react';
import { db } from '../lib/database';

interface RealEstateFormProps {
  onClose: () => void;
  onRealEstateAdded: () => void;
}

export const RealEstateForm: React.FC<RealEstateFormProps> = ({ onClose, onRealEstateAdded }) => {
  const [formData, setFormData] = useState({
    name: '',
    type: 'apartment' as 'apartment' | 'house' | 'commercial' | 'land',
    currentValue: '',
    initialValue: '',
    loanAmount: '',
    currency: 'SEK' as 'SEK' | 'EUR' | 'USD',
    address: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.currentValue || !formData.initialValue) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const currentValue = parseFloat(formData.currentValue);
      const initialValue = parseFloat(formData.initialValue);
      const loanAmount = formData.loanAmount ? parseFloat(formData.loanAmount) : 0;

      if (isNaN(currentValue) || isNaN(initialValue) || currentValue < 0 || initialValue < 0) {
        alert('Please enter valid positive numbers for values');
        return;
      }

      if (loanAmount < 0) {
        alert('Loan amount cannot be negative');
        return;
      }

      await db.realEstate.add({
        name: formData.name,
        type: formData.type,
        currentValue,
        initialValue,
        loanAmount,
        currency: formData.currency,
        address: formData.address || undefined,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Add initial history entry
      const newRealEstate = await db.realEstate.orderBy('id').last();
      if (newRealEstate?.id) {
        await db.realEstateHistory.add({
          realEstateId: newRealEstate.id,
          value: currentValue,
          loanAmount,
          date: new Date()
        });
      }

      onRealEstateAdded();
      onClose();
    } catch (error) {
      console.error('Error adding real estate:', error);
      alert('Error adding real estate. Please try again.');
    }
  };



  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <Home className="w-5 h-5" />
            <h3 className="text-xl font-bold">Add Real Estate</h3>
          </div>
          <button onClick={onClose} className="btn">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Property Name *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="input"
              placeholder="e.g., My Apartment, Summer House"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Property Type *</label>
            <select
              name="type"
              value={formData.type}
              onChange={handleChange}
              className="select"
              required
            >
              <option value="apartment">Apartment</option>
              <option value="house">House</option>
              <option value="commercial">Commercial</option>
              <option value="land">Land</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Address (Optional)</label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleChange}
              className="input"
              rows={2}
              placeholder="Property address"
            />
          </div>

          <div className="grid grid-2 gap-4">
            <div className="form-group">
              <label className="form-label">Current Value *</label>
              <input
                type="number"
                name="currentValue"
                value={formData.currentValue}
                onChange={handleChange}
                className="input"
                step="0.01"
                min="0"
                placeholder="Current market value"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Initial Value *</label>
              <input
                type="number"
                name="initialValue"
                value={formData.initialValue}
                onChange={handleChange}
                className="input"
                step="0.01"
                min="0"
                placeholder="Purchase price"
                required
              />
            </div>
          </div>

          <div className="grid grid-2 gap-4">
            <div className="form-group">
              <label className="form-label">Outstanding Loan</label>
              <input
                type="number"
                name="loanAmount"
                value={formData.loanAmount}
                onChange={handleChange}
                className="input"
                step="0.01"
                min="0"
                placeholder="Remaining mortgage/loan"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Currency *</label>
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
          </div>

          <div className="bg-card-hover p-3 rounded-lg mt-4">
            <h4 className="font-semibold mb-2">Summary</h4>
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span>Property Value:</span>
                <span>{formData.currentValue ? parseFloat(formData.currentValue).toLocaleString() : '0'} {formData.currency}</span>
              </div>
              <div className="flex justify-between">
                <span>Outstanding Loan:</span>
                <span>{formData.loanAmount ? parseFloat(formData.loanAmount).toLocaleString() : '0'} {formData.currency}</span>
              </div>
              <div className="flex justify-between font-semibold border-t border-border pt-1">
                <span>Net Equity:</span>
                <span>
                  {formData.currentValue && formData.loanAmount 
                    ? (parseFloat(formData.currentValue) - (parseFloat(formData.loanAmount) || 0)).toLocaleString()
                    : formData.currentValue 
                    ? parseFloat(formData.currentValue).toLocaleString()
                    : '0'} {formData.currency}
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button type="button" onClick={onClose} className="btn flex-1">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary flex-1">
              Add Real Estate
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
