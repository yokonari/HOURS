'use client';
import { SearchForm } from '@/components/SearchForm';
import { DateTimePicker } from '@/components/DateTimePicker';
import { TransportModeSelector } from '@/components/TransportModeSelector';
import { FinalReceptionSelector } from '@/components/FinalReceptionSelector';
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
    lat, lng, hasLatLng,
    // 交通手段
    mode, setMode,
    // 最終受付考慮
    finalReception, setFinalReception,
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
      <div className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm">
        <div className="mx-auto max-w-[600px] px-4 py-4">
          <form onSubmit={submitSearch} className="space-y-3">
            {/* 1行目: 検索フォームと交通手段 */}
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <SearchForm
                  qInput={qInput}
                  setQInput={setQInput}
                  loading={loading}
                  waitingGeo={!hasLatLng}
                />
              </div>
              {hasLatLng && (
                <TransportModeSelector mode={mode} setMode={setMode} />
              )}
            </div>

            {/* 2行目: 日時選択と最終受付 */}
            <div className="flex items-center gap-3">
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
              <FinalReceptionSelector value={finalReception} onChange={setFinalReception} />
            </div>
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
          timeStr={timeStr}
          origin={{ lat, lng }}
          mode={mode}
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
    </>
  );
}

