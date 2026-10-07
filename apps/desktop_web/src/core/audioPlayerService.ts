import { IntermissionTrack, BellType } from '../types';

export interface AudioPlayerState {
  isPlaying: boolean;
  isBellRinging: boolean;
  bellSecondsRemaining: number;
  chainedSessionName?: string;
  currentTrack: IntermissionTrack | null;
  currentTime: number;
  duration: number;
  queueLength: number;
  queueIndex: number;
}

type AudioListener = (state: AudioPlayerState) => void;

class AudioPlayerService {
  private static instance: AudioPlayerService;
  private audio: HTMLAudioElement | null = null;
  private currentTrack: IntermissionTrack | null = null;
  private isPlaying = false;
  private isBellRinging = false;
  private bellSecondsRemaining = 0;
  private chainedSessionName: string | undefined = undefined;
  private bellTimer: any = null;

  private activePlaylistQueue: IntermissionTrack[] = [];
  private currentQueueIndex = 0;

  private currentTime = 0;
  private duration = 0;
  private volume = 0.8;
  private listeners: Set<AudioListener> = new Set();
  private dbPromise: Promise<IDBDatabase> | null = null;
  private fallbackOscillatorTimer: any = null;
  private fallbackAudioCtx: AudioContext | null = null;
  private isFallbackActive = false;

  private sharedAudioCtx: AudioContext | null = null;
  private isUnlocked = false;

  private constructor() {
    if (typeof window !== 'undefined') {
      this.audio = new Audio();
      this.audio.preload = 'auto';

      this.audio.addEventListener('timeupdate', () => {
        if (this.audio && !this.isFallbackActive) {
          this.currentTime = Math.floor(this.audio.currentTime);
          this.duration = Math.floor(this.audio.duration) || this.duration;
          this.notifyListeners();
        }
      });

      this.audio.addEventListener('play', () => {
        this.isPlaying = true;
        this.notifyListeners();
      });

      this.audio.addEventListener('pause', () => {
        if (!this.isFallbackActive && !this.isBellRinging) {
          this.isPlaying = false;
          this.notifyListeners();
        }
      });

      this.audio.addEventListener('ended', () => {
        this.handleTrackEnded();
      });

      this.audio.addEventListener('error', (e) => {
        console.warn('HTMLAudioElement error, switching to melodic synthesizer fallback:', e);
        if (!this.isFallbackActive && this.isPlaying) {
          this.playMelodicFallback();
        }
      });

      // Global one-time interaction listener to unlock AudioContext & HTMLAudio
      const unlockEvents = ['click', 'touchstart', 'keydown', 'pointerdown'];
      const handleFirstInteraction = () => {
        this.unlockAudio();
        unlockEvents.forEach((evt) => {
          window.removeEventListener(evt, handleFirstInteraction, true);
        });
      };
      unlockEvents.forEach((evt) => {
        window.addEventListener(evt, handleFirstInteraction, { capture: true, once: true });
      });
    }
  }

  public static getInstance(): AudioPlayerService {
    if (!AudioPlayerService.instance) {
      AudioPlayerService.instance = new AudioPlayerService();
    }
    return AudioPlayerService.instance;
  }

  private unlockListeners: Set<(unlocked: boolean) => void> = new Set();

  public isAudioUnlocked(): boolean {
    return this.isUnlocked && this.sharedAudioCtx !== null && this.sharedAudioCtx.state === 'running';
  }

  public onAudioUnlockChange(listener: (unlocked: boolean) => void): () => void {
    this.unlockListeners.add(listener);
    listener(this.isAudioUnlocked());
    return () => {
      this.unlockListeners.delete(listener);
    };
  }

  private notifyUnlockChange(): void {
    const unlocked = this.isAudioUnlocked();
    this.unlockListeners.forEach((fn) => {
      try { fn(unlocked); } catch (_) {}
    });
  }

  /**
   * Unlocks Web Audio AudioContext and HTMLAudioElement for uninterrupted autoplay
   */
  public async unlockAudio(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        if (!this.sharedAudioCtx || this.sharedAudioCtx.state === 'closed') {
          this.sharedAudioCtx = new AudioCtx();
        }
        if (this.sharedAudioCtx.state === 'suspended') {
          await this.sharedAudioCtx.resume().catch(() => {});
        }
      }

      if (this.audio) {
        // Prime the audio element with a tiny silent buffer
        const silentWav = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
        const originalSrc = this.audio.src;
        if (!originalSrc || originalSrc.endsWith('base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA')) {
          this.audio.src = silentWav;
          const p = this.audio.play();
          if (p) {
            await p.then(() => {
              if (this.audio && this.audio.src.includes('base64')) {
                this.audio.pause();
                this.audio.currentTime = 0;
              }
            }).catch(() => {});
          }
        }
      }

