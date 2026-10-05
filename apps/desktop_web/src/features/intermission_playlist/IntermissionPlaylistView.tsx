import React, { useState } from 'react';
import { IntermissionTrack } from '../../types';

interface IntermissionPlaylistViewProps {
  tracks: IntermissionTrack[];
  onToggleTrack: (id: string) => void;
  onMoveTrack: (id: string, direction: 'up' | 'down') => void;
  onAddTrack?: (track: Omit<IntermissionTrack, 'id' | 'duration_formatted'>) => void;
  onDeleteTrack?: (id: string) => void;
}

export const IntermissionPlaylistView: React.FC<IntermissionPlaylistViewProps> = ({
  tracks,
  onToggleTrack,
  onMoveTrack,
  onAddTrack,
  onDeleteTrack,
}) => {
  const [activeSession, setActiveSession] = useState<'MORNING_BREAK' | 'NOON_BREAK'>('MORNING_BREAK');
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);

  // New Track Form State
  const [newTitle, setNewTitle] = useState<string>('');
  const [newCategory, setNewCategory] = useState<'PROVERB' | 'STORY' | 'NASHEED' | 'DUAA'>('NASHEED');
  const [newSpeaker, setNewSpeaker] = useState<string>('');
  const [newDuration, setNewDuration] = useState<number>(180);
  const [newUrl, setNewUrl] = useState<string>('https://cdn.smartbell.local/audio/sample.mp3');

  const filteredTracks = tracks.filter((t) => t.session === activeSession);

  const handleTogglePlay = (id: string) => {
    if (playingTrackId === id) {
      setPlayingTrackId(null);
    } else {
      setPlayingTrackId(id);
    }
  };

  const handleSubmitAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    if (onAddTrack) {
      onAddTrack({
        session: activeSession,
        category: newCategory,
        title: newTitle.trim(),
        speaker_or_artist: newSpeaker.trim() || 'الإذاعة المدرسية',
        duration_seconds: newDuration,
        audio_url: newUrl.trim() || 'https://cdn.smartbell.local/audio/sample.mp3',
        play_order: filteredTracks.length + 1,
        is_active: true,
      });
    }

    setNewTitle('');
    setNewSpeaker('');
    setShowAddModal(false);
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

        {/* Actions & Switcher */}
        <div className="flex flex-wrap items-center gap-3">
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
              استراحة الصباح (10:00 - 10:25)
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
              استراحة الزوال (12:30 - 13:15)
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-space-lg py-2.5 bg-teal-dark hover:bg-secondary text-white rounded-xl font-bold text-xs shadow-md transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-lg">add_circle</span>
            <span>إضافة فقرة إذاعية</span>
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

        {/* Tracks List or Empty State */}
        {filteredTracks.length === 0 ? (
          <div className="py-12 px-6 bg-surface-container-low rounded-xl border border-dashed border-surface-container-highest flex flex-col items-center justify-center text-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-secondary-container/40 flex items-center justify-center text-teal-dark shadow-sm">
              <span className="material-symbols-outlined text-3xl">queue_music</span>
            </div>
            <h3 className="text-base font-bold text-on-surface">لا توجد فقرات إذاعية مسجلة لهذه الاستراحة حالياً</h3>
            <p className="text-xs text-on-surface-variant max-w-md leading-relaxed">
              يمكنك إضافة أناشيد، أدعية، قصص وعبر، أو حكم تربوية لتشغيلها آلياً خلال وقت الفسحة المدرسية.
            </p>
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="mt-2 flex items-center gap-2 px-space-lg py-2.5 bg-teal-dark hover:bg-secondary text-white rounded-xl font-bold text-xs shadow-md transition-all active:scale-95"
            >
              <span className="material-symbols-outlined text-base">add_circle</span>
              <span>إضافة أول فقرة الآن</span>
            </button>
          </div>
        ) : (
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

                  {onDeleteTrack && (
                    <button
                      type="button"
                      onClick={() => onDeleteTrack(track.id)}
                      className="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-surface-container transition-colors"
                      title="حذف الفقرة"
                    >
                      <span className="material-symbols-outlined text-lg">delete</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Track Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl max-w-md w-full p-space-xl shadow-2xl border border-surface-container-high animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-surface-container">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-teal-dark text-2xl">add_circle</span>
                <h3 className="font-bold text-base text-on-surface">إضافة فقرة إذاعية جديدة</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-on-surface-variant hover:text-error p-1 rounded-lg"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmitAdd} className="flex flex-col gap-space-md mt-space-md">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-on-surface-variant">عنوان الفقرة:</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: نشيد النجاح والتفوق"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="bg-surface-container-low px-space-md py-2 rounded-xl text-xs text-on-surface border border-surface-container focus:ring-2 focus:ring-teal-dark outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-space-md">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-on-surface-variant">التصنيف:</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="bg-surface-container-low px-space-md py-2 rounded-xl text-xs text-on-surface border border-surface-container focus:ring-2 focus:ring-teal-dark outline-none cursor-pointer"
                  >
                    <option value="NASHEED">نشيد تربوي</option>
                    <option value="PROVERB">حكمة اليوم</option>
                    <option value="STORY">قصة وعبرة</option>
                    <option value="DUAA">أدعية وأذكار</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-on-surface-variant">المدة بالثواني:</label>
                  <input
                    type="number"
                    min="30"
                    max="900"
                    value={newDuration}
                    onChange={(e) => setNewDuration(Number(e.target.value))}
                    className="bg-surface-container-low px-space-md py-2 rounded-xl text-xs text-on-surface border border-surface-container focus:ring-2 focus:ring-teal-dark outline-none font-mono"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-on-surface-variant">القارئ / المنشد / المُعد:</label>
                <input
                  type="text"
                  placeholder="مثال: كورال المدرسة أو جماعة الإذاعة"
                  value={newSpeaker}
                  onChange={(e) => setNewSpeaker(e.target.value)}
                  className="bg-surface-container-low px-space-md py-2 rounded-xl text-xs text-on-surface border border-surface-container focus:ring-2 focus:ring-teal-dark outline-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-on-surface-variant">رابط الملف الصوتي (URL):</label>
                <input
                  type="url"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  className="bg-surface-container-low px-space-md py-2 rounded-xl text-xs text-on-surface border border-surface-container focus:ring-2 focus:ring-teal-dark outline-none font-mono text-left"
                  dir="ltr"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-space-md border-t border-surface-container">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-space-md py-2 rounded-xl bg-surface-container text-on-surface text-xs font-bold hover:bg-surface-container-highest transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-space-lg py-2 rounded-xl bg-teal-dark text-white text-xs font-bold hover:bg-secondary transition-colors shadow-sm"
                >
                  حفظ الفقرة في القاعدة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
