import React, { useState } from 'react';
import { IntermissionTrack } from '../../types';

interface IntermissionPlaylistViewProps {
  tracks: IntermissionTrack[];
  onToggleTrack: (id: string) => void;
  onMoveTrack: (id: string, direction: 'up' | 'down') => void;
}

export const IntermissionPlaylistView: React.FC<IntermissionPlaylistViewProps> = ({
  tracks,
  onToggleTrack,
  onMoveTrack,
}) => {
  const [activeSession, setActiveSession] = useState<'MORNING_BREAK' | 'NOON_BREAK'>('MORNING_BREAK');
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);

  const filteredTracks = tracks.filter((t) => t.session === activeSession);

  const handleTogglePlay = (id: string) => {
    if (playingTrackId === id) {
      setPlayingTrackId(null);
    } else {
      setPlayingTrackId(id);
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'PROVERB':
        return <span className="px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed text-xs font-bold">حكمة اليوم</span>;
      case 'STORY':
        return <span className="px-2 py-0.5 rounded-full bg-surface-container-highest text-on-surface text-xs font-bold">قصة وعبرة</span>;
      case 'NASHEED':
        return <span className="px-2 py-0.5 rounded-full bg-primary-container text-teal-accent text-xs font-bold">نشيد تربوي</span>;
      case 'DUAA':
        return <span className="px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container text-xs font-bold">أدعية وأذكار</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full bg-surface-container text-on-surface text-xs">عام</span>;
    }
  };

  return (
    <div className="flex flex-col gap-space-xl w-full max-w-[1720px] mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-lg bg-surface-container-lowest p-space-lg rounded-2xl shadow-sm border border-surface-container-high/60">
        <div className="flex items-center gap-space-lg">
          <div className="w-14 h-14 rounded-2xl bg-secondary-container flex items-center justify-center text-teal-dark shadow-sm">
            <span className="material-symbols-outlined text-3xl">timer</span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-space-sm">
              <h1 className="text-xl md:text-2xl font-bold text-on-surface">برمجة فقرات الاستراحات المدرسية</h1>
              <span className="px-space-sm py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed text-xs font-bold">
                تنسيق المحتوى التلقائي
              </span>
            </div>
            <p className="text-sm text-on-surface-variant mt-0.5">
              تنظيم وبناء تسلسل الفقرات الصوتية المذاعة خلال فترات الفسحة والاستراحة اليومية (حكمة، قصة، نشيد، دعاء).
            </p>
          </div>
        </div>

        {/* Break Session Switcher */}
        <div className="flex items-center gap-1 bg-surface-container-low p-1.5 rounded-xl border border-surface-container">
          <button
            type="button"
            onClick={() => setActiveSession('MORNING_BREAK')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeSession === 'MORNING_BREAK'
                ? 'bg-primary text-white shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            استراحة الصباح الأولى (10:00 - 10:25)
          </button>
          <button
            type="button"
            onClick={() => setActiveSession('NOON_BREAK')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeSession === 'NOON_BREAK'
                ? 'bg-primary text-white shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            استراحة الزوال والغداء (12:30 - 13:15)
          </button>
        </div>
      </div>

      {/* Playlist Sequence Container */}
      <div className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm border border-surface-container-high/60 flex flex-col gap-space-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-teal-dark text-xl">format_list_numbered_rtl</span>
            <h2 className="text-base font-bold text-on-surface">
              ترتيب البث المعتمد • {activeSession === 'MORNING_BREAK' ? 'استراحة الصباح' : 'استراحة الزوال'}
            </h2>
          </div>
          <span className="text-xs text-on-surface-variant font-mono">
            {filteredTracks.length} فقرات في القائمة
          </span>
        </div>

        {/* Tracks List */}
        <div className="flex flex-col gap-3">
          {filteredTracks.map((track, idx) => (
            <div
              key={track.id}
              className={`p-space-md rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                playingTrackId === track.id
                  ? 'bg-secondary-container/20 border-teal-dark ring-2 ring-teal-dark/30 shadow-sm'
                  : 'bg-surface-container-low border-surface-container hover:bg-surface-container'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-xl bg-surface-container-highest text-on-surface flex items-center justify-center font-mono font-bold text-xs">
                  {idx + 1}
                </span>

                <button
                  type="button"
                  onClick={() => handleTogglePlay(track.id)}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-sm ${
                    playingTrackId === track.id
                      ? 'bg-teal-dark text-white ring-4 ring-teal-dark/30 animate-pulse'
                      : 'bg-surface-container-lowest text-teal-dark hover:bg-teal-dark hover:text-white'
                  }`}
                  title="استماع"
                >
                  <span className="material-symbols-outlined text-xl">
                    {playingTrackId === track.id ? 'pause' : 'play_arrow'}
                  </span>
                </button>

                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-on-surface">{track.title}</span>
                    {getCategoryBadge(track.category)}
                  </div>
                  <span className="text-xs text-on-surface-variant mt-0.5">{track.speaker_or_artist}</span>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-surface-container">
                <span className="font-mono text-xs font-bold text-on-surface-variant bg-surface-container-lowest px-2 py-1 rounded-md border border-surface-container">
                  {track.duration_formatted}
                </span>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onMoveTrack(track.id, 'up')}
                    disabled={idx === 0}
                    className="p-1 rounded-lg text-on-surface-variant hover:text-teal-dark disabled:opacity-30 transition-colors"
                    title="تحريك لأعلى"
                  >
                    <span className="material-symbols-outlined text-xl">arrow_upward</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onMoveTrack(track.id, 'down')}
                    disabled={idx === filteredTracks.length - 1}
                    className="p-1 rounded-lg text-on-surface-variant hover:text-teal-dark disabled:opacity-30 transition-colors"
                    title="تحريك لأسفل"
                  >
                    <span className="material-symbols-outlined text-xl">arrow_downward</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => onToggleTrack(track.id)}
                  className={`w-11 h-6 rounded-full transition-colors relative p-0.5 inline-block ${
                    track.is_active ? 'bg-teal-dark' : 'bg-surface-container-highest'
                  }`}
                  title="تفعيل أو تعطيل الفقرة"
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                      track.is_active ? '-translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
