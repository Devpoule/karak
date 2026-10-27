import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PlacedTile } from '../models/tile';
import { CombatService } from './combat.service';
import { DungeonService } from './dungeon.service';
import { ExplorationService } from './exploration.service';
import { GameService } from './game.service';
import { PlayerService } from './player.service';
import { TileDeckService } from './tile-deck.service';
import { TokenBagService } from './token-bag.service';
import { TurnService } from './turn.service';
import { TutorialScenarioService } from './tutorial-scenario.service';
import { TutorialSessionService } from './tutorial-session.service';

describe('TutorialSessionService', () => {
  let session: TutorialSessionService;
  let game: GameService;
  let dungeon: DungeonService;
  let players: PlayerService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        CombatService,
        DungeonService,
        ExplorationService,
        GameService,
        PlayerService,
        TileDeckService,
        TokenBagService,
        TurnService,
        TutorialScenarioService,
        TutorialSessionService,
      ],
    });
    session = TestBed.inject(TutorialSessionService);
    game = TestBed.inject(GameService);
    dungeon = TestBed.inject(DungeonService);
    players = TestBed.inject(PlayerService);
  });

  afterEach(() => TestBed.resetTestingModule());

  it('prépare un seul héros humain, sans passer par la configuration normale', () => {
    session.initialize();

    expect(game.phase()).toBe('playing');
    expect(players.players).toHaveLength(1);
    expect(players.players[0]).toMatchObject({
      controller: 'human',
      heroId: 'argentus',
      lives: 5,
      position: { x: 0, y: 0 },
    });
    expect(players.players[0].inventory).toEqual({ weapons: [null, null], spells: [null, null, null], key: null });
    expect(dungeon.tiles).toEqual([{ definitionId: 'start', x: 0, y: 0, rotation: 0 }]);
  });

  it('révèle les contenus scénarisés et conserve un déplacement légal alternatif', () => {
    session.initialize();
    const player = players.players[0];
    const start = dungeon.getTileAt(0, 0)!;
    const shortcut: PlacedTile = { definitionId: 'straight-01', x: 1, y: 0, rotation: 0 };
    const spiderRoom: PlacedTile = { definitionId: 'straight-room', x: 0, y: 3, rotation: 0 };
    const emptyRoom: PlacedTile = { definitionId: 'corner-room', x: 2, y: 5, rotation: 0 };
    dungeon.placeTile(shortcut);
    dungeon.placeTile(spiderRoom);
    dungeon.placeTile(emptyRoom);

    expect(game.canMoveTo(player, start, shortcut)).toBe(true);
    game.revealNewRoom(spiderRoom);
    game.revealNewRoom(emptyRoom);

    expect(spiderRoom).toMatchObject({ tokenId: 'giant-spider', tokenFace: 'front' });
    expect(emptyRoom.tokenId).toBeUndefined();
  });

  it('synchronise le guidage avec les trois actions d’exploration', () => {
    session.initialize();
    expect(session.guidanceStep()).toBe('explore-direction');

    const start = dungeon.getTileAt(0, 0)!;
    const exploration = TestBed.inject(ExplorationService);
    exploration.start(start);
    exploration.changePendingDirection('south');
    expect(session.guidanceStep()).toBe('explore-rotate');

    exploration.rotatePendingTile();
    expect(session.guidanceStep()).toBe('explore-confirm');
  });
});

