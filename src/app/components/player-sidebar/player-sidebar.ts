import { Component, Input } from '@angular/core';

import { Player } from '../../models/player';
import { LifePanel } from '../life-panel/life-panel';
import { HeroPanel } from '../hero-panel/hero-panel';
import { InventoryPanel } from '../inventory-panel/inventory-panel';
import { MessagePanel } from '../message-panel/message-panel';

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
 * - messages.
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
   * Côté occupé par la fiche dans l'interface.
   */
  @Input({ required: true }) side!: PlayerSide;


  /**
   * Joueur représenté par la fiche.
   */
  @Input() player: Player | null = null;


  /**
   * Couleur UI associée au joueur.
   *
   * Elle provient de PLAYER_UI_CONFIG via PlayerHud.
   *
   * La sidebar ne cherche volontairement pas à déterminer
   * elle-même l'identité ou la couleur du joueur.
   */
  @Input() playerColor = 'transparent';


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
