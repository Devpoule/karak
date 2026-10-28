import { Injectable, isDevMode } from '@angular/core';

import { SettingsService } from './settings.service';

export type AudioEffectCue =
  | 'MOVE'
  | 'TELEPORT'
  | 'HERO_TELEPORTED'
  | 'TILE_SELECT'
  | 'TILE_ROTATE'
  | 'TILE_PLACED'
  | 'CARD_FLIP'
  | 'COMBAT_DISPLAYING'
  | 'DICE_ROLL'
  | 'DICE_REBOUND'
  | 'IMPACT'
  | 'MONSTER_TURN'
  | 'EQUAL_SCORE'
  | 'VICTORY'
  | 'DEFEAT'
  | 'DEAD_IMPACT'
  | 'DRAGON'
  | 'DRAGON_WINS'
  | 'AXE_ACQUIRED'
  | 'DAGGERS_ACQUIRED'
  | 'SWORD_ACQUIRED'
  | 'OPEN_CHEST'
  | 'HEALING'
  | 'CURSE'
  | 'XANROS_SUBSTITUTION';

export type AudioMusicCue = 'HOME_MUSIC' | 'TRANSITION_MUSIC' | 'GAMEPLAY_MUSIC';
export type AudioCue = AudioEffectCue | AudioMusicCue;

/** Catalogue unique des assets audio réellement présents dans public/. */
export const AUDIO_ASSET_PATHS = {
  MOVE: '/assets/audio/sfx/move.mp3',
  TELEPORT: '/assets/audio/sfx/teleport.mp3',
  TILE_SELECT: '/assets/audio/sfx/choosen-tile.mp3',
  TILE_ROTATE: '/assets/audio/sfx/turning-tile.mp3',
  TILE_PLACED: '/assets/audio/sfx/tile-laiding.mp3',
  CARD_FLIP: '/assets/audio/sfx/card-switching.mp3',
  COMBAT_DISPLAYING: '/assets/audio/sfx/combat-displaying.mp3',
  DICE_ROLL: '/assets/audio/sfx/dices.mp3',
  DICE_REBOUND: '/assets/audio/sfx/dices-rebounds.mp3',
  IMPACT: '/assets/audio/sfx/impact.mp3',
  MONSTER_TURN: '/assets/audio/sfx/monster-turn.mp3',
  EQUAL_SCORE: '/assets/audio/sfx/equal-score.mp3',
  VICTORY: '/assets/audio/sfx/victory.mp3',
  DEFEAT: '/assets/audio/sfx/defeat.mp3',
  DEAD_IMPACT: '/assets/audio/sfx/dead-impact.mp3',
  DRAGON: '/assets/audio/sfx/dragon.mp3',
  DRAGON_WINS: '/assets/audio/sfx/dragon-wins.mp3',
  AXE_ACQUIRED: '/assets/audio/sfx/axe.mp3',
  DAGGERS_ACQUIRED: '/assets/audio/sfx/daggers.mp3',
  SWORD_ACQUIRED: '/assets/audio/sfx/sword.mp3',
  OPEN_CHEST: '/assets/audio/sfx/open-chest.mp3',
  HEALING: '/assets/audio/sfx/healing.mp3',
  CURSE: '/assets/audio/sfx/curse.mp3',
  XANROS_SUBSTITUTION: '/assets/audio/sfx/xanros-substitution.mp3',
  HOME_MUSIC: '/assets/audio/sfx/home.mp3',
  TRANSITION_MUSIC: '/assets/audio/sfx/transition.mp3',
  // Le fichier est déjà fourni dans le catalogue audio existant.
  GAMEPLAY_MUSIC: '/assets/audio/sfx/mystical-ambient.mp3',
} as const satisfies Record<Exclude<AudioCue, 'HERO_TELEPORTED'>, string>;

/** Alias conservé pour les appelants historiques du voyage entre portails. */
const IMPORTANT_EFFECT_CUES = new Set<AudioEffectCue>([
  'COMBAT_DISPLAYING',
  'DICE_ROLL',
  'IMPACT',
  'EQUAL_SCORE',
  'DEFEAT',
  'DEAD_IMPACT',
  'DRAGON',
  'DRAGON_WINS',
  'OPEN_CHEST',
  'HEALING',
  'CURSE',
  'XANROS_SUBSTITUTION',
]);

