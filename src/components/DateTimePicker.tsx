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
    dateTimeInputRef.current?.showPicker();
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
      <div className="relative">
        <button
          type="button"
          onClick={openDateTimePicker}
          className="h-10 whitespace-nowrap rounded-full bg-transparent border border-gray-300 px-4 hover:bg-white focus:bg-white focus:ring-2 focus:ring-gray-300 transition relative z-20 flex items-center cursor-pointer"
          style={{ color: 'var(--on-surface)' }}
          aria-label="日時を選択"
        >
          {placeholder}
        </button>
        <input
          ref={dateTimeInputRef}
          type="datetime-local"
          value={dateTimeValue}
          onChange={handleDateTimeChange}
          className="absolute top-0 left-0 h-full w-full opacity-0 cursor-pointer pointer-events-none z-10"
          tabIndex={-1}
          aria-hidden
        />
      </div>
    </div>
  );
}
