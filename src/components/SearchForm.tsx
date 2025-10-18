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
  // 入力欄が空でなくローディング中でなければ「クリア」ボタンを使えるようにします。
  const canClear = qInput.length > 0 && !loading;
  const inputRef = useRef<HTMLInputElement | null>(null);
  const suggestionsRef = useRef<HTMLDivElement | null>(null);
  const keywordDropdownRef = useRef<HTMLDivElement | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  // 最後に選択したキーワードを保持しボタン表示へ反映します。
  const [selectedKeyword, setSelectedKeyword] = useState('');
  // 履歴用に既存の表示フラグを分かりやすい名前へ割り当てます。
  const showHistory = showSuggestions;
  // モバイルでのタップ操作が入力欄のフォーカスアウトを引き起こしてもサジェストを閉じないよう管理します。
  const pointerDownInsideRef = useRef(false);
  const isOpen = forceOpen || showSuggestions;
  // キーワード候補は配列でまとめておくと、表示も処理も楽に管理できます。
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
    // フォーム全体を初期状態に戻し、外部から渡されたリセット処理も呼び出します。
    setShowSuggestions(false);
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
    // 履歴から選択した語句は入力欄へ復元し、必要なら外部ハンドラに通知します。
    if (onHistorySelect) {
      onHistorySelect(term);
    } else {
      setQInput(term);
    }
    if (!forceOpen) {
      setShowSuggestions(false);
    }
  };

  const handleKeywordClick = (keyword: string) => {
    // ドロップダウンで選んだキーワードも入力欄に反映し、サジェストを閉じます。
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
  };

  const handleInputFocus = () => {
    // フォーカス時にサジェストを開き、親コンポーネントへ通知します。
    setShowSuggestions(true);
    onOpen?.();
  };

  const handleInputBlur = (_event: React.FocusEvent<HTMLInputElement>) => {
    // フォーカスが完全に外れたタイミングで履歴表示を閉じます。
    if (pointerDownInsideRef.current) {
      return;
    }
    requestAnimationFrame(() => {
      const active = document.activeElement;
      if (!active) {
        if (!forceOpen) {
          setShowSuggestions(false);
          onClose?.();
        }
        return;
      }
      if (active === inputRef.current) return;
      if (suggestionsRef.current?.contains(active)) return;
      if (!forceOpen) {
        setShowSuggestions(false);
        onClose?.();
      }
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
    const shouldListen = showSuggestions || forceOpen;
    if (!shouldListen) return;
    // ヘッダー外をクリックした場合に履歴とキーワード一覧を閉じます。
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        inputRef.current?.contains(target) ||
        suggestionsRef.current?.contains(target) ||
        keywordDropdownRef.current?.contains(target)
      ) {
        return;
      }
      setShowSuggestions(false);
      onClose?.();
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSuggestions, forceOpen, onClose]);

  return (
    <div
      className="relative min-w-0"
      onPointerDownCapture={(event) => {
        const target = event.target as Node;
        if (
          suggestionsRef.current?.contains(target) ||
          keywordDropdownRef.current?.contains(target) ||
          inputRef.current?.contains(target as Node)
        ) {
          pointerDownInsideRef.current = true;
          requestAnimationFrame(() => {
            pointerDownInsideRef.current = false;
          });
        }
      }}
    >
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
        {/* 常に2行分の高さを確保してヘッダーが変形しないようにします。 */}
        <div aria-hidden="true" className="h-6" />
      </div>
      </div>
      {isOpen && (
        <div
          ref={suggestionsRef}
          className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-[1000] text-xs text-gray-600"
        >
          <div
            className="max-h-96 overflow-y-auto rounded-lg border border-gray-200 bg-white py-2 shadow-lg"
            role="listbox"
            aria-label="検索サジェスト"
          >
            {showHistory && historyItems.length > 0 && (
              <div className="pb-2">
                <p className="px-4 pb-2 text-[11px] font-semibold text-gray-400">履歴</p>
                {historyItems.map((term) => (
                  <button
                    key={term}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleHistoryClick(term)}
                    className="block w-full px-4 py-2 text-left text-on-surface transition hover:bg-gray-50"
                    role="option"
                    aria-label={term}
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
                    className="block w-full px-4 py-2 text-left text-[11px] text-gray-400 hover:text-gray-500"
                  >
                    履歴をクリア
                  </button>
                )}
              </div>
            )}

            <div
              ref={keywordDropdownRef}
              className={[
                showHistory && historyItems.length > 0 ? 'mt-2 border-t border-gray-100 pt-2' : 'pt-0',
              ].join(' ')}
            >
              <p className="px-4 pb-2 text-[11px] font-semibold text-gray-400">対応キーワード</p>
              {keywordOptions.map((keyword) => {
                const active = selectedKeyword === keyword;
                return (
                  <button
                    key={keyword}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleKeywordClick(keyword)}
                    className={[
                      'block w-full px-4 py-2 text-left transition-colors',
                      active
                        ? 'bg-gray-100 text-on-surface'
                        : 'text-on-surface hover:bg-gray-50',
                    ].join(' ')}
                    title={keyword}
                    aria-label={keyword}
                    role="option"
                    aria-selected={active}
                  >
                    <span>{keyword}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