const MUSIC_DUCK_DURATION_MS = 900;
const MUSIC_DUCK_FADE_IN_MS = 120;
const MUSIC_DUCK_FADE_OUT_MS = 220;
const MUSIC_DUCK_GAIN = 0.38;
const MUSIC_MAX_GAIN = 0.34;
const SFX_MAX_GAIN = 0.82;
const MUSIC_SWITCH_FADE_MS = 120;

/** Centralise les effets ponctuels, la musique, le mixage et les préférences audio. */
@Injectable({ providedIn: 'root' })
export class AudioService {
  private readonly audioElements = new Map<AudioEffectCue, HTMLAudioElement>();
  private audioSequenceRevision = 0;
  private activeAudioSequence: readonly [AudioEffectCue, AudioEffectCue] | null = null;
  private musicElement: HTMLAudioElement | null = null;
  private activeMusic: AudioMusicCue | null = null;
  private requestedMusic: AudioMusicCue | null = null;
  private duckRestoreTimer: ReturnType<typeof setTimeout> | null = null;
  private musicFadeTimer: ReturnType<typeof setInterval> | null = null;
  private musicSourceFadeTimer: ReturnType<typeof setInterval> | null = null;
  private musicDuckGain = 1;
  private musicSourceGain = 1;
  private duckUntil = 0;
  private gameplayAudioStarted = false;

  constructor(private readonly settings: SettingsService) {
    this.registerBrowserUnlock();
  }

  play(cue: AudioEffectCue): void {
    if (this.settings.sfxVolume() === 0) return;

    if (cue === 'DICE_ROLL') this.stopAsset('DICE_REBOUND');
    if (IMPORTANT_EFFECT_CUES.has(cue)) this.duckMusic();
    this.playAsset(cue, this.getEffectAssetPath(cue));
  }

  /** Joue deux bruitages sans chevauchement, le second démarrant à la fin réelle du premier. */
  playSequence(first: AudioEffectCue, second: AudioEffectCue): void {
    if (this.settings.sfxVolume() === 0) return;

    this.cancelAudioSequence();
    const revision = this.audioSequenceRevision;
    this.activeAudioSequence = [first, second];
    if (IMPORTANT_EFFECT_CUES.has(first)) this.duckMusic();

    this.playAsset(first, this.getEffectAssetPath(first), () => {
      if (revision !== this.audioSequenceRevision || this.settings.sfxVolume() === 0) return;
      this.playAsset(second, this.getEffectAssetPath(second), () => {
        if (revision === this.audioSequenceRevision) this.activeAudioSequence = null;
      });
    });
  }

  /** Invalide une séquence de récompense devenue obsolète lors d'un nouveau combat ou d'une nouvelle partie. */
  cancelAudioSequence(): void {
    this.audioSequenceRevision += 1;
    const sequence = this.activeAudioSequence;
    this.activeAudioSequence = null;
    if (!sequence) return;
    this.stopAsset(sequence[0]);
    this.stopAsset(sequence[1]);
  }

  /** Lance ou maintient la musique des écrans précédant le plateau. */
  playHomeMusic(): void {
    this.gameplayAudioStarted = false;
    this.requestedMusic = 'HOME_MUSIC';
    this.clearMusicSourceFade();
    this.musicSourceGain = 1;
    if (this.settings.musicVolume() > 0) this.playMusic('HOME_MUSIC');
    else this.stopMusic();
  }

  /** Joue la transition vers le plateau puis enchaîne sur l'ambiance en boucle. */
  playGameplayTransition(): void {
    if (this.gameplayAudioStarted) return;
    this.gameplayAudioStarted = true;
    this.requestedMusic = 'GAMEPLAY_MUSIC';

    if (this.settings.musicVolume() === 0) {
      this.playMusic('GAMEPLAY_MUSIC');
      return;
    }

    if (this.activeMusic === 'HOME_MUSIC' && this.musicElement && !this.musicElement.paused) {
      this.fadeMusicSourceTo(0, MUSIC_SWITCH_FADE_MS, () => {
        if (this.requestedMusic !== 'GAMEPLAY_MUSIC') return;
        this.playMusic('TRANSITION_MUSIC');
        this.fadeMusicSourceTo(1, MUSIC_SWITCH_FADE_MS);
      });
      return;
    }

    this.playMusic('TRANSITION_MUSIC');
  }

