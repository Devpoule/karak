
import { Injectable, isDevMode, Optional, signal } from '@angular/core';

import { getTokenDefinition } from '../data/token-definitions';
import { Player } from '../models/player';
import { WeaponEquipment } from '../models/equipment';
import { PlayerService } from './player.service';
import { PlacedTile } from '../models/tile';
import { MonsterTokenDefinition } from '../models/token';
import { TurnService } from './turn.service';

/**
 * État d'un combat obligatoire en cours.
 *
 * La tuile d'origine est conservée pour permettre
 * au héros de reculer après une égalité ou une défaite.
 */
export interface PendingCombat {
  player: Player;
  monster: MonsterTokenDefinition;
  monsterTile: PlacedTile;
  sourceTile: PlacedTile;
}

export type CombatOutcome = 'victory' | 'tie' | 'defeat';

/** Résultat provisoire du lancer, avant toute conséquence métier. */
export interface CombatRoll {
  player: Player;
  monster: MonsterTokenDefinition;
  die1: number;
  die2: number;
  diceTotal: number;
  equipmentBonus: number;
  heroBonus: number;
  weapons: WeaponEquipment[];
  attackPower: number;
  monsterStrength: number;
  magicBoltsUsed: number;
  heroRerollsUsed: number;
  sacrificeUsed: boolean;
  canContinueTurn: boolean;
}

/**
 * Résultat complet du dernier combat résolu.
 */
export interface CombatResult {
  player: Player;
  monster: MonsterTokenDefinition;
  die1: number;
  die2: number;
  diceTotal: number;
  equipmentBonus: number;
  heroBonus: number;
  weapons: WeaponEquipment[];
  attackPower: number;
  monsterStrength: number;
  magicBoltsUsed: number;
  heroRerollsUsed: number;
  sacrificeUsed: boolean;
  canContinueTurn: boolean;
  outcome: CombatOutcome;
}

/**
 * Gère les combats obligatoires contre les monstres.
 *
 * Une victoire retourne le jeton sur son verso.
 * La récupération de la récompense est traitée séparément.
 */
@Injectable({
  providedIn: 'root',
})
export class CombatService {
  constructor(
    private readonly playerService: PlayerService,
    @Optional() private readonly turnService?: TurnService,
  ) {}

  readonly pendingCombat = signal<PendingCombat | null>(null);

  readonly lastCombatResult = signal<CombatResult | null>(null);
  readonly pendingCombatRoll = signal<CombatRoll | null>(null);

  get hasPendingCombat(): boolean {
    return this.pendingCombat() !== null;
  }

  initialize(): void {
    this.pendingCombat.set(null);
    this.lastCombatResult.set(null);
    this.pendingCombatRoll.set(null);
  }

  /**
   * Déclenche un combat uniquement contre un monstre
   * dont le recto est encore visible.
   *
   * Un monstre déjà vaincu ne peut pas être combattu
   * une seconde fois.
   */
  startCombat(
    player: Player,
    sourceTile: PlacedTile,
    monsterTile: PlacedTile,
  ): boolean {
    if (this.hasPendingCombat) {
      return false;
    }

    if (!monsterTile.tokenId) {
      return false;
    }

    if (monsterTile.tokenFace === 'back') {
      return false;
    }

    const token = getTokenDefinition(monsterTile.tokenId);

    if (!token || token.kind !== 'monster') {
      return false;
    }

    this.lastCombatResult.set(null);

    this.pendingCombat.set({
      player,
      monster: token,
      monsterTile,
      sourceTile,
    });

    return true;
  }

  /** Lance les dés sans appliquer la moindre conséquence au combat.
   *
   * Un second appel est ignoré tant que le combat n'est pas résolu.
   */
  rollPendingCombat(): CombatRoll | null {
    const combat = this.pendingCombat();
    if (!combat || this.pendingCombatRoll() !== null) return null;

    const die1 = this.rollDie();
    const die2 = this.rollDie();
    const diceTotal = die1 + die2;
    const equipmentBonus = combat.player.inventory.weapons
      .reduce((total, weapon) => total + (weapon?.attackBonus ?? 0), 0);
    const weapons = combat.player.inventory.weapons
      .filter((weapon): weapon is WeaponEquipment => weapon !== null)
      .map(weapon => ({ ...weapon }));
    const heroBonus = combat.player.heroId === 'taia'
      && !combat.player.isCursed
      && (this.turnService?.movementsMadeThisTurn() ?? 0) > 0
      ? 1
      : 0;
    const roll: CombatRoll = {
      player: combat.player,
      monster: combat.monster,
      die1,
      die2,
      diceTotal,
      equipmentBonus,
      heroBonus,
      weapons,
      attackPower: diceTotal + equipmentBonus + heroBonus,
      monsterStrength: combat.monster.strength,
      magicBoltsUsed: 0,
      heroRerollsUsed: 0,
      sacrificeUsed: false,
      canContinueTurn: false,
    };
    this.pendingCombatRoll.set(roll);
    this.logCombatDiagnostic('roll', roll, combat.player.inventory.weapons);
    return roll;
  }

