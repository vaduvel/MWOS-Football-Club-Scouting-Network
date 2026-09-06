import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import type { AppUser } from '../lib/authData';
import { signOut } from '../lib/authData';

interface AuthState {
  user: AppUser | null;
  session: Session | null;
  token: string | null;
  setAuth: (user: AppUser | null, session: Session | null) => void;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  token: null,
  setAuth: (user, session) => {
    set({
      user,
      session,
      token: session?.access_token || null,
    });
  },
  logout: async () => {
    await signOut();
    set({ user: null, session: null, token: null });
  },
}));
