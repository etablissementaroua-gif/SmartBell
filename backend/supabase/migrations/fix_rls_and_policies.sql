-- ==============================================================================
-- SmartBell: Fix RLS Policies for Anon & Authenticated Users
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/mnlmilyymnrhkuulcpfw/sql/new
-- ==============================================================================

-- 1. Enable RLS on all tables
ALTER TABLE IF EXISTS bell_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS intermission_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS adhan_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS audio_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS live_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS system_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS bell_presets ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing conflicting policies if any
DROP POLICY IF EXISTS "Public full access on bell_schedules" ON bell_schedules;
DROP POLICY IF EXISTS "Public full access on intermission_tracks" ON intermission_tracks;
DROP POLICY IF EXISTS "Public full access on adhan_settings" ON adhan_settings;
DROP POLICY IF EXISTS "Public full access on audio_zones" ON audio_zones;
DROP POLICY IF EXISTS "Public full access on live_overrides" ON live_overrides;
DROP POLICY IF EXISTS "Public full access on system_logs" ON system_logs;
DROP POLICY IF EXISTS "Public full access on bell_presets" ON bell_presets;

-- 3. Create permissive policies for SmartBell Desk (anon + authenticated)
CREATE POLICY "Public full access on bell_schedules"
  ON bell_schedules FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public full access on intermission_tracks"
  ON intermission_tracks FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public full access on adhan_settings"
  ON adhan_settings FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public full access on audio_zones"
  ON audio_zones FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public full access on live_overrides"
  ON live_overrides FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public full access on system_logs"
  ON system_logs FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public full access on bell_presets"
  ON bell_presets FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- 4. Ensure initial seed row in adhan_settings
INSERT INTO adhan_settings (id, city, latitude, longitude, calculation_method, auto_interrupt, audio_url, dua_after_athan)
VALUES (1, 'Marrakech', 31.6295, -7.9811, 'Morocco_Awqaf', true, 'https://cdn.smartbell.local/audio/athan_makkah.mp3', true)
ON CONFLICT (id) DO NOTHING;

-- 5. Ensure initial 4 audio zones
INSERT INTO audio_zones (zone_code, name, description, speaker_count, status, volume, is_muted, allow_morning_broadcast, ip_network)
VALUES
  ('ZONE_A', 'الساحة الكبرى والملاعب', 'مكبرات الصوت الخارجية للساحة الرياضية والاصطفاف الصباحي', 8, 'ONLINE', 85, false, true, 'VLAN 20 (192.168.20.10)'),
  ('ZONE_B', 'ممرات الفصول والأجنحة', 'مكبرات الممرات الداخلية للطوابق الثلاثة', 12, 'ONLINE', 70, false, false, 'VLAN 20 (192.168.20.20)'),
  ('ZONE_C', 'الإدارة وقاعة الأساتذة', 'تنبيهات خافتة خاصة بالهيئة الإدارية والتربوية', 4, 'ONLINE', 50, false, false, 'VLAN 20 (192.168.20.30)'),
  ('ZONE_D', 'المسجد والمصلى المدرسي', 'مكبرات مخصصة لمواقيت الصلاة والتوجيه الديني', 4, 'ONLINE', 75, false, false, 'VLAN 20 (192.168.20.40)')
ON CONFLICT (zone_code) DO NOTHING;
