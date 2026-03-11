import { create } from 'zustand';

export interface AppSettings {
  football_api_provider: string;
  football_api_key: string;
}

interface SettingsState extends AppSettings {
  football_api_provider: string;
  football_api_key: string;
  setSettings: (settings: AppSettings) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  football_api_provider: 'api-football',
  football_api_key: '',
  setSettings: (settings) => set(settings),
}));
