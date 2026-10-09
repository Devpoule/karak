
import { Injectable, signal } from '@angular/core';

import { getTokenDefinition } from '../data/token-definitions';
import { Player } from '../models/player';
import { PlayerService } from './player.service';
import { PlacedTile } from '../models/tile';
import { MonsterTokenDefinition } from '../models/token';

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
  attackPower: number;
  monsterStrength: number;
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
  ) {}

  readonly pendingCombat = signal<PendingCombat | null>(null);

  readonly lastCombatResult = signal<CombatResult | null>(null);

  get hasPendingCombat(): boolean {
    return this.pendingCombat() !== null;
  }

  initialize(): void {
    this.pendingCombat.set(null);
    this.lastCombatResult.set(null);
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

  /**
   * Lance deux dés et résout le combat obligatoire.
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

    if (!combat) {
      return null;
    }

    const die1 = this.rollDie();
    const die2 = this.rollDie();
    const diceTotal = die1 + die2;

    const equipmentBonus = 0;
    const heroBonus = 0;
    const attackPower =
      diceTotal + equipmentBonus + heroBonus;

    let outcome: CombatOutcome;

    if (attackPower > combat.monster.strength) {
      outcome = 'victory';
    } else if (attackPower === combat.monster.strength) {
      outcome = 'tie';
    } else {
      outcome = 'defeat';
    }

    const result: CombatResult = {
      player: combat.player,
      monster: combat.monster,
      die1,
      die2,
      diceTotal,
      equipmentBonus,
      heroBonus,
      attackPower,
      monsterStrength: combat.monster.strength,
      outcome,
    };

    this.applyOutcome(combat, outcome);

    this.pendingCombat.set(null);
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
}
