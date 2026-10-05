import React, { useState } from 'react';
import { BellSchedule, BellType } from '../../types';

interface BellSchedulerViewProps {
  schedules: BellSchedule[];
  onToggleSchedule: (id: string) => void;
  onAddSchedule: (schedule: Omit<BellSchedule, 'id'>) => void;
  onDeleteSchedule: (id: string) => void;
}

export const BellSchedulerView: React.FC<BellSchedulerViewProps> = ({
  schedules,
  onToggleSchedule,
  onAddSchedule,
  onDeleteSchedule,
}) => {
  const [activePreset, setActivePreset] = useState<string>('preset-1');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newTime, setNewTime] = useState<string>('09:00');
  const [newType, setNewType] = useState<BellType>('ENTRY');
  const [newLabel, setNewLabel] = useState<string>('');
  const [newDuration, setNewDuration] = useState<number>(10);
  const [testingId, setTestingId] = useState<string | null>(null);

  const presets = [
    { id: 'preset-1', name: 'الدوام المدرسي الكامل (8 مهام)', active: true, count: 6 },
    { id: 'preset-2', name: 'التوقيت المدرسي الرمضاني', active: false, count: 5 },
    { id: 'preset-3', name: 'جدول فترات الامتحانات الموحدة', active: false, count: 4 },
  ];

  const handleTestSound = (id: string) => {
    setTestingId(id);
    setTimeout(() => {
      setTestingId(null);
    }, 2500);
  };

  const handleSubmitAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim()) return;

    onAddSchedule({
      preset_id: activePreset,
      bell_time: newTime,
      bell_type: newType,
      label: newLabel.trim(),
      details: 'تم الإدراج يدوياً من لوحة التحكم',
      duration_seconds: newDuration,
      target_zones: ['كافة المناطق'],
      is_enabled: true,
    });

    setNewLabel('');
    setShowAddModal(false);
  };

  const getBellTypeBadge = (type: BellType) => {
    switch (type) {
      case 'ENTRY':
        return <span className="px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed text-xs font-bold">جرس دخول</span>;
      case 'EXIT':
        return <span className="px-2 py-0.5 rounded-full bg-primary-container text-teal-accent text-xs font-bold">جرس انصراف</span>;
      case 'BREAK':
        return <span className="px-2 py-0.5 rounded-full bg-surface-container-highest text-on-surface text-xs font-bold">استراحة / أذان</span>;
      case 'WARNING':
        return <span className="px-2 py-0.5 rounded-full bg-error-container text-on-error-container text-xs font-bold">تنبيه عودة</span>;
    }
  };

  return (
    <div className="flex flex-col gap-space-xl w-full max-w-[1720px] mx-auto pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-lg bg-surface-container-lowest p-space-lg rounded-2xl shadow-sm border border-surface-container-high/60">
        <div className="flex items-center gap-space-lg">
          <div className="w-14 h-14 rounded-2xl bg-secondary-container flex items-center justify-center text-teal-dark shadow-sm">
            <span className="material-symbols-outlined text-3xl">notifications_active</span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-space-sm">
              <h1 className="text-xl md:text-2xl font-bold text-on-surface">جدولة الأجراس وقوالب الدوام المدرسي</h1>
              <span className="px-space-sm py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed text-xs font-bold font-mono">
                Sub-Second Precision
              </span>
            </div>
            <p className="text-sm text-on-surface-variant mt-0.5">
              ضبط وبرمجة مواعيد رنين الأجراس التلقائية بدقة متناهية بالثواني، وتفعيل القوالب الموسمية (العادي، رمضان، الامتحانات).
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-space-lg py-space-sm bg-teal-dark hover:bg-secondary text-white rounded-xl font-bold text-xs shadow-md transition-all active:scale-95"
        >
          <span className="material-symbols-outlined text-lg">add_alarm</span>
          <span>إضافة موعد جرس جديد</span>
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

      {/* Schedules Table */}
      <div className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm border border-surface-container-high/60 flex flex-col gap-space-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-teal-dark text-xl">event_note</span>
            <h2 className="text-base font-bold text-on-surface">جدول الأجراس النشط (اليوم)</h2>
          </div>
          <span className="text-xs text-on-surface-variant font-mono">
            {schedules.length} مواعيد مبرمجة
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl bg-surface-container-low border border-surface-container">
          <table className="w-full text-right border-collapse text-xs">
            <thead>
              <tr className="text-on-surface-variant font-bold bg-surface-container">
                <th className="py-space-sm px-space-md">الوقت</th>
                <th className="py-space-sm px-space-md">النوع</th>
                <th className="py-space-sm px-space-md">المهمة والوصف</th>
                <th className="py-space-sm px-space-md">مدة الرنين</th>
                <th className="py-space-sm px-space-md">المناطق الموجهة</th>
                <th className="py-space-sm px-space-md text-center">التفعيل التلقائي</th>
                <th className="py-space-sm px-space-md text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              {schedules.map((schedule) => (
                <tr key={schedule.id} className="hover:bg-surface-container-lowest/60 transition-colors">
                  <td className="py-space-md px-space-md font-mono font-bold text-sm text-teal-dark">
                    {schedule.bell_time} {schedule.bell_time.startsWith('12') || schedule.bell_time.startsWith('14') ? 'م' : 'ص'}
                  </td>
                  <td className="py-space-md px-space-md">
                    {getBellTypeBadge(schedule.bell_type)}
                  </td>
                  <td className="py-space-md px-space-md">
                    <div className="flex flex-col">
                      <span className="font-bold text-on-surface text-[13px]">{schedule.label}</span>
                      <span className="text-[11px] text-on-surface-variant">{schedule.details}</span>
                    </div>
                  </td>
                  <td className="py-space-md px-space-md font-mono font-bold text-on-surface">
                    {schedule.duration_seconds} ثانية
                  </td>
                  <td className="py-space-md px-space-md">
                    <div className="flex gap-1 flex-wrap">
                      {schedule.target_zones.map((zone, idx) => (
                        <span key={idx} className="px-1.5 py-0.5 rounded bg-surface-container text-[10px] text-on-surface font-medium">
                          {zone}
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
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                          schedule.is_enabled ? '-translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </td>
                  <td className="py-space-md px-space-md text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleTestSound(schedule.id)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          testingId === schedule.id
                            ? 'bg-teal-dark text-white animate-spin'
                            : 'text-on-surface-variant hover:text-teal-dark hover:bg-surface-container'
                        }`}
                        title="اختبار الصوت"
                      >
                        <span className="material-symbols-outlined text-lg">
                          {testingId === schedule.id ? 'refresh' : 'play_arrow'}
                        </span>
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
        </div>
      </div>

      {/* Add Bell Schedule Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl max-w-md w-full p-space-xl shadow-2xl border border-surface-container-high animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-surface-container">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-teal-dark text-2xl">add_alarm</span>
                <h3 className="font-bold text-base text-on-surface">إضافة جرس مدرسي جديد</h3>
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
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-on-surface-variant">اسم الجرس أو الحدث:</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: جرس الحصة الثانية"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  className="bg-surface-container-low px-space-md py-2 rounded-xl text-xs text-on-surface border border-surface-container focus:ring-2 focus:ring-teal-dark outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-space-md">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-on-surface-variant">توقيت الرنين:</label>
                  <input
                    type="time"
                    required
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="bg-surface-container-low px-space-md py-2 rounded-xl text-xs text-on-surface border border-surface-container focus:ring-2 focus:ring-teal-dark outline-none font-mono"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-on-surface-variant">نوع الجرس:</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as BellType)}
                    className="bg-surface-container-low px-space-md py-2 rounded-xl text-xs text-on-surface border border-surface-container focus:ring-2 focus:ring-teal-dark outline-none cursor-pointer"
                  >
                    <option value="ENTRY">جرس دخول</option>
                    <option value="EXIT">جرس انصراف</option>
                    <option value="BREAK">استراحة / فسحة</option>
                    <option value="WARNING">تنبيه عودة</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-on-surface-variant">مدة الرنين بالثواني:</label>
                <input
                  type="number"
                  min="3"
                  max="60"
                  value={newDuration}
                  onChange={(e) => setNewDuration(Number(e.target.value))}
                  className="bg-surface-container-low px-space-md py-2 rounded-xl text-xs text-on-surface border border-surface-container focus:ring-2 focus:ring-teal-dark outline-none font-mono"
                />
              </div>

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
                  className="px-space-lg py-2 rounded-xl bg-teal-dark text-white text-xs font-bold hover:bg-secondary transition-colors shadow-sm"
                >
                  حفظ وتثبيت الجرس
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
