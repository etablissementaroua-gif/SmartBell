"""
SmartBell Audio Engine
Handles local audio output, priority queuing, and multi-zone routing on Linux / Raspberry Pi.
Priority Levels:
  1: EMERGENCY (Stops all sound, cannot be ducked)
  2: ADHAN (Interrupts background music / morning radio)
  3: BELL (Short chime, entry/exit bell)
  4: BROADCAST / PLAYLIST (Background radio, intermission music)
"""

import os
import time
import logging

try:
    import pygame
    PYGAME_AVAILABLE = True
except ImportError:
    PYGAME_AVAILABLE = False

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("SmartBellAudioEngine")

class AudioPriority:
    EMERGENCY = 1
    ADHAN = 2
    BELL = 3
    BROADCAST = 4

class AudioEngine:
    def __init__(self):
        self.is_emergency_muted = False
        self.current_priority = None
        self.master_volume = 0.8
        self.zone_volumes = {
            "ZONE_A": 0.85,
            "ZONE_B": 0.60,
            "ZONE_C": 0.35,
            "ZONE_D": 0.90,
            "ALL": 0.80
        }
        
        if PYGAME_AVAILABLE:
            try:
                pygame.mixer.init(frequency=48000, size=-16, channels=2, buffer=2048)
                logger.info("Pygame mixer initialized successfully at 48kHz 16-bit stereo.")
            except Exception as e:
                logger.error(f"Failed to initialize pygame mixer: {e}")
        else:
            logger.warning("Pygame not installed. Running in mock audio output mode.")

    def play_sound(self, file_path: str, priority: int = AudioPriority.BELL, duration: int = None, zone: str = "ALL"):
        """Plays sound with strict priority management and zone volume adjustment."""
        if self.is_emergency_muted and priority > AudioPriority.EMERGENCY:
            logger.warning("Cannot play sound: Emergency Mute is currently active!")
            return False

        # If a higher priority sound is currently playing, reject or interrupt
        if self.current_priority and priority > self.current_priority:
            logger.warning(f"Rejecting priority {priority} sound while priority {self.current_priority} is active.")
            return False

        logger.info(f"Triggering audio playback: {file_path} [Priority: {priority}, Zone: {zone}]")

        if PYGAME_AVAILABLE and pygame.mixer.get_init():
            try:
                # If higher priority or interrupt requested, stop ongoing playback
                if pygame.mixer.music.get_busy():
                    pygame.mixer.music.stop()

                if os.path.exists(file_path):
                    volume = self.master_volume * self.zone_volumes.get(zone, 0.8)
                    pygame.mixer.music.set_volume(volume)
                    pygame.mixer.music.load(file_path)
                    pygame.mixer.music.play()
                    self.current_priority = priority
                else:
                    logger.warning(f"Audio file not found on disk: {file_path}. Emulating chime.")
            except Exception as e:
                logger.error(f"Playback error: {e}")
        else:
            logger.info(f"[Mock Audio] Simulated playback of '{file_path}' for {duration or 10} seconds.")

        return True

    def stop_all(self):
        """Immediately stops all audio playback."""
        logger.info("Stopping all audio outputs.")
        if PYGAME_AVAILABLE and pygame.mixer.get_init():
            try:
                pygame.mixer.music.stop()
            except Exception as e:
                logger.error(f"Error stopping mixer: {e}")
        self.current_priority = None

    def emergency_mute(self):
        """Activates global emergency silence."""
        logger.warning("EMERGENCY MUTE ACTIVATED! Halting all playback.")
        self.is_emergency_muted = True
        self.stop_all()

    def resume_from_emergency(self):
        """Disables emergency silence and restores normal operation."""
        logger.info("Emergency mute cleared. System ready.")
        self.is_emergency_muted = False
        self.current_priority = None
