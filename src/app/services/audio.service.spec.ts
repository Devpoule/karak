import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AudioService } from './audio.service';
import { SettingsService } from './settings.service';

class FakeAudioElement {
  static instances: FakeAudioElement[] = [];
  readonly play = vi.fn(() => {
    this.paused = false;
    return Promise.resolve();
  });
  readonly pause = vi.fn(() => {
    this.paused = true;
  });
  currentTime = 0;
  paused = true;
  loop = false;
  volume = 1;
  preload = '';
  private errorListener: (() => void) | null = null;
  private endedListener: (() => void) | null = null;

  constructor(public src: string) {
    FakeAudioElement.instances.push(this);
  }

  addEventListener(type: string, listener: () => void): void {
    if (type === 'error') this.errorListener = listener;
    if (type === 'ended') this.endedListener = listener;
  }

  emitError(): void {
    this.errorListener?.();
  }

  emitEnded(): void {
    this.endedListener?.();
  }
}

describe('AudioService', () => {
  beforeEach(() => {
    FakeAudioElement.instances = [];
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('reste silencieux lorsque les sons sont désactivés', () => {
    vi.stubGlobal('Audio', FakeAudioElement);
    TestBed.inject(SettingsService).setAudioPreference('off');
    const service = TestBed.inject(AudioService);

    service.play('MOVE');

    expect(FakeAudioElement.instances).toHaveLength(0);
  });

  it('joue un bruitage lorsque le canal SFX est audible', () => {
    vi.stubGlobal('Audio', FakeAudioElement);
    const settings = TestBed.inject(SettingsService);
    settings.setSfxVolume(5);
    const service = TestBed.inject(AudioService);

    service.play('MOVE');

    expect(FakeAudioElement.instances).toHaveLength(1);
  });

  it('tolère une lecture audio non disponible sans bloquer le jeu', () => {
    vi.stubGlobal('Audio', FakeAudioElement);
    const settings = TestBed.inject(SettingsService);
    settings.setSfxVolume(5);

    expect(() => TestBed.inject(AudioService).play('MOVE')).not.toThrow();
  });

  it('charge et joue le bruitage du portail lorsque les sons sont activés', () => {
    vi.stubGlobal('Audio', FakeAudioElement);
    const settings = TestBed.inject(SettingsService);
    settings.setSfxVolume(5);
    const service = TestBed.inject(AudioService);

    service.play('HERO_TELEPORTED');

    expect(FakeAudioElement.instances).toHaveLength(1);
    expect(FakeAudioElement.instances[0].src).toBe('/assets/audio/sfx/teleport.mp3');
    expect(FakeAudioElement.instances[0].preload).toBe('auto');
    expect(FakeAudioElement.instances[0].play).toHaveBeenCalledOnce();
  });

  it.each([
    ['MOVE', '/assets/audio/sfx/move.mp3'],
    ['TELEPORT', '/assets/audio/sfx/teleport.mp3'],
    ['TILE_SELECT', '/assets/audio/sfx/choosen-tile.mp3'],
    ['TILE_ROTATE', '/assets/audio/sfx/turning-tile.mp3'],
    ['TILE_PLACED', '/assets/audio/sfx/tile-laiding.mp3'],
    ['CARD_FLIP', '/assets/audio/sfx/card-switching.mp3'],
    ['COMBAT_DISPLAYING', '/assets/audio/sfx/combat-displaying.mp3'],
    ['DICE_ROLL', '/assets/audio/sfx/dices.mp3'],
    ['DICE_REBOUND', '/assets/audio/sfx/dices-rebounds.mp3'],
    ['IMPACT', '/assets/audio/sfx/impact.mp3'],
    ['MONSTER_TURN', '/assets/audio/sfx/monster-turn.mp3'],
    ['EQUAL_SCORE', '/assets/audio/sfx/equal-score.mp3'],
    ['VICTORY', '/assets/audio/sfx/victory.mp3'],
    ['DEFEAT', '/assets/audio/sfx/defeat.mp3'],
    ['DEAD_IMPACT', '/assets/audio/sfx/dead-impact.mp3'],
    ['DRAGON', '/assets/audio/sfx/dragon.mp3'],
    ['DRAGON_WINS', '/assets/audio/sfx/dragon-wins.mp3'],
    ['AXE_ACQUIRED', '/assets/audio/sfx/axe.mp3'],
    ['DAGGERS_ACQUIRED', '/assets/audio/sfx/daggers.mp3'],
    ['SWORD_ACQUIRED', '/assets/audio/sfx/sword.mp3'],
    ['OPEN_CHEST', '/assets/audio/sfx/open-chest.mp3'],
    ['HEALING', '/assets/audio/sfx/healing.mp3'],
    ['CURSE', '/assets/audio/sfx/curse.mp3'],
    ['XANROS_SUBSTITUTION', '/assets/audio/sfx/xanros-substitution.mp3'],
  ] as const)('associe %s au bon fichier', (cue, assetPath) => {
    vi.stubGlobal('Audio', FakeAudioElement);
    TestBed.inject(SettingsService).setSfxVolume(5);
    const service = TestBed.inject(AudioService);

    service.play(cue);

    expect(FakeAudioElement.instances.at(-1)?.src).toBe(assetPath);
    expect(FakeAudioElement.instances.at(-1)?.play).toHaveBeenCalledOnce();
  });

  it('enchaîne le rebond après chaque lancer de dés terminé', () => {
    vi.stubGlobal('Audio', FakeAudioElement);
    TestBed.inject(SettingsService).setSfxVolume(5);
    const service = TestBed.inject(AudioService);

    service.play('DICE_ROLL');
    const diceRoll = FakeAudioElement.instances[0];
    expect(diceRoll.src).toBe('/assets/audio/sfx/dices.mp3');
    expect(FakeAudioElement.instances).toHaveLength(1);

    diceRoll.emitEnded();

    expect(FakeAudioElement.instances).toHaveLength(2);
    expect(FakeAudioElement.instances[1].src).toBe('/assets/audio/sfx/dices-rebounds.mp3');
    expect(FakeAudioElement.instances[1].play).toHaveBeenCalledOnce();
  });

  it('enchaîne les sons d une séquence à la fin réelle du premier son', () => {
    vi.stubGlobal('Audio', FakeAudioElement);
    TestBed.inject(SettingsService).setSfxVolume(5);
    const service = TestBed.inject(AudioService);

    service.playSequence('IMPACT', 'VICTORY');

    expect(FakeAudioElement.instances).toHaveLength(1);
    expect(FakeAudioElement.instances[0].src).toBe('/assets/audio/sfx/impact.mp3');
    expect(FakeAudioElement.instances[0].play).toHaveBeenCalledOnce();

    expect(FakeAudioElement.instances).toHaveLength(1);

    FakeAudioElement.instances[0].emitEnded();

    expect(FakeAudioElement.instances).toHaveLength(2);
    expect(FakeAudioElement.instances[1].src).toBe('/assets/audio/sfx/victory.mp3');
    expect(FakeAudioElement.instances[1].play).toHaveBeenCalledOnce();
  });

  it('conserve la musique d accueil puis enchaîne une seule transition', () => {
    vi.useFakeTimers();
    vi.stubGlobal('Audio', FakeAudioElement);
    TestBed.inject(SettingsService).setAudioVolumes(5, 5);
    const service = TestBed.inject(AudioService);

    service.playHomeMusic();
    service.playHomeMusic();

    expect(FakeAudioElement.instances).toHaveLength(1);
    expect(FakeAudioElement.instances[0].src).toBe('/assets/audio/sfx/home.mp3');
    expect(FakeAudioElement.instances[0].loop).toBe(true);
    expect(FakeAudioElement.instances[0].play).toHaveBeenCalledOnce();

    service.playGameplayTransition();
    service.playGameplayTransition();
    vi.advanceTimersByTime(60);
    expect(FakeAudioElement.instances[0].src).toBe('/assets/audio/sfx/home.mp3');
    expect(FakeAudioElement.instances[0].volume).toBeLessThan(.34);
    vi.advanceTimersByTime(80);

    expect(FakeAudioElement.instances[0].src).toBe('/assets/audio/sfx/transition.mp3');
    expect(FakeAudioElement.instances[0].loop).toBe(false);
    expect(FakeAudioElement.instances[0].play).toHaveBeenCalledTimes(2);
    FakeAudioElement.instances[0].emitEnded();
    expect(FakeAudioElement.instances[0].src).toBe('/assets/audio/sfx/mystical-ambient.mp3');
    expect(FakeAudioElement.instances[0].loop).toBe(true);
    vi.useRealTimers();
  });

  it('contrôle indépendamment la musique et les bruitages', () => {
    vi.stubGlobal('Audio', FakeAudioElement);
    const settings = TestBed.inject(SettingsService);
    settings.setAudioVolumes(0, 5);
    const service = TestBed.inject(AudioService);

    service.playHomeMusic();
    service.play('MOVE');

    expect(FakeAudioElement.instances).toHaveLength(1);
    expect(FakeAudioElement.instances[0].src).toBe('/assets/audio/sfx/move.mp3');

    settings.setAudioVolumes(4, 0);
    service.syncAudioSettings();
    service.play('MOVE');

    expect(FakeAudioElement.instances).toHaveLength(2);
    expect(FakeAudioElement.instances[1].src).toBe('/assets/audio/sfx/home.mp3');
  });

  it('atténue puis restaure progressivement la musique pour un événement important', () => {
    vi.useFakeTimers();
    vi.stubGlobal('Audio', FakeAudioElement);
    const settings = TestBed.inject(SettingsService);
    settings.setAudioVolumes(5, 5);
    const service = TestBed.inject(AudioService);

    service.playHomeMusic();
    const music = FakeAudioElement.instances[0];
    expect(music.volume).toBeCloseTo(.34);

    service.play('DICE_ROLL');
    vi.advanceTimersByTime(120);
    expect(music.volume).toBeCloseTo(.34 * .38);

    vi.advanceTimersByTime(1_200);
    expect(music.volume).toBeCloseTo(.34);
  });

  it('ignore un refus de lecture sans lever d’erreur', () => {
    vi.stubGlobal('Audio', FakeAudioElement);
    const settings = TestBed.inject(SettingsService);
    settings.setSfxVolume(5);
    const service = TestBed.inject(AudioService);
    service.play('HERO_TELEPORTED');
    FakeAudioElement.instances[0].play.mockRejectedValueOnce(new Error('autoplay blocked'));

    expect(() => service.play('HERO_TELEPORTED')).not.toThrow();
  });

  it('réessaie le chargement après une erreur de ressource', () => {
    vi.stubGlobal('Audio', FakeAudioElement);
    const settings = TestBed.inject(SettingsService);
    settings.setSfxVolume(5);
    const service = TestBed.inject(AudioService);

    service.play('HERO_TELEPORTED');
    FakeAudioElement.instances[0].emitError();
    service.play('HERO_TELEPORTED');

    expect(FakeAudioElement.instances).toHaveLength(2);
  });
});
