import React, { useState, useEffect } from 'react';
import { X, Settings } from 'lucide-react';
import { getSettings, updateSettings, type AppSettings } from '../lib/settings';

interface SettingsModalProps {
  onClose: () => void;
  onSettingsUpdated: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose, onSettingsUpdated }) => {
  const [settings, setSettings] = useState<AppSettings>({
    displayCurrency: 'SEK',
    autoUpdateInterval: 15,
    includeRealEstateInPortfolio: false
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const currentSettings = await getSettings();
    setSettings(currentSettings);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await updateSettings(settings);
      onSettingsUpdated();
      onClose();
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value, type } = e.target;
    const newValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : 
                     type === 'number' ? parseInt(value) : value;
    
    setSettings(prev => ({
      ...prev,
      [name]: newValue
    }));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            <h3 className="text-xl font-bold">Settings</h3>
          </div>
          <button onClick={onClose} className="btn">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Portfolio Display Currency</label>
            <select
              name="displayCurrency"
              value={settings.displayCurrency}
              onChange={handleChange}
              className="select"
            >
              <option value="SEK">SEK (Swedish Krona)</option>
              <option value="EUR">EUR (Euro)</option>
              <option value="USD">USD (US Dollar)</option>
            </select>
            <p className="text-sm text-muted mt-1">
              All portfolio values will be converted to this currency for display
            </p>
          </div>

          <div className="form-group">
            <label className="form-label">Auto-Update Interval (minutes)</label>
            <select
              name="autoUpdateInterval"
              value={settings.autoUpdateInterval}
              onChange={handleChange}
              className="select"
            >
              <option value={5}>5 minutes</option>
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={60}>1 hour</option>
              <option value={240}>4 hours</option>
            </select>
            <p className="text-sm text-muted mt-1">
              How often to automatically update stock prices
            </p>
          </div>

          <div className="form-group">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="includeRealEstateInPortfolio"
                checked={settings.includeRealEstateInPortfolio}
                onChange={handleChange}
                className="checkbox"
              />
              <span className="form-label mb-0">Include Real Estate in Portfolio</span>
            </label>
            <p className="text-sm text-muted mt-1">
              Whether to include real estate values in the main portfolio overview
            </p>
          </div>

          <div className="flex gap-3 mt-6">
            <button type="button" onClick={onClose} className="btn flex-1">
              Cancel
            </button>
            <button type="submit" className="btn btn-primary flex-1">
              Save Settings
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
