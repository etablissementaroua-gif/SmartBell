import React, { useState } from 'react';
import { TabType, BellSchedule, IntermissionTrack, AudioZone } from './types';
import { initialBellSchedules, initialIntermissionTracks, initialAudioZones } from './core/mockData';
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
  const [schedules, setSchedules] = useState<BellSchedule[]>(initialBellSchedules);
  const [tracks, setTracks] = useState<IntermissionTrack[]>(initialIntermissionTracks);
  const [zones, setZones] = useState<AudioZone[]>(initialAudioZones);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);

  // Handlers
  const handleToggleEmergencyMute = () => {
    setIsEmergencyMuted((prev) => !prev);
  };

  const handleToggleSchedule = (id: string) => {
    setSchedules((prev) =>
      prev.map((s) => (s.id === id ? { ...s, is_enabled: !s.is_enabled } : s))
    );
  };

  const handleAddSchedule = (newSched: Omit<BellSchedule, 'id'>) => {
    const id = `sched-${Date.now()}`;
    setSchedules((prev) => [...prev, { ...newSched, id }]);
  };

  const handleDeleteSchedule = (id: string) => {
    setSchedules((prev) => prev.filter((s) => s.id !== id));
  };

  const handleToggleTrack = (id: string) => {
    setTracks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, is_active: !t.is_active } : t))
    );
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

  const handleUpdateZoneVolume = (zoneId: string, volume: number) => {
    setZones((prev) =>
      prev.map((z) => (z.id === zoneId ? { ...z, volume } : z))
    );
  };

  const handleToggleZoneMute = (zoneId: string) => {
    setZones((prev) =>
      prev.map((z) => (z.id === zoneId ? { ...z, is_muted: !z.is_muted } : z))
    );
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
          onMasterVolumeChange={setMasterVolume}
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
