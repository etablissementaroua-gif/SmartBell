import { BellSchedule, BellActionType, IntermissionTrack, parseScheduleDetails } from '../types';
import { audioPlayerService } from './audioPlayerService';
import { supabaseService } from './supabaseService';

type SchedulerTriggerListener = (schedule: BellSchedule, actionType: BellActionType) => void;

class SmartSchedulerService {
  private static instance: SmartSchedulerService;
  private timer: any = null;
  private schedules: BellSchedule[] = [];
  private tracks: IntermissionTrack[] = [];
  private executedKeys: Set<string> = new Set();
  private triggerListeners: Set<SchedulerTriggerListener> = new Set();
  private isRunning = false;

  private constructor() {
    this.restoreExecutedKeys();
  }

  public static getInstance(): SmartSchedulerService {
    if (!SmartSchedulerService.instance) {
      SmartSchedulerService.instance = new SmartSchedulerService();
    }
    return SmartSchedulerService.instance;
  }

  private restoreExecutedKeys(): void {
    if (typeof window === 'undefined') return;
    try {
      const stored = sessionStorage.getItem('smartbell_executed_alarms');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          this.executedKeys = new Set(parsed);
        }
      }
    } catch (_) {}
  }

  private persistExecutedKeys(): void {
    if (typeof window === 'undefined') return;
    try {
      const arr = Array.from(this.executedKeys).slice(-100);
      sessionStorage.setItem('smartbell_executed_alarms', JSON.stringify(arr));
    } catch (_) {}
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;

    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => {
      this.tick();
    }, 1000);

    // Immediate initial check
    this.tick();
  }

  public stop(): void {
    this.isRunning = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  public setSchedules(schedules: BellSchedule[]): void {
    this.schedules = schedules || [];
  }

  public setTracks(tracks: IntermissionTrack[]): void {
    this.tracks = tracks || [];
  }

  public onTrigger(listener: SchedulerTriggerListener): () => void {
    this.triggerListeners.add(listener);
    return () => {
      this.triggerListeners.delete(listener);
    };
  }

  private notifyTrigger(schedule: BellSchedule, actionType: BellActionType): void {
    this.triggerListeners.forEach((listener) => {
      try {
        listener(schedule, actionType);
      } catch (e) {
        console.error('Error in scheduler trigger listener:', e);
      }
    });
  }

  /**
   * Main scheduler heartbeat - runs every second
   */
  private tick(): void {
    if (!this.schedules || this.schedules.length === 0) return;

    const now = new Date();
    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();
    const currentSeconds = now.getSeconds();
    const currentSecOfDay = currentHours * 3600 + currentMinutes * 60 + currentSeconds;

    // Current Day of Week: Monday=1, Tuesday=2, ..., Saturday=6, Sunday=7
    const currentDayId = now.getDay() === 0 ? 7 : now.getDay();
    const todayDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    for (const schedule of this.schedules) {
      if (!schedule.is_enabled) continue;

      const meta = parseScheduleDetails(schedule.details);

      // 1. Day of week filter check
      const targetDays = schedule.days_of_week && schedule.days_of_week.length > 0 
        ? schedule.days_of_week 
        : (meta.days_of_week && meta.days_of_week.length > 0 ? meta.days_of_week : [1, 2, 3, 4, 5, 6]);
      
      if (!targetDays.includes(currentDayId)) continue;

      // 2. Parse schedule time (supports HH:mm or HH:mm:ss)
      const timeParts = (schedule.bell_time || '00:00').trim().split(':').map(Number);
      const schedHours = timeParts[0] || 0;
      const schedMinutes = timeParts[1] || 0;
      const schedSeconds = timeParts.length > 2 ? (timeParts[2] || 0) : 0;
      const schedSecOfDay = schedHours * 3600 + schedMinutes * 60 + schedSeconds;

      // 3. Execution Key: unique per schedule, date, and minute
      const eventKey = `${schedule.id}_${todayDateStr}_${schedHours}:${schedMinutes}`;
      if (this.executedKeys.has(eventKey)) continue;

      // 4. Flexible Matching Window:
      // Time has reached or passed within the last 59 seconds of the target minute
      const diffSeconds = currentSecOfDay - schedSecOfDay;
      if (diffSeconds >= 0 && diffSeconds <= 59) {
        this.executedKeys.add(eventKey);
        this.persistExecutedKeys();
        this.executeSchedule(schedule);
      }
    }
  }

  /**
   * Executes scheduled event: Audio, Chaining, Realtime Override, and Notifications
   */
  public executeSchedule(schedule: BellSchedule): void {
    const meta = parseScheduleDetails(schedule.details);
    const actionType: BellActionType = schedule.action_type || meta.action_type || 'BELL_ONLY';
    const duration = schedule.duration_seconds || 15;
    const targetZone = schedule.target_zones?.[0] || 'ALL';
    const mediaId = schedule.media_id || meta.media_id;
    const session = schedule.playlist_session || meta.playlist_session || 'MORNING_BREAK';

    console.info(`🔔 [SmartSchedulerService] Auto-Triggering Event: "${schedule.label}" at ${schedule.bell_time} (Action: ${actionType})`);

    // 1. Unlock browser audio
    audioPlayerService.unlockAudio();

    // 2. Execute audio behavior based on Action Type / Athan
    if (schedule.bell_type === 'ATHAN' || schedule.label.includes('أذان')) {
      audioPlayerService.stop(); // Priority 2: Auto-interrupt background audio
      if (actionType === 'DIRECT_AUDIO') {
        const targetTrack = this.tracks.find((t) => t.id === mediaId) ||
          this.tracks.find((t) => (schedule.media_title || meta.media_title) && t.title.includes(schedule.media_title || meta.media_title || '')) ||
          this.tracks.find((t) => t.title.includes('أذان') || t.title.includes('صلاة'));
        if (targetTrack) {
          audioPlayerService.playTrack(targetTrack);
        } else {
          audioPlayerService.playAdhanChime(schedule.label);
        }
      } else {
        audioPlayerService.playAdhanChime(schedule.label);
      }
    } else if (actionType === 'DIRECT_AUDIO') {
      const targetTrack = this.tracks.find((t) => t.id === mediaId) ||
        this.tracks.find((t) => (schedule.media_title || meta.media_title) && t.title.includes(schedule.media_title || meta.media_title || '')) ||
        this.tracks[0];

      if (targetTrack) {
        audioPlayerService.playTrack(targetTrack);
      } else {
        audioPlayerService.playSchoolBellChime(schedule.bell_type, duration);
      }
    } else if (actionType === 'BELL_THEN_PLAYLIST') {
      const sessionTracks = this.tracks.filter((t) => t.session === session && t.is_active);
      audioPlayerService.playBellThenPlaylist(schedule.bell_type, duration, sessionTracks, schedule.label);
    } else {
      // BELL_ONLY (default)
      audioPlayerService.playSchoolBellChime(schedule.bell_type, duration);
    }

    // 3. Synchronize with Supabase Realtime & Hardware Daemon
    const command = schedule.bell_type === 'EXIT'
      ? 'INSTANT_EXIT'
      : schedule.bell_type === 'WARNING'
      ? 'PERIOD_END'
      : 'INSTANT_ENTRY';

    supabaseService.triggerInstantOverride(command, targetZone, {
      bell_name: schedule.label,
      bell_time: schedule.bell_time,
      auto_scheduled: true,
      action_type: actionType,
    });

    // 4. Notify UI listeners (Toasts, NowPlayingCard)
    this.notifyTrigger(schedule, actionType);
  }

  /**
   * Force trigger for testing an alarm schedule instantly
   */
  public forceTestTrigger(scheduleId: string): void {
    const sched = this.schedules.find((s) => s.id === scheduleId);
    if (sched) {
      this.executeSchedule(sched);
    }
  }
}

export const smartSchedulerService = SmartSchedulerService.getInstance();
