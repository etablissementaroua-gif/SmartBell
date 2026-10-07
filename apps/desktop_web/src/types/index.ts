export type TabType = 
  | 'live-control-dashboard'
  | 'bell-schedules'
  | 'break-programming'
  | 'athan-settings'
  | 'media-library'
  | 'system-audit-logs'
  | 'system-configuration';

export type BellType = 'ENTRY' | 'EXIT' | 'WARNING' | 'BREAK' | 'ATHAN';

export type BellActionType = 'BELL_ONLY' | 'BELL_THEN_PLAYLIST' | 'DIRECT_AUDIO';

export interface SchoolDayOption {
  id: number; // 1 = Monday, 2 = Tuesday, 3 = Wednesday, 4 = Thursday, 5 = Friday, 6 = Saturday
  name: string;
  short: string;
}

export const SCHOOL_DAYS: SchoolDayOption[] = [
  { id: 1, name: 'الإثنين', short: 'ن' },
  { id: 2, name: 'الثلاثاء', short: 'ث' },
  { id: 3, name: 'الأربعاء', short: 'ر' },
  { id: 4, name: 'الخميس', short: 'خ' },
  { id: 5, name: 'الجمعة', short: 'ج' },
  { id: 6, name: 'السبت', short: 'س' },
];

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
  audio_url?: string;

  // Smart Timeline & Alarm Engine Fields:
  days_of_week?: number[]; // [1, 2, 3, 4, 5, 6] (1=Monday ... 6=Saturday)
  action_type?: BellActionType; // 'BELL_ONLY' | 'BELL_THEN_PLAYLIST' | 'DIRECT_AUDIO'
  media_id?: string;
  media_title?: string;
  playlist_session?: 'MORNING_BREAK' | 'NOON_BREAK';
}

export interface ScheduleMetadataPayload {
  days_of_week: number[];
  action_type: BellActionType;
  media_id?: string;
  media_title?: string;
  playlist_session?: 'MORNING_BREAK' | 'NOON_BREAK';
  description?: string;
}

export function parseScheduleDetails(detailsStr?: string): ScheduleMetadataPayload {
  if (!detailsStr) {
    return {
      days_of_week: [1, 2, 3, 4, 5, 6],
      action_type: 'BELL_ONLY',
      description: '',
    };
  }
  try {
    if (detailsStr.trim().startsWith('{')) {
      const parsed = JSON.parse(detailsStr);
      return {
        days_of_week: Array.isArray(parsed.days_of_week) && parsed.days_of_week.length > 0 
          ? parsed.days_of_week 
          : [1, 2, 3, 4, 5, 6],
        action_type: parsed.action_type || 'BELL_ONLY',
        media_id: parsed.media_id,
        media_title: parsed.media_title,
        playlist_session: parsed.playlist_session,
        description: parsed.description || '',
      };
    }
  } catch (_) {}
  return {
    days_of_week: [1, 2, 3, 4, 5, 6],
    action_type: 'BELL_ONLY',
    description: detailsStr,
  };
}

export function serializeScheduleDetails(data: ScheduleMetadataPayload): string {
  return JSON.stringify(data);
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
