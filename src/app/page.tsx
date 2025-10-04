'use client';
import { useEffect, useRef, useState } from 'react';
import { SearchForm } from '@/components/SearchForm';
import { DateTimePicker } from '@/components/DateTimePicker';
import { FinalReceptionSelector } from '@/components/FinalReceptionSelector';
import { PlaceList } from '@/components/PlaceList';
import { ContactDialog } from '@/components/ContactDialog';
import { ScrollTopButton } from '@/components/ScrollTopButton';
import { usePlaces } from '@/hooks/usePlaces';

export default function HomePage() {
  const {
    // 入力/検索
    qInput, setQInput, submitSearch,
    loading, error, hasSearched,
    // 結果
    results,
    // 日付/時刻
    dateStr, setDateStr, timeStr, setTimeStr, dateLabel, timeLabel,
    // 位置/並び順
    lat, lng, hasLatLng,
    // 最終受付考慮
    finalReception, setFinalReception,
    loaderRef,
  } = usePlaces();

  const waitingGeo = !hasLatLng;
  const headerRef = useRef<HTMLDivElement | null>(null);
  const [headerOffset, setHeaderOffset] = useState(120);
  const [contactOpen, setContactOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const GAP_PX = 8;
    const updateOffset = () => {
      const height = headerRef.current?.offsetHeight ?? 0;
      setHeaderOffset(height + GAP_PX);
    };

    updateOffset();

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && headerRef.current) {
      observer = new ResizeObserver(updateOffset);
      observer.observe(headerRef.current);
    }

    window.addEventListener('resize', updateOffset);

    return () => {
      window.removeEventListener('resize', updateOffset);
      observer?.disconnect();
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      {/* 固定検索フォーム */}
      <div
        ref={headerRef}
        className="fixed top-0 left-0 right-0 z-50 bg-[var(--background)] shadow-sm"
      >
        <div className="mx-auto max-w-[600px] px-4 py-2 sm:px-6 sm:py-3 lg:px-8 lg:py-4">
          <form onSubmit={submitSearch} className="space-y-2 sm:space-y-3">
            {/* 1行目: 検索フォーム */}
            <SearchForm
              qInput={qInput}
              setQInput={setQInput}
              loading={loading}
              waitingGeo={!hasLatLng}
            />

            {/* 2行目: 日時選択と最終受付 */}
            <div className="flex items-center gap-3 h-10 sm:gap-4">
              <DateTimePicker
                dateStr={dateStr}
                setDateStr={setDateStr}
                timeStr={timeStr}
                setTimeStr={setTimeStr}
                dateLabel={dateLabel}
                timeLabel={timeLabel}
              />
              <div className="h-full flex items-center">
                <FinalReceptionSelector value={finalReception} onChange={setFinalReception} />
              </div>
            </div>

            <p className="text-xs text-on-surface sm:text-sm">
              営業時間からお店や施設を検索できます。
            </p>
          </form>

        </div>
      </div>

      {/* 固定ヘッダーの高さ分を確保するための余白です */}
      <div
        aria-hidden="true"
        style={{
          height: headerOffset,
          transition: 'height 0.2s ease',
        }}
      />

      {/* メインコンテンツエリア */}
      <main
        className="flex-1 mx-auto max-w-5xl px-4 pb-2 sm:px-6 sm:pb-3 lg:max-w-6xl lg:px-10 lg:pb-6"
      >

        {error && (
          <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">{error}</div>
        )}

        {!hasSearched && results.length === 0 && !loading && !error && (
          <div className="mt-4 text-center text-gray-500">キーワードを入力して検索してください。</div>
        )}

        <PlaceList
          results={results}
          dateStr={dateStr}
          timeStr={timeStr}
          loaderRef={loaderRef}
        />

        {/* 絞り込み結果0件メッセージ */}
        {hasSearched && !loading && !error && results.length === 0 && (
          <div className="mt-4 text-center text-gray-500">
            該当する場所が見つかりませんでした。
          </div>
        )}

        {loading && (<div className="mt-4 text-center text-gray-500">読み込み中…</div>)}
      </main>

      <footer className="w-full mt-4 text-xs text-on-surface-light sm:mt-6 sm:text-sm">
        <div className="border-t border-black/10">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-3 px-4 py-3 text-on-surface sm:max-w-6xl sm:px-6">
            <button
              type="button"
              onClick={() => setContactOpen(true)}
              className="flex items-center gap-1 transition hover:opacity-80"
            >
              <span
                className="material-symbols-rounded text-base"
                style={{ fontVariationSettings: `'FILL' 0, 'wght' 500, 'GRAD' 0, 'opsz' 24` }}
                aria-hidden="true"
              >
                mail
              </span>
              <span>お問い合わせ</span>
            </button>
            <span className="flex items-center gap-2">
              制作:{' '}
              <a
                href="https://x.com/yoko_nari_"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 transition hover:opacity-80"
              >
                <span>@yoko_nari_</span>
              </a>
            </span>
          </div>
        </div>
      </footer>

      <ContactDialog open={contactOpen} onClose={() => setContactOpen(false)} />
      <ScrollTopButton />
    </div>
  );
}
