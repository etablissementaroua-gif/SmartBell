import { supabase, isSupabaseConfigured } from './supabaseClient';
import { 
  AudioZone, 
  BellSchedule, 
  IntermissionTrack, 
  AdhanConfig, 
  SystemAuditLog,
  LiveOverridePayload 
} from '../types';
import { 
  initialAudioZones, 
  initialBellSchedules, 
  initialIntermissionTracks, 
  initialAdhanConfig, 
  initialLogs 
} from './mockData';

const formatSeconds = (sec: number): string => {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

export class SupabaseService {
  private static instance: SupabaseService;
  private constructor() {}

  public static getInstance(): SupabaseService {
    if (!SupabaseService.instance) {
      SupabaseService.instance = new SupabaseService();
    }
    return SupabaseService.instance;
  }

  // 1. Fetch Audio Zones
  public async fetchAudioZones(): Promise<AudioZone[]> {
    if (!isSupabaseConfigured()) return initialAudioZones;

    try {
      const { data, error } = await supabase
        .from('audio_zones')
        .select('*')
        .order('zone_code', { ascending: true });

      if (error || !data || data.length === 0) {
        console.warn('⚠️ [SupabaseService] Falling back to mock audio zones:', error?.message);
        return initialAudioZones;
      }

      return data.map((z) => ({
        id: z.id,
        zone_code: z.zone_code,
        name: z.name,
        description: z.description || '',
        speaker_count: z.speaker_count || 4,
        status: (z.status as 'ONLINE' | 'STANDBY' | 'MUTED') || 'ONLINE',
        volume: z.volume ?? 75,
        is_muted: Boolean(z.is_muted),
        allow_morning_broadcast: Boolean(z.allow_morning_broadcast),
        ip_network: z.ip_network || 'VLAN 20',
      }));
    } catch (err) {
      console.error('❌ [SupabaseService] Error fetching audio zones:', err);
      return initialAudioZones;
    }
  }

  // 2. Fetch Bell Schedules
  public async fetchBellSchedules(): Promise<BellSchedule[]> {
    if (!isSupabaseConfigured()) return initialBellSchedules;

    try {
      const { data, error } = await supabase
        .from('bell_schedules')
        .select('*')
        .order('bell_time', { ascending: true });

      if (error || !data || data.length === 0) {
        return initialBellSchedules;
      }

      return data.map((s) => ({
        id: s.id,
        preset_id: s.preset_id || 'preset-1',
        bell_time: s.bell_time,
        bell_type: s.bell_type,
        label: s.label,
        duration_seconds: s.duration_seconds || 10,
        target_zones: typeof s.target_zones === 'string' ? s.target_zones.split(',') : (s.target_zones || ['ALL']),
        is_enabled: Boolean(s.is_enabled),
      }));
    } catch (err) {
      console.error('❌ [SupabaseService] Error fetching bell schedules:', err);
      return initialBellSchedules;
    }
  }

  // 3. Fetch Intermission Tracks
  public async fetchIntermissionTracks(): Promise<IntermissionTrack[]> {
    if (!isSupabaseConfigured()) return initialIntermissionTracks;

    try {
      const { data, error } = await supabase
        .from('intermission_tracks')
        .select('*')
        .order('play_order', { ascending: true });

      if (error || !data || data.length === 0) {
        return initialIntermissionTracks;
      }

      return data.map((t) => ({
        id: t.id,
        session: t.session,
        category: t.category,
        title: t.title,
        speaker_or_artist: t.speaker_or_artist,
        duration_seconds: t.duration_seconds || 120,
        duration_formatted: formatSeconds(t.duration_seconds || 120),
        audio_url: t.audio_url || '',
        play_order: t.play_order || 1,
        is_active: Boolean(t.is_active),
      }));
    } catch (err) {
      console.error('❌ [SupabaseService] Error fetching tracks:', err);
      return initialIntermissionTracks;
    }
  }

  // 4. Fetch Adhan Settings
  public async fetchAdhanSettings(): Promise<AdhanConfig> {
    if (!isSupabaseConfigured()) return initialAdhanConfig;

    try {
      const { data, error } = await supabase
        .from('adhan_settings')
        .select('*')
        .eq('id', 1)
        .single();

      if (error || !data) {
        return initialAdhanConfig;
      }

      return {
        city: data.city || 'Marrakech',
        latitude: Number(data.latitude) || 31.6295,
        longitude: Number(data.longitude) || -7.9811,
        calculation_method: data.calculation_method || 'Morocco_Awqaf',
        auto_interrupt: Boolean(data.auto_interrupt),
        audio_url: data.audio_url || 'https://cdn.smartbell.local/audio/athan_makkah.mp3',
        dua_after_athan: Boolean(data.dua_after_athan),
      };
    } catch (err) {
      console.error('❌ [SupabaseService] Error fetching adhan settings:', err);
      return initialAdhanConfig;
    }
  }

  // 5. Fetch System Logs
  public async fetchSystemLogs(): Promise<SystemAuditLog[]> {
    if (!isSupabaseConfigured()) return initialLogs;

    try {
      const { data, error } = await supabase
        .from('system_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error || !data || data.length === 0) {
        return initialLogs;
      }

      return data.map((l) => ({
        id: l.id,
        event_type: l.event_type,
        description: l.description,
        zone: l.zone || 'ALL',
        severity: (l.severity as 'INFO' | 'WARNING' | 'CRITICAL') || 'INFO',
        created_at: new Date(l.created_at).toLocaleTimeString('ar-MA', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
      }));
    } catch (err) {
      console.error('❌ [SupabaseService] Error fetching system logs:', err);
      return initialLogs;
    }
  }

  // 6. Realtime Subscriptions
  public subscribeToAudioZones(onChange: (zones: AudioZone[]) => void) {
    if (!isSupabaseConfigured()) return () => {};

    const channel = supabase
      .channel('public:audio_zones')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'audio_zones' },
        async () => {
          const fresh = await this.fetchAudioZones();
          onChange(fresh);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  public subscribeToLiveOverrides(onOverride: (override: any) => void) {
    if (!isSupabaseConfigured()) return () => {};

    const channel = supabase
      .channel('public:live_overrides')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'live_overrides' },
        (payload) => {
          onOverride(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  // 7. Mutations
  public async triggerInstantOverride(
    command: LiveOverridePayload['command'],
    targetZone: string = 'ALL',
    payload: Record<string, any> = {}
  ): Promise<boolean> {
    try {
      const { error } = await supabase.from('live_overrides').insert({
        command,
        target_zone: targetZone,
        initiator: 'المشرف الإذاعي (لوحة الويب)',
        payload,
        is_executed: false,
      });

      if (error) {
        console.error('❌ [SupabaseService] Failed to insert live override:', error);
        return false;
      }

      // Log action to system_logs
      await supabase.from('system_logs').insert({
        event_type: `تجاوز يدوي: ${command}`,
        description: `تم إطلاق أمر [${command}] على نطاق: ${targetZone}`,
        zone: targetZone,
        severity: command === 'EMERGENCY_MUTE' ? 'CRITICAL' : 'INFO',
      });

      return true;
    } catch (err) {
      console.error('❌ [SupabaseService] Error triggering override:', err);
      return false;
    }
  }

  public async setEmergencyMute(isMuted: boolean): Promise<boolean> {
    return this.triggerInstantOverride(isMuted ? 'EMERGENCY_MUTE' : 'RESUME', 'ALL', {
      timestamp: new Date().toISOString(),
    });
  }

  public async updateZoneVolume(zoneCode: string, volume: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('audio_zones')
        .update({ volume, updated_at: new Date().toISOString() })
        .eq('zone_code', zoneCode);

      if (error) {
        console.error('❌ [SupabaseService] Error updating zone volume:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('❌ [SupabaseService] Exception updating volume:', err);
      return false;
    }
  }

  public async toggleZoneMute(zoneCode: string, isMuted: boolean): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('audio_zones')
        .update({ is_muted: isMuted, updated_at: new Date().toISOString() })
        .eq('zone_code', zoneCode);

      if (error) {
        console.error('❌ [SupabaseService] Error toggling zone mute:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('❌ [SupabaseService] Exception toggling zone mute:', err);
      return false;
    }
  }

  public async updateMasterVolume(volume: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('audio_zones')
        .update({ volume, updated_at: new Date().toISOString() })
        .neq('id', '00000000-0000-0000-0000-000000000000'); // update all zones

      await this.triggerInstantOverride('PING_TEST', 'ALL', {
        action: 'SET_VOLUME',
        volume,
      });

      return !error;
    } catch (err) {
      console.error('❌ [SupabaseService] Error updating master volume:', err);
      return false;
    }
  }

  public async toggleBellSchedule(scheduleId: string, isEnabled: boolean): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('bell_schedules')
        .update({ is_enabled: isEnabled })
        .eq('id', scheduleId);

      return !error;
    } catch (err) {
      console.error('❌ [SupabaseService] Error toggling schedule:', err);
      return false;
    }
  }

  public async createBellSchedule(schedule: Omit<BellSchedule, 'id'>): Promise<boolean> {
    try {
      const { error } = await supabase.from('bell_schedules').insert({
        preset_id: schedule.preset_id,
        bell_time: schedule.bell_time,
        bell_type: schedule.bell_type,
        label: schedule.label,
        duration_seconds: schedule.duration_seconds,
        target_zones: schedule.target_zones.join(','),
        is_enabled: schedule.is_enabled,
      });

      return !error;
    } catch (err) {
      console.error('❌ [SupabaseService] Error creating schedule:', err);
      return false;
    }
  }

  public async deleteBellSchedule(scheduleId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('bell_schedules')
        .delete()
        .eq('id', scheduleId);

      return !error;
    } catch (err) {
      console.error('❌ [SupabaseService] Error deleting schedule:', err);
      return false;
    }
  }

  public async toggleIntermissionTrack(trackId: string, isActive: boolean): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('intermission_tracks')
        .update({ is_active: isActive })
        .eq('id', trackId);

      return !error;
    } catch (err) {
      console.error('❌ [SupabaseService] Error toggling track:', err);
      return false;
    }
  }

  public async saveAdhanSettings(settings: Partial<AdhanConfig>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('adhan_settings')
        .update({
          ...settings,
          updated_at: new Date().toISOString(),
        })
        .eq('id', 1);

      return !error;
    } catch (err) {
      console.error('❌ [SupabaseService] Error saving adhan settings:', err);
      return false;
    }
  }

  public async sendMediaControl(action: 'PLAY' | 'PAUSE' | 'NEXT' | 'PREV', track?: any): Promise<boolean> {
    return this.triggerInstantOverride('MIC_BROADCAST', 'ALL', {
      action: `MEDIA_${action}`,
      track_id: track?.id,
      title: track?.title,
    });
  }

  public async sendPingTest(): Promise<boolean> {
    return this.triggerInstantOverride('PING_TEST', 'ALL', {
      timestamp: new Date().toISOString(),
      action: 'PING',
    });
  }
}

export const supabaseService = SupabaseService.getInstance();
