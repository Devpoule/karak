import { Equipment } from '../models/equipment';

const TOKEN_ASSET_PATH = '/assets/tokens';

/** Catalogue des équipements du jeu de base ; aucune attribution automatique ici. */
export const EQUIPMENT_DEFINITIONS = {
  daggers: {
    id: 'daggers',
    name: 'Poignards',
    kind: 'weapon',
    attackBonus: 1,
    image: `${TOKEN_ASSET_PATH}/daggers.png`,
  },
  sword: {
    id: 'sword',
    name: 'Épée',
    kind: 'weapon',
    attackBonus: 2,
    image: `${TOKEN_ASSET_PATH}/sword.png`,
  },
  axe: {
    id: 'axe',
    name: 'Hache',
    kind: 'weapon',
    attackBonus: 3,
    image: `${TOKEN_ASSET_PATH}/axe.png`,
  },
  'fire-sword': {
    id: 'fire-sword',
    name: 'Tir magique',
    kind: 'spell',
    effect: 'magic-attack',
    image: `${TOKEN_ASSET_PATH}/fire-sword.png`,
  },
  heart: {
    id: 'heart',
    name: 'Portail de guérison',
    kind: 'spell',
    effect: 'healing-portal',
    image: `${TOKEN_ASSET_PATH}/heart.png`,
  },
  key: { id: 'key', name: 'Clé', kind: 'key', image: `${TOKEN_ASSET_PATH}/key.png` },
} as const satisfies Record<string, Equipment>;

export function getEquipmentDefinition(id: string): Equipment | undefined {
  return Object.values(EQUIPMENT_DEFINITIONS).find((item) => item.id === id);
}
