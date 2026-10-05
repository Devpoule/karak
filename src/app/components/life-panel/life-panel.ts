import { Component, Input } from '@angular/core';

import { Player } from '../../models/player';


/**
 * Affiche le plateau visuel des points de vie d'un joueur.
 *
 * Le composant conserve l'asset correspondant au plateau de vie,
 * mais la valeur affichée provient désormais du vrai joueur actif.
 *
 * Il ne gère pas encore :
 *
 * - la perte de points de vie ;
 * - la guérison ;
 * - le positionnement des marqueurs de vie.
 *
 * Ces éléments seront ajoutés lorsque l'état du joueur
 * et du héros sera implémenté.
 */
@Component({
  imports: [],
  selector: 'app-life-panel',
  styleUrl: './life-panel.scss',
  templateUrl: './life-panel.html',
})
export class LifePanel {
  /**
   * Joueur dont les points de vie sont représentés.
   *
   * Player.lives reste l'unique source de vérité métier.
   */
  @Input() player: Player | null = null;

  get lives(): number {
    return this.player?.lives ?? 0;
  }
}
