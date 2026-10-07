import { Injectable, signal } from '@angular/core';

import { GAME_CONSTANTS } from '../constants/game.constants';


/**
 * Gère l'état du tour de jeu en cours.
 *
 * RÈGLE OFFICIELLE KARAK :
 *
 * un héros peut effectuer jusqu'à 4 déplacements pendant son tour.
 *
 * À ce stade, le service ne gère volontairement pas encore :
 *
 * - l'ordre des joueurs ;
 * - le changement de joueur ;
 * - la fin automatique du tour ;
 * - les combats ;
 * - les autres actions susceptibles d'interrompre un déplacement.
 *
 * Ces responsabilités seront introduites avec les mécaniques
 * correspondantes.
 */
@Injectable({
  providedIn: 'root',
})
export class TurnService {

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

    this.remainingMovements.update(
      (remaining) => remaining - 1,
    );
  }


  /**
   * Interrompt immédiatement les déplacements du tour courant.
   *
   * Utilisé lorsqu'une entrée sur une tuile déclenche une
   * résolution obligatoire, par exemple un combat ou un coffre.
   */
  stopMovements(): void {
    this.remainingMovements.set(0);
  }


  /**
   * Rétablit le nombre de déplacements disponibles
   * pour un nouveau tour.
   */
  resetMovements(): void {
    this.remainingMovements.set(
      GAME_CONSTANTS.movement.perTurn,
    );
  }
}