  /** Sacrifie une vie de Xanros pour ajouter +1 après le lancer. */
  useXanrosSacrifice(): boolean {
    const combat = this.pendingCombat();
    const roll = this.pendingCombatRoll();
    if (!combat || !roll || roll.sacrificeUsed || combat.player.heroId !== 'xanros' || combat.player.isCursed) return false;
    this.playerService.loseLife(combat.player);
    this.pendingCombatRoll.set({
      ...roll,
      heroBonus: roll.heroBonus + 1,
      attackPower: roll.attackPower + 1,
      sacrificeUsed: true,
    });
    return true;
  }

  /** Retourne les relances actuellement autorisées par le pouvoir du héros. */
  getAvailableHeroRerolls(): Array<'both' | 'die1' | 'die2'> {
    const combat = this.pendingCombat();
    const roll = this.pendingCombatRoll();
    if (!combat || !roll || combat.player.isCursed) return [];
    if (combat.player.heroId === 'horan') {
      return roll.diceTotal <= roll.monsterStrength && roll.heroRerollsUsed === 0
        ? ['both']
        : [];
    }
    if (combat.player.heroId !== 'victorius') return [];

    const available: Array<'die1' | 'die2'> = [];
    if (roll.die1 === 1 && (roll.heroRerollsUsed & 1) === 0) available.push('die1');
    if (roll.die2 === 1 && (roll.heroRerollsUsed & 2) === 0) available.push('die2');
    return available;
  }

  /** Relance les dés autorisés par le pouvoir du héros. */
  useHeroReroll(kind: 'both' | 'die1' | 'die2'): boolean {
    const combat = this.pendingCombat();
    const roll = this.pendingCombatRoll();
    if (!combat || !roll || !this.getAvailableHeroRerolls().includes(kind)) return false;

    const die1 = kind === 'die2' ? roll.die1 : this.rollDie();
    const die2 = kind === 'die1' ? roll.die2 : this.rollDie();
    const diceTotal = die1 + die2;
    const rerollMask = kind === 'both'
      ? 1
      : roll.heroRerollsUsed | (kind === 'die1' ? 1 : 2);
    this.pendingCombatRoll.set({
      ...roll,
      die1,
      die2,
      diceTotal,
      attackPower: diceTotal + roll.equipmentBonus + roll.heroBonus,
      heroRerollsUsed: rerollMask,
    });
    return true;
  }

  /** Utilise un Tir magique réservé pour le combat post-lancer. */
  useMagicBolt(): boolean {
    const combat = this.pendingCombat();
    const roll = this.pendingCombatRoll();
    if (!combat || !roll) return false;

    // Le tir magique est inutile lorsque l'attaque effective gagne déjà.
    // Les bonus d'équipement et de héros font partie du résultat à comparer.
    if (roll.attackPower > roll.monsterStrength) return false;

    const available = combat.player.inventory.spells.some(
      spell => spell?.effect === 'magic-attack',
    );
    if (!available || roll.magicBoltsUsed >= this.countMagicBolts(combat.player)) return false;

    this.pendingCombatRoll.set({
      ...roll,
      magicBoltsUsed: roll.magicBoltsUsed + 1,
      attackPower: roll.attackPower + 1,
      equipmentBonus: roll.equipmentBonus + 1,
    });
    return true;
  }

  /** Nombre de Tirs magiques encore utilisables dans le combat en attente. */
  getRemainingMagicBolts(): number {
    const combat = this.pendingCombat();
    const roll = this.pendingCombatRoll();
    if (!combat || !roll) return 0;
    return Math.max(0, this.countMagicBolts(combat.player) - roll.magicBoltsUsed);
  }

