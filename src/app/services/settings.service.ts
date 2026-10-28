import { Injectable, signal } from '@angular/core';

export type MotionPreference = 'system' | 'reduced';
export type TextScale = 'standard' | 'large';
export type ContrastPreference = 'standard' | 'high';
export type AudioPreference = 'off' | 'on';

interface StoredSettings {
  motionPreference: MotionPreference;
  textScale: TextScale;
  contrastPreference: ContrastPreference;
  audioPreference: AudioPreference;
}

const SETTINGS_STORAGE_KEY = 'karak-settings-v1';
const DEFAULT_SETTINGS: StoredSettings = {
  motionPreference: 'system',
  textScale: 'standard',
  contrastPreference: 'standard',
  audioPreference: 'on',
};

/** Préférences de confort locales, indépendantes de l'état d'une partie. */
@Injectable({ providedIn: 'root' })
export class SettingsService {
  readonly motionPreference = signal<MotionPreference>(DEFAULT_SETTINGS.motionPreference);
  readonly textScale = signal<TextScale>(DEFAULT_SETTINGS.textScale);
  readonly contrastPreference = signal<ContrastPreference>(DEFAULT_SETTINGS.contrastPreference);
  readonly audioPreference = signal<AudioPreference>(DEFAULT_SETTINGS.audioPreference);

  constructor() {
    this.restore();
    this.sync();
  }

  setMotionPreference(preference: MotionPreference): void {
    this.motionPreference.set(preference);
    this.sync();
  }

  setTextScale(scale: TextScale): void {
    this.textScale.set(scale);
    this.sync();
  }

  setContrastPreference(preference: ContrastPreference): void {
    this.contrastPreference.set(preference);
    this.sync();
  }

  setAudioPreference(preference: AudioPreference): void {
    this.audioPreference.set(preference);
    this.sync();
  }

  reset(): void {
    this.motionPreference.set(DEFAULT_SETTINGS.motionPreference);
    this.textScale.set(DEFAULT_SETTINGS.textScale);
    this.contrastPreference.set(DEFAULT_SETTINGS.contrastPreference);
    this.audioPreference.set(DEFAULT_SETTINGS.audioPreference);
    this.sync();
  }

  private restore(): void {
    if (typeof localStorage === 'undefined') return;

    try {
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (!raw) return;
      const stored = JSON.parse(raw) as Partial<StoredSettings>;
      if (stored.motionPreference === 'system' || stored.motionPreference === 'reduced') {
        this.motionPreference.set(stored.motionPreference);
      }
      if (stored.textScale === 'standard' || stored.textScale === 'large') {
        this.textScale.set(stored.textScale);
      }
      if (stored.contrastPreference === 'standard' || stored.contrastPreference === 'high') {
        this.contrastPreference.set(stored.contrastPreference);
      }
      if (stored.audioPreference === 'off' || stored.audioPreference === 'on') {
        this.audioPreference.set(stored.audioPreference);
      }
    } catch {
      localStorage.removeItem(SETTINGS_STORAGE_KEY);
    }
  }

  private persist(settings: StoredSettings): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  }

  private sync(): void {
    const settings: StoredSettings = {
      motionPreference: this.motionPreference(),
      textScale: this.textScale(),
      contrastPreference: this.contrastPreference(),
      audioPreference: this.audioPreference(),
    };
    this.persist(settings);
    this.apply(settings);
  }

  private apply(settings: StoredSettings): void {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    if (settings.motionPreference === 'reduced') {
      root.dataset['karakMotion'] = 'reduced';
    } else {
      delete root.dataset['karakMotion'];
    }

    if (settings.textScale === 'large') {
      root.dataset['karakTextScale'] = 'large';
    } else {
      delete root.dataset['karakTextScale'];
    }

    if (settings.contrastPreference === 'high') {
      root.dataset['karakContrast'] = 'high';
    } else {
      delete root.dataset['karakContrast'];
    }

    if (settings.audioPreference === 'on') {
      root.dataset['karakAudio'] = 'on';
    } else {
      delete root.dataset['karakAudio'];
    }
  }
}
