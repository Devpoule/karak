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
import { DungeonService } from './dungeon.service';
import { TokenBagService } from './token-bag.service';

describe('GameService Portail de guérison', () => {
  let gameService: GameService;
  let playerService: PlayerService;
  let dungeonService: DungeonService;
  let turnService: TurnService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [GameService, PlayerService] });
    gameService = TestBed.inject(GameService);
    playerService = TestBed.inject(PlayerService);
    dungeonService = TestBed.inject(DungeonService);
    turnService = TestBed.inject(TurnService);
    playerService.initialize(2);
    gameService.initialize();
    gameService.phase.set('playing');
    gameService.activePlayerIndex.set(0);
  });

  function preparePortal(): { user: (typeof playerService.players)[number]; target: (typeof playerService.players)[number]; fountain: PlacedTile } {
    const user = playerService.players[0];
    const target = playerService.players[1];
    user.position = { x: 0, y: 0 };
    target.position = { x: 1, y: 0 };
    user.lives = 2;
    target.lives = 1;
    target.isCursed = true;
    playerService.addEquipment(user, getEquipmentDefinition('heart')!);
    const fountain: PlacedTile = {
      definitionId: 'healing-corner',
      x: 2,
      y: 0,
      rotation: 0,
    };
    dungeonService.tiles.push(fountain);
    return { user, target, fountain };
  }

  it('téléporte, soigne complètement, lève la malédiction et consomme le portail sans terminer le tour', () => {
    const { user, target, fountain } = preparePortal();
    turnService.remainingMovements.set(2);

    expect(gameService.useHealingPortal(target, fountain)).toBe(true);
    expect(target.position).toEqual({ x: 2, y: 0 });
    expect(target.lives).toBe(5);
    expect(target.isCursed).toBe(false);
    expect(user.inventory.spells.some(spell => spell?.effect === 'healing-portal')).toBe(false);
    expect(gameService.turnTransitionPending()).toBe(false);
    expect(turnService.remainingMovements()).toBe(2);
  });

  it('refuse une destination qui ne possède pas de fontaine sans consommer le portail', () => {
    const { user, target } = preparePortal();
    const invalidDestination: PlacedTile = { definitionId: 'straight-01', x: 3, y: 0, rotation: 0 };

    expect(gameService.useHealingPortal(target, invalidDestination)).toBe(false);
    expect(user.inventory.spells[0]?.effect).toBe('healing-portal');
    expect(target.position).toEqual({ x: 1, y: 0 });
  });

  it('refuse le portail pendant une résolution ou après la fin de partie', () => {
    const { target, fountain } = preparePortal();
    gameService.phase.set('game-over');

    expect(gameService.useHealingPortal(target, fountain)).toBe(false);
    expect(target.position).toEqual({ x: 1, y: 0 });
  });

  it('résout une inconscience pending sans accorder de tour ni de mouvement supplémentaire', () => {
    const { user, target, fountain } = preparePortal();
    target.lives = 0;
    target.recoveryState = 'pending';
    turnService.remainingMovements.set(1);

    expect(gameService.useHealingPortal(target, fountain)).toBe(true);
    expect(target.lives).toBe(5);
    expect(target.recoveryState).toBe('none');
    expect(turnService.remainingMovements()).toBe(1);
    expect(gameService.turnTransitionPending()).toBe(false);
    expect(user.inventory.spells.some(spell => spell?.effect === 'healing-portal')).toBe(false);
  });

  it('lève l’état resting sans déclencher un second tour', () => {
    const { target, fountain } = preparePortal();
    target.lives = 0;
    target.recoveryState = 'pending';
    expect(playerService.beginRecoveryTurn(target)).toBe(true);
    expect(target.recoveryState).toBe('resting');

    expect(gameService.useHealingPortal(target, fountain)).toBe(true);
    expect(target.lives).toBe(5);
    expect(target.recoveryState).toBe('none');
    expect(gameService.turnTransitionPending()).toBe(false);
  });
});

describe('GameService substitution de Xanros', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [GameService, PlayerService] });
  });

  it('échange les positions au début du tour et consomme les quatre mouvements', () => {
    const gameService = TestBed.inject(GameService);
    const playerService = TestBed.inject(PlayerService);
    const dungeonService = TestBed.inject(DungeonService);
    const turnService = TestBed.inject(TurnService);
    playerService.initialize(2);
    gameService.initialize();
    gameService.phase.set('playing');
    gameService.activePlayerIndex.set(0);
    const xanros = playerService.players[0];
    const target = playerService.players[1];
    xanros.heroId = 'xanros';
    xanros.position = { x: 0, y: 0 };
    target.position = { x: 1, y: 0 };
    dungeonService.tiles.push(
      { definitionId: 'start', x: 0, y: 0, rotation: 0 },
      { definitionId: 'room-1', x: 1, y: 0, rotation: 0 },
    );

    expect(gameService.canUseXanrosSubstitution).toBe(true);
    expect(gameService.openXanrosSubstitution()).toBe(true);
    expect(gameService.confirmXanrosSubstitution(target)).toBe(true);
    expect(xanros.position).toEqual({ x: 1, y: 0 });
    expect(target.position).toEqual({ x: 0, y: 0 });
    expect(turnService.remainingMovements()).toBe(0);
    expect(gameService.xanrosSubstitutionSelectionOpen()).toBe(false);
  });
});

