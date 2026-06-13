'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import toast from 'react-hot-toast';

interface FavoriteItem {
  id: string;
  title: string;
  subtitle: string;
  type: 'generation' | 'file' | 'reference';
  date: string;
}

interface FavoritesContextType {
  favorites: FavoriteItem[];
  isFavorite: (id: string) => boolean;
  toggleFavorite: (item: FavoriteItem) => void;
  addFavorite: (item: FavoriteItem) => void;
  removeFavorite: (id: string) => void;
  count: number;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

const STORAGE_KEY = 'pedagogen_favorites';

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setFavorites(JSON.parse(stored));
    } catch { /* empty */ }
  }, []);

  const persist = useCallback((items: FavoriteItem[]) => {
    setFavorites(items);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch { /* empty */ }
  }, []);

  const isFavorite = useCallback((id: string) => favorites.some(f => f.id === id), [favorites]);

  const addFavorite = useCallback((item: FavoriteItem) => {
    persist([item, ...favorites]);
    toast.success('Ajouté aux favoris');
  }, [favorites, persist]);

  const removeFavorite = useCallback((id: string) => {
    persist(favorites.filter(f => f.id !== id));
    toast.success('Retiré des favoris');
  }, [favorites, persist]);

  const toggleFavorite = useCallback((item: FavoriteItem) => {
    if (isFavorite(item.id)) {
      removeFavorite(item.id);
    } else {
      addFavorite(item);
    }
  }, [isFavorite, removeFavorite, addFavorite]);

  return (
    <FavoritesContext.Provider value={{
      favorites, isFavorite, toggleFavorite, addFavorite, removeFavorite,
      count: favorites.length,
    }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used within FavoritesProvider');
  return ctx;
}
