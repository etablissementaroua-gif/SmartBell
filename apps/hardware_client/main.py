"""
SmartBell Daemon - Autonomous School Radio and Bell Controller
Runs on Raspberry Pi 5 / Linux with 100% offline capability via DS3231 RTC and local SQLite cache.
Listens to Supabase Realtime for instant overrides and commands.
"""

import os
import sys
import time
import sqlite3
import logging
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
                is_enabled INTEGER DEFAULT 1
            )
        """)
        # Seed default school schedule if empty
        cursor.execute("SELECT COUNT(*) FROM local_schedules")
        if cursor.fetchone()[0] == 0:
            logger.info("Seeding default offline school bell schedules...")
            default_bells = [
                ('1', '08:00', 'ENTRY', 'طابور الصباح والنشيد الوطني', 20, 'ALL', 1),
                ('2', '08:15', 'ENTRY', 'بداية الحصة الأولى', 8, 'ALL', 1),
                ('3', '10:00', 'BREAK', 'استراحة الصباح الأولى', 10, 'ALL', 1),
                ('4', '10:25', 'WARNING', 'انتهاء الفسحة وعودة الفصول', 6, 'ALL', 1),
                ('5', '12:05', 'BREAK', 'أذان الظهر الموحد', 180, 'ALL', 1),
                ('6', '14:30', 'EXIT', 'جرس انصراف الطلاب والمغادرة', 15, 'ALL', 1),
            ]
            cursor.executemany("INSERT INTO local_schedules VALUES (?, ?, ?, ?, ?, ?, ?)", default_bells)
            conn.commit()
        conn.close()

    def sync_schedules_from_cloud(self):
        """Fetches active schedules from Supabase and syncs to local SQLite cache."""
        if not self.supabase_client:
            return

        try:
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
                        1
                    )
                    for item in res.data
                ]
                cursor.executemany("INSERT INTO local_schedules VALUES (?, ?, ?, ?, ?, ?, ?)", records)
                conn.commit()
                conn.close()
                logger.info(f"✅ Synced {len(records)} schedules from Supabase into local SQLite cache.")
        except Exception as e:
            logger.warning(f"⚠️ Could not sync schedules from Supabase ({e}). Operating from offline cache.")

    def load_and_schedule_bells(self):
        """Loads all enabled bell schedules from local cache into APScheduler."""
        self.sync_schedules_from_cloud()

        conn = sqlite3.connect(LOCAL_DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT id, bell_time, bell_type, label, duration_seconds, target_zones FROM local_schedules WHERE is_enabled = 1")
        rows = cursor.fetchall()
        conn.close()

        for row in rows:
            bell_id, bell_time, bell_type, label, duration, zones = row
            hours, minutes = map(int, bell_time.split(':'))
            self.scheduler.add_job(
                self.trigger_scheduled_bell,
                'cron',
                hour=hours,
                minute=minutes,
                second=0,
                id=f"bell_{bell_id}",
                replace_existing=True,
                args=[label, bell_type, duration, zones]
            )
            logger.info(f"Scheduled Bell registered: [{bell_time}] {label} ({duration}s)")

    def trigger_scheduled_bell(self, label: str, bell_type: str, duration: int, zones: str):
        """Triggers local bell with precision."""
        logger.info(f"🔔 [SCHEDULE TRIGGER] Ringing: {label} (Type: {bell_type}, Duration: {duration}s, Zones: {zones})")
        sound_file = os.path.join(SOUNDS_DIR, f"{bell_type.lower()}_bell.mp3")
        self.audio.play_sound(sound_file, priority=AudioPriority.BELL, duration=duration, zone=zones)

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
        logger.info("Starting SmartBell Daemon v2.4 (Production Mode)...")
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
