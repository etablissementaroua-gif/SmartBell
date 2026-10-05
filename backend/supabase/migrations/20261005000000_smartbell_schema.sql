-- ============================================================
-- SmartBell Database Schema & Realtime Setup
-- Project: SmartBell (بيل سمارت - منظومة الأجراس والإذاعة المدرسية)
-- Migration: 20261005000000_smartbell_schema.sql
-- ============================================================

-- 1. تفعيل الملحقات الأساسية
create extension if not exists "uuid-ossp";

-- 2. جدول قوالب الدوام المدرسي (عادي، رمضان، امتحانات)
create table if not exists bell_presets (
    id uuid primary key default uuid_generate_v4(),
    name text not null,
    description text,
    is_active boolean default false,
    created_at timestamptz default now()
);

-- 3. جدول مواعيد ورنين الأجراس التلقائية
create table if not exists bell_schedules (
    id uuid primary key default uuid_generate_v4(),
    preset_id uuid references bell_presets(id) on delete cascade,
    bell_time time not null,
    bell_type text check (bell_type in ('ENTRY', 'EXIT', 'WARNING', 'BREAK')) not null,
    label text not null,
    details text,
    audio_url text,
    duration_seconds int default 10,
    target_zones text[] default array['ALL'],
    is_enabled boolean default true,
    created_at timestamptz default now()
);

-- 4. جدول فقرات الاستراحات (الصباحية والزوالية)
create table if not exists intermission_tracks (
    id uuid primary key default uuid_generate_v4(),
    session text check (session in ('MORNING_BREAK', 'NOON_BREAK')) not null,
    category text check (category in ('PROVERB', 'STORY', 'NASHEED', 'DUAA', 'QURAN')) not null,
    title text not null,
    speaker_or_artist text,
    duration_seconds int default 120,
    audio_url text not null,
    play_order int default 1,
    is_active boolean default true,
    created_at timestamptz default now()
);

-- 5. جدول إعدادات الأذان والمقاطعة التلقائية لمدينة مراكش
create table if not exists adhan_settings (
    id int primary key default 1,
    city text default 'Marrakech',
    latitude double precision default 31.6295,
    longitude double precision default -7.9811,
    calculation_method text default 'Morocco_Awqaf',
    auto_interrupt boolean default true,
    audio_url text default 'https://cdn.smartbell.local/audio/athan_makkah.mp3',
    dua_after_athan boolean default true,
    updated_at timestamptz default now()
);

-- 6. جدول مناطق توزيع الصوت المدرسية (Audio Zones)
create table if not exists audio_zones (
    id uuid primary key default uuid_generate_v4(),
    zone_code text unique not null,
    name text not null,
    description text,
    speaker_count int default 4,
    status text default 'ONLINE', -- ONLINE, STANDBY, MUTED
    volume int check (volume between 0 and 100) default 75,
    is_muted boolean default false,
    allow_morning_broadcast boolean default true,
    ip_network text,
    updated_at timestamptz default now(),
    created_at timestamptz default now()
);

-- 7. جدول أوامر التدخل الفوري والتجاوز (Live Overrides)
create table if not exists live_overrides (
    id uuid primary key default uuid_generate_v4(),
    command text check (command in ('INSTANT_ENTRY', 'INSTANT_EXIT', 'PERIOD_END', 'EMERGENCY_MUTE', 'RESUME', 'MIC_BROADCAST', 'PING_TEST')) not null,
    target_zone text default 'ALL',
    initiator text default 'المشرف الإذاعي',
    payload jsonb default '{}'::jsonb,
    is_executed boolean default false,
    created_at timestamptz default now()
);

-- 8. جدول سجل عمليات وتدقيق النظام (Audit Logs)
create table if not exists system_logs (
    id uuid primary key default uuid_generate_v4(),
    event_type text not null,
    description text not null,
    zone text default 'ALL',
    severity text check (severity in ('INFO', 'WARNING', 'CRITICAL')) default 'INFO',
    created_at timestamptz default now()
);

-- ============================================================
-- تفعيل Realtime على الجداول الحيوية
-- ============================================================
alter publication supabase_realtime add table live_overrides;
alter publication supabase_realtime add table audio_zones;
alter publication supabase_realtime add table bell_schedules;

-- ============================================================
-- البيانات الأولية (Seed Data)
-- ============================================================

-- أ. إدخال القوالب الافتراضية
insert into bell_presets (id, name, description, is_active) values
('a0000000-0000-0000-0000-000000000001', 'الدوام المدرسي الكامل (8 مهام)', 'الجدول الشامل لليوم الدراسي العادي بالمملكة المغربية', true),
('a0000000-0000-0000-0000-000000000002', 'التوقيت المدرسي الرمضاني', 'تعديل الحصص وفترات الاستراحة خلال شهر رمضان المبارك', false),
('a0000000-0000-0000-0000-000000000003', 'جدول فترات الامتحانات الموحدة', 'توقيت خاص بفترات الاختبارات الفصلية والنهائية', false)
on conflict (id) do nothing;

