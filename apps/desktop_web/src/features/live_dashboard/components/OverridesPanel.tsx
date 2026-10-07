import React, { useState, useEffect } from 'react';
import { supabaseService } from '../../../core/supabaseService';

interface OverridesPanelProps {
  isEmergencyMuted: boolean;
  onToggleEmergencyMute: () => void;
  onTriggerInstantBell: (
    bellName: string,
    duration: number,
    command: 'INSTANT_ENTRY' | 'INSTANT_EXIT' | 'PERIOD_END',
    targetZone?: string
  ) => void;
  onShowToast?: (type: 'success' | 'error' | 'info' | 'warning', message: string, title?: string) => void;
}

export const OverridesPanel: React.FC<OverridesPanelProps> = ({
  isEmergencyMuted,
  onToggleEmergencyMute,
  onTriggerInstantBell,
  onShowToast,
}) => {
  const [isMicActive, setIsMicActive] = useState<boolean>(false);
  const [selectedZones, setSelectedZones] = useState<string[]>([
    'الساحة الرئيسية',
    'الممرات الداخلية',
  ]);
  const [countdown, setCountdown] = useState<{ bell: string; secondsLeft: number } | null>(null);
  const [vuLevel, setVuLevel] = useState<number>(0);
  const [showInstantBells, setShowInstantBells] = useState<boolean>(false);

  // Dynamic VU Meter animation while mic is active
  useEffect(() => {
    let interval: any;
    if (isMicActive) {
      interval = setInterval(() => {
        // Random level between 5 and 11 to create realistic live audio bouncing
        const lvl = Math.floor(Math.random() * 7) + 5;
        setVuLevel(lvl);
      }, 140);
    } else {
      setVuLevel(0);
    }
    return () => clearInterval(interval);
  }, [isMicActive]);

  const toggleZone = (zone: string) => {
    setSelectedZones((prev) =>
      prev.includes(zone) ? prev.filter((z) => z !== zone) : [...prev, zone]
    );
  };

  const handlePlayBell = (
    bellName: string,
    duration: number,
    command: 'INSTANT_ENTRY' | 'INSTANT_EXIT' | 'PERIOD_END'
  ) => {
    if (countdown !== null) return; // Prevent multiple overlapping chimes

    // Audio chime feedback in browser
    supabaseService.playSchoolBell();

    const target = selectedZones.join(',') || 'ALL';
    onTriggerInstantBell(bellName, duration, command, target);

    setCountdown({ bell: bellName, secondsLeft: duration });

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (!prev || prev.secondsLeft <= 1) {
          clearInterval(timer);
          if (onShowToast) {
            onShowToast('success', `اكتمل رنين [${bellName}] بنجاح`, 'اكتمل الرنين');
          }
          return null;
        }
        return { ...prev, secondsLeft: prev.secondsLeft - 1 };
      });
    }, 1000);
  };

  const handleToggleMic = async () => {
    const nextState = !isMicActive;
    setIsMicActive(nextState);

    // Audio tone cue
    supabaseService.playLocalBeep(nextState ? 660 : 440, 0.2);

    const target = selectedZones.join(',') || 'ALL';
    await supabaseService.triggerInstantOverride(
      'MIC_BROADCAST',
      target,
      { action: nextState ? 'START' : 'STOP' }
    );

    if (onShowToast) {
      if (nextState) {
        onShowToast('info', `تم فتح الميكروفون للبث المباشر على نطاق: ${target}`, 'المايك المباشر');
      } else {
        onShowToast('info', 'تم إغلاق الميكروفون المباشر وتوقف البث الصوتي.', 'المايك المباشر');
      }
    }
  };

  return (
    <div className="flex flex-col gap-space-lg w-full">
      {/* Top Meta Badges */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 px-space-md py-1 rounded-full bg-surface-container-high text-on-surface font-bold text-xs">
          <span className="material-symbols-outlined text-sm text-teal-dark">event_available</span>
          <span>الدوام المدرسي الكامل</span>
        </div>
        <div className="flex items-center gap-1.5 px-space-md py-1 rounded-full bg-surface-container-low text-on-surface-variant font-mono text-xs">
          <span className="material-symbols-outlined text-sm text-teal-dark">speaker_group</span>
          <span>مكبرات الصوت النشطة</span>
        </div>
      </div>

      {/* 1. Master Emergency Silence Card */}
      <div className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm border border-error/30 flex flex-col gap-space-md relative overflow-hidden">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-space-sm">
            <div className="w-10 h-10 rounded-xl bg-error-container text-error flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-2xl">warning</span>
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-[15px] text-error leading-tight">صمت الطوارئ العام</span>
              <span className="text-[11px] text-on-surface-variant">إيقاف فوري لكافة الأحداث والمكبرات</span>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-error-container text-on-error-container font-mono text-[10px] font-bold">
            PRIORITY 1
          </span>
        </div>

        <p className="text-[12px] text-on-surface-variant leading-relaxed">
          يقوم هذا الزر بكتم جميع مصادر الصوت الحالية (الإذاعة المدرسية، الميكروفون، والأجراس التلقائية) لحظياً عن كافة أرجاء المدرسة.
        </p>

        <button
          type="button"
          onClick={onToggleEmergencyMute}
          className={`w-full py-3.5 px-space-lg rounded-xl font-bold text-[14px] flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 ${
            isEmergencyMuted
              ? 'bg-teal-dark hover:bg-teal-dark/90 text-on-primary ring-4 ring-teal-dark/30 animate-pulse'
              : 'bg-error hover:bg-error/90 text-on-error shadow-error/30'
          }`}
        >
          <span className="material-symbols-outlined text-xl">
            {isEmergencyMuted ? 'check_circle' : 'emergency_share'}
          </span>
          <span>
            {isEmergencyMuted
              ? 'صمت الطوارئ مفعل حالياً (اضغط لإلغاء الصمت)'
              : 'تفعيل الصمت الفوري الكامل بكافة الأرجاء'}
          </span>
        </button>
      </div>

      {/* 2. Instant Overrides (أجراس التجاوز الفوري - قابلة للطي لتخفيف واجهة الهاتف) */}
      <div className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm border border-surface-container-high/60 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => setShowInstantBells(!showInstantBells)}
          className="flex items-center justify-between w-full text-right p-1 hover:bg-surface-container-low rounded-lg transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-teal-dark text-xl">notification_important</span>
            <div className="flex flex-col">
              <h4 className="font-bold text-[14px] text-on-surface">أجراس التجاوز اليدوي المباشر</h4>
              <span className="text-[10px] text-on-surface-variant">رنين فوري لدخول الطلاب والانصراف وتنبيه الحصة</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-teal-dark bg-secondary-fixed/50 px-2 py-0.5 rounded-full">
              {showInstantBells ? 'إخفاء الأزرار' : 'إظهار الأزرار'}
            </span>
            <span className="material-symbols-outlined text-on-surface-variant text-base">
              {showInstantBells ? 'expand_less' : 'expand_more'}
            </span>
          </div>
        </button>

        {showInstantBells && (
          <div className="flex flex-col gap-2.5 pt-2 border-t border-surface-container">
            {/* Bell 1: Instant Entry */}
            <div className={`p-3 rounded-xl border transition-all flex items-center justify-between ${
              countdown?.bell === 'جرس الدخول المباشر'
                ? 'bg-primary-container text-white border-teal-dark shadow-md ring-2 ring-teal-dark/30'
                : 'bg-surface-container-low border-surface-container hover:bg-surface-container'
            }`}>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handlePlayBell('جرس الدخول المباشر', 20, 'INSTANT_ENTRY')}
                  disabled={countdown !== null}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-sm ${
                    countdown?.bell === 'جرس الدخول المباشر'
                      ? 'bg-teal-dark text-white ring-4 ring-teal-dark/40 animate-pulse'
                      : 'bg-primary text-on-primary hover:bg-teal-dark disabled:opacity-40'
                  }`}
                  title="رنين فوري"
                >
                  <span className="material-symbols-outlined text-xl">
                    {countdown?.bell === 'جرس الدخول المباشر' ? 'notifications_active' : 'play_arrow'}
                  </span>
                </button>
                <div className="flex flex-col">
                  <span className="font-bold text-[13px]">جرس الدخول المباشر</span>
                  <span className="text-[11px] opacity-80">رنين الصعود للطابور والاصطفاف المدرسي</span>
                </div>
              </div>
              <span className={`font-mono text-xs font-bold px-2 py-1 rounded-lg ${
                countdown?.bell === 'جرس الدخول المباشر'
                  ? 'bg-teal-dark text-white animate-pulse'
                  : 'bg-surface-container-lowest text-on-surface'
              }`}>
                {countdown?.bell === 'جرس الدخول المباشر' ? `متبقي ${countdown.secondsLeft} ثانية` : '20 ثانية'}
              </span>
            </div>

            {/* Bell 2: Dismissal Bell */}
            <div className={`p-3 rounded-xl border transition-all flex items-center justify-between ${
              countdown?.bell === 'جرس الانصراف'
                ? 'bg-primary-container text-white border-teal-dark shadow-md ring-2 ring-teal-dark/30'
                : 'bg-surface-container-low border-surface-container hover:bg-surface-container'
            }`}>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handlePlayBell('جرس الانصراف', 15, 'INSTANT_EXIT')}
                  disabled={countdown !== null}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-sm ${
                    countdown?.bell === 'جرس الانصراف'
                      ? 'bg-teal-dark text-white ring-4 ring-teal-dark/40 animate-pulse'
                      : 'bg-teal-dark text-on-primary hover:bg-secondary disabled:opacity-40'
                  }`}
                  title="رنين فوري"
                >
                  <span className="material-symbols-outlined text-xl">
                    {countdown?.bell === 'جرس الانصراف' ? 'notifications_active' : 'play_arrow'}
                  </span>
                </button>
                <div className="flex flex-col">
                  <span className="font-bold text-[13px]">جرس الانصراف</span>
                  <span className="text-[11px] opacity-80">رنين ثلاثي النغمة لانتهاء الدوام ومغادرة الإدارة</span>
                </div>
              </div>
              <span className={`font-mono text-xs font-bold px-2 py-1 rounded-lg ${
                countdown?.bell === 'جرس الانصراف'
                  ? 'bg-teal-dark text-white animate-pulse'
                  : 'bg-surface-container-lowest text-on-surface'
              }`}>
                {countdown?.bell === 'جرس الانصراف' ? `متبقي ${countdown.secondsLeft} ثانية` : '15 ثانية'}
              </span>
            </div>

            {/* Bell 3: Period End Warning */}
            <div className={`p-3 rounded-xl border transition-all flex items-center justify-between ${
              countdown?.bell === 'تنبيه نهاية الحصة'
                ? 'bg-primary-container text-white border-teal-dark shadow-md ring-2 ring-teal-dark/30'
                : 'bg-surface-container-low border-surface-container hover:bg-surface-container'
            }`}>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handlePlayBell('تنبيه نهاية الحصة', 10, 'PERIOD_END')}
                  disabled={countdown !== null}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-sm ${
                    countdown?.bell === 'تنبيه نهاية الحصة'
                      ? 'bg-teal-dark text-white ring-4 ring-teal-dark/40 animate-pulse'
                      : 'bg-surface-container-highest text-on-surface hover:bg-teal-dark hover:text-on-primary disabled:opacity-40'
                  }`}
                  title="رنين فوري"
                >
                  <span className="material-symbols-outlined text-xl">
                    {countdown?.bell === 'تنبيه نهاية الحصة' ? 'notifications_active' : 'play_arrow'}
                  </span>
                </button>
                <div className="flex flex-col">
                  <span className="font-bold text-[13px]">تنبيه نهاية الحصة</span>
                  <span className="text-[11px] opacity-80">إشعار صوتي بقرب انتهاء وقت الحصة</span>
                </div>
              </div>
              <span className={`font-mono text-xs font-bold px-2 py-1 rounded-lg ${
                countdown?.bell === 'تنبيه نهاية الحصة'
                  ? 'bg-teal-dark text-white animate-pulse'
                  : 'bg-surface-container-lowest text-on-surface'
              }`}>
                {countdown?.bell === 'تنبيه نهاية الحصة' ? `متبقي ${countdown.secondsLeft} ثانية` : '10 ثوانٍ'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 3. Live Microphone Broadcast Card */}
      <div className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm border border-surface-container-high/60 flex flex-col gap-space-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-teal-dark text-xl">mic</span>
            <h4 className="font-bold text-[15px] text-on-surface">البث المباشر للميكروفون</h4>
          </div>
          <span
            className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-bold transition-all ${
              isMicActive
                ? 'bg-secondary-fixed text-on-secondary-fixed ring-2 ring-teal-dark/40 animate-pulse'
                : 'bg-surface-container-high text-on-surface-variant'
            }`}
          >
            {isMicActive ? 'LIVE MIC ACTIVE' : 'MIC STANDBY'}
          </span>
        </div>

        {/* Mic Toggle Switch */}
        <div className="bg-surface-container-low p-3.5 rounded-xl border border-surface-container flex items-center justify-between">
          <div className="flex flex-col">
            <span className="font-bold text-[13px] text-on-surface">فتح المايك المباشر للساحة العامة</span>
            <span className="text-[11px] text-on-surface-variant">إرسال صوت المشرف الإذاعي فورياً للمكبرات</span>
          </div>
          <button
            type="button"
            onClick={handleToggleMic}
            className={`w-13 h-7 rounded-full transition-colors relative p-0.5 focus:outline-none ${
              isMicActive ? 'bg-teal-dark' : 'bg-surface-container-highest'
            }`}
          >
            <div
              className={`w-6 h-6 rounded-full bg-white shadow-md transform transition-transform ${
                isMicActive ? '-translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Live Audio VU Meter */}
        <div className="bg-surface-container-low p-space-md rounded-xl border border-surface-container flex flex-col gap-2">
          <div className="flex items-center justify-between text-[11px] text-on-surface-variant font-mono">
            <span>مستوى الإشارة الصوتية (VU)</span>
            <span className={isMicActive ? 'text-teal-dark font-bold' : ''}>
              {isMicActive ? `- ${12 - vuLevel} dB (مثالي)` : 'ساكن'}
            </span>
          </div>
          <div className="grid grid-cols-12 gap-1 h-3 items-center">
            {[...Array(12)].map((_, i) => {
              const isLit = isMicActive && i < vuLevel;
              const isPeak = isMicActive && i >= 10 && i < vuLevel;
              return (
                <div
                  key={i}
                  className={`h-full rounded-sm transition-all duration-100 ${
                    isPeak
                      ? 'bg-error'
                      : isLit
                      ? i > 7
                        ? 'bg-amber-400'
                        : 'bg-teal-dark'
                      : 'bg-surface-container'
                  }`}
                />
              );
            })}
          </div>
        </div>

        {/* Target Broadcast Zones Selector */}
        <div className="flex flex-col gap-2">
          <span className="text-[11px] text-on-surface-variant font-bold">مناطق البث المستهدفة:</span>
          <div className="grid grid-cols-2 gap-2">
            {[
              'الساحة الرئيسية',
              'الممرات الداخلية',
              'مبنى الإدارة',
              'الصالة الرياضية',
            ].map((zone) => {
              const isSelected = selectedZones.includes(zone);
              return (
                <button
                  key={zone}
                  type="button"
                  onClick={() => toggleZone(zone)}
                  className={`flex items-center gap-2 p-2 rounded-xl text-xs font-bold transition-all border text-right ${
                    isSelected
                      ? 'bg-primary-container text-on-primary-fixed border-teal-dark/40 shadow-sm'
                      : 'bg-surface-container-low text-on-surface-variant border-surface-container hover:bg-surface-container'
                  }`}
                >
                  <span
                    className={`material-symbols-outlined text-sm ${
                      isSelected ? 'text-teal-accent' : 'text-on-surface-variant'
                    }`}
                  >
                    {isSelected ? 'check_box' : 'check_box_outline_blank'}
                  </span>
                  <span>{zone}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
