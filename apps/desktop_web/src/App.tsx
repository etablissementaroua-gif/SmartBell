import React, { useState, useEffect } from 'react';
import { TabType, BellSchedule, IntermissionTrack, AudioZone } from './types';
import { initialAudioZones } from './core/mockData';
import { supabaseService } from './core/supabaseService';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { LiveDashboardView } from './features/live_dashboard/LiveDashboardView';
import { BellSchedulerView } from './features/bell_scheduler/BellSchedulerView';
import { IntermissionPlaylistView } from './features/intermission_playlist/IntermissionPlaylistView';
import { AdhanSettingsView } from './features/adhan_settings/AdhanSettingsView';
import { SystemConfigurationView } from './features/system_configuration/SystemConfigurationView';
import { SystemAuditLogsView } from './features/system_audit_logs/SystemAuditLogsView';
import { LoginModal } from './features/authentication/LoginModal';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<TabType>('live-control-dashboard');
  const [masterVolume, setMasterVolume] = useState<number>(75);
  const [isEmergencyMuted, setIsEmergencyMuted] = useState<boolean>(false);
  const [schedules, setSchedules] = useState<BellSchedule[]>([]);
  const [tracks, setTracks] = useState<IntermissionTrack[]>([]);
  const [zones, setZones] = useState<AudioZone[]>(initialAudioZones);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);

  // 1. Initial Load from Supabase with Fallback
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      const [fetchedZones, fetchedSchedules, fetchedTracks] = await Promise.all([
        supabaseService.fetchAudioZones(),
        supabaseService.fetchBellSchedules(),
        supabaseService.fetchIntermissionTracks(),
      ]);

      if (isMounted) {
        setZones(fetchedZones);
        setSchedules(fetchedSchedules);
        setTracks(fetchedTracks);
      }
    };

    loadData();

    // 2. Realtime Subscriptions
    const unsubZones = supabaseService.subscribeToAudioZones((freshZones) => {
      if (isMounted) setZones(freshZones);
    });

    const unsubOverrides = supabaseService.subscribeToLiveOverrides((override) => {
      if (!isMounted) return;
      if (override.command === 'EMERGENCY_MUTE') {
        setIsEmergencyMuted(true);
      } else if (override.command === 'RESUME') {
        setIsEmergencyMuted(false);
      }
    });

    return () => {
      isMounted = false;
      unsubZones();
      unsubOverrides();
    };
  }, []);

  // Handlers wired to live Supabase mutations
  const handleToggleEmergencyMute = async () => {
    const nextState = !isEmergencyMuted;
    setIsEmergencyMuted(nextState);
    await supabaseService.setEmergencyMute(nextState);
  };

  const handleMasterVolumeChange = async (vol: number) => {
    setMasterVolume(vol);
    await supabaseService.updateMasterVolume(vol);
  };

  const handleToggleSchedule = async (id: string) => {
    const sched = schedules.find((s) => s.id === id);
    if (!sched) return;
    const nextEnabled = !sched.is_enabled;
    setSchedules((prev) =>
      prev.map((s) => (s.id === id ? { ...s, is_enabled: nextEnabled } : s))
    );
    await supabaseService.toggleBellSchedule(id, nextEnabled);
  };

  const handleAddSchedule = async (newSched: Omit<BellSchedule, 'id'>) => {
    const tempId = `sched-${Date.now()}`;
    setSchedules((prev) => [...prev, { ...newSched, id: tempId }]);
    await supabaseService.createBellSchedule(newSched);
    const fresh = await supabaseService.fetchBellSchedules();
    setSchedules(fresh);
  };

  const handleDeleteSchedule = async (id: string) => {
    setSchedules((prev) => prev.filter((s) => s.id !== id));
    await supabaseService.deleteBellSchedule(id);
  };

  const handleToggleTrack = async (id: string) => {
    const track = tracks.find((t) => t.id === id);
    if (!track) return;
    const nextActive = !track.is_active;
    setTracks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, is_active: nextActive } : t))
    );
    await supabaseService.toggleIntermissionTrack(id, nextActive);
  };

  const handleAddTrack = async (newTrack: Omit<IntermissionTrack, 'id' | 'duration_formatted'>) => {
    await supabaseService.createIntermissionTrack(newTrack);
    const fresh = await supabaseService.fetchIntermissionTracks();
    setTracks(fresh);
  };

  const handleDeleteTrack = async (id: string) => {
    setTracks((prev) => prev.filter((t) => t.id !== id));
    await supabaseService.deleteIntermissionTrack(id);
    const fresh = await supabaseService.fetchIntermissionTracks();
    setTracks(fresh);
  };

  const handleMoveTrack = (id: string, direction: 'up' | 'down') => {
    setTracks((prev) => {
      const idx = prev.findIndex((t) => t.id === id);
      if (idx < 0) return prev;
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= prev.length) return prev;
      const newArr = [...prev];
      const temp = newArr[idx];
      newArr[idx] = newArr[targetIdx];
      newArr[targetIdx] = temp;
      return newArr;
    });
  };

  const handleUpdateZoneVolume = async (zoneId: string, volume: number) => {
    setZones((prev) =>
      prev.map((z) => (z.id === zoneId ? { ...z, volume } : z))
    );
    const targetZone = zones.find((z) => z.id === zoneId);
    if (targetZone) {
      await supabaseService.updateZoneVolume(targetZone.zone_code, volume);
    }
  };

  const handleToggleZoneMute = async (zoneId: string) => {
    const targetZone = zones.find((z) => z.id === zoneId);
    if (!targetZone) return;
    const nextMuted = !targetZone.is_muted;
    setZones((prev) =>
      prev.map((z) => (z.id === zoneId ? { ...z, is_muted: nextMuted } : z))
    );
    await supabaseService.toggleZoneMute(targetZone.zone_code, nextMuted);
  };

  return (
    <div className="min-h-screen bg-surface font-cairo text-on-surface antialiased" dir="rtl">
      {/* Right Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onLogout={() => setIsLoginModalOpen(true)}
      />

      {/* Main Content Area */}
      <div className="pr-72">
        {/* Top Header */}
        <Header
          masterVolume={masterVolume}
          onMasterVolumeChange={handleMasterVolumeChange}
          onEmergencyMute={handleToggleEmergencyMute}
          isEmergencyMuted={isEmergencyMuted}
        />

        {/* Tab Content */}
        <main className="relative pt-20 px-space-xl py-space-lg bg-surface min-h-[calc(100vh-4rem)]">
          {currentTab === 'live-control-dashboard' && (
            <LiveDashboardView
              schedules={schedules}
              tracks={tracks}
              isEmergencyMuted={isEmergencyMuted}
              onToggleEmergencyMute={handleToggleEmergencyMute}
              onNavigateToTab={setCurrentTab}
            />
          )}

          {currentTab === 'bell-schedules' && (
            <BellSchedulerView
              schedules={schedules}
              onToggleSchedule={handleToggleSchedule}
              onAddSchedule={handleAddSchedule}
              onDeleteSchedule={handleDeleteSchedule}
            />
          )}

          {currentTab === 'break-programming' && (
            <IntermissionPlaylistView
              tracks={tracks}
              onToggleTrack={handleToggleTrack}
              onMoveTrack={handleMoveTrack}
              onAddTrack={handleAddTrack}
              onDeleteTrack={handleDeleteTrack}
            />
          )}

          {currentTab === 'athan-settings' && <AdhanSettingsView />}

          {(currentTab === 'system-configuration' || currentTab === 'media-library') && (
            <SystemConfigurationView
              zones={zones}
              onUpdateZoneVolume={handleUpdateZoneVolume}
              onToggleZoneMute={handleToggleZoneMute}
            />
          )}

          {currentTab === 'system-audit-logs' && <SystemAuditLogsView />}
        </main>
      </div>

      {/* Unified Login Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLoginSuccess={() => setIsLoginModalOpen(false)}
      />
    </div>
  );
};

export default App;
