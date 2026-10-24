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
import { CombatService } from './combat.service';
import { ToastService } from './toast.service';
import { getHeroDefinition } from '../data/hero-definitions';

describe('GameService Portail de guérison', () => {
  let gameService: GameService;
  let playerService: PlayerService;
  let dungeonService: DungeonService;
  let turnService: TurnService;
  let toastService: ToastService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [GameService, PlayerService] });
    gameService = TestBed.inject(GameService);
    playerService = TestBed.inject(PlayerService);
    dungeonService = TestBed.inject(DungeonService);
    turnService = TestBed.inject(TurnService);
    toastService = TestBed.inject(ToastService);
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
    expect(toastService.current()?.text).toBe('+1 PV');
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

describe('GameService décision du sacrifice de Xanros', () => {
  let gameService: GameService;
  let playerService: PlayerService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [GameService, PlayerService] });
    gameService = TestBed.inject(GameService);
    playerService = TestBed.inject(PlayerService);
    playerService.initialize(2);
  });

  it('refuse le sacrifice lorsque Xanros est déjà strictement en tête', () => {
    const xanros = playerService.players[0];
    const opponent = playerService.players[1];
    xanros.heroId = 'xanros';
    playerService.addTreasure(xanros, 'monster-treasure');
    playerService.addTreasure(xanros, 'monster-treasure');
    playerService.addTreasure(opponent, 'opened-chest');

    expect(gameService.canUseXanrosSacrificeForScore(xanros)).toBe(false);
  });

  it('refuse le sacrifice lorsque le point supplémentaire resterait insuffisant', () => {
    const xanros = playerService.players[0];
    const opponent = playerService.players[1];
    xanros.heroId = 'xanros';
    playerService.addTreasure(xanros, 'opened-chest');
    playerService.addTreasure(opponent, 'monster-treasure');
    playerService.addTreasure(opponent, 'monster-treasure');
    playerService.addTreasure(opponent, 'opened-chest');

    expect(gameService.canUseXanrosSacrificeForScore(xanros)).toBe(false);
  });

  it('autorise le sacrifice lorsqu’il peut atteindre le meilleur score adverse', () => {
    const xanros = playerService.players[0];
    const opponent = playerService.players[1];
    xanros.heroId = 'xanros';
    playerService.addTreasure(xanros, 'monster-treasure');
    playerService.addTreasure(opponent, 'monster-treasure');
    playerService.addTreasure(opponent, 'monster-treasure');

    expect(gameService.canUseXanrosSacrificeForScore(xanros)).toBe(true);
  });
});

describe('GameService invariants de déplacement', () => {
  let gameService: GameService;
  let playerService: PlayerService;
  let turnService: TurnService;
  let dungeonService: DungeonService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [GameService, PlayerService] });
    gameService = TestBed.inject(GameService);
    playerService = TestBed.inject(PlayerService);
    turnService = TestBed.inject(TurnService);
    dungeonService = TestBed.inject(DungeonService);
    playerService.initialize(2);
    gameService.initialize();
    gameService.phase.set('playing');
    gameService.activePlayerIndex.set(0);
    turnService.resetMovements();
  });

  it('autorise le déplacement normal du joueur actif vivant', () => {
    expect(gameService.canPerformNormalMovement(playerService.players[0])).toBe(true);
  });

  it('refuse une destination identique sans modifier les invariants de déplacement', () => {
    const active = playerService.players[0];
    active.position = { x: 0, y: 0 };
    const movementsBefore = turnService.movementsMadeThisTurn();

    expect(gameService.canPerformNormalMovementTo(active, 0, 0)).toBe(false);
    expect(active.position).toEqual({ x: 0, y: 0 });
    expect(turnService.movementsMadeThisTurn()).toBe(movementsBefore);
    expect(gameService.activePlayer).toBe(active);
  });

  it('refuse un joueur inactif ou sans vie', () => {
    const active = playerService.players[0];
    const inactive = playerService.players[1];
    expect(gameService.canPerformNormalMovement(inactive)).toBe(false);
    active.lives = 0;
    active.recoveryState = 'pending';
    expect(gameService.canPerformNormalMovement(active)).toBe(false);
  });

  it('bloque les déplacements normaux pendant la sélection du portail', () => {
    const active = playerService.players[0];
    active.heroId = 'xanros';
    playerService.addEquipment(active, getEquipmentDefinition('heart')!);
    dungeonService.tiles.push({ definitionId: 'healing-corner', x: 2, y: 0, rotation: 0 });

    expect(gameService.openHealingPortalSelection()).toBe(true);
    expect(gameService.healingPortalSelection()?.target).toBe(active);
    expect(gameService.canPerformNormalMovement(active)).toBe(false);
    gameService.closeHealingPortalSelection();
    expect(gameService.canPerformNormalMovement(active)).toBe(true);
  });
});

