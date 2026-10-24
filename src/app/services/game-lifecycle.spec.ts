import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { GameService } from './game.service';
import { PlayerService } from './player.service';
import { SaveEnvelopeV2 } from '../models/save';
import { getHeroDefinition } from '../data/hero-definitions';

describe('GameService cycle de vie', () => {
  function createService(): GameService {
    TestBed.configureTestingModule({ providers: [GameService, PlayerService] });
    return TestBed.inject(GameService);
  }

  it('initialise toujours une nouvelle partie en phase setup', () => {
    const service = createService();

    service.initialize();

    expect(service.isInitialized()).toBe(true);
    expect(service.phase()).toBe('setup');
    expect(service.setupStep()).toBe('player-count');
    expect(service.activePlayerIndex()).toBeNull();
    expect(service.firstPlayerIndex()).toBeNull();
  });

  it('refuse de modifier la composition après le début de la partie', () => {
    const service = createService();
    service.initialize();
    service.phase.set('playing');

    service.initializePlayers(3, 2);

    expect(service.setupStep()).toBe('player-count');
  });

  it('réinitialise les phases, joueurs et résolutions pendantes', () => {
    const service = createService();
    service.initialize();
    service.initializePlayers(2, 1);
    service.phase.set('playing');
    service.activePlayerIndex.set(0);
    service.pendingTokenChoice.set(null);

    service.initialize();

    expect(service.phase()).toBe('setup');
    expect(service.setupStep()).toBe('player-count');
    expect(service.activePlayerIndex()).toBeNull();
    expect(service.firstPlayerIndex()).toBeNull();
    expect(service.pendingTreasure()).toBeNull();
    expect(service.pendingReward()).toBeNull();
    expect(service.pendingGroundEquipment()).toBeNull();
    expect(service.pendingTokenChoice()).toBeNull();
  });

  it('restaure une partie stable sans recréer les réserves', () => {
    const service = createService();
    const envelope: SaveEnvelopeV2 = {
      schema: 'karak-save',
      version: 2,
      savedAt: new Date().toISOString(),
      payload: {
        phase: 'playing',
        setupStep: 'first-player-roll',
        players: [{
          controller: 'human',
          lives: 3,
          recoveryState: 'none',
          isCursed: false,
          heroId: 'argentus',
          position: { x: 0, y: 0 },
          facing: 'south',
          inventory: { weapons: [], spells: [], key: null },
          treasures: [],
        }, {
          controller: 'ai',
          lives: 5,
          recoveryState: 'none',
          isCursed: false,
          heroId: 'horan',
          position: { x: 0, y: 0 },
          facing: 'south',
          inventory: { weapons: [], spells: [], key: null },
          treasures: [],
        }],
        firstPlayerIndex: 0,
        activePlayerIndex: 0,
        firstPlayerRolls: [],
        firstPlayerContenders: [0, 1],
        dungeon: {
          tiles: [{ definitionId: 'start', x: 0, y: 0, rotation: 0 }],
          remainingTileIds: [],
          remainingTokenIds: [],
        },
        turn: { remainingMovements: 2, movementsMadeThisTurn: 2, suspendedMovements: null },
        pending: {},
        finalRanking: [],
      },
    };

    expect(service.restoreSavedGame(envelope)).toBe(true);
    expect(service.phase()).toBe('playing');
    expect(service.activePlayer?.heroId).toBe('argentus');
    expect(service.activePlayer?.heroId ? getHeroDefinition(service.activePlayer.heroId)?.identityColor : null)
      .toBe('#E2F1FF');
    expect(service.activePlayer?.lives).toBe(3);
  });
});