-- ب. إدخال جدول الأجراس لليوم الدراسي العادي (المطابق للوحة التحكم)
insert into bell_schedules (preset_id, bell_time, bell_type, label, details, duration_seconds, target_zones, is_enabled) values
('a0000000-0000-0000-0000-000000000001', '08:00:00', 'ENTRY', 'طابور الصباح والنشيد الوطني', 'تم بنجاح وفق الخطة الصوتية مع عزل الصدى', 20, array['ZONE_A', 'ZONE_B'], true),
('a0000000-0000-0000-0000-000000000001', '08:15:00', 'ENTRY', 'بداية الحصة الأولى', 'تم رن جرس الحصة الأولى لجميع الأقسام', 8, array['ALL'], true),
('a0000000-0000-0000-0000-000000000001', '10:00:00', 'BREAK', 'استراحة الصباح الأولى', 'الحدث التالي القادم - جرس تلقائي + تشغيل الإذاعة', 10, array['ALL'], true),
('a0000000-0000-0000-0000-000000000001', '10:25:00', 'WARNING', 'انتهاء الفسحة وعودة الفصول', 'جرس تنبيه عودة الطلاب إلى القاعات', 6, array['ALL'], true),
('a0000000-0000-0000-0000-000000000001', '12:05:00', 'BREAK', 'أذان الظهر الموحد', 'مقاطعة ذكية - أذان الحرم المكي مع دعاء ما بعد الأذان', 180, array['ALL'], true),
('a0000000-0000-0000-0000-000000000001', '14:30:00', 'EXIT', 'جرس انصراف الطلاب والمغادرة', 'جرس الانصراف الكامل وإخلاء المبنى المدرسي', 15, array['ALL'], true);

-- ج. إدخال فقرات الاستراحة المدرسية التفاعلية
insert into intermission_tracks (session, category, title, speaker_or_artist, duration_seconds, audio_url, play_order, is_active) values
('MORNING_BREAK', 'PROVERB', 'فضل بر الوالدين', 'حكمة اليوم - إلقاء الطالب أحمد المرزوقي', 135, 'https://cdn.smartbell.local/audio/proverb_parents.mp3', 1, true),
('MORNING_BREAK', 'STORY', 'قصة العالم ابن الهيثم', 'محتوى إثرائي علمي - نادي العلوم والابتكار', 230, 'https://cdn.smartbell.local/audio/story_ibn_alhaytham.mp3', 2, true),
('MORNING_BREAK', 'NASHEED', 'نشيد العلم والنور', 'إنشاد كورال المدرسة - نشيد حماسي وتربوي', 270, 'https://cdn.smartbell.local/audio/nasheed_knowledge.mp3', 3, true),
('MORNING_BREAK', 'DUAA', 'أذكار الصباح بصوت ندي وهادئ', 'تلاوة وأذكار صباحية مباركة', 252, 'https://cdn.smartbell.local/audio/morning_adhkar.mp3', 4, true);

-- د. إدخال إعدادات الأذان لمدينة مراكش
insert into adhan_settings (id, city, latitude, longitude, calculation_method, auto_interrupt, audio_url, dua_after_athan) values
(1, 'Marrakech', 31.6295, -7.9811, 'Morocco_Awqaf', true, 'https://cdn.smartbell.local/audio/athan_makkah.mp3', true)
on conflict (id) do update set updated_at = now();

-- هـ. إدخال مناطق توزيع الصوت الأربعة
insert into audio_zones (zone_code, name, description, speaker_count, status, volume, is_muted, allow_morning_broadcast, ip_network) values
('ZONE_A', 'ساحة المدرسة والملاعب الخارجية', '8 مكبرات صوت IP نشطة مع عزل الصدى المفتوح', 8, 'ONLINE', 85, false, true, 'VLAN 20 (192.168.20.10-18)'),
('ZONE_B', 'الممرات الداخلية والمطعم', '12 مكبر صوت سقفي موزع على الطوابق الثلاثة', 12, 'STANDBY', 60, false, true, 'VLAN 20 (192.168.20.20-32)'),
('ZONE_C', 'قاعة الأساتذة والمكاتب الإدارية', '6 مكبرات صوت هادئة مخصصة فقط للأجراس والإشعارات الهامة', 6, 'MUTED', 35, true, false, 'VLAN 20 (192.168.20.40-46)'),
('ZONE_D', 'المصلى المدرسي والملحقات', 'مخصص للأذان والتلاوات القرآنية وخطب صلاة الظهر', 4, 'ONLINE', 90, false, false, 'VLAN 20 (192.168.20.50-54)')
on conflict (zone_code) do nothing;

-- و. إدخال سجلات نظام أولية
insert into system_logs (event_type, description, zone, severity) values
('SYSTEM_BOOT', 'إقلاع خدمة smartbell-daemon.service بنجاح على بوابة Raspberry Pi 5', 'ALL', 'INFO'),
('NTP_SYNC', 'مزامنة التوقيت الدقيقة مع مخدّم NTP الوطني ومؤقت DS3231 RTC بنجاح', 'ALL', 'INFO'),
('SCHEDULE_EXEC', 'رن جرس طابور الصباح والنشيد الوطني في تمام 08:00:00 ص', 'ZONE_A', 'INFO'),
('SCHEDULE_EXEC', 'رن جرس بداية الحصة الأولى في تمام 08:15:00 ص', 'ALL', 'INFO');
