import React, { useState, useEffect } from 'react';
import { Icon } from './common/Icon';

interface HeaderProps {
  masterVolume: number;
  onMasterVolumeChange: (vol: number) => void;
  onEmergencyMute: () => void;
  isEmergencyMuted: boolean;
  onOpenMobileDrawer?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  masterVolume,
  onMasterVolumeChange,
  onEmergencyMute,
  isEmergencyMuted,
  onOpenMobileDrawer,
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
    <header className="fixed top-0 right-0 lg:right-72 left-0 h-16 bg-surface-container-lowest/95 backdrop-blur-xl z-30 border-b border-surface-container-high/60 shadow-[0_1px_8px_rgba(0,0,0,0.04)] flex items-center justify-between px-3 sm:px-space-md lg:px-space-lg transition-all select-none">
      {/* Right side (RTL Start): Hamburger + Clock + Hardware Status */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Mobile Drawer Hamburger Button */}
        <button
          type="button"
          onClick={onOpenMobileDrawer}
          className="lg:hidden flex items-center justify-center h-10 w-10 rounded-xl bg-surface-container-low border border-surface-container text-on-surface hover:bg-surface-container active:scale-95 transition-all"
          title="فتح القائمة الجانبية"
          aria-label="القائمة"
        >
          <Icon name="menu" size={22} />
        </button>

        {/* Digital Clock */}
        <div className="flex items-center gap-1.5 sm:gap-2 bg-surface-container-low border border-surface-container px-3 py-1 rounded-full shadow-inner">
          <Icon name="schedule" className="text-teal-dark shrink-0" size={17} />
          <span className="font-mono text-xs sm:text-sm text-on-surface tracking-wider font-bold whitespace-nowrap">
            {timeString || '10:14:25 ص'}
          </span>
        </div>

        {/* Hardware Daemon Active Status */}
        <div className="hidden lg:flex items-center gap-2 bg-surface-container-low border border-surface-container px-3 py-1 rounded-full shrink-0">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary-container opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-teal-dark"></span>
          </span>
          <span className="text-xs text-on-surface font-medium whitespace-nowrap">
            خدمة العتاد: <span className="font-mono font-semibold text-teal-dark">نشط</span>
          </span>
        </div>
      </div>

      {/* Left side (RTL End): APK Download, Volume, Emergency Mute, and User Profile */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Supervisor APK Download Button */}
        <a
          href="/downloads/smartbell-controller.apk"
          download="smartbell-controller.apk"
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-surface-container-low hover:bg-surface-container border border-teal-dark/40 hover:border-teal-dark shadow-sm transition-all active:scale-95 text-on-surface shrink-0"
          title="تثبيت تطبيق SmartBell Controller على هواتف أندرويد"
        >
          <Icon name="phone_android" className="text-teal-dark shrink-0" size={16} />
          <span className="text-xs font-bold text-teal-dark whitespace-nowrap">
            تطبيق المشرف
          </span>
          <Icon name="download" className="text-on-surface-variant shrink-0" size={14} />
        </a>

        {/* Master Volume Controller */}
        <div className="hidden sm:flex items-center gap-2 bg-surface-container-low border border-surface-container px-3 py-1 rounded-xl shadow-sm shrink-0">
          <Icon
            name={isEmergencyMuted || masterVolume === 0 ? 'volume_off' : masterVolume < 40 ? 'volume_down' : 'volume_up'}
            className="text-teal-dark shrink-0"
            size={18}
          />
          <div className="relative w-16 md:w-20 bg-surface-container h-2 rounded-full overflow-hidden flex items-center">
            <div
              className={`h-full rounded-full transition-all duration-300 ${isEmergencyMuted ? 'bg-error w-0' : 'bg-teal-dark'}`}
              style={{ width: isEmergencyMuted ? '0%' : `${masterVolume}%` }}
            ></div>
            <input
              type="range"
              min="0"
              max="100"
              value={isEmergencyMuted ? 0 : masterVolume}
              onChange={(e) => onMasterVolumeChange(Number(e.target.value))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              title="تحكم في مستوى الصوت الرئيسي"
            />
          </div>
          <span className="text-xs text-on-surface-variant font-mono font-bold min-w-[3ch] text-left">
            {isEmergencyMuted ? '0%' : `${masterVolume}%`}
          </span>
        </div>

        {/* Emergency Stop Button */}
        <button
          onClick={onEmergencyMute}
          className={`flex items-center justify-center h-10 w-10 rounded-xl transition-all shadow-sm active:scale-95 shrink-0 ${
            isEmergencyMuted
              ? 'bg-error text-on-error animate-pulse ring-4 ring-error/30'
              : 'bg-error-container text-on-error-container hover:bg-error hover:text-on-error'
          }`}
          title={isEmergencyMuted ? 'إلغاء صمت الطوارئ' : 'إيقاف الطوارئ الفوري لكافة المكبرات'}
          type="button"
        >
          <Icon name={isEmergencyMuted ? 'volume_up' : 'volume_off'} size={20} />
        </button>

        {/* User Profile Pill */}
        <div className="hidden sm:flex items-center gap-2 pr-2 bg-surface-container-low border border-surface-container rounded-full pl-3 py-1 shadow-sm shrink-0">
          <div className="w-7 h-7 rounded-full bg-primary-container text-teal-accent flex items-center justify-center font-bold text-xs shadow-inner shrink-0">
            <Icon name="admin_panel_settings" size={16} />
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-on-surface leading-tight font-bold whitespace-nowrap">المشرف الإذاعي</span>
            <span className="text-[10px] text-teal-dark font-medium leading-none whitespace-nowrap">مدير البث</span>
          </div>
        </div>
      </div>
    </header>
  );
};
