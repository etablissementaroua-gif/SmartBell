# 📌 حالة المشروع وتوثيق الإنجاز: منظومة SmartBell

- **تاريخ آخر تحديث:** 2026-10-05
- **المعمارية المعتمدة:** Monorepo - Feature-First (Common Closure Principle - CCP)
- **المستودع الرسمي:** `https://github.com/etablissementaroua-gif/SmartBell.git`
- **بيئة الاستضافة والإنتاج:** [https://smartbell-9ec8b.web.app](https://smartbell-9ec8b.web.app) (Firebase Hosting: `smartbell-9ec8b`)

---

## 🌟 المكونات المكتملة والمحققة (Completed Features)

### 1. النواة السحابية والبيانات (`backend/supabase/migrations/`)
- تم تفعيل ملحق `uuid-ossp` وبناء المخطط الكامل: `20261005000000_smartbell_schema.sql`.
- الجداول الأساسية: `bell_presets`, `bell_schedules`, `intermission_tracks`, `adhan_settings`, `audio_zones`, `live_overrides`, `system_logs`.
- تفعيل اشتراكات `supabase_realtime` للاستماع الفوري للأوامر الصوتية وحالات الطوارئ.
- إدخال بيانات التأسيس (Seed Data) المطابقة للجدول المدرسي وإحداثيات مراكش الفلكية.

### 2. لوحة التحكم المكتبية (`apps/desktop_web/`)
- مبنية بواسطة **React 18 + TypeScript + Vite + Tailwind CSS** بدعم كامل للـ **RTL** وخط **Cairo**.
- **Header:** ساعة رقمية دقيقة، مؤشر نبض عتاد `smartbell-daemon`، وتحكم مستوى الصوت Master، وزر كتم الطوارئ.
- **Sidebar:** ملاحة تفاعلية تضم التبويبات الـ 7 وشارة الإصدار `V2.4`.
- **Live Control Dashboard:**
  - `NowPlayingCard`: محاكي موجات صوتية Waveform وقائمة المقاطع القادمة.
  - `OverridesPanel`: زر الطوارئ العام، أجراس التجاوز الفوري (20 ث، 15 ث، 10 ث)، وبث المايك المباشر مع مؤشر VU تفاعلي ومحدد المناطق.
  - `TimelineCountdown`: عداد تنازلي لحظي للحدث المجدول ومسار تتابعي لليوم الدراسي.
- **الإعدادات والمناطق:** إدارة 4 مناطق بث مستقلة، مؤشرات حرارة وتشغيل Raspberry Pi 5، ومكتبة الوسائط، وإعدادات مواقيت الأذان.
- **الإنتاج:** منشورة حياً عبر Firebase Hosting على الرابط: `https://smartbell-9ec8b.web.app`.

### 3. المشغل والعتاد المحلي (`apps/hardware_client/`)
- بايثون 3.11+ مدمج مع `BackgroundScheduler` (APScheduler) للعمل بدقة الثواني محلياً.
- قدرة العمل بدون إنترنت (Offline-First) بنسبة 100% عبر مزامنة محلية (SQLite Fallback).
- `audio_engine.py`: معالج الأولويات الصوتية (طوارئ > أذان > أجراس > موسيقى استراحة).
- `prayer_times.py`: حساب مواقيت الأذان وفق تقويم وزارة الأوقاف المغربية (إحداثيات مراكش).
- `smartbell-daemon.service`: خدمة تشغيل وإقلاع تلقائي (Systemd).

### 4. تطبيق الهاتف المحمول (`apps/mobile_app/`)
- واجهات فلاتر متوافقة مع هوية SmartBell (`LoginScreen`, `RemoteControllerScreen`, `AppTheme`).

---

## 🚦 المهام الحالية والقادمة (Backlog & Next Steps)
- [x] تشغيل اختبارات التكامل (Smoke & Integration Tests) لمحاكاة انقطاع الإنترنت.
- [x] تفعيل مسار النشر التلقائي عبر GitHub Actions للواجهة والنسخ الاحتياطي لقاعدة البيانات.
- [ ] فحص سجلات أخطاء البناء في Gradle المحتملة على بيئة الهاتف.