describe('GameService Tisseuse de destin de Taia', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [GameService, PlayerService] });
  });

  it('tire deux jetons, place le choix et remet l’autre dans le sachet', () => {
    const gameService = TestBed.inject(GameService);
    const playerService = TestBed.inject(PlayerService);
    const dungeonService = TestBed.inject(DungeonService);
    const tokenBagService = TestBed.inject(TokenBagService);
    playerService.initialize(2);
    gameService.initialize();
    gameService.phase.set('playing');
    gameService.activePlayerIndex.set(0);
    const taia = playerService.players[0];
    taia.heroId = 'taia';
    const source = { definitionId: 'start', x: 0, y: 0, rotation: 0 } as PlacedTile;
    const destination = { definitionId: 'straight-room', x: 1, y: 0, rotation: 0 } as PlacedTile;
    dungeonService.tiles.push(source, destination);
    const rat = getTokenDefinition('giant-rat')!;
    const chest = getTokenDefinition('closed-chest')!;
    vi.spyOn(tokenBagService, 'draw')
      .mockReturnValueOnce(rat)
      .mockReturnValueOnce(chest);
    const returned = vi.spyOn(tokenBagService, 'returnToken');

    expect(gameService.resolveTileEntry(taia, source, destination, true)).toBe('token-choice');
    expect(destination.tokenId).toBeUndefined();
    expect(gameService.pendingTokenChoice()?.tokens.map(token => token.id)).toEqual(['giant-rat', 'closed-chest']);
    expect(gameService.choosePendingToken(1)).toBe(true);
    expect(destination.tokenId).toBe('closed-chest');
    expect(returned).toHaveBeenCalledWith('giant-rat');
    expect(gameService.pendingTokenChoice()).toBeNull();
    vi.restoreAllMocks();
  });
});

describe('GameService Inarrêtable de Victorius', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [GameService, PlayerService] });
  });

  it('restaure les mouvements suspendus après un combat autorisé', () => {
    const gameService = TestBed.inject(GameService);
    const playerService = TestBed.inject(PlayerService);
    const turnService = TestBed.inject(TurnService);
    playerService.initialize(2);
    gameService.initialize();
    gameService.phase.set('playing');
    gameService.activePlayerIndex.set(0);
    playerService.players[0].heroId = 'victorius';
    turnService.consumeMovement();
    turnService.stopMovements();

    expect(gameService.resumeMovementsAfterUnstoppable()).toBe(true);
    expect(turnService.remainingMovements()).toBe(3);
  });
});

describe('GameService Réincarnation de Horan', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [GameService, PlayerService] });
  });

  it('téléporte Horan à 0 PV vers une fontaine et le restaure complètement', () => {
    const gameService = TestBed.inject(GameService);
    const playerService = TestBed.inject(PlayerService);
    const dungeonService = TestBed.inject(DungeonService);
    playerService.initialize(2);
    gameService.initialize();
    gameService.phase.set('playing');
    const horan = playerService.players[0];
    horan.heroId = 'horan';
    horan.lives = 0;
    horan.recoveryState = 'pending';
    const fountain = { definitionId: 'healing-corner', x: 2, y: 1, rotation: 0 } as PlacedTile;
    dungeonService.tiles.push(fountain);

    expect(gameService.resolveHoranReincarnation(horan)).toBe(true);
    expect(horan.position).toEqual({ x: 0, y: 0 });
    expect(horan.lives).toBe(5);
    expect(horan.recoveryState).toBe('none');
  });
});

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
    expect(gameService.phase()).toBe('playing');
  });

  it('attribue le rubis du dragon avec sa valeur correcte', () => {
    prepareReward('dragon', [{ kind: 'treasure', tokenId: 'treasure' }]);
    expect(gameService.collectPendingTreasure()).toBe(true);
    expect(playerService.players[0].treasures).toEqual(['dragon-ruby']);
    expect(calculateTreasurePoints(playerService.players[0].treasures)).toBe(1.5);
    expect(gameService.phase()).toBe('game-over');
    expect(gameService.winners()).toEqual([playerService.players[0]]);
    expect(gameService.collectPendingTreasure()).toBe(false);
  });

  it('classe les joueurs selon leurs trésors, même si un autre joueur est premier', () => {
    playerService.addTreasure(playerService.players[1], 'opened-chest');
    playerService.addTreasure(playerService.players[1], 'monster-treasure');
    prepareReward('dragon', [{ kind: 'treasure', tokenId: 'treasure' }]);

    expect(gameService.collectPendingTreasure()).toBe(true);
    expect(gameService.finalRanking().map(entry => entry.points)).toEqual([2, 1.5]);
    expect(gameService.winners()).toEqual([playerService.players[1]]);
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

  it('conserve les mouvements restants lorsqu’un équipement au sol est refusé', () => {
    const player = playerService.players[0];
    const equipment = getEquipmentDefinition('sword')!;
    const tile = { x: 0, y: 0, definitionId: 'start' } as PlacedTile;
    gameService.pendingGroundEquipment.set({ player, tile, equipment, index: 0 });
    turnService.consumeMovement();

    expect(gameService.leaveGroundEquipment()).toBe(true);
    expect(gameService.pendingGroundEquipment()).toBeNull();
    expect(turnService.remainingMovements()).toBe(3);
    expect(gameService.turnTransitionPending()).toBe(false);
  });
});
