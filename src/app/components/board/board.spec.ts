import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Board } from './board';
import { PlayerService } from '../../services/player.service';
import { GameService } from '../../services/game.service';
import { HeroId } from '../../models/hero';

describe('Board', () => {
  let component: Board;
  let fixture: ComponentFixture<Board>;
  let playerService: PlayerService;
  let gameService: GameService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Board],
    }).compileComponents();

    playerService = TestBed.inject(PlayerService);
    gameService = TestBed.inject(GameService);
    fixture = TestBed.createComponent(Board);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  function preparePlayers(
    playerCount: number,
  ): void {
    playerService.initialize(playerCount);

    const heroIds: HeroId[] = [
      'argentus',
      'taia',
      'aderyn',
      'victorius',
      'xanros',
    ];

    playerService.players.forEach(
      (player, playerIndex) => {
        player.heroId =
          heroIds[playerIndex];
        player.facing = 'south';
      },
    );
  }

  function placePlayer(
    playerIndex: number,
    x: number,
    y: number,
  ): void {
    playerService.players[
      playerIndex
    ].position = {
      x,
      y,
    };
  }

  function getOccupancyAt(
    x: number,
    y: number,
  ) {
    return component.tileOccupancies.find(
      (occupancy) =>
        occupancy.x === x
        && occupancy.y === y,
    );
  }

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('représente les participants réels et non le joueur prototype', () => {
    expect(component.boardPlayers.length).toBe(0);

    preparePlayers(2);
    placePlayer(0, 0, 0);
    placePlayer(1, 0, 0);

    expect(component.boardPlayers).toEqual(
      playerService.players,
    );
  });

  it('affiche le pion du seul occupant d une tuile', () => {
    preparePlayers(2);
    placePlayer(0, 0, 0);
    placePlayer(1, 1, 0);
    gameService.activePlayerIndex.set(1);

    const occupancy =
      getOccupancyAt(0, 0);

    expect(
      occupancy?.primary.playerIndex,
    ).toBe(0);
    expect(occupancy?.markers).toEqual([]);
  });

  it('affiche le pion du joueur actif lorsque celui ci occupe la tuile', () => {
    preparePlayers(3);
    placePlayer(0, 0, 0);
    placePlayer(1, 0, 0);
    placePlayer(2, 0, 0);
    gameService.activePlayerIndex.set(1);

    const occupancy =
      getOccupancyAt(0, 0);

    expect(
      occupancy?.primary.playerIndex,
    ).toBe(1);
  });

  it('affiche le prochain occupant selon la rotation lorsque le joueur actif est absent', () => {
    preparePlayers(5);
    placePlayer(0, 0, 0);
    placePlayer(1, 0, 0);
    placePlayer(2, 2, 0);
    placePlayer(3, 1, 0);
    placePlayer(4, 1, 0);
    gameService.activePlayerIndex.set(2);

    expect(
      getOccupancyAt(0, 0)
        ?.primary.playerIndex,
    ).toBe(0);

    expect(
      getOccupancyAt(1, 0)
        ?.primary.playerIndex,
    ).toBe(3);
  });

  it('gère une rotation passant de J5 à J1', () => {
    preparePlayers(5);
    placePlayer(0, 0, 0);
    placePlayer(1, 0, 0);
    placePlayer(4, 2, 0);
    gameService.activePlayerIndex.set(4);

    expect(
      getOccupancyAt(0, 0)
        ?.primary.playerIndex,
    ).toBe(0);
  });

  it('représente les autres occupants sous forme de marqueurs Jx', () => {
    preparePlayers(3);
    placePlayer(0, 0, 0);
    placePlayer(1, 0, 0);
    placePlayer(2, 0, 0);
    gameService.activePlayerIndex.set(0);

    const occupancy =
      getOccupancyAt(0, 0);

    expect(
      occupancy?.markers.map(
        (marker) => marker.label,
      ),
    ).toEqual(['J2', 'J3']);
  });

  it('recalcule la représentation quand activePlayerIndex change', () => {
    preparePlayers(3);
    placePlayer(0, 0, 0);
    placePlayer(1, 0, 0);
    placePlayer(2, 0, 0);

    gameService.activePlayerIndex.set(0);

    expect(
      getOccupancyAt(0, 0)
        ?.primary.playerIndex,
    ).toBe(0);

    gameService.activePlayerIndex.set(2);

    expect(
      getOccupancyAt(0, 0)
        ?.primary.playerIndex,
    ).toBe(2);
  });

  it('revient à un pion normal lorsqu il ne reste qu un occupant', () => {
    preparePlayers(2);
    placePlayer(0, 0, 0);
    placePlayer(1, 0, 0);
    gameService.activePlayerIndex.set(0);

    expect(
      getOccupancyAt(0, 0)
        ?.markers.length,
    ).toBe(1);

    placePlayer(1, 1, 0);

    expect(
      getOccupancyAt(0, 0)
        ?.primary.playerIndex,
    ).toBe(0);
    expect(
      getOccupancyAt(0, 0)
        ?.markers,
    ).toEqual([]);
  });

  it('ne modifie pas les coordonnées métier des joueurs pour les afficher', () => {
    preparePlayers(3);
    placePlayer(0, 0, 0);
    placePlayer(1, 0, 0);
    placePlayer(2, 0, 0);
    gameService.activePlayerIndex.set(1);

    const positionsBeforeRender =
      playerService.players.map(
        (player) => ({
          ...player.position,
        }),
      );

    component.tileOccupancies;

    expect(
      playerService.players.map(
        (player) => ({
          ...player.position,
        }),
      ),
    ).toEqual(positionsBeforeRender);
  });
});
