import { describe, expect, it, vi } from 'vitest';
import { getEquipmentDefinition } from '../data/equipment-definitions';
import { getTokenDefinition } from '../data/token-definitions';
import { PlacedTile } from '../models/tile';
import { CombatService } from './combat.service';
import { PlayerService } from './player.service';
import { TurnService } from './turn.service';
import { AudioService } from './audio.service';

describe('CombatService séparation du lancer et de la résolution', () => {
  afterEach(() => {
    (getTokenDefinition('giant-rat') as { strength: number }).strength = 5;
    (getTokenDefinition('skeleton-swordsman') as { strength: number }).strength = 9;
    vi.restoreAllMocks();
  });

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

  it('identifie un lancer déjà gagnant avant toute option post-lancer', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0.999)
      .mockReturnValueOnce(0);
    const playerService = new PlayerService();
    playerService.initialize(2);
    const combatService = new CombatService(playerService);
    const player = playerService.players[0];

    player.heroId = 'victorius';
    combatService.startCombat(player, { x: 0, y: 0 } as PlacedTile, {
      x: 1,
      y: 0,
      definitionId: 'room-1',
      tokenId: 'giant-spider',
      tokenFace: 'front',
    } as PlacedTile);
    combatService.rollPendingCombat();

    expect(combatService.hasWinningRoll()).toBe(true);
    expect(combatService.getAvailableHeroRerolls()).toEqual([]);
    expect(combatService.useHeroReroll('die2')).toBe(false);
    expect(combatService.useMagicBolt()).toBe(false);

    vi.restoreAllMocks();
  });

  it('considère l égalité comme gagnante pour Aderyn non maudite', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.5);
    const playerService = new PlayerService();
    playerService.initialize(2);
    const combatService = new CombatService(playerService);
    const player = playerService.players[0];

    player.heroId = 'aderyn';
    combatService.startCombat(player, { x: 0, y: 0 } as PlacedTile, createTile());
    combatService.rollPendingCombat();

    expect(combatService.pendingCombatRoll()?.attackPower).toBe(5);
    expect(combatService.hasWinningRoll()).toBe(true);

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

  it.each([
    ['victory', 2],
    ['tie', 3],
    ['defeat', 20],
  ] as const)('conserve le Tir magique d Argentus après une %s', (expectedOutcome, monsterStrength) => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const playerService = new PlayerService();
    playerService.initialize(2);
    const combatService = new CombatService(playerService);
    const player = playerService.players[0];
    const bolt = getEquipmentDefinition('fire-sword')!;
    player.heroId = 'argentus';
    playerService.addEquipment(player, bolt);

    combatService.startCombat(player, { x: 0, y: 0 } as PlacedTile, createTile());
    (combatService.pendingCombat()!.monster as { strength: number }).strength = monsterStrength;
    combatService.rollPendingCombat();
    expect(combatService.useMagicBolt()).toBe(true);

    expect(combatService.resolvePendingCombat()?.outcome).toBe(expectedOutcome);
    expect(player.inventory.spells[0]).toBe(bolt);
    expect(combatService.resolvePendingCombat()).toBeNull();
    expect(player.inventory.spells.filter(spell => spell?.effect === 'magic-attack')).toHaveLength(1);
    vi.restoreAllMocks();
  });

  it('annule une réservation de Tir lors de la réinitialisation du combat', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const playerService = new PlayerService();
    playerService.initialize(2);
    const combatService = new CombatService(playerService);
    const player = playerService.players[0];
    playerService.addEquipment(player, getEquipmentDefinition('fire-sword')!);

    combatService.startCombat(player, { x: 0, y: 0 } as PlacedTile, createTile());
    combatService.rollPendingCombat();
    expect(combatService.useMagicBolt()).toBe(true);
    expect(combatService.pendingCombatRoll()?.magicBoltsUsed).toBe(1);
    expect(player.inventory.spells.filter(Boolean)).toHaveLength(1);

    combatService.initialize();

    expect(combatService.pendingCombat()).toBeNull();
    expect(combatService.pendingCombatRoll()).toBeNull();
    expect(player.inventory.spells[0]?.effect).toBe('magic-attack');
    vi.restoreAllMocks();
  });

  it('consomme plusieurs Tirs maudit sans toucher au Portail de guérison', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const playerService = new PlayerService();
    playerService.initialize(2);
    const combatService = new CombatService(playerService);
    const player = playerService.players[0];
    player.heroId = 'argentus';
    player.isCursed = true;
    playerService.addEquipment(player, getEquipmentDefinition('fire-sword')!);
    playerService.addEquipment(player, { ...getEquipmentDefinition('fire-sword')! });
    playerService.addEquipment(player, getEquipmentDefinition('heart')!);

    combatService.startCombat(player, { x: 0, y: 0 } as PlacedTile, createTile());
    combatService.rollPendingCombat();
    expect(combatService.useMagicBolt()).toBe(true);
    expect(combatService.useMagicBolt()).toBe(true);
    combatService.resolvePendingCombat();

    expect(player.inventory.spells.filter(spell => spell?.effect === 'magic-attack')).toHaveLength(0);
    expect(player.inventory.spells.filter(spell => spell?.effect === 'healing-portal')).toHaveLength(1);
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

  it.each([
    ['daggers', 'defeat'],
    ['sword', 'tie'],
    ['axe', 'victory'],
  ] as const)('détermine le verdict 3 + 1 avec %s contre force 6', (weaponId, expectedOutcome) => {
    vi.spyOn(Math, 'random').mockReturnValueOnce(0.4).mockReturnValueOnce(0);
    const playerService = new PlayerService();
    playerService.initialize(2);
    const combatService = new CombatService(playerService);
    const player = playerService.players[0];
    playerService.addEquipment(player, getEquipmentDefinition(weaponId)!);
    const spider = {
      x: 1, y: 0, definitionId: 'room-1', tokenId: 'giant-spider', tokenFace: 'front',
    } as PlacedTile;

    combatService.startCombat(player, { x: 0, y: 0 } as PlacedTile, spider);
    const roll = combatService.rollPendingCombat();
    const result = combatService.resolvePendingCombat();

    expect(roll?.diceTotal).toBe(4);
    expect(roll?.equipmentBonus).toBe({ daggers: 1, sword: 2, axe: 3 }[weaponId]);
    expect(result?.outcome).toBe(expectedOutcome);
    vi.restoreAllMocks();
  });

  it('Aderyn remporte une égalité lorsqu’elle n’est pas maudite', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.4);
    const playerService = new PlayerService();
    playerService.initialize(2);
    const combatService = new CombatService(playerService);
    const player = playerService.players[0];
    player.heroId = 'aderyn';
    const monster = {
      x: 1, y: 0, definitionId: 'room-1', tokenId: 'giant-spider', tokenFace: 'front',
    } as PlacedTile;

    combatService.startCombat(player, { x: 0, y: 0 } as PlacedTile, monster);
    const roll = combatService.rollPendingCombat();
    expect(roll?.attackPower).toBe(monster.tokenId === 'giant-spider' ? 6 : 0);
    expect(combatService.resolvePendingCombat()?.outcome).toBe('victory');
    vi.restoreAllMocks();
  });

  it('Aderyn maudite ne bénéficie pas de son égalité', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.4);
    const playerService = new PlayerService();
    playerService.initialize(2);
    const combatService = new CombatService(playerService);
    const player = playerService.players[0];
    player.heroId = 'aderyn';
    player.isCursed = true;
    const monster = {
      x: 1, y: 0, definitionId: 'room-1', tokenId: 'giant-spider', tokenFace: 'front',
    } as PlacedTile;

    combatService.startCombat(player, { x: 0, y: 0 } as PlacedTile, monster);
    combatService.rollPendingCombat();
    expect(combatService.resolvePendingCombat()?.outcome).toBe('tie');
    vi.restoreAllMocks();
  });

  it('refuse le Tir magique lorsque les dés dépassent déjà la force du monstre', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999);
    const playerService = new PlayerService();
    playerService.initialize(2);
    const combatService = new CombatService(playerService);
    const player = playerService.players[0];
    const bolt = getEquipmentDefinition('fire-sword')!;
    playerService.addEquipment(player, bolt);
    const tile = createTile();

    combatService.startCombat(player, { x: 0, y: 0 } as PlacedTile, tile);
    combatService.rollPendingCombat();

    const roll = combatService.pendingCombatRoll();
    expect(roll?.diceTotal).toBeGreaterThan(roll?.monsterStrength ?? 0);
    expect(combatService.useMagicBolt()).toBe(false);
    expect(combatService.pendingCombatRoll()?.magicBoltsUsed).toBe(0);

    vi.restoreAllMocks();
  });

  it('refuse le Tir magique lorsque les bonus rendent déjà la victoire acquise', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.2);
    const playerService = new PlayerService();
    playerService.initialize(2);
    const combatService = new CombatService(playerService);
    const player = playerService.players[0];
    playerService.addEquipment(player, getEquipmentDefinition('axe')!);
    playerService.addEquipment(player, getEquipmentDefinition('fire-sword')!);
    const monster = {
      x: 1, y: 0, definitionId: 'room-1', tokenId: 'giant-spider', tokenFace: 'front',
    } as PlacedTile;

    combatService.startCombat(player, { x: 0, y: 0 } as PlacedTile, monster);
    combatService.rollPendingCombat();

    const roll = combatService.pendingCombatRoll()!;
    expect(roll.diceTotal).toBeLessThanOrEqual(roll.monsterStrength);
    expect(roll.attackPower).toBeGreaterThan(roll.monsterStrength);
    expect(combatService.useMagicBolt()).toBe(false);
    expect(combatService.pendingCombatRoll()?.magicBoltsUsed).toBe(0);

    vi.restoreAllMocks();
  });

  it('Horan peut relancer les deux dés une seule fois', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.999)
      .mockReturnValueOnce(0.999);
    const playerService = new PlayerService();
    playerService.initialize(2);
    const combatService = new CombatService(playerService);
    const player = playerService.players[0];
    player.heroId = 'horan';
    const monster = {
      x: 1, y: 0, definitionId: 'room-1', tokenId: 'giant-spider', tokenFace: 'front',
    } as PlacedTile;

    combatService.startCombat(player, { x: 0, y: 0 } as PlacedTile, monster);
    combatService.rollPendingCombat();
    expect(combatService.getAvailableHeroRerolls()).toEqual(['both']);
    expect(combatService.useHeroReroll('both')).toBe(true);
    expect(combatService.pendingCombatRoll()?.diceTotal).toBe(12);
    expect(combatService.useHeroReroll('both')).toBe(false);
    vi.restoreAllMocks();
  });

  it('ne propose pas à Horan de relancer lorsqu’il dépasse déjà le monstre', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999);
    const playerService = new PlayerService();
    playerService.initialize(2);
    const combatService = new CombatService(playerService);
    const player = playerService.players[0];
    player.heroId = 'horan';

    combatService.startCombat(player, { x: 0, y: 0 } as PlacedTile, createTile());
    combatService.rollPendingCombat();

    expect(combatService.pendingCombatRoll()?.diceTotal).toBeGreaterThan(
      combatService.pendingCombatRoll()?.monsterStrength ?? 0,
    );
    expect(combatService.getAvailableHeroRerolls()).toEqual([]);
    expect(combatService.useHeroReroll('both')).toBe(false);

    vi.restoreAllMocks();
  });

  it('désactive la Double attaque de Horan sous malédiction', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const playerService = new PlayerService();
    playerService.initialize(2);
    const combatService = new CombatService(playerService);
    const player = playerService.players[0];
    player.heroId = 'horan';
    player.isCursed = true;

    combatService.startCombat(player, { x: 0, y: 0 } as PlacedTile, createTile());
    combatService.rollPendingCombat();

    expect(combatService.getAvailableHeroRerolls()).toEqual([]);
    expect(combatService.useHeroReroll('both')).toBe(false);

    vi.restoreAllMocks();
  });

  it('conserve le résultat d’une égalité après la relance de Horan', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.4)
      .mockReturnValueOnce(0.4);
    const playerService = new PlayerService();
    playerService.initialize(2);
    const combatService = new CombatService(playerService);
    const player = playerService.players[0];
    player.heroId = 'horan';

    combatService.startCombat(player, { x: 0, y: 0 } as PlacedTile, {
      x: 1,
      y: 0,
      definitionId: 'room-1',
      tokenId: 'giant-spider',
      tokenFace: 'front',
    } as PlacedTile);
    combatService.rollPendingCombat();
    expect(combatService.useHeroReroll('both')).toBe(true);
    expect(combatService.resolvePendingCombat()?.outcome).toBe('tie');
    expect(combatService.resolvePendingCombat()).toBeNull();

    vi.restoreAllMocks();
  });

  it('Victorius ne relance qu’un dé affichant 1 et ses pouvoirs maudits sont désactivés', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.4)
      .mockReturnValueOnce(0.999);
    const playerService = new PlayerService();
    playerService.initialize(2);
    const combatService = new CombatService(playerService);
    const player = playerService.players[0];
    player.heroId = 'victorius';
    const monster = {
      x: 1, y: 0, definitionId: 'room-1', tokenId: 'giant-spider', tokenFace: 'front',
    } as PlacedTile;

    combatService.startCombat(player, { x: 0, y: 0 } as PlacedTile, monster);
    combatService.rollPendingCombat();
    expect(combatService.getAvailableHeroRerolls()).toEqual(['die1']);
    expect(combatService.useHeroReroll('die2')).toBe(false);
    expect(combatService.useHeroReroll('die1')).toBe(true);
    expect(combatService.pendingCombatRoll()?.die1).toBe(6);

    player.isCursed = true;
    expect(combatService.getAvailableHeroRerolls()).toEqual([]);
    vi.restoreAllMocks();
  });

  it('Victorius peut relancer séparément ses deux dés lorsqu’ils affichent 1', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.999)
      .mockReturnValueOnce(0.999);
    const playerService = new PlayerService();
    playerService.initialize(2);
    const combatService = new CombatService(playerService);
    const player = playerService.players[0];
    player.heroId = 'victorius';
    const monster = createTile();

    combatService.startCombat(player, { x: 0, y: 0 } as PlacedTile, monster);
    combatService.rollPendingCombat();
    expect(combatService.getAvailableHeroRerolls()).toEqual(['die1', 'die2']);
    expect(combatService.useHeroReroll('die1')).toBe(true);
    expect(combatService.getAvailableHeroRerolls()).toEqual([]);
    expect(combatService.useHeroReroll('die2')).toBe(false);
    expect(combatService.getAvailableHeroRerolls()).toEqual([]);

    vi.restoreAllMocks();
  });

  it('Victorius conserve le second dé éligible après la première relance', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.999)
      .mockReturnValueOnce(0.8);
    const playerService = new PlayerService();
    playerService.initialize(2);
    const combatService = new CombatService(playerService);
    const player = playerService.players[0];
    player.heroId = 'victorius';
    const monster = createTile();
    (getTokenDefinition('giant-rat') as { strength: number }).strength = 20;

    combatService.startCombat(player, { x: 0, y: 0 } as PlacedTile, monster);
    combatService.rollPendingCombat();
    expect(combatService.getAvailableHeroRerolls()).toEqual(['die1', 'die2']);
    expect(combatService.useHeroReroll('die1')).toBe(true);
    expect(combatService.getAvailableHeroRerolls()).toEqual(['die2']);
    expect(combatService.useHeroReroll('die2')).toBe(true);
    expect(combatService.getAvailableHeroRerolls()).toEqual([]);
    expect(combatService.pendingCombatRoll()?.heroRerollsUsed).toBe(3);

    vi.restoreAllMocks();
  });

  it('Victorius ne peut pas relancer à nouveau un dé qui affiche encore 1', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.999);
    const playerService = new PlayerService();
    playerService.initialize(2);
    const combatService = new CombatService(playerService);
    const player = playerService.players[0];
    player.heroId = 'victorius';
    (getTokenDefinition('giant-rat') as { strength: number }).strength = 20;

    combatService.startCombat(player, { x: 0, y: 0 } as PlacedTile, createTile());
    combatService.rollPendingCombat();
    expect(combatService.useHeroReroll('die1')).toBe(true);
    expect(combatService.pendingCombatRoll()?.die1).toBe(1);
    expect(combatService.getAvailableHeroRerolls()).toEqual(['die2']);
    expect(combatService.useHeroReroll('die1')).toBe(false);

    vi.restoreAllMocks();
  });

  it('Victorius conserve les bonus d’arme et de Tir magique après une relance', () => {
    vi.spyOn(Math, 'random')
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(0.999);
    const playerService = new PlayerService();
    playerService.initialize(2);
    const combatService = new CombatService(playerService);
    const player = playerService.players[0];
    player.heroId = 'victorius';
    playerService.addEquipment(player, getEquipmentDefinition('sword')!);
    playerService.addEquipment(player, getEquipmentDefinition('fire-sword')!);
    (getTokenDefinition('giant-rat') as { strength: number }).strength = 20;

    combatService.startCombat(player, { x: 0, y: 0 } as PlacedTile, createTile());
    combatService.rollPendingCombat();
    expect(combatService.useMagicBolt()).toBe(true);
    expect(combatService.useHeroReroll('die1')).toBe(true);
    const roll = combatService.pendingCombatRoll()!;
    expect(roll.equipmentBonus).toBe(3);
    expect(roll.magicBoltsUsed).toBe(1);
    expect(roll.attackPower).toBe(10);

    vi.restoreAllMocks();
  });

  it('Taia reçoit +1 uniquement lorsque le combat provient du premier déplacement', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const playerService = new PlayerService();
    playerService.initialize(2);
    const turnService = new TurnService();
    const combatService = new CombatService(playerService, turnService);
    const player = playerService.players[0];
    player.heroId = 'taia';
    const monster = createTile();

    turnService.consumeMovement();
    combatService.startCombat(player, { x: 0, y: 0 } as PlacedTile, monster, true);
    expect(combatService.rollPendingCombat()?.heroBonus).toBe(1);

    combatService.initialize();
    player.isCursed = true;
    combatService.startCombat(player, { x: 0, y: 0 } as PlacedTile, monster, true);
    expect(combatService.rollPendingCombat()?.heroBonus).toBe(0);
    vi.restoreAllMocks();
  });

  it.each([2, 3, 4])('n accorde pas Prémonition après le %ième déplacement', (movementCount) => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const playerService = new PlayerService();
    playerService.initialize(2);
    const turnService = new TurnService();
    const combatService = new CombatService(playerService, turnService);
    const player = playerService.players[0];
    player.heroId = 'taia';

    for (let index = 0; index < movementCount; index++) {
      turnService.consumeMovement();
    }

    combatService.startCombat(player, { x: 0, y: 0 } as PlacedTile, createTile(), true);
    expect(combatService.rollPendingCombat()?.heroBonus).toBe(0);

    vi.restoreAllMocks();
  });

  it('n accorde pas Prémonition à un combat qui ne provient pas d’un déplacement', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const playerService = new PlayerService();
    playerService.initialize(2);
    const turnService = new TurnService();
    const combatService = new CombatService(playerService, turnService);
    const player = playerService.players[0];
    player.heroId = 'taia';

    turnService.consumeMovement();
    combatService.startCombat(player, { x: 0, y: 0 } as PlacedTile, createTile());
    expect(combatService.rollPendingCombat()?.heroBonus).toBe(0);

    vi.restoreAllMocks();
  });

  it('n accorde pas Prémonition après une suspension suivie d’un déplacement supplémentaire', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const playerService = new PlayerService();
    playerService.initialize(2);
    const turnService = new TurnService();
    const combatService = new CombatService(playerService, turnService);
    const player = playerService.players[0];
    player.heroId = 'taia';

    turnService.consumeMovement();
    turnService.stopMovements();
    expect(turnService.resumeSuspendedMovements()).toBe(true);
    turnService.consumeMovement();

    combatService.startCombat(player, { x: 0, y: 0 } as PlacedTile, createTile(), true);
    expect(combatService.rollPendingCombat()?.heroBonus).toBe(0);

    vi.restoreAllMocks();
  });

  it('Xanros peut sacrifier sa dernière vie une seule fois après le lancer', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const playerService = new PlayerService();
    playerService.initialize(2);
    const combatService = new CombatService(playerService);
    const player = playerService.players[0];
    player.heroId = 'xanros';
    player.lives = 1;
    combatService.startCombat(player, { x: 0, y: 0 } as PlacedTile, createTile());
    (combatService.pendingCombat()!.monster as { strength: number }).strength = 2;
    combatService.rollPendingCombat();

    expect(combatService.useXanrosSacrifice()).toBe(true);
    expect(player.lives).toBe(0);
    expect(player.recoveryState).toBe('pending');
    expect(combatService.pendingCombatRoll()?.heroBonus).toBe(1);
    expect(combatService.useXanrosSacrifice()).toBe(false);
    vi.restoreAllMocks();
  });

  it('Xanros peut choisir le sacrifice même si le bonus ne transforme pas le résultat', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const playerService = new PlayerService();
    playerService.initialize(2);
    const combatService = new CombatService(playerService);
    const player = playerService.players[0];
    player.heroId = 'xanros';
    player.lives = 2;
    combatService.startCombat(player, { x: 0, y: 0 } as PlacedTile, createTile());
    (combatService.pendingCombat()!.monster as { strength: number }).strength = 5;
    combatService.rollPendingCombat();

    expect(combatService.canUseXanrosSacrifice()).toBe(true);
    expect(combatService.useXanrosSacrifice()).toBe(true);
    expect(player.lives).toBe(1);
    expect(combatService.pendingCombatRoll()?.heroBonus).toBe(1);
  });

  it('résout la défaite après sacrifice une seule fois lorsque la dernière vie est perdue', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const playerService = new PlayerService();
    playerService.initialize(2);
    const combatService = new CombatService(playerService);
    const player = playerService.players[0];
    player.heroId = 'xanros';
    player.lives = 2;
    combatService.startCombat(player, { x: 0, y: 0 } as PlacedTile, createTile());
    (combatService.pendingCombat()!.monster as { strength: number }).strength = 5;
    combatService.rollPendingCombat();
    expect(combatService.useXanrosSacrifice()).toBe(true);

    const result = combatService.resolvePendingCombat();
    expect(result?.outcome).toBe('defeat');
    expect(player.lives).toBe(0);
    expect(combatService.resolvePendingCombat()).toBeNull();
  });

  it('Victorius peut continuer après une défaite avec un 6 et pas lorsqu’il est maudit', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999);
    const playerService = new PlayerService();
    playerService.initialize(2);
    const combatService = new CombatService(playerService);
    const player = playerService.players[0];
    player.heroId = 'victorius';
    const monster = createTile();
    combatService.startCombat(player, { x: 0, y: 0 } as PlacedTile, monster);
    (combatService.pendingCombat()!.monster as { strength: number }).strength = 20;
    combatService.rollPendingCombat();
    expect(combatService.resolvePendingCombat()?.unstoppableEligible).toBe(true);

    combatService.initialize();
    player.isCursed = true;
    combatService.startCombat(player, { x: 0, y: 0 } as PlacedTile, createTile());
    (combatService.pendingCombat()!.monster as { strength: number }).strength = 20;
    combatService.rollPendingCombat();
    expect(combatService.resolvePendingCombat()?.unstoppableEligible).toBe(false);
    vi.restoreAllMocks();
  });

  it.each([
    { outcome: 'victory', monsterStrength: 5 },
    { outcome: 'tie', monsterStrength: 12 },
  ])('qualifie Inarrêtable après une $outcome avec un 6 final', ({ outcome, monsterStrength }) => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999);
    const playerService = new PlayerService();
    playerService.initialize(2);
    const combatService = new CombatService(playerService);
    const player = playerService.players[0];
    player.heroId = 'victorius';

    combatService.startCombat(player, { x: 0, y: 0 } as PlacedTile, createTile());
    (combatService.pendingCombat()!.monster as { strength: number }).strength = monsterStrength;
    combatService.rollPendingCombat();

    const result = combatService.resolvePendingCombat();
    expect(result?.outcome).toBe(outcome);
    expect(result?.unstoppableEligible).toBe(true);

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
    expect(combatService.pendingCombatRoll()?.weapons.map(weapon => weapon.id)).toEqual(['sword']);
    playerService.removeEquipment(player, 'weapon', 0);

    expect(combatService.pendingCombatRoll()?.equipmentBonus).toBe(2);
    const result = combatService.resolvePendingCombat();
    expect(result?.weapons.map(weapon => weapon.id)).toEqual(['sword']);
    expect(result?.attackPower).toBe(4);
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

  it('synchronise l ouverture, le lancer et la defaite avec les bruitages metier', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const playerService = new PlayerService();
    playerService.initialize(2);
    const audio = { play: vi.fn(), playSequence: vi.fn() } as unknown as AudioService;
    const combatService = new CombatService(playerService, undefined, audio);
    const player = playerService.players[0];

    combatService.startCombat(player, { x: 0, y: 0 } as PlacedTile, createTile());
    combatService.rollPendingCombat();
    combatService.resolvePendingCombat();

    expect(audio.play).toHaveBeenNthCalledWith(1, 'COMBAT_DISPLAYING');
    expect(audio.play).toHaveBeenNthCalledWith(2, 'DICE_ROLL');
    expect(audio.playSequence).toHaveBeenCalledWith('IMPACT', 'DEFEAT');
  });

  it('enchaîne impact puis victoire après une victoire de combat', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.999);
    const playerService = new PlayerService();
    playerService.initialize(2);
    const audio = { play: vi.fn(), playSequence: vi.fn() } as unknown as AudioService;
    const combatService = new CombatService(playerService, undefined, audio);
    const player = playerService.players[0];

    combatService.startCombat(player, { x: 0, y: 0 } as PlacedTile, createTile());
    combatService.rollPendingCombat();
    expect(combatService.resolvePendingCombat()?.outcome).toBe('victory');

    expect(audio.playSequence).toHaveBeenCalledWith('IMPACT', 'VICTORY');
  });

  it('priorise les sons specifiques du dragon et de l egalite', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const playerService = new PlayerService();
    playerService.initialize(2);
    const dragonAudio = { play: vi.fn(), playSequence: vi.fn() } as unknown as AudioService;
    const dragonCombat = new CombatService(playerService, undefined, dragonAudio);
    dragonCombat.startCombat(playerService.players[0], { x: 0, y: 0 } as PlacedTile, {
      ...createTile(),
      tokenId: 'dragon',
    });
    dragonCombat.rollPendingCombat();
    dragonCombat.resolvePendingCombat();

    expect(dragonAudio.play).toHaveBeenNthCalledWith(1, 'DRAGON');
    expect(dragonAudio.playSequence).toHaveBeenCalledWith('IMPACT', 'DEFEAT');

    const tieAudio = { play: vi.fn() } as unknown as AudioService;
    const tieCombat = new CombatService(playerService, undefined, tieAudio);
    const tiePlayer = playerService.players[1];
    tiePlayer.heroId = 'argentus';
    (getTokenDefinition('giant-rat') as { strength: number }).strength = 8;
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    tieCombat.startCombat(tiePlayer, { x: 0, y: 0 } as PlacedTile, createTile());
    tieCombat.rollPendingCombat();
    tieCombat.resolvePendingCombat();

    expect(tieAudio.play).toHaveBeenNthCalledWith(3, 'EQUAL_SCORE');
  });
});
