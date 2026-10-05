-- ============================================================
-- منظومة SmartBell - سكريبت تصفير البيانات المؤقتة وتجهيز بيئة الإنتاج
-- Migration: cleanup_and_production_prep.sql
-- ============================================================

-- 1. تصفير الجداول التشغيلية من السجلات التجريبية
truncate table live_overrides cascade;
truncate table system_logs cascade;
truncate table intermission_tracks cascade;
truncate table bell_schedules cascade;

-- 2. تثبيت وتحديث حالة مناطق توزيع الصوت المدرسية الأربعة على الوضع النشط (ONLINE)
insert into audio_zones (zone_code, name, description, speaker_count, status, volume, is_muted, allow_morning_broadcast, ip_network)
values
  ('ZONE_A', 'ساحة المدرسة والملاعب الخارجية', '8 مكبرات صوت IP نشطة مع عزل الصدى المفتوح', 8, 'ONLINE', 85, false, true, 'VLAN 20 (192.168.20.10-18)'),
  ('ZONE_B', 'الممرات الداخلية والمطعم', '12 مكبر صوت سقفي موزع على الطوابق الثلاثة', 12, 'ONLINE', 60, false, true, 'VLAN 20 (192.168.20.20-32)'),
  ('ZONE_C', 'قاعة الأساتذة والمكاتب الإدارية', '6 مكبرات صوت هادئة مخصصة للأجراس والإشعارات الهامة', 6, 'ONLINE', 40, false, false, 'VLAN 20 (192.168.20.40-46)'),
  ('ZONE_D', 'المصلى المدرسي والملحقات', 'مخصص للأذان والتلاوات القرآنية وخطب صلاة الظهر', 4, 'ONLINE', 90, false, false, 'VLAN 20 (192.168.20.50-54)')
on conflict (zone_code) do update set
  status = 'ONLINE',
  is_muted = false,
  volume = excluded.volume,
  updated_at = now();

-- 3. تثبيت إعدادات الأذان الشرعية المعتمدة لمدينة مراكش (وزارة الأوقاف والشؤون الإسلامية)
insert into adhan_settings (id, city, latitude, longitude, calculation_method, auto_interrupt, audio_url, dua_after_athan)
values
  (1, 'Marrakech', 31.6295, -7.9811, 'Morocco_Awqaf', true, 'https://cdn.smartbell.local/audio/athan_makkah.mp3', true)
on conflict (id) do update set
  city = excluded.city,
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  calculation_method = excluded.calculation_method,
  auto_interrupt = true,
  updated_at = now();

-- 4. إدخال جدول الحصص المدرسي الرسمي المعتمد (Default Production Schedule)
insert into bell_schedules (id, preset_id, bell_time, bell_type, label, duration_seconds, target_zones, is_enabled)
values
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', '08:00', 'ENTRY', 'طابور الصباح والنشيد الوطني المغربي', 20, 'ALL', true),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', '08:15', 'ENTRY', 'بداية الحصة الدراسية الأولى', 8, 'ALL', true),
  ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', '10:00', 'BREAK', 'استراحة الصباح الأولى وبث الإذاعة', 10, 'ALL', true),
  ('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', '10:25', 'WARNING', 'انتهاء الفسحة وعودة الطلاب للفصول', 6, 'ALL', true),
  ('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', '12:05', 'BREAK', 'استراحة الظهيرة وصلاة الظهر الموحدة', 15, 'ALL', true),
  ('b0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', '14:30', 'EXIT', 'جرس انصراف الطلاب والمغادرة اليومية', 15, 'ALL', true)
on conflict (id) do nothing;

-- 5. إدخال باقة الفقرات الإذاعية الصباحية الرسمية (Production Intermission Tracks)
insert into intermission_tracks (session, category, title, speaker_or_artist, duration_seconds, audio_url, play_order, is_active)
values
  ('MORNING_BREAK', 'PROVERB', 'فضل بر الوالدين وحب الوطن', 'حكمة اليوم - إلقاء الطالب أحمد المرزوقي', 135, 'https://cdn.smartbell.local/audio/proverb_parents.mp3', 1, true),
  ('MORNING_BREAK', 'STORY', 'قصة العالم ابن الهيثم والريادة العلمية', 'محتوى إثرائي علمي - نادي العلوم والابتكار', 230, 'https://cdn.smartbell.local/audio/story_ibn_alhaytham.mp3', 2, true),
  ('MORNING_BREAK', 'NASHEED', 'نشيد العلم والنور (المجموعة المدرسية)', 'إنشاد كورال المؤسسة التعليمية', 270, 'https://cdn.smartbell.local/audio/nasheed_knowledge.mp3', 3, true),
  ('MORNING_BREAK', 'DUAA', 'أذكار الصباح بصوت ندي وهادئ', 'تلاوة وأذكار صباحية مباركة', 252, 'https://cdn.smartbell.local/audio/morning_adhkar.mp3', 4, true);

-- 6. توثيق إطلاق بيئة الإنتاج في سجل التدقيق الرسمي
insert into system_logs (event_type, description, zone, severity)
values
  ('SYSTEM_INIT', 'تم إطلاق بيئة الإنتاج التشغيلية لمنظومة SmartBell وتصفير السجلات المؤقتة وتثبيت الجداول الرسمية', 'ALL', 'INFO');
