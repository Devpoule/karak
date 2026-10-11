import { Component, Input } from '@angular/core';

import { Player } from '../../models/player';
import { LifePanel } from '../life-panel/life-panel';
import { HeroPanel } from '../hero-panel/hero-panel';
import { InventoryPanel } from '../inventory-panel/inventory-panel';
import { TreasurePanel } from '../treasure-panel/treasure-panel';

/**
 * Position de la fiche joueur dans l'interface.
 *
 * Cette information permet notamment de différencier
 * les joueurs affichés à gauche et à droite.
 */
export type PlayerSide = 'left' | 'right';


/**
 * Fiche visuelle d'un joueur.
 *
 * Elle regroupe les différents panneaux qui composent
 * l'interface personnelle d'un joueur :
 *
 * - points de vie ;
 * - héros ;
 * - inventaire ;
 * - trésors.
 *
 * Le composant ne contient aucune logique de jeu.
 * Il reçoit les informations préparées par le HUD et
 * les transmet aux panneaux concernés.
 */
@Component({
  selector: 'app-player-sidebar',
  imports: [
    LifePanel,
    HeroPanel,
    InventoryPanel,
    TreasurePanel,
  ],
  templateUrl: './player-sidebar.html',
  styleUrl: './player-sidebar.scss',
})
export class PlayerSidebar {

  // ==========================================================
  // CONFIGURATION DU JOUEUR
  // ==========================================================

  /**
   * Côté occupé par la fiche dans l'interface.
   */
  @Input({ required: true }) side!: PlayerSide;


  /**
   * Joueur représenté par la fiche.
   */
  @Input() player: Player | null = null;


  // ==========================================================
  // PANNEAUX VISIBLES
  // ==========================================================

  /**
   * Affiche les panneaux liés au personnage :
   * points de vie et héros.
   */
  @Input() showPlayer = true;


  /**
   * Affiche le panneau d'inventaire.
   */
  @Input() showInventory = true;


}
