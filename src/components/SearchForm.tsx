// components/SearchForm.tsx
'use client';
import Image from 'next/image';
import React, { useEffect, useRef, useState } from 'react';

export function SearchForm({
  qInput,
  setQInput,
  loading,
  onReset,
  searchHistory,
  onHistorySelect,
  onClearHistory,
  forceOpen = false,
  onOpen = () => {},
  onClose = () => {},
  onKeywordSelect,
}: {
  qInput: string;
  setQInput: (v: string) => void;
  loading: boolean;
  onReset?: () => void;
  searchHistory?: string[];
  onHistorySelect?: (value: string) => void;
  onClearHistory?: () => void;
  forceOpen?: boolean;
  onOpen?: () => void;
  onClose?: () => void;
  onKeywordSelect?: (keyword: string) => void;
}) {
  const canClear = qInput.length > 0 && !loading;
  const inputRef = useRef<HTMLInputElement | null>(null);
  const suggestionsRef = useRef<HTMLDivElement | null>(null);
  const keywordDropdownRef = useRef<HTMLDivElement | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isKeywordDropdownOpen, setIsKeywordDropdownOpen] = useState(false);
  // 最後に選択したキーワードを保持しボタン表示へ反映します。
  const [selectedKeyword, setSelectedKeyword] = useState('');
  const isOpen = forceOpen || showSuggestions;
  const keywordOptions = [
    'カフェ', '喫茶', 'コーヒー',
    'バー',
    '本屋', '本', '書店',
    'ケーキ',
    'カレー',
    'ドーナツ',
    'ファミレス',
    'ハンバーガー',
    'ドラッグストア', '薬',
    'オムライス',
    'パン',
    'ラーメン',
    '居酒屋',
    'シーシャ',
    '蕎麦', 'そば',
    'スーパー',
    'たこ焼き',
    '回転寿司', '寿司',
    'たい焼き',
    'イタリアン', 'ピザ', 'パスタ',
    '牛丼',
    'コンビニ',
    'うどん',
    'アフタヌーンティー', '紅茶',
    '中華',
    'クレープ',
  ];

  const handleResetClick = () => {
    if (loading) return;
    setShowSuggestions(false);
    setIsKeywordDropdownOpen(false);
    setSelectedKeyword('');
    onClose?.();
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
    if (!forceOpen) {
      setShowSuggestions(false);
    }
    setIsKeywordDropdownOpen(false);
  };

  const handleKeywordClick = (keyword: string) => {
    setSelectedKeyword(keyword);
    if (onKeywordSelect) {
      onKeywordSelect(keyword);
    } else if (onHistorySelect) {
      onHistorySelect(keyword);
    } else {
      setQInput(keyword);
    }
    if (!forceOpen) {
      setShowSuggestions(false);
    }
    setIsKeywordDropdownOpen(false);
  };

  const handleInputFocus = () => {
    setShowSuggestions(true);
    onOpen?.();
  };

  const handleInputBlur = (_event: React.FocusEvent<HTMLInputElement>) => {
    // フォーカスが完全に外れたタイミングで履歴表示を閉じます。
    requestAnimationFrame(() => {
      const active = document.activeElement;
      if (!active) {
        if (!forceOpen) {
          setShowSuggestions(false);
          onClose?.();
        }
        setIsKeywordDropdownOpen(false);
        return;
      }
      if (active === inputRef.current) return;
      if (suggestionsRef.current?.contains(active)) return;
      if (!forceOpen) {
        setShowSuggestions(false);
        onClose?.();
      }
      setIsKeywordDropdownOpen(false);
    });
  };

  useEffect(() => {
    if (loading) {
      // 検索実行開始時に履歴を閉じます。
      if (!forceOpen) {
        setShowSuggestions(false);
      }
    }
  }, [loading, forceOpen]);

  useEffect(() => {
    if (forceOpen) {
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  }, [forceOpen]);

  useEffect(() => {
    if (!isKeywordDropdownOpen) return;
    // キーワードドロップダウンの外側クリックで閉じる処理です。
    const handleClickOutside = (event: MouseEvent) => {
      if (keywordDropdownRef.current && !keywordDropdownRef.current.contains(event.target as Node)) {
        setIsKeywordDropdownOpen(false);
        if (!forceOpen) {
          setShowSuggestions(false);
          onClose?.();
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isKeywordDropdownOpen, forceOpen, onClose]);

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
      {isOpen && (
        <div ref={suggestionsRef} className="space-y-2 text-xs text-gray-600">
          {historyItems.length > 0 && (
            <div className="flex items-center gap-1 overflow-x-auto whitespace-nowrap sm:flex-wrap sm:whitespace-normal">
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

          <div className="mt-2 text-xs text-gray-600">
            <div className="relative inline-block" ref={keywordDropdownRef}>
              {/* FinalReceptionSelector と揃えた外観のドロップダウンで検索キーワードを選べます。 */}
              <button
                type="button"
                onClick={() => {
                  setIsKeywordDropdownOpen((prev) => {
                    const next = !prev;
                    if (next) {
                      setShowSuggestions(true);
                      onOpen?.();
                    } else if (!forceOpen) {
                      setShowSuggestions(false);
                      onClose?.();
                    }
                    return next;
                  });
                }}
                className="inline-flex min-w-[12rem] items-center justify-between rounded-full border border-gray-300 bg-transparent px-3 transition hover:bg-white focus:bg-white focus:ring-2 focus:ring-gray-300"
                style={{ color: 'var(--on-surface)' }}
                aria-expanded={isKeywordDropdownOpen}
                aria-label={`対応キーワードの選択（現在: ${selectedKeyword || '未選択' }）`}
                title={`対応キーワード: ${selectedKeyword || '未選択'}`}
              >
                <span>
                  {selectedKeyword || '対応キーワード'}
                </span>
                <span
                  className="material-symbols-rounded text-[16px] leading-none"
                  style={{ fontVariationSettings: `'FILL' 0, 'wght' 500, 'GRAD' 0, 'opsz' 18` }}
                  aria-hidden="true"
                >
                  {isKeywordDropdownOpen ? 'expand_less' : 'expand_more'}
                </span>
              </button>
              {isKeywordDropdownOpen && (
                <div className="absolute top-full left-0 z-50 mt-1 w-fit min-w-[12rem] rounded-lg border border-gray-200 bg-white shadow-lg max-h-80 overflow-y-auto">
                  {keywordOptions.map((keyword) => {
                    const active = selectedKeyword === keyword;
                    return (
                      <button
                        key={keyword}
                        type="button"
                        onClick={() => {
                          handleKeywordClick(keyword);
                        }}
                        className={[
                          'w-full px-3 py-2 text-left transition-colors',
                          active
                            ? 'bg-gray-100 text-on-surface'
                            : 'text-on-surface hover:bg-gray-50',
                        ].join(' ')}
                        title={keyword}
                        aria-label={keyword}
                      >
                        <span>{keyword}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
