import { Injectable, signal } from '@angular/core';

import { GAME_CONSTANTS } from '../constants/game.constants';

/** Portion du compteur de mouvements dont l'interface doit jouer la consommation. */
export interface MovementConsumptionAnimation {
  readonly firstPointIndex: number;
  readonly count: number;
}

/**
 * Gère l'état du tour de jeu en cours.
 *
 * RÈGLE OFFICIELLE KARAK :
 *
 * un héros peut effectuer jusqu'à 4 déplacements pendant son tour.
 *
 * Le service ne gère volontairement pas :
 *
 * - l'ordre des joueurs ;
 * - le changement de joueur ;
 * - la fin automatique du tour ;
 * - les combats ;
 * - les autres actions susceptibles d'interrompre un déplacement.
 *
 * Ces responsabilités appartiennent à `GameService` et aux services de
 * résolution spécialisés.
 */
@Injectable({
  providedIn: 'root',
})
export class TurnService {
  private suspendedMovements: number | null = null;

  // ==========================================================
  // ÉTAT DU TOUR
  // ==========================================================

  /**
   * Nombre de déplacements encore disponibles
   * pendant le tour courant.
   *
   * CHOIX D'IMPLÉMENTATION :
   *
   * un Signal Angular est utilisé afin que les composants
   * affichant cette valeur soient automatiquement mis à jour
   * lorsqu'un mouvement est consommé ou que le compteur
   * est réinitialisé.
   *
   * Le type `number` est précisé explicitement car
   * GAME_CONSTANTS utilise `as const` et TypeScript déduit
   * sinon le type littéral `4`.
   */
  readonly remainingMovements = signal<number>(
    GAME_CONSTANTS.movement.perTurn,
  );

  /** Nombre de déplacements déjà réalisés pendant le tour courant. */
  readonly movementsMadeThisTurn = signal<number>(0);

  /** Événement émis uniquement après une consommation effective. */
  readonly lastMovementConsumption = signal<MovementConsumptionAnimation | null>(null);

  /**
   * Révision dédiée au début d'un nouveau tour.
   *
   * Ce signal sert uniquement à synchroniser les animations d'interface.
   * Il n'est pas modifié lors d'une restauration afin de ne pas rejouer
   * une animation historique au chargement d'une partie.
   */
  readonly movementResetRevision = signal(0);


  // ==========================================================
  // ÉTAT DÉRIVÉ
  // ==========================================================

  /**
   * Indique si le joueur peut encore effectuer
   * au moins un déplacement.
   */
  get canMove(): boolean {
    return this.remainingMovements() > 0;
  }

  /**
   * Nombre de mouvements masqués pendant une résolution obligatoire.
   *
   * La valeur reste consultable sans restaurer la suspension. Elle permet
   * aux pouvoirs qui reprennent un tour de distinguer une vraie reprise
   * d'une suspension enregistrée après le quatrième mouvement.
   */
  get suspendedMovementCount(): number | null {
    return this.suspendedMovements;
  }


  // ==========================================================
  // GESTION DES MOUVEMENTS
  // ==========================================================

  /**
   * Consomme un déplacement.
   *
   * Aucun mouvement supplémentaire ne peut être consommé
   * lorsque le compteur a atteint zéro.
   */
  consumeMovement(): void {
    if (!this.canMove) {
      return;
    }

    const consumedPointIndex = this.remainingMovements() - 1;
    this.remainingMovements.update(
      (remaining) => remaining - 1,
    );
    this.movementsMadeThisTurn.update((made) => made + 1);
    this.publishMovementConsumption(consumedPointIndex, 1);
  }

  /**
   * Consomme définitivement tous les mouvements encore disponibles.
   *
   * Cette opération est distincte de `stopMovements()` : elle ne crée pas
   * de suspension restaurable et comptabilise les mouvements consommés.
   */
  consumeAllMovements(): boolean {
    if (!this.canMove || this.suspendedMovements !== null) return false;
    const remaining = this.remainingMovements();
    this.remainingMovements.set(0);
    this.movementsMadeThisTurn.update(made => made + remaining);
    this.publishMovementConsumption(0, remaining);
    return true;
  }

  /** Publie uniquement une consommation effective pour synchroniser l'animation du HUD. */
  private publishMovementConsumption(firstPointIndex: number, count: number): void {
    this.lastMovementConsumption.set({
      firstPointIndex,
      count,
    });
  }


  /**
   * Suspend temporairement les déplacements du tour courant.
   *
   * Utilisé lorsqu'une entrée sur une tuile déclenche une
   * résolution obligatoire, par exemple un combat ou un coffre.
   * Cette méthode ne consomme aucun déplacement : elle masque seulement
   * le compteur pendant la décision. Une fin définitive de tour réutilise
   * aussi cette primitive, puis le prochain tour invalide la suspension
   * avec `resetMovements()`.
   */
  stopMovements(): void {
    const remaining = this.remainingMovements();
    if (this.suspendedMovements === null && remaining > 0) {
      this.suspendedMovements = remaining;
    }
    this.remainingMovements.set(0);
  }

  /** Restaure uniquement les mouvements suspendus par une résolution de tuile. */
  resumeSuspendedMovements(): boolean {
    if (this.suspendedMovements === null) return false;
    this.remainingMovements.set(this.suspendedMovements);
    this.suspendedMovements = null;
    return true;
  }


  /**
   * Rétablit le nombre de déplacements disponibles
   * pour un nouveau tour.
   */
  resetMovements(): void {
    this.suspendedMovements = null;
    this.remainingMovements.set(
      GAME_CONSTANTS.movement.perTurn,
    );
    this.movementsMadeThisTurn.set(0);
    this.lastMovementConsumption.set(null);
    this.movementResetRevision.update(revision => revision + 1);
  }

  /** Restaure les compteurs d'un tour sans rejouer une animation passée. */
  restore(remaining: number, made: number, suspended: number | null): boolean {
    if (!Number.isInteger(remaining) || remaining < 0 || remaining > GAME_CONSTANTS.movement.perTurn) return false;
    if (!Number.isInteger(made) || made < 0 || made > GAME_CONSTANTS.movement.perTurn) return false;
    if (suspended !== null && (!Number.isInteger(suspended) || suspended < 0 || suspended > GAME_CONSTANTS.movement.perTurn)) return false;
    this.suspendedMovements = suspended;
    this.remainingMovements.set(remaining);
    this.movementsMadeThisTurn.set(made);
    this.lastMovementConsumption.set(null);
    return true;
  }
}
