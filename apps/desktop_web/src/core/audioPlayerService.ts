import { IntermissionTrack } from '../types';

export interface AudioPlayerState {
  isPlaying: boolean;
  currentTrack: IntermissionTrack | null;
  currentTime: number;
  duration: number;
}

type AudioListener = (state: AudioPlayerState) => void;

class AudioPlayerService {
  private static instance: AudioPlayerService;
  private audio: HTMLAudioElement | null = null;
  private currentTrack: IntermissionTrack | null = null;
  private isPlaying = false;
  private currentTime = 0;
  private duration = 0;
  private volume = 0.8;
  private listeners: Set<AudioListener> = new Set();
  private dbPromise: Promise<IDBDatabase> | null = null;
  private fallbackOscillatorTimer: any = null;
  private fallbackAudioCtx: AudioContext | null = null;
  private isFallbackActive = false;

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
        if (!this.isFallbackActive) {
          this.isPlaying = false;
          this.notifyListeners();
        }
      });

      this.audio.addEventListener('ended', () => {
        this.isPlaying = false;
        this.currentTime = 0;
        this.notifyListeners();
      });

      this.audio.addEventListener('error', (e) => {
        console.warn('HTMLAudioElement error, switching to melodic synthesizer fallback:', e);
        if (!this.isFallbackActive && this.isPlaying) {
          this.playMelodicFallback();
        }
      });
    }
  }

  public static getInstance(): AudioPlayerService {
    if (!AudioPlayerService.instance) {
      AudioPlayerService.instance = new AudioPlayerService();
    }
    return AudioPlayerService.instance;
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

  // --- 2. Real Playback Engine ---
  public async playTrack(track: IntermissionTrack): Promise<void> {
    this.stopFallback();
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
      // If it's a blob url from an old session, it cannot be fetched across reload
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

  public pause(): void {
    this.stopFallback();
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
      currentTrack: this.currentTrack,
      currentTime: this.currentTime,
      duration: this.duration,
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

  // --- 3. Melodic Synthesizer Fallback ---
  // Plays a rich school anthem melody through speakers if the audio source URL is unavailable
  private playMelodicFallback(): void {
    this.stopFallback();
    this.isFallbackActive = true;
    this.isPlaying = true;
    this.notifyListeners();

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      this.fallbackAudioCtx = ctx;

      if (ctx.state === 'suspended') {
        ctx.resume();
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

        // Warm harmonic triangle + lowpass
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(n.f, ctx.currentTime);

        const currentVol = Math.max(0.04, this.volume * 0.3);
        gain.gain.setValueAtTime(currentVol, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + n.d);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + n.d);

        this.currentTime += 1;
        if (this.currentTime >= this.duration) {
          this.stop();
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
    if (this.fallbackAudioCtx) {
      try {
        this.fallbackAudioCtx.close();
      } catch (_) {}
      this.fallbackAudioCtx = null;
    }
    this.isFallbackActive = false;
  }
}

export const audioPlayerService = AudioPlayerService.getInstance();
