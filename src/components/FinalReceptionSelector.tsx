'use client';
import { useState, useEffect, useRef } from 'react';

type FinalReceptionOption = 'none' | '30' | '60';

const options: { key: FinalReceptionOption; label: string }[] = [
  { key: 'none', label: '閉店時間を考慮しない' },
  { key: '30', label: '閉店30分前を除く' },
  { key: '60', label: '閉店60分前を除く' },
];

export function FinalReceptionSelector({
  value,
  onChange,
}: {
  value: FinalReceptionOption;
  onChange: (value: FinalReceptionOption) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const currentOption = options.find((opt) => opt.key === value);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 外側をクリックしたらメニューを閉じる、ドロップダウンの定番ロジックです。
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* ボタンを押すとメニューを開閉します。選択中のラベルをそのまま表示すると分かりやすいです。 */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-10 items-center gap-2 rounded-full border border-gray-300 bg-transparent px-3 text-sm transition hover:bg-white focus:bg-white focus:ring-2 focus:ring-gray-300"
        style={{ color: 'var(--on-surface)' }}
        aria-label={`閉店時間のフィルタ（現在: ${currentOption?.label ?? '未設定'}）`}
        aria-expanded={isOpen}
        title={`閉店時間のフィルタ: ${currentOption?.label ?? '未設定'}`}
      >
        <span className="text-sm">
          {currentOption?.label ?? '閉店時間を考慮しない'}
        </span>
        <span
          className="material-symbols-rounded leading-none"
          style={{
            fontVariationSettings: `'FILL' 0, 'wght' 500, 'GRAD' 0, 'opsz' 18`,
          }}
          aria-hidden="true"
        >
          {isOpen ? 'expand_less' : 'expand_more'}
        </span>
      </button>

      {isOpen && (
        /* 選択肢はボタンの真下にポップアップ表示します。position: absolute を使う典型的なパターンです。 */
        <div className="absolute top-full left-0 z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white text-sm shadow-lg">
          {options.map(({ key, label }) => {
            const active = value === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  onChange(key);
                  setIsOpen(false);
                }}
                className={[
                  'flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors',
                  active
                    ? 'bg-gray-100 text-on-surface'
                    : 'text-on-surface hover:bg-gray-50',
                ].join(' ')}
                title={label}
                aria-label={label}
              >
                <span>{label}</span>
                {active && (
                  <span
                    className="material-symbols-rounded leading-none text-[14px]"
                    style={{
                      fontVariationSettings: `'FILL' 1, 'wght' 600, 'GRAD' 0, 'opsz' 18`,
                    }}
                    aria-hidden="true"
                  >
                    check
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
