import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { HeroPanel } from './hero-panel';
import { Player } from '../../models/player';
import { PlayerService } from '../../services/player.service';

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

  it('conserve le voile pendant le tour de récupération', () => {
    const fixture = createPanel('resting');

    expect(fixture.nativeElement.querySelector('.hero-panel--unconscious')).not.toBeNull();
  });

  it('dissipe le voile lorsque le héros peut rejouer', () => {
    const fixture = createPanel('resting');
    fixture.componentRef.setInput('player', { recoveryState: 'none' } as Player);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.hero-panel--unconscious')).toBeNull();
  });

  it('réaffiche le médaillon quand la malédiction métier change sans remplacer le joueur', async () => {
    TestBed.configureTestingModule({ imports: [HeroPanel] });
    const fixture = TestBed.createComponent(HeroPanel);
    const playerService = TestBed.inject(PlayerService);
    playerService.initialize(2);
    const player = playerService.players[0];
    player.heroId = 'aderyn';
    fixture.componentInstance.player = player;
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.hero-panel__curse')).toBeNull();

    playerService.setCursed(player, true);
    await fixture.whenStable();
    fixture.detectChanges();

    const curse = fixture.nativeElement.querySelector('.hero-panel__curse');
    expect(curse).not.toBeNull();
    expect(curse.classList.contains('hero-panel__curse--appearing')).toBe(true);
  });

  it('conserve le médaillon pendant sa dissipation puis le retire après la levée', async () => {
    TestBed.configureTestingModule({ imports: [HeroPanel] });
    const fixture = TestBed.createComponent(HeroPanel);
    const playerService = TestBed.inject(PlayerService);
    playerService.initialize(2);
    const player = playerService.players[0];
    player.heroId = 'victorius';
    fixture.componentInstance.player = player;
    playerService.setCursed(player, true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.hero-panel__curse--appearing')).toBeNull();

    playerService.setCursed(player, false);
    await fixture.whenStable();
    fixture.detectChanges();

    const curse = fixture.nativeElement.querySelector('.hero-panel__curse');
    expect(curse).not.toBeNull();
    expect(curse.classList.contains('hero-panel__curse--disappearing')).toBe(true);

    await new Promise(resolve => setTimeout(resolve, 850));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.hero-panel__curse')).toBeNull();
  });
});
