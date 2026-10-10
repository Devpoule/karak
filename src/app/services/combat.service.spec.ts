import { describe, expect, it, vi } from 'vitest';
import { getEquipmentDefinition } from '../data/equipment-definitions';
import { PlacedTile } from '../models/tile';
import { CombatService } from './combat.service';
import { PlayerService } from './player.service';

describe('CombatService séparation du lancer et de la résolution', () => {
  function createTile(tokenFace: 'front' | 'back' = 'front'): PlacedTile {
    return {
      x: 1,
      y: 0,
      definitionId: 'room-1',
      tokenId: 'giant-rat',
      tokenFace,
    } as PlacedTile;
  }

  it('conserve le lancer sans appliquer les conséquences', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const playerService = new PlayerService();
    playerService.initialize(2);
    const combatService = new CombatService(playerService);
    const player = playerService.players[0];
    const sourceTile = { x: 0, y: 0 } as PlacedTile;
    const monsterTile = createTile();
    player.position = { x: 1, y: 0 };

    expect(combatService.startCombat(player, sourceTile, monsterTile)).toBe(true);
    const roll = combatService.rollPendingCombat();

    expect(roll?.die1).toBe(1);
    expect(roll?.die2).toBe(1);
    expect(combatService.pendingCombat()).not.toBeNull();
    expect(player.lives).toBe(5);
    expect(player.position).toEqual({ x: 1, y: 0 });
    expect(monsterTile.tokenFace).toBe('front');

    vi.restoreAllMocks();
  });

  it('résout une seule fois à partir des dés enregistrés', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const playerService = new PlayerService();
    playerService.initialize(2);
    const combatService = new CombatService(playerService);
    const player = playerService.players[0];
    const sourceTile = { x: 0, y: 0 } as PlacedTile;
    const monsterTile = createTile();
    player.position = { x: 1, y: 0 };

    combatService.startCombat(player, sourceTile, monsterTile);
    combatService.rollPendingCombat();
    const result = combatService.resolvePendingCombat();

    expect(result?.die1).toBe(1);
    expect(result?.die2).toBe(1);
    expect(result?.outcome).toBe('defeat');
    expect(player.lives).toBe(4);
    expect(player.position).toEqual({ x: 0, y: 0 });
    expect(combatService.pendingCombat()).toBeNull();
    expect(combatService.resolvePendingCombat()).toBeNull();

    vi.restoreAllMocks();
  });

  it('ne retourne le monstre qu’à la résolution définitive d’une victoire', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999);
    const playerService = new PlayerService();
    playerService.initialize(2);
    const combatService = new CombatService(playerService);
    const player = playerService.players[0];
    const monsterTile = createTile();

    combatService.startCombat(player, { x: 0, y: 0 } as PlacedTile, monsterTile);
    combatService.rollPendingCombat();
    expect(monsterTile.tokenFace).toBe('front');

    expect(combatService.resolvePendingCombat()?.outcome).toBe('victory');
    expect(monsterTile.tokenFace).toBe('back');

    vi.restoreAllMocks();
  });

  it('refuse le Tir magique avant le lancer et applique son bonus après', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const playerService = new PlayerService();
    playerService.initialize(2);
    const combatService = new CombatService(playerService);
    const player = playerService.players[0];
    const bolt = getEquipmentDefinition('fire-sword')!;
    playerService.addEquipment(player, bolt);
    const tile = createTile();

    combatService.startCombat(player, { x: 0, y: 0 } as PlacedTile, tile);
    expect(combatService.useMagicBolt()).toBe(false);
    combatService.rollPendingCombat();
    expect(combatService.useMagicBolt()).toBe(true);
    expect(combatService.pendingCombatRoll()?.attackPower).toBe(3);
    expect(player.inventory.spells[0]).toBe(bolt);

    const result = combatService.resolvePendingCombat();
    expect(result?.equipmentBonus).toBe(1);
    expect(result?.attackPower).toBe(3);
    expect(player.inventory.spells[0]).toBeNull();
    expect(combatService.useMagicBolt()).toBe(false);
    vi.restoreAllMocks();
  });

  it('utilise plusieurs Tirs magiques sans dépasser le stock', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const playerService = new PlayerService();
    playerService.initialize(2);
    const combatService = new CombatService(playerService);
    const player = playerService.players[0];
    const bolt = getEquipmentDefinition('fire-sword')!;
    playerService.addEquipment(player, bolt);
    playerService.addEquipment(player, { ...bolt });

    combatService.startCombat(player, { x: 0, y: 0 } as PlacedTile, createTile());
    combatService.rollPendingCombat();
    expect(combatService.useMagicBolt()).toBe(true);
    expect(combatService.useMagicBolt()).toBe(true);
    expect(combatService.useMagicBolt()).toBe(false);
    expect(combatService.pendingCombatRoll()?.magicBoltsUsed).toBe(2);

    combatService.resolvePendingCombat();
    expect(player.inventory.spells.every(spell => spell === null)).toBe(true);
    vi.restoreAllMocks();
  });

  it('conserve les Tirs magiques pour Argentus non maudit', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const playerService = new PlayerService();
    playerService.initialize(2);
    const combatService = new CombatService(playerService);
    const player = playerService.players[0];
    player.heroId = 'argentus';
    playerService.addEquipment(player, getEquipmentDefinition('fire-sword')!);

    combatService.startCombat(player, { x: 0, y: 0 } as PlacedTile, createTile());
    combatService.rollPendingCombat();
    combatService.useMagicBolt();
    combatService.resolvePendingCombat();

    expect(player.inventory.spells[0]?.effect).toBe('magic-attack');
    vi.restoreAllMocks();
  });

  it('consomme le Tir magique d’Argentus lorsqu’il est maudit et préserve le portail', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const playerService = new PlayerService();
    playerService.initialize(2);
    const combatService = new CombatService(playerService);
    const player = playerService.players[0];
    player.heroId = 'argentus';
    player.isCursed = true;
    playerService.addEquipment(player, getEquipmentDefinition('fire-sword')!);
    playerService.addEquipment(player, getEquipmentDefinition('heart')!);

    combatService.startCombat(player, { x: 0, y: 0 } as PlacedTile, createTile());
    combatService.rollPendingCombat();
    combatService.useMagicBolt();
    combatService.resolvePendingCombat();

    expect(player.inventory.spells.find(spell => spell?.effect === 'healing-portal')?.effect).toBe('healing-portal');
    expect(player.inventory.spells.filter(Boolean)).toHaveLength(1);
    vi.restoreAllMocks();
  });

  it('additionne les bonus des armes au moment du lancer', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const resolveInitialAttack = (weaponIds: ('daggers' | 'sword' | 'axe')[]): number => {
      const playerService = new PlayerService();
      playerService.initialize(2);
      const combatService = new CombatService(playerService);
      const player = playerService.players[0];
      weaponIds.forEach(id => playerService.addEquipment(player, getEquipmentDefinition(id)!));
      combatService.startCombat(player, { x: 0, y: 0 } as PlacedTile, createTile());
      return combatService.rollPendingCombat()?.attackPower ?? -1;
    };

    expect(resolveInitialAttack([])).toBe(2);
    expect(resolveInitialAttack(['daggers'])).toBe(3);
    expect(resolveInitialAttack(['sword'])).toBe(4);
    expect(resolveInitialAttack(['axe'])).toBe(5);
    expect(resolveInitialAttack(['daggers', 'axe'])).toBe(6);

    vi.restoreAllMocks();
  });

  it('conserve le bonus d’armes enregistré malgré une modification ultérieure', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const playerService = new PlayerService();
    playerService.initialize(2);
    const combatService = new CombatService(playerService);
    const player = playerService.players[0];
    playerService.addEquipment(player, getEquipmentDefinition('sword')!);
    const tile = createTile();

    combatService.startCombat(player, { x: 0, y: 0 } as PlacedTile, tile);
    combatService.rollPendingCombat();
    playerService.removeEquipment(player, 'weapon', 0);

    expect(combatService.pendingCombatRoll()?.equipmentBonus).toBe(2);
    expect(combatService.resolvePendingCombat()?.attackPower).toBe(4);
    vi.restoreAllMocks();
  });

  it('cumule les armes et les Tirs magiques sans double comptabilisation', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const playerService = new PlayerService();
    playerService.initialize(2);
    const combatService = new CombatService(playerService);
    const player = playerService.players[0];
    playerService.addEquipment(player, getEquipmentDefinition('daggers')!);
    playerService.addEquipment(player, getEquipmentDefinition('fire-sword')!);

    combatService.startCombat(player, { x: 0, y: 0 } as PlacedTile, createTile());
    combatService.rollPendingCombat();
    expect(combatService.pendingCombatRoll()?.attackPower).toBe(3);
    expect(combatService.useMagicBolt()).toBe(true);
    expect(combatService.pendingCombatRoll()?.equipmentBonus).toBe(2);
    expect(combatService.pendingCombatRoll()?.attackPower).toBe(4);
    expect(combatService.resolvePendingCombat()?.attackPower).toBe(4);
    vi.restoreAllMocks();
  });
});
