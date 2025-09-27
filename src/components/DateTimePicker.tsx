'use client';
import { useRef, useEffect } from 'react';
import flatpickr from 'flatpickr';
import { Japanese } from 'flatpickr/dist/l10n/ja.js';
import 'flatpickr/dist/flatpickr.min.css';

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
  const inputRef = useRef<HTMLInputElement>(null);
  const pickerRef = useRef<flatpickr.Instance | null>(null);

  const getCurrentDate = () => {
    if (useNow) return new Date();
    if (!dateStr) return null;
    const datePart = dateStr;
    const timePart = timeStr || '00:00';
    const value = new Date(`${datePart}T${timePart}`);
    return Number.isNaN(value.getTime()) ? null : value;
  };

  useEffect(() => {
    if (!inputRef.current) return;
    if (pickerRef.current) return;

    pickerRef.current = flatpickr(inputRef.current, {
      enableTime: true,
      dateFormat: 'Y-m-d H:i',
      locale: Japanese,
      minuteIncrement: 5,
      defaultDate: getCurrentDate() ?? new Date(),
      onChange: (selectedDates) => {
        if (selectedDates.length === 0) return;
        const selected = selectedDates[0];
        const y = selected.getFullYear();
        const m = String(selected.getMonth() + 1).padStart(2, '0');
        const d = String(selected.getDate()).padStart(2, '0');
        const hh = String(selected.getHours()).padStart(2, '0');
        const mm = String(selected.getMinutes()).padStart(2, '0');
        setDateStr(`${y}-${m}-${d}`);
        setTimeStr(`${hh}:${mm}`);
        setUseNow(false);
      },
    });

    return () => {
      if (pickerRef.current) {
        pickerRef.current.destroy();
        pickerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!pickerRef.current) return;
    const current = getCurrentDate();
    if (!current) return;
    const selected = pickerRef.current.selectedDates[0];
    if (!selected || selected.getTime() !== current.getTime()) {
      pickerRef.current.setDate(current, false);
    }
  }, [dateStr, timeStr, useNow]);

  const openPicker = () => {
    pickerRef.current?.open();
  };

  return (
    <div className="inline-flex items-center gap-1 rounded-full bg-gray-100 p-1" role="group">
      <div className="relative">
        <button
          type="button"
          onClick={openPicker}
          className="flex items-center gap-2 h-10 whitespace-nowrap rounded-full bg-transparent px-4 py-2 hover:bg-gray-200 focus:bg-white focus:ring-2 focus:ring-gray-300 transition"
          style={{ color: 'var(--on-surface)' }}
          aria-label="日時を選択"
        >
          <span>{dateLabel}</span>
          <span className="text-on-surface-muted">/</span>
          <span>{timeLabel}</span>
        </button>
        <input
          ref={inputRef}
          type="text"
          className="absolute top-0 left-0 h-full w-full opacity-0 cursor-pointer pointer-events-auto z-10"
          tabIndex={-1}
          aria-hidden
        />
      </div>
    </div>
  );
}
