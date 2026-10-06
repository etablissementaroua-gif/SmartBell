import { supabase, isSupabaseConfigured } from './supabaseClient';
import { 
  AudioZone, 
  BellSchedule, 
  IntermissionTrack, 
  AdhanConfig, 
  SystemAuditLog,
  LiveOverridePayload,
  parseScheduleDetails,
  serializeScheduleDetails
} from '../types';
import { 
  initialAudioZones, 
  initialAdhanConfig 
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

  // 0. Audio Feedback via Web Audio API
  public playLocalBeep(freq = 880, duration = 0.4, type: OscillatorType = 'sine'): void {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
      setTimeout(() => {
        try {
          ctx.close();
        } catch (_) {}
      }, (duration + 0.1) * 1000);
    } catch (e) {
      console.warn('AudioContext not permitted or supported:', e);
    }
  }

  public playSchoolBell(): void {
    this.playLocalBeep(659.25, 0.4, 'sine'); // E5
    setTimeout(() => {
      this.playLocalBeep(523.25, 0.6, 'sine'); // C5
    }, 280);
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
    if (!isSupabaseConfigured()) return [];

    try {
      const { data, error } = await supabase
        .from('bell_schedules')
        .select('*')
        .order('bell_time', { ascending: true });

      if (error) {
        console.warn('⚠️ [SupabaseService] Error fetching bell schedules:', error.message);
        return [];
      }

      if (!data || data.length === 0) {
        return [];
      }

      return data.map((s) => {
        const meta = parseScheduleDetails(s.details);
        return {
          id: s.id,
          preset_id: s.preset_id || 'preset-1',
          bell_time: s.bell_time,
          bell_type: s.bell_type,
          label: s.label,
          details: meta.description || s.details || '',
          duration_seconds: s.duration_seconds || 10,
          target_zones: Array.isArray(s.target_zones)
            ? s.target_zones
            : (typeof s.target_zones === 'string' ? s.target_zones.split(',') : ['ALL']),
          is_enabled: Boolean(s.is_enabled),
          audio_url: s.audio_url || meta.media_id || '',
          days_of_week: meta.days_of_week,
          action_type: meta.action_type,
          media_id: meta.media_id,
          media_title: meta.media_title,
          playlist_session: meta.playlist_session,
        };
      });
    } catch (err) {
      console.error('❌ [SupabaseService] Error fetching bell schedules:', err);
      return [];
    }
  }

  // 3. Fetch Intermission Tracks
  public async fetchIntermissionTracks(): Promise<IntermissionTrack[]> {
    if (!isSupabaseConfigured()) return [];

    try {
      const { data, error } = await supabase
        .from('intermission_tracks')
        .select('*')
        .order('play_order', { ascending: true });

      if (error) {
        console.warn('⚠️ [SupabaseService] Error fetching tracks:', error.message);
        return [];
      }

      if (!data || data.length === 0) {
        return [];
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
      return [];
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
        .maybeSingle();

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
    if (!isSupabaseConfigured()) return [];

    try {
      const { data, error } = await supabase
        .from('system_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error || !data || data.length === 0) {
        return [];
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
      return [];
    }
  }

  // 6. Realtime Subscriptions
  public subscribeToSystemLogs(onChange: (logs: SystemAuditLog[]) => void) {
    if (!isSupabaseConfigured()) return () => {};

    const channel = supabase
      .channel('public:system_logs')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'system_logs' },
        async () => {
          const fresh = await this.fetchSystemLogs();
          onChange(fresh);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

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
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(schedule.preset_id || '');
      let validPresetId: string | null = isUuid ? schedule.preset_id : null;

      if (!validPresetId) {
        const { data: presetData } = await supabase.from('bell_presets').select('id').limit(1);
        if (presetData && presetData.length > 0) {
          validPresetId = presetData[0].id;
        }
      }

      const meta = serializeScheduleDetails({
        days_of_week: schedule.days_of_week || [1, 2, 3, 4, 5, 6],
        action_type: schedule.action_type || 'BELL_ONLY',
        media_id: schedule.media_id,
        media_title: schedule.media_title,
        playlist_session: schedule.playlist_session,
        description: schedule.details || '',
      });

      const { error } = await supabase.from('bell_schedules').insert({
        preset_id: validPresetId,
        bell_time: schedule.bell_time,
        bell_type: schedule.bell_type,
        label: schedule.label,
        details: meta,
        audio_url: schedule.audio_url || schedule.media_id || null,
        duration_seconds: schedule.duration_seconds,
        target_zones: Array.isArray(schedule.target_zones) ? schedule.target_zones : ['ALL'],
        is_enabled: schedule.is_enabled,
      });

      if (error) {
        console.error('❌ [SupabaseService] Error creating schedule:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('❌ [SupabaseService] Exception creating schedule:', err);
      return false;
    }
  }

  public async updateBellSchedule(id: string, updates: Partial<BellSchedule>): Promise<boolean> {
    try {
      const payload: any = { ...updates };
      delete payload.id;

      if (updates.days_of_week || updates.action_type || updates.media_id || updates.playlist_session || updates.details) {
        payload.details = serializeScheduleDetails({
          days_of_week: updates.days_of_week || [1, 2, 3, 4, 5, 6],
          action_type: updates.action_type || 'BELL_ONLY',
          media_id: updates.media_id,
          media_title: updates.media_title,
          playlist_session: updates.playlist_session,
          description: updates.details || '',
        });
      }

      // Remove virtual/extended fields not present as separate DB columns
      delete payload.days_of_week;
      delete payload.action_type;
      delete payload.media_id;
      delete payload.media_title;
      delete payload.playlist_session;

      const { error } = await supabase
        .from('bell_schedules')
        .update(payload)
        .eq('id', id);

      if (error) {
        console.error('❌ [SupabaseService] Error updating schedule:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('❌ [SupabaseService] Exception updating schedule:', err);
      return false;
    }
  }

  public async deleteBellSchedule(scheduleId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('bell_schedules')
        .delete()
        .eq('id', scheduleId);

      if (error) {
        console.error('❌ [SupabaseService] Error deleting schedule:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('❌ [SupabaseService] Exception deleting schedule:', err);
      return false;
    }
  }

  public async createIntermissionTrack(
    track: Omit<IntermissionTrack, 'id' | 'duration_formatted'>
  ): Promise<IntermissionTrack | null> {
    try {
      const { data, error } = await supabase.from('intermission_tracks').insert({
        session: track.session,
        category: track.category,
        title: track.title,
        speaker_or_artist: track.speaker_or_artist,
        duration_seconds: track.duration_seconds || 120,
        audio_url: track.audio_url || 'https://cdn.smartbell.local/audio/custom_track.mp3',
        play_order: track.play_order || 1,
        is_active: track.is_active ?? true,
      }).select().single();

      if (error) {
        console.error('❌ [SupabaseService] Error creating intermission track:', error);
        return null;
      }
      return data as IntermissionTrack;
    } catch (err) {
      console.error('❌ [SupabaseService] Exception creating intermission track:', err);
      return null;
    }
  }

  public async updateIntermissionTrack(id: string, updates: Partial<IntermissionTrack>): Promise<boolean> {
    try {
      const payload: any = { ...updates };
      delete payload.id;
      delete payload.duration_formatted;
      const { error } = await supabase
        .from('intermission_tracks')
        .update(payload)
        .eq('id', id);

      if (error) {
        console.error('❌ [SupabaseService] Error updating track:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('❌ [SupabaseService] Exception updating track:', err);
      return false;
    }
  }

  public async reorderIntermissionTracks(orderedIds: string[]): Promise<boolean> {
    try {
      const updates = orderedIds.map((id, index) =>
        supabase.from('intermission_tracks').update({ play_order: index + 1 }).eq('id', id)
      );
      await Promise.all(updates);
      return true;
    } catch (err) {
      console.error('❌ [SupabaseService] Error reordering tracks:', err);
      return false;
    }
  }

  public async deleteIntermissionTrack(trackId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('intermission_tracks')
        .delete()
        .eq('id', trackId);

      if (error) {
        console.error('❌ [SupabaseService] Error deleting intermission track:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.error('❌ [SupabaseService] Exception deleting intermission track:', err);
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
        .upsert(
          {
            id: 1,
            ...settings,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        );

      if (error) {
        console.error('❌ [SupabaseService] Error upserting adhan settings:', error);
        return false;
      }
      return true;
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
    // Play local audio chime feedback immediately in browser
    this.playLocalBeep(880, 0.4);
    setTimeout(() => this.playLocalBeep(1174.66, 0.5), 200);

    return this.triggerInstantOverride('PING_TEST', 'ALL', {
      timestamp: new Date().toISOString(),
      action: 'PING',
    });
  }
}

export const supabaseService = SupabaseService.getInstance();
