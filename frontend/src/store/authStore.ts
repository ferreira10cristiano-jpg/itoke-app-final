import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../lib/api';
import { User } from '../types';

interface AuthState {
  user: User | null;
  sessionToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  setSessionToken: (token: string | null) => void;
  login: (sessionId: string) => Promise<User>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

// Safe AsyncStorage wrapper
const safeAsyncStorage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.warn('AsyncStorage getItem error:', error);
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      await AsyncStorage.setItem(key, value);
    } catch (error) {
      console.warn('AsyncStorage setItem error:', error);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.warn('AsyncStorage removeItem error:', error);
    }
  },
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  sessionToken: null,
  isLoading: true,
  isAuthenticated: false,

  setUser: (user) => set({ user, isAuthenticated: !!user }),

  setSessionToken: (token) => {
    api.setSessionToken(token);
    set({ sessionToken: token });
    if (token) {
      safeAsyncStorage.setItem('session_token', token);
    } else {
      safeAsyncStorage.removeItem('session_token');
    }
  },

  login: async (sessionId: string) => {
    try {
      const { user, session_token } = await api.exchangeSession(sessionId);
      api.setSessionToken(session_token);
      await safeAsyncStorage.setItem('session_token', session_token);
      set({ user, sessionToken: session_token, isAuthenticated: true, isLoading: false });
      return user;
    } catch (error) {
      console.error('Login error:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    // Clear API session
    try {
      await api.logout();
    } catch (e) {
      // Ignore logout API errors
    }
    
    // Clear the session token from API client
    api.setSessionToken(null);
    
    // Clear ALL stored data
    await safeAsyncStorage.removeItem('session_token');
    await safeAsyncStorage.removeItem('pending_referral_code');
    
    // Reset all state - this triggers the redirect in (tabs)/_layout.tsx
    set({ user: null, sessionToken: null, isAuthenticated: false, isLoading: false });
  },

  checkAuth: async () => {
    try {
      const token = await safeAsyncStorage.getItem('session_token');
      
      if (!token) {
        set({ isLoading: false, isAuthenticated: false });
        return;
      }

      api.setSessionToken(token);
      
      try {
        const user = await api.getMe();
        set({ user, sessionToken: token, isAuthenticated: true, isLoading: false });
      } catch (apiError) {
        // API error - clear token and continue as unauthenticated
        console.warn('Auth check API error:', apiError);
        api.setSessionToken(null);
        await safeAsyncStorage.removeItem('session_token');
        set({ user: null, sessionToken: null, isAuthenticated: false, isLoading: false });
      }
    } catch (error) {
      // AsyncStorage error - continue as unauthenticated
      console.warn('Auth check error:', error);
      set({ user: null, sessionToken: null, isAuthenticated: false, isLoading: false });
    }
  },

  refreshUser: async () => {
    try {
      const user = await api.getMe();
      set({ user });
    } catch (error) {
      // Ignore refresh errors
    }
  },
}));
