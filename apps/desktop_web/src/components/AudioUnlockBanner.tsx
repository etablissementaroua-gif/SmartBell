import React, { useState, useEffect } from 'react';
import { audioPlayerService } from '../core/audioPlayerService';
import { Icon } from './common/Icon';

export const AudioUnlockBanner: React.FC = () => {
  const [isUnlocked, setIsUnlocked] = useState<boolean>(true);
  const [dismissed, setDismissed] = useState<boolean>(false);
  const [justTested, setJustTested] = useState<boolean>(false);

  useEffect(() => {
    // Initial check
    setIsUnlocked(audioPlayerService.isAudioUnlocked());

    // Listen to changes
    const unsub = audioPlayerService.onAudioUnlockChange((unlocked) => {
      setIsUnlocked(unlocked);
    });

    return () => {
      unsub();
    };
  }, []);

  const handleUnlockAndTest = async () => {
    await audioPlayerService.unlockAudio();
    audioPlayerService.playUnlockConfirmationSound();
    setJustTested(true);
    setTimeout(() => {
      setIsUnlocked(true);
      setDismissed(true);
    }, 1200);
  };

  if (isUnlocked || dismissed) {
    return null;
  }

  return (
    <aside
      aria-label="تنبيه تفعيل الصوت التلقائي"
      className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-8 md:max-w-md z-50 animate-in fade-in slide-in-from-bottom-5 duration-300"
    >
      <div className="bg-slate-900/95 text-white p-4 rounded-2xl shadow-2xl border border-amber-500/40 backdrop-blur-xl flex flex-col gap-3 ring-2 ring-amber-500/20">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Icon name="volume_up" size={24} className="animate-pulse" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-white leading-tight">تفعيل الصوت التلقائي للأجراس</h4>
              <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">
                يتطلب المتصفح نقرة واحدة للسماح بإطلاق رنين الأجراس والموسيقى تلقائياً عبر المكبرات.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
            title="إخفاء التنبيه"
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        <button
          type="button"
          onClick={handleUnlockAndTest}
          disabled={justTested}
          className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 ${
            justTested
              ? 'bg-teal-500 text-white'
              : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold shadow-amber-500/20'
          }`}
        >
          <Icon name={justTested ? 'check_circle' : 'play_circle'} size={18} />
          <span>
            {justTested ? 'تم تفعيل السماعات بنجاح (نغمة تأكيد)' : 'تفعيل السماعات واختبار نغمة الرنين الآن'}
          </span>
        </button>
      </div>
    </aside>
  );
};
