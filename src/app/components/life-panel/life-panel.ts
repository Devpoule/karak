import { Component, Input } from '@angular/core';

import { Player } from '../../models/player';


/**
 * Nombre maximal de points de vie d'un héros.
 *
 * Cette constante concerne uniquement la représentation actuelle
 * du plateau de vie. La valeur courante reste stockée dans
 * `Player.lives`, qui demeure l'unique source de vérité métier.
 */
const MAX_LIVES = 5;


/**
 * Représentation d'un emplacement du plateau de vie.
 */
interface LifeSlot {
  index: number;
  active: boolean;
}


/**
 * Affiche les points de vie d'un joueur.
 *
 * Le plateau physique de Karak comporte cinq emplacements.
 * Chaque emplacement reçoit :
 *
 * - un marqueur de vie lorsque le PV est disponible ;
 * - un marqueur de mort lorsque le PV est perdu.
 *
 * Le composant ne possède aucun état de vie indépendant :
 * il traduit uniquement `Player.lives` en représentation visuelle.
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
   */
  @Input() player: Player | null = null;


  /**
   * Nombre actuel de points de vie.
   *
   * La valeur est bornée entre 0 et MAX_LIVES afin que le HUD
   * reste robuste face à un état temporairement incohérent.
   */
  get lives(): number {
    const lives = this.player?.lives ?? 0;

    return Math.max(
      0,
      Math.min(MAX_LIVES, lives),
    );
  }


  /**
   * Les cinq emplacements physiques du plateau de vie.
   */
  get lifeSlots(): LifeSlot[] {
    return Array.from(
      { length: MAX_LIVES },
      (_, index) => ({
        index,
        active: index < this.lives,
      }),
    );
  }
}
