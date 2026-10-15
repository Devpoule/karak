import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getEquipmentDefinition } from '../data/equipment-definitions';
import { GameService, PendingReward } from './game.service';
import { PlayerService } from './player.service';
import { TurnService } from './turn.service';
import { CombatService } from './combat.service';
import { TokenBagService } from './token-bag.service';
import { PlacedTile } from '../models/tile';
import { Player } from '../models/player';

describe('GameService contrat d entrée dans une tuile', () => {
  let gameService: GameService;
  let playerService: PlayerService;
  let turnService: TurnService;
  let combatService: CombatService;
  let tokenBagService: TokenBagService;
  let player: Player;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({ providers: [GameService, PlayerService] });
    gameService = TestBed.inject(GameService);
    playerService = TestBed.inject(PlayerService);
    turnService = TestBed.inject(TurnService);
    combatService = TestBed.inject(CombatService);
    tokenBagService = TestBed.inject(TokenBagService);
    playerService.initialize(2);
    gameService.initialize();
    gameService.phase.set('playing');
    gameService.activePlayerIndex.set(0);
    player = playerService.players[0];
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  const tile = (tokenId?: string, tokenFace: 'front' | 'back' = 'front'): PlacedTile => ({
    definitionId: 'corridor-01',
    x: 1,
    y: 0,
    rotation: 0,
    tokenId: tokenId as PlacedTile['tokenId'],
    tokenFace: tokenId ? tokenFace : undefined,
  });

  it('laisse poursuivre le tour sur une tuile vide', () => {
    const result = gameService.resolveTileEntry(player, tile(), tile());

    expect(result).toBe('none');
    expect(gameService.hasPendingTileResolution).toBe(false);
    expect(turnService.remainingMovements()).toBe(4);
  });

  it('ignore l entrée d un héros en récupération', () => {
    player.recoveryState = 'resting';

    expect(gameService.resolveTileEntry(player, tile('giant-rat'), tile('giant-rat'))).toBe('none');
    expect(combatService.hasPendingCombat).toBe(false);
    expect(turnService.remainingMovements()).toBe(4);
  });

  it('révèle une salle nouvellement explorée puis déclenche son combat', () => {
    const room: PlacedTile = { ...tile(), definitionId: 'straight-room' };
    (tokenBagService as unknown as { bag: string[] }).bag = ['giant-rat'];
    tokenBagService.remainingTokens.set(1);

    const result = gameService.resolveTileEntry(player, tile(), room, true);

    expect(room.tokenId).toBe('giant-rat');
    expect(result).toBe('combat');
    expect(combatService.pendingCombat()?.monsterTile).toBe(room);
    expect(turnService.remainingMovements()).toBe(0);
  });

  it('résout le monstre découvert avant de conserver Sneak pour les tuiles connues', () => {
    player.heroId = 'aderyn';
    const room = { ...tile(), definitionId: 'straight-room' };
    (tokenBagService as unknown as { bag: string[] }).bag = ['closed-chest', 'giant-rat'];
    tokenBagService.remainingTokens.set(2);

    expect(gameService.resolveTileEntry(player, tile(), room, true)).toBe('combat');
    expect(room.tokenId).toBe('giant-rat');
    expect(combatService.hasPendingCombat).toBe(true);

    combatService.initialize();
    turnService.resetMovements();

    const chestRoom = { ...tile('closed-chest'), definitionId: 'straight-room' };
    playerService.addEquipment(player, getEquipmentDefinition('key')!);
    expect(gameService.resolveTileEntry(player, tile(), chestRoom)).toBe('treasure');
    expect(chestRoom.tokenId).toBeUndefined();
    expect(gameService.pendingTreasure()).toBeNull();
  });

  it('ne déclenche pas deux combats sur le même état pending', () => {
    const destination = tile('giant-rat');
    const source = tile();

    expect(gameService.resolveTileEntry(player, source, destination)).toBe('combat');
    expect(gameService.resolveTileEntry(player, source, destination)).toBe('none');
    expect(combatService.pendingCombat()?.monsterTile).toBe(destination);
  });

  it('applique le pouvoir de discrétion d Aderyn sur un monstre vivant', () => {
    player.heroId = 'aderyn';

    const result = gameService.resolveTileEntry(player, tile(), tile('giant-rat'));

    expect(result).toBe('none');
    expect(combatService.hasPendingCombat).toBe(false);
    expect(turnService.remainingMovements()).toBe(4);
  });

  it('laisse passer un coffre fermé lorsque le joueur ne possède pas de clé', () => {
    const result = gameService.resolveTileEntry(player, tile(), tile('closed-chest'));

    expect(result).toBe('none');
    expect(gameService.pendingTreasure()).toBeNull();
    expect(turnService.remainingMovements()).toBe(4);
  });

  it('ouvre automatiquement un coffre fermé avec une clé', () => {
    const destination = tile('closed-chest');
    playerService.addEquipment(player, getEquipmentDefinition('key')!);

    expect(gameService.resolveTileEntry(player, tile(), destination)).toBe('treasure');
    expect(gameService.pendingTreasure()).toBeNull();
    expect(turnService.remainingMovements()).toBe(0);
    expect(player.inventory.key).toBeNull();
    expect(player.treasures).toContain('opened-chest');
    expect(destination.tokenId).toBeUndefined();
  });

  it('met en attente la récompense d un monstre déjà vaincu', () => {
    player.controller = 'ai';
    const destination = tile('skeleton-swordsman', 'back');

    expect(gameService.resolveTileEntry(player, tile(), destination)).toBe('reward');
    expect(gameService.pendingReward()?.rewardTile).toBe(destination);
    expect(turnService.remainingMovements()).toBe(0);
  });

  it('propose la récompense équipement à un joueur humain lorsque l inventaire est libre', () => {
    const destination = tile('skeleton-swordsman', 'back');

    expect(gameService.resolveTileEntry(player, tile(), destination)).toBe('reward');
    expect(player.inventory.weapons.some(weapon => weapon?.id === 'sword')).toBe(true);
    expect(gameService.pendingReward()).toBeNull();
  });

  it('ne traite pas un coffre déjà retourné comme une nouvelle résolution', () => {
    const destination = tile('open-chest', 'back');

    expect(gameService.resolveTileEntry(player, tile(), destination)).toBe('none');
    expect(gameService.pendingTreasure()).toBeNull();
    expect(turnService.remainingMovements()).toBe(4);
  });

  it('réinitialise les états pending et empêche toute mutation tardive', () => {
    const destination = tile('closed-chest');
    playerService.addEquipment(player, getEquipmentDefinition('key')!);
    gameService.resolveTileEntry(player, tile(), destination);

    gameService.initialize();

    expect(gameService.pendingTreasure()).toBeNull();
    expect(gameService.pendingReward()).toBeNull();
    expect(gameService.hasPendingTileResolution).toBe(false);
    expect(destination.tokenId).toBeUndefined();
  });

  it('refuse la récupération directe lorsque l inventaire est plein', () => {
    const destination = tile();
    playerService.addEquipment(player, getEquipmentDefinition('daggers')!);
    playerService.addEquipment(player, getEquipmentDefinition('sword')!);
    gameService.pendingGroundEquipment.set({
      player,
      tile: destination,
      equipment: getEquipmentDefinition('axe')!,
      index: 0,
    });

    expect(gameService.collectGroundEquipment()).toBe(false);
    expect(gameService.pendingGroundEquipment()).not.toBeNull();
    expect(gameService.leaveGroundEquipment()).toBe(true);

    gameService.pendingReward.set({
      player,
      monster: { id: 'skeleton-king', kind: 'monster', origin: 'base', name: 'Roi', strength: 10, image: '', rewards: [] },
      rewardTile: destination,
      sourceTile: tile(),
      remainingRewards: [{ kind: 'equipment', equipmentId: 'axe' }],
    });
    expect(gameService.replacePendingEquipment(0)).toBe(true);
    expect(player.inventory.weapons[0]?.id).toBe('axe');
  });

  it('conserve les récompenses restantes après une récupération partielle', () => {
    const pending: PendingReward = {
      player,
      monster: { id: 'skeleton-king', kind: 'monster', origin: 'base', name: 'Roi', strength: 10, image: '', rewards: [] },
      rewardTile: tile('skeleton-king', 'back'),
      sourceTile: tile(),
      remainingRewards: [
        { kind: 'equipment', equipmentId: 'sword' },
        { kind: 'treasure', tokenId: 'treasure' },
      ],
    };
    gameService.pendingReward.set(pending);

    expect(gameService.collectPendingEquipment()).toBe(true);
    expect(gameService.pendingReward()?.remainingRewards).toEqual([
      { kind: 'treasure', tokenId: 'treasure' },
    ]);
    expect(gameService.collectPendingTreasure()).toBe(true);
    expect(gameService.pendingReward()).toBeNull();
  });

  it('ignore toute entrée en phase setup sans révéler ni déclencher de combat', () => {
    gameService.phase.set('setup');
    const destination = tile('giant-rat');
    const movementsBefore = turnService.remainingMovements();

    const result = gameService.resolveTileEntry(player, tile(), destination);

    expect(result).toBe('none');
    expect(combatService.hasPendingCombat).toBe(false);
    expect(gameService.hasPendingTileResolution).toBe(false);
    expect(destination.tokenId).toBe('giant-rat');
    expect(turnService.remainingMovements()).toBe(movementsBefore);
  });

  it('ignore toute entrée en phase game-over sans créer de résolution', () => {
    gameService.phase.set('game-over');
    const destination = tile('giant-rat');

    expect(gameService.resolveTileEntry(player, tile(), destination, true)).toBe('none');
    expect(combatService.hasPendingCombat).toBe(false);
    expect(gameService.hasPendingTileResolution).toBe(false);
    expect(destination.tokenId).toBe('giant-rat');
    expect(turnService.remainingMovements()).toBe(4);
  });

  it('conserve la résolution normale pendant playing', () => {
    gameService.phase.set('playing');

    expect(gameService.resolveTileEntry(player, tile(), tile('giant-rat'))).toBe('combat');
    expect(combatService.hasPendingCombat).toBe(true);
  });

  it('ignore une entrée devenue obsolète après réinitialisation', () => {
    const destination = tile('giant-rat');
    gameService.phase.set('setup');
    gameService.initialize();

    expect(gameService.resolveTileEntry(player, tile(), destination)).toBe('none');
    expect(combatService.hasPendingCombat).toBe(false);
    expect(gameService.hasPendingTileResolution).toBe(false);
  });

  it('refuse une entrée répétée pendant une résolution obligatoire', () => {
    const destination = tile('closed-chest');
    playerService.addEquipment(player, getEquipmentDefinition('key')!);

    expect(gameService.resolveTileEntry(player, tile(), destination)).toBe('treasure');
    expect(gameService.resolveTileEntry(player, tile(), tile('giant-rat'))).toBe('none');
    expect(gameService.pendingTreasure()).toBeNull();
  });
});
