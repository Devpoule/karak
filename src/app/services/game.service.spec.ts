import { TestBed } from '@angular/core/testing';

import { DungeonService } from './dungeon.service';
import { GameService } from './game.service';

describe('GameService', () => {
  let service: GameService;
  let dungeonService: DungeonService;

  beforeEach(() => {
    TestBed.configureTestingModule({});

    service = TestBed.inject(GameService);
    dungeonService = TestBed.inject(DungeonService);
  });

  function prepareSetup(
    playerCount: number,
    firstPlayerIndex: number | null,
  ): void {
    service.initialize();
    service.initializePlayers(playerCount);
    service.drawHeroes();
    service.placeHeroesOnStart();

    if (firstPlayerIndex !== null) {
      service.firstPlayerIndex.set(
        firstPlayerIndex,
      );
    }
  }

  it('refuse de démarrer l aventure sans premier joueur désigné', () => {
    prepareSetup(2, null);

    service.startAdventure();

    expect(service.phase()).toBe('setup');
    expect(service.activePlayerIndex()).toBeNull();
  });

  it('fait du gagnant du lancer le joueur actif', () => {
    prepareSetup(2, 1);

    service.startAdventure();

    expect(service.activePlayerIndex()).toBe(1);
    expect(service.activePlayer).toBe(
      service.players[1],
    );
  });

  it('passe la partie en phase playing apres un démarrage valide', () => {
    prepareSetup(2, 0);

    service.startAdventure();

    expect(service.phase()).toBe('playing');
  });

  it('conserve les héros tirés au démarrage de l aventure', () => {
    prepareSetup(5, 3);

    const heroIdsBeforeStart =
      service.players.map(
        (player) => player.heroId,
      );

    service.startAdventure();

    expect(
      service.players.map(
        (player) => player.heroId,
      ),
    ).toEqual(heroIdsBeforeStart);
  });

  it('place tous les joueurs sur la tuile de départ au démarrage', () => {
    prepareSetup(5, 4);

    service.startAdventure();

    expect(
      service.players.every(
        (player) =>
          player.position?.x === 0
          && player.position?.y === 0,
      ),
    ).toBe(true);
  });

  it('conserve la tuile start en position 0,0', () => {
    prepareSetup(2, 1);

    service.startAdventure();

    expect(
      dungeonService.getTileAt(0, 0),
    ).toMatchObject({
      definitionId: 'start',
      x: 0,
      y: 0,
    });
  });

  it('démarre correctement une aventure avec 2 joueurs', () => {
    prepareSetup(2, 1);

    service.startAdventure();

    expect(service.players.length).toBe(2);
    expect(service.phase()).toBe('playing');
    expect(service.activePlayerIndex()).toBe(1);
  });

  it('démarre correctement une aventure avec 5 joueurs', () => {
    prepareSetup(5, 4);

    service.startAdventure();

    expect(service.players.length).toBe(5);
    expect(service.phase()).toBe('playing');
    expect(service.activePlayerIndex()).toBe(4);
  });
});
