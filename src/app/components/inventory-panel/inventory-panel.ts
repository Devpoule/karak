import { Component } from '@angular/core';


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
 * ÉTAT ACTUEL :
 *
 * Le composant affiche uniquement l'asset servant de support
 * à l'inventaire.
 *
 * Il ne gère pas encore :
 *
 * - les objets possédés par le joueur ;
 * - l'ajout ou le retrait d'un équipement ;
 * - les limites de capacité ;
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
export class InventoryPanel {}
