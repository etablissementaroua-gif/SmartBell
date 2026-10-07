import React, { useState, useEffect } from 'react';
import { TabType, BellSchedule, IntermissionTrack } from './types';
import { supabaseService } from './core/supabaseService';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { ToastContainer, ToastMessage } from './components/Toast';
import { AudioUnlockBanner } from './components/AudioUnlockBanner';
import { LiveDashboardView } from './features/live_dashboard/LiveDashboardView';
import { BellSchedulerView } from './features/bell_scheduler/BellSchedulerView';
import { IntermissionPlaylistView } from './features/intermission_playlist/IntermissionPlaylistView';
import { AdhanSettingsView } from './features/adhan_settings/AdhanSettingsView';
import { SystemConfigurationView } from './features/system_configuration/SystemConfigurationView';
import { SystemAuditLogsView } from './features/system_audit_logs/SystemAuditLogsView';
import { LoginModal } from './features/authentication/LoginModal';
import { audioPlayerService } from './core/audioPlayerService';
import { smartSchedulerService } from './core/smartSchedulerService';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<TabType>('live-control-dashboard');
  const [masterVolume, setMasterVolume] = useState<number>(75);
  const [isEmergencyMuted, setIsEmergencyMuted] = useState<boolean>(false);
  const [schedules, setSchedules] = useState<BellSchedule[]>([]);
  const [tracks, setTracks] = useState<IntermissionTrack[]>([]);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: 'success' | 'error' | 'info' | 'warning', message: string, title?: string) => {
    const newToast: ToastMessage = {
      id: `toast-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      type,
      message,
      title,
    };
    setToasts((prev) => [...prev, newToast]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Sync schedules with smart scheduler engine
  useEffect(() => {
    smartSchedulerService.setSchedules(schedules);
  }, [schedules]);

  // Sync tracks with smart scheduler engine
  useEffect(() => {
    smartSchedulerService.setTracks(tracks);
  }, [tracks]);

  // Start smart scheduler loop and listen for triggers
  useEffect(() => {
    smartSchedulerService.start();

    const unsubTrigger = smartSchedulerService.onTrigger((sched, actionType) => {
      const typeLabel = actionType === 'BELL_THEN_PLAYLIST'
        ? 'رنين جرس يتبعه إذاعة الاستراحة'
        : actionType === 'DIRECT_AUDIO'
        ? 'بث مقطع صوتي مباشر'
        : 'رنين جرس مدرسي';

      addToast(
        'success',
        `انطلاق الموعد المجدول تلقائياً: [${sched.label}] في التوقيت ${sched.bell_time} (${typeLabel})`,
        '⏰ محرك الجدولة التلقائي'
      );
    });

    return () => {
      unsubTrigger();
      smartSchedulerService.stop();
    };
  }, []);

  // 1. Initial Load from Supabase with Fallback
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      const [fetchedSchedules, fetchedTracks] = await Promise.all([
        supabaseService.fetchBellSchedules(),
        supabaseService.fetchIntermissionTracks(),
      ]);

      if (isMounted) {
        setSchedules(fetchedSchedules);
        setTracks(fetchedTracks);
      }
    };

    loadData();

    // 2. Realtime Subscriptions
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
      unsubOverrides();
    };
  }, []);

  // Handlers wired to live Supabase mutations
  const handleToggleEmergencyMute = async () => {
    const nextState = !isEmergencyMuted;
    setIsEmergencyMuted(nextState);
    if (nextState) {
      addToast('error', 'تم تفعيل صمت الطوارئ العام وإيقاف كافة الأجراس والمكبرات فورياً.', 'صمت الطوارئ العام');
    } else {
      addToast('success', 'تم إلغاء صمت الطوارئ واستئناف عمل المنظومة بشكل طبيعي.', 'استئناف النظام');
    }
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
    addToast('info', `تم ${nextEnabled ? 'تفعيل' : 'تعطيل'} موعد: ${sched.label}`, 'جدول الأجراس');
    await supabaseService.toggleBellSchedule(id, nextEnabled);
  };

  const handleAddSchedule = async (newSched: Omit<BellSchedule, 'id'>) => {
    const tempId = `sched-${Date.now()}`;
    setSchedules((prev) => [...prev, { ...newSched, id: tempId }]);
    addToast('success', `تمت إضافة جرس جديد: ${newSched.label}`, 'إضافة جرس');
    await supabaseService.createBellSchedule(newSched);
    const fresh = await supabaseService.fetchBellSchedules();
    setSchedules(fresh);
  };

  const handleUpdateSchedule = async (id: string, updates: Partial<BellSchedule>) => {
    setSchedules((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
    addToast('success', 'تم تعديل بيانات موعد الجرس بنجاح.', 'تحديث الموعد');
    await supabaseService.updateBellSchedule(id, updates);
    const fresh = await supabaseService.fetchBellSchedules();
    setSchedules(fresh);
  };

  const handleDeleteSchedule = async (id: string) => {
    const sched = schedules.find((s) => s.id === id);
    setSchedules((prev) => prev.filter((s) => s.id !== id));
    addToast('warning', `تم حذف موعد الجرس: ${sched?.label || id}`, 'حذف جرس');
    await supabaseService.deleteBellSchedule(id);
    const fresh = await supabaseService.fetchBellSchedules();
    setSchedules(fresh);
  };

  const handleToggleTrack = async (id: string) => {
    const track = tracks.find((t) => t.id === id);
    if (!track) return;
    const nextActive = !track.is_active;
    setTracks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, is_active: nextActive } : t))
    );
    addToast('info', `تم ${nextActive ? 'تفعيل' : 'تعطيل'} الفقرة: ${track.title}`, 'قائمة الاستراحة');
    await supabaseService.toggleIntermissionTrack(id, nextActive);
  };

  const handleAddTrack = async (
    newTrack: Omit<IntermissionTrack, 'id' | 'duration_formatted'>,
    fileBlob?: Blob
  ): Promise<string | undefined> => {
    addToast('success', `تمت إضافة الفقرة الإذاعية: ${newTrack.title}`, 'إضافة فقرة');
    const created = await supabaseService.createIntermissionTrack(newTrack);
    if (created && created.id && fileBlob) {
      await audioPlayerService.saveAudioBlob(created.id, fileBlob);
      await audioPlayerService.saveAudioBlob(created.title, fileBlob);
    }
    const fresh = await supabaseService.fetchIntermissionTracks();
    setTracks(fresh);
    return created?.id;
  };

  const handleUpdateTrack = async (id: string, updates: Partial<IntermissionTrack>) => {
    setTracks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
    );
    addToast('success', 'تم تعديل بيانات الفقرة الإذاعية بنجاح.', 'تحديث الفقرة');
    await supabaseService.updateIntermissionTrack(id, updates);
    const fresh = await supabaseService.fetchIntermissionTracks();
    setTracks(fresh);
  };

  const handleDeleteTrack = async (id: string) => {
    const track = tracks.find((t) => t.id === id);
    setTracks((prev) => prev.filter((t) => t.id !== id));
    addToast('warning', `تم حذف الفقرة الإذاعية: ${track?.title || id}`, 'حذف فقرة');
    await supabaseService.deleteIntermissionTrack(id);
    const fresh = await supabaseService.fetchIntermissionTracks();
    setTracks(fresh);
  };

  const handleMoveTrack = async (id: string, direction: 'up' | 'down') => {
    const idx = tracks.findIndex((t) => t.id === id);
    if (idx < 0) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= tracks.length) return;
    const newArr = [...tracks];
    const temp = newArr[idx];
    newArr[idx] = newArr[targetIdx];
    newArr[targetIdx] = temp;
    setTracks(newArr);
    addToast('info', 'تم تعديل ترتيب بث الفقرة بنجاح.', 'ترتيب البث');
    await supabaseService.reorderIntermissionTracks(newArr.map((t) => t.id));
  };

  return (
    <div className="min-h-screen bg-surface font-cairo text-on-surface antialiased" dir="rtl">
      {/* Toast Notification Layer */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />

      {/* Web Audio Autoplay Unlock Floating Banner */}
      <AudioUnlockBanner />

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
              onShowToast={addToast}
            />
          )}

          {currentTab === 'bell-schedules' && (
            <BellSchedulerView
              schedules={schedules}
              tracks={tracks}
              onToggleSchedule={handleToggleSchedule}
              onAddSchedule={handleAddSchedule}
              onUpdateSchedule={handleUpdateSchedule}
              onDeleteSchedule={handleDeleteSchedule}
              onShowToast={addToast}
            />
          )}

          {currentTab === 'break-programming' && (
            <IntermissionPlaylistView
              tracks={tracks}
              onToggleTrack={handleToggleTrack}
              onMoveTrack={handleMoveTrack}
              onAddTrack={handleAddTrack}
              onUpdateTrack={handleUpdateTrack}
              onDeleteTrack={handleDeleteTrack}
              onShowToast={addToast}
            />
          )}

          {currentTab === 'athan-settings' && <AdhanSettingsView onShowToast={addToast} />}

          {(currentTab === 'system-configuration' || currentTab === 'media-library') && (
            <SystemConfigurationView
              tracks={tracks}
              onAddTrack={handleAddTrack}
              onDeleteTrack={handleDeleteTrack}
              onShowToast={addToast}
            />
          )}

          {currentTab === 'system-audit-logs' && <SystemAuditLogsView onShowToast={addToast} />}
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
