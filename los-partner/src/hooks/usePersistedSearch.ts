import { useState, useEffect } from 'react';

/**
 * Custom hook to persist any value in sessionStorage
 * @param storageKey - Unique key for sessionStorage
 * @param defaultValue - Default value (string, array, object, etc.)
 * @returns Object with searchTerm, setSearchTerm, and clearSearch
 */
export function usePersistedSearch<T = string>(storageKey: string, defaultValue: T = '' as T) {
  const getInitialValue = (): T => {
    if (!storageKey) return defaultValue;
    
    try {
      const stored = sessionStorage.getItem(storageKey);
      if (stored === null) return defaultValue;
      
      if (typeof defaultValue === 'string') {
        return stored as T;
      }
  
      if (defaultValue === null) {
        try {
          return JSON.parse(stored) as T;
        } catch {
          return stored as T;
        }
      }
      return JSON.parse(stored) as T;
    } catch (error) {
      console.error('Error reading from sessionStorage:', error);
      return defaultValue;
    }
  };

  const [searchTerm, setSearchTermInternal] = useState<T>(getInitialValue());

  useEffect(() => {
    if (!storageKey) return;

    try {
      const isEmpty = 
        searchTerm === undefined ||
        searchTerm === '' ||
        (Array.isArray(searchTerm) && searchTerm.length === 0) ||
        (typeof searchTerm === 'object' && 
         searchTerm !== null &&
         !Array.isArray(searchTerm) && 
         Object.values(searchTerm as object).every(v => !v));

      if (isEmpty) {
        sessionStorage.removeItem(storageKey);
      } else {
        const valueToStore = typeof searchTerm === 'string' 
          ? searchTerm 
          : JSON.stringify(searchTerm);
        sessionStorage.setItem(storageKey, valueToStore);
      }
    } catch (error) {
      console.error('Error saving to sessionStorage:', error);
    }
  }, [searchTerm, storageKey]);

  const setSearchTerm = (value: T | ((prev: T) => T)) => {
    setSearchTermInternal(value);
  };

  const clearSearch = () => {
    setSearchTermInternal(defaultValue);
  };

  return { searchTerm, setSearchTerm, clearSearch };
}
