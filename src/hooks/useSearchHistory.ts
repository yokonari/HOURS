// hooks/useSearchHistory.ts
'use client';
import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'hours_search_history';
const MAX_ITEMS = 10;

function normalize(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter((item) => item.length > 0);
}

export function useSearchHistory() {
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (!stored) return;
      const parsed = JSON.parse(stored);
      const sanitized = normalize(parsed);
      if (sanitized.length > 0) {
        setHistory(sanitized.slice(0, MAX_ITEMS));
      }
    } catch (error) {
      console.warn('Failed to load search history', error);
    }
  }, []);

  const updateHistory = useCallback((updater: (prev: string[]) => string[]) => {
    setHistory((prev) => {
      const next = updater(prev);
      if (typeof window !== 'undefined') {
        if (next.length > 0) {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } else {
          window.localStorage.removeItem(STORAGE_KEY);
        }
      }
      return next;
    });
  }, []);

  const addHistory = useCallback((term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    updateHistory((prev) => {
      const existing = prev.filter((item) => item !== trimmed);
      return [trimmed, ...existing].slice(0, MAX_ITEMS);
    });
  }, [updateHistory]);

  const removeHistory = useCallback((term: string) => {
    updateHistory((prev) => prev.filter((item) => item !== term));
  }, [updateHistory]);

  const clearHistory = useCallback(() => {
    updateHistory(() => []);
  }, [updateHistory]);

  return {
    history,
    addHistory,
    removeHistory,
    clearHistory,
  };
}
