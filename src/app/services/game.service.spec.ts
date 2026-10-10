import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getEquipmentDefinition } from '../data/equipment-definitions';
import { getTokenDefinition } from '../data/token-definitions';
import { PlacedTile } from '../models/tile';
import { calculateTreasurePoints } from '../models/treasure';
import { MonsterReward, MonsterTokenDefinition } from '../models/token';
import { GameService, PendingReward } from './game.service';
import { PlayerService } from './player.service';
import { TurnService } from './turn.service';

describe('GameService coffre fermé', () => {
  let gameService: GameService;
  let playerService: PlayerService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [GameService, PlayerService] });
    gameService = TestBed.inject(GameService);
    playerService = TestBed.inject(PlayerService);
    playerService.initialize(2);
    gameService.initialize();
    gameService.phase.set('playing');
    gameService.activePlayerIndex.set(0);
  });

  function closedChestTile(): PlacedTile {
    return {
      x: 1,
      y: 0,
      definitionId: 'room-1',
      tokenId: 'closed-chest',
      tokenFace: 'front',
    } as PlacedTile;
  }

  function preparePendingChest(): { player: (typeof playerService.players)[number]; tile: PlacedTile } {
    const player = playerService.players[0];
    const tile = closedChestTile();
    gameService.resolveTileEntry(player, { x: 0, y: 0 } as PlacedTile, tile);
    return { player, tile };
  }

  it('consomme la clé, attribue le trésor, retire le coffre et termine le tour', () => {
    const key = getEquipmentDefinition('key');
    expect(key).toBeDefined();
    playerService.addEquipment(playerService.players[0], key!);
    const { player, tile } = preparePendingChest();

    expect(gameService.openPendingTreasure()).toBe(true);
    expect(player.inventory.key).toBeNull();
    expect(player.treasures).toEqual(['opened-chest']);
    expect(tile.tokenId).toBeUndefined();
    expect(tile.tokenFace).toBeUndefined();
    expect(gameService.pendingTreasure()).toBeNull();
    expect(gameService.turnTransitionPending()).toBe(true);
  });

  it('laisse le coffre disponible sans clé', () => {
    const { player, tile } = preparePendingChest();

    expect(gameService.openPendingTreasure()).toBe(false);
    expect(player.treasures).toEqual([]);
    expect(tile.tokenId).toBe('closed-chest');
    expect(gameService.pendingTreasure()).toBeNull();
  });

  it('refuse une résolution par un joueur inactif', () => {
    const key = getEquipmentDefinition('key');
    playerService.addEquipment(playerService.players[0], key!);
    preparePendingChest();
    gameService.activePlayerIndex.set(1);

    expect(gameService.openPendingTreasure()).toBe(false);
    expect(playerService.players[0].inventory.key).toBe(key);
    expect(playerService.players[0].treasures).toEqual([]);
  });

  it('ne peut pas ouvrir deux fois et conserve les équipements au sol', () => {
    const key = getEquipmentDefinition('key');
    const weapon = getEquipmentDefinition('sword');
    playerService.addEquipment(playerService.players[0], key!);
    playerService.addEquipment(playerService.players[0], weapon!);
    playerService.players[0].position = { x: 0, y: 0 };
    expect(gameService.dropInventoryEquipment(playerService.players[0], 'weapon', 0)).toBe(true);
    const { tile } = preparePendingChest();
    const groundBefore = gameService.getGroundEquipment(tile);
    expect(gameService.openPendingTreasure()).toBe(true);
    expect(gameService.openPendingTreasure()).toBe(false);
    expect(tile.tokenId).toBeUndefined();
    expect(gameService.getGroundEquipment(tile)).toEqual(groundBefore);
  });
});

describe('GameService résolution automatique des malédictions', () => {
  let gameService: GameService;
  let playerService: PlayerService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [GameService, PlayerService] });
    gameService = TestBed.inject(GameService);
    playerService = TestBed.inject(PlayerService);
    playerService.initialize(2);
    gameService.initialize();
    gameService.phase.set('playing');
    gameService.activePlayerIndex.set(0);
  });

  function pendingCurse(): PendingReward {
    const player = playerService.players[0];
    const tile = { x: 1, y: 0 } as PlacedTile;
    return {
      player,
      monster: getTokenDefinition('skeleton-mummy') as MonsterTokenDefinition,
      rewardTile: tile,
      sourceTile: { x: 0, y: 0 } as PlacedTile,
      remainingRewards: [{ kind: 'special', effect: 'curse' }],
    };
  }

  it('identifie l’unique cible légale et permet sa résolution directe', () => {
    gameService.pendingReward.set(pendingCurse());

    expect(gameService.getPendingCurseTargets()).toEqual([playerService.players[1]]);
    expect(gameService.resolvePendingCurse(playerService.players[1])).toBe(true);
    expect(playerService.players[1].isCursed).toBe(true);
    expect(gameService.pendingReward()).toBeNull();
  });

  it('conserve la malédiction d’une cible déjà maudite sans cumul', () => {
    playerService.players[1].isCursed = true;
    gameService.pendingReward.set(pendingCurse());

    expect(gameService.resolvePendingCurse(playerService.players[1])).toBe(true);
    expect(playerService.players[1].isCursed).toBe(true);
    expect(gameService.pendingReward()).toBeNull();
  });
});

