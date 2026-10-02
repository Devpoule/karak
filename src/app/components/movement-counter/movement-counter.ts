import { Component } from '@angular/core';

import { GAME_CONSTANTS } from '../../constants/game.constants';


/**
 * Affiche le nombre de mouvements disponibles pour le joueur.
 *
 * ÉTAT ACTUEL :
 *
 * Le composant représente uniquement la valeur initiale définie
 * par les règles du jeu.
 *
 * Il ne gère pas encore :
 *
 * - le joueur actif ;
 * - la consommation d'un mouvement ;
 * - la remise à zéro en début de tour ;
 * - les éventuelles règles modifiant les déplacements.
 *
 * Ces responsabilités seront ajoutées avec la gestion réelle
 * des tours et des joueurs.
 */
@Component({
  imports: [],
  selector: 'app-movement-counter',
  styleUrl: './movement-counter.scss',
  templateUrl: './movement-counter.html',
})
export class MovementCounter {

  /**
   * RÈGLE OFFICIELLE KARAK :
   *
   * un héros dispose de 4 mouvements pendant son tour.
   *
   * CHOIX D'IMPLÉMENTATION :
   *
   * on génère les indicateurs visuels depuis GAME_CONSTANTS
   * plutôt que de coder quatre éléments directement dans le HTML.
   *
   * Cette valeur représente pour l'instant les mouvements
   * initiaux, pas encore leur état dynamique pendant un tour.
   */
  readonly movementPoints = Array.from(
    { length: GAME_CONSTANTS.movement.perTurn },
  );
}
