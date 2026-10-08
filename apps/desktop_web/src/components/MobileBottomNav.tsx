import React from 'react';
import { TabType } from '../types';
import { Icon } from './common/Icon';

interface MobileBottomNavProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
  onOpenDrawer: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentTab,
  onSelectTab,
  onOpenDrawer,
}) => {
  const navItems: { id: TabType; label: string; icon: string }[] = [
    { id: 'live-control-dashboard', label: 'الرئيسية', icon: 'sensors' },
    { id: 'bell-schedules', label: 'الأجراس', icon: 'notifications_active' },
    { id: 'break-programming', label: 'الاستراحات', icon: 'timer' },
    { id: 'media-library', label: 'الوسائط', icon: 'library_music' },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-surface-container-lowest/95 backdrop-blur-md border-t border-surface-container-high/70 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] px-2 py-1.5 flex items-center justify-around safe-area-pb"
      aria-label="التنقل السفلي للهواتف"
    >
      {navItems.map((item) => {
        const isActive = currentTab === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelectTab(item.id)}
            className={`flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl transition-all duration-200 active:scale-95 ${
              isActive
                ? 'text-teal-dark font-bold'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <div
              className={`flex items-center justify-center w-10 h-7 rounded-full transition-all ${
                isActive ? 'bg-secondary-container/30 text-teal-dark scale-105' : ''
              }`}
            >
              <Icon name={item.icon} size={22} />
            </div>
            <span className="text-[11px] leading-tight mt-0.5 tracking-tight font-medium">
              {item.label}
            </span>
          </button>
        );
      })}

      {/* Menu / More button that opens the full slide-over drawer */}
      <button
        type="button"
        onClick={onOpenDrawer}
        className="flex flex-col items-center justify-center flex-1 py-1 px-1 rounded-xl text-on-surface-variant hover:text-on-surface transition-all active:scale-95"
      >
        <div className="flex items-center justify-center w-10 h-7 rounded-full">
          <Icon name="menu" size={22} />
        </div>
        <span className="text-[11px] leading-tight mt-0.5 tracking-tight font-medium">
          المزيد
        </span>
      </button>
    </nav>
  );
};
