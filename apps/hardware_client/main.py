"""
SmartBell Daemon - Autonomous School Radio and Smart Timeline Engine
Runs on Raspberry Pi 5 / Linux with 100% offline capability via DS3231 RTC and local SQLite cache.
Listens to Supabase Realtime for instant overrides and executes chained school bell & intermission playlists.
"""

import os
import sys
import time
import json
import sqlite3
import logging
import threading
from datetime import datetime
from apscheduler.schedulers.background import BackgroundScheduler
from core.audio_engine import AudioEngine, AudioPriority
from core.prayer_times import PrayerTimesCalculator

# Logging setup
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [SmartBellDaemon] %(message)s"
)
logger = logging.getLogger("SmartBellDaemon")

# Configuration
SUPABASE_URL = os.getenv("SMARTBELL_SUPABASE_URL", "https://mnlmilyymnrhkuulcpfw.supabase.co")
SUPABASE_KEY = os.getenv("SMARTBELL_SERVICE_KEY", "dummy_service_role_key")
LOCAL_DB_PATH = os.path.join(os.path.dirname(__file__), "smartbell_local.db")
SOUNDS_DIR = os.path.join(os.path.dirname(__file__), "sounds")

os.makedirs(SOUNDS_DIR, exist_ok=True)

# 1 = Monday, 2 = Tuesday, 3 = Wednesday, 4 = Thursday, 5 = Friday, 6 = Saturday, 7 = Sunday
DAY_MAP = {1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri', 6: 'sat', 7: 'sun'}

class SmartBellDaemon:
    def __init__(self):
        self.audio = AudioEngine()
        self.scheduler = BackgroundScheduler()
        self.prayer_calc = PrayerTimesCalculator()
        self.supabase_client = None
        self.init_supabase()
        self.init_local_db()

    def init_supabase(self):
        """Initializes client connection to Supabase if available."""
        try:
            from supabase import create_client
            self.supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
            logger.info("Supabase client initialized successfully.")
        except Exception as e:
            logger.warning(f"Could not initialize Supabase client ({e}). Offline fallback engaged.")

    def init_local_db(self):
        """Initializes local SQLite database for 100% offline caching."""
        conn = sqlite3.connect(LOCAL_DB_PATH)
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS local_schedules (
                id TEXT PRIMARY KEY,
                bell_time TEXT NOT NULL,
                bell_type TEXT NOT NULL,
                label TEXT NOT NULL,
                duration_seconds INTEGER DEFAULT 10,
                target_zones TEXT DEFAULT 'ALL',
                is_enabled INTEGER DEFAULT 1,
                details TEXT DEFAULT '',
                audio_url TEXT DEFAULT ''
            )
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS local_intermission_tracks (
                id TEXT PRIMARY KEY,
                session TEXT NOT NULL,
                category TEXT NOT NULL,
                title TEXT NOT NULL,
                speaker_or_artist TEXT,
                duration_seconds INTEGER DEFAULT 120,
                audio_url TEXT NOT NULL,
                play_order INTEGER DEFAULT 1,
                is_active INTEGER DEFAULT 1
            )
        """)

        # Check existing columns in case of old DB file
        cursor.execute("PRAGMA table_info(local_schedules)")
        cols = [row[1] for row in cursor.fetchall()]
        if 'details' not in cols:
            cursor.execute("ALTER TABLE local_schedules ADD COLUMN details TEXT DEFAULT ''")
        if 'audio_url' not in cols:
            cursor.execute("ALTER TABLE local_schedules ADD COLUMN audio_url TEXT DEFAULT ''")

        # Seed default school schedule if empty
        cursor.execute("SELECT COUNT(*) FROM local_schedules")
        if cursor.fetchone()[0] == 0:
            logger.info("Seeding default offline school bell schedules...")
            default_bells = [
                ('1', '07:55', 'ENTRY', 'طابور الصباح والنشيد الوطني', 20, 'ALL', 1, json.dumps({'days_of_week': [1], 'action_type': 'DIRECT_AUDIO', 'media_title': 'النشيد الوطني'}), ''),
                ('2', '08:00', 'ENTRY', 'بداية الحصة الأولى', 10, 'ALL', 1, json.dumps({'days_of_week': [1, 2, 3, 4, 5, 6], 'action_type': 'BELL_ONLY'}), ''),
                ('3', '10:00', 'BREAK', 'بداية الاستراحة الأولى', 15, 'ALL', 1, json.dumps({'days_of_week': [1, 2, 3, 4, 5, 6], 'action_type': 'BELL_THEN_PLAYLIST', 'playlist_session': 'MORNING_BREAK'}), ''),
                ('4', '10:25', 'WARNING', 'انتهاء الفسحة وعودة الفصول', 6, 'ALL', 1, json.dumps({'days_of_week': [1, 2, 3, 4, 5, 6], 'action_type': 'BELL_ONLY'}), ''),
                ('5', '12:05', 'BREAK', 'استراحة الظهيرة وأذان الظهر', 15, 'ALL', 1, json.dumps({'days_of_week': [1, 2, 3, 4, 5, 6], 'action_type': 'BELL_THEN_PLAYLIST', 'playlist_session': 'NOON_BREAK'}), ''),
                ('6', '16:30', 'EXIT', 'جرس انصراف الطلاب والمغادرة', 15, 'ALL', 1, json.dumps({'days_of_week': [1, 2, 3, 4, 5, 6], 'action_type': 'BELL_ONLY'}), ''),
            ]
            cursor.executemany("INSERT INTO local_schedules VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", default_bells)
            conn.commit()
        conn.close()

    def sync_schedules_from_cloud(self):
        """Fetches active schedules and tracks from Supabase and syncs to local SQLite cache."""
        if not self.supabase_client:
            return

        try:
            # Sync Bell Schedules
            res = self.supabase_client.from('bell_schedules').select('*').eq('is_enabled', True).execute()
            if res.data and len(res.data) > 0:
                conn = sqlite3.connect(LOCAL_DB_PATH)
                cursor = conn.cursor()
                cursor.execute("DELETE FROM local_schedules")
                records = [
                    (
                        item['id'],
                        item['bell_time'],
                        item['bell_type'],
                        item['label'],
                        item.get('duration_seconds', 10),
                        str(item.get('target_zones', 'ALL')),
                        1,
                        item.get('details', '') or '',
                        item.get('audio_url', '') or ''
                    )
                    for item in res.data
                ]
                cursor.executemany("INSERT INTO local_schedules VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", records)
                conn.commit()
                conn.close()
                logger.info(f"✅ Synced {len(records)} schedules from Supabase into local SQLite cache.")

            # Sync Intermission Tracks
            res_tracks = self.supabase_client.from('intermission_tracks').select('*').eq('is_active', True).execute()
            if res_tracks.data and len(res_tracks.data) > 0:
                conn = sqlite3.connect(LOCAL_DB_PATH)
                cursor = conn.cursor()
                cursor.execute("DELETE FROM local_intermission_tracks")
                track_records = [
                    (
                        t['id'],
                        t['session'],
                        t['category'],
                        t['title'],
                        t.get('speaker_or_artist', ''),
                        t.get('duration_seconds', 120),
                        t.get('audio_url', ''),
                        t.get('play_order', 1),
                        1
                    )
                    for t in res_tracks.data
                ]
                cursor.executemany("INSERT INTO local_intermission_tracks VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", track_records)
                conn.commit()
                conn.close()
                logger.info(f"✅ Synced {len(track_records)} intermission tracks into local SQLite cache.")

        except Exception as e:
            logger.warning(f"⚠️ Could not sync schedules from Supabase ({e}). Operating from offline cache.")

    def load_and_schedule_bells(self):
        """Loads all enabled bell schedules from local cache into APScheduler with day-of-week filters."""
        self.sync_schedules_from_cloud()

        conn = sqlite3.connect(LOCAL_DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT id, bell_time, bell_type, label, duration_seconds, target_zones, details, audio_url FROM local_schedules WHERE is_enabled = 1")
        rows = cursor.fetchall()
        conn.close()

        for row in rows:
            bell_id, bell_time, bell_type, label, duration, zones, details, audio_url = row
            time_parts = bell_time.split(':')
            hours = int(time_parts[0])
            minutes = int(time_parts[1])
            seconds = int(time_parts[2]) if len(time_parts) > 2 else 0

            # Parse rich metadata (days_of_week, action_type, playlist_session)
            days_of_week = [1, 2, 3, 4, 5, 6]
            action_type = 'BELL_ONLY'
            playlist_session = 'MORNING_BREAK'

            if details and details.strip().startswith('{'):
                try:
                    meta = json.loads(details)
                    if isinstance(meta.get('days_of_week'), list) and len(meta['days_of_week']) > 0:
                        days_of_week = meta['days_of_week']
                    action_type = meta.get('action_type', 'BELL_ONLY')
                    playlist_session = meta.get('playlist_session', 'MORNING_BREAK')
                except Exception:
                    pass

            # Convert days to APScheduler cron string (e.g. 'mon,tue,wed,thu,fri,sat' or 'mon')
            cron_days = ','.join(DAY_MAP[d] for d in days_of_week if d in DAY_MAP)
            if not cron_days:
                cron_days = 'mon-sat'

            self.scheduler.add_job(
                self.trigger_scheduled_event,
                'cron',
                day_of_week=cron_days,
                hour=hours,
                minute=minutes,
                second=seconds,
                id=f"bell_{bell_id}",
                replace_existing=True,
                args=[label, bell_type, duration, zones, action_type, playlist_session, audio_url]
            )
            logger.info(f"📅 Registered Smart Event: [{bell_time}] '{label}' (Days: {cron_days}, Action: {action_type}, Session: {playlist_session})")

    def trigger_scheduled_event(self, label: str, bell_type: str, duration: int, zones: str, action_type: str = 'BELL_ONLY', playlist_session: str = None, audio_url: str = None):
        """Triggers local smart scheduled event: Bell chime, Chained Intermission Playlist, or Direct Audio."""
        logger.info(f"🔔 [EVENT TRIGGER] Executing: '{label}' [Type: {bell_type}, Action: {action_type}, Duration: {duration}s, Zones: {zones}]")

        # 1. Action: DIRECT_AUDIO (e.g. National Anthem or specific audio track)
        if action_type == 'DIRECT_AUDIO':
            sound_file = audio_url or os.path.join(SOUNDS_DIR, "national_anthem.mp3")
            logger.info(f"🎵 [DIRECT AUDIO] Broadcasting track: {sound_file} to zone: {zones}")
            self.audio.play_sound(sound_file, priority=AudioPriority.BELL, duration=duration or 120, zone=zones)
            return

        # 2. Ring School Bell Chime
        sound_file = os.path.join(SOUNDS_DIR, f"{bell_type.lower()}_bell.mp3")
        self.audio.play_sound(sound_file, priority=AudioPriority.BELL, duration=duration, zone=zones)

        # 3. Action: BELL_THEN_PLAYLIST (Auto-Chaining Intermission Broadcast)
        if action_type == 'BELL_THEN_PLAYLIST':
            logger.info(f"🔗 [CHAINED PLAYLIST] Bell ringing for {duration}s; launching intermission session '{playlist_session}' after chime...")
            def run_chained_playlist():
                time.sleep(duration + 0.5)
                self.play_intermission_session(playlist_session or 'MORNING_BREAK', zones)

            threading.Thread(target=run_chained_playlist, daemon=True).start()

    def play_intermission_session(self, session: str, zones: str):
        """Plays intermission tracks sequentially for the given session."""
        logger.info(f"📻 [INTERMISSION BROADCAST] Starting session '{session}' in zones: {zones}")
        conn = sqlite3.connect(LOCAL_DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT id, title, audio_url, duration_seconds FROM local_intermission_tracks WHERE session = ? AND is_active = 1 ORDER BY play_order ASC", (session,))
        tracks = cursor.fetchall()
        conn.close()

        if not tracks:
            logger.info(f"ℹ️ No local intermission tracks found for session '{session}'.")
            return

        for track in tracks:
            track_id, title, audio_url, duration_sec = track
            if self.audio.is_emergency_muted:
                logger.info("🛑 Emergency mute active, stopping intermission broadcast.")
                break

            logger.info(f"▶️ [INTERMISSION TRACK] Broadcasting: '{title}' ({duration_sec}s)")
            local_sound = audio_url if (audio_url and os.path.exists(audio_url)) else os.path.join(SOUNDS_DIR, "intermission_sample.mp3")
            self.audio.play_sound(local_sound, priority=AudioPriority.BROADCAST, duration=duration_sec, zone=zones)
            time.sleep(min(duration_sec, 300))

    def handle_realtime_override(self, payload: dict):
        """Handles instant override commands received via Supabase Realtime."""
        event = payload.get('new', {})
        command = event.get('command')
        target_zone = event.get('target_zone', 'ALL')
        initiator = event.get('initiator', 'المشرف الإذاعي')
        event_id = event.get('id')

        logger.info(f"⚡ [REALTIME OVERRIDE] Command: {command} from {initiator} on zone {target_zone}")

        if command == 'EMERGENCY_MUTE':
            self.audio.emergency_mute()
        elif command == 'RESUME':
            self.audio.resume_from_emergency()
        elif command == 'INSTANT_ENTRY':
            sound_file = os.path.join(SOUNDS_DIR, "entry_bell.mp3")
            self.audio.play_sound(sound_file, priority=AudioPriority.BELL, duration=20, zone=target_zone)
        elif command == 'INSTANT_EXIT':
            sound_file = os.path.join(SOUNDS_DIR, "exit_bell.mp3")
            self.audio.play_sound(sound_file, priority=AudioPriority.BELL, duration=15, zone=target_zone)
        elif command == 'PERIOD_END':
            sound_file = os.path.join(SOUNDS_DIR, "warning_bell.mp3")
            self.audio.play_sound(sound_file, priority=AudioPriority.BELL, duration=10, zone=target_zone)
        elif command == 'MIC_BROADCAST':
            action = payload.get('new', {}).get('payload', {}).get('action', 'START')
            if action == 'START':
                logger.info(f"🎙️ [LIVE MIC] Live microphone stream opened to amplifier zone: {target_zone}")
                self.audio.stop_all()
            else:
                logger.info(f"🛑 [LIVE MIC] Live microphone stream closed on zone: {target_zone}")
        elif command == 'PING_TEST':
            payload_data = payload.get('new', {}).get('payload', {})
            if payload_data.get('action') == 'SET_VOLUME':
                new_vol = float(payload_data.get('volume', 75)) / 100.0
                self.audio.master_volume = new_vol
                logger.info(f"🔊 [VOLUME] Amplifier master volume adjusted to {int(new_vol * 100)}%")
            else:
                logger.info(f"🏓 [PING_TEST] Hardware ping received from {initiator} - Daemon is responsive.")

        # Update execution status in Supabase if client is active
        if event_id and self.supabase_client:
            try:
                self.supabase_client.from('live_overrides').update({'is_executed': True}).eq('id', event_id).execute()
                self.supabase_client.from('system_logs').insert({
                    'event_type': f'EXEC_{command}',
                    'description': f'تم تنفيذ أمر {command} بنجاح على عتاد المدرسة في منطقة {target_zone}',
                    'zone': target_zone,
                    'severity': 'INFO' if command != 'EMERGENCY_MUTE' else 'CRITICAL'
                }).execute()
            except Exception as e:
                logger.warning(f"Could not report execution status to Supabase: {e}")

    def start_realtime_listener(self):
        """Connects to Supabase Realtime channel if credentials exist."""
        if not self.supabase_client:
            logger.warning("Supabase client not active. Daemon running in offline standalone mode.")
            return

        try:
            self.supabase_client.channel('public:live_overrides') \
                .on_postgres_changes(event='INSERT', schema='public', table='live_overrides', callback=self.handle_realtime_override) \
                .subscribe()
            logger.info("Connected to Supabase Realtime channel 'public:live_overrides'.")
        except Exception as e:
            logger.warning(f"Could not connect to Supabase Realtime ({e}). Running in offline standalone mode.")

    def run(self):
        logger.info("Starting SmartBell Daemon v2.5 (Smart Timeline & Auto-Chaining Mode)...")
        self.load_and_schedule_bells()
        self.scheduler.start()
        self.start_realtime_listener()
        logger.info("SmartBell Daemon is now active and operational.")

        try:
            while True:
                time.sleep(1)
        except (KeyboardInterrupt, SystemExit):
            logger.info("Shutting down daemon...")
            self.scheduler.shutdown()
            self.audio.stop_all()

if __name__ == '__main__':
    daemon = SmartBellDaemon()
    daemon.run()
