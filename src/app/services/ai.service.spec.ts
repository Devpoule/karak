import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { getEquipmentDefinition } from '../data/equipment-definitions';
import { getTokenDefinition } from '../data/token-definitions';
import { PlacedTile } from '../models/tile';
import { AiService } from './ai.service';
import { GameService } from './game.service';
import { PlayerService } from './player.service';
import { CombatService } from './combat.service';

describe('AiService résolutions obligatoires', () => {
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
    gameService.resolveTileEntry(player, { x: 0, y: 0 } as PlacedTile, tile);

    expect(aiService.resolveMandatoryAction()).toBe('resolved');
    expect(player.inventory.key).toBeNull();
    expect(player.treasures).toEqual(['opened-chest']);
    expect(tile.tokenId).toBeUndefined();
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

  it('résout la malédiction avant de laisser une récompense équipement pleine', () => {
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
      { kind: 'equipment', equipmentId: 'sword' },
    ]);
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
