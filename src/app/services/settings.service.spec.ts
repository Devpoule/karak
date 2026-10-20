import { TestBed } from '@angular/core/testing';
import { SettingsService } from './settings.service';

describe('SettingsService', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-karak-motion');
    document.documentElement.removeAttribute('data-karak-text-scale');
    TestBed.resetTestingModule();
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-karak-motion');
    document.documentElement.removeAttribute('data-karak-text-scale');
  });

  it('restaure et applique les préférences enregistrées', () => {
    localStorage.setItem('karak-settings-v1', JSON.stringify({
      motionPreference: 'reduced',
      textScale: 'large',
    }));

    const service = TestBed.inject(SettingsService);

    expect(service.motionPreference()).toBe('reduced');
    expect(service.textScale()).toBe('large');
    expect(document.documentElement.dataset['karakMotion']).toBe('reduced');
    expect(document.documentElement.dataset['karakTextScale']).toBe('large');
  });

  it('persiste les changements et les applique au document', () => {
    const service = TestBed.inject(SettingsService);

    service.setMotionPreference('reduced');
    service.setTextScale('large');

    expect(JSON.parse(localStorage.getItem('karak-settings-v1') ?? '{}')).toEqual({
      motionPreference: 'reduced',
      textScale: 'large',
    });
    expect(document.documentElement.dataset['karakMotion']).toBe('reduced');
    expect(document.documentElement.dataset['karakTextScale']).toBe('large');
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
  });
});
