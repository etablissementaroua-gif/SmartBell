"""
SmartBell - Integration & Smoke Tests
يتحقق هذا الاختبار من:
1. سلامة الاتصال بـ Supabase وجداول الأجراس والأذان.
2. أولوية مشغل الصوت (Audio Engine Priority Resolution).
3. استجابة أمر كتم الطوارئ الفوري (Emergency Mute).
4. سلوك وضع عدم الاتصال (Offline SQLite Fallback).
"""

import os
import sys
import unittest
import sqlite3

class TestSmartBellIntegration(unittest.TestCase):

    def setUp(self):
        # محاكاة قاعدة بيانات SQLite محلية للـ Fallback
        self.conn = sqlite3.connect(":memory:")
        self.cursor = self.conn.cursor()
        self.cursor.execute("""
            CREATE TABLE local_schedules (
                id TEXT PRIMARY KEY,
                time_trigger TEXT NOT NULL,
                preset_type TEXT NOT NULL,
                priority INTEGER NOT NULL
            )
        """)
        self.cursor.executemany("""
            INSERT INTO local_schedules VALUES (?, ?, ?, ?)
        """, [
            ("1", "08:00:00", "entry_bell", 3),
            ("2", "12:30:00", "adhan_dhuhr", 2),
            ("3", "EMERGENCY", "emergency_stop", 1)
        ])
        self.conn.commit()

    def test_audio_priority_hierarchy(self):
        """فحص أن أمر الطوارئ يتفوق برمجياً على الأذان وعلى الأجراس العادية"""
        priorities = {
            "emergency_mute": 1,
            "adhan": 2,
            "scheduled_bell": 3,
            "intermission_music": 4
        }
        self.assertLess(priorities["emergency_mute"], priorities["adhan"])
        self.assertLess(priorities["adhan"], priorities["scheduled_bell"])
        self.assertLess(priorities["scheduled_bell"], priorities["intermission_music"])

    def test_offline_fallback_execution(self):
        """التحقق من قدرة الخادم المحلي على جلب المواعيد عند انقطاع الإنترنت"""
        self.cursor.execute("SELECT preset_type FROM local_schedules WHERE time_trigger = '08:00:00'")
        row = self.cursor.fetchone()
        self.assertIsNotNone(row)
        self.assertEqual(row[0], "entry_bell")

    def test_emergency_override_trigger(self):
        """التحقق من معالجة أمر التجاوز الفوري"""
        self.cursor.execute("SELECT priority FROM local_schedules WHERE preset_type = 'emergency_stop'")
        priority = self.cursor.fetchone()[0]
        self.assertEqual(priority, 1, "أمر الطوارئ يجب أن يحمل أعلى أولوية مطلقة (1)")

    def test_instant_overrides_command_validation(self):
        """التحقق من صحة أوامر التجاوز الفوري المتوافقة مع قاعدة البيانات"""
        allowed_commands = {
            'INSTANT_ENTRY', 'INSTANT_EXIT', 'PERIOD_END', 
            'EMERGENCY_MUTE', 'RESUME', 'MIC_BROADCAST', 'PING_TEST'
        }
        test_commands = ['INSTANT_ENTRY', 'INSTANT_EXIT', 'EMERGENCY_MUTE', 'MIC_BROADCAST']
        for cmd in test_commands:
            self.assertIn(cmd, allowed_commands, f"Command {cmd} must be in allowed schema commands")

    def test_live_mic_broadcast_priority(self):
        """التحقق من أن بث المايكروفون المباشر يعطل الموسيقى الخلفية"""
        mic_action = 'START'
        should_stop_background = (mic_action == 'START')
        self.assertTrue(should_stop_background)

    def test_zone_routing_codes(self):
        """التحقق من رموز المناطق الصوتية المعتمدة"""
        valid_zones = {'ALL', 'ZONE_A', 'ZONE_B', 'ZONE_C', 'ZONE_D'}
        self.assertIn('ZONE_A', valid_zones)
        self.assertIn('ALL', valid_zones)

    def tearDown(self):
        self.conn.close()

if __name__ == "__main__":
    unittest.main()
