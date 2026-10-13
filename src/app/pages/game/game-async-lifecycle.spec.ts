import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Game } from './game';

describe('Game cadence IA et cycle de vie asynchrone', () => {
  let game: Game;
  let state: {
    phase: ReturnType<typeof signal<'playing' | 'setup'>>;
    activePlayerIndex: ReturnType<typeof signal<number | null>>;
    recoveryRevision: ReturnType<typeof signal<number>>;
    turnTransitionPending: ReturnType<typeof signal<boolean>>;
    activePlayer: { controller: 'ai' };
    hasPendingTileResolution: boolean;
  };
  let aiService: { playAction: ReturnType<typeof vi.fn>; resolveMandatoryAction: ReturnType<typeof vi.fn> };
  let combatService: {
    pendingCombat: ReturnType<typeof vi.fn>;
    lastCombatResult: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.useFakeTimers();
    state = {
      phase: signal<'playing' | 'setup'>('playing'),
      activePlayerIndex: signal<number | null>(0),
      recoveryRevision: signal(0),
      turnTransitionPending: signal(false),
      activePlayer: { controller: 'ai' },
      hasPendingTileResolution: false,
    };
    aiService = {
      playAction: vi.fn(() => false),
      resolveMandatoryAction: vi.fn(() => 'waiting'),
    };
    combatService = {
      pendingCombat: vi.fn(() => null),
      lastCombatResult: vi.fn(() => null),
    };

    TestBed.configureTestingModule({});
    game = TestBed.runInInjectionContext(() => new Game(
      state as never,
      aiService as never,
      combatService as never,
    ));
  });

  afterEach(() => {
    game.ngOnDestroy();
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('ignore une action différée après changement de joueur', async () => {
    const run = (game as unknown as { runAiTurn: () => Promise<void> }).runAiTurn();

    await vi.advanceTimersByTimeAsync(2500);
    expect(aiService.playAction).toHaveBeenCalledTimes(1);

    state.activePlayerIndex.set(1);
    await vi.advanceTimersByTimeAsync(1800);
    await run;

    expect(aiService.playAction).toHaveBeenCalledTimes(1);
  });

  it('rend inoffensive une action différée après destruction du composant', async () => {
    const run = (game as unknown as { runAiTurn: () => Promise<void> }).runAiTurn();

    game.ngOnDestroy();
    await vi.advanceTimersByTimeAsync(10_000);
    await run;

    expect(aiService.playAction).not.toHaveBeenCalled();
  });

  it('ne lance pas deux boucles IA concurrentes pour le même tour', async () => {
    const run = (game as unknown as { runAiTurn: () => Promise<void> }).runAiTurn();
    const concurrentRun = (game as unknown as { runAiTurn: () => Promise<void> }).runAiTurn();

    await vi.advanceTimersByTimeAsync(2500);
    state.phase.set('setup');
    game.ngOnDestroy();
    await vi.advanceTimersByTimeAsync(2000);
    await Promise.all([run, concurrentRun]);

    expect(aiService.playAction).toHaveBeenCalledTimes(1);
  });

  it('attend la résolution obligatoire sans déplacer l IA', async () => {
    state.hasPendingTileResolution = true;
    const run = (game as unknown as { runAiTurn: () => Promise<void> }).runAiTurn();

    await vi.advanceTimersByTimeAsync(1000);
    expect(aiService.playAction).not.toHaveBeenCalled();
    expect(aiService.resolveMandatoryAction).toHaveBeenCalled();

    state.phase.set('setup');
    await vi.advanceTimersByTimeAsync(1000);
    await run;
  });
});
