'use client';
import { useRef } from 'react';

// 追加のプロパティだけ“交差型”で足す（拡張はしない）
type InputWithPicker = HTMLInputElement & { showPicker?: () => void };

export function DateTimePicker({
  dateStr, setDateStr,
  timeStr, setTimeStr,
  useNow, setUseNow,
  dateLabel, timeLabel,
}: {
  dateStr: string;
  setDateStr: (v: string) => void;
  timeStr: string;
  setTimeStr: (v: string) => void;
  useNow: boolean;
  setUseNow: (v: boolean) => void;
  dateLabel: string;
  timeLabel: string;
}) {
  const dateInputRef = useRef<HTMLInputElement>(null);
  const timeInputRef = useRef<HTMLInputElement>(null);

  const openPicker = (el: HTMLInputElement | null) => {
    const node = el as InputWithPicker | null;
    if (!node) return;

    if (typeof node.showPicker === 'function') {
      node.showPicker();
      return;
    }
    node.focus({ preventScroll: true });
    node.click();
  };

  const openDatePicker = () => openPicker(dateInputRef.current);
  const openTimePicker = () => openPicker(timeInputRef.current);

  return (
    <div className="flex items-center gap-2 text-sm">
      {/* 表示ボタン（高さ合わせ） */}
      <button
        type="button"
        onClick={openDatePicker}
        className="h-10 whitespace-nowrap rounded-lg border px-3 py-1.5"
        aria-label="日付を選択"
      >
        {dateLabel}
      </button>
      {/* 実体の date input（見えないがクリック可能） */}
      <input
        ref={dateInputRef}
        type="date"
        value={dateStr}
        onChange={(e) => setDateStr(e.target.value)}
        className="absolute h-0 w-0 -z-10 opacity-0"
        aria-hidden="true"
        tabIndex={-1}
      />

      <button
        type="button"
        onClick={openTimePicker}
        className="h-10 whitespace-nowrap rounded-lg border px-3 py-1.5"
        aria-label="時刻を選択"
      >
        {timeLabel}
      </button>
      {/* 実体の time input（見えないがクリック可能） */}
      <input
        ref={timeInputRef}
        type="time"
        value={useNow ? '' : timeStr}
        onChange={(e) => {
          const v = e.target.value;
          if (!v) { setUseNow(true); setTimeStr(''); }
          else { setUseNow(false); setTimeStr(v); }
        }}
        className="absolute h-0 w-0 -z-10 opacity-0"
        aria-hidden="true"
        tabIndex={-1}
      />
    </div>
  );
}
