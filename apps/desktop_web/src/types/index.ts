export type TabType = 
  | 'live-control-dashboard'
  | 'bell-schedules'
  | 'break-programming'
  | 'athan-settings'
  | 'media-library'
  | 'system-audit-logs'
  | 'system-configuration';

export type BellType = 'ENTRY' | 'EXIT' | 'WARNING' | 'BREAK';

export interface BellSchedule {
  id: string;
  preset_id: string;
  bell_time: string;
  bell_type: BellType;
  label: string;
  details?: string;
  duration_seconds: number;
  target_zones: string[];
  is_enabled: boolean;
}

export interface IntermissionTrack {
  id: string;
  session: 'MORNING_BREAK' | 'NOON_BREAK';
  category: 'PROVERB' | 'STORY' | 'NASHEED' | 'DUAA' | 'QURAN';
  title: string;
  speaker_or_artist?: string;
  duration_seconds: number;
  duration_formatted: string;
  audio_url: string;
  play_order: number;
  is_active: boolean;
}

export interface AudioZone {
  id: string;
  zone_code: string;
  name: string;
  description: string;
  speaker_count: number;
  status: 'ONLINE' | 'STANDBY' | 'MUTED';
  volume: number;
  is_muted: boolean;
  allow_morning_broadcast: boolean;
  ip_network: string;
}

export interface AdhanConfig {
  city: string;
  latitude: number;
  longitude: number;
  calculation_method: string;
  auto_interrupt: boolean;
  audio_url: string;
  dua_after_athan: boolean;
}

export interface SystemAuditLog {
  id: string;
  event_type: string;
  description: string;
  zone: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  created_at: string;
}

export interface LiveOverridePayload {
  command: 'INSTANT_ENTRY' | 'INSTANT_EXIT' | 'PERIOD_END' | 'EMERGENCY_MUTE' | 'RESUME' | 'MIC_BROADCAST' | 'PING_TEST';
  target_zone?: string;
  initiator?: string;
}
