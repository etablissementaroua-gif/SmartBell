import React, { useState, useEffect } from 'react';
import { BellSchedule } from '../../../types';

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

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const timeToSeconds = (timeStr: string) => {
    const parts = (timeStr || '00:00').split(':').map(Number);
    const h = parts[0] || 0;
    const m = parts[1] || 0;
    const s = parts[2] || 0;
    return h * 3600 + m * 60 + s;
  };

  const currentSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();

  const enabledSchedules = hasSchedules ? schedules.filter((s) => s.is_enabled) : [];
  const sortedSchedules = [...enabledSchedules].sort(
    (a, b) => timeToSeconds(a.bell_time) - timeToSeconds(b.bell_time)
  );

  let nextSchedule: BellSchedule | undefined = sortedSchedules.find(
    (s) => timeToSeconds(s.bell_time) > currentSeconds
  );
  let secondsLeft = 0;

  if (nextSchedule) {
    secondsLeft = timeToSeconds(nextSchedule.bell_time) - currentSeconds;
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

  return (
    <div className="flex flex-col gap-space-lg w-full">
      {/* 1. Next Scheduled Event Card with Countdown */}
      <div className="bg-primary-container text-on-primary rounded-2xl p-space-lg shadow-md border border-teal-dark/30 flex flex-col gap-space-md relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-teal-dark/15 rounded-full blur-2xl pointer-events-none"></div>

        <div className="flex items-center justify-between z-10">
          <span className="px-space-md py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed font-bold text-xs shadow-sm">
            {hasSchedules ? 'الحدث المجدول القادم' : 'جدولة الأجراس'}
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
          <p className="text-[12px] text-slate-300 mt-1">
            {hasSchedules
              ? (nextSchedule?.details || 'الموعد المبرمج التالي في خطة الدوام المدرسي')
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
            <span className="material-symbols-outlined text-sm text-teal-accent">alarm</span>
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
            <span className="material-symbols-outlined text-teal-dark text-xl">timeline</span>
            <h4 className="font-bold text-[15px] text-on-surface">الجدول اليومي التتابعي</h4>
          </div>
          <span className="text-[11px] font-bold text-on-surface-variant bg-surface-container-low px-2 py-0.5 rounded-full">
            {currentDateFormatted}
          </span>
        </div>

        {/* Timeline Items or Empty State */}
        {hasSchedules ? (
          <div className="relative pr-6 flex flex-col gap-4 before:absolute before:right-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-surface-container-highest">
            {schedules.map((item) => {
              const itemSecs = timeToSeconds(item.bell_time);
              const isCompleted = itemSecs < currentSeconds;
              const isCurrent = nextSchedule?.id === item.id;
              const isAdhan = item.bell_type === 'BREAK' && (item.label.includes('أذان') || item.label.includes('صلاة'));

              return (
                <div key={item.id} className="relative flex items-start gap-3 group">
                  {/* Node Bullet */}
                  <div
                    className={`absolute -right-6 top-1 w-5 h-5 rounded-full flex items-center justify-center ring-4 ring-surface-container-lowest transition-all ${
                      isCompleted
                        ? 'bg-teal-dark text-white'
                        : isCurrent
                        ? 'bg-teal-accent text-slate-deep animate-bounce ring-teal-dark/20'
                        : isAdhan
                        ? 'bg-primary-container text-teal-accent'
                        : 'bg-surface-container-highest text-on-surface-variant'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[13px]">
                      {isCompleted
                        ? 'check'
                        : isCurrent
                        ? 'notifications_active'
                        : isAdhan
                        ? 'mosque'
                        : 'schedule'}
                    </span>
                  </div>

                  {/* Content Box */}
                  <div
                    className={`flex-1 p-2.5 rounded-xl border transition-all ${
                      isCurrent
                        ? 'bg-secondary-container/25 border-teal-dark/30 ring-1 ring-teal-dark/30 shadow-sm'
                        : 'bg-surface-container-low border-surface-container hover:bg-surface-container'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-bold text-[13px] text-on-surface">
                        {item.label}
                      </span>
                      <span
                        className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${
                          isCurrent
                            ? 'bg-teal-dark text-white'
                            : isAdhan
                            ? 'bg-primary-container text-teal-accent'
                            : 'bg-surface-container text-on-surface-variant'
                        }`}
                      >
                        {item.bell_time}
                      </span>
                    </div>

                    {item.details && (
                      <p className="text-[11px] text-on-surface-variant mt-1 leading-snug">
                        {item.details}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-8 px-4 bg-surface-container-low rounded-xl border border-dashed border-surface-container-highest flex flex-col items-center justify-center text-center gap-2.5">
            <span className="material-symbols-outlined text-4xl text-on-surface-variant/50">event_busy</span>
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
          <span className="material-symbols-outlined text-base text-teal-dark">calendar_month</span>
          <span>{hasSchedules ? 'عرض وتعديل جدول الأجراس الكامل' : 'إضافة مواعيد الحصص المدرسية'}</span>
        </button>
      </div>
    </div>
  );
};
