'use client';
import { useCallback, useEffect, useState } from 'react';

export function ScrollTopButton() {
  const handleClick = useCallback(() => {
    if (typeof window === 'undefined') return;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = () => {
      setVisible(window.scrollY > 0);
    };
    handler();
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={handleClick}
      className="fixed bottom-6 right-6 z-50 inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#4688A2] text-white shadow-lg transition hover:bg-[#3b6e85] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#4688A2] cursor-pointer"
      aria-label="ページ上部へ移動"
    >
      <span
        className="material-symbols-rounded text-2xl"
        style={{ fontVariationSettings: `'FILL' 1, 'wght' 500, 'GRAD' 0, 'opsz' 24` }}
        aria-hidden="true"
      >
        arrow_upward
      </span>
    </button>
  );
}
