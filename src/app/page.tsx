'use client';
import { SearchForm } from '@/components/SearchForm';
import { DateTimePicker } from '@/components/DateTimePicker';
import { TransportModeSelector } from '@/components/TransportModeSelector';
import { PlaceList } from '@/components/PlaceList';
import { usePlaces } from '@/hooks/usePlaces';
import { useEta } from '@/hooks/useEta';

export default function HomePage() {
  const {
    // 入力/検索
    qInput, setQInput, submitSearch,
    loading, error, hasSearched,
    // 結果
    results,
    // 日付/時刻
    dateStr, setDateStr, timeStr, setTimeStr, useNow, setUseNow, dateLabel, timeLabel,
    // 位置/並び順
    lat, lng, hasLatLng, sortByDistance, setSortByDistance,
    // 交通手段
    mode, setMode,
    // 無限スクロール
    loaderRef,
  } = usePlaces();

  const etaMap = useEta(results, { lat, lng }, mode);
  const waitingGeo = !hasLatLng;

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="text-2xl font-bold tracking-tight">HOURS</h1>

      {/* 上段：日付/時刻、検索フィールド */}
      <form
        onSubmit={submitSearch}
        className="mt-4 grid gap-3 sm:grid-cols-[auto_1fr] sm:items-center"
      >
        {/* 左：日付・時間（高さを h-10 に揃える） */}
        <DateTimePicker
          dateStr={dateStr}
          setDateStr={setDateStr}
          timeStr={timeStr}
          setTimeStr={setTimeStr}
          useNow={useNow}
          setUseNow={setUseNow}
          dateLabel={dateLabel}
          timeLabel={timeLabel}
        />

        {/* 右：テキスト入力（高さ h-10） */}
        <SearchForm
          qInput={qInput}
          setQInput={setQInput}
          loading={loading}
          waitingGeo={!hasLatLng}
        />

        {/* 2段目（横幅いっぱい）：並び順＋移動手段 */}
        {hasLatLng && (
          <div className="sm:col-span-2 flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={sortByDistance}
                onChange={(e) => setSortByDistance(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
              />
              <span>距離が近い順</span>
            </label>
            <TransportModeSelector mode={mode} setMode={setMode} />
          </div>
        )}
      </form>

      {error && (
        <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">{error}</div>
      )}

      {!hasSearched && results.length === 0 && !loading && !error && (
        <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 text-gray-600">キーワードを入力して「検索」を押してください。</div>
      )}

      <PlaceList
        results={results}
        etaMap={etaMap}
        dateStr={dateStr}
        origin={{ lat, lng }}
        mode={mode}
        loaderRef={loaderRef}
      />

      {/* 絞り込み結果0件メッセージ */}
      {hasSearched && !loading && !error && results.length === 0 && (
        <div className="mt-4 text-center text-gray-500">
          該当するお店が見つかりませんでした。
        </div>
      )}

      {loading && (<div className="mt-4 text-center text-gray-500">読み込み中…</div>)}
    </main>
  );
}

