// components/SearchForm.tsx
'use client';
import React from 'react';

export function SearchForm({
  qInput,
  setQInput,
  loading,
  waitingGeo,
}: {
  qInput: string;
  setQInput: (v: string) => void;
  loading: boolean;
  waitingGeo: boolean;
}) {
  return (
    <div className="relative min-w-0">
      <input
        type="text"
        value={qInput}
        onChange={(e) => setQInput(e.target.value)}
        placeholder="例: カフェ 新宿"
        aria-label="検索ワード"
        className="h-10 w-full rounded-xl border border-gray-200 bg-white px-4 pr-12 shadow-sm outline-none ring-0 transition focus:border-gray-300 focus:ring-2 focus:ring-black/10"
      />
      <button
        type="submit"
        disabled={loading}
        aria-label="検索"
        className="absolute inset-y-0 right-1 my-1 inline-flex h-8 w-9 items-center justify-center rounded-lg px-0
                   disabled:cursor-not-allowed disabled:opacity-60 hover:bg-gray-50"
        title={loading ? '検索中…' : (waitingGeo ? '現在地取得中…' : '検索')}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
             fill="currentColor" className="h-5 w-5 text-gray-700">
          <path fillRule="evenodd"
            d="M10.5 3a7.5 7.5 0 0 1 5.916 12.17l3.707 3.707a1 1 0 0 1-1.414 1.414l-3.707-3.707A7.5 7.5 0 1 1 10.5 3Zm0 2a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11Z"
            clipRule="evenodd"/>
        </svg>
      </button>
    </div>
  );
}