describe('GameService substitution de Xanros', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [GameService, PlayerService] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('échange les positions au début du tour et consomme les quatre mouvements', () => {
    vi.useFakeTimers();
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
    expect(turnService.movementsMadeThisTurn()).toBe(4);
    expect(gameService.xanrosSubstitutionSelectionOpen()).toBe(false);
    expect(gameService.pendingXanrosSubstitutionAction()).toBeNull();
    expect(gameService.hasPendingTileResolution).toBe(false);
    expect(gameService.turnTransitionPending()).toBe(true);
    vi.runOnlyPendingTimers();
    expect(gameService.activePlayerIndex()).toBe(1);
  });

  it('ne résout pas automatiquement un monstre présent sur la tuile d’arrivée', () => {
    vi.useFakeTimers();
    const gameService = TestBed.inject(GameService);
    const playerService = TestBed.inject(PlayerService);
    const dungeonService = TestBed.inject(DungeonService);
    const combatService = TestBed.inject(CombatService);
    playerService.initialize(2);
    gameService.initialize();
    gameService.phase.set('playing');
    gameService.activePlayerIndex.set(0);
    const xanros = playerService.players[0];
    const target = playerService.players[1];
    xanros.heroId = 'xanros';
    xanros.position = { x: 0, y: 0 };
    target.position = { x: 1, y: 0 };
    const monsterTile = {
      definitionId: 'room-1',
      x: 1,
      y: 0,
      rotation: 0,
      tokenId: 'giant-rat',
      tokenFace: 'front',
    } as PlacedTile;
    dungeonService.tiles.push(
      { definitionId: 'start', x: 0, y: 0, rotation: 0 },
      monsterTile,
    );

    expect(gameService.openXanrosSubstitution()).toBe(true);
    expect(gameService.confirmXanrosSubstitution(target)).toBe(true);
    expect(combatService.pendingCombat()).toBeNull();
    expect(monsterTile.tokenId).toBe('giant-rat');
    expect(monsterTile.tokenFace).toBe('front');
    expect(gameService.pendingXanrosSubstitutionAction()).toBeNull();
    expect(gameService.turnTransitionPending()).toBe(true);
    vi.runOnlyPendingTimers();
  });

  it('laisse le coffre de la tuile d’arrivée à une interaction facultative explicite', () => {
    vi.useFakeTimers();
    const gameService = TestBed.inject(GameService);
    const playerService = TestBed.inject(PlayerService);
    const dungeonService = TestBed.inject(DungeonService);
    playerService.initialize(2);
    gameService.initialize();
    gameService.phase.set('playing');
    gameService.activePlayerIndex.set(0);
    const xanros = playerService.players[0];
    const target = playerService.players[1];
    xanros.heroId = 'xanros';
    xanros.position = { x: 0, y: 0 };
    target.position = { x: 1, y: 0 };
    playerService.addEquipment(xanros, getEquipmentDefinition('key')!);
    const chestTile = {
      definitionId: 'room-1',
      x: 1,
      y: 0,
      rotation: 0,
      tokenId: 'closed-chest',
      tokenFace: 'front',
    } as PlacedTile;
    dungeonService.tiles.push(
      { definitionId: 'start', x: 0, y: 0, rotation: 0 },
      chestTile,
    );

    expect(gameService.openXanrosSubstitution()).toBe(true);
    expect(gameService.confirmXanrosSubstitution(target)).toBe(true);
    expect(gameService.pendingTreasure()).toBeNull();
    expect(gameService.pendingXanrosSubstitutionAction()?.tile).toBe(chestTile);
    expect(gameService.openXanrosSubstitutionChest(chestTile)).toBe(true);
    expect(gameService.pendingXanrosSubstitutionAction()).toBeNull();
    expect(gameService.pendingTreasure()).not.toBeNull();
    expect(chestTile.tokenId).toBe('closed-chest');
    expect(gameService.declineOptionalXanrosTreasure()).toBe(true);
    expect(gameService.turnTransitionPending()).toBe(true);
    vi.runOnlyPendingTimers();
  });

  it('permet le Portail de guérison autorisé après Substitution sans restaurer de mouvement', () => {
    vi.useFakeTimers();
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
    xanros.lives = 2;
    playerService.addEquipment(xanros, getEquipmentDefinition('heart')!);
    const arrival = { definitionId: 'healing-corner', x: 1, y: 0, rotation: 0 } as PlacedTile;
    dungeonService.tiles.push(
      { definitionId: 'start', x: 0, y: 0, rotation: 0 },
      arrival,
    );

    expect(gameService.openXanrosSubstitution()).toBe(true);
    expect(gameService.confirmXanrosSubstitution(target)).toBe(true);
    expect(gameService.openHealingPortalSelection()).toBe(true);
    expect(gameService.useHealingPortal(xanros, arrival)).toBe(true);
    expect(xanros.position).toEqual({ x: 1, y: 0 });
    expect(xanros.lives).toBe(5);
    expect(turnService.remainingMovements()).toBe(0);
    expect(turnService.movementsMadeThisTurn()).toBe(4);
    expect(gameService.pendingXanrosSubstitutionAction()).toBeNull();
    expect(gameService.turnTransitionPending()).toBe(true);
    vi.runOnlyPendingTimers();
  });

  it('autorise la récupération d’une arme présente sur la tuile d’arrivée', () => {
    vi.useFakeTimers();
    const gameService = TestBed.inject(GameService);
    const playerService = TestBed.inject(PlayerService);
    const dungeonService = TestBed.inject(DungeonService);
    playerService.initialize(2);
    gameService.initialize();
    gameService.phase.set('playing');
    gameService.activePlayerIndex.set(0);
    const xanros = playerService.players[0];
    const target = playerService.players[1];
    xanros.heroId = 'xanros';
    target.controller = 'human';
    xanros.position = { x: 0, y: 0 };
    target.position = { x: 1, y: 0 };
    playerService.addEquipment(target, getEquipmentDefinition('sword')!);
    const arrival = { definitionId: 'room-1', x: 1, y: 0, rotation: 0 } as PlacedTile;
    dungeonService.tiles.push(
      { definitionId: 'start', x: 0, y: 0, rotation: 0 },
      arrival,
    );
    gameService.activePlayerIndex.set(1);
    expect(gameService.dropInventoryEquipment(target, 'weapon', 0)).toBe(true);
    gameService.activePlayerIndex.set(0);

    expect(gameService.openXanrosSubstitution()).toBe(true);
    expect(gameService.confirmXanrosSubstitution(target)).toBe(true);
    expect(gameService.pendingXanrosSubstitutionAction()?.tile).toBe(arrival);
    expect(gameService.offerGroundEquipmentAt(arrival, 0)).toBe(true);
    expect(xanros.inventory.weapons[0]?.id).toBe('sword');
    expect(gameService.getGroundEquipment(arrival)).toHaveLength(0);
    expect(gameService.pendingXanrosSubstitutionAction()).toBeNull();
    expect(gameService.turnTransitionPending()).toBe(true);
    vi.runOnlyPendingTimers();
  });
});

