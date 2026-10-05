import { Component, Input } from '@angular/core';

import {
  PLAYER_INVENTORY_CAPACITY,
  PlayerInventory,
} from '../../models/inventory';

import { Player } from '../../models/player';


/**
 * Affiche l'inventaire d'un joueur.
 *
 * Le support board_03.jpg matérialise déjà graphiquement
 * les différents emplacements de l'inventaire.
 *
 * Les emplacements vides ne produisent donc aucun rendu
 * supplémentaire.
 *
 * Seuls les objets réellement possédés par le joueur seront
 * superposés au support.
 *
 * Capacités de l'inventaire :
 *
 * - 2 armes ;
 * - 3 sorts ;
 * - 1 clé.
 */
@Component({
  imports: [],
  selector: 'app-inventory-panel',
  styleUrl: './inventory-panel.scss',
  templateUrl: './inventory-panel.html',
})
export class InventoryPanel {

  /**
   * Joueur dont l'inventaire est affiché.
   */
  @Input() player: Player | null = null;


  /**
   * Capacités maximales de l'inventaire.
   */
  readonly capacity =
    PLAYER_INVENTORY_CAPACITY;


  /**
   * Inventaire réel du joueur.
   */
  get inventory(): PlayerInventory | null {
    return this.player?.inventory ?? null;
  }


  /**
   * Deux emplacements d'armes.
   *
   * Une valeur null représente simplement un emplacement vide
   * et ne doit produire aucun élément graphique.
   */
  get weaponSlots(): unknown[] {
    return (
      this.inventory?.weapons
      ?? Array.from(
        {
          length: this.capacity.weapons,
        },
        () => null,
      )
    );
  }


  /**
   * Trois emplacements de sorts.
   *
   * Une valeur null représente simplement un emplacement vide
   * et ne doit produire aucun élément graphique.
   */
  get spellSlots(): unknown[] {
    return (
      this.inventory?.spells
      ?? Array.from(
        {
          length: this.capacity.spells,
        },
        () => null,
      )
    );
  }


  /**
   * Indique si le joueur possède actuellement une clé.
   */
  get hasKey(): boolean {
    return (
      this.inventory?.key !== null
      && this.inventory?.key !== undefined
    );
  }
}