  /** Rejoue un asset uniquement en développement pour les vérifications manuelles. */
  preview(cue: AudioCue): void {
    if (!isDevMode()) return;
    if (cue === 'HOME_MUSIC' || cue === 'TRANSITION_MUSIC' || cue === 'GAMEPLAY_MUSIC') {
      this.playMusic(cue);
    } else {
      this.play(cue);
    }
  }

  /** Réessaie la lecture après une interaction autorisée par le navigateur. */
  unlock(): void {
    if (this.settings.musicVolume() === 0) return;
    if (this.musicElement && this.activeMusic && this.musicElement.paused) {
      void this.musicElement.play().catch(() => undefined);
    }
  }

  /** Applique immédiatement les changements de volume sans redémarrer les pistes. */
  syncAudioSettings(): void {
    this.applyMusicVolume();

    if (this.settings.musicVolume() === 0) {
      this.musicElement?.pause();
      return;
    }

    if (this.musicElement && this.activeMusic && this.musicElement.paused) {
      void this.musicElement.play().catch(() => undefined);
    } else if (!this.activeMusic && this.requestedMusic) {
      this.playMusic(this.requestedMusic);
    }
  }

  /** Compatibilité avec le réglage audio historique. */
  syncAudioPreference(): void {
    this.syncAudioSettings();
  }

  /** Lit un asset ponctuel sans bloquer le flux métier en cas d'échec. */
  private playAsset(cue: AudioEffectCue, assetPath: string, onEnded?: () => void): void {
    if (typeof Audio === 'undefined') return;
    let audio = this.audioElements.get(cue);
    if (!audio) {
      try {
        audio = new Audio(assetPath);
        audio.preload = 'auto';
        if (cue === 'DICE_ROLL') {
          audio.addEventListener('ended', () => this.play('DICE_REBOUND'));
        }
        audio.addEventListener('error', () => {
          if (this.audioElements.get(cue) === audio) this.audioElements.delete(cue);
        }, { once: true });
        this.audioElements.set(cue, audio);
      } catch {
        return;
      }
    }

    if (onEnded) audio.addEventListener('ended', onEnded, { once: true });

    try {
      audio.volume = this.getSfxGain();
      audio.currentTime = 0;
      void audio.play().catch(() => undefined);
    } catch {
      // Une erreur audio ne doit jamais interrompre l'action métier.
    }
  }

  private getEffectAssetPath(cue: AudioEffectCue): string {
    if (cue === 'HERO_TELEPORTED') return AUDIO_ASSET_PATHS.TELEPORT;
    return AUDIO_ASSET_PATHS[cue as Exclude<AudioEffectCue, 'HERO_TELEPORTED'>];
  }

  /** Interrompt le rebond précédent lorsqu'un nouveau lancer commence. */
  private stopAsset(cue: AudioEffectCue): void {
    const audio = this.audioElements.get(cue);
    if (!audio) return;
    try {
      audio.pause();
      audio.currentTime = 0;
    } catch {
      // Une erreur de nettoyage d'un bruitage ne doit pas interrompre le jeu.
    }
  }

  private playMusic(cue: AudioMusicCue): void {
    if (typeof Audio === 'undefined') return;
    const path = AUDIO_ASSET_PATHS[cue];
    let audio = this.musicElement;

    if (!audio) {
      try {
        audio = new Audio(path);
        audio.preload = 'auto';
        audio.addEventListener('ended', () => {
          if (this.musicElement !== audio) return;
          if (this.activeMusic === 'TRANSITION_MUSIC' && this.requestedMusic === 'GAMEPLAY_MUSIC') {
            this.playMusic('GAMEPLAY_MUSIC');
          }
        });
        audio.addEventListener('error', () => {
          if (this.musicElement !== audio) return;
          const failedTransition = this.activeMusic === 'TRANSITION_MUSIC';
          this.activeMusic = null;
          if (failedTransition && this.requestedMusic === 'GAMEPLAY_MUSIC') {
            this.playMusic('GAMEPLAY_MUSIC');
          }
        }, { once: true });
        this.musicElement = audio;
      } catch {
        return;
      }
    }

    if (this.activeMusic === cue && !audio.paused) return;

    try {
      audio.pause();
      audio.src = path;
      audio.loop = cue !== 'TRANSITION_MUSIC';
      audio.currentTime = 0;
      this.activeMusic = cue;
      this.applyMusicVolume();
      if (this.settings.musicVolume() > 0) void audio.play().catch(() => undefined);
    } catch {
      this.activeMusic = null;
    }
  }

