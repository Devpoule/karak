import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { GameService } from './game.service';
import { PlayerService } from './player.service';
import { TurnService } from './turn.service';
import { ExplorationService } from './exploration.service';

describe('GameService contrat de transition de tour', () => {
  let gameService: GameService;
  let playerService: PlayerService;
  let turnService: TurnService;
  let explorationService: ExplorationService;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({ providers: [GameService, PlayerService] });
    gameService = TestBed.inject(GameService);
    playerService = TestBed.inject(PlayerService);
    turnService = TestBed.inject(TurnService);
    explorationService = TestBed.inject(ExplorationService);
    playerService.initialize(3);
    gameService.initialize();
    gameService.phase.set('playing');
    gameService.activePlayerIndex.set(0);
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('passe au joueur suivant après la transition différée', () => {
    gameService.endTurn();

    expect(gameService.turnTransitionPending()).toBe(true);
    expect(gameService.activePlayerIndex()).toBe(0);
    vi.advanceTimersByTime(2799);
    expect(gameService.activePlayerIndex()).toBe(0);

    vi.advanceTimersByTime(1);
    expect(gameService.activePlayerIndex()).toBe(1);
    expect(turnService.remainingMovements()).toBe(4);
    expect(gameService.turnTransitionPending()).toBe(false);
  });

  it('refuse la transition lorsqu une exploration est encore en attente', () => {
    explorationService.pendingTile = {} as never;

    gameService.endTurn();

    expect(gameService.turnTransitionPending()).toBe(false);
    expect(gameService.activePlayerIndex()).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('rend un double appel à endTurn idempotent pendant la transition', () => {
    gameService.endTurn();
    gameService.endTurn();

    expect(vi.getTimerCount()).toBe(1);
    vi.advanceTimersByTime(2800);
    expect(gameService.activePlayerIndex()).toBe(1);
    expect(gameService.turnTransitionPending()).toBe(false);
  });

  it('annule le timer de transition lors d une réinitialisation', () => {
    gameService.endTurn();
    gameService.initialize();

    vi.advanceTimersByTime(2800);

    expect(gameService.phase()).toBe('setup');
    expect(gameService.activePlayerIndex()).toBeNull();
    expect(gameService.turnTransitionPending()).toBe(false);
  });

  it('ignore le callback si la partie se termine avant son expiration', () => {
    gameService.endTurn();
    gameService.phase.set('game-over');

    vi.advanceTimersByTime(2800);

    expect(gameService.activePlayerIndex()).toBe(0);
    expect(gameService.turnTransitionPending()).toBe(false);
    expect(turnService.remainingMovements()).toBe(0);
  });

  it('ignore le callback si la phase change avant son expiration', () => {
    gameService.endTurn();
    gameService.phase.set('setup');

    vi.advanceTimersByTime(2800);

    expect(gameService.activePlayerIndex()).toBe(0);
    expect(gameService.turnTransitionPending()).toBe(false);
  });

  it('prépare le tour de récupération sans rendre les mouvements disponibles', async () => {
    playerService.players[1].recoveryState = 'pending';
    playerService.players[1].lives = 0;

    gameService.endTurn();
    vi.advanceTimersByTime(2800);
    await Promise.resolve();

    expect(gameService.activePlayerIndex()).toBe(1);
    expect(playerService.players[1].recoveryState).toBe('resting');
    expect(turnService.remainingMovements()).toBe(0);
  });

  it('conserve l ordre circulaire des joueurs', () => {
    gameService.activePlayerIndex.set(2);
    gameService.endTurn();
    vi.advanceTimersByTime(2800);
    expect(gameService.activePlayerIndex()).toBe(0);

    gameService.endTurn();
    vi.advanceTimersByTime(2800);
    expect(gameService.activePlayerIndex()).toBe(1);
  });

  it('ne crée pas de transition depuis une phase terminée', () => {
    gameService.phase.set('game-over');

    gameService.endTurn();

    expect(gameService.turnTransitionPending()).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('bloque un second passage tant que le joueur suivant n est pas installé', () => {
    gameService.endTurn();
    expect(() => gameService.endTurn()).not.toThrow();
    expect(gameService.turnTransitionPending()).toBe(true);

    vi.advanceTimersByTime(2800);
    expect(gameService.activePlayerIndex()).toBe(1);
  });
});
