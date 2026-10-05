import React, { useState } from 'react';
import { NowPlayingCard } from './components/NowPlayingCard';
import { OverridesPanel } from './components/OverridesPanel';
import { TimelineCountdown } from './components/TimelineCountdown';
import { BellSchedule, IntermissionTrack } from '../../types';

interface LiveDashboardViewProps {
  schedules: BellSchedule[];
  tracks: IntermissionTrack[];
  isEmergencyMuted: boolean;
  onToggleEmergencyMute: () => void;
  onNavigateToTab: (tab: any) => void;
}

export const LiveDashboardView: React.FC<LiveDashboardViewProps> = ({
  schedules,
  tracks,
  isEmergencyMuted,
  onToggleEmergencyMute,
  onNavigateToTab,
}) => {
  const [notification, setNotification] = useState<string | null>(null);

  const triggerInstantBell = (bellName: string, duration: number) => {
    setNotification(`🔔 جاري بث [${bellName}] لكافة أرجاء المدرسة لمدة ${duration} ثانية...`);
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  return (
    <div className="flex flex-col gap-space-xl w-full max-w-[1720px] mx-auto pb-12">
      {/* Toast Notification Bar */}
      {notification && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 bg-primary-container text-white px-6 py-3 rounded-2xl shadow-2xl border border-teal-dark flex items-center gap-3 animate-bounce">
          <span className="material-symbols-outlined text-teal-accent">sensors</span>
          <span className="font-bold text-sm">{notification}</span>
        </div>
      )}

      {/* Emergency Mute Banner */}
      {isEmergencyMuted && (
        <div className="bg-error text-on-error p-4 rounded-2xl shadow-lg flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-3xl">volume_off</span>
            <div>
              <h4 className="font-bold text-base">صمت الطوارئ العام مفعل حالياً!</h4>
              <p className="text-xs opacity-90">تم كتم جميع الإذاعات والأجراس والميكروفونات عن كافة أرجاء المؤسسة.</p>
            </div>
          </div>
          <button
            onClick={onToggleEmergencyMute}
            className="px-4 py-2 bg-white text-error rounded-xl font-bold text-xs hover:bg-slate-100 transition-colors shadow-md"
          >
            إلغاء الصمت واستئناف النظام
          </button>
        </div>
      )}

      {/* 3-Column Layout Matching Design Mockup (Image 2) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-space-lg xl:gap-space-xl items-start">
        {/* Column 1: Live Broadcast Player & Upcoming Tracks */}
        <div className="flex flex-col gap-space-lg w-full">
          <NowPlayingCard
            tracks={tracks}
            onInsertTrack={() => onNavigateToTab('media-library')}
          />
        </div>

        {/* Column 2: Emergency Silence, Instant Chimes, and Live Mic */}
        <div className="flex flex-col gap-space-lg w-full">
          <OverridesPanel
            isEmergencyMuted={isEmergencyMuted}
            onToggleEmergencyMute={onToggleEmergencyMute}
            onTriggerInstantBell={triggerInstantBell}
          />
        </div>

        {/* Column 3: Next Scheduled Event Countdown & Sequential Timeline */}
        <div className="flex flex-col gap-space-lg w-full">
          <TimelineCountdown
            schedules={schedules}
            onOpenSchedules={() => onNavigateToTab('bell-schedules')}
            onEditNextEvent={() => onNavigateToTab('bell-schedules')}
          />
        </div>
      </div>
    </div>
  );
};
