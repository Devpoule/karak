import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { TOKEN_BAG_COMPOSITION } from '../data/token-bag';
import { HERO_DEFINITIONS } from '../data/hero-definitions';
import { DungeonService } from './dungeon.service';
import { GameService } from './game.service';
import { PlayerService } from './player.service';
import { TileDeckService } from './tile-deck.service';
import { TokenBagService } from './token-bag.service';
import { ExplorationService } from './exploration.service';
import { TurnService } from './turn.service';
import { CombatService } from './combat.service';
import { ToastService } from './toast.service';

describe('Recette 02 - préparation de partie', () => {
  function createServices() {
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
    return {
      game,
      players: TestBed.inject(PlayerService),
      dungeon: TestBed.inject(DungeonService),
      tiles: TestBed.inject(TileDeckService),
      tokens: TestBed.inject(TokenBagService),
    };
  }

  it('initialise la tuile de départ, la pioche et le sachet officiel', () => {
    const { game, dungeon, tiles, tokens } = createServices();

    game.initialize();

    expect(dungeon.tiles).toHaveLength(1);
    expect(dungeon.tiles[0]).toMatchObject({ definitionId: 'start', x: 0, y: 0, rotation: 0 });
    expect(tiles.remainingTiles).toBe(79);
    expect(tokens.remainingTokens()).toBe(53);
    expect(TOKEN_BAG_COMPOSITION.reduce((total, entry) => total + entry.count, 0)).toBe(53);

    const drawn = Array.from({ length: 53 }, () => tokens.draw()!.id);
    for (const entry of TOKEN_BAG_COMPOSITION) {
      expect(drawn.filter((id) => id === entry.definitionId)).toHaveLength(entry.count);
    }
  });

  it('accepte 2 à 5 joueurs et rejette les bornes hors règle', () => {
    const { game } = createServices();

    game.initializePlayers(2, 1);
    game.initialize();
    expect(game.players).toHaveLength(2);

    game.initializePlayers(5, 3);
    expect(game.players).toHaveLength(5);
    expect(game.players.filter((player) => player.controller === 'human')).toHaveLength(3);
    expect(game.players.filter((player) => player.controller === 'ai')).toHaveLength(2);

    game.initialize();
    game.initializePlayers(1, 1);
    expect(game.players).toHaveLength(5);
    game.initializePlayers(6, 1);
    expect(game.players).toHaveLength(5);
  });

  it('attribue un héros différent à chaque joueur et les place au départ', () => {
    const { game } = createServices();

    game.initialize();
    game.initializePlayers(5, 2);
    game.drawHeroes();
    const heroIds = game.players.map((player) => player.heroId);

    expect(heroIds).toHaveLength(5);
    expect(heroIds.every((heroId) => HERO_DEFINITIONS.some((hero) => hero.id === heroId))).toBe(true);
    expect(new Set(heroIds).size).toBe(5);

    game.placeHeroesOnStart();

    expect(game.players.every((player) => player.position?.x === 0 && player.position?.y === 0)).toBe(true);
  });

  it('réinitialise les états de manche et supprime les joueurs hérités', () => {
    const { game } = createServices();

    game.initializePlayers(2, 1);
    game.initialize();
    game.drawHeroes();
    game.placeHeroesOnStart();
    game.firstPlayerRolls.set([
      { playerIndex: 0, die1: 3, die2: 3, total: 6 },
      { playerIndex: 1, die1: 2, die2: 2, total: 4 },
    ]);
    game.activePlayerIndex.set(0);
    game.phase.set('playing');

    game.initialize();

    expect(game.phase()).toBe('setup');
    expect(game.setupStep()).toBe('player-count');
    expect(game.firstPlayerRolls()).toEqual([]);
    expect(game.activePlayerIndex()).toBeNull();
    expect(game.players).toHaveLength(0);
  });

  it('permet une nouvelle configuration sans accumulation ni héritage', () => {
    const { game } = createServices();

    game.initializePlayers(5, 4);
    game.initialize();
    game.drawHeroes();
    game.players[0].lives = 1;
    game.players[0].isCursed = true;
    game.initialize();
    game.initializePlayers(2, 0);

    expect(game.players).toHaveLength(2);
    expect(game.players.every((player) => player.controller === 'ai')).toBe(true);
    expect(game.players.every((player) => player.heroId === undefined)).toBe(true);
    expect(game.players.every((player) => player.lives === 5 && !player.isCursed)).toBe(true);
  });
});
