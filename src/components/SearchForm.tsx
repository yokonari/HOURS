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
  const canClear = qInput.length > 0 && !loading;

  return (
    <div className="relative min-w-0">
      <input
        type="text"
        value={qInput}
        onChange={(e) => setQInput(e.target.value)}
        placeholder="例: カフェ 新宿"
        aria-label="検索ワード"
        className="h-10 w-full rounded-full bg-gray-100 px-4 pr-24 outline-none ring-0 transition hover:bg-gray-200 focus:bg-white focus:ring-2 focus:ring-gray-300"
        style={{ color: 'var(--on-surface)' }}
      />
      <div className="absolute inset-y-0 right-1 my-1 flex items-center gap-1">
        <button
          type="submit"
          disabled={loading}
          aria-label="検索"
          className="inline-flex h-8 w-9 items-center justify-center rounded-lg disabled:cursor-not-allowed disabled:opacity-60 hover:bg-gray-50 cursor-pointer"
          title={loading ? '検索中…' : (waitingGeo ? '現在地取得中…' : '検索')}
        >
          <span
            className="material-symbols-rounded text-[20px] text-on-surface"
            style={{
              fontVariationSettings: `'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 24`,
            }}
            aria-hidden="true"
          >
            search
          </span>
        </button>
        <button
          type="button"
          onClick={() => setQInput('')}
          disabled={!canClear}
          aria-label="入力をクリア"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
          title="入力をクリア"
        >
          <span
            className="material-symbols-rounded text-[18px] text-on-surface"
            style={{
              fontVariationSettings: `'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 24`,
            }}
            aria-hidden="true"
          >
            close
          </span>
        </button>
      </div>
    </div>
  );
}
