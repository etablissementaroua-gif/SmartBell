-- ============================================================
-- Migration: Smart Timeline & Alarm Engine (v2.5)
-- Purpose: Support Day-of-week selection, Auto-Chaining (Bell -> Intermission Playlist),
-- and Direct Audio broadcast in bell_schedules.
-- ============================================================

-- 1. Ensure columns exist on bell_schedules for forward compatibility
do $$
begin
    if not exists (select 1 from information_schema.columns where table_name = 'bell_schedules' and column_name = 'audio_url') then
        alter table bell_schedules add column audio_url text;
    end if;
end $$;

-- 2. Audit log entry for feature rollout
insert into system_logs (event_type, description, zone, severity)
values (
    'SCHEMA_UPGRADE_V2.5',
    'تفعيل منظومة المنبه والجدولة المتسلسلة الذكية (Smart Timeline & Auto-Chaining) واختيار الأيام المخصصة وبث الاستراحات التلقائي.',
    'ALL',
    'INFO'
);