  /**
   * Résout définitivement le combat à partir du lancer enregistré.
   *
   * attaque > monstre : victoire
   * attaque = monstre : égalité
   * attaque < monstre : défaite
   *
   * Les bonus d'équipement et de héros seront
   * intégrés ultérieurement.
   */
  resolvePendingCombat(): CombatResult | null {
    const combat = this.pendingCombat();
    const roll = this.pendingCombatRoll();

    if (!combat || !roll) {
      return null;
    }

    let outcome: CombatOutcome;

    const winsTie = combat.player.heroId === 'aderyn' && !combat.player.isCursed;
    if (roll.attackPower > combat.monster.strength
      || (winsTie && roll.attackPower === combat.monster.strength)) {
      outcome = 'victory';
    } else if (roll.attackPower === combat.monster.strength) {
      outcome = 'tie';
    } else {
      outcome = 'defeat';
    }

    const result: CombatResult = {
      ...roll,
      canContinueTurn: combat.player.heroId === 'victorius'
        && !combat.player.isCursed
        && (roll.die1 === 6 || roll.die2 === 6)
        && outcome !== 'victory',
      outcome,
    };

    this.logCombatDiagnostic('resolution', result, combat.player.inventory.weapons);

    this.consumeUsedMagicBolts(combat.player, roll.magicBoltsUsed);

    this.applyOutcome(combat, outcome);


    this.pendingCombat.set(null);
    this.pendingCombatRoll.set(null);
    this.lastCombatResult.set(result);

    return result;
  }

  /**
   * Applique les conséquences du combat.
   *
   * Victoire :
   * le jeton reste sur la tuile et présente son verso.
   *
   * Égalité :
   * le héros recule sans perdre de vie.
   *
   * Défaite :
   * le héros perd une vie puis recule.
   */
  private applyOutcome(
    combat: PendingCombat,
    outcome: CombatOutcome,
  ): void {
    if (outcome === 'victory') {
      combat.monsterTile.tokenFace = 'back';
      return;
    }

    if (outcome === 'defeat') {
      this.playerService.loseLife(combat.player);
    }

    combat.player.position = {
      x: combat.sourceTile.x,
      y: combat.sourceTile.y,
    };
  }

  /**
   * Efface uniquement le dernier résultat de combat.
   */
  clearLastCombatResult(): void {
    this.lastCombatResult.set(null);
  }

  /**
   * Lance un dé à six faces.
   */
  private rollDie(): number {
    return Math.floor(Math.random() * 6) + 1;
  }

  /**
   * Trace de diagnostic disponible uniquement hors production.
   * Cette méthode observe les snapshots du combat et ne participe jamais
   * au calcul ni à la mutation de son résultat.
   */
  private logCombatDiagnostic(
    phase: 'roll' | 'resolution',
    snapshot: CombatRoll | CombatResult,
    weapons: Player['inventory']['weapons'],
  ): void {
    if (!isDevMode()) return;

    const magicBonus = snapshot.magicBoltsUsed;
    const weaponBonus = snapshot.equipmentBonus - magicBonus;
    const calculatedAttack = snapshot.diceTotal + weaponBonus + snapshot.heroBonus + magicBonus;
    const payload = {
      phase,
      heroId: snapshot.player.heroId ?? null,
      weapons: weapons.map(weapon => weapon
        ? { id: weapon.id, attackBonus: weapon.attackBonus ?? 0 }
        : null),
      diceTotal: snapshot.diceTotal,
      equipmentBonus: weaponBonus,
      heroBonus: snapshot.heroBonus,
      magicBonus,
      attackPower: snapshot.attackPower,
      monsterStrength: snapshot.monsterStrength,
      verdict: 'outcome' in snapshot ? snapshot.outcome : 'pending',
      formulaMatches: calculatedAttack === snapshot.attackPower,
    };

    console.debug('[Karak combat diagnostic]', payload);
    if (!payload.formulaMatches) {
      console.warn('[Karak combat diagnostic] incohérence de formule', payload);
    }
  }

  private countMagicBolts(player: Player): number {
    return player.inventory.spells.filter(spell => spell?.effect === 'magic-attack').length;
  }

  private consumeUsedMagicBolts(player: Player, count: number): void {
    if (player.heroId === 'argentus' && !player.isCursed) return;
    for (let consumed = 0; consumed < count; consumed++) {
      const index = player.inventory.spells.findIndex(spell => spell?.effect === 'magic-attack');
      if (index < 0) return;
      this.playerService.removeEquipment(player, 'spell', index);
    }
  }
}
