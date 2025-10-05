'use client';
import { useState, useEffect, useRef } from 'react';

type FinalReceptionOption = 'none' | '30min' | '60min';

const options: { key: FinalReceptionOption; label: string }[] = [
    { key: 'none', label: '閉店時間を考慮しない' },
    { key: '30min', label: '閉店30分前を除く' },
    { key: '60min', label: '閉店60分前を除く' },
];

export function FinalReceptionSelector({
    value,
    onChange,
}: {
    value: FinalReceptionOption;
    onChange: (value: FinalReceptionOption) => void;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const currentOption = options.find(opt => opt.key === value);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // 外側クリックでドロップダウンを閉じる
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
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 h-10 px-3 rounded-full bg-transparent border border-gray-300 hover:bg-white focus:bg-white focus:ring-2 focus:ring-gray-300 transition text-xs"
                style={{ color: 'var(--on-surface)' }}
                aria-label={`閉店時間のフィルタ（現在: ${currentOption?.label ?? '未設定'}）`}
                aria-expanded={isOpen}
                title={`閉店時間のフィルタ: ${currentOption?.label ?? '未設定'}`}
            >
                <span className="text-xs">
                    {currentOption?.label ?? '閉店時間を考慮しない'}
                </span>
                <span
                    className="material-symbols-rounded text-[14px] leading-none"
                    style={{
                        fontVariationSettings: `'FILL' 0, 'wght' 500, 'GRAD' 0, 'opsz' 18`,
                    }}
                    aria-hidden="true"
                >
                    {isOpen ? 'expand_less' : 'expand_more'}
                </span>
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-50">
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
                                    'w-full flex items-center justify-between px-3 py-2 text-left text-xs transition-colors',
                                    active
                                        ? 'bg-gray-100 text-on-surface'
                                        : 'text-on-surface hover:bg-gray-50'
                                ].join(' ')}
                                title={label}
                                aria-label={label}
                            >
                                <span>{label}</span>
                                {active && (
                                    <span
                                        className="material-symbols-rounded text-[14px] leading-none"
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
