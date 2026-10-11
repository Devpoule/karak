import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { HeroPanel } from './hero-panel';
import { Player } from '../../models/player';

describe('HeroPanel brouillard d’inconscience', () => {
  function createPanel(recoveryState: Player['recoveryState']) {
    TestBed.configureTestingModule({ imports: [HeroPanel] });
    const fixture = TestBed.createComponent(HeroPanel);
    fixture.componentInstance.player = { recoveryState } as Player;
    fixture.detectChanges();
    return fixture;
  }

  it('affiche le voile pendant l’attente de récupération', () => {
    const fixture = createPanel('pending');

    expect(fixture.nativeElement.querySelector('.hero-panel--unconscious')).not.toBeNull();
  });

  it('conserve le voile pendant le tour de repos', () => {
    const fixture = createPanel('resting');

    expect(fixture.nativeElement.querySelector('.hero-panel--unconscious')).not.toBeNull();
  });

  it('dissipe le voile lorsque le héros peut rejouer', () => {
    const fixture = createPanel('resting');
    fixture.componentRef.setInput('player', { recoveryState: 'none' } as Player);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.hero-panel--unconscious')).toBeNull();
  });
});
