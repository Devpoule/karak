import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { PlacedTile } from '../models/tile';
import { CombatService } from './combat.service';
import { DungeonService } from './dungeon.service';
import { ExplorationService } from './exploration.service';
import { GameService } from './game.service';
import { PlayerService } from './player.service';
import { TileDeckService } from './tile-deck.service';
import { ToastService } from './toast.service';
import { TokenBagService } from './token-bag.service';
import { TurnService } from './turn.service';

describe('GameService déplacement entre portails', () => {
  function createGame() {
    TestBed.configureTestingModule({
      providers: [
        GameService,
        PlayerService,
        DungeonService,
        TileDeckService,
        TokenBagService,
        ExplorationService,
        TurnService,
        CombatService,
        ToastService,
      ],
    });
    const game = TestBed.inject(GameService);
    const players = TestBed.inject(PlayerService);
    const dungeon = TestBed.inject(DungeonService);
    const turn = TestBed.inject(TurnService);
    players.initialize(2, 1);
    game.initialize();
    game.phase.set('playing');
    game.activePlayerIndex.set(0);
    players.players[0].heroId = 'argentus';
    players.players[0].position = { x: 0, y: 0 };
    return { game, players, dungeon, turn };
  }

  function portal(x: number, y: number): PlacedTile {
    return { definitionId: 'portal-straight-01', x, y, rotation: 0 };
  }

  it('refuse le voyage avec un seul portail et l’autorise entre deux portails pour un mouvement', () => {
    const { game, players, dungeon, turn } = createGame();
    const source = portal(0, 0);
    const destination = portal(4, 4);
    dungeon.tiles[0] = source;
    expect(game.canUsePortalTravel(players.players[0])).toBe(false);
    dungeon.tiles.push(destination);
    turn.resetMovements();

    expect(game.canUsePortalTravel(players.players[0])).toBe(true);
    expect(game.openPortalTravelSelection()).toBe(true);
    expect(game.portalTravelSelection()?.destinations).toEqual([destination]);
    expect(game.confirmPortalTravel()).toBe(true);
    expect(players.players[0].position).toEqual({ x: 4, y: 4 });
    expect(turn.remainingMovements()).toBe(3);
    expect(game.portalTravelSelection()).toBeNull();
  });

  it('refuse les conditions illégales et protège la confirmation répétée', () => {
    const { game, players, dungeon, turn } = createGame();
    const source = portal(0, 0);
    dungeon.tiles[0] = source;
    expect(game.canUsePortalTravel(players.players[0])).toBe(false);
    expect(game.openPortalTravelSelection()).toBe(false);

    dungeon.tiles.push(portal(2, 2));
    players.players[0].position = { x: 1, y: 1 };
    expect(game.openPortalTravelSelection()).toBe(false);

    players.players[0].position = { x: 0, y: 0 };
    turn.remainingMovements.set(0);
    expect(game.openPortalTravelSelection()).toBe(false);
    expect(game.confirmPortalTravel()).toBe(false);
  });

  it('ne résout pas la tuile d’arrivée et accepte un joueur IA actif', () => {
    const { game, players, dungeon, turn } = createGame();
    players.players[0].controller = 'ai';
    dungeon.tiles[0] = portal(0, 0);
    dungeon.tiles.push(portal(2, 2));
    turn.resetMovements();

    expect(game.openPortalTravelSelection()).toBe(true);
    expect(game.confirmPortalTravel()).toBe(true);
    expect(game.pendingTokenChoice()).toBeNull();
    expect(game.pendingReward()).toBeNull();
    expect(turn.movementsMadeThisTurn()).toBe(1);
  });
});