describe('GameService Tisseuse de destin de Taia', () => {
  let gameService: GameService;
  let playerService: PlayerService;
  let dungeonService: DungeonService;
  let tokenBagService: TokenBagService;
  let turnService: TurnService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [GameService, PlayerService] });
    gameService = TestBed.inject(GameService);
    playerService = TestBed.inject(PlayerService);
    dungeonService = TestBed.inject(DungeonService);
    tokenBagService = TestBed.inject(TokenBagService);
    turnService = TestBed.inject(TurnService);
    playerService.initialize(2);
    gameService.initialize();
    gameService.phase.set('playing');
    gameService.activePlayerIndex.set(0);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function prepareTaia(): {
    taia: (typeof playerService.players)[number];
    source: PlacedTile;
    destination: PlacedTile;
  } {
    const taia = playerService.players[0];
    taia.heroId = 'taia';
    const source = dungeonService.getTileAt(0, 0)!;
    const destination = {
      definitionId: 'straight-room',
      x: 1,
      y: 0,
      rotation: 0,
    } as PlacedTile;
    dungeonService.tiles.push(destination);
    return { taia, source, destination };
  }

  it('tire deux jetons, place le choix et remet l’autre dans le sachet', () => {
    const { taia, source, destination } = prepareTaia();
    const rat = getTokenDefinition('giant-rat')!;
    const chest = getTokenDefinition('closed-chest')!;
    const draw = vi.spyOn(tokenBagService, 'draw')
      .mockReturnValueOnce(rat)
      .mockReturnValueOnce(chest);
    const returned = vi.spyOn(tokenBagService, 'returnToken');

    expect(gameService.resolveTileEntry(taia, source, destination, true)).toBe('token-choice');
    expect(destination.tokenId).toBeUndefined();
    expect(gameService.pendingTokenChoice()?.tokens.map(token => token.id)).toEqual(['giant-rat', 'closed-chest']);
    expect(gameService.choosePendingToken(1)).toBe(true);
    expect(destination.tokenId).toBe('closed-chest');
    expect(returned).toHaveBeenCalledWith('giant-rat');
    expect(draw).toHaveBeenCalledTimes(2);
    expect(gameService.pendingTokenChoice()).toBeNull();
    expect(turnService.remainingMovements()).toBe(4);
  });

  it('permet de sélectionner le premier jeton et déclenche un seul combat', () => {
    const { taia, source, destination } = prepareTaia();
    const rat = getTokenDefinition('giant-rat')!;
    const chest = getTokenDefinition('closed-chest')!;
    vi.spyOn(tokenBagService, 'draw')
      .mockReturnValueOnce(rat)
      .mockReturnValueOnce(chest);
    const returned = vi.spyOn(tokenBagService, 'returnToken');

    turnService.consumeMovement();
    expect(gameService.resolveTileEntry(taia, source, destination, true, true)).toBe('token-choice');
    expect(gameService.choosePendingToken(0)).toBe(true);
    expect(destination.tokenId).toBe('giant-rat');
    expect(returned).toHaveBeenCalledWith('closed-chest');
    expect(gameService.pendingTokenChoice()).toBeNull();
    expect(TestBed.inject(CombatService).hasPendingCombat).toBe(true);
    expect(gameService.choosePendingToken(1)).toBe(false);
  });

  it('résout normalement un coffre choisi lorsque Taia possède une clé', () => {
    const { taia, source, destination } = prepareTaia();
    const chest = getTokenDefinition('closed-chest')!;
    const rat = getTokenDefinition('giant-rat')!;
    playerService.addEquipment(taia, getEquipmentDefinition('key')!);
    vi.spyOn(tokenBagService, 'draw')
      .mockReturnValueOnce(chest)
      .mockReturnValueOnce(rat);

    expect(gameService.resolveTileEntry(taia, source, destination, true)).toBe('token-choice');
    expect(gameService.choosePendingToken(0)).toBe(true);
    expect(gameService.openPendingTreasure()).toBe(true);
    expect(destination.tokenId).toBeUndefined();
    expect(taia.inventory.key).toBeNull();
    expect(taia.treasures).toContain('opened-chest');
    expect(gameService.pendingTokenChoice()).toBeNull();
  });

  it('reprend les mouvements après un coffre choisi sans clé', () => {
    const { taia, source, destination } = prepareTaia();
    const chest = getTokenDefinition('closed-chest')!;
    const rat = getTokenDefinition('giant-rat')!;
    vi.spyOn(tokenBagService, 'draw')
      .mockReturnValueOnce(chest)
      .mockReturnValueOnce(rat);

    turnService.consumeMovement();
    expect(gameService.resolveTileEntry(taia, source, destination, true, true)).toBe('token-choice');
    expect(turnService.remainingMovements()).toBe(0);

    expect(gameService.choosePendingToken(0)).toBe(true);
    expect(turnService.remainingMovements()).toBe(3);
    expect(gameService.hasPendingTileResolution).toBe(false);
    expect(gameService.turnTransitionPending()).toBe(false);
  });

  it('termine normalement le tour après un coffre sans clé au dernier mouvement', () => {
    vi.useFakeTimers();
    const { taia, source, destination } = prepareTaia();
    const chest = getTokenDefinition('closed-chest')!;
    const rat = getTokenDefinition('giant-rat')!;
    vi.spyOn(tokenBagService, 'draw')
      .mockReturnValueOnce(chest)
      .mockReturnValueOnce(rat);

    turnService.remainingMovements.set(1);
    turnService.consumeMovement();
    expect(gameService.resolveTileEntry(taia, source, destination, true, true)).toBe('token-choice');
    expect(gameService.choosePendingToken(0)).toBe(true);
    expect(turnService.remainingMovements()).toBe(0);
    expect(gameService.turnTransitionPending()).toBe(true);
  });

  it('place directement le seul jeton disponible sans créer de choix', () => {
    const { taia, source, destination } = prepareTaia();
    const bag = tokenBagService as unknown as { bag: string[] };
    bag.bag = ['giant-rat'];
    tokenBagService.remainingTokens.set(1);

    expect(gameService.resolveTileEntry(taia, source, destination, true)).toBe('combat');
    expect(destination.tokenId).toBe('giant-rat');
    expect(gameService.pendingTokenChoice()).toBeNull();
  });

  it('ne place aucun jeton lorsque le sachet est vide', () => {
    const { taia, source, destination } = prepareTaia();
    const bag = tokenBagService as unknown as { bag: string[] };
    bag.bag = [];
    tokenBagService.remainingTokens.set(0);

    expect(gameService.resolveTileEntry(taia, source, destination, true)).toBe('none');
    expect(destination.tokenId).toBeUndefined();
    expect(gameService.pendingTokenChoice()).toBeNull();
  });

  it('désactive la Tisseuse lorsque Taia est maudite', () => {
    const { taia, source, destination } = prepareTaia();
    taia.isCursed = true;
    const draw = vi.spyOn(tokenBagService, 'draw');
    const bag = tokenBagService as unknown as { bag: string[] };
    bag.bag = ['closed-chest', 'giant-rat'];
    tokenBagService.remainingTokens.set(2);

    expect(gameService.resolveTileEntry(taia, source, destination, true)).toBe('combat');
    expect(draw).toHaveBeenCalledTimes(1);
    expect(gameService.pendingTokenChoice()).toBeNull();
  });

  it('ignore une sélection après réinitialisation et refuse toute seconde mutation', () => {
    const { taia, source, destination } = prepareTaia();
    const rat = getTokenDefinition('giant-rat')!;
    const chest = getTokenDefinition('closed-chest')!;
    vi.spyOn(tokenBagService, 'draw')
      .mockReturnValueOnce(rat)
      .mockReturnValueOnce(chest);

    expect(gameService.resolveTileEntry(taia, source, destination, true)).toBe('token-choice');
    gameService.initialize();

    expect(gameService.pendingTokenChoice()).toBeNull();
    expect(gameService.choosePendingToken(0)).toBe(false);
    expect(destination.tokenId).toBeUndefined();
  });

  it('refuse une résolution Taia provenant d’un joueur non actif', () => {
    const inactive = playerService.players[1];
    inactive.heroId = 'taia';
    const source = dungeonService.getTileAt(0, 0)!;
    const destination = {
      definitionId: 'straight-room',
      x: 1,
      y: 0,
      rotation: 0,
    } as PlacedTile;
    dungeonService.tiles.push(destination);
    const draw = vi.spyOn(tokenBagService, 'draw');

    expect(gameService.resolveTileEntry(inactive, source, destination, true)).toBe('none');
    expect(draw).not.toHaveBeenCalled();
    expect(destination.tokenId).toBeUndefined();
  });

  it('applique Prémonition au joueur IA par le même chemin de déplacement', () => {
    const { taia, source, destination } = prepareTaia();
    taia.controller = 'ai';
    destination.tokenId = 'giant-rat';
    destination.tokenFace = 'front';
    const combatService = TestBed.inject(CombatService);

    turnService.consumeMovement();
    expect(gameService.resolveTileEntry(taia, source, destination, false, true)).toBe('combat');
    expect(combatService.rollPendingCombat()?.heroBonus).toBe(1);
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
    const combatService = TestBed.inject(CombatService);
    playerService.initialize(2);
    gameService.initialize();
    gameService.phase.set('playing');
    gameService.activePlayerIndex.set(0);
    const player = playerService.players[0];
    player.heroId = 'victorius';
    turnService.consumeMovement();
    turnService.stopMovements();

    vi.spyOn(Math, 'random').mockReturnValue(0.999);
    combatService.startCombat(
      player,
      { x: 0, y: 0 } as PlacedTile,
      { x: 1, y: 0, definitionId: 'room-1', tokenId: 'giant-rat', tokenFace: 'front' } as PlacedTile,
    );
    (combatService.pendingCombat()!.monster as { strength: number }).strength = 20;
    combatService.rollPendingCombat();
    const result = combatService.resolvePendingCombat();

    expect(result?.unstoppableEligible).toBe(true);
    expect(gameService.registerUnstoppableContinuation(result!)).toBe(true);
    expect(gameService.finalizeUnstoppableContinuation()).toBe(true);
    expect(gameService.acceptUnstoppableContinuation()).toBe(true);
    expect(turnService.remainingMovements()).toBe(3);
    vi.restoreAllMocks();
  });

  it('propose une décision explicite et consomme l’autorisation une seule fois', () => {
    const gameService = TestBed.inject(GameService);
    const playerService = TestBed.inject(PlayerService);
    const turnService = TestBed.inject(TurnService);
    const combatService = TestBed.inject(CombatService);
    playerService.initialize(2);
    gameService.initialize();
    gameService.phase.set('playing');
    gameService.activePlayerIndex.set(0);
    const player = playerService.players[0];
    player.heroId = 'victorius';
    turnService.consumeMovement();
    turnService.stopMovements();

    vi.spyOn(Math, 'random').mockReturnValue(0.999);
    combatService.startCombat(player, { x: 0, y: 0 } as PlacedTile, {
      x: 1, y: 0, definitionId: 'room-1', tokenId: 'giant-rat', tokenFace: 'front',
    } as PlacedTile);
    (combatService.pendingCombat()!.monster as { strength: number }).strength = 20;
    combatService.rollPendingCombat();
    const result = combatService.resolvePendingCombat()!;

    expect(gameService.registerUnstoppableContinuation(result)).toBe(true);
    expect(gameService.finalizeUnstoppableContinuation()).toBe(true);
    expect(gameService.pendingUnstoppableDecision()?.player).toBe(player);
    expect(gameService.acceptUnstoppableContinuation()).toBe(true);
    expect(gameService.pendingUnstoppableDecision()).toBeNull();
    expect(gameService.acceptUnstoppableContinuation()).toBe(false);
    expect(turnService.remainingMovements()).toBe(3);

    vi.restoreAllMocks();
  });

  it('termine le tour lorsque le joueur refuse Inarrêtable', () => {
    vi.useFakeTimers();
    const gameService = TestBed.inject(GameService);
    const playerService = TestBed.inject(PlayerService);
    const turnService = TestBed.inject(TurnService);
    const combatService = TestBed.inject(CombatService);
    playerService.initialize(2);
    gameService.initialize();
    gameService.phase.set('playing');
    gameService.activePlayerIndex.set(0);
    const player = playerService.players[0];
    player.heroId = 'victorius';
    turnService.consumeMovement();
    turnService.stopMovements();

    vi.spyOn(Math, 'random').mockReturnValue(0.999);
    combatService.startCombat(player, { x: 0, y: 0 } as PlacedTile, {
      x: 1, y: 0, definitionId: 'room-1', tokenId: 'giant-rat', tokenFace: 'front',
    } as PlacedTile);
    (combatService.pendingCombat()!.monster as { strength: number }).strength = 20;
    combatService.rollPendingCombat();
    const result = combatService.resolvePendingCombat()!;

    expect(gameService.registerUnstoppableContinuation(result)).toBe(true);
    expect(gameService.finalizeUnstoppableContinuation()).toBe(true);
    expect(gameService.declineUnstoppableContinuation()).toBe(true);
    expect(gameService.pendingUnstoppableDecision()).toBeNull();
    expect(gameService.turnTransitionPending()).toBe(true);

    vi.runOnlyPendingTimers();
    expect(gameService.activePlayerIndex()).toBe(1);
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('résout les récompenses avant de proposer Inarrêtable après une victoire', () => {
    const gameService = TestBed.inject(GameService);
    const playerService = TestBed.inject(PlayerService);
    const turnService = TestBed.inject(TurnService);
    const combatService = TestBed.inject(CombatService);
    playerService.initialize(2);
    gameService.initialize();
    gameService.phase.set('playing');
    gameService.activePlayerIndex.set(0);
    const player = playerService.players[0];
    player.heroId = 'victorius';
    const source = { x: 0, y: 0, definitionId: 'start', tokenFace: 'back' } as PlacedTile;
    const monster = { x: 1, y: 0, definitionId: 'room-1', tokenId: 'giant-rat', tokenFace: 'front' } as PlacedTile;
    turnService.consumeMovement();

    vi.spyOn(Math, 'random').mockReturnValue(0.999);
    expect(gameService.resolveTileEntry(player, source, monster, false, true)).toBe('combat');
    (combatService.pendingCombat()!.monster as { strength: number }).strength = 1;
    combatService.rollPendingCombat();
    const result = combatService.resolvePendingCombat()!;
    expect(result.outcome).toBe('victory');
    expect(result.unstoppableEligible).toBe(true);

    expect(gameService.registerUnstoppableContinuation(result)).toBe(true);
    expect(gameService.resolveTileEntry(player, source, monster)).toBe('reward');
    expect(player.inventory.weapons.some(weapon => weapon?.id === 'daggers')).toBe(true);
    expect(gameService.pendingReward()).toBeNull();
    expect(gameService.pendingUnstoppableDecision()?.player).toBe(player);

    vi.restoreAllMocks();
  });

  it('termine normalement le tour qualifiant au quatrième mouvement', () => {
    vi.useFakeTimers();
    const gameService = TestBed.inject(GameService);
    const playerService = TestBed.inject(PlayerService);
    const turnService = TestBed.inject(TurnService);
    const combatService = TestBed.inject(CombatService);
    playerService.initialize(2);
    gameService.initialize();
    gameService.phase.set('playing');
    gameService.activePlayerIndex.set(0);
    const player = playerService.players[0];
    player.heroId = 'victorius';
    for (let movement = 0; movement < 4; movement++) turnService.consumeMovement();
    turnService.stopMovements();

    vi.spyOn(Math, 'random').mockReturnValue(0.999);
    combatService.startCombat(player, { x: 0, y: 0 } as PlacedTile, {
      x: 1, y: 0, definitionId: 'room-1', tokenId: 'giant-rat', tokenFace: 'front',
    } as PlacedTile);
    (combatService.pendingCombat()!.monster as { strength: number }).strength = 20;
    combatService.rollPendingCombat();
    const result = combatService.resolvePendingCombat()!;

    gameService.registerUnstoppableContinuation(result);
    expect(gameService.finalizeUnstoppableContinuation()).toBe(false);
    expect(gameService.pendingUnstoppableDecision()).toBeNull();
    gameService.endTurn();
    vi.runOnlyPendingTimers();
    expect(gameService.activePlayerIndex()).toBe(1);

    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('n’autorise pas Inarrêtable après la perte de la dernière vie', () => {
    const gameService = TestBed.inject(GameService);
    const playerService = TestBed.inject(PlayerService);
    const turnService = TestBed.inject(TurnService);
    const combatService = TestBed.inject(CombatService);
    playerService.initialize(2);
    gameService.initialize();
    gameService.phase.set('playing');
    gameService.activePlayerIndex.set(0);
    const player = playerService.players[0];
    player.heroId = 'victorius';
    player.lives = 1;
    turnService.consumeMovement();
    turnService.stopMovements();

    vi.spyOn(Math, 'random').mockReturnValue(0.999);
    combatService.startCombat(player, { x: 0, y: 0 } as PlacedTile, {
      x: 1, y: 0, definitionId: 'room-1', tokenId: 'giant-rat', tokenFace: 'front',
    } as PlacedTile);
    (combatService.pendingCombat()!.monster as { strength: number }).strength = 20;
    combatService.rollPendingCombat();
    const result = combatService.resolvePendingCombat()!;

    expect(result.unstoppableEligible).toBe(true);
    expect(gameService.registerUnstoppableContinuation(result)).toBe(true);
    expect(gameService.finalizeUnstoppableContinuation()).toBe(false);
    expect(gameService.pendingUnstoppableDecision()).toBeNull();
    expect(player.lives).toBe(0);
    expect(player.recoveryState).toBe('pending');

    vi.restoreAllMocks();
  });
});

describe('GameService Réincarnation de Horan', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [GameService, PlayerService] });
  });

  it('permet de choisir une fontaine et restaure Horan une seule fois', () => {
    vi.useFakeTimers();
    const gameService = TestBed.inject(GameService);
    const playerService = TestBed.inject(PlayerService);
    const dungeonService = TestBed.inject(DungeonService);
    const combatService = TestBed.inject(CombatService);
    playerService.initialize(2);
    gameService.initialize();
    gameService.phase.set('playing');
    gameService.activePlayerIndex.set(0);
    const horan = playerService.players[0];
    horan.heroId = 'horan';
    horan.lives = 1;
    const inventoryBefore = { ...horan.inventory };
    const fountain = { definitionId: 'healing-corner', x: 2, y: 1, rotation: 0 } as PlacedTile;
    dungeonService.tiles.push(fountain);

    vi.spyOn(Math, 'random').mockReturnValue(0);
    expect(combatService.startCombat(
      horan,
      dungeonService.tiles[0],
      { x: 1, y: 0, definitionId: 'room-1', tokenId: 'giant-rat', tokenFace: 'front' } as PlacedTile,
    )).toBe(true);
    combatService.rollPendingCombat();
    const result = combatService.resolvePendingCombat();
    expect(result?.outcome).toBe('defeat');

    expect(gameService.beginHoranReincarnation(result!)).toBe(true);
    expect(gameService.horanReincarnationSelection()?.destination).toBe(dungeonService.tiles[0]);
    expect(gameService.canPerformNormalMovement(horan)).toBe(false);

    gameService.selectHoranReincarnationDestination(fountain);
    expect(gameService.confirmHoranReincarnation()).toBe(true);
    expect(horan.position).toEqual({ x: 2, y: 1 });
    expect(horan.lives).toBe(5);
    expect(horan.recoveryState).toBe('none');
    expect(horan.inventory).toEqual(inventoryBefore);
    expect(gameService.horanReincarnationSelection()).toBeNull();
    expect(gameService.confirmHoranReincarnation()).toBe(false);

    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('applique automatiquement la fontaine unique', () => {
    vi.useFakeTimers();
    const gameService = TestBed.inject(GameService);
    const playerService = TestBed.inject(PlayerService);
    const dungeonService = TestBed.inject(DungeonService);
    const combatService = TestBed.inject(CombatService);
    playerService.initialize(2);
    gameService.initialize();
    gameService.phase.set('playing');
    gameService.activePlayerIndex.set(0);
    const horan = playerService.players[0];
    horan.heroId = 'horan';
    horan.lives = 1;

    vi.spyOn(Math, 'random').mockReturnValue(0);
    combatService.startCombat(
      horan,
      dungeonService.tiles[0],
      { x: 1, y: 0, definitionId: 'room-1', tokenId: 'giant-rat', tokenFace: 'front' } as PlacedTile,
    );
    combatService.rollPendingCombat();
    const result = combatService.resolvePendingCombat();

    expect(gameService.beginHoranReincarnation(result!)).toBe(true);
    expect(gameService.horanReincarnationSelection()).toBeNull();
    expect(horan.position).toEqual({ x: 0, y: 0 });
    expect(horan.lives).toBe(5);
    expect(gameService.turnTransitionPending()).toBe(true);

    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('refuse la Réincarnation hors d’une défaite de combat et sans fontaine', () => {
    const gameService = TestBed.inject(GameService);
    const playerService = TestBed.inject(PlayerService);
    const dungeonService = TestBed.inject(DungeonService);
    playerService.initialize(2);
    gameService.initialize();
    gameService.phase.set('playing');
    gameService.activePlayerIndex.set(0);
    const horan = playerService.players[0];
    horan.heroId = 'horan';
    horan.lives = 0;
    horan.recoveryState = 'pending';

    expect(gameService.beginHoranReincarnation({
      player: horan,
      monster: {} as never,
      die1: 1,
      die2: 1,
      diceTotal: 2,
      equipmentBonus: 0,
      heroBonus: 0,
      weapons: [],
      attackPower: 2,
      monsterStrength: 5,
      magicBoltsUsed: 0,
      heroRerollsUsed: 0,
      sacrificeUsed: false,
      unstoppableEligible: false,
      outcome: 'defeat',
    })).toBe(false);

    dungeonService.tiles.splice(0);
    expect(gameService.horanReincarnationSelection()).toBeNull();
  });

  it('laisse la récupération numérique s’appliquer lorsqu’aucune fontaine n’existe', () => {
    const gameService = TestBed.inject(GameService);
    const playerService = TestBed.inject(PlayerService);
    const dungeonService = TestBed.inject(DungeonService);
    const combatService = TestBed.inject(CombatService);
    playerService.initialize(2);
    gameService.initialize();
    gameService.phase.set('playing');
    gameService.activePlayerIndex.set(0);
    dungeonService.tiles.splice(0);
    const horan = playerService.players[0];
    horan.heroId = 'horan';
    horan.lives = 1;

    vi.spyOn(Math, 'random').mockReturnValue(0);
    combatService.startCombat(
      horan,
      { x: 0, y: 0 } as PlacedTile,
      { x: 1, y: 0, definitionId: 'room-1', tokenId: 'giant-rat', tokenFace: 'front' } as PlacedTile,
    );
    combatService.rollPendingCombat();
    const result = combatService.resolvePendingCombat();

    expect(result?.outcome).toBe('defeat');
    expect(gameService.beginHoranReincarnation(result!)).toBe(false);
    expect(horan.lives).toBe(0);
    expect(horan.recoveryState).toBe('pending');
    expect(gameService.horanReincarnationSelection()).toBeNull();
    vi.restoreAllMocks();
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

    expect(gameService.pendingTreasure()).not.toBeNull();
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
    gameService.activePlayerIndex.set(1);
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
    expect(gameService.pendingTreasure()).not.toBeNull();
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
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

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

  it('refuse toute opération de récompense hors de playing', () => {
    const equipmentReward = { kind: 'equipment', equipmentId: 'sword' } as const;
    prepareReward('fallen', [equipmentReward]);
    gameService.phase.set('setup');

    expect(gameService.collectPendingEquipment()).toBe(false);
    expect(gameService.replacePendingEquipment(0)).toBe(false);
    expect(gameService.leavePendingReward()).toBe(false);
    expect(gameService.pendingReward()?.remainingRewards).toEqual([equipmentReward]);
  });

  it('laisse les récompenses restantes sur le même jeton après un refus', () => {
    const rewardTile = {
      x: 1,
      y: 0,
      definitionId: 'room-1',
      tokenId: 'fallen',
      tokenFace: 'back',
    } as PlacedTile;
    const token = getTokenDefinition('fallen') as MonsterTokenDefinition;
    const rewards = [{ kind: 'equipment', equipmentId: 'sword' }] as const;
    gameService.pendingReward.set({
      player: playerService.players[0],
      monster: token,
      rewardTile,
      sourceTile: { x: 0, y: 0 } as PlacedTile,
      remainingRewards: rewards,
    });

    expect(gameService.leavePendingReward()).toBe(true);
    expect(gameService.pendingReward()).toBeNull();
    expect(rewardTile.tokenId).toBe('fallen');
    expect(rewardTile.tokenFace).toBe('back');
  });

  it('nettoie une récompense en attente lors de la réinitialisation', () => {
    prepareReward('fallen', [{ kind: 'treasure', tokenId: 'open-chest' }]);

    gameService.initialize();

    expect(gameService.pendingReward()).toBeNull();
    expect(gameService.hasPendingTileResolution).toBe(false);
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

  it('stocke un exemplaire de puissance équivalente lorsqu’une case reste libre', () => {
    const gameService = TestBed.inject(GameService);
    const playerService = TestBed.inject(PlayerService);
    playerService.initialize(2);
    gameService.initialize();
    gameService.phase.set('playing');
    gameService.activePlayerIndex.set(0);
    const player = playerService.players[0];
    playerService.addEquipment(player, getEquipmentDefinition('daggers')!);
    const tile = {
      x: 1,
      y: 0,
      definitionId: 'room-1',
      tokenId: 'giant-rat',
      tokenFace: 'back',
    } as PlacedTile;

    gameService.resolveTileEntry(player, { x: 0, y: 0 } as PlacedTile, tile);

    expect(player.inventory.weapons.map(item => item?.id)).toEqual(['daggers', 'daggers']);
    expect(gameService.pendingReward()).toBeNull();
    expect(tile.tokenId).toBeUndefined();
  });

  it('laisse automatiquement une arme inutilisable au sol sans décision humaine', () => {
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

    expect(gameService.pendingReward()).toBeNull();
    expect(player.inventory.weapons.map(item => item?.id)).toEqual(['daggers', 'sword']);
    expect(gameService.getGroundEquipment(tile).map(item => item.id)).toEqual(['daggers']);
    expect(tile.tokenId).toBe('giant-rat');
  });

  it('remplace automatiquement l’arme la plus faible par une amélioration stricte', () => {
    const gameService = TestBed.inject(GameService);
    const playerService = TestBed.inject(PlayerService);
    const toastService = TestBed.inject(ToastService);
    playerService.initialize(2);
    gameService.initialize();
    gameService.phase.set('playing');
    gameService.activePlayerIndex.set(0);
    const player = playerService.players[0];
    player.heroId = 'argentus';
    playerService.addEquipment(player, getEquipmentDefinition('daggers')!);
    playerService.addEquipment(player, getEquipmentDefinition('sword')!);
    const tile = {
      x: 1,
      y: 0,
      definitionId: 'room-1',
      tokenId: 'skeleton-swordsman',
      tokenFace: 'back',
    } as PlacedTile;

    expect(gameService.resolveTileEntry(player, { x: 0, y: 0 } as PlacedTile, tile)).toBe('reward');
    expect(player.inventory.weapons.map(item => item?.id)).toEqual(['sword', 'sword']);
    expect(gameService.pendingReward()).toBeNull();
    expect(tile.tokenId).toBeUndefined();
    expect(gameService.getGroundEquipment(tile).map(item => item.id)).toEqual(['daggers']);
    expect(toastService.current()?.text).toBe('épée obtenu');
  });
  it('permet de remplacer un sort lorsque les trois emplacements sont occupés', () => {
    vi.useFakeTimers();
    const gameService = TestBed.inject(GameService);
    const playerService = TestBed.inject(PlayerService);
    playerService.initialize(2);
    gameService.initialize();
    gameService.phase.set('playing');
    gameService.activePlayerIndex.set(0);
    const player = playerService.players[0];
    const portal = getEquipmentDefinition('heart')!;
    const rewardTile = {
      x: 1,
      y: 0,
      definitionId: 'room-1',
      tokenId: 'fallen',
      tokenFace: 'back',
    } as PlacedTile;

    playerService.addEquipment(player, { ...portal });
    playerService.addEquipment(player, { ...portal });
    playerService.addEquipment(player, { ...portal });
    gameService.pendingReward.set({
      player,
      monster: getTokenDefinition('fallen') as MonsterTokenDefinition,
      rewardTile,
      sourceTile: { x: 0, y: 0 } as PlacedTile,
      remainingRewards: [{ kind: 'equipment', equipmentId: 'fire-sword' }],
    });

    expect(gameService.replacePendingEquipment(1)).toBe(true);
    expect(player.inventory.spells[1]?.effect).toBe('magic-attack');
    expect(player.inventory.spells.filter(spell => spell?.effect === 'healing-portal')).toHaveLength(2);
    expect(gameService.pendingReward()).toBeNull();

    vi.runAllTimers();
    vi.useRealTimers();
  });
});

describe('GameService validation centralisée des déplacements', () => {
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
    turnService.resetMovements();
    gameService.phase.set('playing');
    gameService.activePlayerIndex.set(0);
  });

  function addDestination(rotation: number): PlacedTile {
    const destination = {
      x: 1,
      y: 0,
      definitionId: 'straight-01',
      rotation,
    } as PlacedTile;
    dungeonService.tiles.push(destination);
    return destination;
  }

  it('autorise Argentus à franchir un mur entre deux tuiles découvertes', () => {
    const player = playerService.players[0];
    const source = dungeonService.getTileAt(0, 0)!;
    const destination = addDestination(90);
    player.position = { x: 0, y: 0 };
    player.heroId = 'argentus';

    expect(gameService.canMoveTo(player, source, destination)).toBe(true);
  });

  it('refuse le franchissement astral aux autres héros et sous malédiction', () => {
    const player = playerService.players[0];
    const source = dungeonService.getTileAt(0, 0)!;
    const destination = addDestination(90);
    player.position = { x: 0, y: 0 };

    expect(gameService.canMoveTo(player, source, destination)).toBe(false);
    player.heroId = 'argentus';
    player.isCursed = true;
    expect(gameService.canMoveTo(player, source, destination)).toBe(false);
  });

  it('conserve les contraintes de tour et de résolution en attente', () => {
    const player = playerService.players[0];
    const source = dungeonService.getTileAt(0, 0)!;
    const destination = addDestination(90);
    player.position = { x: 0, y: 0 };
    player.heroId = 'argentus';

    turnService.stopMovements();

    expect(gameService.canMoveTo(player, source, destination)).toBe(false);
  });
});

describe('GameService comptabilisation du mouvement d entrée', () => {
  let gameService: GameService;
  let playerService: PlayerService;
  let dungeonService: DungeonService;
  let turnService: TurnService;
  let combatService: CombatService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [GameService, PlayerService] });
    gameService = TestBed.inject(GameService);
    playerService = TestBed.inject(PlayerService);
    dungeonService = TestBed.inject(DungeonService);
    turnService = TestBed.inject(TurnService);
    combatService = TestBed.inject(CombatService);
    playerService.initialize(2);
    gameService.initialize();
    turnService.resetMovements();
    gameService.phase.set('playing');
    gameService.activePlayerIndex.set(0);
  });

  it('compte le mouvement avant de suspendre un combat obligatoire', () => {
    const player = playerService.players[0];
    const source = dungeonService.getTileAt(0, 0)!;
    const destination = {
      x: 1,
      y: 0,
      definitionId: 'straight-01',
      rotation: 1,
      tokenId: 'giant-rat',
      tokenFace: 'front',
    } as PlacedTile;
    dungeonService.tiles.push(destination);

    turnService.consumeMovement();
    expect(gameService.resolveTileEntry(player, source, destination, false, true)).toBe('combat');
    expect(combatService.hasPendingCombat).toBe(true);
    expect(turnService.movementsMadeThisTurn()).toBe(1);
    expect(turnService.remainingMovements()).toBe(0);
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
    expect(tile.tokenId).toBe('closed-chest');
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

describe('GameService résolution des salles découvertes par Aderyn', () => {
  let gameService: GameService;
  let playerService: PlayerService;
  let turnService: TurnService;
  let combatService: CombatService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [GameService, PlayerService] });
    vi.useFakeTimers();
    gameService = TestBed.inject(GameService);
    playerService = TestBed.inject(PlayerService);
    turnService = TestBed.inject(TurnService);
    combatService = TestBed.inject(CombatService);
    playerService.initialize(2);
    gameService.initialize();
    gameService.phase.set('playing');
    gameService.activePlayerIndex.set(0);
  });

  afterEach(() => vi.useRealTimers());

  function roomWithToken(tokenId: string): PlacedTile {
    return {
      x: 1,
      y: 0,
      definitionId: 'room-1',
      tokenId,
      tokenFace: 'front',
    } as PlacedTile;
  }

  it('propose le choix Sneak pour un monstre découvert sur une nouvelle tuile', () => {
    const player = playerService.players[0];
    player.heroId = 'aderyn';
    const tile = roomWithToken('giant-rat');

    expect(gameService.resolveTileEntry(player, { x: 0, y: 0 } as PlacedTile, tile, true)).toBe('sneak-choice');
    expect(gameService.pendingSneakChoice()?.monster.id).toBe('giant-rat');
    expect(combatService.hasPendingCombat).toBe(false);
    expect(turnService.remainingMovements()).toBe(0);
  });

  it('désactive Sneak sur une nouvelle tuile lorsque Aderyn est maudite', () => {
    const player = playerService.players[0];
    player.heroId = 'aderyn';
    player.isCursed = true;
    const tile = roomWithToken('giant-rat');

    expect(gameService.resolveTileEntry(player, { x: 0, y: 0 } as PlacedTile, tile, true)).toBe('combat');
    expect(gameService.pendingSneakChoice()).toBeNull();
    expect(combatService.hasPendingCombat).toBe(true);
  });

  it('propose le choix Sneak pour un monstre déjà présent sur le plan', () => {
    const player = playerService.players[0];
    player.heroId = 'aderyn';
    const tile = roomWithToken('giant-rat');

    expect(gameService.resolveTileEntry(player, { x: 0, y: 0 } as PlacedTile, tile)).toBe('sneak-choice');
    expect(combatService.hasPendingCombat).toBe(false);
    expect(gameService.pendingSneakChoice()?.monster.id).toBe('giant-rat');
    expect(turnService.remainingMovements()).toBe(0);
  });

  it('permet à Aderyn de choisir le combat depuis la résolution Sneak', () => {
    const player = playerService.players[0];
    player.heroId = 'aderyn';
    const destination = roomWithToken('giant-rat');

    gameService.resolveTileEntry(player, { x: 0, y: 0 } as PlacedTile, destination);

    expect(gameService.choosePendingSneak('combat')).toBe(true);
    expect(gameService.pendingSneakChoice()).toBeNull();
    expect(combatService.hasPendingCombat).toBe(true);
  });

  it('permet à Aderyn de passer discrètement sans combat', () => {
    const player = playerService.players[0];
    player.heroId = 'aderyn';
    const destination = roomWithToken('giant-rat');

    // Simulate one movement already spent before entering the monster tile.
    turnService.consumeMovement();
    gameService.resolveTileEntry(player, { x: 0, y: 0 } as PlacedTile, destination);

    expect(gameService.choosePendingSneak('sneak')).toBe(true);
    expect(gameService.pendingSneakChoice()).toBeNull();
    expect(combatService.hasPendingCombat).toBe(false);
    expect(turnService.remainingMovements()).toBe(2);
    expect(turnService.movementsMadeThisTurn()).toBe(2);
    expect(gameService.turnTransitionPending()).toBe(false);
  });

  it('ne recompte pas le mouvement lorsque l entree a deja ete consommee', () => {
    const player = playerService.players[0];
    player.heroId = 'aderyn';
    const destination = roomWithToken('giant-rat');
    turnService.consumeMovement();

    expect(gameService.resolveTileEntry(
      player,
      { x: 0, y: 0 } as PlacedTile,
      destination,
      false,
      true,
    )).toBe('sneak-choice');

    expect(gameService.choosePendingSneak('sneak')).toBe(true);
    expect(turnService.movementsMadeThisTurn()).toBe(1);
    expect(turnService.remainingMovements()).toBe(3);
  });

  it('termine normalement le tour aprÃ¨s un passage discret sur le dernier mouvement', () => {
    const player = playerService.players[0];
    player.heroId = 'aderyn';
    const destination = roomWithToken('giant-rat');
    turnService.remainingMovements.set(1);

    gameService.resolveTileEntry(player, { x: 0, y: 0 } as PlacedTile, destination);

    expect(gameService.choosePendingSneak('sneak')).toBe(true);
    expect(turnService.remainingMovements()).toBe(0);
    expect(turnService.movementsMadeThisTurn()).toBe(1);
    expect(gameService.pendingSneakChoice()).toBeNull();
    expect(gameService.turnTransitionPending()).toBe(true);
    vi.runAllTimers();
    expect(gameService.turnTransitionPending()).toBe(false);
  });

  it('ne laisse pas une dÃ©cision Sneak rÃ©siduelle aprÃ¨s une rÃ©initialisation', () => {
    const player = playerService.players[0];
    player.heroId = 'aderyn';
    const destination = roomWithToken('giant-rat');

    gameService.resolveTileEntry(player, { x: 0, y: 0 } as PlacedTile, destination);
    expect(gameService.pendingSneakChoice()).not.toBeNull();

    gameService.initialize();

    expect(gameService.pendingSneakChoice()).toBeNull();
    expect(combatService.hasPendingCombat).toBe(false);
  });

  it('rend disponible l’interaction avec un objet découvert sans malédiction', () => {
    const player = playerService.players[0];
    player.heroId = 'aderyn';
    playerService.addEquipment(player, getEquipmentDefinition('key')!);
    const tile = roomWithToken('closed-chest');

    expect(gameService.resolveTileEntry(player, { x: 0, y: 0 } as PlacedTile, tile, true)).toBe('treasure');
    expect(tile.tokenId).toBe('closed-chest');
    expect(player.treasures).not.toContain('opened-chest');
  });

  it('résout normalement un objet découvert et un monstre découvert sous malédiction', () => {
    const player = playerService.players[0];
    player.heroId = 'aderyn';
    player.isCursed = true;

    const monster = roomWithToken('giant-rat');
    expect(gameService.resolveTileEntry(player, { x: 0, y: 0 } as PlacedTile, monster, true)).toBe('combat');

    combatService.initialize();
    turnService.resetMovements();
    const chest = roomWithToken('closed-chest');
    playerService.addEquipment(player, getEquipmentDefinition('key')!);
    expect(gameService.resolveTileEntry(player, { x: 0, y: 0 } as PlacedTile, chest, true)).toBe('treasure');
    expect(gameService.pendingTreasure()).not.toBeNull();
    expect(chest.tokenId).toBe('closed-chest');
    expect(turnService.remainingMovements()).toBe(0);
  });
});

