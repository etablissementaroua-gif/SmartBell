import React, { useState, useEffect } from 'react';
import { IntermissionTrack } from '../../../types';

interface NowPlayingCardProps {
  tracks: IntermissionTrack[];
  onInsertTrack: () => void;
}

export const NowPlayingCard: React.FC<NowPlayingCardProps> = ({ tracks, onInsertTrack }) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [progress, setProgress] = useState<number>(245); // seconds elapsed (approx 04:05)
  const totalDuration = 510; // 08:30 in seconds
  const [isYardMuted, setIsYardMuted] = useState<boolean>(false);
  const [yardVolume, setYardVolume] = useState<number>(75);
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(0);

  useEffect(() => {
    let timer: number;
    if (isPlaying) {
      timer = window.setInterval(() => {
        setProgress((prev) => (prev >= totalDuration ? 0 : prev + 1));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isPlaying, totalDuration]);

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const remainingSeconds = totalDuration - progress;

  return (
    <div className="flex flex-col gap-space-lg w-full">
      {/* Broadcast Status Pill */}
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 px-space-md py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed font-bold text-xs shadow-sm">
          <span className="w-2 h-2 rounded-full bg-teal-dark animate-ping"></span>
          بث حي مستمر
        </span>
        <span className="text-xs text-on-surface-variant font-mono">
          VLAN 20 • Multi-Cast Audio
        </span>
      </div>

      {/* Main Now Playing Card */}
      <div className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm border border-surface-container-high/60 flex flex-col gap-space-md">
        {/* Track Title and Art */}
        <div className="flex items-start gap-space-md">
          <div className="relative w-16 h-16 rounded-2xl overflow-hidden bg-primary-container flex-shrink-0 shadow-md border border-teal-dark/30 flex items-center justify-center">
            <img
              src="/assets/smartbell_icon.png"
              alt="Radio Logo"
              className="w-12 h-12 object-contain"
            />
            {isPlaying && (
              <span className="absolute bottom-1 right-1 w-2.5 h-2.5 rounded-full bg-teal-accent ring-2 ring-primary-container animate-pulse"></span>
            )}
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[11px] font-bold text-teal-dark uppercase tracking-wider bg-secondary-container/40 px-2 py-0.5 rounded-md">
                إذاعة الصباح
              </span>
              <span className="text-[10px] font-mono text-on-surface-variant bg-surface-container-low px-1.5 py-0.5 rounded">
                بث رقمي عالي النقاء
              </span>
            </div>
            <h3 className="font-bold text-[16px] text-on-surface mt-1 truncate">
              برنامج الصباح: نفحات تربوية وإيمانية
            </h3>
            <p className="text-[12px] text-on-surface-variant truncate">
              إعداد جماعة الإذاعة المدرسية والإرشاد الطلابي
            </p>
          </div>
        </div>

        {/* Audio Waveform Visualizer */}
        <div className="bg-surface-container-low p-space-md rounded-xl border border-surface-container flex flex-col gap-2">
          <div className="flex items-center justify-between text-[11px] text-on-surface-variant font-mono">
            <span>WAVEFORM LIVE</span>
            <span className="text-teal-dark font-bold">24-bit • 48 kHz PCM</span>
          </div>
          <div className="flex items-center justify-center gap-1.5 h-14 overflow-hidden px-2">
            {[35, 60, 45, 85, 95, 70, 40, 65, 80, 50, 90, 100, 75, 45, 60, 85, 70, 40, 55, 75, 65, 90, 80, 50].map((height, i) => (
              <div
                key={i}
                className={`w-1 rounded-full transition-all duration-300 ${
                  isPlaying ? 'bg-teal-dark' : 'bg-surface-container-highest'
                }`}
                style={{
                  height: isPlaying ? `${Math.max(15, (height * (yardVolume / 100)))}%` : '15%',
                  animation: isPlaying ? `pulse-wave ${(0.6 + (i % 5) * 0.2)}s ease-in-out infinite ${(i % 4) * 0.15}s` : 'none',
                }}
              />
            ))}
          </div>
        </div>

        {/* Audio Progress Bar & Timers */}
        <div className="flex flex-col gap-1.5">
          <div className="relative w-full h-2 bg-surface-container rounded-full overflow-hidden cursor-pointer">
            <div
              className="h-full bg-teal-dark rounded-full transition-all"
              style={{ width: `${(progress / totalDuration) * 100}%` }}
            ></div>
          </div>
          <div className="flex items-center justify-between text-[12px] text-on-surface-variant font-mono">
            <span className="text-teal-dark font-bold">متبقي: {formatSeconds(remainingSeconds)}</span>
            <span>الإجمالي: {formatSeconds(totalDuration)}</span>
          </div>
        </div>

        {/* Player Controls */}
        <div className="flex items-center justify-center gap-space-lg py-1">
          <button
            type="button"
            className="text-on-surface-variant hover:text-teal-dark transition-colors p-1"
            title="تشغيل عشوائي"
          >
            <span className="material-symbols-outlined text-xl">shuffle</span>
          </button>
          <button
            type="button"
            onClick={() => setCurrentTrackIndex((prev) => Math.max(0, prev - 1))}
            className="text-on-surface hover:text-teal-dark transition-colors p-1"
            title="المقطع السابق"
          >
            <span className="material-symbols-outlined text-2xl">skip_previous</span>
          </button>
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-12 h-12 rounded-full bg-teal-dark text-on-primary flex items-center justify-center hover:bg-secondary transition-all shadow-md active:scale-95 ring-4 ring-teal-dark/20"
            title={isPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
          >
            <span className="material-symbols-outlined text-3xl">
              {isPlaying ? 'pause' : 'play_arrow'}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setCurrentTrackIndex((prev) => Math.min(tracks.length - 1, prev + 1))}
            className="text-on-surface hover:text-teal-dark transition-colors p-1"
            title="المقطع التالي"
          >
            <span className="material-symbols-outlined text-2xl">skip_next</span>
          </button>
          <button
            type="button"
            className="text-on-surface-variant hover:text-teal-dark transition-colors p-1"
            title="تكرار الفقرة"
          >
            <span className="material-symbols-outlined text-xl">repeat</span>
          </button>
        </div>

        {/* Yard Mute Toggle & Volume Controls */}
        <div className="flex items-center justify-between gap-space-md pt-space-sm border-t border-surface-container bg-surface-container-low p-space-md rounded-xl">
          <button
            type="button"
            onClick={() => setIsYardMuted(!isYardMuted)}
            className={`flex items-center gap-1.5 px-space-md py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm ${
              isYardMuted
                ? 'bg-error text-on-error'
                : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container'
            }`}
          >
            <span className="material-symbols-outlined text-base">
              {isYardMuted ? 'volume_off' : 'volume_up'}
            </span>
            <span>{isYardMuted ? 'الساحة مكتومة' : 'كتم الساحة'}</span>
          </button>

          <div className="flex items-center gap-2 flex-1 max-w-[180px]">
            <span className="text-[11px] text-on-surface-variant font-medium">مستوى صوت الساحة:</span>
            <input
              type="range"
              min="0"
              max="100"
              value={isYardMuted ? 0 : yardVolume}
              disabled={isYardMuted}
              onChange={(e) => setYardVolume(Number(e.target.value))}
              className="w-full h-1.5 bg-surface-container rounded-lg appearance-none cursor-pointer accent-teal-dark"
            />
            <span className="text-xs font-mono font-bold text-on-surface min-w-[3ch]">
              {isYardMuted ? '0%' : `${yardVolume}%`}
            </span>
          </div>
        </div>
      </div>

      {/* Upcoming Tracks Playlist Queue */}
      <div className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm border border-surface-container-high/60 flex flex-col gap-space-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-teal-dark text-xl">playlist_play</span>
            <h4 className="font-bold text-[15px] text-on-surface">المقاطع التالية في الفقرة الإذاعية</h4>
          </div>
          <span className="text-xs font-mono text-on-surface-variant bg-surface-container-low px-2 py-0.5 rounded-full font-bold">
            {tracks.length} مقاطع متبقية
          </span>
        </div>

        {/* Tracks List */}
        <div className="flex flex-col gap-2">
          {tracks.map((track, idx) => (
            <div
              key={track.id}
              className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                idx === currentTrackIndex
                  ? 'bg-secondary-container/20 border-teal-dark/30 ring-1 ring-teal-dark/20'
                  : 'bg-surface-container-low border-surface-container hover:bg-surface-container'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="w-5 h-5 rounded-full bg-surface-container-highest flex items-center justify-center font-mono text-xs font-bold text-on-surface">
                  {idx + 1}
                </span>
                <div className="flex flex-col">
                  <span className="font-bold text-[13px] text-on-surface">{track.title}</span>
                  <span className="text-[11px] text-on-surface-variant">{track.speaker_or_artist}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-on-surface-variant bg-surface-container-lowest px-1.5 py-0.5 rounded">
                  {track.duration_formatted}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentTrackIndex(idx)}
                  className="w-7 h-7 rounded-full bg-surface-container-lowest text-teal-dark hover:bg-teal-dark hover:text-on-primary flex items-center justify-center transition-colors shadow-sm"
                  title="تشغيل هذا المقطع"
                >
                  <span className="material-symbols-outlined text-sm">play_arrow</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Insert Track Action */}
        <button
          type="button"
          onClick={onInsertTrack}
          className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl border border-dashed border-teal-dark/40 hover:border-teal-dark bg-secondary-container/10 hover:bg-secondary-container/20 text-teal-dark font-bold text-xs transition-all"
        >
          <span className="material-symbols-outlined text-base">add_circle</span>
          <span>إدراج مقطع من مكتبة الوسائط</span>
        </button>
      </div>
    </div>
  );
};
