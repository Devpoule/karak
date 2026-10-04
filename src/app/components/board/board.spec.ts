import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Board } from './board';
import { PlayerService } from '../../services/player.service';

describe('Board', () => {
  let component: Board;
  let fixture: ComponentFixture<Board>;
  let playerService: PlayerService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Board],
    }).compileComponents();

    playerService = TestBed.inject(PlayerService);
    fixture = TestBed.createComponent(Board);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('représente les participants réels et non le joueur prototype', () => {
    expect(component.boardPlayers.length).toBe(0);

    playerService.initialize(2);

    playerService.players[0].heroId = 'argentus';
    playerService.players[0].position = {
      x: 0,
      y: 0,
    };
    playerService.players[0].facing = 'south';

    playerService.players[1].heroId = 'taia';
    playerService.players[1].position = {
      x: 0,
      y: 0,
    };
    playerService.players[1].facing = 'south';

    expect(component.boardPlayers).toEqual(
      playerService.players,
    );
  });
});
