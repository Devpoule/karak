import { Injectable, signal } from '@angular/core';

import { getTokenDefinition } from '../data/token-definitions';
import { Player } from '../models/player';
import { PlacedTile } from '../models/tile';
import { MonsterTokenDefinition } from '../models/token';

/**
 * État d'un combat obligatoire en cours.
 *
 * La tuile d'origine est conservée car un héros doit y retourner
 * lorsqu'il perd le combat ou obtient un match nul.
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
 *
 * equipmentBonus et heroBonus sont déjà séparés du lancer afin
 * que les futures mécaniques d'équipement et de pouvoir puissent
 * être ajoutées sans modifier la structure générale du combat.
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
 * Gère l'état et la résolution des combats obligatoires.
 *
 * Cette tranche implémente le cœur commun du combat :
 *
 * - lancer de deux dés à six faces ;
 * - calcul de la force d'attaque ;
 * - comparaison avec la force du monstre ;
 * - victoire, match nul ou défaite ;
 * - perte d'une vie en cas de défaite ;
 * - recul vers la tuile d'origine en cas de match nul ou défaite.
 *
 * Les équipements, sorts et pouvoirs de héros seront branchés
 * ultérieurement sur les bonus déjà prévus dans CombatResult.
 */
@Injectable({
  providedIn: 'root',
})
export class CombatService {
  readonly pendingCombat = signal<PendingCombat | null>(null);

  /**
   * Dernier combat effectivement résolu.
   *
   * Cet état est distinct de pendingCombat afin que l'interface
   * puisse encore présenter le résultat après la fin du combat.
   */
  readonly lastCombatResult = signal<CombatResult | null>(null);

  get hasPendingCombat(): boolean {
    return this.pendingCombat() !== null;
  }

  initialize(): void {
    this.pendingCombat.set(null);
    this.lastCombatResult.set(null);
  }

  /**
   * Déclenche un combat si la tuile de destination contient
   * effectivement un monstre.
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
   * Lance les dés et résout le combat actuellement obligatoire.
   *
   * RÈGLE KARAK :
   *
   * attaque > monstre  -> victoire ;
   * attaque = monstre  -> match nul ;
   * attaque < monstre  -> défaite.
   *
   * Cette première version utilise uniquement les deux dés.
   * Les bonus restent donc volontairement à zéro.
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
    const attackPower = diceTotal + equipmentBonus + heroBonus;

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
   * Applique les conséquences immédiates de l'issue du combat.
   *
   * Victoire :
   * le monstre disparaît de la tuile. Son futur verso équipement
   * n'est pas encore modélisé.
   *
   * Match nul :
   * le héros recule sur la tuile d'origine, sans perdre de vie.
   *
   * Défaite :
   * le héros perd une vie puis recule sur la tuile d'origine.
   */
  private applyOutcome(combat: PendingCombat, outcome: CombatOutcome): void {
    if (outcome === 'victory') {
      combat.monsterTile.tokenId = undefined;
      return;
    }

    if (outcome === 'defeat') {
      combat.player.lives = Math.max(0, combat.player.lives - 1);
    }

    combat.player.position = {
      x: combat.sourceTile.x,
      y: combat.sourceTile.y,
    };
  }

  /**
   * Efface uniquement le compte-rendu du dernier combat.
   *
   * Cela n'a aucune incidence sur un éventuel combat en cours.
   */
  clearLastCombatResult(): void {
    this.lastCombatResult.set(null);
  }

  private rollDie(): number {
    return Math.floor(Math.random() * 6) + 1;
  }
}