      this.isUnlocked = true;
      this.notifyUnlockChange();
      return true;
    } catch (e) {
      console.warn('Audio unlock warning:', e);
      return false;
    }
  }

  /**
   * Plays a pleasant test chime to confirm speakers and Web Audio are working
   */
  public playUnlockConfirmationSound(): void {
    try {
      this.unlockAudio();
      if (!this.sharedAudioCtx) return;
      const ctx = this.sharedAudioCtx;
      const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.12);
        gain.gain.setValueAtTime(0.15, ctx.currentTime + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.12 + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.12);
        osc.stop(ctx.currentTime + idx * 0.12 + 0.35);
      });
    } catch (_) {}
  }

  // --- 1. IndexedDB Persistent Storage for Audio Files ---
  private getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB not supported'));
        return;
      }

      const request = indexedDB.open('smartbell_media_db', 1);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('audio_blobs')) {
          db.createObjectStore('audio_blobs', { keyPath: 'id' });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return this.dbPromise;
  }

  public async saveAudioBlob(id: string, blob: Blob): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('audio_blobs', 'readwrite');
        const store = tx.objectStore('audio_blobs');
        const req = store.put({ id, blob, updatedAt: Date.now() });
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.warn('Failed to save audio blob to IndexedDB:', e);
    }
  }

  public async getAudioBlob(id: string): Promise<Blob | null> {
    try {
      const db = await this.getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('audio_blobs', 'readonly');
        const store = tx.objectStore('audio_blobs');
        const req = store.get(id);
        req.onsuccess = () => resolve(req.result ? req.result.blob : null);
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.warn('Failed to get audio blob from IndexedDB:', e);
      return null;
    }
  }

  // --- 2. Auto-Chaining Execution (Bell -> Intermission Playlist) ---
  public async playBellThenPlaylist(
    bellType: BellType,
    bellDurationSec: number,
    playlistTracks: IntermissionTrack[],
    sessionName?: string
  ): Promise<void> {
    this.stop();
    this.isBellRinging = true;
    this.bellSecondsRemaining = Math.max(3, bellDurationSec || 15);
    this.chainedSessionName = sessionName || (bellType === 'BREAK' ? 'استراحة المدرسة' : 'بث الإذاعة');
    this.activePlaylistQueue = [...playlistTracks];
    this.currentQueueIndex = 0;
    this.isPlaying = true;
    this.notifyListeners();

    // Start physical bell audio chime
    this.playSchoolBellChime(bellType, this.bellSecondsRemaining);

    // Bell countdown timer
    if (this.bellTimer) clearInterval(this.bellTimer);
    this.bellTimer = setInterval(() => {
      this.bellSecondsRemaining -= 1;
      this.notifyListeners();

      if (this.bellSecondsRemaining <= 0) {
        clearInterval(this.bellTimer);
        this.bellTimer = null;
        this.isBellRinging = false;
        this.notifyListeners();

        // Immediately chain to playlist if tracks exist
        if (this.activePlaylistQueue.length > 0) {
          const firstTrack = this.activePlaylistQueue[0];
          this.playTrack(firstTrack);
        } else {
          this.stop();
        }
      }
    }, 1000);
  }

  // --- 2.1 Auto-Chaining Execution (Bell -> Single Direct Audio Track) ---
  public async playBellThenDirectAudio(
    bellType: BellType,
    bellDurationSec: number,
    track: IntermissionTrack,
    eventName?: string
  ): Promise<void> {
    this.stop();
    this.isBellRinging = true;
    this.bellSecondsRemaining = Math.max(3, bellDurationSec || 10);
    this.chainedSessionName = eventName ? `بث جرس: ${eventName}` : 'رنين الجرس المدرسي';
    this.activePlaylistQueue = [track];
    this.currentQueueIndex = 0;
    this.isPlaying = true;
    this.notifyListeners();

    // Start physical bell chime
    this.playSchoolBellChime(bellType, this.bellSecondsRemaining);

    // Bell countdown timer
    if (this.bellTimer) clearInterval(this.bellTimer);
    this.bellTimer = setInterval(() => {
      this.bellSecondsRemaining -= 1;
      this.notifyListeners();

      if (this.bellSecondsRemaining <= 0) {
        clearInterval(this.bellTimer);
        this.bellTimer = null;
        this.isBellRinging = false;
        this.notifyListeners();

        // Immediately transition to playing the direct audio track
        this.playTrack(track);
      }
    }, 1000);
  }

  // --- 2.2 Adhan Chime Execution (Priority 2 Override) ---
  public playAdhanChime(adhanTitle: string = 'أذان الصلاة'): void {
    try {
      this.unlockAudio();
      this.stop(); // Priority 2: Interrupt ongoing radio music immediately
      this.isBellRinging = true;
      this.bellSecondsRemaining = 180; // Standard 3-minute Adhan duration
      this.chainedSessionName = `🕌 ${adhanTitle}`;
      this.isPlaying = true;
      this.notifyListeners();

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      if (!this.sharedAudioCtx || this.sharedAudioCtx.state === 'closed') {
        this.sharedAudioCtx = new AudioCtx();
      }
      const ctx = this.sharedAudioCtx;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      // Adhan vocal resonance harmonic pattern (Maqam Hijaz)
      const hijazFrequencies = [293.66, 311.13, 369.99, 392.00, 440.00, 466.16, 554.37, 587.33];
      const now = ctx.currentTime;
      hijazFrequencies.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.45);
        gain.gain.setValueAtTime(0, now + idx * 0.45);
        gain.gain.linearRampToValueAtTime(0.25, now + idx * 0.45 + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.45 + 0.7);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.45);
        osc.stop(now + idx * 0.45 + 0.8);
      });

      if (this.bellTimer) clearInterval(this.bellTimer);
      this.bellTimer = setInterval(() => {
        this.bellSecondsRemaining -= 1;
        this.notifyListeners();
        if (this.bellSecondsRemaining <= 0) {
          clearInterval(this.bellTimer);
          this.bellTimer = null;
          this.isBellRinging = false;
          this.isPlaying = false;
          this.notifyListeners();
        }
      }, 1000);
    } catch (e) {
      console.warn('Error playing adhan chime:', e);
    }
  }

  // --- 3. School Bell Audio Chime Synthesizer ---
  public playSchoolBellChime(type: BellType = 'ENTRY', durationSec: number = 5): void {
    try {
      this.unlockAudio();
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      if (!this.sharedAudioCtx || this.sharedAudioCtx.state === 'closed') {
        this.sharedAudioCtx = new AudioCtx();
      }
      const ctx = this.sharedAudioCtx;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      // Westminster & harmonic bell patterns
      const notes = type === 'EXIT'
        ? [523.25, 659.25, 783.99, 523.25] // C5, E5, G5, C5
        : type === 'BREAK'
        ? [659.25, 523.25, 587.33, 392.00] // E5, C5, D5, G4
        : [587.33, 659.25, 783.99, 880.00]; // D5, E5, G5, A5

      const repeatCount = Math.max(1, Math.floor(durationSec / 1.5));
      let currentRepeat = 0;

      const playChimePattern = () => {
        if (!this.isBellRinging && currentRepeat > 0) {
          return;
        }

        notes.forEach((freq, idx) => {
          try {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.3);

            const vol = Math.max(0.1, this.volume * 0.4);
            gain.gain.setValueAtTime(vol, ctx.currentTime + idx * 0.3);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.3 + 0.5);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(ctx.currentTime + idx * 0.3);
            osc.stop(ctx.currentTime + idx * 0.3 + 0.5);
          } catch (_) {}
        });

        currentRepeat++;
        if (currentRepeat < repeatCount) {
          setTimeout(playChimePattern, 1300);
        }
      };

      playChimePattern();
    } catch (e) {
      console.warn('School bell audio generation error:', e);
    }
  }

  // --- 4. Real Track Playback Engine ---
  public async playTrack(track: IntermissionTrack): Promise<void> {
    this.unlockAudio();
    this.stopFallback();
    if (this.bellTimer) {
      clearInterval(this.bellTimer);
      this.bellTimer = null;
      this.isBellRinging = false;
    }

    this.currentTrack = track;
    this.duration = track.duration_seconds || 120;
    this.currentTime = 0;
    this.isPlaying = true;
    this.notifyListeners();

    // Check if we have a locally stored blob in IndexedDB (by id or title)
    let audioSrc: string | null = null;
    if (track.id) {
      const localBlob = await this.getAudioBlob(track.id);
      if (localBlob) {
        audioSrc = URL.createObjectURL(localBlob);
      }
    }
    if (!audioSrc && track.title) {
      const localBlob = await this.getAudioBlob(track.title);
      if (localBlob) {
        audioSrc = URL.createObjectURL(localBlob);
      }
    }

    // Otherwise check track.audio_url
    if (!audioSrc && track.audio_url && track.audio_url.trim()) {
      const rawUrl = track.audio_url.trim();
      if (!rawUrl.startsWith('blob:')) {
        audioSrc = rawUrl;
      }
    }

    if (this.audio && audioSrc && !audioSrc.includes('dummy')) {
      try {
        this.audio.src = audioSrc;
        this.audio.volume = this.volume;
        await this.audio.play();
        this.isFallbackActive = false;
        this.notifyListeners();
        return;
      } catch (err) {
        console.warn('Direct audio play failed, activating melodic synthesizer preview:', err);
      }
    }

    // Fallback: Synthesize melodic school nasheed anthem through speaker
    this.playMelodicFallback();
  }

  private handleTrackEnded(): void {
    if (this.activePlaylistQueue.length > 0 && this.currentQueueIndex + 1 < this.activePlaylistQueue.length) {
      this.currentQueueIndex += 1;
      const nextTrack = this.activePlaylistQueue[this.currentQueueIndex];
      this.playTrack(nextTrack);
    } else {
      this.isPlaying = false;
      this.currentTime = 0;
      this.notifyListeners();
    }
  }

  public pause(): void {
    this.stopFallback();
    if (this.bellTimer) {
      clearInterval(this.bellTimer);
      this.bellTimer = null;
      this.isBellRinging = false;
    }
    if (this.audio) {
      this.audio.pause();
    }
    this.isPlaying = false;
    this.notifyListeners();
  }

  public async resume(): Promise<void> {
    if (this.currentTrack) {
      this.playTrack(this.currentTrack);
    }
  }

  public stop(): void {
    this.stopFallback();
    if (this.bellTimer) {
      clearInterval(this.bellTimer);
      this.bellTimer = null;
      this.isBellRinging = false;
    }
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
    }
    this.isPlaying = false;
    this.currentTime = 0;
    this.notifyListeners();
  }

  public setVolume(volumePercent: number): void {
    this.volume = Math.max(0, Math.min(1, volumePercent / 100));
    if (this.audio) {
      this.audio.volume = this.volume;
    }
  }

  public seek(seconds: number): void {
    if (this.audio && isFinite(seconds) && !this.isFallbackActive) {
      this.audio.currentTime = Math.max(0, Math.min(this.duration, seconds));
      this.currentTime = Math.floor(this.audio.currentTime);
      this.notifyListeners();
    } else if (this.isFallbackActive) {
      this.currentTime = Math.max(0, Math.min(this.duration, seconds));
      this.notifyListeners();
    }
  }

  public getCurrentState(): AudioPlayerState {
    return {
      isPlaying: this.isPlaying,
      isBellRinging: this.isBellRinging,
      bellSecondsRemaining: this.bellSecondsRemaining,
      chainedSessionName: this.chainedSessionName,
      currentTrack: this.currentTrack,
      currentTime: this.currentTime,
      duration: this.duration,
      queueLength: this.activePlaylistQueue.length,
      queueIndex: this.currentQueueIndex,
    };
  }

  public subscribe(listener: AudioListener): () => void {
    this.listeners.add(listener);
    listener(this.getCurrentState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    const state = this.getCurrentState();
    this.listeners.forEach((listener) => {
      try {
        listener(state);
      } catch (e) {
        console.error('Error in audio listener:', e);
      }
    });
  }

  // --- 5. Melodic Synthesizer Fallback ---
  private playMelodicFallback(): void {
    this.stopFallback();
    this.isFallbackActive = true;
    this.isPlaying = true;
    this.notifyListeners();

    try {
      this.unlockAudio();
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      if (!this.sharedAudioCtx || this.sharedAudioCtx.state === 'closed') {
        this.sharedAudioCtx = new AudioCtx();
      }
      const ctx = this.sharedAudioCtx;
      this.fallbackAudioCtx = ctx;

      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      // Educational melody notes: C4, E4, G4, A4, G4, E4, C4, D4, E4, C4
      const notes = [
        { f: 261.63, d: 0.45 },
        { f: 329.63, d: 0.45 },
        { f: 392.00, d: 0.55 },
        { f: 440.00, d: 0.55 },
        { f: 392.00, d: 0.65 },
        { f: 329.63, d: 0.45 },
        { f: 261.63, d: 0.45 },
        { f: 293.66, d: 0.55 },
        { f: 329.63, d: 0.55 },
        { f: 261.63, d: 0.90 },
      ];

      let noteIndex = 0;
      const playNextNote = () => {
        if (!this.isPlaying || !this.isFallbackActive || !this.fallbackAudioCtx) {
          return;
        }

        const n = notes[noteIndex % notes.length];
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(n.f, ctx.currentTime);

        const currentVol = Math.max(0.04, this.volume * 0.3);
        gain.gain.setValueAtTime(currentVol, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + n.d);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + n.d);

        this.currentTime += 1;
        if (this.currentTime >= this.duration) {
          this.handleTrackEnded();
          return;
        }
        this.notifyListeners();

        noteIndex++;
        this.fallbackOscillatorTimer = setTimeout(playNextNote, (n.d + 0.1) * 1000);
      };

      playNextNote();
    } catch (e) {
      console.warn('Melodic fallback audio error:', e);
    }
  }

  private stopFallback(): void {
    if (this.fallbackOscillatorTimer) {
      clearTimeout(this.fallbackOscillatorTimer);
      this.fallbackOscillatorTimer = null;
    }
    this.fallbackAudioCtx = null;
    this.isFallbackActive = false;
  }
}

export const audioPlayerService = AudioPlayerService.getInstance();
