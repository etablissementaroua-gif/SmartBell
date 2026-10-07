import React, { useState, useEffect } from 'react';

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
    <header className="fixed top-0 right-0 lg:right-72 left-0 h-16 bg-surface-container-lowest/95 backdrop-blur-xl z-30 border-b border-surface-container-high/60 shadow-[0_1px_8px_rgba(0,0,0,0.04)] flex items-center justify-between px-3 sm:px-space-lg lg:px-space-xl transition-all">
      {/* Visual Right side: Hamburger (mobile only) + Clock + Hardware status */}
      <div className="flex items-center gap-2 sm:gap-space-md">
        {/* Mobile Drawer Hamburger Button */}
        <button
          type="button"
          onClick={onOpenMobileDrawer}
          className="lg:hidden flex items-center justify-center h-10 w-10 rounded-xl bg-surface-container-low border border-surface-container text-on-surface hover:bg-surface-container active:scale-95 transition-all"
          title="فتح القائمة الجانبية"
          aria-label="القائمة"
        >
          <span className="material-symbols-outlined text-2xl">menu</span>
        </button>

        {/* Digital Clock */}
        <div className="flex items-center gap-1.5 sm:gap-space-sm bg-surface-container-low border border-surface-container px-2.5 sm:px-space-md py-1 sm:py-space-xs rounded-full shadow-inner">
          <span className="material-symbols-outlined text-teal-dark text-base sm:text-lg">schedule</span>
          <span className="font-mono text-xs sm:text-label-lg text-on-surface tracking-wider font-bold">
            {timeString || '10:14:25 ص'}
          </span>
        </div>

        {/* Hardware Daemon Active Status */}
        <div className="hidden xl:flex items-center gap-space-sm bg-surface-container-low border border-surface-container px-space-md py-space-xs rounded-full">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary-container opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-teal-dark"></span>
          </span>
          <span className="text-body-sm text-on-surface font-medium">
            خدمة العتاد: <span className="font-mono text-xs font-semibold text-teal-dark">smartbell-daemon.service</span> (نشط)
          </span>
        </div>
      </div>

      {/* Visual Left side: APK Download, Volume, Emergency Mute, and User Profile */}
      <div className="flex items-center gap-2 sm:gap-space-md">
        {/* Supervisor APK Download Button (hidden on phone, visible on md+) */}
        <a
          href="/downloads/smartbell-controller.apk"
          download="smartbell-controller.apk"
          className="hidden md:flex group relative items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-container-low hover:bg-surface-container border border-teal-dark/50 hover:border-teal-dark shadow-sm hover:shadow-[0_0_15px_rgba(20,184,166,0.35)] transition-all active:scale-95 text-on-surface"
          title="تثبيت تطبيق SmartBell Controller على هواتف أندرويد"
        >
          <span className="material-symbols-outlined text-teal-dark group-hover:animate-bounce text-xl">
            phone_android
          </span>
          <span className="hidden xl:inline text-xs font-bold text-teal-dark group-hover:text-teal-accent transition-colors">
            تحميل تطبيق المشرف (APK)
          </span>
          <span className="xl:hidden inline text-xs font-bold text-teal-dark">
            APK
          </span>
          <span className="material-symbols-outlined text-xs text-on-surface-variant group-hover:text-teal-dark">
            download
          </span>
        </a>

        {/* Master Volume Controller */}
        <div className="hidden sm:flex items-center gap-space-sm bg-surface-container-low border border-surface-container px-space-md py-space-xs rounded-xl shadow-sm">
          <span className="material-symbols-outlined text-teal-dark text-lg">
            {isEmergencyMuted || masterVolume === 0 ? 'volume_off' : masterVolume < 40 ? 'volume_down' : 'volume_up'}
          </span>
          <div className="w-16 md:w-24 bg-surface-container h-2 rounded-full overflow-hidden flex items-center">
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

        {/* Emergency Stop Button (ALWAYS visible on all screens) */}
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
        <div className="hidden sm:flex items-center gap-space-sm pr-space-sm bg-surface-container-low border border-surface-container rounded-full pl-space-xs py-space-xs shadow-sm">
          <div className="w-8 h-8 rounded-full bg-primary-container text-teal-accent flex items-center justify-center font-bold text-sm shadow-inner">
            <span className="material-symbols-outlined text-lg">admin_panel_settings</span>
          </div>
          <div className="hidden md:flex flex-col pl-space-sm">
            <span className="text-label-md text-on-surface leading-tight font-bold">المشرف الإذاعي</span>
            <span className="text-[11px] text-teal-dark font-medium leading-none">مدير البث المباشر</span>
          </div>
        </div>
      </div>
    </header>
  );
};
