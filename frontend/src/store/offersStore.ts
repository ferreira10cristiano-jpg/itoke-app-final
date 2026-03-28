import { create } from 'zustand';
import { api } from '../lib/api';
import { Offer } from '../types';

interface OffersState {
  offers: Offer[];
  isLoading: boolean;
  error: string | null;
  selectedCategory: string | null;
  userLocation: { lat: number; lon: number } | null;
  fetchOffers: () => Promise<void>;
  setCategory: (category: string | null) => void;
  setUserLocation: (location: { lat: number; lon: number } | null) => void;
}

export const useOffersStore = create<OffersState>((set, get) => ({
  offers: [],
  isLoading: false,
  error: null,
  selectedCategory: null,
  userLocation: null,

  fetchOffers: async () => {
    set({ isLoading: true, error: null });
    try {
      const { userLocation, selectedCategory } = get();
      const offers = await api.getOffers(
        userLocation?.lat,
        userLocation?.lon,
        selectedCategory || undefined
      );
      set({ offers, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  setCategory: (category) => {
    set({ selectedCategory: category });
    get().fetchOffers();
  },

  setUserLocation: (location) => {
    set({ userLocation: location });
  },
}));
