import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { GameService } from './game.service';
import { PlayerService } from './player.service';
import { TurnService } from './turn.service';

/** Scénarios déterministes de la recette INIT-013 à INIT-017. */
describe('Recette 01 - premier joueur', () => {
  afterEach(() => vi.restoreAllMocks());

  function prepare(playerCount: number, humanCount: number): GameService {
    TestBed.configureTestingModule({ providers: [GameService, PlayerService, TurnService] });
    const game = TestBed.inject(GameService);
    game.initialize();
    game.initializePlayers(playerCount, humanCount);
    game.drawHeroes();
    return game;
  }

  function dice(...values: number[]): ReturnType<typeof vi.spyOn> {
    const random = vi.spyOn(Math, 'random');
    for (const value of values) random.mockReturnValueOnce((value - 1) / 6);
    return random;
  }

  it('prépare tous les participants, y compris les IA, une seule fois', () => {
    const game = prepare(5, 2);
    expect(game.setupStep()).toBe('hero-draw');
    expect(game.firstPlayerContenders()).toEqual([]);

    game.continueAfterHeroDraw();
    game.continueAfterHeroDraw();

    expect(game.setupStep()).toBe('first-player-roll');
    expect(game.firstPlayerContenders()).toEqual([0, 1, 2, 3, 4]);
    expect(game.players.map(player => player.controller)).toEqual(['human', 'human', 'ai', 'ai', 'ai']);
    expect(game.firstPlayerRolls()).toEqual([]);
    expect(game.activePlayerIndex()).toBeNull();
  });

  it('enregistre deux dés bornés et leur somme sans relancer pour un double clic ou un index illégal', () => {
    const game = prepare(2, 1);
    game.continueAfterHeroDraw();
    const random = dice(1, 6, 6, 1);

    game.rollPlayerForFirstPlayer(0);
    game.rollPlayerForFirstPlayer(0);
    game.rollPlayerForFirstPlayer(-1);
    game.rollPlayerForFirstPlayer(2);
    expect(game.firstPlayerRolls()).toEqual([{ playerIndex: 0, die1: 1, die2: 6, total: 7 }]);
    expect(random).toHaveBeenCalledTimes(2);
    expect(game.resolveFirstPlayerRoll()).toBe('pending');
    expect(game.firstPlayerIndex()).toBeNull();

    game.rollPlayerForFirstPlayer(1);
    expect(game.firstPlayerRolls()[1]).toEqual({ playerIndex: 1, die1: 6, die2: 1, total: 7 });
    expect(random).toHaveBeenCalledTimes(4);
  });

  it('ne relance que les ex æquo au meilleur total et garde les autres résultats sans les compter', () => {
    const game = prepare(3, 1);
    game.continueAfterHeroDraw();
    const random = dice(3, 5, 6, 2, 1, 2, 4, 4, 3, 5, 2, 6, 6, 4);

    for (const playerIndex of [0, 1, 2]) game.rollPlayerForFirstPlayer(playerIndex);
    expect(game.resolveFirstPlayerRoll()).toBe('tie');
    expect(game.firstPlayerContenders()).toEqual([0, 1]);
    expect(game.firstPlayerRolls()).toEqual([{ playerIndex: 2, die1: 1, die2: 2, total: 3 }]);

    game.rollPlayerForFirstPlayer(2);
    expect(random).toHaveBeenCalledTimes(6);
    expect(game.resolveFirstPlayerRoll()).toBe('pending');

    game.rollPlayerForFirstPlayer(0);
    game.rollPlayerForFirstPlayer(1);
    expect(game.resolveFirstPlayerRoll()).toBe('tie');
    expect(game.firstPlayerContenders()).toEqual([0, 1]);
    expect(game.firstPlayerRolls()).toHaveLength(1);

    game.rollPlayerForFirstPlayer(0);
    game.rollPlayerForFirstPlayer(1);
    expect(game.resolveFirstPlayerRoll()).toBe('winner');
    expect(game.firstPlayerIndex()).toBe(1);
    expect(random).toHaveBeenCalledTimes(14);
    game.rollPlayerForFirstPlayer(1);
    expect(random).toHaveBeenCalledTimes(14);
  });

  it('active une seule fois le vainqueur avec quatre mouvements et l’ordre horaire des joueurs', () => {
    const game = prepare(3, 1);
    const turn = TestBed.inject(TurnService);
    game.continueAfterHeroDraw();
    game.startAdventure();
    expect(game.phase()).toBe('setup');

    dice(1, 1, 6, 6, 2, 2);
    for (const playerIndex of [0, 1, 2]) game.rollPlayerForFirstPlayer(playerIndex);
    expect(game.resolveFirstPlayerRoll()).toBe('winner');
    expect(game.firstPlayerIndex()).toBe(1);
    turn.consumeMovement();

    game.startAdventure();
    expect(game.phase()).toBe('playing');
    expect(game.activePlayerIndex()).toBe(1);
    expect(game.activePlayer).toBe(game.players[1]);
    expect(game.getTurnOrderFrom()).toEqual([1, 2, 0]);
    expect(turn.remainingMovements()).toBe(4);
    expect(turn.movementsMadeThisTurn()).toBe(0);
    expect(game.players.every(player => player.position?.x === 0 && player.position.y === 0)).toBe(true);

    turn.consumeMovement();
    game.startAdventure();
    expect(game.activePlayerIndex()).toBe(1);
    expect(turn.remainingMovements()).toBe(3);
    expect(turn.movementsMadeThisTurn()).toBe(1);
  });
});