describe('GameService tour de récupération', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [GameService, PlayerService] });
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it('termine automatiquement le repos d’un humain et passe au joueur suivant', async () => {
    const playerService = TestBed.inject(PlayerService);
    const gameService = TestBed.inject(GameService);
    playerService.initialize(2, 2);
    gameService.initialize();
    gameService.phase.set('playing');
    gameService.activePlayerIndex.set(0);
    const restingPlayer = playerService.players[0];
    restingPlayer.lives = 1;
    playerService.loseLife(restingPlayer);
    expect(playerService.beginRecoveryTurn(restingPlayer)).toBe(true);

    gameService.endTurn();
    vi.advanceTimersByTime(2800);
    await Promise.resolve();

    expect(gameService.activePlayerIndex()).toBe(1);
    expect(restingPlayer.recoveryState).toBe('none');
  });

  it('enchaîne deux tours de récupération sans double soin ni boucle', async () => {
    const playerService = TestBed.inject(PlayerService);
    const gameService = TestBed.inject(GameService);
    playerService.initialize(2, 1);
    gameService.initialize();
    gameService.phase.set('playing');
    gameService.activePlayerIndex.set(0);
    const first = playerService.players[0];
    const second = playerService.players[1];
    first.lives = 1;
    second.lives = 1;
    playerService.loseLife(first);
    playerService.loseLife(second);
    expect(playerService.beginRecoveryTurn(first)).toBe(true);

    gameService.endTurn();
    vi.advanceTimersByTime(2800);
    await Promise.resolve();
    vi.advanceTimersByTime(2800);
    await Promise.resolve();

    expect(first.lives).toBe(1);
    expect(second.lives).toBe(1);
    expect(gameService.activePlayerIndex()).toBe(0);
    expect(first.recoveryState).toBe('none');
    expect(second.recoveryState).toBe('none');
  });
});

describe('GameService récompenses trésor', () => {
  let gameService: GameService;
  let playerService: PlayerService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [GameService, PlayerService] });
    gameService = TestBed.inject(GameService);
    playerService = TestBed.inject(PlayerService);
    playerService.initialize(2);
    gameService.initialize();
    gameService.phase.set('playing');
    gameService.activePlayerIndex.set(0);
  });

  function prepareReward(tokenId: 'fallen' | 'dragon', remainingRewards: MonsterReward[]): void {
    const token = getTokenDefinition(tokenId);
    if (!token || token.kind !== 'monster') {
      throw new Error(`Expected monster token: ${tokenId}`);
    }
    gameService.pendingReward.set({
      player: playerService.players[0],
      monster: token as MonsterTokenDefinition,
      rewardTile: {
        x: 1,
        y: 0,
        definitionId: 'room-1',
        tokenId,
        tokenFace: 'back',
      } as PlacedTile,
      sourceTile: { x: 0, y: 0 } as PlacedTile,
      remainingRewards,
    });
  }

  it('attribue le trésor du Mort et le consomme une seule fois', () => {
    prepareReward('fallen', [{ kind: 'treasure', tokenId: 'open-chest' }]);
    expect(gameService.collectPendingTreasure()).toBe(true);
    expect(playerService.players[0].treasures).toEqual(['monster-treasure']);
    expect(gameService.pendingReward()).toBeNull();
    expect(gameService.collectPendingTreasure()).toBe(false);
  });

  it('attribue le rubis du dragon avec sa valeur correcte', () => {
    prepareReward('dragon', [{ kind: 'treasure', tokenId: 'treasure' }]);
    expect(gameService.collectPendingTreasure()).toBe(true);
    expect(playerService.players[0].treasures).toEqual(['dragon-ruby']);
    expect(calculateTreasurePoints(playerService.players[0].treasures)).toBe(1.5);
  });

  it('préserve les autres récompenses du jeton', () => {
    const equipmentReward = { kind: 'equipment', equipmentId: 'sword' } as const;
    prepareReward('fallen', [
      { kind: 'treasure', tokenId: 'open-chest' },
      equipmentReward,
    ]);

    expect(gameService.collectPendingTreasure()).toBe(true);
    expect(gameService.pendingReward()?.remainingRewards).toEqual([equipmentReward]);
    expect(playerService.players[0].treasures).toEqual(['monster-treasure']);
  });

  it('refuse la collecte par un joueur inactif', () => {
    prepareReward('dragon', [{ kind: 'treasure', tokenId: 'treasure' }]);
    gameService.activePlayerIndex.set(1);

    expect(gameService.collectPendingTreasure()).toBe(false);
    expect(playerService.players[0].treasures).toEqual([]);
    expect(gameService.pendingReward()).not.toBeNull();
  });
});

