# SmartBell (بيل سمارت)
> **"منظومة الأجراس والإذاعة المدرسية الذكية"**  
> *دقة في التوقيت، وإيقاع ينبض بالحياة المدرسية.*

<p align="center">
  <img src="apps/desktop_web/public/assets/smartbell_icon.png" width="160" alt="SmartBell Logo" />
</p>

---

## 📌 نبذة عن المشروع
منظومة **SmartBell** هي الحل الرقمي المتكامل لإدارة جداول الأجراس المدرسية، بث الإذاعة الصباحية، تنظيم برامج الاستراحات التربوية، والتحكم اللحظي بالأجهزة ومكبرات الصوت مع إمكانية العمل التام دون إنترنت (Offline-First عبر Raspberry Pi و DS3231 RTC).

---

## 🏗️ هيكلية المشروع (Monorepo - Feature-First CCP)

```
SmartBell/
├── backend/
│   └── supabase/
│       └── migrations/
│           └── 20261005000000_smartbell_schema.sql  # جداول قاعدة البيانات و Realtime
├── apps/
│   ├── desktop_web/                                 # لوحة تحكم الحاسوب (SmartBell Desk)
│   │   ├── src/features/
│   │   │   ├── live_dashboard/                      # لوحة التحكم اللحظية (3 أعمدة)
│   │   │   ├── bell_scheduler/                      # جدول الأجراس والقوالب
│   │   │   ├── intermission_playlist/               # برمجة فقرات الاستراحة
│   │   │   ├── adhan_settings/                      # إعدادات الأذان والمقاطعة
│   │   │   ├── audio_zones/                         # توزيع الصوت والمناطق الـ 4
│   │   │   ├── media_library/                       # مكتبة الوسائط ورفع الملفات
│   │   │   ├── system_configuration/                # إدارة عتاد Pi 5 وتوزيع الصوت
│   │   │   ├── system_audit_logs/                   # سجل العمليات
│   │   │   └── authentication/                      # تسجيل الدخول الموحد
│   │   └── package.json
│   │
│   ├── mobile_app/                                  # تطبيق الهاتف (SmartBell Controller)
│   │   ├── lib/features/
│   │   │   ├── authentication/                      # شاشة تسجيل الدخول الموحدة
│   │   │   └── live_override/                       # ريموت كنترول للتحكم وصمت الطوارئ
│   │   └── pubspec.yaml
│   │
│   └── hardware_client/                             # المشغل المحلي (smartbell-daemon)
│       ├── systemd/smartbell-daemon.service         # خدمة التشغيل التلقائي مع النظام
│       ├── core/audio_engine.py                     # محرك تشغيل الصوتيات
│       ├── core/prayer_times.py                     # الحساب الفلكي لأذان مراكش
│       ├── main.py                                  # الخادم المحلي و APScheduler
│       └── requirements.txt
```

---

## 🎨 الهوية البصرية المعتمدة (Design Tokens)
- **الخط:** Cairo (دعم كامل للغة العربية RTL).
- **الألوان الأساسية:**
  - `Slate Navy`: `#0F172A`
  - `Dark Slate Card`: `#1E293B`
  - `Electric Teal`: `#0D9488` / `#14B8A6`
  - `Emergency Red`: `#DC2626`
  - `Muted Silver`: `#94A3B8`
  - `Surface Low`: `#EFF4FF` / `#F8FAFC`

---

## 🚀 التشغيل والإعداد

### 1. قاعدة البيانات السحابية (Supabase)
- **Supabase Project URL:** `https://mnlmilyymnrhkuulcpfw.supabase.co`
- قم بتطبيق ملف الهجرة `backend/supabase/migrations/20261005000000_smartbell_schema.sql` عبر لوحة تحكم SQL في Supabase.

### 2. لوحة تحكم الحاسوب (SmartBell Desk)
```bash
cd apps/desktop_web
npm install
npm run dev
```

### 3. خدمة العتاد والمشغل المحلي (Raspberry Pi Daemon)
```bash
cd apps/hardware_client
pip install -r requirements.txt
python main.py
```
لتثبيت الخدمة كـ Systemd daemon:
```bash
sudo cp apps/hardware_client/systemd/smartbell-daemon.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now smartbell-daemon.service
```

### 4. تطبيق الهاتف (Flutter Controller)
```bash
cd apps/mobile_app
flutter pub get
flutter run
```
>>>>>>> 7a58ee3 (feat: complete SmartBell Monorepo with live 3-column dashboard, schema, daemon, and flutter controller)
