'use client';
import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { SearchForm } from '@/components/SearchForm';
import { DateTimePicker } from '@/components/DateTimePicker';
import { FinalReceptionSelector } from '@/components/FinalReceptionSelector';
import { PlaceList } from '@/components/PlaceList';
import { ContactDialog } from '@/components/ContactDialog';
import { ScrollTopButton } from '@/components/ScrollTopButton';
import { usePlaces } from '@/hooks/usePlaces';

export default function HomePage() {
  // 初めて使う場合は usePlaces で検索に必要な状態や操作がひとまとめに取得できると覚えると安心です。
  const {
    // 入力/検索
    qInput, setQInput, submitSearch, resetSearch,
    searchHistory, searchFromHistory, clearSearchHistory,
    loading, error, hasSearched,
    // 結果
    results,
    // 日付/時刻
    dateStr, setDateStr, timeStr, setTimeStr, dateLabel, timeLabel,
    // 最終受付考慮
    finalReception, setFinalReception,
  } = usePlaces();

  // ── ヘッダー＆フッターの実測高さ ───────────────────────────
  const headerRef = useRef<HTMLDivElement | null>(null);
  const footerRef = useRef<HTMLElement | null>(null);
  const [headerOffset, setHeaderOffset] = useState(120);
  const [footerOffset, setFooterOffset] = useState(0);

  // 画面サイズが変わったときにヘッダーやフッターの高さを再計算する小さな関数です。
  const updateOffsets = useCallback(() => {
    // オフセットを求めるときは常に「現在の高さ + 少しの余白」をセットします。
    const GAP_PX = 8;
    const h = headerRef.current?.offsetHeight ?? 0;
    const f = footerRef.current?.offsetHeight ?? 0; // border含む実測
    setHeaderOffset(h + GAP_PX);
    setFooterOffset(f);
  }, []);

  useEffect(() => {
    // ページ読み込み時と画面のリサイズ時に高さを測り直します。最初に覚えておくと便利なパターンです。
    if (typeof window === 'undefined') return;

    updateOffsets();
    // ResizeObserver は DOM のサイズ変化を察知できる便利なブラウザAPIです。

    let roHeader: ResizeObserver | null = null;
    let roFooter: ResizeObserver | null = null;

    if (typeof ResizeObserver !== 'undefined') {
      if (headerRef.current) {
        roHeader = new ResizeObserver(() => updateOffsets());
        roHeader.observe(headerRef.current);
      }
      if (footerRef.current) {
        roFooter = new ResizeObserver(() => updateOffsets());
        roFooter.observe(footerRef.current);
      }
    }

    window.addEventListener('resize', updateOffsets);
    return () => {
      window.removeEventListener('resize', updateOffsets);
      roHeader?.disconnect();
      roFooter?.disconnect();
    };
  }, [updateOffsets]);

  // 履歴やキーワード候補の開閉状態を管理するためのフラグです。
  const [extrasOpen, setExtrasOpen] = useState(false);
  const [extrasVisible, setExtrasVisible] = useState(true);
  // 高さ計測を次の描画フレームで実行するためのヘルパーです。
  const refreshOffsetsNextFrame = useCallback(() => {
    // requestAnimationFrame を使うと、描画が終わる直前に処理できるため高さズレを防げます。
    requestAnimationFrame(updateOffsets);
  }, [updateOffsets]);
  // 追加パネルを完全に閉じたいときに使う関数です。
  const closeExtrasCompletely = useCallback(() => {
    setExtrasOpen(false);
    setExtrasVisible(false);
  }, []);
  // 追加パネルを開くときは両方のフラグを true にします。
  const openExtras = useCallback(() => {
    setExtrasVisible(true);
    setExtrasOpen(true);
  }, []);

  const handleSubmitSearch = useCallback((e?: React.FormEvent) => {
    submitSearch(e);
    refreshOffsetsNextFrame();
    // 検索直後は強制表示を解除し、必要に応じて利用できるように可視状態だけ保ちます。
    setExtrasOpen(false);
    // 可視状態を保つのは「再度タップするとすぐ展開できるようにする」ためです。
    setExtrasVisible(true);
  }, [submitSearch, refreshOffsetsNextFrame]);

  const handleSearchFromKeyword = useCallback((term: string) => {
    searchFromHistory(term);
    refreshOffsetsNextFrame();
    // キーワードから再検索した場合も、履歴パネルは一旦閉じてシンプルな状態に戻します。
    setExtrasOpen(false);
    setExtrasVisible(true);
  }, [searchFromHistory, refreshOffsetsNextFrame]);

  useEffect(() => {
    if (!extrasOpen && !extrasVisible) return;
    if (hasSearched) return;
    // ページのどこかをクリックしたらパネルを閉じたいので、グローバルに pointerdown を監視します。
    const handlePointerDown = (event: PointerEvent) => {
      if (headerRef.current?.contains(event.target as Node)) return;
      closeExtrasCompletely();
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [extrasOpen, extrasVisible, hasSearched, closeExtrasCompletely]);

  // ───────────────────────────────────────────────────────────────

  // 空状態の高さ：100dvh からヘッダー＆フッターを厳密に差し引く
  const emptyStateHeight = `calc(100dvh - ${headerOffset}px - ${footerOffset}px)`;
  const isEmpty = !hasSearched && results.length === 0 && !loading && !error;
  // footerClassName は空状態と検索後で挙動が大きく変わるため、配列 + join で読みやすくしています。
  const footerClassName = [
    'w-full bg-[var(--background)] text-xs text-on-surface-light sm:text-sm',
    isEmpty ? 'fixed bottom-0 left-0 right-0 z-40 mt-0' : 'relative mt-4 sm:mt-6'
  ].join(' ');
  const [contactOpen, setContactOpen] = useState(false);

  return (
    // レイアウトは大きく「ヘッダー」「メイン」「フッター」の3つに分かれています。
    <div className="min-h-[100dvh] flex flex-col">
      {/* 固定検索フォーム */}
      <div
        ref={headerRef}
        className="fixed top-0 left-0 right-0 z-50 bg-[var(--background)] shadow-sm"
      >
        <div className="mx-auto max-w-[600px] px-4 py-2 sm:px-6 sm:py-3 lg:px-8 lg:py-4">
          <form
            onSubmit={handleSubmitSearch}
            onFocusCapture={refreshOffsetsNextFrame}
            onBlurCapture={refreshOffsetsNextFrame}
            className="space-y-2 sm:space-y-3"
          >
            {/* 1行目: 検索フォーム */}
            <SearchForm
              qInput={qInput}
              setQInput={setQInput}
              loading={loading}
              onReset={resetSearch}
              searchHistory={searchHistory}
              onHistorySelect={handleSearchFromKeyword}
              onClearHistory={clearSearchHistory}
              forceOpen={extrasOpen}
              onOpen={openExtras}
              onClose={closeExtrasCompletely}
              onKeywordSelect={handleSearchFromKeyword}
            />

            {/* 2行目: 日時選択と最終受付 */}
            <div className="flex items-center gap-2 h-10">
              {/* DateTimePicker で日付と時間をセットし、検索条件に反映させます。 */}
              <DateTimePicker
                dateStr={dateStr}
                setDateStr={setDateStr}
                timeStr={timeStr}
                setTimeStr={setTimeStr}
                dateLabel={dateLabel}
                timeLabel={timeLabel}
              />
              <div className="h-full flex items-center">
                {/* 最終受付の制限を切り替えるUIです。選択状態はカスタムフックから受け取った変数を使います。 */}
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
            className="flex items-center justify-center max-w-[600px]"
            style={{ height: emptyStateHeight }}
          >
            <div className="flex flex-col items-center gap-5 text-center" style={{ color: 'var(--foreground)' }}>
              <Image
                src="/images/top.png"
                width={320}
                height={318}
                priority
                quality={40}
                alt="検索開始を案内するイラスト"
                className="object-contain h-30 w-30 sm:h-40 sm:w-40 lg:h-45 lg:w-45"
                sizes="(min-width: 1024px) 10rem, (min-width: 640px) 8rem, 6rem"
              />
              <div className="text-sm sm:text-base text-left">
                <p>指定した日時に営業している施設を検索できます。</p>
                <p className="mt-1 pb-2 text-xs text-gray-500 sm:text-sm">
                  ※実際の受付時間は施設の公式情報をご確認ください。
                </p>

                <p className="mt-1 text-orange-600 text-sm font-medium">
                  ※このサイトはデモ用です。表示されるデータはすべて架空です。
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
                href="https://x.com/_yokonari"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 transition hover:opacity-80"
              >
                <span>@_yokonari</span>
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
