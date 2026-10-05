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
  // 12 minutes 8 seconds countdown = 728 seconds
  const [secondsLeft, setSecondsLeft] = useState<number>(728);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 728));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const hours = Math.floor(secondsLeft / 3600);
  const minutes = Math.floor((secondsLeft % 3600) / 60);
  const seconds = secondsLeft % 60;

  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <div className="flex flex-col gap-space-lg w-full">
      {/* 1. Next Scheduled Event Card with Countdown */}
      <div className="bg-primary-container text-on-primary rounded-2xl p-space-lg shadow-md border border-teal-dark/30 flex flex-col gap-space-md relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-teal-dark/15 rounded-full blur-2xl pointer-events-none"></div>

        <div className="flex items-center justify-between z-10">
          <span className="px-space-md py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed font-bold text-xs shadow-sm">
            الحدث المجدول القادم
          </span>
          <span className="text-[11px] text-teal-accent font-mono">
            نظام الجدولة الذكي
          </span>
        </div>

        <div className="z-10">
          <h3 className="font-bold text-[16px] text-white leading-tight">
            رن جرس الاستراحة التلقائي + تشغيل الرسائل التوعوية
          </h3>
          <p className="text-[12px] text-slate-300 mt-1">
            استراحة الصباح الأولى لكافة المرافق والساحات
          </p>
        </div>

        {/* Large Digital Countdown Display */}
        <div className="bg-slate-deep/80 rounded-xl p-space-md border border-white/10 flex items-center justify-center gap-3 z-10 my-1">
          {/* Hours */}
          <div className="flex flex-col items-center">
            <span className="font-mono text-3xl font-extrabold text-white tracking-wider">
              {pad(hours)}
            </span>
            <span className="text-[10px] text-slate-400 font-medium mt-0.5">ساعة</span>
          </div>

          <span className="font-mono text-2xl font-bold text-teal-accent mb-3">:</span>

          {/* Minutes */}
          <div className="flex flex-col items-center">
            <span className="font-mono text-3xl font-extrabold text-teal-accent tracking-wider">
              {pad(minutes)}
            </span>
            <span className="text-[10px] text-teal-accent font-medium mt-0.5">دقيقة</span>
          </div>

          <span className="font-mono text-2xl font-bold text-teal-accent mb-3">:</span>

          {/* Seconds */}
          <div className="flex flex-col items-center">
            <span className="font-mono text-3xl font-extrabold text-white tracking-wider animate-pulse">
              {pad(seconds)}
            </span>
            <span className="text-[10px] text-slate-400 font-medium mt-0.5">ثانية</span>
          </div>
        </div>

        {/* Bottom Time and Quick Edit */}
        <div className="flex items-center justify-between pt-2 border-t border-white/10 z-10">
          <div className="flex items-center gap-1.5 text-xs text-slate-300">
            <span className="material-symbols-outlined text-sm text-teal-accent">alarm</span>
            <span>الموعد الدقيق: <strong className="text-white font-mono">10:00 ص</strong></span>
          </div>
          <button
            type="button"
            onClick={onEditNextEvent}
            className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors"
          >
            تعديل الموعد
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
            الإثنين 15 شعبان
          </span>
        </div>

        {/* Timeline Items */}
        <div className="relative pr-6 flex flex-col gap-4 before:absolute before:right-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-surface-container-highest">
          {schedules.map((item, idx) => {
            const isCompleted = idx < 2;
            const isCurrent = idx === 2;
            const isAdhan = item.bell_time.startsWith('12:05');

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
                      {item.bell_time} {item.bell_time.startsWith('12') || item.bell_time.startsWith('14') ? 'م' : 'ص'}
                    </span>
                  </div>

                  <p className="text-[11px] text-on-surface-variant mt-1 leading-snug">
                    {item.details}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* View Full Schedule Button */}
        <button
          type="button"
          onClick={onOpenSchedules}
          className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-highest text-on-surface font-bold text-xs transition-colors border border-surface-container-high"
        >
          <span className="material-symbols-outlined text-base text-teal-dark">calendar_month</span>
          <span>عرض وتعديل جدول الأجراس الكامل</span>
        </button>
      </div>
    </div>
  );
};
