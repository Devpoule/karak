import { Injectable } from '@angular/core';
import { SettingsService } from './settings.service';

export type AudioCue = 'notification' | 'HERO_TELEPORTED';

const AUDIO_ASSETS: Partial<Record<AudioCue, string>> = {
  HERO_TELEPORTED: '/assets/audio/sfx/teleport.mp3',
};

type AudioContextConstructor = new () => AudioContext;

interface AudioGlobals {
  webkitAudioContext?: AudioContextConstructor;
}

/** Sonorisation optionnelle des notifications et événements de partie. */
@Injectable({ providedIn: 'root' })
export class AudioService {
  private readonly frequencies: Record<'notification', number> = {
    notification: 660,
  };
  private audioContext: AudioContext | null = null;
  private readonly audioElements = new Map<AudioCue, HTMLAudioElement>();

  constructor(private readonly settings: SettingsService) {}

  play(cue: AudioCue): void {
    if (this.settings.audioPreference() !== 'on') return;

    const assetPath = AUDIO_ASSETS[cue];
    if (assetPath) {
      this.playAsset(cue, assetPath);
      return;
    }

    const context = this.getAudioContext();
    if (!context) return;

    if (context.state === 'suspended') {
      void context.resume().catch(() => undefined);
    }

    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const start = context.currentTime;
    const end = start + 0.12;

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(this.frequencies.notification, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.08, start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(start);
    oscillator.stop(end);
  }

  /** Lit un asset réutilisable sans bloquer le flux métier en cas d'échec. */
  private playAsset(cue: AudioCue, assetPath: string): void {
    if (typeof Audio === 'undefined') return;

    let audio = this.audioElements.get(cue);
    if (!audio) {
      try {
        audio = new Audio(assetPath);
        audio.preload = 'auto';
        audio.addEventListener('error', () => {
          if (this.audioElements.get(cue) === audio) this.audioElements.delete(cue);
        }, { once: true });
        this.audioElements.set(cue, audio);
      } catch {
        return;
      }
    }

    try {
      audio.currentTime = 0;
      void audio.play().catch(() => undefined);
    } catch {
      // Une erreur audio ne doit jamais interrompre l'action métier.
    }
  }

  private getAudioContext(): AudioContext | null {
    if (this.audioContext) return this.audioContext;

    const globals = globalThis as typeof globalThis & AudioGlobals;
    const AudioContextClass = globalThis.AudioContext ?? globals.webkitAudioContext;
    if (!AudioContextClass) return null;

    try {
      this.audioContext = new AudioContextClass();
      return this.audioContext;
    } catch {
      return null;
    }
  }
}
