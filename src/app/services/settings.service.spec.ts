import { TestBed } from '@angular/core/testing';
import { SettingsService } from './settings.service';

describe('SettingsService', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-karak-motion');
    document.documentElement.removeAttribute('data-karak-text-scale');
    document.documentElement.removeAttribute('data-karak-contrast');
    document.documentElement.removeAttribute('data-karak-audio');
    TestBed.resetTestingModule();
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-karak-motion');
    document.documentElement.removeAttribute('data-karak-text-scale');
    document.documentElement.removeAttribute('data-karak-contrast');
    document.documentElement.removeAttribute('data-karak-audio');
  });

  it('restaure et applique les préférences enregistrées', () => {
    localStorage.setItem('karak-settings-v1', JSON.stringify({
      motionPreference: 'reduced',
      textScale: 'large',
      contrastPreference: 'high',
      audioPreference: 'on',
    }));

    const service = TestBed.inject(SettingsService);

    expect(service.motionPreference()).toBe('reduced');
    expect(service.textScale()).toBe('large');
    expect(service.contrastPreference()).toBe('high');
    expect(service.audioPreference()).toBe('on');
    expect(document.documentElement.dataset['karakMotion']).toBe('reduced');
    expect(document.documentElement.dataset['karakTextScale']).toBe('large');
    expect(document.documentElement.dataset['karakContrast']).toBe('high');
  });

  it('persiste les changements et les applique au document', () => {
    const service = TestBed.inject(SettingsService);

    service.setMotionPreference('reduced');
    service.setTextScale('large');
    service.setContrastPreference('high');
    service.setMusicVolume(5);
    service.setSfxVolume(0);

    expect(JSON.parse(localStorage.getItem('karak-settings-v1') ?? '{}')).toEqual({
      motionPreference: 'reduced',
      textScale: 'large',
      contrastPreference: 'high',
      audioPreference: 'on',
      musicVolume: 5,
      sfxVolume: 0,
    });
    expect(document.documentElement.dataset['karakMotion']).toBe('reduced');
    expect(document.documentElement.dataset['karakTextScale']).toBe('large');
    expect(document.documentElement.dataset['karakContrast']).toBe('high');
    expect(document.documentElement.dataset['karakAudio']).toBe('on');
  });

  it('réinitialise les préférences sur les valeurs par défaut', () => {
    const service = TestBed.inject(SettingsService);
    service.setMotionPreference('reduced');
    service.setTextScale('large');

    service.reset();

    expect(service.motionPreference()).toBe('system');
    expect(service.textScale()).toBe('standard');
    expect(document.documentElement.dataset['karakMotion']).toBeUndefined();
    expect(document.documentElement.dataset['karakTextScale']).toBeUndefined();
    expect(document.documentElement.dataset['karakContrast']).toBeUndefined();
    expect(service.audioPreference()).toBe('on');
    expect(document.documentElement.dataset['karakAudio']).toBe('on');
  });

  it('active les sons par défaut lorsqu’aucune préférence n’est enregistrée', () => {
    const service = TestBed.inject(SettingsService);

    expect(service.audioPreference()).toBe('on');
    expect(service.musicVolume()).toBe(3);
    expect(service.sfxVolume()).toBe(4);
    expect(document.documentElement.dataset['karakAudio']).toBe('on');
  });

  it('migre le silence historique vers deux canaux coupés', () => {
    localStorage.setItem('karak-settings-v1', JSON.stringify({ audioPreference: 'off' }));

    const service = TestBed.inject(SettingsService);

    expect(service.musicVolume()).toBe(0);
    expect(service.sfxVolume()).toBe(0);
    expect(service.audioPreference()).toBe('off');
  });
});
