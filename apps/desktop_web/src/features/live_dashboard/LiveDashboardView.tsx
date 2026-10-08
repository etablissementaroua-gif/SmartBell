import React from 'react';
import { NowPlayingCard } from './components/NowPlayingCard';
import { OverridesPanel } from './components/OverridesPanel';
import { TimelineCountdown } from './components/TimelineCountdown';
import { BellSchedule, IntermissionTrack } from '../../types';
import { supabaseService } from '../../core/supabaseService';
import { Icon } from '../../components/common/Icon';

interface LiveDashboardViewProps {
  schedules: BellSchedule[];
  tracks: IntermissionTrack[];
  isEmergencyMuted: boolean;
  onToggleEmergencyMute: () => void;
  onNavigateToTab: (tab: any) => void;
  onShowToast?: (type: 'success' | 'error' | 'info' | 'warning', message: string, title?: string) => void;
}

export const LiveDashboardView: React.FC<LiveDashboardViewProps> = ({
  schedules,
  tracks,
  isEmergencyMuted,
  onToggleEmergencyMute,
  onNavigateToTab,
  onShowToast,
}) => {
  const triggerInstantBell = async (
    bellName: string,
    duration: number,
    command: 'INSTANT_ENTRY' | 'INSTANT_EXIT' | 'PERIOD_END',
    targetZone: string = 'ALL'
  ) => {
    if (onShowToast) {
      onShowToast('info', `جاري بث [${bellName}] لنطاق [${targetZone}] لمدة ${duration} ثانية...`, 'جرس فوري');
    }
    await supabaseService.triggerInstantOverride(command, targetZone, {
      duration_seconds: duration,
      bell_name: bellName,
    });
  };

  return (
    <div className="flex flex-col gap-space-xl w-full max-w-[1720px] mx-auto pb-12">
      {/* Emergency Mute Banner */}
      {isEmergencyMuted && (
        <div className="bg-error text-on-error p-4 rounded-2xl shadow-lg flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-3">
            <Icon name="volume_off" size={32} />
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

      {/* 3-Column Layout: Mobile-first ordering puts Countdown & Timeline first on phones */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-space-lg xl:gap-space-xl items-start">
        {/* Column 3 (Now First on Mobile): Next Scheduled Event Countdown & Sequential Timeline */}
        <div className="flex flex-col gap-space-lg w-full order-1 lg:order-3">
          <TimelineCountdown
            schedules={schedules}
            onOpenSchedules={() => onNavigateToTab('bell-schedules')}
            onEditNextEvent={() => onNavigateToTab('bell-schedules')}
          />
        </div>

        {/* Column 1: Live Broadcast Player & Upcoming Tracks */}
        <div className="flex flex-col gap-space-lg w-full order-2 lg:order-1">
          <NowPlayingCard
            tracks={tracks}
            onInsertTrack={() => onNavigateToTab('media-library')}
            onShowToast={onShowToast}
          />
        </div>

        {/* Column 2: Emergency Silence, Instant Chimes, and Live Mic */}
        <div className="flex flex-col gap-space-lg w-full order-3 lg:order-2">
          <OverridesPanel
            isEmergencyMuted={isEmergencyMuted}
            onToggleEmergencyMute={onToggleEmergencyMute}
            onTriggerInstantBell={triggerInstantBell}
            onShowToast={onShowToast}
          />
        </div>
      </div>
    </div>
  );
};
