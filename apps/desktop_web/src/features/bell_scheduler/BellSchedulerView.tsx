import React, { useState } from 'react';
import { 
  BellSchedule, 
  BellType, 
  BellActionType, 
  IntermissionTrack, 
  SCHOOL_DAYS,
  parseScheduleDetails,
  serializeScheduleDetails
} from '../../types';
import { supabaseService } from '../../core/supabaseService';
import { audioPlayerService } from '../../core/audioPlayerService';

interface BellSchedulerViewProps {
  schedules: BellSchedule[];
  tracks?: IntermissionTrack[];
  onToggleSchedule: (id: string) => void;
  onAddSchedule: (schedule: Omit<BellSchedule, 'id'>) => void;
  onUpdateSchedule?: (id: string, updates: Partial<BellSchedule>) => void;
  onDeleteSchedule: (id: string) => void;
  onShowToast?: (type: 'success' | 'error' | 'info' | 'warning', message: string, title?: string) => void;
}

export const BellSchedulerView: React.FC<BellSchedulerViewProps> = ({
  schedules,
  tracks = [],
  onToggleSchedule,
  onAddSchedule,
  onUpdateSchedule,
  onDeleteSchedule,
  onShowToast,
}) => {
  const [activePreset, setActivePreset] = useState<string>('preset-1');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [editingSchedule, setEditingSchedule] = useState<BellSchedule | null>(null);

  // --- Add Form State ---
  const [newLabel, setNewLabel] = useState<string>('');
  const [newTime, setNewTime] = useState<string>('08:00');
  const [newType, setNewType] = useState<BellType>('ENTRY');
  const [newDays, setNewDays] = useState<number[]>([1, 2, 3, 4, 5, 6]);
  const [newActionType, setNewActionType] = useState<BellActionType>('BELL_ONLY');
  const [newDuration, setNewDuration] = useState<number>(15);
  const [newZone, setNewZone] = useState<string>('ALL');
  const [newMediaId, setNewMediaId] = useState<string>('');
  const [newPlaylistSession, setNewPlaylistSession] = useState<'MORNING_BREAK' | 'NOON_BREAK'>('MORNING_BREAK');
  const [newDetails, setNewDetails] = useState<string>('');

  // --- Edit Form State ---
  const [editLabel, setEditLabel] = useState<string>('');
  const [editTime, setEditTime] = useState<string>('08:00');
  const [editType, setEditType] = useState<BellType>('ENTRY');
  const [editDays, setEditDays] = useState<number[]>([1, 2, 3, 4, 5, 6]);
  const [editActionType, setEditActionType] = useState<BellActionType>('BELL_ONLY');
  const [editDuration, setEditDuration] = useState<number>(15);
  const [editZone, setEditZone] = useState<string>('ALL');
  const [editMediaId, setEditMediaId] = useState<string>('');
  const [editPlaylistSession, setEditPlaylistSession] = useState<'MORNING_BREAK' | 'NOON_BREAK'>('MORNING_BREAK');
  const [editDetails, setEditDetails] = useState<string>('');

  const [testingId, setTestingId] = useState<string | null>(null);

  const presets = [
    { id: 'preset-1', name: 'الدوام المدرسي الكامل', active: activePreset === 'preset-1', count: schedules.length },
    { id: 'preset-2', name: 'التوقيت المدرسي الرمضاني', active: activePreset === 'preset-2', count: 0 },
    { id: 'preset-3', name: 'جدول فترات الامتحانات الموحدة', active: activePreset === 'preset-3', count: 0 },
  ];

  const handleOpenAdd = () => {
    setNewLabel('');
    setNewTime('08:00');
    setNewType('ENTRY');
    setNewDays([1, 2, 3, 4, 5, 6]);
    setNewActionType('BELL_ONLY');
    setNewDuration(15);
    setNewZone('ALL');
    setNewMediaId(tracks.length > 0 ? tracks[0].id : '');
    setNewPlaylistSession('MORNING_BREAK');
    setNewDetails('');
    setShowAddModal(true);
  };

  const handleOpenEdit = (sched: BellSchedule) => {
    setEditingSchedule(sched);
    setEditLabel(sched.label);
    setEditTime(sched.bell_time);
    setEditType(sched.bell_type);
    setEditDuration(sched.duration_seconds || 15);
    setEditZone(sched.target_zones?.[0] || 'ALL');

    const meta = parseScheduleDetails(sched.details);
    setEditDays(sched.days_of_week || meta.days_of_week || [1, 2, 3, 4, 5, 6]);
    setEditActionType(sched.action_type || meta.action_type || 'BELL_ONLY');
    setEditMediaId(sched.media_id || meta.media_id || (tracks.length > 0 ? tracks[0].id : ''));
    setEditPlaylistSession(sched.playlist_session || meta.playlist_session || 'MORNING_BREAK');
    setEditDetails(meta.description || sched.details || '');
  };

  const toggleDay = (dayId: number, currentDays: number[], setFn: (days: number[]) => void) => {
    if (currentDays.includes(dayId)) {
      if (currentDays.length === 1) return; // Keep at least one day
      setFn(currentDays.filter((d) => d !== dayId).sort());
    } else {
      setFn([...currentDays, dayId].sort());
    }
  };

  const handleTestSound = (sched: BellSchedule) => {
    setTestingId(sched.id);

    const actionType = sched.action_type || parseScheduleDetails(sched.details).action_type;
    const session = sched.playlist_session || parseScheduleDetails(sched.details).playlist_session || 'MORNING_BREAK';
    const mediaId = sched.media_id || parseScheduleDetails(sched.details).media_id;

    if (actionType === 'DIRECT_AUDIO') {
      const targetTrack = tracks.find((t) => t.id === mediaId) || tracks[0];
      if (targetTrack) {
        audioPlayerService.playTrack(targetTrack);
        if (onShowToast) {
          onShowToast('info', `جاري معاينة البث الصوتي المباشر: ${targetTrack.title}`, 'معاينة البث');
        }
      } else {
        audioPlayerService.playSchoolBellChime(sched.bell_type, 3);
      }
    } else if (actionType === 'BELL_THEN_PLAYLIST') {
      const sessionTracks = tracks.filter((t) => t.session === session && t.is_active);
      audioPlayerService.playBellThenPlaylist(sched.bell_type, 3, sessionTracks, sched.label);
      if (onShowToast) {
        onShowToast('info', `اختبار تسلسل الاستراحة: رنين الجرس يتبعه تشغيل ${sessionTracks.length} فقرات إذاعية تلقائياً.`, 'تسلسل ذكي');
      }
    } else {
      // Bell only
      audioPlayerService.playSchoolBellChime(sched.bell_type, 3);
      if (onShowToast) {
        onShowToast('info', `جاري بث نغمة رنين تجريبية لجرس: [${sched.label}]`, 'اختبار الجرس');
      }
    }

    // Also trigger instant override on Supabase for daemon sync
    supabaseService.triggerInstantOverride(
      'INSTANT_ENTRY',
      sched.target_zones?.[0] || 'ALL',
      { bell_name: sched.label, duration_seconds: 3, test_mode: true }
    );

    setTimeout(() => {
      setTestingId(null);
    }, 3000);
  };

  const handleSubmitAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim()) return;

    const selectedTrack = tracks.find((t) => t.id === newMediaId);
    const metaPayload = {
      days_of_week: newDays,
      action_type: newActionType,
      media_id: newMediaId,
      media_title: selectedTrack ? selectedTrack.title : undefined,
      playlist_session: newPlaylistSession,
      description: newDetails.trim() || undefined,
    };

    onAddSchedule({
      preset_id: activePreset,
      bell_time: newTime,
      bell_type: newType,
      label: newLabel.trim(),
      details: serializeScheduleDetails(metaPayload),
      duration_seconds: newDuration,
      target_zones: [newZone],
      is_enabled: true,
      audio_url: newActionType === 'DIRECT_AUDIO' && selectedTrack ? selectedTrack.audio_url : undefined,
      days_of_week: newDays,
      action_type: newActionType,
      media_id: newMediaId,
      media_title: selectedTrack?.title,
      playlist_session: newPlaylistSession,
    });

    setShowAddModal(false);
  };

  const handleSubmitEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSchedule || !editLabel.trim()) return;

    const selectedTrack = tracks.find((t) => t.id === editMediaId);
    const metaPayload = {
      days_of_week: editDays,
      action_type: editActionType,
      media_id: editMediaId,
      media_title: selectedTrack ? selectedTrack.title : undefined,
      playlist_session: editPlaylistSession,
      description: editDetails.trim() || undefined,
    };

    if (onUpdateSchedule) {
      onUpdateSchedule(editingSchedule.id, {
        label: editLabel.trim(),
        bell_time: editTime,
        bell_type: editType,
        duration_seconds: editDuration,
        target_zones: [editZone],
        details: serializeScheduleDetails(metaPayload),
        audio_url: editActionType === 'DIRECT_AUDIO' && selectedTrack ? selectedTrack.audio_url : undefined,
        days_of_week: editDays,
        action_type: editActionType,
        media_id: editMediaId,
        media_title: selectedTrack?.title,
        playlist_session: editPlaylistSession,
      });
    }

    setEditingSchedule(null);
  };

  const getBellTypeBadge = (type: BellType) => {
    switch (type) {
      case 'ENTRY':
        return <span className="px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed text-xs font-bold">جرس دخول</span>;
      case 'EXIT':
        return <span className="px-2 py-0.5 rounded-full bg-primary-container text-teal-accent text-xs font-bold">جرس انصراف</span>;
      case 'BREAK':
        return <span className="px-2 py-0.5 rounded-full bg-surface-container-highest text-on-surface text-xs font-bold">استراحة / فسحة</span>;
      case 'WARNING':
        return <span className="px-2 py-0.5 rounded-full bg-error-container text-on-error-container text-xs font-bold">تنبيه عودة</span>;
    }
  };

  const getActionTypeBadge = (sched: BellSchedule) => {
    const action = sched.action_type || parseScheduleDetails(sched.details).action_type;
    const session = sched.playlist_session || parseScheduleDetails(sched.details).playlist_session;
    const mediaTitle = sched.media_title || parseScheduleDetails(sched.details).media_title;

    switch (action) {
      case 'BELL_THEN_PLAYLIST':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-teal-dark/10 text-teal-dark border border-teal-dark/30 text-[11px] font-bold">
            <span className="material-symbols-outlined text-sm">queue_music</span>
            <span>جرس + إذاعة {session === 'MORNING_BREAK' ? 'الصباح' : 'الظهيرة'}</span>
          </span>
        );
      case 'DIRECT_AUDIO':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 text-[11px] font-bold">
            <span className="material-symbols-outlined text-sm">music_note</span>
            <span>بث: {mediaTitle || 'مقطع صوتي'}</span>
          </span>
        );
      case 'BELL_ONLY':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant text-[11px] font-medium">
            <span className="material-symbols-outlined text-sm">notifications</span>
            <span>رنين جرس فقط ({sched.duration_seconds} ث)</span>
          </span>
        );
    }
  };

  const getDaysDisplay = (sched: BellSchedule) => {
    const days = sched.days_of_week || parseScheduleDetails(sched.details).days_of_week || [1, 2, 3, 4, 5, 6];
    if (days.length === 6) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-dark bg-secondary-container/50 px-2 py-0.5 rounded-full">
          <span className="material-symbols-outlined text-xs">all_inclusive</span>
          <span>كل الأيام (ن-س)</span>
        </span>
      );
    }
    if (days.length === 1 && days[0] === 1) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full">
          <span className="material-symbols-outlined text-xs">flag</span>
          <span>الإثنين فقط (النشيد الوطني)</span>
        </span>
      );
    }
    return (
      <div className="flex items-center gap-1 flex-wrap">
        {SCHOOL_DAYS.map((d) => {
          const isActive = days.includes(d.id);
          return (
            <span
              key={d.id}
              className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                isActive
                  ? 'bg-teal-dark text-white shadow-xs'
                  : 'bg-surface-container text-on-surface-variant/40'
              }`}
              title={d.name}
            >
              {d.short}
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-space-xl w-full max-w-[1720px] mx-auto pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-lg bg-surface-container-lowest p-space-lg rounded-2xl shadow-sm border border-surface-container-high/60">
        <div className="flex items-center gap-space-lg">
          <div className="w-14 h-14 rounded-2xl bg-secondary-container flex items-center justify-center text-teal-dark shadow-sm">
            <span className="material-symbols-outlined text-3xl">alarm_on</span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-space-sm flex-wrap">
              <h1 className="text-xl md:text-2xl font-bold text-on-surface">منظومة المنبه والجدولة الذكية (Smart Timeline & Alarm)</h1>
              <span className="px-space-sm py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed text-xs font-bold font-mono">
                Auto-Chained Engine v2.5
              </span>
            </div>
            <p className="text-sm text-on-surface-variant mt-0.5">
              برمجة مواعيد الأجراس المدرسية، تخصيص أيام الأسبوع بدقة، وتشغيل البث التلقائي لإذاعة الاستراحات فور انتهاء رنين الجرس.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-space-xl py-2.5 bg-teal-dark hover:bg-secondary text-white rounded-xl font-bold text-xs shadow-md transition-all active:scale-95"
        >
          <span className="material-symbols-outlined text-lg">add_alarm</span>
          <span>إضافة موعد أو منبه ذكي جديد</span>
        </button>
      </div>

      {/* Preset Switcher Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
        {presets.map((preset) => {
          const isSelected = activePreset === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => setActivePreset(preset.id)}
              className={`p-space-lg rounded-2xl text-right transition-all border flex flex-col justify-between gap-3 shadow-sm ${
                isSelected
                  ? 'bg-primary-container text-white border-teal-dark ring-2 ring-teal-dark/30 shadow-md'
                  : 'bg-surface-container-lowest text-on-surface border-surface-container-high/60 hover:bg-surface-container-low'
              }`}
            >
              <div className="flex items-start justify-between">
                <span className={`material-symbols-outlined text-2xl ${isSelected ? 'text-teal-accent' : 'text-teal-dark'}`}>
                  {isSelected ? 'check_circle' : 'schedule'}
                </span>
                {isSelected && (
                  <span className="px-2 py-0.5 rounded-full bg-teal-dark text-white text-[11px] font-bold">
                    القالب المفعّل حالياً
                  </span>
                )}
              </div>
              <div>
                <h3 className="font-bold text-base leading-snug">{preset.name}</h3>
                <span className={`text-xs mt-1 block font-mono ${isSelected ? 'text-slate-300' : 'text-on-surface-variant'}`}>
                  يحتوي على {preset.count} أحداث مبرمجة
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Smart Alarm Engine Schedules Table */}
      <div className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm border border-surface-container-high/60 flex flex-col gap-space-md">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-teal-dark text-xl">event_upcoming</span>
            <h2 className="text-base font-bold text-on-surface">جدول الأحداث والمواعيد المبرمجة للمدرسة</h2>
          </div>
          <div className="flex items-center gap-space-sm text-xs text-on-surface-variant">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-dark animate-pulse"></span>
            <span>الجدولة التلقائية متزامنة بالثواني مع عتاد المدرسة</span>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl bg-surface-container-low border border-surface-container">
          {schedules.length === 0 ? (
            <div className="py-12 px-6 flex flex-col items-center justify-center text-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-secondary-container/40 flex items-center justify-center text-teal-dark shadow-sm">
                <span className="material-symbols-outlined text-3xl">notifications_off</span>
              </div>
              <h3 className="text-base font-bold text-on-surface">لا توجد أجراس مجدولة حالياً</h3>
              <p className="text-xs text-on-surface-variant max-w-md leading-relaxed">
                ابدأ ببرمجة مواعيد الحصص والاستراحات أو النشيد الوطني وتحديد أيام الأسبوع المخصصة لكل حدث.
              </p>
              <button
                type="button"
                onClick={handleOpenAdd}
                className="mt-2 flex items-center gap-2 px-space-lg py-2.5 bg-teal-dark hover:bg-secondary text-white rounded-xl font-bold text-xs shadow-md transition-all active:scale-95"
              >
                <span className="material-symbols-outlined text-base">add_alarm</span>
                <span>إضافة أول موعد ذكي الآن</span>
              </button>
            </div>
          ) : (
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="text-on-surface-variant font-bold bg-surface-container">
                  <th className="py-space-sm px-space-md">التوقيت</th>
                  <th className="py-space-sm px-space-md">مسمى الحدث المدرسي</th>
                  <th className="py-space-sm px-space-md">نوع الإجراء (Action Type)</th>
                  <th className="py-space-sm px-space-md">أيام الأسبوع المستهدفة</th>
                  <th className="py-space-sm px-space-md">المدة / الصوت</th>
                  <th className="py-space-sm px-space-md">المناطق الموجهة</th>
                  <th className="py-space-sm px-space-md text-center">التفعيل</th>
                  <th className="py-space-sm px-space-md text-center">معاينة وإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container">
                {schedules.map((schedule) => (
                  <tr key={schedule.id} className="hover:bg-surface-container-lowest/60 transition-colors">
                    <td className="py-space-md px-space-md font-mono font-bold text-sm text-teal-dark whitespace-nowrap">
                      {schedule.bell_time} {schedule.bell_time.startsWith('12') || schedule.bell_time.startsWith('13') || schedule.bell_time.startsWith('14') || schedule.bell_time.startsWith('15') || schedule.bell_time.startsWith('16') || schedule.bell_time.startsWith('17') ? 'م' : 'ص'}
                    </td>
                    <td className="py-space-md px-space-md">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-on-surface text-[13px]">{schedule.label}</span>
                          {getBellTypeBadge(schedule.bell_type)}
                        </div>
                        {schedule.details && (
                          <span className="text-[11px] text-on-surface-variant line-clamp-1">{schedule.details}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-space-md px-space-md">
                      {getActionTypeBadge(schedule)}
                    </td>
                    <td className="py-space-md px-space-md">
                      {getDaysDisplay(schedule)}
                    </td>
                    <td className="py-space-md px-space-md font-mono font-bold text-on-surface whitespace-nowrap">
                      {schedule.duration_seconds} ثانية
                    </td>
                    <td className="py-space-md px-space-md">
                      <div className="flex gap-1 flex-wrap">
                        {schedule.target_zones.map((zone, idx) => (
                          <span key={idx} className="px-1.5 py-0.5 rounded bg-surface-container text-[10px] text-on-surface font-medium">
                            {zone === 'ALL' ? 'كافة المدرسة' : zone}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-space-md px-space-md text-center">
                      <button
                        type="button"
                        onClick={() => onToggleSchedule(schedule.id)}
                        className={`w-11 h-6 rounded-full transition-colors relative p-0.5 inline-block ${
                          schedule.is_enabled ? 'bg-teal-dark' : 'bg-surface-container-highest'
                        }`}
                        title={schedule.is_enabled ? 'تعطيل الموعد' : 'تفعيل الموعد'}
                      >
                        <div
                          className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                            schedule.is_enabled ? '-translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </td>
                    <td className="py-space-md px-space-md text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleTestSound(schedule)}
                          disabled={testingId === schedule.id}
                          className={`p-1.5 rounded-lg transition-all ${
                            testingId === schedule.id
                              ? 'bg-teal-dark text-white ring-2 ring-teal-dark/30 animate-pulse'
                              : 'text-on-surface-variant hover:text-teal-dark hover:bg-surface-container'
                          }`}
                          title="معاينة وتشغيل فوري"
                        >
                          <span className="material-symbols-outlined text-lg">
                            {testingId === schedule.id ? 'graphic_eq' : 'play_arrow'}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(schedule)}
                          className="p-1.5 rounded-lg text-on-surface-variant hover:text-teal-dark hover:bg-surface-container transition-colors"
                          title="تعديل الموعد"
                        >
                          <span className="material-symbols-outlined text-lg">edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteSchedule(schedule.id)}
                          className="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-surface-container transition-colors"
                          title="حذف الموعد"
                        >
                          <span className="material-symbols-outlined text-lg">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ADD MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-surface-container-lowest rounded-2xl max-w-lg w-full p-space-xl shadow-2xl border border-surface-container-high my-8 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-surface-container">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-teal-dark text-2xl">alarm_add</span>
                <h3 className="font-bold text-base text-on-surface">إضافة منبه / موعد مدرسي ذكي جديد</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-on-surface-variant hover:text-error p-1 rounded-lg"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmitAdd} className="flex flex-col gap-space-md mt-space-md">
              {/* Event Name & Quick Presets */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-on-surface-variant">مسمى الحدث المدرسي:</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: طابور الصباح والنشيد الوطني، استراحة الصباح الأولى..."
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  className="bg-surface-container-low px-space-md py-2.5 rounded-xl text-xs text-on-surface border border-surface-container focus:ring-2 focus:ring-teal-dark outline-none font-medium"
                />
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-[11px] text-on-surface-variant">اقتراحات سريعة:</span>
                  {[
                    'طابور الصباح والنشيد الوطني',
                    'بداية الحصة الأولى',
                    'بداية الاستراحة الأولى',
                    'نهاية الاستراحة وعودة الفصول',
                    'استراحة الظهيرة',
                    'جرس الانصراف والمغادرة',
                  ].map((presetText) => (
                    <button
                      key={presetText}
                      type="button"
                      onClick={() => setNewLabel(presetText)}
                      className="px-2 py-0.5 rounded-md bg-surface-container hover:bg-surface-container-highest text-on-surface-variant text-[10px] font-medium transition-colors"
                    >
                      {presetText}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time & Bell Type Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-on-surface-variant">توقيت الرنين (ساعة : دقيقة):</label>
                  <input
                    type="time"
                    step="1"
                    required
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="bg-surface-container-low px-space-md py-2.5 rounded-xl text-xs text-on-surface border border-surface-container focus:ring-2 focus:ring-teal-dark outline-none font-mono"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-on-surface-variant">تصنيف التوقيت المدرسي:</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as BellType)}
                    className="bg-surface-container-low px-space-md py-2.5 rounded-xl text-xs text-on-surface border border-surface-container focus:ring-2 focus:ring-teal-dark outline-none cursor-pointer"
                  >
                    <option value="ENTRY">جرس دخول / طابور الصباح</option>
                    <option value="EXIT">جرس انصراف الطلاب</option>
                    <option value="BREAK">استراحة / فسحة مدرسية</option>
                    <option value="WARNING">تنبيه نهاية الحصة / عودة</option>
                  </select>
                </div>
              </div>

              {/* Day Picker (محدد الأيام) */}
              <div className="flex flex-col gap-1.5 p-space-md bg-surface-container-low rounded-xl border border-surface-container">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-teal-dark">calendar_month</span>
                    <span>محدد أيام الأسبوع المستهدفة:</span>
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setNewDays([1, 2, 3, 4, 5, 6])}
                      className="text-[10px] text-teal-dark font-bold hover:underline"
                    >
                      طيلة الأسبوع
                    </button>
                    <span className="text-on-surface-variant/40">|</span>
                    <button
                      type="button"
                      onClick={() => setNewDays([1])}
                      className="text-[10px] text-amber-600 dark:text-amber-400 font-bold hover:underline"
                    >
                      الإثنين فقط
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-6 gap-1.5 pt-1">
                  {SCHOOL_DAYS.map((day) => {
                    const isSelected = newDays.includes(day.id);
                    return (
                      <button
                        key={day.id}
                        type="button"
                        onClick={() => toggleDay(day.id, newDays, setNewDays)}
                        className={`py-2 px-1 rounded-xl text-xs font-bold text-center transition-all ${
                          isSelected
                            ? 'bg-teal-dark text-white shadow-sm ring-1 ring-teal-dark'
                            : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                        }`}
                      >
                        <div>{day.short}</div>
                        <div className="text-[9px] font-normal opacity-80">{day.name}</div>
                      </button>
                    );
                  })}
                </div>
                <span className="text-[11px] text-on-surface-variant mt-0.5">
                  {newDays.length === 1 && newDays[0] === 1 
                    ? '⭐ مخصص ليوم الإثنين حصراً (مثل تحية العلم والنشيد الوطني)' 
                    : `سيعمل الحدث في ${newDays.length} أيام أسبوعياً.`}
                </span>
              </div>

              {/* Action Type (نوع الإجراء: 3 خيارات) */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-teal-dark">bolt</span>
                  <span>نوع الإجراء التلقائي (Action Type):</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewActionType('BELL_ONLY')}
                    className={`p-space-sm rounded-xl text-right border transition-all flex flex-col gap-1 ${
                      newActionType === 'BELL_ONLY'
                        ? 'bg-teal-dark/10 border-teal-dark ring-1 ring-teal-dark text-teal-dark'
                        : 'bg-surface-container-low border-surface-container text-on-surface hover:bg-surface-container'
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-base">notifications</span>
                      <span className="font-bold text-xs">رنين جرس فقط</span>
                    </div>
                    <span className="text-[10px] text-on-surface-variant">رنين مدته بالثواني المحددة فقط</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewActionType('BELL_THEN_PLAYLIST')}
                    className={`p-space-sm rounded-xl text-right border transition-all flex flex-col gap-1 ${
                      newActionType === 'BELL_THEN_PLAYLIST'
                        ? 'bg-teal-dark/10 border-teal-dark ring-1 ring-teal-dark text-teal-dark'
                        : 'bg-surface-container-low border-surface-container text-on-surface hover:bg-surface-container'
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-base">auto_mode</span>
                      <span className="font-bold text-xs">جرس + إذاعة</span>
                    </div>
                    <span className="text-[10px] text-on-surface-variant">جرس ثم إطلاق إذاعة الاستراحة تلقائياً</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewActionType('DIRECT_AUDIO')}
                    className={`p-space-sm rounded-xl text-right border transition-all flex flex-col gap-1 ${
                      newActionType === 'DIRECT_AUDIO'
                        ? 'bg-teal-dark/10 border-teal-dark ring-1 ring-teal-dark text-teal-dark'
                        : 'bg-surface-container-low border-surface-container text-on-surface hover:bg-surface-container'
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-base">music_note</span>
                      <span className="font-bold text-xs">بث مقطع صوتي</span>
                    </div>
                    <span className="text-[10px] text-on-surface-variant">النشيد الوطني أو قرآن مباشر</span>
                  </button>
                </div>
              </div>

              {/* Dynamic Action Details */}
              {newActionType === 'BELL_ONLY' && (
                <div className="grid grid-cols-2 gap-space-md p-space-md bg-surface-container-low rounded-xl border border-surface-container">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-on-surface-variant">مدة الرنين بالثواني:</label>
                    <input
                      type="number"
                      min="3"
                      max="60"
                      value={newDuration}
                      onChange={(e) => setNewDuration(Number(e.target.value))}
                      className="bg-surface-container px-space-md py-2 rounded-xl text-xs text-on-surface border border-surface-container-high focus:ring-1 focus:ring-teal-dark outline-none font-mono"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-bold text-on-surface-variant">نغمة الجرس:</label>
                    <select
                      value={newType}
                      onChange={(e) => setNewType(e.target.value as BellType)}
                      className="bg-surface-container px-space-md py-2 rounded-xl text-xs text-on-surface border border-surface-container-high focus:ring-1 focus:ring-teal-dark outline-none cursor-pointer"
                    >
                      <option value="ENTRY">نغمة الدخول التقليدية</option>
                      <option value="EXIT">نغمة الانصراف المدرسي</option>
                      <option value="BREAK">نغمة الاستراحة والفسحة</option>
                      <option value="WARNING">نغمة التنبيه المزدوجة</option>
                    </select>
                  </div>
                </div>
              )}

              {newActionType === 'BELL_THEN_PLAYLIST' && (
                <div className="flex flex-col gap-2 p-space-md bg-teal-dark/5 rounded-xl border border-teal-dark/30">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-teal-dark flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">queue_music</span>
                      <span>تسلسل الاستراحة التلقائي (Auto-Chaining):</span>
                    </span>
                    <span className="text-[10px] text-teal-dark font-mono font-bold">رنين 15ث ثم الإذاعة</span>
                  </div>
                  <div className="grid grid-cols-2 gap-space-md pt-1">
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-bold text-on-surface-variant">اختر قائمة الاستراحة:</label>
                      <select
                        value={newPlaylistSession}
                        onChange={(e) => setNewPlaylistSession(e.target.value as any)}
                        className="bg-surface-container-low px-space-md py-2 rounded-xl text-xs text-on-surface border border-surface-container focus:ring-1 focus:ring-teal-dark outline-none cursor-pointer font-bold"
                      >
                        <option value="MORNING_BREAK">الاستراحة الصباحية الأولى</option>
                        <option value="NOON_BREAK">استراحة الظهيرة والمساء</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-bold text-on-surface-variant">مدة جرس الاستراحة (ثوانٍ):</label>
                      <input
                        type="number"
                        min="5"
                        max="30"
                        value={newDuration}
                        onChange={(e) => setNewDuration(Number(e.target.value))}
                        className="bg-surface-container-low px-space-md py-2 rounded-xl text-xs text-on-surface border border-surface-container focus:ring-1 focus:ring-teal-dark outline-none font-mono"
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-on-surface-variant leading-relaxed mt-1">
                    💡 فور انتهاء رنين الجرس، سيبدأ النظام الصوتي تلقائياً ببث فقرات وأناشيد هذه الاستراحة بالتتابع دون أي تدخل يدوي.
                  </p>
                </div>
              )}

              {newActionType === 'DIRECT_AUDIO' && (
                <div className="flex flex-col gap-2 p-space-md bg-indigo-500/5 rounded-xl border border-indigo-500/30">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">library_music</span>
                      <span>اختيار المقطع الصوتي من مكتبة الوسائط:</span>
                    </span>
                    <span className="text-[10px] text-on-surface-variant font-mono">
                      {tracks.length} مقاطع متوفرة
                    </span>
                  </div>
                  <select
                    value={newMediaId}
                    onChange={(e) => setNewMediaId(e.target.value)}
                    className="bg-surface-container-low px-space-md py-2.5 rounded-xl text-xs text-on-surface border border-surface-container focus:ring-1 focus:ring-indigo-500 outline-none cursor-pointer font-bold"
                  >
                    {tracks.length === 0 ? (
                      <option value="">لا توجد ملفات مرفوعة في المكتبة - سيتم استخدام النشيد الافتراضي</option>
                    ) : (
                      tracks.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.title} ({t.speaker_or_artist || 'مدرسي'} - {t.duration_formatted})
                        </option>
                      ))
                    )}
                  </select>
                </div>
              )}

              {/* Broadcast Zone */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-on-surface-variant">منطقة البث المستهدفة:</label>
                <select
                  value={newZone}
                  onChange={(e) => setNewZone(e.target.value)}
                  className="bg-surface-container-low px-space-md py-2 rounded-xl text-xs text-on-surface border border-surface-container focus:ring-2 focus:ring-teal-dark outline-none cursor-pointer"
                >
                  <option value="ALL">كافة أرجاء المدرسة (المكبرات المركزية)</option>
                  <option value="ZONE_A">الساحة والملاعب الخارجية فقط</option>
                  <option value="ZONE_B">الممرات والمطعم المدرسي</option>
                  <option value="ZONE_C">الإدارة وقاعة الأساتذة</option>
                  <option value="ZONE_D">المصلى المدرسي</option>
                </select>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-2 pt-space-md border-t border-surface-container">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-space-md py-2 rounded-xl bg-surface-container text-on-surface text-xs font-bold hover:bg-surface-container-highest transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-space-xl py-2 rounded-xl bg-teal-dark text-white text-xs font-bold hover:bg-secondary transition-colors shadow-sm"
                >
                  حفظ وتثبيت المنبه الذكي
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingSchedule && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-surface-container-lowest rounded-2xl max-w-lg w-full p-space-xl shadow-2xl border border-surface-container-high my-8 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-surface-container">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-teal-dark text-2xl">edit_notifications</span>
                <h3 className="font-bold text-base text-on-surface">تعديل الموعد والمنبه المدرسي</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingSchedule(null)}
                className="text-on-surface-variant hover:text-error p-1 rounded-lg"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <form onSubmit={handleSubmitEdit} className="flex flex-col gap-space-md mt-space-md">
              {/* Event Name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-on-surface-variant">مسمى الحدث المدرسي:</label>
                <input
                  type="text"
                  required
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  className="bg-surface-container-low px-space-md py-2.5 rounded-xl text-xs text-on-surface border border-surface-container focus:ring-2 focus:ring-teal-dark outline-none font-medium"
                />
              </div>

              {/* Time & Bell Type Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-on-surface-variant">توقيت الرنين:</label>
                  <input
                    type="time"
                    step="1"
                    required
                    value={editTime}
                    onChange={(e) => setEditTime(e.target.value)}
                    className="bg-surface-container-low px-space-md py-2.5 rounded-xl text-xs text-on-surface border border-surface-container focus:ring-2 focus:ring-teal-dark outline-none font-mono"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-on-surface-variant">تصنيف التوقيت:</label>
                  <select
                    value={editType}
                    onChange={(e) => setEditType(e.target.value as BellType)}
                    className="bg-surface-container-low px-space-md py-2.5 rounded-xl text-xs text-on-surface border border-surface-container focus:ring-2 focus:ring-teal-dark outline-none cursor-pointer"
                  >
                    <option value="ENTRY">جرس دخول / طابور الصباح</option>
                    <option value="EXIT">جرس انصراف الطلاب</option>
                    <option value="BREAK">استراحة / فسحة مدرسية</option>
                    <option value="WARNING">تنبيه نهاية الحصة / عودة</option>
                  </select>
                </div>
              </div>

              {/* Day Picker */}
              <div className="flex flex-col gap-1.5 p-space-md bg-surface-container-low rounded-xl border border-surface-container">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-teal-dark">calendar_month</span>
                    <span>الأيام المستهدفة:</span>
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setEditDays([1, 2, 3, 4, 5, 6])}
                      className="text-[10px] text-teal-dark font-bold hover:underline"
                    >
                      طيلة الأسبوع
                    </button>
                    <span className="text-on-surface-variant/40">|</span>
                    <button
                      type="button"
                      onClick={() => setEditDays([1])}
                      className="text-[10px] text-amber-600 dark:text-amber-400 font-bold hover:underline"
                    >
                      الإثنين فقط
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-6 gap-1.5 pt-1">
                  {SCHOOL_DAYS.map((day) => {
                    const isSelected = editDays.includes(day.id);
                    return (
                      <button
                        key={day.id}
                        type="button"
                        onClick={() => toggleDay(day.id, editDays, setEditDays)}
                        className={`py-2 px-1 rounded-xl text-xs font-bold text-center transition-all ${
                          isSelected
                            ? 'bg-teal-dark text-white shadow-sm ring-1 ring-teal-dark'
                            : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                        }`}
                      >
                        <div>{day.short}</div>
                        <div className="text-[9px] font-normal opacity-80">{day.name}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Action Type */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-teal-dark">bolt</span>
                  <span>نوع الإجراء (Action Type):</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditActionType('BELL_ONLY')}
                    className={`p-space-sm rounded-xl text-right border transition-all flex flex-col gap-1 ${
                      editActionType === 'BELL_ONLY'
                        ? 'bg-teal-dark/10 border-teal-dark ring-1 ring-teal-dark text-teal-dark'
                        : 'bg-surface-container-low border-surface-container text-on-surface hover:bg-surface-container'
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-base">notifications</span>
                      <span className="font-bold text-xs">رنين جرس فقط</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditActionType('BELL_THEN_PLAYLIST')}
                    className={`p-space-sm rounded-xl text-right border transition-all flex flex-col gap-1 ${
                      editActionType === 'BELL_THEN_PLAYLIST'
                        ? 'bg-teal-dark/10 border-teal-dark ring-1 ring-teal-dark text-teal-dark'
                        : 'bg-surface-container-low border-surface-container text-on-surface hover:bg-surface-container'
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-base">auto_mode</span>
                      <span className="font-bold text-xs">جرس + إذاعة</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditActionType('DIRECT_AUDIO')}
                    className={`p-space-sm rounded-xl text-right border transition-all flex flex-col gap-1 ${
                      editActionType === 'DIRECT_AUDIO'
                        ? 'bg-teal-dark/10 border-teal-dark ring-1 ring-teal-dark text-teal-dark'
                        : 'bg-surface-container-low border-surface-container text-on-surface hover:bg-surface-container'
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-base">music_note</span>
                      <span className="font-bold text-xs">بث مقطع صوتي</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Dynamic Action Details */}
              {editActionType === 'BELL_ONLY' && (
                <div className="flex flex-col gap-1 p-space-md bg-surface-container-low rounded-xl border border-surface-container">
                  <label className="text-xs font-bold text-on-surface-variant">مدة الرنين بالثواني:</label>
                  <input
                    type="number"
                    min="3"
                    max="60"
                    value={editDuration}
                    onChange={(e) => setEditDuration(Number(e.target.value))}
                    className="bg-surface-container px-space-md py-2 rounded-xl text-xs text-on-surface border border-surface-container-high focus:ring-1 focus:ring-teal-dark outline-none font-mono"
                  />
                </div>
              )}

              {editActionType === 'BELL_THEN_PLAYLIST' && (
                <div className="flex flex-col gap-2 p-space-md bg-teal-dark/5 rounded-xl border border-teal-dark/30">
                  <label className="text-[11px] font-bold text-on-surface-variant">اختر قائمة الاستراحة:</label>
                  <select
                    value={editPlaylistSession}
                    onChange={(e) => setEditPlaylistSession(e.target.value as any)}
                    className="bg-surface-container-low px-space-md py-2 rounded-xl text-xs text-on-surface border border-surface-container focus:ring-1 focus:ring-teal-dark outline-none cursor-pointer font-bold"
                  >
                    <option value="MORNING_BREAK">الاستراحة الصباحية الأولى</option>
                    <option value="NOON_BREAK">استراحة الظهيرة والمساء</option>
                  </select>
                </div>
              )}

              {editActionType === 'DIRECT_AUDIO' && (
                <div className="flex flex-col gap-2 p-space-md bg-indigo-500/5 rounded-xl border border-indigo-500/30">
                  <label className="text-xs font-bold text-indigo-700 dark:text-indigo-300">اختر الملف من مكتبة الوسائط:</label>
                  <select
                    value={editMediaId}
                    onChange={(e) => setEditMediaId(e.target.value)}
                    className="bg-surface-container-low px-space-md py-2 rounded-xl text-xs text-on-surface border border-surface-container focus:ring-1 focus:ring-indigo-500 outline-none cursor-pointer font-bold"
                  >
                    {tracks.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title} ({t.speaker_or_artist || 'مدرسي'} - {t.duration_formatted})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Broadcast Zone */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-on-surface-variant">منطقة البث المستهدفة:</label>
                <select
                  value={editZone}
                  onChange={(e) => setEditZone(e.target.value)}
                  className="bg-surface-container-low px-space-md py-2 rounded-xl text-xs text-on-surface border border-surface-container focus:ring-2 focus:ring-teal-dark outline-none cursor-pointer"
                >
                  <option value="ALL">كافة أرجاء المدرسة (المكبرات المركزية)</option>
                  <option value="ZONE_A">الساحة والملاعب الخارجية فقط</option>
                  <option value="ZONE_B">الممرات والمطعم المدرسي</option>
                  <option value="ZONE_C">الإدارة وقاعة الأساتذة</option>
                  <option value="ZONE_D">المصلى المدرسي</option>
                </select>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-2 pt-space-md border-t border-surface-container">
                <button
                  type="button"
                  onClick={() => setEditingSchedule(null)}
                  className="px-space-md py-2 rounded-xl bg-surface-container text-on-surface text-xs font-bold hover:bg-surface-container-highest transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-space-xl py-2 rounded-xl bg-teal-dark text-white text-xs font-bold hover:bg-secondary transition-colors shadow-sm"
                >
                  حفظ التعديلات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
