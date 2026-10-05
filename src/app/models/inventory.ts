/**
 * Emplacement d'inventaire encore vide.
 *
 * Les règles d'objets, d'armes, de sorts et de clés ne sont pas
 * encore modélisées dans le dépôt. Le type générique permet de
 * représenter aujourd'hui des emplacements vides sans inventer
 * prématurément la structure des futurs objets.
 */
export type InventorySlot<TItem = never> =
  | TItem
  | null;

/**
 * Inventaire minimal d'un joueur.
 *
 * RÈGLE DOCUMENTÉE DANS LE PROJET :
 *
 * l'inventaire d'un héros peut contenir :
 *
 * - jusqu'à 2 armes ;
 * - jusqu'à 3 sorts ;
 * - 1 clé.
 *
 * Au début d'une partie, les emplacements existent mais sont vides.
 * Les règles d'utilisation, de loot, d'échange ou de coffre seront
 * ajoutées dans les tranches dédiées.
 */
export interface PlayerInventory {
  weapons: InventorySlot[];
  spells: InventorySlot[];
  key: InventorySlot;
}

/**
 * Capacités actuellement confirmées pour l'inventaire.
 */
export const PLAYER_INVENTORY_CAPACITY = {
  weapons: 2,
  spells: 3,
  key: 1,
} as const;

/**
 * Crée un inventaire vide indépendant pour un joueur.
 *
 * Chaque appel retourne de nouveaux tableaux afin qu'aucun joueur
 * ne partage accidentellement un état mutable avec un autre.
 */
export function createEmptyPlayerInventory():
  PlayerInventory {
  return {
    weapons: Array.from({
      length:
        PLAYER_INVENTORY_CAPACITY.weapons,
    }, () => null),

    spells: Array.from({
      length:
        PLAYER_INVENTORY_CAPACITY.spells,
    }, () => null),

    key: null,
  };
}
