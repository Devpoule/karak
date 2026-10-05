import { Component, Input } from '@angular/core';

import { PLAYER_INVENTORY_CAPACITY, PlayerInventory } from '../../models/inventory';
import { Player } from '../../models/player';


/**
 * Affiche le plateau visuel réservé à l'inventaire d'un joueur.
 *
 * RÈGLE OFFICIELLE KARAK :
 *
 * L'inventaire d'un héros peut contenir :
 *
 * - jusqu'à 2 armes ;
 * - jusqu'à 3 sorts ;
 * - 1 clé.
 *
 * Le composant conserve l'asset servant de support à l'inventaire,
 * mais ses emplacements proviennent désormais du vrai joueur actif.
 *
 * Il ne gère pas encore :
 *
 * - l'ajout ou le retrait d'un équipement ;
 * - l'utilisation d'un objet ou d'un sort.
 *
 * Ces responsabilités seront introduites avec le modèle
 * d'inventaire et l'état réel du joueur.
 */
@Component({
  imports: [],
  selector: 'app-inventory-panel',
  styleUrl: './inventory-panel.scss',
  templateUrl: './inventory-panel.html',
})
export class InventoryPanel {
  /**
   * Joueur dont l'inventaire est représenté.
   */
  @Input() player: Player | null = null;

  readonly capacity =
    PLAYER_INVENTORY_CAPACITY;

  get inventory(): PlayerInventory | null {
    return this.player?.inventory ?? null;
  }

  get weaponSlots(): unknown[] {
    return (
      this.inventory?.weapons
      ?? Array.from({
        length: this.capacity.weapons,
      }, () => null)
    );
  }

  get spellSlots(): unknown[] {
    return (
      this.inventory?.spells
      ?? Array.from({
        length: this.capacity.spells,
      }, () => null)
    );
  }

  get hasKey(): boolean {
    return this.inventory?.key !== null
      && this.inventory?.key !== undefined;
  }
}
