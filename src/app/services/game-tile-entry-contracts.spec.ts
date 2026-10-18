import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { getEquipmentDefinition } from '../data/equipment-definitions';
import { GameService, PendingReward } from './game.service';
import { PlayerService } from './player.service';
import { TurnService } from './turn.service';
import { CombatService } from './combat.service';
import { TokenBagService } from './token-bag.service';
import { DungeonService } from './dungeon.service';
import { PlacedTile } from '../models/tile';
import { Player } from '../models/player';

describe('GameService contrat d entrée dans une tuile', () => {
  let gameService: GameService;
  let playerService: PlayerService;
  let turnService: TurnService;
  let combatService: CombatService;
  let tokenBagService: TokenBagService;
  let dungeonService: DungeonService;
  let player: Player;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({ providers: [GameService, PlayerService] });
    gameService = TestBed.inject(GameService);
    playerService = TestBed.inject(PlayerService);
    turnService = TestBed.inject(TurnService);
    combatService = TestBed.inject(CombatService);
    tokenBagService = TestBed.inject(TokenBagService);
    dungeonService = TestBed.inject(DungeonService);
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

  it('soigne complètement le héros à son arrivée sur une fontaine et arrête le tour', () => {
    const fountain = { ...tile(), definitionId: 'healing-corner', x: 2, y: 0 };
    player.lives = 2;
    player.isCursed = true;
    turnService.consumeMovement();

    expect(gameService.resolveTileEntry(player, tile(), fountain, false, true)).toBe('none');
    expect(player.lives).toBe(5);
    expect(player.isCursed).toBe(false);
    expect(turnService.remainingMovements()).toBe(0);
  });

  it('ne modifie pas un héros déjà au maximum et ne soigne pas une tuile ordinaire', () => {
    const ordinary = { ...tile(), x: 2, y: 0 };
    expect(gameService.resolveTileEntry(player, tile(), ordinary)).toBe('none');
    expect(player.lives).toBe(5);
    expect(turnService.remainingMovements()).toBe(4);

    const fountain = { ...tile(), definitionId: 'healing-corner', x: 2, y: 0 };
    player.lives = 5;
    expect(gameService.resolveTileEntry(player, tile(), fountain)).toBe('none');
    expect(player.lives).toBe(5);
    expect(turnService.remainingMovements()).toBe(0);
  });

  it('ne déclenche pas un second soin sans nouvelle arrivée', () => {
    const fountain = { ...tile(), definitionId: 'healing-corner', x: 2, y: 0 };
    player.lives = 2;
    expect(gameService.resolveTileEntry(player, tile(), fountain)).toBe('none');
    player.lives = 3;

    expect(gameService.resolveTileEntry(player, fountain, fountain)).toBe('none');
    expect(player.lives).toBe(3);
  });

  it('ne pioche pas de jeton en entrant dans une pièce déjà connue et vide', () => {
    const room: PlacedTile = { ...tile(), definitionId: 'straight-room' };
    dungeonService.tiles.push(room);
    (tokenBagService as unknown as { bag: string[] }).bag = ['giant-rat'];
    tokenBagService.remainingTokens.set(1);

    expect(gameService.resolveTileEntry(player, tile(), room)).toBe('none');

    expect(room.tokenId).toBeUndefined();
    expect(tokenBagService.remainingTokens()).toBe(1);
    expect(gameService.hasPendingTileResolution).toBe(false);
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

  it('propose Sneak aussi sur une pièce nouvellement découverte', () => {
    player.heroId = 'aderyn';
    const room = { ...tile(), definitionId: 'straight-room' };
    (tokenBagService as unknown as { bag: string[] }).bag = ['closed-chest', 'giant-rat'];
    tokenBagService.remainingTokens.set(2);

    expect(gameService.resolveTileEntry(player, tile(), room, true)).toBe('sneak-choice');
    expect(room.tokenId).toBe('giant-rat');
    expect(combatService.hasPendingCombat).toBe(false);
    expect(gameService.choosePendingSneak('combat')).toBe(true);

    combatService.initialize();
    turnService.resetMovements();

    const chestRoom = { ...tile('closed-chest'), definitionId: 'straight-room' };
    playerService.addEquipment(player, getEquipmentDefinition('key')!);
    expect(gameService.resolveTileEntry(player, tile(), chestRoom)).toBe('treasure');
    expect(chestRoom.tokenId).toBe('closed-chest');
    expect(gameService.pendingTreasure()).not.toBeNull();
  });

  it('fait tirer deux jetons à Taia puis ne conserve qu’un jeton dans la pièce', () => {
    player.heroId = 'taia';
    const room: PlacedTile = { ...tile(), definitionId: 'straight-room' };
    dungeonService.tiles.push(room);
    (tokenBagService as unknown as { bag: string[] }).bag = ['giant-rat', 'closed-chest', 'skeleton-mummy'];
    tokenBagService.remainingTokens.set(3);

    expect(gameService.resolveTileEntry(player, tile(), room, true)).toBe('token-choice');
    expect(tokenBagService.remainingTokens()).toBe(1);
    expect(gameService.pendingTokenChoice()?.tokens.map(token => token.id)).toEqual([
      'skeleton-mummy',
      'closed-chest',
    ]);

    expect(gameService.choosePendingToken(1)).toBe(true);
    expect(room.tokenId).toBe('closed-chest');
    expect(tokenBagService.remainingTokens()).toBe(2);
    expect(gameService.pendingTokenChoice()).toBeNull();
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

    expect(result).toBe('sneak-choice');
    expect(combatService.hasPendingCombat).toBe(false);
    expect(gameService.pendingSneakChoice()?.player).toBe(player);
    expect(turnService.remainingMovements()).toBe(0);
  });

  it('laisse passer un coffre fermé lorsque le joueur ne possède pas de clé', () => {
    const result = gameService.resolveTileEntry(player, tile(), tile('closed-chest'));

    expect(result).toBe('none');
    expect(gameService.pendingTreasure()).toBeNull();
    expect(turnService.remainingMovements()).toBe(4);
  });

  it('propose un coffre fermé avec une clé sans l ouvrir automatiquement', () => {
    const destination = tile('closed-chest');
    playerService.addEquipment(player, getEquipmentDefinition('key')!);

    expect(gameService.resolveTileEntry(player, tile(), destination)).toBe('treasure');
    expect(gameService.pendingTreasure()).not.toBeNull();
    expect(turnService.remainingMovements()).toBe(0);
    expect(player.inventory.key).not.toBeNull();
    expect(player.treasures).not.toContain('opened-chest');
    expect(destination.tokenId).toBe('closed-chest');
  });

  it('reprend les mouvements et conserve le coffre après un refus', () => {
    const destination = tile('closed-chest');
    playerService.addEquipment(player, getEquipmentDefinition('key')!);
    turnService.consumeMovement();

    expect(gameService.resolveTileEntry(player, tile(), destination, false, true)).toBe('treasure');
    expect(gameService.declinePendingTreasure()).toBe(true);
    expect(gameService.pendingTreasure()).toBeNull();
    expect(turnService.remainingMovements()).toBe(3);
    expect(player.inventory.key).not.toBeNull();
    expect(destination.tokenId).toBe('closed-chest');
  });

  it('ouvre explicitement le coffre une seule fois et termine le tour', () => {
    const destination = tile('closed-chest');
    playerService.addEquipment(player, getEquipmentDefinition('key')!);

    expect(gameService.resolveTileEntry(player, tile(), destination)).toBe('treasure');
    expect(gameService.openPendingTreasure()).toBe(true);
    expect(gameService.openPendingTreasure()).toBe(false);
    expect(gameService.pendingTreasure()).toBeNull();
    expect(turnService.remainingMovements()).toBe(0);
    expect(player.inventory.key).toBeNull();
    expect(player.treasures).toContain('opened-chest');
    expect(destination.tokenId).toBeUndefined();
  });

  it('résout automatiquement une récompense équipement pour l IA', () => {
    player.controller = 'ai';
    const destination = tile('skeleton-swordsman', 'back');

    expect(gameService.resolveTileEntry(player, tile(), destination)).toBe('reward');
    expect(player.inventory.weapons.some(weapon => weapon?.id === 'sword')).toBe(true);
    expect(gameService.pendingReward()).toBeNull();
    expect(destination.tokenId).toBeUndefined();
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
    expect(destination.tokenId).toBe('closed-chest');
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
    expect(gameService.pendingTreasure()).not.toBeNull();
  });
});
