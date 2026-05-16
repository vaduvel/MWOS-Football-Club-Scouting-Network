import { create } from 'zustand';

export interface AppSettings {
  football_api_provider: string;
  football_api_key: string;
  email_training_plan_published: boolean;
  email_training_td_comment: boolean;
  email_training_reminder: boolean;
  email_training_schedule_change: boolean;
  email_transport_updates: boolean;
}

interface SettingsState extends AppSettings {
  football_api_provider: string;
  football_api_key: string;
  setSettings: (settings: Partial<AppSettings>) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  football_api_provider: 'api-football',
  football_api_key: '',
  email_training_plan_published: true,
  email_training_td_comment: true,
  email_training_reminder: true,
  email_training_schedule_change: true,
  email_transport_updates: true,
  setSettings: (settings) => set((state) => ({ ...state, ...settings })),
}));
