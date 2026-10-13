import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { GameService } from './game.service';
import { PlayerService } from './player.service';

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
});
