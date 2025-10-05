'use client';
import { useRef } from 'react';

export function DateTimePicker({
  dateStr, setDateStr,
  timeStr, setTimeStr,
  dateLabel, timeLabel,
}: {
  dateStr: string | undefined;
  setDateStr: (v: string) => void;
  timeStr: string | undefined;
  setTimeStr: (v: string) => void;
  dateLabel: string;
  timeLabel: string;
}) {
  const dateTimeInputRef = useRef<HTMLInputElement>(null);

  const handleDateTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (!value) {
      setDateStr('');
      setTimeStr('');
      return;
    }

    const [date, time] = value.split('T');
    setDateStr(date);

    if (time) {
      const [hh = '0', mm = '00'] = time.split(':');
      const padded = `${String(Number(hh)).padStart(2, '0')}:${String(Number(mm)).padStart(2, '0')}`;
      setTimeStr(padded);
    }
  };

  const openDateTimePicker = () => {
    const input = dateTimeInputRef.current;
    if (!input) return;

    const withPicker = input as HTMLInputElement & {
      showPicker?: () => void;
    };

    if (typeof withPicker.showPicker === 'function') {
      try {
        withPicker.showPicker();
        return;
      } catch (error) {
        if ((error as DOMException).name !== 'NotAllowedError') {
          throw error;
        }
      }
    }

    input.focus({ preventScroll: true });
    input.click();
  };

  const handleInputClick = () => {
    openDateTimePicker();
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openDateTimePicker();
    }
  };

  // 日付と時刻を組み合わせてdatetime-local用の値を作成
  const dateTimeValue = (() => {
    if (!dateStr) return '';

    if (timeStr) {
      const [hh = '0', mm = '00'] = timeStr.split(':');
      const padded = `${String(Number(hh)).padStart(2, '0')}:${String(Number(mm)).padStart(2, '0')}`;
      return `${dateStr}T${padded}`;
    }

    return `${dateStr}T00:00`;
  })();

  // プレースホルダーを組み合わせ
  const placeholder = (() => {
    if (timeLabel) return `${dateLabel} ${timeLabel}`;
    if (timeStr) {
      return `${dateLabel} ${timeStr}`;
    }
    return `${dateLabel} 今から`;
  })();

  return (
    <div className="h-full flex items-center">
      <div className="relative group h-10">
        <input
          ref={dateTimeInputRef}
          type="datetime-local"
          value={dateTimeValue}
          onChange={handleDateTimeChange}
          className="absolute inset-0 z-20 h-full w-full opacity-0"
          onClick={handleInputClick}
          onKeyDown={handleInputKeyDown}
          aria-label="日時を選択"
        />
        <div
          className="h-full whitespace-nowrap rounded-full bg-transparent border border-gray-300 px-4 text-sm transition pointer-events-none flex items-center group-hover:bg-white group-focus-within:bg-white group-focus-within:ring-2 group-focus-within:ring-gray-300 group-focus-within:border-transparent"
          style={{ color: 'var(--on-surface)' }}
          aria-hidden="true"
        >
          {placeholder}
        </div>
      </div>
    </div>
  );
}