  private stopMusic(): void {
    if (this.duckRestoreTimer !== null) {
      clearTimeout(this.duckRestoreTimer);
      this.duckRestoreTimer = null;
    }
    this.duckUntil = 0;
    if (!this.musicElement) {
      this.clearMusicFade();
      this.clearMusicSourceFade();
      this.musicDuckGain = 1;
      this.musicSourceGain = 1;
      this.activeMusic = null;
      return;
    }
    try {
      this.musicElement.pause();
      this.musicElement.currentTime = 0;
    } catch {
      // Une erreur de nettoyage audio ne doit pas bloquer la navigation.
    }
    this.clearMusicFade();
    this.clearMusicSourceFade();
    this.musicDuckGain = 1;
    this.musicSourceGain = 1;
    this.activeMusic = null;
  }

  private duckMusic(): void {
    if (!this.musicElement || this.settings.musicVolume() === 0) return;
    this.duckUntil = Math.max(this.duckUntil, Date.now() + MUSIC_DUCK_DURATION_MS);
    this.fadeMusicTo(MUSIC_DUCK_GAIN, MUSIC_DUCK_FADE_IN_MS);
    if (this.duckRestoreTimer !== null) clearTimeout(this.duckRestoreTimer);
    this.duckRestoreTimer = setTimeout(() => {
      this.duckRestoreTimer = null;
      const remaining = this.duckUntil - Date.now();
      if (remaining > 0) {
        this.duckRestoreTimer = setTimeout(() => this.syncDuckState(), remaining);
      } else {
        this.syncDuckState();
      }
    }, MUSIC_DUCK_DURATION_MS);
  }

  private syncDuckState(): void {
    this.duckRestoreTimer = null;
    this.fadeMusicTo(1, MUSIC_DUCK_FADE_OUT_MS);
  }

  private applyMusicVolume(): void {
    if (!this.musicElement) return;
    const gain = this.getMusicGain();
    this.musicElement.volume = gain * this.musicSourceGain * this.musicDuckGain;
  }

  private fadeMusicTo(target: number, duration: number): void {
    this.clearMusicFade();
    const start = this.musicDuckGain;
    if (duration <= 0 || start === target) {
      this.musicDuckGain = target;
      this.applyMusicVolume();
      return;
    }

    const startedAt = Date.now();
    this.musicFadeTimer = setInterval(() => {
      const progress = Math.min(1, (Date.now() - startedAt) / duration);
      this.musicDuckGain = start + (target - start) * progress;
      this.applyMusicVolume();
      if (progress >= 1) this.clearMusicFade();
    }, 30);
  }

  private clearMusicFade(): void {
    if (this.musicFadeTimer !== null) {
      clearInterval(this.musicFadeTimer);
      this.musicFadeTimer = null;
    }
  }

  /** Fait disparaître une piste avant de changer de source sur le même lecteur. */
  private fadeMusicSourceTo(target: number, duration: number, onComplete?: () => void): void {
    this.clearMusicSourceFade();
    const start = this.musicSourceGain;
    if (duration <= 0 || start === target) {
      this.musicSourceGain = target;
      this.applyMusicVolume();
      onComplete?.();
      return;
    }

    const startedAt = Date.now();
    this.musicSourceFadeTimer = setInterval(() => {
      const progress = Math.min(1, (Date.now() - startedAt) / duration);
      this.musicSourceGain = start + (target - start) * progress;
      this.applyMusicVolume();
      if (progress >= 1) {
        this.clearMusicSourceFade();
        onComplete?.();
      }
    }, 20);
  }

  private clearMusicSourceFade(): void {
    if (this.musicSourceFadeTimer !== null) {
      clearInterval(this.musicSourceFadeTimer);
      this.musicSourceFadeTimer = null;
    }
  }

  private getMusicGain(): number {
    return (this.settings.musicVolume() / 5) * MUSIC_MAX_GAIN;
  }

  private getSfxGain(): number {
    return (this.settings.sfxVolume() / 5) * SFX_MAX_GAIN;
  }

  private registerBrowserUnlock(): void {
    if (typeof window === 'undefined') return;
    const unlock = (): void => this.unlock();
    window.addEventListener('pointerdown', unlock, { once: true, passive: true });
    window.addEventListener('keydown', unlock, { once: true });
  }
}
