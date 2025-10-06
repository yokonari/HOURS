'use client';
import Image from 'next/image';
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
    qInput, setQInput, submitSearch, resetSearch,
    searchHistory, searchFromHistory, clearSearchHistory,
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
    hasMore,
  } = usePlaces();

  const waitingGeo = !hasLatLng;

  // ── ヘッダー＆フッターの実測高さ ───────────────────────────
  const headerRef = useRef<HTMLDivElement | null>(null);
  const footerRef = useRef<HTMLElement | null>(null);
  const [headerOffset, setHeaderOffset] = useState(120);
  const [footerOffset, setFooterOffset] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const GAP_PX = 8;

    const updateOffsets = () => {
      const h = headerRef.current?.offsetHeight ?? 0;
      const f = footerRef.current?.offsetHeight ?? 0; // border含む実測
      setHeaderOffset(h + GAP_PX);
      setFooterOffset(f);
    };

    updateOffsets();

    let roHeader: ResizeObserver | null = null;
    let roFooter: ResizeObserver | null = null;

    if (typeof ResizeObserver !== 'undefined') {
      if (headerRef.current) {
        roHeader = new ResizeObserver(updateOffsets);
        roHeader.observe(headerRef.current);
      }
      if (footerRef.current) {
        roFooter = new ResizeObserver(updateOffsets);
        roFooter.observe(footerRef.current);
      }
    }

    window.addEventListener('resize', updateOffsets);
    return () => {
      window.removeEventListener('resize', updateOffsets);
      roHeader?.disconnect();
      roFooter?.disconnect();
    };
  }, []);
  // ───────────────────────────────────────────────────────────────

  // 空状態の高さ：100dvh からヘッダー＆フッターを厳密に差し引く
  const emptyStateHeight = `calc(100dvh - ${headerOffset}px - ${footerOffset}px)`;
  const isEmpty = !hasSearched && results.length === 0 && !loading && !error;
  const footerClassName = [
    'w-full bg-[var(--background)] text-xs text-on-surface-light sm:text-sm',
    isEmpty ? 'fixed bottom-0 left-0 right-0 z-40 mt-0' : 'relative mt-4 sm:mt-6'
  ].join(' ');
  const [contactOpen, setContactOpen] = useState(false);

  return (
    <div className="min-h-[100dvh] flex flex-col">
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
              waitingGeo={waitingGeo}
              onReset={resetSearch}
              searchHistory={searchHistory}
              onHistorySelect={searchFromHistory}
              onClearHistory={clearSearchHistory}
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
          </form>
        </div>
      </div>

      {/* 固定ヘッダーの高さ分のダミー */}
      <div
        aria-hidden="true"
        style={{ height: headerOffset, transition: 'height 0.2s ease' }}
      />

      {/* メインコンテンツエリア */}
      <main className="flex-1 mx-auto max-w-5xl px-4 sm:px-6 lg:max-w-6xl lg:px-10">
        {error && (
          <div
            role="alert"
            className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700"
          >
            {error}
          </div>
        )}

        {/* 初期（空）状態：上下中央に配置。高さはちょうど残り分 */}
        {isEmpty && (
          <div
            className="flex items-center justify-center"
            style={{ height: emptyStateHeight }}
          >
            <div className="flex flex-col items-center gap-5 text-center" style={{ color: 'var(--foreground)' }}>
              <Image
                src="/images/top.png"
                width={144}
                height={144}
                priority
                alt="検索開始を案内するイラスト"
                className="h-24 w-24 sm:h-32 sm:w-32 lg:h-40 lg:w-40"
                sizes="(min-width: 1024px) 10rem, (min-width: 640px) 8rem, 6rem"
              />
              <div className="space-y-3 text-sm sm:text-base lg:text-lg">
                <p>指定した日時に営業している施設を検索できます。</p>
                <p className="mt-1 text-xs text-gray-500 sm:text-sm">
                  ※実際の受付時間は施設の公式情報をご確認ください。
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 結果一覧 */}
        <PlaceList
          results={results}
          dateStr={dateStr}
          timeStr={timeStr}
          loaderRef={loaderRef}
          hasMore={hasMore}
        />

        {/* 絞り込み結果0件メッセージ（検索後） */}
        {hasSearched && !loading && !error && results.length === 0 && (
          <div className="mt-4 text-center text-gray-500">
            該当する場所が見つかりませんでした。
          </div>
        )}

        {loading && results.length === 0 && (
          <div className="mt-6 flex justify-center" aria-label="読み込み中" aria-live="polite">
            {/* 読み込み中の状態を視覚的に丁寧に伝えるスピナーです。 */}
            <div className="animate-spin h-8 w-8 rounded-xl bg-[var(--primary)]" />
          </div>
        )}

        {loading && results.length > 0 && (
          <div className="mt-4 flex justify-center" aria-label="読み込み中" aria-live="polite">
            {/* 追加入力で読み込みが続く場合もスピナーで丁寧に表現します。 */}
            <div className="animate-spin h-6 w-6 rounded-xl bg-[var(--primary)]" />
          </div>
        )}
      </main>

      {/* フッター：未検索時は画面下に固定、検索後は通常フローに配置 */}
      <footer ref={footerRef} className={footerClassName}>
        <div className="border-t border-black/10">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-3 px-4 py-3 text-on-surface sm:max-w-6xl sm:px-6">
            <button
              type="button"
              onClick={() => setContactOpen(true)}
              className="flex items-center gap-1 transition hover:opacity-80"
            >
              <span>お問い合わせ</span>
            </button>
            /
            <span className="flex items-center gap-2">
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