describe('GameService Aderyn backstab integration', () => {
  let gameService: GameService;
  let playerService: PlayerService;
  let combatService: CombatService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [GameService, PlayerService] });
    vi.useFakeTimers();
    gameService = TestBed.inject(GameService);
    playerService = TestBed.inject(PlayerService);
    combatService = TestBed.inject(CombatService);
    playerService.initialize(2);
    gameService.initialize();
    gameService.phase.set('playing');
    gameService.activePlayerIndex.set(0);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function roomWithToken(tokenId: string): PlacedTile {
    return {
      x: 1,
      y: 0,
      definitionId: 'room-1',
      tokenId,
      tokenFace: 'front',
    } as PlacedTile;
  }

  it('turns a tie into a victory and grants exactly one reward', () => {
    const player = playerService.players[0];
    player.heroId = 'aderyn';
    const source = { x: 0, y: 0 } as PlacedTile;
    const destination = roomWithToken('fallen');

    expect(gameService.resolveTileEntry(player, source, destination)).toBe('sneak-choice');
    expect(gameService.choosePendingSneak('combat')).toBe(true);
    vi.spyOn(Math, 'random').mockReturnValue(0.999999);

    expect(combatService.rollPendingCombat()?.attackPower).toBe(12);
    expect(combatService.resolvePendingCombat()?.outcome).toBe('victory');
    expect(combatService.resolvePendingCombat()).toBeNull();
    expect(destination.tokenFace).toBe('back');

    combatService.clearLastCombatResult();
    expect(gameService.resolveTileEntry(player, source, destination)).toBe('reward');
    expect(gameService.collectPendingTreasure()).toBe(true);
    expect(player.treasures).toEqual(['monster-treasure']);
    expect(gameService.collectPendingTreasure()).toBe(false);
    expect(gameService.resolveTileEntry(player, source, destination)).toBe('none');
  });

  it('keeps the mummy flow and applies its curse exactly once', () => {
    const player = playerService.players[0];
    const otherPlayer = playerService.players[1];
    player.heroId = 'aderyn';
    const source = { x: 0, y: 0 } as PlacedTile;
    const destination = roomWithToken('skeleton-mummy');

    expect(gameService.resolveTileEntry(player, source, destination)).toBe('sneak-choice');
    expect(gameService.choosePendingSneak('combat')).toBe(true);
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.4)
      .mockReturnValueOnce(0.5);

    expect(combatService.rollPendingCombat()?.attackPower).toBe(7);
    expect(combatService.resolvePendingCombat()?.outcome).toBe('victory');
    combatService.clearLastCombatResult();

    expect(gameService.resolveTileEntry(player, source, destination)).toBe('reward');
    expect(otherPlayer.isCursed).toBe(true);
    expect(player.isCursed).toBe(false);
    expect(player.inventory.spells.some(spell => spell?.id === 'fire-sword')).toBe(true);
    expect(gameService.pendingReward()).toBeNull();
  });

  it('remplace les poignards par une épée même si une épée identique occupe un autre slot', () => {
    const gameService = TestBed.inject(GameService);
    const playerService = TestBed.inject(PlayerService);
    playerService.initialize(2);
    gameService.initialize();
    gameService.phase.set('playing');
    gameService.activePlayerIndex.set(0);
    const player = playerService.players[0];
    player.heroId = 'argentus';
    const tile = {
      x: 1,
      y: 0,
      definitionId: 'room-1',
      tokenId: 'skeleton-swordsman',
      tokenFace: 'back',
    } as PlacedTile;
    playerService.addEquipment(player, getEquipmentDefinition('sword')!);
    playerService.addEquipment(player, getEquipmentDefinition('daggers')!);

    expect(gameService.resolveTileEntry(player, { x: 0, y: 0 } as PlacedTile, tile)).toBe('reward');
    expect(player.inventory.weapons.map(item => item?.id)).toEqual(['sword', 'sword']);
    expect(gameService.getGroundEquipment(tile).map(item => item.id)).toEqual(['daggers']);
    expect(gameService.pendingReward()).toBeNull();
    expect(tile.tokenId).toBeUndefined();
  });

  it('défausse explicitement l’arme remplacée si la tuile est occupée sans toucher à son objet', () => {
    const gameService = TestBed.inject(GameService);
    const playerService = TestBed.inject(PlayerService);
    const dungeonService = TestBed.inject(DungeonService);
    playerService.initialize(2);
    gameService.initialize();
    gameService.phase.set('playing');
    gameService.activePlayerIndex.set(0);
    const player = playerService.players[0];
    const otherPlayer = playerService.players[1];
    const tile = dungeonService.getTileAt(0, 0)!;
    player.position = { x: 0, y: 0 };
    otherPlayer.position = { x: 0, y: 0 };
    otherPlayer.controller = 'human';
    playerService.addEquipment(otherPlayer, getEquipmentDefinition('fire-sword')!);
    gameService.activePlayerIndex.set(1);
    expect(gameService.dropInventoryEquipment(otherPlayer, 'spell', 0)).toBe(true);
    gameService.activePlayerIndex.set(0);
    playerService.addEquipment(player, getEquipmentDefinition('sword')!);
    playerService.addEquipment(player, getEquipmentDefinition('daggers')!);
    gameService.pendingReward.set({
      player,
      monster: getTokenDefinition('skeleton-king') as MonsterTokenDefinition,
      rewardTile: tile,
      sourceTile: { x: -1, y: 0 } as PlacedTile,
      remainingRewards: [{ kind: 'equipment', equipmentId: 'axe' }],
    });

    expect(gameService.resolvePendingRewardEquipment()).toBe(true);
    expect(player.inventory.weapons.map(item => item?.id)).toEqual(['sword', 'axe']);
    expect(gameService.getGroundEquipment(tile).map(item => item.id)).toEqual(['fire-sword']);
    expect(gameService.pendingReward()).toBeNull();
    expect(tile.tokenId).toBeUndefined();
  });
});

