import { Injectable, signal } from '@angular/core';

import { getTokenDefinition } from '../data/token-definitions';
import { Player } from '../models/player';
import { PlacedTile } from '../models/tile';
import { MonsterTokenDefinition } from '../models/token';

/**
 * État d'un combat obligatoire en cours.
 *
 * Un combat commence lorsqu'un héros entre sur une tuile
 * contenant un monstre.
 *
 * La tuile d'origine est conservée car, en cas d'égalité
 * ou de défaite, le héros devra y retourner.
 */
export interface PendingCombat {
  player: Player;
  monster: MonsterTokenDefinition;
  monsterTile: PlacedTile;
  sourceTile: PlacedTile;
}

/**
 * Gère l'état des combats.
 *
 * Cette première tranche ne résout volontairement pas encore
 * le lancer de dés ni ses conséquences.
 *
 * Son rôle est uniquement de représenter correctement
 * l'existence d'un combat obligatoire.
 */
@Injectable({
  providedIn: 'root',
})
export class CombatService {

  // ==========================================================
  // ÉTAT DU COMBAT
  // ==========================================================

  /**
   * Combat actuellement en attente de résolution.
   *
   * null signifie qu'aucun combat ne bloque le tour.
   */
  readonly pendingCombat = signal<PendingCombat | null>(null);

  /**
   * Indique si un combat doit actuellement être résolu.
   */
  get hasPendingCombat(): boolean {
    return this.pendingCombat() !== null;
  }

  // ==========================================================
  // INITIALISATION
  // ==========================================================

  /**
   * Réinitialise complètement l'état de combat.
   *
   * Utilisé lors du démarrage d'une nouvelle partie.
   */
  initialize(): void {
    this.pendingCombat.set(null);
  }

  // ==========================================================
  // DÉCLENCHEMENT
  // ==========================================================

  /**
   * Déclenche un combat si la tuile de destination contient
   * effectivement un monstre.
   *
   * RÈGLE OFFICIELLE KARAK :
   *
   * lorsqu'un héros entre dans une salle et qu'un monstre
   * y est révélé, il doit immédiatement le combattre.
   *
   * @returns true lorsqu'un combat a été déclenché.
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

    this.pendingCombat.set({
      player,
      monster: token,
      monsterTile,
      sourceTile,
    });

    return true;
  }
}
