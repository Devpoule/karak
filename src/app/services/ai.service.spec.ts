import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { getEquipmentDefinition } from '../data/equipment-definitions';
import { getTokenDefinition } from '../data/token-definitions';
import { PlacedTile } from '../models/tile';
import { AiService } from './ai.service';
import { GameService } from './game.service';
import { PlayerService } from './player.service';
import { CombatService } from './combat.service';
import { DungeonService } from './dungeon.service';
import { ExplorationService } from './exploration.service';
import { TileDeckService } from './tile-deck.service';
import { TurnService } from './turn.service';
import { TokenBagService } from './token-bag.service';

describe('AiService résolutions obligatoires', () => {
  afterEach(() => {
    vi.useRealTimers();
    (getTokenDefinition('giant-rat') as { strength: number }).strength = 5;
    (getTokenDefinition('skeleton-swordsman') as { strength: number }).strength = 9;
    vi.restoreAllMocks();
  });

  let aiService: AiService;
  let gameService: GameService;
  let playerService: PlayerService;
  let combatService: CombatService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [AiService, GameService, PlayerService] });
    aiService = TestBed.inject(AiService);
    gameService = TestBed.inject(GameService);
    playerService = TestBed.inject(PlayerService);
    combatService = TestBed.inject(CombatService);
    playerService.initialize(2);
    gameService.initialize();
    gameService.phase.set('playing');
    gameService.activePlayerIndex.set(1);
  });

  function startAiCombat(tokenId: 'giant-rat' | 'skeleton-swordsman' | 'skeleton-king'): void {
    const player = gameService.activePlayer!;
    combatService.startCombat(
      player,
      { x: 0, y: 0 } as PlacedTile,
      { x: 1, y: 0, definitionId: 'room-1', tokenId, tokenFace: 'front' } as PlacedTile,
    );
    combatService.rollPendingCombat();
  }

  it('utilise le nombre minimal de Tirs magiques nécessaire pour gagner', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const player = gameService.activePlayer!;
    playerService.addEquipment(player, getEquipmentDefinition('fire-sword')!);
    playerService.addEquipment(player, { ...getEquipmentDefinition('fire-sword')! });
    startAiCombat('skeleton-swordsman');

    expect(aiService.resolveMagicBoltDecision()).toBe(true);
    expect(combatService.pendingCombatRoll()?.magicBoltsUsed).toBe(2);
    expect(combatService.pendingCombatRoll()?.attackPower).toBe(10);
    vi.restoreAllMocks();
  });

  it('conserve les sorts si la victoire reste impossible', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const player = gameService.activePlayer!;
    playerService.addEquipment(player, getEquipmentDefinition('fire-sword')!);
    playerService.addEquipment(player, { ...getEquipmentDefinition('fire-sword')! });
    startAiCombat('giant-rat');

    expect(aiService.resolveMagicBoltDecision()).toBe(true);
    expect(combatService.pendingCombatRoll()?.magicBoltsUsed).toBe(0);
    expect(player.inventory.spells.filter(Boolean)).toHaveLength(2);
    vi.restoreAllMocks();
  });

  it('conserve les Tirs d Argentus après la résolution du combat', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const player = gameService.activePlayer!;
    player.heroId = 'argentus';
    const bolt = getEquipmentDefinition('fire-sword')!;
    playerService.addEquipment(player, bolt);
    startAiCombat('giant-rat');
    (combatService.pendingCombat()!.monster as { strength: number }).strength = 2;

    expect(aiService.resolveMagicBoltDecision()).toBe(true);
    expect(combatService.pendingCombatRoll()?.magicBoltsUsed).toBe(1);
    expect(combatService.resolvePendingCombat()?.outcome).toBe('victory');
    expect(player.inventory.spells[0]).toBe(bolt);
    vi.restoreAllMocks();
  });

  it('utilise une seule fois la Double attaque de Horan lorsque le lancer est insuffisant', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.999)
      .mockReturnValueOnce(0.999);
    const player = gameService.activePlayer!;
    player.heroId = 'horan';
    startAiCombat('giant-rat');

    expect(aiService.resolveHeroRerollDecision()).toBe(true);
    expect(combatService.pendingCombatRoll()?.diceTotal).toBe(12);
    expect(aiService.resolveHeroRerollDecision()).toBe(false);

    vi.restoreAllMocks();
  });

  it('relance successivement les deux dés éligibles de Victorius', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.999)
      .mockReturnValueOnce(0.8);
    const player = gameService.activePlayer!;
    player.heroId = 'victorius';
    (getTokenDefinition('giant-rat') as { strength: number }).strength = 20;
    startAiCombat('giant-rat');

    expect(aiService.resolveHeroRerollDecision()).toBe(true);
    expect(combatService.pendingCombatRoll()?.heroRerollsUsed).toBe(3);
    expect(aiService.resolveHeroRerollDecision()).toBe(false);

    vi.restoreAllMocks();
  });

  it('accepte Inarrêtable par le même état métier que le joueur humain', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999);
    const player = gameService.activePlayer!;
    player.heroId = 'victorius';
    const turnService = TestBed.inject(TurnService);
    turnService.consumeMovement();
    turnService.stopMovements();
    startAiCombat('giant-rat');
    (combatService.pendingCombat()!.monster as { strength: number }).strength = 20;
    const result = combatService.resolvePendingCombat()!;

    expect(result.unstoppableEligible).toBe(true);
    expect(gameService.registerUnstoppableContinuation(result)).toBe(true);
    expect(gameService.finalizeUnstoppableContinuation()).toBe(true);
    combatService.clearLastCombatResult();

    expect(aiService.resolveMandatoryAction()).toBe('resolved');
    expect(gameService.pendingUnstoppableDecision()).toBeNull();
    expect(turnService.remainingMovements()).toBe(3);

    vi.restoreAllMocks();
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

  function prepareCurse(): void {
    const player = playerService.players[1];
    const mummy = getTokenDefinition('skeleton-mummy');
    gameService.pendingReward.set({
      player,
      monster: mummy as any,
      rewardTile: { x: 1, y: 0, definitionId: 'room-1', tokenId: 'skeleton-mummy', tokenFace: 'back' } as PlacedTile,
      sourceTile: { x: 0, y: 0 } as PlacedTile,
      remainingRewards: [{ kind: 'special', effect: 'curse' }],
    });
  }

  function prepareCurseForActiveAi(): void {
    const player = gameService.activePlayer!;
    const mummy = getTokenDefinition('skeleton-mummy');
    gameService.pendingReward.set({
      player,
      monster: mummy as any,
      rewardTile: { x: 1, y: 0, definitionId: 'room-1', tokenId: 'skeleton-mummy', tokenFace: 'back' } as PlacedTile,
      sourceTile: { x: 0, y: 0 } as PlacedTile,
      remainingRewards: [{ kind: 'special', effect: 'curse' }],
    });
  }

  function prepareCurseForSinglePlayer(): void {
    const player = playerService.players[0];
    const mummy = getTokenDefinition('skeleton-mummy');
    gameService.pendingReward.set({
      player,
      monster: mummy as any,
      rewardTile: { x: 1, y: 0, definitionId: 'room-1', tokenId: 'skeleton-mummy', tokenFace: 'back' } as PlacedTile,
      sourceTile: { x: 0, y: 0 } as PlacedTile,
      remainingRewards: [{ kind: 'special', effect: 'curse' }],
    });
  }

  it('ne tente aucune ouverture pour une IA sans clé', () => {
    const player = playerService.players[1];
    const tile = chestTile();

    expect(gameService.resolveTileEntry(player, { x: 0, y: 0 } as PlacedTile, tile)).toBe('none');
    expect(aiService.resolveMandatoryAction()).toBe('none');
    expect(tile.tokenId).toBe('closed-chest');
  });

  it('ouvre automatiquement un coffre IA avec clé et attribue le trésor', () => {
    const player = playerService.players[1];
    playerService.addEquipment(player, getEquipmentDefinition('key')!);
    const tile = chestTile();
    expect(gameService.resolveTileEntry(player, { x: 0, y: 0 } as PlacedTile, tile)).toBe('treasure');

    expect(aiService.resolveMandatoryAction()).toBe('resolved');
    expect(player.inventory.key).toBeNull();
    expect(player.treasures).toEqual(['opened-chest']);
    expect(tile.tokenId).toBeUndefined();
    expect(gameService.pendingTreasure()).toBeNull();
  });

  it('ne déplace pas une IA tant qu une résolution obligatoire est active', () => {
    const player = playerService.players[1];
    playerService.addEquipment(player, getEquipmentDefinition('key')!);
    const tile = chestTile();
    gameService.resolveTileEntry(player, { x: 0, y: 0 } as PlacedTile, tile);
    const positionBefore = player.position;

    expect(aiService.playAction()).toBe(false);
    expect(player.position).toBe(positionBefore);
    expect(gameService.pendingTreasure()).not.toBeNull();
    expect(gameService.turnTransitionPending()).toBe(false);
  });

  it('Taia IA reprend ses mouvements apres un coffre sans cle', () => {
    const player = gameService.activePlayer!;
    player.heroId = 'taia';
    const dungeonService = TestBed.inject(DungeonService);
    const tokenBagService = TestBed.inject(TokenBagService);
    const turnService = TestBed.inject(TurnService);
    const source = dungeonService.getTileAt(0, 0)!;
    const destination = {
      definitionId: 'straight-room',
      x: 1,
      y: 0,
      rotation: 0,
    } as PlacedTile;
    dungeonService.tiles.push(destination);
    const chest = getTokenDefinition('closed-chest')!;
    const rat = getTokenDefinition('giant-rat')!;
    vi.spyOn(tokenBagService, 'draw')
      .mockReturnValueOnce(chest)
      .mockReturnValueOnce(rat);

    turnService.consumeMovement();
    expect(gameService.resolveTileEntry(player, source, destination, true, true)).toBe('token-choice');
    expect(aiService.resolveMandatoryAction()).toBe('resolved');
    expect(gameService.pendingTokenChoice()).toBeNull();
    expect(gameService.hasPendingTileResolution).toBe(false);
    expect(turnService.remainingMovements()).toBe(3);
    expect(gameService.turnTransitionPending()).toBe(false);
  });

  it('Taia IA resout le jeton monstre une seule fois', () => {
    const player = gameService.activePlayer!;
    player.heroId = 'taia';
    const dungeonService = TestBed.inject(DungeonService);
    const tokenBagService = TestBed.inject(TokenBagService);
    const turnService = TestBed.inject(TurnService);
    const source = dungeonService.getTileAt(0, 0)!;
    const destination = {
      definitionId: 'straight-room',
      x: 1,
      y: 0,
      rotation: 0,
    } as PlacedTile;
    dungeonService.tiles.push(destination);
    const rat = getTokenDefinition('giant-rat')!;
    const chest = getTokenDefinition('closed-chest')!;
    vi.spyOn(tokenBagService, 'draw')
      .mockReturnValueOnce(rat)
      .mockReturnValueOnce(chest);

    turnService.consumeMovement();
    expect(gameService.resolveTileEntry(player, source, destination, true, true)).toBe('token-choice');
    expect(aiService.resolveMandatoryAction()).toBe('resolved');
    expect(combatService.hasPendingCombat).toBe(true);
    expect(aiService.resolveMandatoryAction()).toBe('waiting');
    expect(destination.tokenId).toBe('giant-rat');
  });

  it('récupère le trésor du Mort puis le rubis du dragon', () => {
    const player = playerService.players[1];
    const fallen = getTokenDefinition('fallen');
    const dragon = getTokenDefinition('dragon');
    expect(fallen?.kind).toBe('monster');
    expect(dragon?.kind).toBe('monster');

    gameService.pendingReward.set({
      player,
      monster: fallen as any,
      rewardTile: { x: 1, y: 0, definitionId: 'room-1', tokenId: 'fallen', tokenFace: 'back' } as PlacedTile,
      sourceTile: { x: 0, y: 0 } as PlacedTile,
      remainingRewards: [{ kind: 'treasure', tokenId: 'open-chest' }],
    });
    expect(aiService.resolveMandatoryAction()).toBe('resolved');
    expect(player.treasures).toEqual(['monster-treasure']);

    gameService.pendingReward.set({
      player,
      monster: dragon as any,
      rewardTile: { x: 1, y: 0, definitionId: 'room-1', tokenId: 'dragon', tokenFace: 'back' } as PlacedTile,
      sourceTile: { x: 0, y: 0 } as PlacedTile,
      remainingRewards: [{ kind: 'treasure', tokenId: 'treasure' }],
    });
    expect(aiService.resolveMandatoryAction()).toBe('resolved');
    expect(player.treasures).toEqual(['monster-treasure', 'dragon-ruby']);
  });

  it('consomme une récompense trésor une seule fois et conserve les autres', () => {
    const player = playerService.players[1];
    const fallen = getTokenDefinition('fallen');
    const equipmentReward = { kind: 'equipment', equipmentId: 'sword' } as const;
    gameService.pendingReward.set({
      player,
      monster: fallen as any,
      rewardTile: { x: 1, y: 0, definitionId: 'room-1', tokenId: 'fallen', tokenFace: 'back' } as PlacedTile,
      sourceTile: { x: 0, y: 0 } as PlacedTile,
      remainingRewards: [{ kind: 'treasure', tokenId: 'open-chest' }, equipmentReward],
    });

    expect(aiService.resolveMandatoryAction()).toBe('resolved');
    expect(player.treasures).toEqual(['monster-treasure']);
    expect(gameService.pendingReward()?.remainingRewards).toEqual([equipmentReward]);
    expect(aiService.resolveMandatoryAction()).toBe('resolved');
    expect(player.treasures).toEqual(['monster-treasure']);
    expect(player.inventory.weapons[0]?.id).toBe('sword');
  });

  it('termine la résolution IA avant de programmer le joueur suivant', async () => {
    vi.useFakeTimers();
    try {
      const player = gameService.activePlayer!;
      const fallen = getTokenDefinition('fallen');
      const rewardTile = {
        x: 1,
        y: 0,
        definitionId: 'room-1',
        tokenId: 'fallen',
        tokenFace: 'back',
      } as PlacedTile;
      gameService.pendingReward.set({
        player,
        monster: fallen as any,
        rewardTile,
        sourceTile: { x: 0, y: 0 } as PlacedTile,
        remainingRewards: [
          { kind: 'treasure', tokenId: 'open-chest' },
          { kind: 'equipment', equipmentId: 'sword' },
        ],
      });

      expect(aiService.resolveMandatoryAction()).toBe('resolved');
      expect(gameService.pendingReward()?.remainingRewards).toEqual([
        { kind: 'equipment', equipmentId: 'sword' },
      ]);
      expect(gameService.turnTransitionPending()).toBe(false);
      expect(gameService.activePlayerIndex()).toBe(1);

      expect(aiService.resolveMandatoryAction()).toBe('resolved');
      expect(gameService.pendingReward()).toBeNull();
      expect(gameService.turnTransitionPending()).toBe(true);
      expect(gameService.activePlayerIndex()).toBe(1);

      vi.advanceTimersByTime(2800);
      await Promise.resolve();

      expect(gameService.turnTransitionPending()).toBe(false);
      expect(gameService.activePlayerIndex()).toBe(0);
      expect(player.inventory.weapons[0]?.id).toBe('sword');
      expect(rewardTile.tokenId).toBeUndefined();
    } finally {
      vi.useRealTimers();
    }
  });

  it('ne contrôle jamais un joueur humain', () => {
    gameService.activePlayerIndex.set(0);
    expect(aiService.resolveMandatoryAction()).toBe('none');
  });

  it('maudit l unique adversaire en partie à deux', () => {
    prepareCurse();

    expect(aiService.resolveMandatoryAction()).toBe('resolved');
    expect(playerService.players[0].isCursed).toBe(true);
    expect(playerService.players[1].isCursed).toBe(false);
    expect(gameService.pendingReward()).toBeNull();
  });

  it('sélectionne le joueur ayant le plus de trésors, avec départage par index', () => {
    playerService.initialize(3);
    gameService.initialize();
    gameService.phase.set('playing');
    gameService.activePlayerIndex.set(2);
    playerService.addTreasure(playerService.players[0], 'opened-chest');
    playerService.addTreasure(playerService.players[1], 'dragon-ruby');
    prepareCurseForActiveAi();

    expect(aiService.resolveMandatoryAction()).toBe('resolved');
    expect(playerService.players[1].isCursed).toBe(true);
    expect(playerService.players[0].isCursed).toBe(false);
  });

  it('conserve une malédiction déjà détenue par la cible prioritaire', () => {
    playerService.setCursed(playerService.players[0], true);
    prepareCurse();

    expect(aiService.resolveMandatoryAction()).toBe('resolved');
    expect(playerService.players[0].isCursed).toBe(true);
    expect(playerService.players[1].isCursed).toBe(false);
  });

  it('transfère la malédiction et démaudit l ancien détenteur', () => {
    playerService.initialize(3);
    gameService.initialize();
    gameService.phase.set('playing');
    gameService.activePlayerIndex.set(2);
    playerService.setCursed(playerService.players[0], true);
    playerService.addTreasure(playerService.players[1], 'dragon-ruby');
    prepareCurseForActiveAi();

    expect(aiService.resolveMandatoryAction()).toBe('resolved');
    expect(playerService.players[0].isCursed).toBe(false);
    expect(playerService.players[1].isCursed).toBe(true);
  });

  it('laisse automatiquement un équipement inutile et conserve la malédiction en attente', () => {
    playerService.setCursed(playerService.players[0], true);
    const player = playerService.players[1];
    playerService.addEquipment(player, getEquipmentDefinition('sword')!);
    playerService.addEquipment(player, getEquipmentDefinition('sword')!);
    const mummy = getTokenDefinition('skeleton-mummy');
    gameService.pendingReward.set({
      player,
      monster: mummy as any,
      rewardTile: { x: 1, y: 0, definitionId: 'room-1', tokenId: 'skeleton-mummy', tokenFace: 'back' } as PlacedTile,
      sourceTile: { x: 0, y: 0 } as PlacedTile,
      remainingRewards: [
        { kind: 'equipment', equipmentId: 'sword' },
        { kind: 'special', effect: 'curse' },
      ],
    });

    expect(aiService.resolveMandatoryAction()).toBe('resolved');
    expect(playerService.players[0].isCursed).toBe(true);
    expect(gameService.pendingReward()?.remainingRewards).toEqual([
      { kind: 'special', effect: 'curse' },
    ]);
    expect(gameService.getGroundEquipment(gameService.pendingReward()!.rewardTile).map(item => item.id))
      .toEqual(['sword']);
  });

  it('n appelle aucune cible lorsque la partie ne contient aucun adversaire', () => {
    playerService.initialize(2);
    playerService.players.splice(1, 1);
    playerService.players[0].controller = 'ai';
    gameService.initialize();
    gameService.phase.set('playing');
    gameService.activePlayerIndex.set(0);
    prepareCurseForSinglePlayer();

    expect(aiService.resolveMandatoryAction()).toBe('unsupported:curse-target');
    expect(gameService.pendingReward()).not.toBeNull();
  });

  it.each([
    ['weapon', 'sword'],
    ['spell', 'heart'],
    ['key', 'key'],
  ] as const)('récupère une récompense %s avec un emplacement libre', (kind, equipmentId) => {
    const player = playerService.players[1];
    const fallen = getTokenDefinition('fallen');
    gameService.pendingReward.set({
      player,
      monster: fallen as any,
      rewardTile: { x: 1, y: 0, definitionId: 'room-1', tokenId: 'fallen', tokenFace: 'back' } as PlacedTile,
      sourceTile: { x: 0, y: 0 } as PlacedTile,
      remainingRewards: [{ kind: 'equipment', equipmentId }],
    });

    expect(aiService.resolveMandatoryAction()).toBe('resolved');
    expect(gameService.pendingReward()).toBeNull();
    if (kind === 'weapon') expect(player.inventory.weapons[0]?.id).toBe(equipmentId);
    if (kind === 'spell') expect(player.inventory.spells[0]?.id).toBe(equipmentId);
    if (kind === 'key') expect(player.inventory.key?.id).toBe(equipmentId);
  });

  it('refuse une seconde clé et conserve la récompense intacte', () => {
    const player = playerService.players[1];
    playerService.addEquipment(player, getEquipmentDefinition('key')!);
    const fallen = getTokenDefinition('fallen');
    gameService.pendingReward.set({
      player,
      monster: fallen as any,
      rewardTile: { x: 1, y: 0, definitionId: 'room-1', tokenId: 'fallen', tokenFace: 'back' } as PlacedTile,
      sourceTile: { x: 0, y: 0 } as PlacedTile,
      remainingRewards: [{ kind: 'equipment', equipmentId: 'key' }],
    });

    expect(aiService.resolveMandatoryAction()).toBe('resolved');
    expect(player.inventory.key?.id).toBe('key');
    expect(gameService.pendingReward()).toBeNull();
  });

  it('ne modifie pas le joueur pendant une résolution équipement obligatoire', () => {
    const player = playerService.players[1];
    const fallen = getTokenDefinition('fallen');
    player.position = { x: 0, y: 0 };
    gameService.pendingReward.set({
      player,
      monster: fallen as any,
      rewardTile: { x: 1, y: 0, definitionId: 'room-1', tokenId: 'fallen', tokenFace: 'back' } as PlacedTile,
      sourceTile: { x: 0, y: 0 } as PlacedTile,
      remainingRewards: [{ kind: 'equipment', equipmentId: 'key' }],
    });
    playerService.addEquipment(player, getEquipmentDefinition('key')!);
    const positionBefore = player.position;

    expect(aiService.playAction()).toBe(false);
    expect(player.position).toBe(positionBefore);
  });

  it('remplace l arme la plus faible uniquement pour une amélioration stricte', () => {
    const player = playerService.players[1];
    playerService.addEquipment(player, getEquipmentDefinition('daggers')!);
    playerService.addEquipment(player, getEquipmentDefinition('sword')!);
    const fallen = getTokenDefinition('fallen');
    gameService.pendingReward.set({
      player,
      monster: fallen as any,
      rewardTile: { x: 1, y: 0, definitionId: 'room-1', tokenId: 'fallen', tokenFace: 'back' } as PlacedTile,
      sourceTile: { x: 0, y: 0 } as PlacedTile,
      remainingRewards: [{ kind: 'equipment', equipmentId: 'axe' }],
    });

    expect(aiService.resolveMandatoryAction()).toBe('resolved');
    expect(player.inventory.weapons.map(weapon => weapon?.id)).toEqual(['axe', 'sword']);
  });

  it('conserve les armes en cas d égalité et laisse la récompense disponible', () => {
    const player = playerService.players[1];
    playerService.addEquipment(player, getEquipmentDefinition('sword')!);
    playerService.addEquipment(player, getEquipmentDefinition('sword')!);
    const fallen = getTokenDefinition('fallen');
    const tile = { x: 1, y: 0, definitionId: 'room-1', tokenId: 'fallen', tokenFace: 'back' } as PlacedTile;
    gameService.pendingReward.set({
      player,
      monster: fallen as any,
      rewardTile: tile,
      sourceTile: { x: 0, y: 0 } as PlacedTile,
      remainingRewards: [{ kind: 'equipment', equipmentId: 'sword' }],
    });

    expect(aiService.resolveMandatoryAction()).toBe('resolved');
    expect(player.inventory.weapons.map(weapon => weapon?.id)).toEqual(['sword', 'sword']);
    expect(gameService.pendingReward()).toBeNull();
    expect(tile.tokenId).toBe('fallen');
  });

  it('poursuit son tour si la tuile de récompense est occupée et conserve les deux équipements', () => {
    vi.useFakeTimers();
    const aiPlayer = gameService.activePlayer!;
    const humanPlayer = playerService.players[0];
    const tile = { x: 0, y: 0, definitionId: 'start' } as PlacedTile;
    aiPlayer.position = { x: 0, y: 0 };
    humanPlayer.position = { x: 0, y: 0 };
    humanPlayer.controller = 'human';
    playerService.addEquipment(humanPlayer, getEquipmentDefinition('axe')!);
    gameService.activePlayerIndex.set(0);
    expect(gameService.dropInventoryEquipment(humanPlayer, 'weapon', 0)).toBe(true);
    gameService.activePlayerIndex.set(1);

    playerService.addEquipment(aiPlayer, getEquipmentDefinition('sword')!);
    playerService.addEquipment(aiPlayer, { ...getEquipmentDefinition('sword')! });
    gameService.pendingReward.set({
      player: aiPlayer,
      monster: getTokenDefinition('skeleton-swordsman') as any,
      rewardTile: tile,
      sourceTile: { x: -1, y: 0 } as PlacedTile,
      remainingRewards: [
        { kind: 'equipment', equipmentId: 'sword' },
        { kind: 'special', effect: 'curse' },
      ],
    });

    try {
      expect(aiService.resolveMandatoryAction()).toBe('resolved');
      expect(aiPlayer.inventory.weapons.map(item => item?.id)).toEqual(['sword', 'sword']);
      expect(gameService.pendingReward()?.remainingRewards).toEqual([
        { kind: 'special', effect: 'curse' },
      ]);
      expect(humanPlayer.isCursed).toBe(false);
      expect(gameService.getRemainingMonsterRewards(tile)).toEqual([
        { kind: 'special', effect: 'curse' },
        { kind: 'equipment', equipmentId: 'sword' },
      ]);

      expect(aiService.resolveMandatoryAction()).toBe('resolved');
      expect(gameService.pendingReward()).toBeNull();
      expect(gameService.hasPendingTileResolution).toBe(false);
      expect(humanPlayer.isCursed).toBe(true);
      expect(gameService.getGroundEquipment(tile).map(item => item.id)).toEqual(['axe']);
      expect(aiPlayer.inventory.weapons.map(item => item?.id)).toEqual(['sword', 'sword']);
      expect(gameService.turnTransitionPending()).toBe(true);
      expect(gameService.activePlayerIndex()).toBe(1);
      vi.runAllTimers();
      expect(gameService.activePlayerIndex()).toBe(0);
      expect(gameService.turnTransitionPending()).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('conserve les sorts pleins et laisse le sort sur le jeton', () => {
    const player = playerService.players[1];
    playerService.addEquipment(player, getEquipmentDefinition('fire-sword')!);
    playerService.addEquipment(player, getEquipmentDefinition('heart')!);
    playerService.addEquipment(player, getEquipmentDefinition('fire-sword')!);
    const fallen = getTokenDefinition('fallen');
    const tile = { x: 1, y: 0, definitionId: 'room-1', tokenId: 'fallen', tokenFace: 'back' } as PlacedTile;
    gameService.pendingReward.set({
      player,
      monster: fallen as any,
      rewardTile: tile,
      sourceTile: { x: 0, y: 0 } as PlacedTile,
      remainingRewards: [{ kind: 'equipment', equipmentId: 'heart' }],
    });

    expect(aiService.resolveMandatoryAction()).toBe('resolved');
    expect(player.inventory.spells).toHaveLength(3);
    expect(tile.tokenId).toBe('fallen');
  });

  it('conserve une autre récompense récupérable avant tout abandon', () => {
    const player = playerService.players[1];
    playerService.addEquipment(player, getEquipmentDefinition('sword')!);
    playerService.addEquipment(player, getEquipmentDefinition('sword')!);
    const fallen = getTokenDefinition('fallen');
    gameService.pendingReward.set({
      player,
      monster: fallen as any,
      rewardTile: { x: 1, y: 0, definitionId: 'room-1', tokenId: 'fallen', tokenFace: 'back' } as PlacedTile,
      sourceTile: { x: 0, y: 0 } as PlacedTile,
      remainingRewards: [
        { kind: 'equipment', equipmentId: 'sword' },
        { kind: 'treasure', tokenId: 'open-chest' },
      ],
    });

    expect(aiService.resolveMandatoryAction()).toBe('resolved');
    expect(player.treasures).toEqual(['monster-treasure']);
    expect(player.inventory.weapons.map(weapon => weapon?.id)).toEqual(['sword', 'sword']);
  });

  it('laisse un équipement au sol lorsque la stratégie le refuse', () => {
    const player = playerService.players[1];
    const equipment = getEquipmentDefinition('sword')!;
    playerService.addEquipment(player, getEquipmentDefinition('sword')!);
    playerService.addEquipment(player, getEquipmentDefinition('sword')!);
    const tile = { x: 1, y: 0, definitionId: 'room-1' } as PlacedTile;
    gameService.pendingGroundEquipment.set({ player, tile, equipment, index: 0 });

    expect(aiService.resolveMandatoryAction()).toBe('resolved');
    expect(gameService.pendingGroundEquipment()).toBeNull();
  });

  it('récupère un équipement au sol avec un emplacement libre', () => {
    const player = playerService.players[1];
    const equipment = getEquipmentDefinition('sword')!;
    player.position = { x: 0, y: 0 };
    playerService.addEquipment(player, equipment);
    player.controller = 'human';
    expect(gameService.dropInventoryEquipment(player, 'weapon', 0)).toBe(true);
    player.controller = 'ai';
    gameService.pendingGroundEquipment.set({
      player,
      tile: { x: 0, y: 0, definitionId: 'start' } as PlacedTile,
      equipment,
      index: 0,
    });
    expect(aiService.resolveMandatoryAction()).toBe('resolved');
    expect(gameService.pendingGroundEquipment()).toBeNull();
    expect(player.inventory.weapons[0]?.id).toBe('sword');
  });

  it('ne remplace pas un sort ou une clé au sol lorsque le type est plein', () => {
    const player = playerService.players[1];
    const spell = getEquipmentDefinition('heart')!;
    const key = getEquipmentDefinition('key')!;
    playerService.addEquipment(player, getEquipmentDefinition('fire-sword')!);
    playerService.addEquipment(player, getEquipmentDefinition('heart')!);
    playerService.addEquipment(player, getEquipmentDefinition('fire-sword')!);
    playerService.addEquipment(player, key);
    gameService.pendingGroundEquipment.set({
      player,
      tile: { x: 1, y: 0, definitionId: 'room-1' } as PlacedTile,
      equipment: spell,
      index: 0,
    });

    expect(aiService.resolveMandatoryAction()).toBe('resolved');
    expect(player.inventory.key?.id).toBe('key');
  });
});

describe('AiService déplacements et exploration', () => {
  let aiService: AiService;
  let gameService: GameService;
  let playerService: PlayerService;
  let dungeonService: DungeonService;
  let tileDeckService: TileDeckService;
  let turnService: TurnService;

  afterEach(() => {
    vi.useRealTimers();
  });

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [AiService, GameService, PlayerService] });
    aiService = TestBed.inject(AiService);
    gameService = TestBed.inject(GameService);
    playerService = TestBed.inject(PlayerService);
    dungeonService = TestBed.inject(DungeonService);
    tileDeckService = TestBed.inject(TileDeckService);
    turnService = TestBed.inject(TurnService);
    playerService.initialize(2);
    gameService.initialize();
    gameService.phase.set('playing');
    gameService.activePlayerIndex.set(1);
    dungeonService.initialize();
    playerService.players[1].position = { x: 0, y: 0 };
  });

  it('déplace une IA vers une tuile connectée et consomme un mouvement', () => {
    dungeonService.placeTile({ definitionId: 'straight-01', x: 0, y: -1, rotation: 90 });
    vi.spyOn(Math, 'random').mockReturnValue(0);

    expect(aiService.playAction()).toBe(true);

    expect(playerService.players[1].position).toEqual({ x: 0, y: -1 });
    expect(turnService.remainingMovements()).toBe(3);
    vi.restoreAllMocks();
  });

  it('utilise le Portail de guérison sans créer de sélection bloquante', () => {
    const ai = playerService.players[1];
    ai.lives = 3;
    playerService.addEquipment(ai, getEquipmentDefinition('heart')!);
    dungeonService.placeTile({ definitionId: 'healing-corner', x: 2, y: 0, rotation: 0 });

    expect(aiService.playAction()).toBe(true);
    expect(gameService.healingPortalSelection()).toBeNull();
    expect(ai.inventory.spells.filter(Boolean)).toHaveLength(0);
    expect(gameService.turnTransitionPending()).toBe(false);
  });

  it('explore une ouverture libre avec une pioche déterministe', () => {
    (tileDeckService as unknown as { deck: string[] }).deck = ['straight-01'];
    vi.spyOn(Math, 'random').mockReturnValue(0);

    expect(aiService.playAction()).toBe(true);

    expect(dungeonService.tiles).toHaveLength(2);
    expect(playerService.players[1].position).not.toEqual({ x: 0, y: 0 });
    expect(turnService.remainingMovements()).toBe(3);
    vi.restoreAllMocks();
  });

  it('ne consomme pas de mouvement lorsqu une résolution bloque encore l IA', () => {
    const player = playerService.players[1];
    player.inventory.key = {
      id: 'key', kind: 'key', name: 'Clé', image: '/assets/tokens/key.png',
    };
    const chestTile = {
      definitionId: 'room-01', x: 1, y: 0, rotation: 0,
      tokenId: 'closed-chest', tokenFace: 'front',
    } as PlacedTile;
    dungeonService.placeTile(chestTile);
    gameService.resolveTileEntry(player, { definitionId: 'start', x: 0, y: 0, rotation: 0 }, chestTile);
    const movementsBefore = turnService.remainingMovements();

    expect(aiService.playAction()).toBe(false);
    expect(turnService.remainingMovements()).toBe(movementsBefore);
    expect(gameService.pendingTreasure()).not.toBeNull();
    expect(gameService.turnTransitionPending()).toBe(false);
  });

  it('termine le tour après une Substitution vers une tuile sans interaction', () => {
    vi.useFakeTimers();
    const ai = playerService.players[1];
    const target = playerService.players[0];
    ai.heroId = 'xanros';
    ai.position = { x: 0, y: 0 };
    target.position = { x: 1, y: 0 };
    dungeonService.placeTile({ definitionId: 'room-1', x: 1, y: 0, rotation: 0 });

    expect(aiService.playAction()).toBe(true);
    expect(ai.position).toEqual({ x: 1, y: 0 });
    expect(turnService.remainingMovements()).toBe(0);
    expect(turnService.movementsMadeThisTurn()).toBe(4);
    expect(gameService.pendingXanrosSubstitutionAction()).toBeNull();
    expect(gameService.turnTransitionPending()).toBe(true);
    vi.runOnlyPendingTimers();
    expect(gameService.activePlayerIndex()).toBe(0);
  });

  it('résout une interaction de coffre de Substitution sans rester bloquée', () => {
    vi.useFakeTimers();
    const ai = playerService.players[1];
    const target = playerService.players[0];
    ai.heroId = 'xanros';
    ai.position = { x: 0, y: 0 };
    target.position = { x: 1, y: 0 };
    ai.inventory.key = {
      id: 'key', kind: 'key', name: 'Clé', image: '/assets/tokens/key.png',
    };
    const chestTile = {
      definitionId: 'room-1', x: 1, y: 0, rotation: 0,
      tokenId: 'closed-chest', tokenFace: 'front',
    } as PlacedTile;
    dungeonService.placeTile(chestTile);

    expect(aiService.playAction()).toBe(true);
    expect(gameService.pendingXanrosSubstitutionAction()?.tile).toBe(chestTile);
    expect(aiService.resolveMandatoryAction()).toBe('resolved');
    expect(gameService.pendingTreasure()).not.toBeNull();
    expect(aiService.resolveMandatoryAction()).toBe('resolved');
    expect(gameService.pendingTreasure()).toBeNull();
    expect(gameService.turnTransitionPending()).toBe(true);
    vi.runOnlyPendingTimers();
  });
});
