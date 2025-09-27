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

  const { etaMap } = useEta({
    origin: hasLatLng ? { lat: lat!, lng: lng! } : null,
    destinations: results.map(place => ({
      id: place.id || '',
      lat: place.location?.latitude || 0,
      lng: place.location?.longitude || 0
    })),
    mode
  });
  const waitingGeo = !hasLatLng;

  return (
    <>
      {/* 固定検索フォーム */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="mx-auto max-w-5xl px-4 py-4">
          <div className="flex items-center mb-4">
            <h1 className="text-2xl font-bold tracking-tight">HOURS</h1>
            {/* 日付・時間選択 */}
            <div className="ml-2">
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
            </div>
          </div>

          <form
            onSubmit={submitSearch}
            className="flex items-center gap-3"
          >
            {/* テキスト入力 */}
            <div className="flex-1">
              <SearchForm
                qInput={qInput}
                setQInput={setQInput}
                loading={loading}
                waitingGeo={!hasLatLng}
              />
            </div>

            {/* 並び順＋移動手段 */}
            {hasLatLng && (
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={sortByDistance}
                    onChange={(e) => setSortByDistance(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                  />
                  <span>近い順</span>
                </label>
                <TransportModeSelector mode={mode} setMode={setMode} />
              </div>
            )}
          </form>
        </div>
      </div>

      {/* メインコンテンツエリア */}
      <main className="mx-auto max-w-5xl px-4 pt-32 pb-6">

        {error && (
          <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">{error}</div>
        )}

        {!hasSearched && results.length === 0 && !loading && !error && (
          <div className="mt-2 rounded-xl border border-gray-200 bg-white p-6 text-gray-600">キーワードを入力して「検索」を押してください。</div>
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
    </>
  );
}

