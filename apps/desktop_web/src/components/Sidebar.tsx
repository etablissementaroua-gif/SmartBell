import React from 'react';
import { TabType } from '../types';

interface SidebarProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
  onLogout: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  onLogout,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const navItems: { id: TabType; label: string; icon: string }[] = [
    { id: 'live-control-dashboard', label: 'الرئيسية والتحكم الفوري', icon: 'sensors' },
    { id: 'bell-schedules', label: 'جدول الأجراس', icon: 'notifications_active' },
    { id: 'break-programming', label: 'برمجة الاستراحات', icon: 'timer' },
    { id: 'athan-settings', label: 'إعدادات الأذان', icon: 'mosque' },
    { id: 'media-library', label: 'مكتبة الوسائط وتطبيق المشرف', icon: 'library_music' },
    { id: 'system-audit-logs', label: 'سجل العمليات', icon: 'receipt_long' },
  ];

  const handleItemClick = (tabId: TabType) => {
    onSelectTab(tabId);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  const renderSidebarContent = (isMobile = false) => (
    <div className="flex flex-col justify-between h-full select-none">
      <div className="flex flex-col">
        {/* Brand Header */}
        <div className="h-16 px-space-lg flex items-center justify-between bg-surface-container-low border-b border-surface-container-high/50">
          <div className="flex items-center gap-space-md">
            <img
              src="/assets/smartbell_icon.png"
              alt="SmartBell Desk Logo"
              className="h-10 w-10 rounded-xl object-contain shadow-sm bg-primary-container p-0.5 border border-teal-dark/30"
            />
            <div className="flex flex-col">
              <span className="font-bold text-[17px] text-on-surface leading-tight tracking-tight">SmartBell Desk</span>
              <span className="text-[11px] text-on-surface-variant font-medium">منظومة الأجراس والإذاعة الذكية</span>
            </div>
          </div>

          {/* Close button for mobile drawer */}
          {isMobile && (
            <button
              type="button"
              onClick={onCloseMobile}
              className="p-1.5 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
              title="إغلاق القائمة"
            >
              <span className="material-symbols-outlined text-2xl">close</span>
            </button>
          )}
        </div>

        {/* Section Title */}
        <div className="px-space-md py-space-sm">
          <div className="px-space-sm py-space-xs text-[11px] text-on-surface-variant font-bold uppercase tracking-wider">
            لوحة العمليات المدرسية
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex flex-col gap-1 px-space-md">
          {navItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
                className={`flex items-center gap-space-md px-space-md py-2.5 rounded-xl transition-all text-right w-full group ${
                  isActive
                    ? 'bg-primary-container text-on-primary-fixed font-bold shadow-md shadow-primary-container/20 ring-1 ring-white/10'
                    : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                }`}
              >
                <span
                  className={`material-symbols-outlined text-xl transition-transform duration-200 group-hover:scale-110 ${
                    isActive ? 'text-teal-accent' : 'text-on-surface-variant group-hover:text-teal-dark'
                  }`}
                >
                  {item.icon}
                </span>
                <span className="text-[14px] flex-1">{item.label}</span>
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-accent animate-pulse"></span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer / Logout */}
      <div className="p-space-md bg-surface-container-low border-t border-surface-container-high/60">
        <button
          onClick={onLogout}
          className="flex items-center justify-between w-full px-space-md py-space-sm rounded-xl text-error hover:bg-error-container hover:text-on-error-container transition-all"
        >
          <div className="flex items-center gap-space-md">
            <span className="material-symbols-outlined text-xl">logout</span>
            <span className="text-label-lg font-bold">تسجيل الخروج</span>
          </div>
          <span className="text-label-sm opacity-70 font-mono bg-surface-container px-2 py-0.5 rounded-md font-bold">v2.6</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* 1. Desktop Static Sidebar (Visible on screens >= 1024px) */}
      <aside className="hidden lg:flex fixed right-0 top-0 h-full w-72 bg-surface-container-lowest border-l border-surface-container-high/60 z-30 shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        {renderSidebarContent(false)}
      </aside>

      {/* 2. Mobile Drawer & Backdrop Overlay (Visible on screens < 1024px when open) */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop Blur */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity animate-in fade-in"
            onClick={onCloseMobile}
          />
          {/* Slide-over Drawer */}
          <aside className="fixed right-0 top-0 bottom-0 w-72 max-w-[85vw] bg-surface-container-lowest border-l border-surface-container-high/60 shadow-2xl z-50 animate-in slide-in-from-right duration-300">
            {renderSidebarContent(true)}
          </aside>
        </div>
      )}
    </>
  );
};
