import React, { useState, useEffect } from 'react';
import { initialLogs } from '../../core/mockData';
import { supabaseService } from '../../core/supabaseService';
import { SystemAuditLog } from '../../types';

export const SystemAuditLogsView: React.FC = () => {
  const [logs, setLogs] = useState<SystemAuditLog[]>(initialLogs);
  const [filter, setFilter] = useState<string>('ALL');

  useEffect(() => {
    supabaseService.fetchSystemLogs().then((liveLogs) => {
      setLogs(liveLogs);
    });
  }, []);

  const filteredLogs = logs.filter((log) => {
    if (filter === 'ALL') return true;
    if (filter === 'BELL') return log.event_type.includes('جرس');
    if (filter === 'SYSTEM') return log.event_type.includes('نظام') || log.event_type.includes('NTP');
    return true;
  });

  return (
    <div className="flex flex-col gap-space-xl w-full max-w-[1720px] mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-lg bg-surface-container-lowest p-space-lg rounded-2xl shadow-sm border border-surface-container-high/60">
        <div className="flex items-center gap-space-lg">
          <div className="w-14 h-14 rounded-2xl bg-secondary-container flex items-center justify-center text-teal-dark shadow-sm">
            <span className="material-symbols-outlined text-3xl">receipt_long</span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-space-sm">
              <h1 className="text-xl md:text-2xl font-bold text-on-surface">سجل العمليات والتدقيق الإذاعي</h1>
              <span className="px-space-sm py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed text-xs font-bold font-mono">
                Immutable Audit Trail
              </span>
            </div>
            <p className="text-sm text-on-surface-variant mt-0.5">
              توثيق زمني دقيق لكافة أحداث رنين الأجراس، البث المباشر، تدخلات الطوارئ، ومزامنة العتاد المحلي.
            </p>
          </div>
        </div>

        <button
          type="button"
          className="flex items-center gap-2 px-space-lg py-space-sm bg-surface-container hover:bg-surface-container-highest text-on-surface rounded-xl font-bold text-xs transition-colors border border-surface-container-high"
        >
          <span className="material-symbols-outlined text-lg text-teal-dark">download</span>
          <span>تصدير السجل بتنسيق CSV</span>
        </button>
      </div>

      {/* Logs Table Container */}
      <div className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm border border-surface-container-high/60 flex flex-col gap-space-md">
        {/* Filters */}
        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-surface-container pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-on-surface-variant">تصفية السجل:</span>
            {[
              { id: 'ALL', label: 'كافة العمليات' },
              { id: 'BELL', label: 'الأجراس والتنبيهات' },
              { id: 'SYSTEM', label: 'أحداث العتاد والنظام' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                  filter === item.id
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-surface-container-high hover:bg-surface-container-highest text-on-surface'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <span className="text-xs text-on-surface-variant font-mono">
            عرض {filteredLogs.length} حدث موثق
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl bg-surface-container-low border border-surface-container">
          <table className="w-full text-right border-collapse text-xs">
            <thead>
              <tr className="text-on-surface-variant font-bold bg-surface-container">
                <th className="py-space-sm px-space-md">الوقت</th>
                <th className="py-space-sm px-space-md">نوع الحدث</th>
                <th className="py-space-sm px-space-md">تفاصيل العملية</th>
                <th className="py-space-sm px-space-md">المنطقة المستهدفة</th>
                <th className="py-space-sm px-space-md text-center">مستوى الأهمية</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-surface-container-lowest/60 transition-colors">
                  <td className="py-space-md px-space-md font-mono font-bold text-on-surface">
                    {log.created_at}
                  </td>
                  <td className="py-space-md px-space-md font-bold text-teal-dark">
                    {log.event_type}
                  </td>
                  <td className="py-space-md px-space-md text-on-surface">
                    {log.description}
                  </td>
                  <td className="py-space-md px-space-md">
                    <span className="px-2 py-0.5 rounded-full bg-surface-container text-on-surface text-[11px] font-medium font-mono">
                      {log.zone}
                    </span>
                  </td>
                  <td className="py-space-md px-space-md text-center">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                        log.severity === 'CRITICAL'
                          ? 'bg-error-container text-error'
                          : log.severity === 'WARNING'
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-secondary-fixed text-on-secondary-fixed'
                      }`}
                    >
                      {log.severity}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
