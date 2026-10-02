import { Injectable } from '@angular/core';

import { Player } from '../models/player';
import { Direction } from '../models/tile';

/**
 * Gère l'état du joueur pendant une partie.
 *
 * Ce service est responsable des informations qui évoluent
 * au cours du jeu, notamment la position et l'orientation
 * du héros sur le plateau.
 *
 * Il sera enrichi progressivement à mesure que les mécaniques
 * liées au joueur seront introduites.
 */
@Injectable({
  providedIn: 'root',
})
export class PlayerService {
  /**
   * État actuel du joueur.
   *
   * CHOIX D'IMPLÉMENTATION :
   *
   * tant que la configuration et la création d'une partie
   * ne sont pas encore implémentées, Argentus est utilisé
   * comme héros de développement.
   *
   * Le héros commence sur la tuile de départ (0, 0),
   * orienté vers le sud.
   */
  readonly player: Player = {
    heroId: 'argentus',

    position: {
      x: 0,
      y: 0,
    },

    facing: 'south',
  };

  /**
   * Déplace le joueur vers une nouvelle position
   * et met à jour l'orientation de son héros.
   *
   * Cette méthode ne vérifie pas si le déplacement est autorisé
   * par la géométrie du donjon.
   *
   * CHOIX D'IMPLÉMENTATION :
   *
   * la validation du déplacement est effectuée avant cet appel.
   * PlayerService reste ainsi responsable de l'état du joueur,
   * sans porter les règles géométriques du donjon.
   */
  moveTo(x: number, y: number, direction: Direction): void {
    this.player.position = { x, y };
    this.player.facing = direction;
  }
}
