import React, { useState } from 'react';
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
}

export const OverridesPanel: React.FC<OverridesPanelProps> = ({
  isEmergencyMuted,
  onToggleEmergencyMute,
  onTriggerInstantBell,
}) => {
  const [isMicActive, setIsMicActive] = useState<boolean>(false);
  const [selectedZones, setSelectedZones] = useState<string[]>([
    'ZONE_A',
    'ZONE_B',
  ]);
  const [activeBell, setActiveBell] = useState<string | null>(null);

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
    setActiveBell(bellName);
    onTriggerInstantBell(bellName, duration, command, selectedZones.join(',') || 'ALL');
    setTimeout(() => {
      setActiveBell(null);
    }, duration * 1000);
  };

  const handleToggleMic = async () => {
    const nextState = !isMicActive;
    setIsMicActive(nextState);
    await supabaseService.triggerInstantOverride(
      'MIC_BROADCAST',
      selectedZones.join(',') || 'ALL',
      { action: nextState ? 'START' : 'STOP' }
    );
  };

  return (
    <div className="flex flex-col gap-space-lg w-full">
      {/* Top Meta Badges */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 px-space-md py-1 rounded-full bg-surface-container-high text-on-surface font-bold text-xs">
          <span className="material-symbols-outlined text-sm text-teal-dark">event_available</span>
          <span>الدوام المدرسي الكامل (8 مهام)</span>
        </div>
        <div className="flex items-center gap-1.5 px-space-md py-1 rounded-full bg-surface-container-low text-on-surface-variant font-mono text-xs">
          <span className="material-symbols-outlined text-sm text-teal-dark">speaker_group</span>
          <span>ساعة مكبرات الصوت (16 مخرج نشط)</span>
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
            PRIORITY
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

      {/* 2. Instant Overrides (أجراس التجاوز الفوري) */}
      <div className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm border border-surface-container-high/60 flex flex-col gap-space-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-teal-dark text-xl">notification_important</span>
            <h4 className="font-bold text-[15px] text-on-surface">أجراس التجاوز الفوري</h4>
          </div>
          <span className="text-[11px] font-bold text-on-surface-variant bg-surface-container-low px-2 py-0.5 rounded-full">
            تجاوز يدوي مباشر
          </span>
        </div>

        {/* 3 Chimes Cards */}
        <div className="flex flex-col gap-2.5">
          {/* Bell 1: Instant Entry */}
          <div className="bg-surface-container-low p-3 rounded-xl border border-surface-container flex items-center justify-between hover:bg-surface-container transition-colors">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handlePlayBell('جرس الدخول المباشر', 20, 'INSTANT_ENTRY')}
                disabled={activeBell === 'جرس الدخول المباشر'}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-sm ${
                  activeBell === 'جرس الدخول المباشر'
                    ? 'bg-teal-dark text-on-primary animate-spin'
                    : 'bg-primary text-on-primary hover:bg-teal-dark'
                }`}
                title="رنين فوري"
              >
                <span className="material-symbols-outlined text-xl">
                  {activeBell === 'جرس الدخول المباشر' ? 'refresh' : 'play_arrow'}
                </span>
              </button>
              <div className="flex flex-col">
                <span className="font-bold text-[13px] text-on-surface">جرس الدخول المباشر</span>
                <span className="text-[11px] text-on-surface-variant">رنين الصعود للطابور والاصطفاف المدرسي</span>
              </div>
            </div>
            <span className="font-mono text-xs font-bold text-on-surface bg-surface-container-lowest px-2 py-1 rounded-lg">
              20 ثانية
            </span>
          </div>

          {/* Bell 2: Dismissal Bell */}
          <div className="bg-surface-container-low p-3 rounded-xl border border-surface-container flex items-center justify-between hover:bg-surface-container transition-colors">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handlePlayBell('جرس الانصراف', 15, 'INSTANT_EXIT')}
                disabled={activeBell === 'جرس الانصراف'}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-sm ${
                  activeBell === 'جرس الانصراف'
                    ? 'bg-teal-dark text-on-primary animate-spin'
                    : 'bg-teal-dark text-on-primary hover:bg-secondary'
                }`}
                title="رنين فوري"
              >
                <span className="material-symbols-outlined text-xl">
                  {activeBell === 'جرس الانصراف' ? 'refresh' : 'play_arrow'}
                </span>
              </button>
              <div className="flex flex-col">
                <span className="font-bold text-[13px] text-on-surface">جرس الانصراف</span>
                <span className="text-[11px] text-on-surface-variant">رنين ثلاثي النغمة لانتهاء الدوام ومغادرة الإدارة</span>
              </div>
            </div>
            <span className="font-mono text-xs font-bold text-on-surface bg-surface-container-lowest px-2 py-1 rounded-lg">
              15 ثانية
            </span>
          </div>

          {/* Bell 3: Period End Warning */}
          <div className="bg-surface-container-low p-3 rounded-xl border border-surface-container flex items-center justify-between hover:bg-surface-container transition-colors">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handlePlayBell('تنبيه نهاية الحصة', 10, 'PERIOD_END')}
                disabled={activeBell === 'تنبيه نهاية الحصة'}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-sm ${
                  activeBell === 'تنبيه نهاية الحصة'
                    ? 'bg-teal-dark text-on-primary animate-spin'
                    : 'bg-surface-container-highest text-on-surface hover:bg-teal-dark hover:text-on-primary'
                }`}
                title="رنين فوري"
              >
                <span className="material-symbols-outlined text-xl">
                  {activeBell === 'تنبيه نهاية الحصة' ? 'refresh' : 'play_arrow'}
                </span>
              </button>
              <div className="flex flex-col">
                <span className="font-bold text-[13px] text-on-surface">تنبيه نهاية الحصة</span>
                <span className="text-[11px] text-on-surface-variant">إشعار صوتي بقرب انتهاء وقت الحصة</span>
              </div>
            </div>
            <span className="font-mono text-xs font-bold text-on-surface bg-surface-container-lowest px-2 py-1 rounded-lg">
              10 ثوانٍ
            </span>
          </div>
        </div>
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
              {isMicActive ? '-6 dB (مثالي)' : 'ساكن'}
            </span>
          </div>
          <div className="grid grid-cols-12 gap-1 h-3 items-center">
            {[...Array(12)].map((_, i) => {
              const isLit = isMicActive && i < 9;
              const isPeak = isMicActive && i >= 10;
              return (
                <div
                  key={i}
                  className={`h-full rounded-sm transition-all duration-150 ${
                    isPeak
                      ? 'bg-error'
                      : isLit
                      ? i > 6
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
