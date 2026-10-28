import { computed, Injectable, signal } from '@angular/core';

export type MotionPreference = 'system' | 'reduced';
export type TextScale = 'standard' | 'large';
export type ContrastPreference = 'standard' | 'high';
export type AudioPreference = 'off' | 'on';
export type AudioVolume = 0 | 1 | 2 | 3 | 4 | 5;

interface StoredSettings {
  motionPreference: MotionPreference;
  textScale: TextScale;
  contrastPreference: ContrastPreference;
  /** Conservé pour migrer les préférences audio historiques. */
  audioPreference?: AudioPreference;
  musicVolume?: number;
  sfxVolume?: number;
}

const SETTINGS_STORAGE_KEY = 'karak-settings-v1';
export const DEFAULT_MUSIC_VOLUME: AudioVolume = 3;
export const DEFAULT_SFX_VOLUME: AudioVolume = 4;
const DEFAULT_SETTINGS: StoredSettings = {
  motionPreference: 'system',
  textScale: 'standard',
  contrastPreference: 'standard',
  musicVolume: DEFAULT_MUSIC_VOLUME,
  sfxVolume: DEFAULT_SFX_VOLUME,
};

/** Préférences de confort locales, indépendantes de l'état d'une partie. */
@Injectable({ providedIn: 'root' })
export class SettingsService {
  readonly motionPreference = signal<MotionPreference>(DEFAULT_SETTINGS.motionPreference);
  readonly textScale = signal<TextScale>(DEFAULT_SETTINGS.textScale);
  readonly contrastPreference = signal<ContrastPreference>(DEFAULT_SETTINGS.contrastPreference);
  readonly musicVolume = signal<AudioVolume>(DEFAULT_MUSIC_VOLUME);
  readonly sfxVolume = signal<AudioVolume>(DEFAULT_SFX_VOLUME);
  /** Compatibilité avec les appelants historiques : on est actif si un canal est audible. */
  readonly audioPreference = computed<AudioPreference>(() =>
    this.musicVolume() > 0 || this.sfxVolume() > 0 ? 'on' : 'off',
  );

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

  setMusicVolume(volume: number): void {
    this.musicVolume.set(this.normalizeVolume(volume));
    this.sync();
  }

  setSfxVolume(volume: number): void {
    this.sfxVolume.set(this.normalizeVolume(volume));
    this.sync();
  }

  setAudioVolumes(musicVolume: number, sfxVolume: number): void {
    this.musicVolume.set(this.normalizeVolume(musicVolume));
    this.sfxVolume.set(this.normalizeVolume(sfxVolume));
    this.sync();
  }

  /** Compatibilité pour les intégrations qui manipulent encore le mode global. */
  setAudioPreference(preference: AudioPreference): void {
    if (preference === 'off') {
      this.setAudioVolumes(0, 0);
      return;
    }

    if (this.musicVolume() === 0 && this.sfxVolume() === 0) {
      this.setAudioVolumes(DEFAULT_MUSIC_VOLUME, DEFAULT_SFX_VOLUME);
      return;
    }

    this.sync();
  }

  reset(): void {
    this.motionPreference.set(DEFAULT_SETTINGS.motionPreference);
    this.textScale.set(DEFAULT_SETTINGS.textScale);
    this.contrastPreference.set(DEFAULT_SETTINGS.contrastPreference);
    this.musicVolume.set(DEFAULT_MUSIC_VOLUME);
    this.sfxVolume.set(DEFAULT_SFX_VOLUME);
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
      const legacyAudioPreference = stored.audioPreference === 'off' || stored.audioPreference === 'on'
        ? stored.audioPreference
        : null;
      this.musicVolume.set(
        this.isValidVolume(stored.musicVolume)
          ? stored.musicVolume
          : legacyAudioPreference === 'off' ? 0 : DEFAULT_MUSIC_VOLUME,
      );
      this.sfxVolume.set(
        this.isValidVolume(stored.sfxVolume)
          ? stored.sfxVolume
          : legacyAudioPreference === 'off' ? 0 : DEFAULT_SFX_VOLUME,
      );
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
      musicVolume: this.musicVolume(),
      sfxVolume: this.sfxVolume(),
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

    if ((settings.musicVolume ?? 0) > 0 || (settings.sfxVolume ?? 0) > 0) {
      root.dataset['karakAudio'] = 'on';
    } else {
      delete root.dataset['karakAudio'];
    }
  }

  private isValidVolume(value: unknown): value is AudioVolume {
    return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 5;
  }

  private normalizeVolume(value: number): AudioVolume {
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(5, Math.round(value))) as AudioVolume;
  }
}
