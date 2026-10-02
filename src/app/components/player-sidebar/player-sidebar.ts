import { Component, Input } from '@angular/core';

import { LifePanel } from '../life-panel/life-panel';
import { HeroPanel } from '../hero-panel/hero-panel';
import { InventoryPanel } from '../inventory-panel/inventory-panel';
import { MessagePanel } from '../message-panel/message-panel';


/**
 * Position de la fiche joueur dans l'interface.
 *
 * Cette information permettra notamment de différencier
 * les joueurs gauche et droit dans les modes multijoueurs.
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
 * - messages.
 *
 * Le composant ne contient aucune logique de jeu.
 * Il décide uniquement quels panneaux doivent être affichés.
 */
@Component({
  selector: 'app-player-sidebar',
  imports: [
    LifePanel,
    HeroPanel,
    InventoryPanel,
    MessagePanel,
  ],
  templateUrl: './player-sidebar.html',
  styleUrl: './player-sidebar.scss',
})
export class PlayerSidebar {

  // ==========================================================
  // CONFIGURATION DU JOUEUR
  // ==========================================================

  /**
   * Côté occupé par le joueur dans l'interface.
   */
  @Input({ required: true }) side!: PlayerSide;


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

  /**
   * Affiche l'encadré réservé aux messages du joueur.
   */
  @Input() showMessage = true;
}
