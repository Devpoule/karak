import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GameService } from '../../services/game.service';
import { PlayerService } from '../../services/player.service';
import { PlayerHud } from './player-hud';

describe('PlayerHud', () => {
  let component: PlayerHud;
  let fixture: ComponentFixture<PlayerHud>;
  let gameService: GameService;
  let playerService: PlayerService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlayerHud],
    }).compileComponents();

    gameService = TestBed.inject(GameService);
    playerService = TestBed.inject(PlayerService);
    fixture = TestBed.createComponent(PlayerHud);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('expose les données correspondant au joueur actif courant', () => {
    playerService.initialize(2);

    playerService.players[0].heroId = 'argentus';
    playerService.players[1].heroId = 'taia';

    gameService.activePlayerIndex.set(0);

    expect(
      component.activePlayer?.heroId,
    ).toBe('argentus');

    gameService.activePlayerIndex.set(1);

    expect(
      component.activePlayer?.heroId,
    ).toBe('taia');
  });
});
