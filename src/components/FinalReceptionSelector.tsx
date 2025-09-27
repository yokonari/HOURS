'use client';
import { useState, useEffect, useRef } from 'react';

type FinalReceptionOption = 'none' | '30min' | '60min';

const options: { key: FinalReceptionOption; label: string }[] = [
    { key: 'none', label: 'しない' },
    { key: '30min', label: '30分' },
    { key: '60min', label: '60分' },
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
                className="flex items-center gap-2 h-10 px-3 rounded-full bg-gray-100 hover:bg-gray-200 focus:bg-white focus:ring-2 focus:ring-gray-300 transition cursor-pointer"
                style={{ color: 'var(--on-surface)' }}
                aria-label={`最終受付を考慮（現在: ${currentOption?.label}）`}
                aria-expanded={isOpen}
                title={`最終受付を考慮: ${currentOption?.label}`}
            >
                <span className="text-sm">
                    {currentOption?.key === 'none' ? '最終受付を考慮しない' : `最終受付を考慮(${currentOption?.label})`}
                </span>
                <span
                    className="material-symbols-rounded text-[16px] leading-none"
                    style={{
                        fontVariationSettings: `'FILL' 0, 'wght' 500, 'GRAD' 0, 'opsz' 20`,
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
                                    'w-full flex items-center justify-between px-3 py-2 text-left text-sm transition-colors cursor-pointer',
                                    active
                                        ? 'bg-gray-100 text-on-surface'
                                        : 'text-on-surface hover:bg-gray-50'
                                ].join(' ')}
                                title={label}
                                aria-label={label}
                            >
                                <span>
                                    {key === 'none'
                                        ? '最終受付を考慮しない'
                                        : `最終受付を考慮(${label})`}
                                </span>
                                {active && (
                                    <span
                                        className="material-symbols-rounded text-[16px] leading-none"
                                        style={{
                                            fontVariationSettings: `'FILL' 1, 'wght' 600, 'GRAD' 0, 'opsz' 20`,
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
