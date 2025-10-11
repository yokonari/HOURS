// components/SearchForm.tsx
'use client';
import Image from 'next/image';
import React, { useRef } from 'react';

export function SearchForm({
  qInput,
  setQInput,
  loading,
  onReset,
  searchHistory,
  onHistorySelect,
  onClearHistory,
}: {
  qInput: string;
  setQInput: (v: string) => void;
  loading: boolean;
  onReset?: () => void;
  searchHistory?: string[];
  onHistorySelect?: (value: string) => void;
  onClearHistory?: () => void;
}) {
  const canClear = qInput.length > 0 && !loading;
  const inputRef = useRef<HTMLInputElement | null>(null);
  const historyContainerRef = useRef<HTMLDivElement | null>(null);

  const handleResetClick = () => {
    if (loading) return;
    onReset?.();
  };

  const handleClearPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!canClear) return;
    e.preventDefault();
    setQInput('');
    // クリア後もすぐ再入力できるようフォーカスを戻します。
    inputRef.current?.focus();
  };

  const handleClearKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (!canClear) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setQInput('');
      // キーボード操作でも同様にフォーカスを戻します。
      inputRef.current?.focus();
    }
  };

  const historyItems = searchHistory ?? [];

  const handleHistoryClick = (term: string) => {
    if (onHistorySelect) {
      onHistorySelect(term);
    } else {
      setQInput(term);
    }
  };

  const handleInputFocus = () => {};

  const handleInputBlur = (_event: React.FocusEvent<HTMLInputElement>) => {};

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex min-w-0 items-center gap-2">
        {/* 「HOURS」ロゴ画像のボタンで検索状態を丁寧にリセットし初期画面へ戻します。 */}
        <button
          type="button"
          onClick={handleResetClick}
          aria-label="初期状態に戻る"
          className="px-3 py-1 text-s font-semibold tracking-[0.16em] transition hover:opacity-70 disabled:cursor-not-allowed disabled:opacity-40"
          style={{ color: 'var(--primary)' }}
          disabled={loading}
        >
          {/* ロゴ画像でブランドを視覚的に示しつつボタン機能を維持します。 */}
          <Image
            src="/images/title.png"
            width={90}
            height={19}
            alt="HOURS のロゴ"
            priority={false}
          />
          {/* スクリーンリーダー向けにテキストも提供します。 */}
          <span className="sr-only">HOURS</span>
        </button>
        <div className="relative min-w-0 flex-1">
          <input
            ref={inputRef}
            type="search"
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            placeholder="施設を検索"
            aria-label="検索ワード"
            className="h-10 w-full rounded-full bg-transparent border border-gray-300 pl-10 pr-4 outline-none ring-0 transition hover:bg-white focus:bg-white focus:ring-2 focus:ring-gray-300 focus:border-transparent"
            enterKeyHint="search"
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setQInput('');
              }
            }}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            style={{ color: 'var(--on-surface)' }}
          />
          <span
            className="absolute inset-y-0 left-3 my-0 flex items-center text-gray-500"
            aria-hidden="true"
          >
            <span
              className="material-symbols-rounded text-[18px]"
              style={{ fontVariationSettings: `'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 24` }}
            >
              search
            </span>
          </span>
          <div className="absolute inset-y-0 right-2 my-1 flex items-center gap-1">
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
      {historyItems.length > 0 && (
        <div
          ref={historyContainerRef}
          className="flex items-center gap-2 overflow-x-auto whitespace-nowrap sm:flex-wrap sm:whitespace-normal"
        >
          {historyItems.map((term) => (
            <button
              key={term}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleHistoryClick(term)}
              className="rounded-full border border-gray-300 px-3 py-1 text-xs text-on-surface transition hover:bg-gray-50"
            >
              {term}
            </button>
          ))}
          {onClearHistory && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onClearHistory();
              }}
              className="text-[11px] text-gray-400 underline-offset-2 hover:underline"
            >
              履歴をクリア
            </button>
          )}
        </div>
      )}
    </div>
  );
}
