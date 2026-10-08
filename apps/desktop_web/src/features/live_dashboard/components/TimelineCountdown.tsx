import React, { useState, useEffect } from 'react';
import { BellSchedule, parseScheduleDetails } from '../../../types';
import { audioPlayerService, AudioPlayerState } from '../../../core/audioPlayerService';
import { Icon } from '../../../components/common/Icon';

interface TimelineCountdownProps {
  schedules: BellSchedule[];
  onOpenSchedules: () => void;
  onEditNextEvent: () => void;
}

export const TimelineCountdown: React.FC<TimelineCountdownProps> = ({
  schedules,
  onOpenSchedules,
  onEditNextEvent,
}) => {
  const hasSchedules = schedules && schedules.length > 0;
  const [now, setNow] = useState<Date>(new Date());
  const [audioState, setAudioState] = useState<AudioPlayerState>(audioPlayerService.getCurrentState());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);

    const unsubAudio = audioPlayerService.subscribe((state) => {
      setAudioState(state);
    });

    return () => {
      clearInterval(timer);
      unsubAudio();
    };
  }, []);

  const timeToSeconds = (timeStr: string) => {
    const parts = (timeStr || '00:00').split(':').map(Number);
    const h = parts[0] || 0;
    const m = parts[1] || 0;
    const s = parts[2] || 0;
    return h * 3600 + m * 60 + s;
  };

  const currentSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();

  // Current Day of Week: Monday=1, Tuesday=2, ..., Saturday=6, Sunday=7
  const currentDayId = now.getDay() === 0 ? 7 : now.getDay();

  const enabledSchedules = hasSchedules 
    ? schedules.filter((s) => {
        if (!s.is_enabled) return false;
        const meta = parseScheduleDetails(s.details);
        const days = s.days_of_week && s.days_of_week.length > 0 
          ? s.days_of_week 
          : (meta.days_of_week && meta.days_of_week.length > 0 ? meta.days_of_week : [1, 2, 3, 4, 5, 6]);
        return days.includes(currentDayId);
      }) 
    : [];

  const sortedSchedules = [...enabledSchedules].sort(
    (a, b) => timeToSeconds(a.bell_time) - timeToSeconds(b.bell_time)
  );

  // Check if an event is currently ringing right now
  const activeNowSchedule = sortedSchedules.find((s) => {
    const sSecs = timeToSeconds(s.bell_time);
    const dur = s.duration_seconds || 15;
    return currentSeconds >= sSecs && currentSeconds < sSecs + dur;
  });

  // Next upcoming schedule
  let nextSchedule: BellSchedule | undefined = activeNowSchedule || sortedSchedules.find(
    (s) => timeToSeconds(s.bell_time) >= currentSeconds
  );
  let secondsLeft = 0;

  if (activeNowSchedule) {
    secondsLeft = 0;
  } else if (nextSchedule) {
    secondsLeft = Math.max(0, timeToSeconds(nextSchedule.bell_time) - currentSeconds);
  } else if (sortedSchedules.length > 0) {
    nextSchedule = sortedSchedules[0];
    secondsLeft = 86400 - currentSeconds + timeToSeconds(nextSchedule.bell_time);
  }

  const hours = Math.floor(secondsLeft / 3600);
  const minutes = Math.floor((secondsLeft % 3600) / 60);
  const seconds = secondsLeft % 60;

  const pad = (n: number) => String(n).padStart(2, '0');

  const currentDateFormatted = now.toLocaleDateString('ar-MA', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const getScheduleDisplayMeta = (sched?: BellSchedule) => {
    if (!sched) return { badge: null, cleanDescription: '', isAdhan: false };
    const meta = parseScheduleDetails(sched.details);
    const actionType = sched.action_type || meta.action_type;
    const isAdhan = sched.bell_type === 'ATHAN' || sched.label.includes('أذان') || sched.label.includes('صلاة');

    let badge: { label: string; icon: string; style: string } | null = null;
    if (isAdhan) {
      badge = {
        label: 'أذان الصلاة',
        icon: 'mosque',
        style: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40',
      };
    } else if (actionType === 'DIRECT_AUDIO') {
      const title = sched.media_title || meta.media_title || 'مقطع صوتي مباشر';
      badge = {
        label: `بث صوتي: ${title}`,
        icon: 'music_note',
        style: 'bg-indigo-400/20 text-indigo-200 border-indigo-400/30',
      };
    } else if (actionType === 'BELL_THEN_PLAYLIST') {
      const sessionName = (sched.playlist_session || meta.playlist_session) === 'NOON_BREAK' ? 'استراحة الظهيرة' : 'إذاعة الاستراحة';
      badge = {
        label: `جرس يتبعه ${sessionName}`,
        icon: 'auto_mode',
        style: 'bg-teal-accent/20 text-teal-accent border-teal-accent/30',
      };
    }

    let cleanDescription = (meta.description || '').trim();
    if (cleanDescription.startsWith('{') || cleanDescription.includes('"action_type"')) {
      cleanDescription = '';
    }

    return { badge, cleanDescription, isAdhan };
  };

  const nextMeta = getScheduleDisplayMeta(nextSchedule);

  return (
    <div className="flex flex-col gap-space-lg w-full">
      {/* 1. Next Scheduled Event Card with Countdown */}
      <div className="bg-primary-container text-on-primary rounded-2xl p-space-lg shadow-md border border-teal-dark/30 flex flex-col gap-space-md relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-teal-dark/15 rounded-full blur-2xl pointer-events-none"></div>

        <div className="flex items-center justify-between z-10">
          <span className={`px-space-md py-1 rounded-full font-bold text-xs shadow-sm flex items-center gap-1.5 ${
            activeNowSchedule || audioState.isBellRinging
              ? 'bg-amber-400 text-slate-deep animate-pulse'
              : 'bg-secondary-fixed text-on-secondary-fixed'
          }`}>
            {(activeNowSchedule || audioState.isBellRinging) && (
              <Icon name="notifications_active" size={14} className="animate-spin" />
            )}
            {activeNowSchedule || audioState.isBellRinging
              ? '🔔 جاري انطلاق الموعد ورنين الجرس الآن!'
              : hasSchedules ? 'الحدث المجدول القادم' : 'جدولة الأجراس'}
          </span>
          <span className="text-[11px] text-teal-accent font-mono">
            نظام الجدولة الذكي
          </span>
        </div>

        <div className="z-10">
          <h3 className="font-bold text-[16px] text-white leading-tight">
            {hasSchedules
              ? (nextSchedule?.label || 'انتهت كافة أجراس اليوم المجدولة')
              : 'لا توجد أجراس مجدولة حالياً'}
          </h3>
          {nextMeta.badge && (
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${nextMeta.badge.style}`}>
                <Icon name={nextMeta.badge.icon} size={12} />
                <span>{nextMeta.badge.label}</span>
              </span>
            </div>
          )}
          <p className="text-[12px] text-slate-300 mt-1">
            {activeNowSchedule || audioState.isBellRinging
              ? `الموعد المحدد حان الآن (${nextSchedule?.bell_time}) - جاري البث الصوتي التلقائي.`
              : hasSchedules
              ? (nextMeta.cleanDescription || 'الموعد المبرمج التالي في خطة الدوام المدرسي')
              : 'يرجى إضافة مواعيد الحصص وجداول الأجراس لبدء الجدولة الذكية'}
          </p>
        </div>

        {/* Large Digital Countdown Display */}
        <div className="bg-slate-deep/80 rounded-xl p-space-md border border-white/10 flex items-center justify-center gap-3 z-10 my-1">
          {/* Hours */}
          <div className="flex flex-col items-center">
            <span className="font-mono text-3xl font-extrabold text-white tracking-wider">
              {hasSchedules && nextSchedule ? pad(hours) : '--'}
            </span>
            <span className="text-[10px] text-slate-400 font-medium mt-0.5">ساعة</span>
          </div>

          <span className="font-mono text-2xl font-bold text-teal-accent mb-3">:</span>

          {/* Minutes */}
          <div className="flex flex-col items-center">
            <span className="font-mono text-3xl font-extrabold text-teal-accent tracking-wider">
              {hasSchedules && nextSchedule ? pad(minutes) : '--'}
            </span>
            <span className="text-[10px] text-teal-accent font-medium mt-0.5">دقيقة</span>
          </div>

          <span className="font-mono text-2xl font-bold text-teal-accent mb-3">:</span>

          {/* Seconds */}
          <div className="flex flex-col items-center">
            <span className="font-mono text-3xl font-extrabold text-white tracking-wider animate-pulse">
              {hasSchedules && nextSchedule ? pad(seconds) : '--'}
            </span>
            <span className="text-[10px] text-slate-400 font-medium mt-0.5">ثانية</span>
          </div>
        </div>

        {/* Bottom Time and Quick Edit */}
        <div className="flex items-center justify-between pt-2 border-t border-white/10 z-10">
          <div className="flex items-center gap-1.5 text-xs text-slate-300">
            <Icon name="schedule" size={14} className="text-teal-accent" />
            <span>
              {hasSchedules && nextSchedule ? (
                <>الموعد: <strong className="text-white font-mono">{nextSchedule.bell_time}</strong></>
              ) : (
                'في انتظار برمجة الحصص'
              )}
            </span>
          </div>
          <button
            type="button"
            onClick={hasSchedules ? onEditNextEvent : onOpenSchedules}
            className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors"
          >
            {hasSchedules ? 'تعديل الموعد' : 'إضافة مواعيد الحصص'}
          </button>
        </div>
      </div>

      {/* 2. Daily Sequential Timeline Card */}
      <div className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm border border-surface-container-high/60 flex flex-col gap-space-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon name="timeline" size={20} className="text-teal-dark" />
            <h4 className="font-bold text-[15px] text-on-surface">الجدول اليومي التتابعي</h4>
          </div>
          <span className="text-[11px] font-bold text-on-surface-variant bg-surface-container-low px-2 py-0.5 rounded-full">
            {currentDateFormatted}
          </span>
        </div>

        {/* Timeline Items or Empty State */}
        {hasSchedules ? (
          <div className="relative pr-6 flex flex-col gap-4 before:absolute before:right-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-surface-container-highest">
            {sortedSchedules.map((item) => {
              const itemSecs = timeToSeconds(item.bell_time);
              const isCurrentlyRinging = activeNowSchedule?.id === item.id || (audioState.isBellRinging && nextSchedule?.id === item.id);
              const isCompleted = itemSecs < currentSeconds && !isCurrentlyRinging;
              const isCurrent = nextSchedule?.id === item.id || isCurrentlyRinging;
              const meta = getScheduleDisplayMeta(item);

              return (
                <div key={item.id} className="relative flex items-start gap-3 group">
                  {/* Node Bullet */}
                  <div
                    className={`absolute -right-6 top-1 w-5 h-5 rounded-full flex items-center justify-center ring-4 ring-surface-container-lowest transition-all ${
                      isCurrentlyRinging
                        ? 'bg-amber-400 text-slate-deep ring-amber-400/40 animate-pulse'
                        : isCompleted
                        ? 'bg-teal-dark text-white'
                        : isCurrent
                        ? 'bg-teal-accent text-slate-deep animate-bounce ring-teal-dark/20'
                        : meta.isAdhan
                        ? 'bg-emerald-600 text-white'
                        : 'bg-surface-container-highest text-on-surface-variant'
                    }`}
                  >
                    <Icon
                      name={
                        isCurrentlyRinging
                          ? 'volume_up'
                          : isCompleted
                          ? 'check'
                          : isCurrent
                          ? 'notifications_active'
                          : meta.isAdhan
                          ? 'mosque'
                          : 'schedule'
                      }
                      size={12}
                    />
                  </div>

                  {/* Content Box */}
                  <div
                    className={`flex-1 p-2.5 rounded-xl border transition-all ${
                      isCurrentlyRinging
                        ? 'bg-amber-500/10 border-amber-500/40 ring-2 ring-amber-500/30 shadow-md'
                        : isCurrent
                        ? 'bg-secondary-container/25 border-teal-dark/30 ring-1 ring-teal-dark/30 shadow-sm'
                        : 'bg-surface-container-low border-surface-container hover:bg-surface-container'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-[13px] text-on-surface">
                          {item.label}
                        </span>
                        {isCurrentlyRinging && (
                          <span className="px-1.5 py-0.2 rounded bg-amber-400 text-slate-deep text-[10px] font-bold animate-pulse">
                            رنين مستمر
                          </span>
                        )}
                        {meta.badge && (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.2 rounded-full text-[10px] font-bold border ${meta.badge.style}`}>
                            <Icon name={meta.badge.icon} size={11} />
                            <span>{meta.badge.label}</span>
                          </span>
                        )}
                      </div>
                      <span
                        className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${
                          isCurrentlyRinging
                            ? 'bg-amber-400 text-slate-deep'
                            : isCurrent
                            ? 'bg-teal-dark text-white'
                            : meta.isAdhan
                            ? 'bg-emerald-600 text-white'
                            : 'bg-surface-container text-on-surface-variant'
                        }`}
                      >
                        {item.bell_time}
                      </span>
                    </div>

                    {meta.cleanDescription && (
                      <p className="text-[11px] text-on-surface-variant mt-1 leading-snug">
                        {meta.cleanDescription}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

        ) : (
          <div className="py-8 px-4 bg-surface-container-low rounded-xl border border-dashed border-surface-container-highest flex flex-col items-center justify-center text-center gap-2.5">
            <Icon name="event_busy" size={40} className="text-on-surface-variant/50" />
            <p className="text-sm font-bold text-on-surface">لا توجد أجراس مجدولة حالياً، يرجى إضافة مواعيد الحصص</p>
            <p className="text-xs text-on-surface-variant max-w-[280px]">
              النظام جاهز ونظيف تماماً لإدخال مواعيد الحصص وفترات الاستراحة الخاصة بمؤسستكم التعليمية.
            </p>
          </div>
        )}

        {/* View Full Schedule Button */}
        <button
          type="button"
          onClick={onOpenSchedules}
          className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-highest text-on-surface font-bold text-xs transition-colors border border-surface-container-high"
        >
          <Icon name="calendar_month" size={16} className="text-teal-dark" />
          <span>{hasSchedules ? 'عرض وتعديل جدول الأجراس الكامل' : 'إضافة مواعيد الحصص المدرسية'}</span>
        </button>
      </div>
    </div>
  );
};
