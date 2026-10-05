import React, { useState } from 'react';
import { AudioZone, IntermissionTrack } from '../../types';
import { supabaseService } from '../../core/supabaseService';

interface SystemConfigurationViewProps {
  zones: AudioZone[];
  tracks?: IntermissionTrack[];
  onUpdateZoneVolume: (zoneId: string, volume: number) => void;
  onToggleZoneMute: (zoneId: string) => void;
  onDeleteTrack?: (trackId: string) => void;
}

export const SystemConfigurationView: React.FC<SystemConfigurationViewProps> = ({
  zones,
  tracks = [],
  onUpdateZoneVolume,
  onToggleZoneMute,
  onDeleteTrack,
}) => {
  const [masterVolume, setMasterVolume] = useState<number>(80);
  const [isPingTesting, setIsPingTesting] = useState<boolean>(false);
  const [pingSuccess, setPingSuccess] = useState<boolean>(false);
  const [activeMediaFilter, setActiveMediaFilter] = useState<string>('الكل');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [testingChime, setTestingChime] = useState<string | null>(null);

  // Selected tone IDs for chime customizers (default: empty / unassigned)
  const [selectedChimes, setSelectedChimes] = useState<Record<string, string>>({
    'chime-1': '',
    'chime-2': '',
    'chime-3': '',
    'chime-4': '',
  });

  const handlePingTest = async () => {
    setIsPingTesting(true);
    setPingSuccess(false);
    await supabaseService.sendPingTest();
    setTimeout(() => {
      setIsPingTesting(false);
      setPingSuccess(true);
      setTimeout(() => {
        setPingSuccess(false);
      }, 3000);
    }, 1200);
  };

  const handleTestChime = async (chimeKey: string) => {
    setTestingChime(chimeKey);
    await supabaseService.triggerInstantOverride('PERIOD_END', 'ALL', {
      action: 'TEST_CHIME',
      chime: chimeKey,
      track_id: selectedChimes[chimeKey] || null,
      duration_seconds: 5,
    });
    setTimeout(() => {
      setTestingChime(null);
    }, 2500);
  };

  // Filter media tracks according to category and search query
  const filteredTracks = tracks.filter((t) => {
    if (activeMediaFilter !== 'الكل' && t.category !== activeMediaFilter) return false;
    if (searchQuery.trim() && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  // 4 Core Zone definitions
  const zoneConfigs = [
    { id: 'zone-1', defaultName: 'ساحة المدرسة والملاعب الخارجية', icon: 'stadium', code: 'Zone A' },
    { id: 'zone-2', defaultName: 'الممرات الداخلية والمطعم', icon: 'apartment', code: 'Zone B' },
    { id: 'zone-3', defaultName: 'قاعة الأساتذة والمكاتب الإدارية', icon: 'meeting_room', code: 'Zone C' },
    { id: 'zone-4', defaultName: 'المصلى المدرسي والملحقات', icon: 'mosque', code: 'Zone D' },
  ];

  const chimeItems = [
    {
      id: 'chime-1',
      title: 'جرس الدخول والاصطفاف الصباحي',
      icon: 'wb_sunny',
      isEmergency: false,
    },
    {
      id: 'chime-2',
      title: 'جرس نهاية الحصص والفسحة',
      icon: 'schedule',
      isEmergency: false,
    },
    {
      id: 'chime-3',
      title: 'جرس الانصراف والمغادرة اليومية',
      icon: 'door_open',
      isEmergency: false,
    },
    {
      id: 'chime-4',
      title: 'تنبيه الطوارئ والإخلاء الفوري',
      icon: 'warning',
      isEmergency: true,
    },
  ];

  return (
    <div className="flex flex-col w-full gap-space-xl pb-12">
      {/* Page Header & Master Broadcast Quick Switch */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-space-lg bg-surface-container-lowest p-space-lg rounded-2xl shadow-sm border border-surface-container-high/60">
        <div className="flex items-center gap-space-lg">
          <div className="w-14 h-14 rounded-2xl bg-secondary-container flex items-center justify-center text-on-secondary-container shadow-sm flex-shrink-0">
            <span className="material-symbols-outlined text-3xl text-teal-dark">tune</span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-space-sm">
              <h1 className="text-xl md:text-2xl font-bold text-on-surface">إعدادات النظام وتوزيع الصوت والمناطق</h1>
              <span className="inline-flex items-center gap-1.5 px-space-sm py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed text-xs font-bold">
                <span className="w-2 h-2 rounded-full bg-teal-dark animate-pulse"></span>
                الخادم قيد العمل الفعلي
              </span>
            </div>
            <p className="text-sm text-on-surface-variant mt-0.5">
              إدارة عتاد محطة البث المدرسية، تعيير مستويات السماعات المستقلة، وتنظيم مكتبة الملفات الصوتية ونغمات الدوام.
            </p>
          </div>
        </div>

        {/* Master Audio Bar & Sound Ping Trigger */}
        <div className="flex flex-wrap items-center gap-space-md bg-surface-container-low p-space-sm rounded-xl border border-surface-container">
          <div className="flex items-center gap-space-sm px-space-md">
            <span className="material-symbols-outlined text-teal-dark text-2xl">volume_up</span>
            <div className="flex flex-col">
              <span className="text-xs text-on-surface-variant font-medium">مستوى الصوت الشامل الرئيسي (Master)</span>
              <div className="flex items-center gap-space-sm">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={masterVolume}
                  onChange={(e) => setMasterVolume(Number(e.target.value))}
                  className="w-36 h-2 bg-surface-container rounded-lg appearance-none cursor-pointer accent-teal-dark"
                />
                <span className="text-sm font-mono font-bold text-on-surface min-w-[3ch]">{masterVolume}%</span>
              </div>
            </div>
          </div>

          <div className="h-8 w-px bg-surface-container-highest hidden sm:block"></div>

          <button
            type="button"
            onClick={handlePingTest}
            disabled={isPingTesting}
            className="flex items-center gap-space-sm px-space-md py-space-sm bg-surface-container-highest hover:bg-surface-container text-on-surface font-bold text-xs rounded-xl transition-all shadow-sm active:scale-95"
          >
            {isPingTesting ? (
              <>
                <span className="material-symbols-outlined text-teal-dark text-lg animate-spin">refresh</span>
                <span>جاري بث نغمة الاختبار...</span>
              </>
            ) : pingSuccess ? (
              <>
                <span className="material-symbols-outlined text-teal-dark text-lg">check_circle</span>
                <span>تم فحص جميع الزونات بنجاح</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-teal-dark text-lg">record_voice_over</span>
                <span>اختبار تجريبي لكافة المكبرات</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* SECTION 1: Audio Output & Zone Routing (توزيع الصوت ومناطق البث المستقلة) */}
      <section className="flex flex-col gap-space-md">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-space-sm">
            <span className="material-symbols-outlined text-teal-dark text-2xl">spatial_audio</span>
            <h2 className="text-lg font-bold text-on-surface">توزيع الصوت ومناطق البث المستقلة (Audio Zones Routing)</h2>
            <span className="text-xs text-on-surface-variant bg-surface-container-high px-space-sm py-0.5 rounded-full font-mono font-bold">
              4 مناطق صوتية
            </span>
          </div>
          <div className="flex items-center gap-space-sm text-on-surface-variant text-xs font-mono">
            <span className="material-symbols-outlined text-base">router</span>
            <span>تغذية رقمية: بروتوكول RTP Multi-Cast عبر شبكة VLAN 20 الإذاعية</span>
          </div>
        </div>

        {/* 4 Clean Zone Cards: Name + Volume Slider + Mute Toggle ONLY */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-space-lg">
          {zoneConfigs.map((cfg, idx) => {
            const zone = zones[idx];
            const zoneId = zone?.id || cfg.id;
            const zoneName = zone?.name || cfg.defaultName;
            const isMuted = zone?.is_muted || false;
            const volume = isMuted ? 0 : (zone?.volume ?? 80);

            return (
              <div
                key={zoneId}
                className="bg-surface-container-lowest rounded-2xl p-space-lg shadow-sm border border-surface-container-high/60 flex flex-col justify-between transition-all hover:shadow-md"
              >
                <div className="flex flex-col gap-space-md">
                  <div className="flex items-start justify-between">
                    <div className="w-10 h-10 rounded-xl bg-secondary-container flex items-center justify-center text-teal-dark">
                      <span className="material-symbols-outlined text-xl">{cfg.icon}</span>
                    </div>
                    <span className="px-space-sm py-0.5 rounded-full bg-surface-container-high text-on-surface-variant text-[11px] font-bold font-mono">
                      {cfg.code}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-on-surface">{zoneName}</h3>
                  </div>
                </div>

                <div className="flex flex-col gap-space-sm mt-space-lg pt-space-md bg-surface-container-low p-space-md rounded-xl border border-surface-container">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-on-surface-variant font-medium">مستوى الصوت:</span>
                    <span className="font-bold text-teal-dark font-mono">
                      {isMuted ? '0% (مكتوم)' : `${zone?.volume ?? 80}%`}
                    </span>
                  </div>
                  <div className="flex items-center gap-space-sm">
                    <button
                      type="button"
                      onClick={() => onToggleZoneMute(zoneId)}
                      className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors shadow-sm ${
                        isMuted
                          ? 'bg-error-container text-error'
                          : 'bg-surface-container-lowest text-on-surface hover:text-error'
                      }`}
                      title={isMuted ? 'إلغاء الكتم' : 'كتم المنطقة'}
                    >
                      <span className="material-symbols-outlined text-lg">
                        {isMuted ? 'volume_off' : 'volume_up'}
                      </span>
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={volume}
                      disabled={isMuted}
                      onChange={(e) => onUpdateZoneVolume(zoneId, Number(e.target.value))}
                      className="w-full h-2 bg-surface-container rounded-lg appearance-none cursor-pointer accent-teal-dark"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* SECTION 2 & 3: Hardware Management + Bell Chimes Customizer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl">
        {/* Hardware Gateway Management (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-space-lg bg-surface-container-lowest p-space-lg rounded-2xl shadow-sm border border-surface-container-high/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-space-sm">
              <span className="material-symbols-outlined text-teal-dark text-2xl">developer_board</span>
              <h2 className="text-base font-bold text-on-surface">إدارة عتاد النظام والمتحكم المركزي</h2>
            </div>
            <span className="inline-flex items-center gap-1.5 px-space-sm py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed text-xs font-bold font-mono">
              RTC Online
            </span>
          </div>

          {/* Device Blueprint Card */}
          <div className="relative bg-surface-container-low p-space-md rounded-xl flex flex-col gap-space-md overflow-hidden border border-surface-container">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-space-md">
                <div className="w-12 h-12 rounded-xl bg-surface-container-highest flex items-center justify-center text-primary-container">
                  <span className="material-symbols-outlined text-2xl text-teal-dark">memory</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-sm text-on-surface">بوابة التحكم المركزية (Gateway)</span>
                  <span className="font-mono text-xs text-on-surface-variant">Raspberry Pi 5 Model B - 8GB Quad 64-bit</span>
                </div>
              </div>
              <span className="font-mono text-xs font-bold px-space-sm py-1 bg-surface-container rounded-lg text-teal-dark">
                192.168.1.120
              </span>
            </div>

            {/* Telemetry Gauges */}
            <div className="grid grid-cols-3 gap-space-sm pt-space-xs">
              <div className="bg-surface-container-lowest p-space-sm rounded-lg flex flex-col items-center justify-center border border-surface-container/50">
                <span className="text-[11px] text-on-surface-variant">معالج المركز (CPU)</span>
                <span className="text-base font-bold text-on-surface font-mono mt-0.5">18%</span>
                <span className="text-[10px] text-teal-dark font-medium">42°C طبيعي</span>
              </div>
              <div className="bg-surface-container-lowest p-space-sm rounded-lg flex flex-col items-center justify-center border border-surface-container/50">
                <span className="text-[11px] text-on-surface-variant">الذاكرة (RAM)</span>
                <span className="text-base font-bold text-on-surface font-mono mt-0.5">2.1 / 8GB</span>
                <span className="text-[10px] text-teal-dark font-medium">استقرار تام</span>
              </div>
              <div className="bg-surface-container-lowest p-space-sm rounded-lg flex flex-col items-center justify-center border border-surface-container/50">
                <span className="text-[11px] text-on-surface-variant">المزامنة المحلية</span>
                <span className="text-base font-bold text-teal-dark font-mono mt-0.5">100%</span>
                <span className="text-[10px] text-on-surface-variant font-medium">RTC Battery OK</span>
              </div>
            </div>

            <div className="flex items-center gap-space-sm bg-surface-container-highest p-space-sm rounded-lg text-on-surface">
              <span className="material-symbols-outlined text-teal-dark text-lg">offline_bolt</span>
              <span className="text-xs leading-relaxed">
                العمل دون إنترنت مفعل: في حال انقطاع الشبكة تواصل الساعات الرقمية والجدولة عملها عبر مؤقت العتاد الدقيق (DS3231 RTC).
              </span>
            </div>
          </div>

          {/* Quick Maintenance Actions */}
          <div className="flex flex-col gap-space-xs">
            <span className="text-[11px] text-on-surface-variant font-bold uppercase tracking-wider">إجراءات الصيانة الفورية للأجهزة</span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-sm">
              <button
                type="button"
                className="flex flex-col items-center justify-center p-space-md bg-surface-container-low hover:bg-surface-container rounded-xl transition-all text-center group border border-surface-container"
              >
                <span className="material-symbols-outlined text-teal-dark text-2xl group-hover:rotate-180 transition-transform duration-500">restart_alt</span>
                <span className="text-xs font-bold text-on-surface mt-1">إعادة تشغيل البث</span>
                <span className="text-[10px] text-on-surface-variant font-mono">Audio Daemon</span>
              </button>
              <button
                type="button"
                className="flex flex-col items-center justify-center p-space-md bg-surface-container-low hover:bg-surface-container rounded-xl transition-all text-center group border border-surface-container"
              >
                <span className="material-symbols-outlined text-teal-dark text-2xl group-hover:scale-110 transition-transform">update</span>
                <span className="text-xs font-bold text-on-surface mt-1">مزامنة NTP الدقيقة</span>
                <span className="text-[10px] text-on-surface-variant">ضبط التوقيت</span>
              </button>
              <button
                type="button"
                className="flex flex-col items-center justify-center p-space-md bg-surface-container-low hover:bg-surface-container rounded-xl transition-all text-center group border border-surface-container"
              >
                <span className="material-symbols-outlined text-teal-dark text-2xl group-hover:scale-110 transition-transform">speaker_group</span>
                <span className="text-xs font-bold text-on-surface mt-1">فحص الأمبليفاير</span>
                <span className="text-[10px] text-on-surface-variant font-mono">IP Relay Ping</span>
              </button>
            </div>
          </div>

          {/* Amplifier Unit Status Summary */}
          <div className="bg-surface-container-low p-space-md rounded-xl flex items-center justify-between border border-surface-container">
            <div className="flex items-center gap-space-md">
              <span className="material-symbols-outlined text-teal-dark text-2xl">power</span>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-on-surface">مضخم الصوت الرقمي الرئيسي (Main Power Amp)</span>
                <span className="text-[11px] text-on-surface-variant">حالة المرحل التلقائي: قيد التنشيط الذكي مع بدء النغمات</span>
              </div>
            </div>
            <span className="px-space-md py-1 bg-surface-container-lowest text-teal-dark font-mono font-bold text-xs rounded-full border border-surface-container">
              240V / 500W
            </span>
          </div>
        </div>

        {/* Bell Chime Selector & Tone Assignment (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-space-lg bg-surface-container-lowest p-space-lg rounded-2xl shadow-sm border border-surface-container-high/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-space-sm">
              <span className="material-symbols-outlined text-teal-dark text-2xl">notifications_active</span>
              <h2 className="text-base font-bold text-on-surface">مخصص نغمات الأجراس والتنبيهات المدرسية</h2>
            </div>
            <span className="text-xs text-on-surface-variant bg-surface-container-high px-space-sm py-0.5 rounded-full">
              مزامنة النغمات
            </span>
          </div>

          {/* Chime Assignment Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
            {chimeItems.map((item) => (
              <div
                  key={item.id}
                  className={`p-space-md rounded-xl flex flex-col justify-between gap-space-sm border ${
                    item.isEmergency
                      ? 'bg-error-container/20 border-error/30'
                      : 'bg-surface-container-low border-surface-container'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-space-sm">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          item.isEmergency
                            ? 'bg-error text-on-error'
                            : 'bg-secondary-container text-on-secondary-container'
                        }`}
                      >
                        <span className="material-symbols-outlined text-lg">
                          {item.icon}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span
                          className={`text-xs font-bold ${
                            item.isEmergency ? 'text-on-error-container' : 'text-on-surface'
                          }`}
                        >
                          {item.title}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleTestChime(item.id)}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all shadow-sm ${
                        testingChime === item.id
                          ? item.isEmergency
                            ? 'bg-error text-white animate-spin'
                            : 'bg-teal-dark text-white animate-spin'
                          : item.isEmergency
                          ? 'bg-error-container text-error hover:bg-error hover:text-white'
                          : 'bg-surface-container-lowest text-teal-dark hover:bg-teal-dark hover:text-white'
                      }`}
                      title="استماع تجريبي"
                    >
                      <span className="material-symbols-outlined text-lg">
                        {testingChime === item.id ? 'refresh' : 'play_arrow'}
                      </span>
                    </button>
                  </div>

                  {/* Dropdown Selector - Default to "لم يتم تحديد نغمة" */}
                  <div className="flex flex-col gap-1 mt-space-xs">
                    <label
                      className={`text-[11px] font-medium ${
                        item.isEmergency ? 'text-on-error-container' : 'text-on-surface-variant'
                      }`}
                    >
                      النغمة الصوتية المعتمدة:
                    </label>
                    <select
                      value={selectedChimes[item.id] || ''}
                      onChange={(e) =>
                        setSelectedChimes((prev) => ({
                          ...prev,
                          [item.id]: e.target.value,
                        }))
                      }
                      className="w-full bg-surface-container-lowest text-on-surface text-xs px-space-md py-2 rounded-lg outline-none focus:ring-2 focus:ring-teal-dark cursor-pointer border border-surface-container"
                    >
                      <option value="">لم يتم تحديد نغمة</option>
                      {tracks.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.title} ({t.duration_formatted})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
            ))}
          </div>

          {/* Hint Bar */}
          <div className="flex items-center gap-space-sm bg-surface-container-low p-space-sm rounded-xl border border-surface-container">
            <span className="material-symbols-outlined text-teal-dark text-lg">info</span>
            <span className="text-xs text-on-surface-variant">
              يتم حفظ النغمات محلياً على ذاكرة الفلاش بالبوابة للعمل دون أي تأخير زمني وتجاوز مشاكل بطء الاتصال الخارجي.
            </span>
          </div>
        </div>
      </div>

      {/* SECTION 4: Media Library Manager & File Upload Dropzone */}
      <section className="flex flex-col gap-space-lg bg-surface-container-lowest p-space-lg rounded-2xl shadow-sm border border-surface-container-high/60">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md">
          <div className="flex items-center gap-space-sm">
            <span className="material-symbols-outlined text-teal-dark text-2xl">library_music</span>
            <div className="flex flex-col">
              <h2 className="text-base font-bold text-on-surface">مكتبة الوسائط والتسجيلات الإذاعية</h2>
              <span className="text-xs text-on-surface-variant">إدارة وتصنيف ملفات القرآن، الأناشيد الوطنية، الكلمات التربوية ومؤثرات البث</span>
            </div>
          </div>

          {/* Storage Quota Badge & Progress Bar */}
          <div className="flex flex-col gap-1 bg-surface-container-low p-space-md rounded-xl min-w-[280px] border border-surface-container">
            <div className="flex items-center justify-between text-xs">
              <span className="text-on-surface-variant font-medium">سعة التخزين المحلية (SSD):</span>
              <span className="font-mono font-bold text-on-surface">
                {tracks.length === 0 ? '0 مسارات (0%)' : `${tracks.length} مسارات محفوظة`}
              </span>
            </div>
            <div className="w-full h-2.5 bg-surface-container rounded-full overflow-hidden flex items-center">
              <div
                className="h-full bg-teal-dark rounded-full transition-all duration-300"
                style={{ width: `${Math.min(tracks.length * 5, 100)}%` }}
              ></div>
            </div>
            <span className="text-[11px] text-teal-dark font-medium">
              {tracks.length === 0 ? 'المكتبة مهيأة لاستقبال الملفات الصوتية الرسمية' : `${tracks.length} ملفات جاهزة للبث`}
            </span>
          </div>
        </div>

        {/* Drag & Drop Upload Zone */}
        <div className="border-2 border-dashed border-outline-variant hover:border-teal-dark transition-all rounded-2xl p-space-xl bg-surface-container-low flex flex-col items-center justify-center text-center cursor-pointer group">
          <div className="w-16 h-16 rounded-full bg-surface-container-highest group-hover:bg-secondary-container flex items-center justify-center text-teal-dark mb-space-sm transition-colors shadow-inner">
            <span className="material-symbols-outlined text-3xl">cloud_upload</span>
          </div>
          <h3 className="font-bold text-base text-on-surface">اسحب وأفلت الملفات الصوتية هنا أو استعرض جهازك</h3>
          <p className="text-xs text-on-surface-variant max-w-lg mt-1 leading-relaxed">
            يدعم النظام امتدادات الصوت الرقمية عالية النقاوة: MP3, WAV, FLAC بحد أقصى 50MB لكل ملف. يتم الفحص التلقائي لمستوى التردد والتطبيع الصوتي (Loudness Normalization).
          </p>
          <div className="flex items-center gap-space-sm mt-space-md">
            <button
              type="button"
              className="px-space-lg py-space-sm bg-teal-dark text-white rounded-xl text-xs font-bold shadow-sm hover:opacity-90 transition-opacity"
            >
              استعراض الملفات من الكمبيوتر
            </button>
          </div>
        </div>

        {/* Filter Category Chips & Search */}
        <div className="flex items-center justify-between flex-wrap gap-space-sm">
          <div className="flex items-center gap-space-xs flex-wrap">
            <span className="text-xs text-on-surface-variant pl-space-sm font-semibold">التصنيف:</span>
            {[
              'الكل',
              'أناشيد وطنية وتربوية',
              'أدعية وأذكار وتلاوات',
              'قصص وعبر صباحية',
              'أصوات الأجراس والتنبيهات',
            ].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveMediaFilter(cat)}
                className={`px-space-md py-1 rounded-full text-xs font-bold transition-colors ${
                  activeMediaFilter === cat
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-surface-container-high hover:bg-surface-container-highest text-on-surface'
                }`}
              >
                {cat} {cat === 'الكل' && tracks.length > 0 ? `(${tracks.length})` : ''}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-space-sm">
            <div className="relative">
              <input
                type="text"
                placeholder="بحث في المكتبة..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-surface-container-low px-space-md py-space-xs pr-8 rounded-xl text-xs text-on-surface outline-none focus:ring-2 focus:ring-teal-dark w-48 border border-surface-container"
              />
              <span className="material-symbols-outlined text-base text-on-surface-variant absolute right-2.5 top-2">
                search
              </span>
            </div>
          </div>
        </div>

        {/* Media Table or Clean Empty State */}
        {filteredTracks.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center bg-surface-container-low rounded-xl border border-surface-container">
            <div className="w-14 h-14 rounded-2xl bg-surface-container-high flex items-center justify-center text-on-surface-variant/60 mb-3">
              <span className="material-symbols-outlined text-3xl">library_music</span>
            </div>
            <h3 className="font-bold text-base text-on-surface mb-1">
              مكتبة الوسائط فارغة
            </h3>
            <p className="text-xs text-on-surface-variant max-w-md">
              لا توجد ملفات صوتية في المكتبة، يرجى رفع الملفات الرسمية
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl bg-surface-container-low border border-surface-container">
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="text-on-surface-variant font-bold bg-surface-container">
                  <th className="py-space-sm px-space-md">تشغيل</th>
                  <th className="py-space-sm px-space-md">اسم الملف الصوتي</th>
                  <th className="py-space-sm px-space-md">التصنيف</th>
                  <th className="py-space-sm px-space-md">المدة</th>
                  <th className="py-space-sm px-space-md text-center">الحالة</th>
                  <th className="py-space-sm px-space-md text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container">
                {filteredTracks.map((track) => (
                  <tr key={track.id} className="hover:bg-surface-container-lowest/60 transition-colors">
                    <td className="py-space-sm px-space-md">
                      <button
                        type="button"
                        className="w-8 h-8 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center hover:bg-teal-dark hover:text-white transition-colors"
                        title="استماع"
                      >
                        <span className="material-symbols-outlined text-lg">play_arrow</span>
                      </button>
                    </td>
                    <td className="py-space-sm px-space-md">
                      <div className="flex flex-col">
                        <span className="font-bold text-on-surface">{track.title}</span>
                        <span className="font-mono text-[10px] text-on-surface-variant">{track.id}</span>
                      </div>
                    </td>
                    <td className="py-space-sm px-space-md">
                      <span className="px-space-sm py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed text-[10px] font-bold">
                        {track.category}
                      </span>
                    </td>
                    <td className="py-space-sm px-space-md font-mono text-on-surface">
                      {track.duration_formatted}
                    </td>
                    <td className="py-space-sm px-space-md text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          track.is_active
                            ? 'bg-secondary-fixed text-on-secondary-fixed'
                            : 'bg-surface-container-high text-on-surface-variant'
                        }`}
                      >
                        {track.is_active ? 'نشط' : 'معطل'}
                      </span>
                    </td>
                    <td className="py-space-sm px-space-md text-center">
                      {onDeleteTrack && (
                        <button
                          type="button"
                          onClick={() => onDeleteTrack(track.id)}
                          className="p-1 rounded-lg text-on-surface-variant hover:text-error transition-colors"
                          title="حذف"
                        >
                          <span className="material-symbols-outlined text-base">delete</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Media Library Footer Tools */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-space-md pt-space-xs text-xs">
          <span className="text-on-surface-variant">
            {tracks.length === 0
              ? 'لا توجد ملفات صوتية مسجلة'
              : `عرض ${filteredTracks.length} من أصل ${tracks.length} مسار صوتي محفوظ`}
          </span>
          <div className="flex items-center gap-space-sm">
            <button
              type="button"
              disabled={tracks.length === 0}
              className="px-space-md py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-highest disabled:opacity-40 disabled:cursor-not-allowed text-on-surface font-bold transition-colors border border-surface-container-high"
            >
              تصدير نسخة احتياطية من الأصوات
            </button>
            <button
              type="button"
              disabled={tracks.length === 0}
              className="px-space-md py-1.5 rounded-lg bg-surface-container-low hover:bg-surface-container disabled:opacity-40 disabled:cursor-not-allowed text-on-surface-variant font-bold transition-colors border border-surface-container"
            >
              إعادة فحص الترددات وتطبيع مستوى الصوت
            </button>
          </div>
        </div>
      </section>

      {/* 5. Mobile Controller APK & QR Code Download Section */}
      <section className="bg-surface-container-lowest p-space-lg rounded-2xl shadow-sm border border-teal-dark/40 relative overflow-hidden flex flex-col gap-space-lg">
        {/* Glowing Background Accent */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-teal-dark/5 rounded-full blur-3xl pointer-events-none"></div>

        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md border-b border-surface-container pb-space-md">
          <div className="flex items-center gap-space-md">
            <div className="w-12 h-12 rounded-2xl bg-secondary-container flex items-center justify-center text-teal-dark shadow-sm">
              <span className="material-symbols-outlined text-2xl">phone_android</span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-space-sm flex-wrap">
                <h2 className="text-lg md:text-xl font-bold text-on-surface">تطبيق الهاتف الذكي للمشرف (SmartBell Controller)</h2>
                <span className="px-space-sm py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed text-xs font-bold font-mono">
                  v2.4.0 Production
                </span>
                <span className="px-space-sm py-0.5 rounded-full bg-surface-container-high text-on-surface-variant text-xs font-bold">
                  Android APK
                </span>
              </div>
              <p className="text-xs text-on-surface-variant mt-0.5">
                تثبيت وحدة التحكم المتنقلة على هاتف المشرف للإدارة اللحظية للأجراس وصمت الطوارئ وبث الميكروفون للساحة.
              </p>
            </div>
          </div>

          <a
            href="/downloads/smartbell-controller.apk"
            download="smartbell-controller.apk"
            className="flex items-center justify-center gap-2 px-space-xl py-space-sm bg-teal-dark hover:bg-secondary text-white font-bold text-sm rounded-xl transition-all shadow-md hover:shadow-teal-dark/30 active:scale-95 border border-teal-dark/50"
          >
            <span className="material-symbols-outlined text-xl">download</span>
            <span>تنزيل ملف APK المباشر (18.4 MB)</span>
          </a>
        </div>

        {/* Main Content: Info & QR Code Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-space-lg items-center">
          {/* Col 1 & 2: App Capabilities & Quick Info */}
          <div className="lg:col-span-2 flex flex-col gap-space-md">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
              <div className="p-space-md rounded-xl bg-surface-container-low border border-surface-container flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary-container text-teal-dark flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-lg">notification_important</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-sm text-on-surface">أجراس التجاوز الفوري</span>
                  <span className="text-xs text-on-surface-variant">رنين فوري لدخول الطلاب (20 ث) والانصراف (15 ث) والتنبيه بنقرة واحدة.</span>
                </div>
              </div>

              <div className="p-space-md rounded-xl bg-surface-container-low border border-error/30 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-error-container text-error flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-lg">warning</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-sm text-error">صمت الطوارئ الشامل</span>
                  <span className="text-xs text-on-surface-variant">كتم فوري لكافة المكبرات والأجراس المدرسية من أي مكان بالمدرسة.</span>
                </div>
              </div>

              <div className="p-space-md rounded-xl bg-surface-container-low border border-surface-container flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-secondary-container text-teal-dark flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-lg">mic</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-sm text-on-surface">مايك المشرف (Push-to-Talk)</span>
                  <span className="text-xs text-on-surface-variant">نقل صوت المشرف المباشر من ميكروفون الهاتف إلى مضخم الساحة فورياً.</span>
                </div>
              </div>

              <div className="p-space-md rounded-xl bg-surface-container-low border border-surface-container flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-surface-container-high text-on-surface flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-lg">wifi_tethering</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-sm text-on-surface">ربط سحابي ومحلي مستقل</span>
                  <span className="text-xs text-on-surface-variant">تزامن لحظي عبر Supabase Realtime مع دعم التشغيل دون إنترنت.</span>
                </div>
              </div>
            </div>

            {/* Quick Installation Steps */}
            <div className="p-space-md rounded-xl bg-surface-container-high/40 border border-surface-container flex items-center justify-between gap-4 flex-wrap text-xs text-on-surface-variant">
              <span className="font-bold text-on-surface">طريقة التثبيت السريع:</span>
              <span className="flex items-center gap-1.5"><span className="w-5 h-5 rounded-full bg-teal-dark text-white flex items-center justify-center text-[10px] font-bold">1</span> امسح رمز الاستجابة بالكاميرا</span>
              <span className="flex items-center gap-1.5"><span className="w-5 h-5 rounded-full bg-teal-dark text-white flex items-center justify-center text-[10px] font-bold">2</span> قم بتأكيد تنزيل ملف APK</span>
              <span className="flex items-center gap-1.5"><span className="w-5 h-5 rounded-full bg-teal-dark text-white flex items-center justify-center text-[10px] font-bold">3</span> افتح الملف واضغط "تثبيت"</span>
            </div>
          </div>

          {/* Col 3: QR Code Box */}
          <div className="flex flex-col items-center justify-center p-space-md bg-surface-container-low rounded-2xl border border-teal-dark/30 shadow-sm text-center">
            <span className="text-xs font-bold text-on-surface mb-2">مسح بالكاميرا للتنزيل المباشر</span>
            <div className="p-2.5 bg-surface-container-lowest rounded-xl border border-teal-dark/40 shadow-inner">
              <img
                src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://smartbell-9ec8b.web.app/downloads/smartbell-controller.apk&bgcolor=0F172A&color=14B8A6"
                alt="QR Code لتحميل SmartBell Controller APK"
                className="w-36 h-36 rounded-lg"
                loading="lazy"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <span className="text-[11px] font-mono text-teal-dark font-bold mt-2">smartbell-controller.apk</span>
            <span className="text-[10px] text-on-surface-variant mt-0.5">جاهز للتثبيت على كافة أجهزة أندرويد</span>
          </div>
        </div>
      </section>
    </div>
  );
};
