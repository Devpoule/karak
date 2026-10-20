import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AudioService } from './audio.service';
import { SettingsService } from './settings.service';

class FakeAudioContext {
  static instances = 0;
  readonly state = 'running';
  readonly currentTime = 0;
  readonly destination = {} as AudioDestinationNode;
  readonly oscillator = {
    type: 'sine' as OscillatorType,
    frequency: { setValueAtTime: vi.fn() },
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  } as unknown as OscillatorNode;
  readonly gain = {
    gain: {
      setValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
    },
    connect: vi.fn(),
  } as unknown as GainNode;

  constructor() {
    FakeAudioContext.instances += 1;
  }

  createOscillator(): OscillatorNode { return this.oscillator; }
  createGain(): GainNode { return this.gain; }
  resume(): Promise<void> { return Promise.resolve(); }
}

describe('AudioService', () => {
  beforeEach(() => {
    FakeAudioContext.instances = 0;
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('reste silencieux lorsque les sons sont désactivés', () => {
    vi.stubGlobal('AudioContext', FakeAudioContext);
    const service = TestBed.inject(AudioService);

    service.play('notification');

    expect(FakeAudioContext.instances).toBe(0);
  });

  it('émet un signal court lorsque les sons sont activés', () => {
    vi.stubGlobal('AudioContext', FakeAudioContext);
    const settings = TestBed.inject(SettingsService);
    settings.setAudioPreference('on');
    const service = TestBed.inject(AudioService);

    service.play('notification');

    expect(FakeAudioContext.instances).toBe(1);
    const context = (service as unknown as { audioContext: FakeAudioContext }).audioContext;
    expect(context.oscillator.start).toHaveBeenCalledWith(0);
    expect(context.oscillator.stop).toHaveBeenCalledWith(0.12);
  });

  it('tolère un navigateur sans support Web Audio', () => {
    vi.stubGlobal('AudioContext', undefined);
    const settings = TestBed.inject(SettingsService);
    settings.setAudioPreference('on');

    expect(() => TestBed.inject(AudioService).play('notification')).not.toThrow();
  });
});