describe('GameService invariant des équipements au sol', () => {
  let gameService: GameService;
  let playerService: PlayerService;
  let dungeonService: DungeonService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [GameService, PlayerService] });
    gameService = TestBed.inject(GameService);
    playerService = TestBed.inject(PlayerService);
    dungeonService = TestBed.inject(DungeonService);
    playerService.initialize(2);
    gameService.initialize();
    gameService.phase.set('playing');
    gameService.activePlayerIndex.set(0);
  });

  function startTile(): PlacedTile {
    const tile = {
      x: 0,
      y: 0,
      definitionId: 'start',
    } as PlacedTile;
    dungeonService.tiles.push(tile);
    return tile;
  }

  it('refuse un second dépôt sans retirer le nouvel objet de l’inventaire', () => {
    const player = playerService.players[0];
    const tile = startTile();
    player.position = { x: tile.x, y: tile.y };
    playerService.addEquipment(player, getEquipmentDefinition('daggers')!);
    playerService.addEquipment(player, getEquipmentDefinition('sword')!);

    expect(gameService.dropInventoryEquipment(player, 'weapon', 0)).toBe(true);
    expect(gameService.dropInventoryEquipment(player, 'weapon', 1)).toBe(false);
    expect(player.inventory.weapons[1]?.id).toBe('sword');
    expect(gameService.getGroundEquipment(tile).map(item => item.id)).toEqual(['daggers']);
  });

  it('échange atomiquement l’objet au sol avec l’ancien équipement', () => {
    const player = playerService.players[0];
    const otherPlayer = playerService.players[1];
    const tile = startTile();
    player.position = { x: tile.x, y: tile.y };
    otherPlayer.position = { x: tile.x, y: tile.y };
    otherPlayer.controller = 'human';
    playerService.addEquipment(otherPlayer, getEquipmentDefinition('axe')!);
    gameService.activePlayerIndex.set(1);
    expect(gameService.dropInventoryEquipment(otherPlayer, 'weapon', 0)).toBe(true);

    gameService.activePlayerIndex.set(0);
    playerService.addEquipment(player, getEquipmentDefinition('daggers')!);
    playerService.addEquipment(player, getEquipmentDefinition('sword')!);
    expect(gameService.offerGroundEquipmentAt(tile, 0)).toBe(true);

    expect(player.inventory.weapons.map(item => item?.id)).toEqual(['axe', 'sword']);
    expect(gameService.getGroundEquipment(tile).map(item => item.id)).toEqual(['daggers']);
    expect(gameService.getGroundEquipment(tile)).toHaveLength(1);
  });

  it('remplace automatiquement une arme plus faible sur tuile occupée sans dupliquer l’objet au sol', () => {
    const player = playerService.players[0];
    const otherPlayer = playerService.players[1];
    const tile = startTile();
    player.position = { x: tile.x, y: tile.y };
    otherPlayer.position = { x: tile.x, y: tile.y };
    otherPlayer.controller = 'human';
    playerService.addEquipment(otherPlayer, getEquipmentDefinition('daggers')!);
    gameService.activePlayerIndex.set(1);
    expect(gameService.dropInventoryEquipment(otherPlayer, 'weapon', 0)).toBe(true);

    gameService.activePlayerIndex.set(0);
    playerService.addEquipment(player, getEquipmentDefinition('daggers')!);
    playerService.addEquipment(player, getEquipmentDefinition('sword')!);
    gameService.pendingReward.set({
      player,
      monster: getTokenDefinition('fallen') as MonsterTokenDefinition,
      rewardTile: tile,
      sourceTile: { x: -1, y: 0 } as PlacedTile,
      remainingRewards: [{ kind: 'equipment', equipmentId: 'sword' }],
    });

    expect(gameService.resolvePendingRewardEquipment()).toBe(true);
    expect(gameService.pendingReward()).toBeNull();
    expect(gameService.getGroundEquipment(tile).map(item => item.id)).toEqual(['daggers']);
    expect(player.inventory.weapons.map(item => item?.id)).toEqual(['sword', 'sword']);
  });

  it('termine la récompense inutilisable sur tuile occupée et la conserve sur le jeton', () => {
    const player = playerService.players[0];
    const otherPlayer = playerService.players[1];
    const tile = startTile();
    tile.tokenId = 'skeleton-swordsman';
    tile.tokenFace = 'back';
    otherPlayer.position = { x: tile.x, y: tile.y };
    player.position = { x: tile.x, y: tile.y };
    otherPlayer.controller = 'human';
    playerService.addEquipment(otherPlayer, getEquipmentDefinition('fire-sword')!);
    gameService.activePlayerIndex.set(1);
    expect(gameService.dropInventoryEquipment(otherPlayer, 'spell', 0)).toBe(true);
    gameService.activePlayerIndex.set(0);

    playerService.addEquipment(player, getEquipmentDefinition('sword')!);
    playerService.addEquipment(player, { ...getEquipmentDefinition('sword')! });
    gameService.pendingReward.set({
      player,
      monster: getTokenDefinition('skeleton-swordsman') as MonsterTokenDefinition,
      rewardTile: tile,
      sourceTile: { x: -1, y: 0 } as PlacedTile,
      remainingRewards: [{ kind: 'equipment', equipmentId: 'sword' }],
    });

    expect(gameService.resolvePendingRewardEquipment()).toBe(true);
    expect(gameService.pendingReward()).toBeNull();
    expect(gameService.getGroundEquipment(tile).map(item => item.id)).toEqual(['fire-sword']);
    expect(gameService.getRemainingMonsterRewards(tile)).toEqual([
      { kind: 'equipment', equipmentId: 'sword' },
    ]);
    expect(tile.tokenId).toBe('skeleton-swordsman');
    expect(player.inventory.weapons.map(item => item?.id)).toEqual(['sword', 'sword']);
  });

  it('ne repropose pas un objet volontairement refusé dans la même séquence', () => {
    const player = playerService.players[0];
    const tile = startTile();
    player.position = { x: tile.x, y: tile.y };
    const equipment = getEquipmentDefinition('sword')!;
    playerService.addEquipment(player, getEquipmentDefinition('daggers')!);
    playerService.addEquipment(player, equipment);
    expect(gameService.dropInventoryEquipment(player, 'weapon', 0)).toBe(true);

    gameService.pendingGroundEquipment.set({ player, tile, equipment, index: 0 });
    expect(gameService.leaveGroundEquipment()).toBe(true);
    expect(gameService.pendingGroundEquipment()).toBeNull();
    expect(gameService.getGroundEquipment(tile).map(item => item.id)).toEqual(['daggers']);
  });

  it('dépose puis réévalue une récompense apparue sous le héros sans mouvement supplémentaire', () => {
    const player = playerService.players[0];
    player.controller = 'ai';
    const tile = startTile();
    player.position = { x: tile.x, y: tile.y };
    playerService.addEquipment(player, getEquipmentDefinition('sword')!);
    playerService.addEquipment(player, getEquipmentDefinition('axe')!);
    const movementsBefore = TestBed.inject(TurnService).movementsMadeThisTurn();
    gameService.pendingReward.set({
      player,
      monster: getTokenDefinition('fallen') as MonsterTokenDefinition,
      rewardTile: tile,
      sourceTile: { x: -1, y: 0 } as PlacedTile,
      remainingRewards: [{ kind: 'equipment', equipmentId: 'sword' }],
    });

    expect(gameService.resolvePendingRewardEquipment()).toBe(true);
    expect(gameService.pendingReward()).toBeNull();
    expect(gameService.pendingGroundEquipment()).toBeNull();
    expect(gameService.getGroundEquipment(tile).map(item => item.id)).toEqual(['sword']);
    expect(TestBed.inject(TurnService).movementsMadeThisTurn()).toBe(movementsBefore);
  });
});
