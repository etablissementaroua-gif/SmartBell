import React, { useState, useEffect } from 'react';
import { IntermissionTrack } from '../../../types';
import { supabaseService } from '../../../core/supabaseService';
import { audioPlayerService } from '../../../core/audioPlayerService';

interface NowPlayingCardProps {
  tracks: IntermissionTrack[];
  onInsertTrack: () => void;
  onShowToast?: (type: 'success' | 'error' | 'info' | 'warning', message: string, title?: string) => void;
}

export const NowPlayingCard: React.FC<NowPlayingCardProps> = ({ tracks, onInsertTrack, onShowToast }) => {
  const hasTracks = tracks.length > 0;
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [isYardMuted, setIsYardMuted] = useState<boolean>(false);
  const [yardVolume, setYardVolume] = useState<number>(75);
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(0);
  const [isShuffle, setIsShuffle] = useState<boolean>(false);
  const [isRepeat, setIsRepeat] = useState<boolean>(false);
  const [isBellRinging, setIsBellRinging] = useState<boolean>(false);
  const [bellSecondsRemaining, setBellSecondsRemaining] = useState<number>(0);
  const [chainedSessionName, setChainedSessionName] = useState<string | undefined>(undefined);

  const currentTrack = hasTracks ? (tracks[currentTrackIndex] || tracks[0]) : null;
  const totalDuration = currentTrack ? (currentTrack.duration_seconds || 120) : 0;

  useEffect(() => {
    const unsub = audioPlayerService.subscribe((state) => {
      setIsPlaying(state.isPlaying);
      setIsBellRinging(state.isBellRinging);
      setBellSecondsRemaining(state.bellSecondsRemaining);
      setChainedSessionName(state.chainedSessionName);

      if (state.currentTime > 0) {
        setProgress(state.currentTime);
      }
      if (state.currentTrack) {
        const foundIdx = tracks.findIndex((t) => t.id === state.currentTrack?.id);
        if (foundIdx >= 0) {
          setCurrentTrackIndex(foundIdx);
        }
      }
    });
    return unsub;
  }, [tracks]);

  useEffect(() => {
    let timer: number;
    if (isPlaying && hasTracks && totalDuration > 0) {
      timer = window.setInterval(() => {
        setProgress((prev) => {
          if (prev >= totalDuration) {
            if (isRepeat) {
              audioPlayerService.seek(0);
              return 0;
            } else if (isShuffle && tracks.length > 1) {
              const nextRnd = Math.floor(Math.random() * tracks.length);
              setCurrentTrackIndex(nextRnd);
              audioPlayerService.playTrack(tracks[nextRnd]);
              return 0;
            } else if (currentTrackIndex < tracks.length - 1) {
              setCurrentTrackIndex((c) => c + 1);
              audioPlayerService.playTrack(tracks[currentTrackIndex + 1]);
              return 0;
            }
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    } else if (!hasTracks) {
      setIsPlaying(false);
      setProgress(0);
    }
    return () => clearInterval(timer);
  }, [isPlaying, hasTracks, totalDuration, isRepeat, isShuffle, tracks, currentTrackIndex]);

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const remainingSeconds = Math.max(0, totalDuration - progress);

  const toggleShuffle = () => {
    const nextVal = !isShuffle;
    setIsShuffle(nextVal);
    if (onShowToast) {
      onShowToast('info', nextVal ? 'تم تفعيل نمط التشغيل العشوائي للفقرات' : 'تم تعطيل التشغيل العشوائي', 'الإذاعة المدرسية');
    }
  };

  const toggleRepeat = () => {
    const nextVal = !isRepeat;
    setIsRepeat(nextVal);
    if (onShowToast) {
      onShowToast('info', nextVal ? 'تم تفعيل تكرار الفقرة الحالية' : 'تم تعطيل تكرار الفقرة', 'الإذاعة المدرسية');
    }
  };

  const handleTogglePlay = () => {
    if (!hasTracks) return;
    const nextPlaying = !isPlaying;
    if (nextPlaying) {
      if (currentTrack) {
        audioPlayerService.playTrack(currentTrack);
      }
    } else {
      audioPlayerService.pause();
    }
    supabaseService.sendMediaControl(nextPlaying ? 'PLAY' : 'PAUSE', currentTrack);
    if (onShowToast) {
      onShowToast('info', nextPlaying ? `جاري بث: ${currentTrack?.title || 'الفقرة الإذاعية'}` : 'تم إيقاف البث الإذاعي مؤقتاً', 'المشغل الصوتي');
    }
  };

  const handlePrevTrack = () => {
    const prevIdx = Math.max(0, currentTrackIndex - 1);
    setCurrentTrackIndex(prevIdx);
    setProgress(0);
    if (tracks[prevIdx]) {
      if (isPlaying) {
        audioPlayerService.playTrack(tracks[prevIdx]);
      }
      supabaseService.sendMediaControl('PREV', tracks[prevIdx]);
      if (onShowToast) {
        onShowToast('info', `تم الانتقال إلى: ${tracks[prevIdx].title}`, 'المقطع السابق');
      }
    }
  };

  const handleNextTrack = () => {
    const nextIdx = Math.min(tracks.length - 1, currentTrackIndex + 1);
    setCurrentTrackIndex(nextIdx);
    setProgress(0);
    if (tracks[nextIdx]) {
      if (isPlaying) {
        audioPlayerService.playTrack(tracks[nextIdx]);
      }
      supabaseService.sendMediaControl('NEXT', tracks[nextIdx]);
      if (onShowToast) {
        onShowToast('info', `تم الانتقال إلى: ${tracks[nextIdx].title}`, 'المقطع التالي');
      }
    }
  };

  const handleYardMute = () => {
    const nextMuted = !isYardMuted;
    setIsYardMuted(nextMuted);
    if (nextMuted) {
      audioPlayerService.setVolume(0);
    } else {
      audioPlayerService.setVolume(yardVolume);
    }
    supabaseService.toggleZoneMute('ZONE_A', nextMuted);
    if (onShowToast) {
      onShowToast(nextMuted ? 'warning' : 'success', nextMuted ? 'تم كتم سماعات الساحة الخارجية' : 'تم إلغاء كتم سماعات الساحة', 'تحكم الساحة');
    }
  };

  const handleYardVolumeChange = (newVol: number) => {
    setYardVolume(newVol);
    audioPlayerService.setVolume(newVol);
    supabaseService.updateZoneVolume('ZONE_A', newVol);
  };

  return (
    <div className="flex flex-col gap-space-lg w-full">
      {/* Broadcast Status Pill */}
      <div className="flex items-center justify-between">
        {hasTracks ? (
          <span className="inline-flex items-center gap-1.5 px-space-md py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed font-bold text-xs shadow-sm">
            <span className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-teal-dark animate-ping' : 'bg-amber-500'}`}></span>
            {isPlaying ? 'بث حي مستمر' : 'البث متوقف مؤقتاً'}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-space-md py-1 rounded-full bg-surface-container-high text-on-surface-variant font-bold text-xs shadow-sm">
            <span className="w-2 h-2 rounded-full bg-slate-400"></span>
            الإذاعة في وضع الاستعداد
          </span>
        )}
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
            {isPlaying && hasTracks && (
              <span className="absolute bottom-1 right-1 w-2.5 h-2.5 rounded-full bg-teal-accent ring-2 ring-primary-container animate-pulse"></span>
            )}
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <span className="text-[11px] font-bold text-teal-dark uppercase tracking-wider bg-secondary-container/40 px-2 py-0.5 rounded-md">
                {hasTracks ? (currentTrack?.session === 'NOON_BREAK' ? 'استراحة الظهيرة' : 'إذاعة الصباح') : 'وضع الاستعداد'}
              </span>
              <span className="text-[10px] font-mono text-on-surface-variant bg-surface-container-low px-1.5 py-0.5 rounded">
                {hasTracks ? 'بث رقمي عالي النقاء' : 'في انتظار البرمجة'}
              </span>
            </div>
            <h3 className="font-bold text-[15px] md:text-[16px] text-on-surface mt-1 truncate">
              {hasTracks ? currentTrack?.title : 'الإذاعة في وضع الاستعداد - لا توجد فقرة محددة'}
            </h3>
            <p className="text-[12px] text-on-surface-variant truncate">
              {hasTracks
                ? (currentTrack?.speaker_or_artist || 'إعداد الإذاعة المدرسية')
                : 'يرجى إضافة مقاطع وفقرات من تبويب قائمة الاستراحات'}
            </p>
          </div>
        </div>

        {/* Live Chained Bell Status Alert */}
        {isBellRinging && (
          <div className="p-space-sm px-space-md rounded-xl bg-teal-dark/10 border border-teal-dark/30 flex items-center justify-between text-xs text-teal-dark font-bold animate-pulse">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">notifications_active</span>
              <span>جاري رنين جرس {chainedSessionName || 'الاستراحة'} المدرسية — ستبدأ الإذاعة تلقائياً</span>
            </div>
            <span className="font-mono bg-teal-dark text-white px-2 py-0.5 rounded-lg text-xs shadow-xs">
              متبقي: {bellSecondsRemaining}ث
            </span>
          </div>
        )}

        {/* Audio Waveform Visualizer */}
        <div className="bg-surface-container-low p-space-md rounded-xl border border-surface-container flex flex-col gap-2">
          <div className="flex items-center justify-between text-[11px] text-on-surface-variant font-mono">
            <span>WAVEFORM LIVE</span>
            <span className="text-teal-dark font-bold">
              {hasTracks && isPlaying ? '24-bit • 48 kHz PCM' : 'جاهز للتشغيل'}
            </span>
          </div>
          <div className="flex items-center justify-center gap-1.5 h-14 overflow-hidden px-2">
            {[35, 60, 45, 85, 95, 70, 40, 65, 80, 50, 90, 100, 75, 45, 60, 85, 70, 40, 55, 75, 65, 90, 80, 50].map((height, i) => (
              <div
                key={i}
                className={`w-1 rounded-full transition-all duration-300 ${
                  isPlaying && hasTracks ? 'bg-teal-dark' : 'bg-surface-container-highest'
                }`}
                style={{
                  height: isPlaying && hasTracks ? `${Math.max(15, (height * (yardVolume / 100)))}%` : '15%',
                  animation: isPlaying && hasTracks ? `pulse-wave ${(0.6 + (i % 5) * 0.2)}s ease-in-out infinite ${(i % 4) * 0.15}s` : 'none',
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
              style={{ width: `${totalDuration > 0 ? (progress / totalDuration) * 100 : 0}%` }}
            ></div>
          </div>
          <div className="flex items-center justify-between text-[12px] text-on-surface-variant font-mono">
            <span className="text-teal-dark font-bold">
              {hasTracks ? `متبقي: ${formatSeconds(remainingSeconds)}` : 'متبقي: --:--'}
            </span>
            <span>
              {hasTracks ? `الإجمالي: ${formatSeconds(totalDuration)}` : 'الإجمالي: --:--'}
            </span>
          </div>
        </div>

        {/* Player Controls */}
        <div className="flex items-center justify-center gap-space-lg py-1">
          <button
            type="button"
            disabled={!hasTracks}
            onClick={toggleShuffle}
            className={`transition-all p-1.5 rounded-lg active:scale-90 ${
              isShuffle
                ? 'text-teal-dark bg-secondary-container/50 font-bold ring-1 ring-teal-dark/30 shadow-sm'
                : 'text-on-surface-variant hover:text-teal-dark disabled:opacity-30'
            }`}
            title={isShuffle ? 'إلغاء التشغيل العشوائي' : 'تشغيل عشوائي'}
          >
            <span className="material-symbols-outlined text-xl">shuffle</span>
          </button>
          <button
            type="button"
            disabled={!hasTracks || currentTrackIndex === 0}
            onClick={handlePrevTrack}
            className="text-on-surface hover:text-teal-dark disabled:opacity-30 transition-colors p-1 active:scale-90"
            title="المقطع السابق"
          >
            <span className="material-symbols-outlined text-2xl">skip_previous</span>
          </button>
          <button
            type="button"
            disabled={!hasTracks}
            onClick={handleTogglePlay}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-md active:scale-95 ring-4 ${
              hasTracks
                ? 'bg-teal-dark text-on-primary hover:bg-secondary ring-teal-dark/20'
                : 'bg-surface-container text-on-surface-variant opacity-50 cursor-not-allowed ring-transparent'
            }`}
            title={isPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
          >
            <span className="material-symbols-outlined text-3xl">
              {isPlaying ? 'pause' : 'play_arrow'}
            </span>
          </button>
          <button
            type="button"
            disabled={!hasTracks || currentTrackIndex >= tracks.length - 1}
            onClick={handleNextTrack}
            className="text-on-surface hover:text-teal-dark disabled:opacity-30 transition-colors p-1 active:scale-90"
            title="المقطع التالي"
          >
            <span className="material-symbols-outlined text-2xl">skip_next</span>
          </button>
          <button
            type="button"
            disabled={!hasTracks}
            onClick={toggleRepeat}
            className={`transition-all p-1.5 rounded-lg active:scale-90 ${
              isRepeat
                ? 'text-teal-dark bg-secondary-container/50 font-bold ring-1 ring-teal-dark/30 shadow-sm'
                : 'text-on-surface-variant hover:text-teal-dark disabled:opacity-30'
            }`}
            title={isRepeat ? 'إلغاء تكرار الفقرة' : 'تكرار الفقرة'}
          >
            <span className="material-symbols-outlined text-xl">repeat</span>
          </button>
        </div>

        {/* Yard Mute Toggle & Volume Controls */}
        <div className="flex items-center justify-between gap-space-md pt-space-sm border-t border-surface-container bg-surface-container-low p-space-md rounded-xl">
          <button
            type="button"
            onClick={handleYardMute}
            className={`flex items-center gap-1.5 px-space-md py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95 ${
              isYardMuted
                ? 'bg-error text-on-error animate-pulse'
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
              onChange={(e) => handleYardVolumeChange(Number(e.target.value))}
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

        {/* Tracks List or Empty State */}
        {hasTracks ? (
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
        ) : (
          <div className="py-6 px-4 bg-surface-container-low rounded-xl border border-dashed border-surface-container-highest flex flex-col items-center justify-center text-center gap-2">
            <span className="material-symbols-outlined text-3xl text-on-surface-variant/60">radio</span>
            <p className="text-xs font-bold text-on-surface">لا توجد فقرات إذاعية مسجلة حالياً</p>
            <p className="text-[11px] text-on-surface-variant max-w-[240px]">
              يمكنك إدراج مواد صوتية وأناشيد وفقرات توعوية للتشغيل في الفسحة المدرسية.
            </p>
          </div>
        )}

        {/* Insert Track Action */}
        <button
          type="button"
          onClick={onInsertTrack}
          className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl border border-dashed border-teal-dark/40 hover:border-teal-dark bg-secondary-container/10 hover:bg-secondary-container/20 text-teal-dark font-bold text-xs transition-all"
        >
          <span className="material-symbols-outlined text-base">add_circle</span>
          <span>إدراج فقرة إذاعية جديدة</span>
        </button>
      </div>
    </div>
  );
};
