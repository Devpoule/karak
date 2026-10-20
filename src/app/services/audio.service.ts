import { Injectable } from '@angular/core';
import { SettingsService } from './settings.service';

export type AudioCue = 'notification';

type AudioContextConstructor = new () => AudioContext;

interface AudioGlobals {
  webkitAudioContext?: AudioContextConstructor;
}

/** Sonorisation optionnelle et légère, sans asset ni effet sur les règles métier. */
@Injectable({ providedIn: 'root' })
export class AudioService {
  private readonly frequencies: Record<AudioCue, number> = {
    notification: 660,
  };
  private audioContext: AudioContext | null = null;

  constructor(private readonly settings: SettingsService) {}

  play(cue: AudioCue): void {
    if (this.settings.audioPreference() !== 'on') return;

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
    oscillator.frequency.setValueAtTime(this.frequencies[cue], start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.08, start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(start);
    oscillator.stop(end);
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