describe('GameService récupération automatique des équipements humains', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [GameService, PlayerService] });
  });

  it('récupère automatiquement une récompense lorsqu’un emplacement est libre', () => {
    const gameService = TestBed.inject(GameService);
    const playerService = TestBed.inject(PlayerService);
    playerService.initialize(2);
    gameService.initialize();
    gameService.phase.set('playing');
    gameService.activePlayerIndex.set(0);
    const player = playerService.players[0];
    const tile = {
      x: 1,
      y: 0,
      definitionId: 'room-1',
      tokenId: 'giant-rat',
      tokenFace: 'back',
    } as PlacedTile;

    gameService.resolveTileEntry(player, { x: 0, y: 0 } as PlacedTile, tile);

    expect(player.inventory.weapons[0]?.id).toBe('daggers');
    expect(gameService.pendingReward()).toBeNull();
  });

  it('conserve la résolution lorsque l’inventaire est plein', () => {
    const gameService = TestBed.inject(GameService);
    const playerService = TestBed.inject(PlayerService);
    playerService.initialize(2);
    gameService.initialize();
    gameService.phase.set('playing');
    gameService.activePlayerIndex.set(0);
    const player = playerService.players[0];
    playerService.addEquipment(player, getEquipmentDefinition('daggers')!);
    playerService.addEquipment(player, getEquipmentDefinition('sword')!);
    const tile = {
      x: 1,
      y: 0,
      definitionId: 'room-1',
      tokenId: 'giant-rat',
      tokenFace: 'back',
    } as PlacedTile;

    gameService.resolveTileEntry(player, { x: 0, y: 0 } as PlacedTile, tile);

    expect(gameService.pendingReward()).not.toBeNull();
    expect(player.inventory.weapons.map(item => item?.id)).toEqual(['daggers', 'sword']);
  });
});

describe('GameService audit coffre inaccessible', () => {
  let gameService: GameService;
  let playerService: PlayerService;
  let turnService: TurnService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [GameService, PlayerService] });
    gameService = TestBed.inject(GameService);
    playerService = TestBed.inject(PlayerService);
    turnService = TestBed.inject(TurnService);
    playerService.initialize(2);
    gameService.initialize();
    gameService.phase.set('playing');
    gameService.activePlayerIndex.set(0);
  });

  function chestTile(): PlacedTile {
    return {
      x: 1,
      y: 0,
      definitionId: 'room-1',
      tokenId: 'closed-chest',
      tokenFace: 'front',
    } as PlacedTile;
  }

  it('laisse les déplacements disponibles devant un coffre sans clé', () => {
    const player = playerService.players[0];
    const tile = chestTile();
    const result = gameService.resolveTileEntry(player, { x: 0, y: 0 } as PlacedTile, tile, true);

    expect(result).toBe('none');
    expect(gameService.pendingTreasure()).toBeNull();
    expect(gameService.hasPendingTileResolution).toBe(false);
    expect(turnService.remainingMovements()).toBe(4);
    expect(tile.tokenId).toBe('closed-chest');
  });

  it('interrompt les déplacements devant un coffre accessible avec une clé', () => {
    const player = playerService.players[0];
    const key = getEquipmentDefinition('key');
    playerService.addEquipment(player, key!);
    const tile = chestTile();

    expect(gameService.resolveTileEntry(player, { x: 0, y: 0 } as PlacedTile, tile)).toBe('treasure');
    expect(gameService.pendingTreasure()).not.toBeNull();
    expect(turnService.remainingMovements()).toBe(0);
  });

  it('ne bloque pas non plus un joueur IA sans clé', () => {
    const player = playerService.players[1];
    const tile = chestTile();

    expect(gameService.resolveTileEntry(player, { x: 0, y: 0 } as PlacedTile, tile)).toBe('none');
    expect(gameService.pendingTreasure()).toBeNull();
    expect(turnService.remainingMovements()).toBe(4);
  });
});
