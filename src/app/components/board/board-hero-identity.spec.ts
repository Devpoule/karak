import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { Board } from './board';
import { DungeonService } from '../../services/dungeon.service';
import { GameService } from '../../services/game.service';
import { PlayerService } from '../../services/player.service';

describe('identité chromatique des pions', () => {
  it('transmet la couleur du héros sans dépendre de J1/J2 ni du contrôleur', () => {
    TestBed.configureTestingModule({
      imports: [Board],
      providers: [GameService, PlayerService],
    });
    const fixture = TestBed.createComponent(Board);
    const gameService = TestBed.inject(GameService);
    const playerService = TestBed.inject(PlayerService);
    TestBed.inject(DungeonService);

    playerService.initialize(2);
    gameService.initialize();
    gameService.phase.set('playing');
    gameService.activePlayerIndex.set(0);

    const [firstPlayer, secondPlayer] = playerService.players;
    firstPlayer.heroId = 'taia';
    firstPlayer.controller = 'ai';
    secondPlayer.heroId = 'horan';
    secondPlayer.controller = 'human';
    firstPlayer.position = { x: 0, y: 0 };
    secondPlayer.position = { x: 0, y: 0 };
    fixture.detectChanges();

    const pawns = Array.from(fixture.nativeElement.querySelectorAll('.board__hero-pawn')) as HTMLElement[];
    expect(pawns).toHaveLength(2);
    expect(pawns.map(pawn => pawn.style.getPropertyValue('--hero-color')))
      .toEqual(['#FFD43B', '#789FC4']);
    fixture.destroy();
  });
});
