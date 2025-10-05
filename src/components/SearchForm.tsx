// components/SearchForm.tsx
'use client';
import React from 'react';

export function SearchForm({
  qInput,
  setQInput,
  loading,
  waitingGeo,
  onReset,
}: {
  qInput: string;
  setQInput: (v: string) => void;
  loading: boolean;
  waitingGeo: boolean;
  onReset?: () => void;
}) {
  const canClear = qInput.length > 0 && !loading;

  const handleResetClick = () => {
    if (loading) return;
    onReset?.();
  };

  const handleClearPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!canClear) return;
    e.preventDefault();
    setQInput('');
  };

  const handleClearKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (!canClear) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setQInput('');
    }
  };

  return (
    <div className="flex min-w-0 items-center gap-2">
      {/* ホームアイコンを押すと検索状態を丁寧にリセットし初期画面へ戻します。 */}
      <button
        type="button"
        onClick={handleResetClick}
        aria-label="初期状態に戻る"
        className="flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
        disabled={loading}
      >
        <span
          className="material-symbols-rounded text-[22px] text-on-surface"
          style={{ fontVariationSettings: `'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 24` }}
          aria-hidden="true"
        >
          home
        </span>
      </button>
      <div className="relative min-w-0 flex-1">
        <input
          type="search"
          value={qInput}
          onChange={(e) => setQInput(e.target.value)}
          placeholder="カフェ 新宿"
          aria-label="検索ワード"
          className="h-10 w-full rounded-full bg-transparent border border-gray-300 pl-10 pr-24 outline-none ring-0 transition hover:bg-white focus:bg-white focus:ring-2 focus:ring-gray-300 focus:border-transparent"
          enterKeyHint="search"
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setQInput('');
            }
          }}
          style={{ color: 'var(--on-surface)' }}
        />
        <span
          className="absolute inset-y-0 left-3 my-0 flex items-center text-gray-400"
          aria-hidden="true"
        >
          <span
            className="material-symbols-rounded text-[18px]"
            style={{ fontVariationSettings: `'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 24` }}
          >
            search
          </span>
        </span>
        <div className="absolute inset-y-0 right-1 my-1 flex items-center gap-1">
          <button
            type="button"
            onPointerDown={handleClearPointerDown}
            onKeyDown={handleClearKeyDown}
            disabled={!canClear}
            aria-label="入力をクリア"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
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
    </div>
  );
}
