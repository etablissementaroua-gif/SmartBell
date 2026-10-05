import React, { useState, useEffect } from 'react';

interface HeaderProps {
  masterVolume: number;
  onMasterVolumeChange: (vol: number) => void;
  onEmergencyMute: () => void;
  isEmergencyMuted: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  masterVolume,
  onMasterVolumeChange,
  onEmergencyMute,
  isEmergencyMuted,
}) => {
  const [timeString, setTimeString] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      let hours = now.getHours();
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      const ampm = hours >= 12 ? 'م' : 'ص';
      hours = hours % 12;
      hours = hours ? hours : 12;
      const formattedHours = String(hours).padStart(2, '0');
      setTimeString(`${formattedHours}:${minutes}:${seconds} ${ampm}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="fixed top-0 right-72 left-0 h-16 bg-surface-container-lowest/95 backdrop-blur-xl z-40 border-b border-surface-container-high/60 shadow-[0_1px_8px_rgba(0,0,0,0.04)] flex items-center justify-between px-space-xl transition-all">
      {/* Left side (in RTL: right side visually): Clock & Hardware status */}
      <div className="flex items-center gap-space-lg">
        {/* Digital Clock */}
        <div className="flex items-center gap-space-sm bg-surface-container-low border border-surface-container px-space-md py-space-xs rounded-full shadow-inner">
          <span className="material-symbols-outlined text-teal-dark text-base">schedule</span>
          <span className="font-mono text-label-lg text-on-surface tracking-wider font-bold">
            {timeString || '10:14:25 ص'}
          </span>
        </div>

        {/* Hardware Daemon Active Status */}
        <div className="hidden lg:flex items-center gap-space-sm bg-surface-container-low border border-surface-container px-space-md py-space-xs rounded-full">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary-container opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-teal-dark"></span>
          </span>
          <span className="text-body-sm text-on-surface font-medium">
            خدمة العتاد: <span className="font-mono text-xs font-semibold text-teal-dark">smartbell-daemon.service</span> (نشط)
          </span>
        </div>
      </div>

      {/* Right side: Volume, Emergency Mute, and User Profile */}
      <div className="flex items-center gap-space-lg">
        {/* Master Volume Controller */}
        <div className="flex items-center gap-space-sm bg-surface-container-low border border-surface-container px-space-md py-space-xs rounded-xl shadow-sm">
          <span className="material-symbols-outlined text-teal-dark text-lg">
            {isEmergencyMuted || masterVolume === 0 ? 'volume_off' : masterVolume < 40 ? 'volume_down' : 'volume_up'}
          </span>
          <div className="w-24 bg-surface-container h-2 rounded-full overflow-hidden flex items-center">
            <div
              className={`h-full rounded-full transition-all duration-300 ${isEmergencyMuted ? 'bg-error w-0' : 'bg-teal-dark'}`}
              style={{ width: isEmergencyMuted ? '0%' : `${masterVolume}%` }}
            ></div>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={isEmergencyMuted ? 0 : masterVolume}
            onChange={(e) => onMasterVolumeChange(Number(e.target.value))}
            className="w-16 h-1.5 opacity-0 absolute cursor-pointer"
            title="تحكم في مستوى الصوت الرئيسي"
          />
          <span className="text-label-sm text-on-surface-variant font-mono font-bold min-w-[3ch]">
            {isEmergencyMuted ? '0%' : `${masterVolume}%`}
          </span>
        </div>

        {/* Emergency Stop Button */}
        <button
          onClick={onEmergencyMute}
          className={`flex items-center justify-center h-10 w-10 rounded-xl transition-all shadow-sm active:scale-95 ${
            isEmergencyMuted
              ? 'bg-error text-on-error animate-pulse ring-4 ring-error/30'
              : 'bg-error-container text-on-error-container hover:bg-error hover:text-on-error'
          }`}
          title={isEmergencyMuted ? 'إلغاء صمت الطوارئ' : 'إيقاف الطوارئ الفوري لكافة المكبرات'}
          type="button"
        >
          <span className="material-symbols-outlined text-xl">
            {isEmergencyMuted ? 'volume_up' : 'volume_off'}
          </span>
        </button>

        {/* User Profile Pill */}
        <div className="flex items-center gap-space-sm pr-space-sm bg-surface-container-low border border-surface-container rounded-full pl-space-xs py-space-xs shadow-sm">
          <div className="w-8 h-8 rounded-full bg-primary-container text-teal-accent flex items-center justify-center font-bold text-sm shadow-inner">
            <span className="material-symbols-outlined text-lg">admin_panel_settings</span>
          </div>
          <div className="flex flex-col pl-space-sm">
            <span className="text-label-md text-on-surface leading-tight font-bold">المشرف الإذاعي</span>
            <span className="text-[11px] text-teal-dark font-medium leading-none">مدير البث المباشر</span>
          </div>
        </div>
      </div>
    </header>
  );
};
