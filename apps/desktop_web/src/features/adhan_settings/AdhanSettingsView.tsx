import React, { useState, useEffect } from 'react';
import { initialAdhanConfig } from '../../core/mockData';
import { supabaseService } from '../../core/supabaseService';

interface AdhanSettingsViewProps {
  onShowToast?: (type: 'success' | 'error' | 'info' | 'warning', message: string, title?: string) => void;
}

export const AdhanSettingsView: React.FC<AdhanSettingsViewProps> = ({ onShowToast }) => {
  const [config, setConfig] = useState(initialAdhanConfig);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isTesting, setIsTesting] = useState<boolean>(false);

  useEffect(() => {
    supabaseService.fetchAdhanSettings().then((liveConfig) => {
      setConfig(liveConfig);
    });
  }, []);

  const prayerTimesToday = [
    { name: 'الفجر', time: '05:38 ص', status: 'منقضي' },
    { name: 'الشروق', time: '06:58 ص', status: 'منقضي' },
    { name: 'الظهر', time: '12:05 م', status: 'القادم (مقاطعة ذكية مفعلة)', isNext: true },
    { name: 'العصر', time: '03:42 م', status: 'مجدول' },
    { name: 'المغرب', time: '06:14 م', status: 'مجدول' },
    { name: 'العشاء', time: '07:32 م', status: 'مجدول' },
  ];

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const success = await supabaseService.saveAdhanSettings(config);
    setIsSaving(false);
    if (success) {
      setIsSaved(true);
      if (onShowToast) {
        onShowToast('success', 'تم حفظ إعدادات الأذان والمقاطعة التلقائية في السحابة بنجاح.', 'إعدادات الأذان');
      }
      setTimeout(() => setIsSaved(false), 3000);
    } else {
      if (onShowToast) {
        onShowToast('error', 'تعذر حفظ الإعدادات، يرجى التحقق من اتصال الشبكة.', 'خطأ في الحفظ');
      }
    }
  };

  const handleTestAdhan = async () => {
    setIsTesting(true);

    // Audio chime feedback
    supabaseService.playLocalBeep(440, 0.4);
    setTimeout(() => supabaseService.playLocalBeep(554.37, 0.5), 250);

    await supabaseService.triggerInstantOverride('PERIOD_END', 'ALL', {
      action: 'TEST_ADHAN',
      duration_seconds: 15,
    });

    if (onShowToast) {
      onShowToast('info', 'جاري بث نداء أذان تجريبي للمعاينة عبر مكبرات الصوت...', 'تجربة صوت الأذان');
    }

    setTimeout(() => setIsTesting(false), 3000);
  };

  return (
    <div className="flex flex-col gap-space-xl w-full max-w-[1720px] mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-lg bg-surface-container-lowest p-space-lg rounded-2xl shadow-sm border border-surface-container-high/60">
        <div className="flex items-center gap-space-lg">
          <div className="w-14 h-14 rounded-2xl bg-secondary-container flex items-center justify-center text-teal-dark shadow-sm">
            <span className="material-symbols-outlined text-3xl">mosque</span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-space-sm">
              <h1 className="text-xl md:text-2xl font-bold text-on-surface">إعدادات الأذان والمقاطعة التلقائية</h1>
              <span className="px-space-sm py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed text-xs font-bold">
                الحساب الفلكي الدقيق
              </span>
            </div>
            <p className="text-sm text-on-surface-variant mt-0.5">
              حساب مواقيت الصلاة تلقائياً لمدينة مراكش وفق معايير وزارة الأوقاف والشؤون الإسلامية المغربية، مع إدارة أولوية المقاطعة الذكية.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleTestAdhan}
          className="flex items-center gap-2 px-space-lg py-space-sm bg-primary-container text-white hover:bg-primary rounded-xl font-bold text-xs shadow-md transition-all active:scale-95"
        >
          <span className="material-symbols-outlined text-lg text-teal-accent">
            {isTesting ? 'refresh' : 'play_arrow'}
          </span>
          <span>{isTesting ? 'جاري بث أذان تجريبي...' : 'تجربة صوت الأذان'}</span>
        </button>
      </div>

      {/* Main Grid: Settings (Left) + Prayer Times Cards (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl">
        {/* Form Settings (7 cols) */}
        <form onSubmit={handleSave} className="lg:col-span-7 bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm border border-surface-container-high/60 flex flex-col gap-space-lg">
          <div className="flex items-center justify-between border-b border-surface-container pb-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-teal-dark text-xl">tune</span>
              <h2 className="text-base font-bold text-on-surface">محددات الحساب الفلكي والإحداثيات</h2>
            </div>
            {isSaved && (
              <span className="text-xs text-teal-dark font-bold animate-pulse">
                ✓ تم حفظ الإعدادات بنجاح
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-on-surface-variant">المدينة المعتمدة:</label>
              <input
                type="text"
                value={config.city}
                onChange={(e) => setConfig({ ...config, city: e.target.value })}
                className="bg-surface-container-low px-space-md py-2 rounded-xl text-xs text-on-surface border border-surface-container focus:ring-2 focus:ring-teal-dark outline-none"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-on-surface-variant">طريقة الحساب الشرعية:</label>
              <select
                value={config.calculation_method}
                onChange={(e) => setConfig({ ...config, calculation_method: e.target.value })}
                className="bg-surface-container-low px-space-md py-2 rounded-xl text-xs text-on-surface border border-surface-container focus:ring-2 focus:ring-teal-dark outline-none cursor-pointer"
              >
                <option value="Morocco_Awqaf">وزارة الأوقاف والشؤون الإسلامية (المغرب)</option>
                <option value="MWL">رابطة العالم الإسلامي</option>
                <option value="UmmAlQura">جامعة أم القرى (مكة المكرمة)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-space-md">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-on-surface-variant">خط العرض (Latitude):</label>
              <input
                type="number"
                step="0.0001"
                value={config.latitude}
                onChange={(e) => setConfig({ ...config, latitude: Number(e.target.value) })}
                className="bg-surface-container-low px-space-md py-2 rounded-xl text-xs text-on-surface border border-surface-container focus:ring-2 focus:ring-teal-dark outline-none font-mono"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-on-surface-variant">خط الطول (Longitude):</label>
              <input
                type="number"
                step="0.0001"
                value={config.longitude}
                onChange={(e) => setConfig({ ...config, longitude: Number(e.target.value) })}
                className="bg-surface-container-low px-space-md py-2 rounded-xl text-xs text-on-surface border border-surface-container focus:ring-2 focus:ring-teal-dark outline-none font-mono"
              />
            </div>
          </div>

          {/* Audio Chime Selection */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-on-surface-variant">صوت الأذان المعتمد:</label>
            <select
              value={config.audio_url}
              onChange={(e) => setConfig({ ...config, audio_url: e.target.value })}
              className="bg-surface-container-low px-space-md py-2 rounded-xl text-xs text-on-surface border border-surface-container focus:ring-2 focus:ring-teal-dark outline-none cursor-pointer"
            >
              <option>أذان الحرم المكي الشريف (عالي النقاوة)</option>
              <option>أذان المسجد النبوي الشريف</option>
              <option>أذان جامع القرويين بفاس (المقام المغربي الأصيل)</option>
            </select>
          </div>

          {/* Toggles */}
          <div className="flex flex-col gap-3 pt-space-xs">
            <div className="bg-surface-container-low p-3.5 rounded-xl border border-surface-container flex items-center justify-between">
              <div className="flex flex-col">
                <span className="font-bold text-xs text-on-surface">المقاطعة التلقائية للبث الإذاعي (Auto-Interrupt)</span>
                <span className="text-[11px] text-on-surface-variant">كتم أي بث جاري فورياً عند دخول وقت الأذان وبث النداء</span>
              </div>
              <button
                type="button"
                onClick={() => setConfig({ ...config, auto_interrupt: !config.auto_interrupt })}
                className={`w-11 h-6 rounded-full transition-colors relative p-0.5 inline-block ${
                  config.auto_interrupt ? 'bg-teal-dark' : 'bg-surface-container-highest'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                    config.auto_interrupt ? '-translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="bg-surface-container-low p-3.5 rounded-xl border border-surface-container flex items-center justify-between">
              <div className="flex flex-col">
                <span className="font-bold text-xs text-on-surface">بث دعاء ما بعد الأذان</span>
                <span className="text-[11px] text-on-surface-variant">تشغيل دعاء الوسيلة والفضيلة مباشرة بعد انتهاء الأذان</span>
              </div>
              <button
                type="button"
                onClick={() => setConfig({ ...config, dua_after_athan: !config.dua_after_athan })}
                className={`w-11 h-6 rounded-full transition-colors relative p-0.5 inline-block ${
                  config.dua_after_athan ? 'bg-teal-dark' : 'bg-surface-container-highest'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                    config.dua_after_athan ? '-translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="w-full py-2.5 rounded-xl bg-teal-dark hover:bg-secondary disabled:opacity-50 text-white font-bold text-xs transition-colors shadow-sm mt-2 flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <>
                <span className="material-symbols-outlined text-base animate-spin">refresh</span>
                <span>جاري حفظ الإعدادات في السحابة...</span>
              </>
            ) : (
              <span>حفظ إعدادات الأذان والمقاطعة</span>
            )}
          </button>
        </form>

        {/* Prayer Times Schedule (5 cols) */}
        <div className="lg:col-span-5 bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm border border-surface-container-high/60 flex flex-col gap-space-md">
          <div className="flex items-center justify-between border-b border-surface-container pb-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-teal-dark text-xl">access_time</span>
              <h2 className="text-base font-bold text-on-surface">مواقيت اليوم • مدينة مراكش</h2>
            </div>
            <span className="font-mono text-xs text-on-surface-variant bg-surface-container px-2 py-0.5 rounded font-bold">
              15 شعبان 1447 هـ
            </span>
          </div>

          <div className="flex flex-col gap-2">
            {prayerTimesToday.map((prayer) => (
              <div
                key={prayer.name}
                className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                  prayer.isNext
                    ? 'bg-primary-container text-white border-teal-dark ring-2 ring-teal-dark/30 shadow-md'
                    : 'bg-surface-container-low border-surface-container text-on-surface'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`material-symbols-outlined text-xl ${
                      prayer.isNext ? 'text-teal-accent' : 'text-teal-dark'
                    }`}
                  >
                    mosque
                  </span>
                  <div className="flex flex-col">
                    <span className="font-bold text-sm">{prayer.name}</span>
                    <span className={`text-[11px] ${prayer.isNext ? 'text-teal-accent font-bold' : 'text-on-surface-variant'}`}>
                      {prayer.status}
                    </span>
                  </div>
                </div>
                <span className={`font-mono font-bold text-sm ${prayer.isNext ? 'text-white' : 'text-teal-dark'}`}>
                  {prayer.time}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
