import React, { useState, useRef, useEffect } from 'react';
import { IntermissionTrack } from '../../types';
import { supabaseService } from '../../core/supabaseService';
import { getSupabaseUrl, getSupabaseAnonKey, reconfigureSupabase, testSupabaseConnection } from '../../core/supabaseClient';
import { audioPlayerService } from '../../core/audioPlayerService';

interface SystemConfigurationViewProps {
  tracks?: IntermissionTrack[];
  onAddTrack?: (track: Omit<IntermissionTrack, 'id' | 'duration_formatted'>, fileBlob?: Blob) => Promise<string | undefined>;
  onDeleteTrack?: (trackId: string) => void;
  onShowToast?: (type: 'success' | 'error' | 'info' | 'warning', message: string, title?: string) => void;
}

export const SystemConfigurationView: React.FC<SystemConfigurationViewProps> = ({
  tracks = [],
  onAddTrack,
  onDeleteTrack,
  onShowToast,
}) => {
  const [masterVolume, setMasterVolume] = useState<number>(80);
  const [isPingTesting, setIsPingTesting] = useState<boolean>(false);
  const [pingSuccess, setPingSuccess] = useState<boolean>(false);
  const [activeMediaFilter, setActiveMediaFilter] = useState<string>('الكل');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [playingMediaId, setPlayingMediaId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = audioPlayerService.subscribe((state) => {
      if (state.isPlaying && state.currentTrack) {
        setPlayingMediaId(state.currentTrack.id);
      } else {
        setPlayingMediaId(null);
      }
    });
    return unsub;
  }, []);

  // Audio Upload & Drag and Drop State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');

  const handleBrowseClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const processAudioFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    let successCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setUploadProgress(`جاري قياس مدة: ${file.name} (${i + 1}/${files.length})...`);

      const isAudio = file.type.startsWith('audio/') || /\.(mp3|wav|ogg|flac|m4a|aac)$/i.test(file.name);
      if (!isAudio) {
        if (onShowToast) onShowToast('warning', `الملف ${file.name} ليس ملفاً صوتياً مدعوماً.`, 'تنسيق غير مدعوم');
        continue;
      }

      try {
        const tempObjectUrl = URL.createObjectURL(file);
        const audio = new Audio(tempObjectUrl);

        const durationSec = await new Promise<number>((resolve) => {
          audio.onloadedmetadata = () => {
            const sec = Math.round(audio.duration);
            resolve(sec > 0 && isFinite(sec) ? sec : 120);
          };
          audio.onerror = () => resolve(120);
          setTimeout(() => resolve(120), 2500);
        });

        // Revoke temporary measuring URL to prevent memory leaks
        URL.revokeObjectURL(tempObjectUrl);

        const cleanTitle = file.name.replace(/\.[^/.]+$/, '').trim() || 'تسجيل صوتي مدرسي';
        let assignedCategory: IntermissionTrack['category'] = 'NASHEED';
        let assignedSession: IntermissionTrack['session'] = 'MORNING_BREAK';

        if (activeMediaFilter.includes('أذكار') || activeMediaFilter.includes('تلاوات') || activeMediaFilter.includes('أدعية')) {
          assignedCategory = 'DUAA';
          assignedSession = 'NOON_BREAK';
        } else if (activeMediaFilter.includes('قصص') || activeMediaFilter.includes('عبر')) {
          assignedCategory = 'STORY';
          assignedSession = 'MORNING_BREAK';
        } else if (activeMediaFilter.includes('تنبيهات') || activeMediaFilter.includes('أجراس')) {
          assignedCategory = 'PROVERB';
          assignedSession = 'MORNING_BREAK';
        }

        // Upload directly to Supabase Cloud Storage (smartbell-audio bucket)
        setUploadProgress(`جاري رفع ${cleanTitle} سحابياً إلى Supabase Storage (${i + 1}/${files.length})...`);
        const uploadRes = await supabaseService.uploadAudioFile(file, 'smartbell-audio');

        if (!uploadRes.success || !uploadRes.publicUrl) {
          console.error('❌ [Upload Error] Cloud upload failed:', uploadRes.error);
          if (onShowToast) {
            onShowToast(
              'error',
              uploadRes.error || 'فشل الرفع السحابي. يرجى التأكد من تهيئة سلة smartbell-audio في Supabase.',
              `خطأ رفع: ${file.name}`
            );
          }
          // Do not write a dead blob URL to the shared database
          continue;
        }

        const finalAudioUrl = uploadRes.publicUrl;

        let createdId: string | undefined;
        if (onAddTrack) {
          createdId = await onAddTrack({
            title: cleanTitle,
            category: assignedCategory,
            session: assignedSession,
            speaker_or_artist: 'تسجيل مدرسي سحابي',
            duration_seconds: durationSec,
            audio_url: finalAudioUrl,
            play_order: tracks.length + successCount + 1,
            is_active: true,
          }, file);
        }

        // Cache local copy for immediate playback
        if (createdId) {
          await audioPlayerService.saveAudioBlob(createdId, file);
        }
        await audioPlayerService.saveAudioBlob(cleanTitle, file);
        successCount++;
      } catch (err: any) {
        console.error('Error processing audio file:', err);
        if (onShowToast) onShowToast('error', `تعذر معالجة الملف ${file.name}`, 'خطأ معالجة');
      }
    }

    setIsUploading(false);
    setUploadProgress('');
    if (successCount > 0 && onShowToast) {
      onShowToast('success', `تم رفع ومزامنة ${successCount} مقاطع صوتية سحابياً بنجاح عبر كافة الأجهزة والهواتف.`, 'اكتمال الرفع السحابي');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processAudioFiles(e.target.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processAudioFiles(e.dataTransfer.files);
    }
  };

  // Supabase Cloud Connection State
  const [cloudUrl, setCloudUrl] = useState<string>(getSupabaseUrl());
  const [cloudKey, setCloudKey] = useState<string>(getSupabaseAnonKey());
  const [showKey, setShowKey] = useState<boolean>(false);
  const [isTestingConnection, setIsTestingConnection] = useState<boolean>(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [connectionMsg, setConnectionMsg] = useState<string>('');

  const handleSaveAndTestConnection = async () => {
    setIsTestingConnection(true);
    setConnectionStatus('idle');
    setConnectionMsg('');
    try {
      const res = await testSupabaseConnection(cloudUrl, cloudKey);
      if (res.success) {
        reconfigureSupabase(cloudUrl, cloudKey);
        setConnectionStatus('success');
        setConnectionMsg('تم الاتصال بالسحابة بنجاح والتحقق من صحة المفتاح.');
        if (onShowToast) {
          onShowToast('success', 'تم الاتصال بقاعدة بيانات Supabase وحفظ المفتاح بنجاح.', 'الربط السحابي');
        }
      } else {
        setConnectionStatus('error');
        setConnectionMsg(`فشل الاتصال: ${res.message}`);
        if (onShowToast) {
          onShowToast('error', `تعذر الاتصال بقاعدة البيانات: ${res.message}`, 'خطأ في الربط السحابي');
        }
      }
    } catch (e: any) {
      setConnectionStatus('error');
      setConnectionMsg('حدث خطأ أثناء الاتصال بالخادم السحابي.');
      if (onShowToast) {
        onShowToast('error', 'حدث خطأ أثناء فحص الاتصال بالسحابة.', 'خطأ غير متوقع');
      }
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handlePingTest = async () => {
    setIsPingTesting(true);
    setPingSuccess(false);
    if (onShowToast) {
      onShowToast('info', 'جاري بث إشارة فحص المكبرات الصوتية...', 'فحص المكبرات');
    }
    await supabaseService.sendPingTest();
    setTimeout(() => {
      setIsPingTesting(false);
      setPingSuccess(true);
      if (onShowToast) {
        onShowToast('success', 'تم فحص المكبرات بنجاح والتأكد من استجابة النظام.', 'فحص المكبرات');
      }
      setTimeout(() => {
        setPingSuccess(false);
      }, 3000);
    }, 1200);
  };

  const handleMasterVolumeChange = (vol: number) => {
    setMasterVolume(vol);
    audioPlayerService.setVolume(vol);
    supabaseService.updateMasterVolume(vol);
  };

  const handlePreviewMedia = (track: IntermissionTrack) => {
    const currentState = audioPlayerService.getCurrentState();
    if (currentState.isPlaying && currentState.currentTrack?.id === track.id) {
      audioPlayerService.pause();
      if (onShowToast) {
        onShowToast('info', `تم إيقاف الاستماع للملف: ${track.title}`, 'معاينة الملف');
      }
    } else {
      audioPlayerService.playTrack(track);
      if (onShowToast) {
        onShowToast('info', `جاري الاستماع للملف: ${track.title}`, 'معاينة الملف');
      }
    }
  };

  // Filter media tracks according to category and search query
  const filteredTracks = tracks.filter((t) => {
    if (activeMediaFilter !== 'الكل' && t.category !== activeMediaFilter) return false;
    if (searchQuery.trim() && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="flex flex-col w-full gap-space-xl pb-12">
      {/* Page Header & Master Broadcast Quick Switch */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-space-lg bg-surface-container-lowest p-space-lg rounded-2xl shadow-sm border border-surface-container-high/60">
        <div className="flex items-center gap-space-lg">
          <div className="w-14 h-14 rounded-2xl bg-secondary-container flex items-center justify-center text-on-secondary-container shadow-sm flex-shrink-0">
            <span className="material-symbols-outlined text-3xl text-teal-dark">library_music</span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-space-sm">
              <h1 className="text-xl md:text-2xl font-bold text-on-surface">مكتبة الوسائط والتسجيلات وتطبيق المشرف</h1>
              <span className="inline-flex items-center gap-1.5 px-space-sm py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed text-xs font-bold">
                <span className="w-2 h-2 rounded-full bg-teal-dark animate-pulse"></span>
                المنظومة في وضع التشغيل
              </span>
            </div>
            <p className="text-sm text-on-surface-variant mt-0.5">
              تنظيم وإدارة مكتبة الملفات الصوتية، تعيير الصوت الموحد الشامل للمدرسة، وتثبيت تطبيق الهاتف للمشرف.
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
                  onChange={(e) => handleMasterVolumeChange(Number(e.target.value))}
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
                <span>تم فحص المكبرات بنجاح</span>
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

      {/* SECTION 1: Media Library Manager & File Upload Dropzone */}
      <section className="flex flex-col gap-space-lg bg-surface-container-lowest p-space-lg rounded-2xl shadow-sm border border-surface-container-high/60">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md">
          <div className="flex items-center gap-space-sm">
            <div className="w-10 h-10 rounded-xl bg-secondary-container flex items-center justify-center text-teal-dark">
              <span className="material-symbols-outlined text-xl">audio_file</span>
            </div>
            <div className="flex flex-col">
              <h2 className="text-base font-bold text-on-surface">إدارة ملفات الصوت والتسجيلات المدرسية</h2>
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

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*,.mp3,.wav,.ogg,.flac,.m4a,.aac"
          multiple
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Drag & Drop Upload Zone */}
        <div
          onClick={handleBrowseClick}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed transition-all rounded-2xl p-space-xl flex flex-col items-center justify-center text-center cursor-pointer group relative overflow-hidden select-none ${
            isDragging
              ? 'border-teal-dark bg-teal-dark/15 ring-4 ring-teal-dark/20 scale-[1.01]'
              : 'border-outline-variant hover:border-teal-dark bg-surface-container-low hover:bg-surface-container'
          }`}
        >
          {isUploading ? (
            <div className="flex flex-col items-center justify-center py-4">
              <span className="w-12 h-12 border-4 border-teal-dark/30 border-t-teal-dark rounded-full animate-spin mb-3"></span>
              <span className="font-bold text-sm text-teal-dark">{uploadProgress || 'جاري معالجة وحفظ الملفات الصوتية...'}</span>
              <span className="text-xs text-on-surface-variant mt-1">يتم استخراج مدة التسجيل وتطبيع الترددات الصوتية تلقائياً</span>
            </div>
          ) : (
            <>
              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center text-teal-dark mb-space-sm transition-all shadow-inner ${
                  isDragging
                    ? 'bg-teal-dark text-white scale-110 shadow-lg shadow-teal-dark/30'
                    : 'bg-surface-container-highest group-hover:bg-secondary-container'
                }`}
              >
                <span className="material-symbols-outlined text-3xl">
                  {isDragging ? 'downloading' : 'cloud_upload'}
                </span>
              </div>
              <h3 className="font-bold text-base text-on-surface">
                {isDragging ? 'أفلت الملفات الصوتية هنا لبدء الإضافة فوراً' : 'اسحب وأفلت الملفات الصوتية هنا أو استعرض جهازك'}
              </h3>
              <p className="text-xs text-on-surface-variant max-w-lg mt-1 leading-relaxed">
                يدعم النظام امتدادات الصوت الرقمية عالية النقاوة: MP3, WAV, FLAC, M4A, OGG بحد أقصى 50MB لكل ملف. يتم الفحص التلقائي لمستوى التردد والتطبيع الصوتي (Loudness Normalization).
              </p>
              <div className="flex items-center gap-space-sm mt-space-md">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleBrowseClick();
                  }}
                  className="px-space-lg py-space-sm bg-teal-dark text-white rounded-xl text-xs font-bold shadow-md hover:bg-secondary transition-all active:scale-95 flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-sm">folder_open</span>
                  <span>استعراض الملفات من الكمبيوتر</span>
                </button>
              </div>
            </>
          )}
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
                        onClick={() => handlePreviewMedia(track)}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                          playingMediaId === track.id
                            ? 'bg-teal-dark text-white ring-2 ring-teal-dark/40 animate-pulse'
                            : 'bg-secondary-container text-on-secondary-container hover:bg-teal-dark hover:text-white'
                        }`}
                        title="استماع"
                      >
                        <span className="material-symbols-outlined text-lg">
                          {playingMediaId === track.id ? 'pause' : 'play_arrow'}
                        </span>
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

      {/* SECTION 2: Supabase Cloud Credentials & Connection Management */}
      <section className="bg-surface-container-lowest p-space-lg rounded-2xl shadow-sm border border-secondary/40 relative overflow-hidden flex flex-col gap-space-lg">
        {/* Subtle Accent Glow */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-secondary/5 rounded-full blur-3xl pointer-events-none"></div>

        {/* Section Header & Status Badge */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md border-b border-surface-container pb-space-md">
          <div className="flex items-center gap-space-md">
            <div className="w-12 h-12 rounded-2xl bg-secondary-container flex items-center justify-center text-teal-dark shadow-sm flex-shrink-0">
              <span className="material-symbols-outlined text-2xl">cloud_sync</span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-space-sm flex-wrap">
                <h2 className="text-lg md:text-xl font-bold text-on-surface">إعدادات الربط السحابي بقاعدة البيانات (Supabase Cloud)</h2>
                {connectionStatus === 'success' && (
                  <span className="inline-flex items-center gap-1.5 px-space-sm py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-500/20">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    متصل بالسحابة بنجاح
                  </span>
                )}
                {connectionStatus === 'error' && (
                  <span className="inline-flex items-center gap-1.5 px-space-sm py-0.5 rounded-full bg-error-container text-error text-xs font-bold border border-error/30">
                    <span className="w-2 h-2 rounded-full bg-error"></span>
                    فشل الاتصال - خطأ في المفتاح
                  </span>
                )}
                {connectionStatus === 'idle' && (
                  <span className="inline-flex items-center gap-1.5 px-space-sm py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed text-xs font-bold">
                    <span className="w-2 h-2 rounded-full bg-teal-dark"></span>
                    الربط السحابي مفعل
                  </span>
                )}
              </div>
              <p className="text-xs text-on-surface-variant mt-0.5">
                إدارة مفتاح الوصول العام (Anon Public Key) ورابط المشروع لضمان التزامن اللحظي للأجراس والتحكم الصوتي.
              </p>
            </div>
          </div>

          <a
            href="https://supabase.com/dashboard/project/mnlmilyymnrhkuulcpfw/settings/api"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-space-md py-space-sm rounded-xl bg-surface-container-low hover:bg-surface-container text-on-surface text-xs font-bold transition-all border border-surface-container w-fit"
          >
            <span className="material-symbols-outlined text-sm text-teal-dark">open_in_new</span>
            <span>فتح لوحة مفاتيح Supabase</span>
          </a>
        </div>

        {/* Form Inputs Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-lg">
          {/* Project URL */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-on-surface flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm text-teal-dark">link</span>
              <span>رابط مشروع Supabase (Project URL)</span>
            </label>
            <input
              type="text"
              value={cloudUrl}
              onChange={(e) => setCloudUrl(e.target.value)}
              placeholder="https://your-project.supabase.co"
              className="w-full px-space-md py-2.5 rounded-xl bg-surface-container-low border border-surface-container focus:border-teal-dark focus:ring-1 focus:ring-teal-dark text-xs font-mono text-on-surface outline-none transition-all"
              dir="ltr"
            />
            <span className="text-[11px] text-on-surface-variant">الخادم السحابي المستضيف لجداول الأجراس والأوامر اللحظية.</span>
          </div>

          {/* Anon Public Key */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-on-surface flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm text-teal-dark">key</span>
                <span>مفتاح الوصول العام (Anon Public Key)</span>
              </span>
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="text-xs text-teal-dark hover:underline flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">
                  {showKey ? 'visibility_off' : 'visibility'}
                </span>
                <span>{showKey ? 'إخفاء' : 'إظهار المفتاح'}</span>
              </button>
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={cloudKey}
                onChange={(e) => setCloudKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full px-space-md py-2.5 rounded-xl bg-surface-container-low border border-surface-container focus:border-teal-dark focus:ring-1 focus:ring-teal-dark text-xs font-mono text-on-surface outline-none transition-all"
                dir="ltr"
              />
            </div>
            <span className="text-[11px] text-on-surface-variant">مفتاح JWT الآمن للاستعلامات والاشتراك في قنوات Realtime.</span>
          </div>
        </div>

        {/* Connection Message Banner */}
        {connectionMsg && (
          <div className={`p-space-sm px-space-md rounded-xl text-xs font-medium border flex items-center gap-2 ${
            connectionStatus === 'success' 
              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30' 
              : 'bg-error-container text-error border-error/30'
          }`}>
            <span className="material-symbols-outlined text-base">
              {connectionStatus === 'success' ? 'check_circle' : 'error'}
            </span>
            <span>{connectionMsg}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-space-md flex-wrap pt-space-xs">
          <button
            type="button"
            onClick={() => {
              setCloudUrl('https://mnlmilyymnrhkuulcpfw.supabase.co');
              setCloudKey('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ubG1pbHl5bW5yaGt1dWxjcGZ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTExNTQ4MDEsImV4cCI6MjEwNjczMDgwMX0.xwTWg19h-eLzL7tVpbrPQCiEYYj6jCEhO1Cgk4SzGqk');
              if (onShowToast) onShowToast('info', 'تم استرجاع الإعدادات الافتراضية الرسمية.', 'استعادة');
            }}
            className="text-xs text-on-surface-variant hover:text-on-surface transition-colors flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-sm">restart_alt</span>
            <span>استعادة الإعدادات الافتراضية</span>
          </button>

          <button
            type="button"
            onClick={handleSaveAndTestConnection}
            disabled={isTestingConnection || !cloudKey.trim()}
            className="flex items-center gap-2 px-space-xl py-2.5 bg-teal-dark hover:bg-secondary text-white font-bold text-xs rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isTestingConnection ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                <span>جاري اختبار الاتصال وحفظ المفتاح...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-base">bolt</span>
                <span>اختبار وحفظ الاتصال بالسحابة</span>
              </>
            )}
          </button>
        </div>
      </section>

      {/* SECTION 3: Mobile Controller APK & QR Code Download Section (Desktop only to declutter mobile UI) */}
      <section className="hidden md:flex bg-surface-container-lowest p-space-lg rounded-2xl shadow-sm border border-teal-dark/40 relative overflow-hidden flex-col gap-space-lg">
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
                  v2.7.1 Production
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
