import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { LifePanel } from './life-panel';
import { PlayerService } from '../../services/player.service';

describe('LifePanel feedback de perte de vie', () => {
  function createPanel() {
    TestBed.configureTestingModule({
      imports: [LifePanel],
      providers: [PlayerService],
    });
    const fixture = TestBed.createComponent(LifePanel);
    const playerService = TestBed.inject(PlayerService);
    playerService.initialize(2);
    fixture.componentInstance.player = playerService.players[0];
    fixture.detectChanges();
    return { fixture, player: playerService.players[0], playerService };
  }

  it('anime le groupe et les cœurs après une perte réelle', () => {
    const { fixture, playerService, player } = createPanel();
    playerService.loseLife(player);
    fixture.componentInstance.ngDoCheck();
    fixture.detectChanges();

    expect(fixture.componentInstance.feedback).toBe('damage');
    expect(fixture.nativeElement.querySelector('.life-panel--damage')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.life-panel__impulse')).not.toBeNull();
    expect(fixture.nativeElement.querySelectorAll('.life-panel__point--changed')).toHaveLength(1);
  });

  it('signale plusieurs pertes sans multiplier les groupes animés', () => {
    const { fixture, playerService, player } = createPanel();
    playerService.loseLife(player, 2);
    fixture.componentInstance.ngDoCheck();
    fixture.detectChanges();

    expect(fixture.componentInstance.feedback).toBe('damage');
    expect(fixture.nativeElement.querySelectorAll('.life-panel__impulse')).toHaveLength(1);
    expect(fixture.nativeElement.querySelectorAll('.life-panel__point--changed')).toHaveLength(2);
    expect(fixture.nativeElement.querySelectorAll('.life-panel__slots')).toHaveLength(1);
  });

  it('ne déclenche pas de perte à l’initialisation, lors d’une guérison ou sans nouvelle variation', () => {
    const { fixture, playerService, player } = createPanel();
    expect(fixture.componentInstance.feedback).toBeNull();

    playerService.loseLife(player);
    fixture.componentInstance.ngDoCheck();
    fixture.detectChanges();
    player.lives = 5;
    playerService.livesRevision.update(value => value + 1);
    fixture.componentInstance.ngDoCheck();
    fixture.detectChanges();
    expect(fixture.componentInstance.feedback).toBe('heal');

    fixture.detectChanges();
    expect(fixture.componentInstance.feedback).toBe('heal');
  });

  it('réinitialise le feedback lors du changement de joueur', () => {
    const { fixture, playerService, player } = createPanel();
    playerService.loseLife(player);
    fixture.detectChanges();
    fixture.componentInstance.player = playerService.players[1];
    fixture.detectChanges();

    expect(fixture.componentInstance.feedback).toBeNull();
  });
});
