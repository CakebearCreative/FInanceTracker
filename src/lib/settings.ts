export interface AppSettings {
  displayCurrency: 'SEK' | 'EUR' | 'USD';
  autoUpdateInterval: number; // minutes
  includeRealEstateInPortfolio: boolean;
}

const SETTINGS_KEY = 'financeTracker_settings';

const defaultSettings: AppSettings = {
  displayCurrency: 'SEK',
  autoUpdateInterval: 15, // 15 minutes
  includeRealEstateInPortfolio: false,
};

export const getSettings = async (): Promise<AppSettings> => {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...defaultSettings, ...parsed };
    }
  } catch (error) {
    console.warn('Error reading settings from localStorage:', error);
  }
  
  return defaultSettings;
};

export const updateSettings = async (newSettings: Partial<AppSettings>): Promise<void> => {
  try {
    const currentSettings = await getSettings();
    const updatedSettings = { ...currentSettings, ...newSettings };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(updatedSettings));
  } catch (error) {
    console.error('Error updating settings:', error);
  }
};
