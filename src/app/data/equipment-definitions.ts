import { Equipment } from '../models/equipment';

const TOKEN_ASSET_PATH = '/assets/tokens';
const EQUIPMENT_IMAGE_SUFFIX = '-small.webp';

/** Catalogue des équipements du jeu de base ; aucune attribution automatique ici. */
export const EQUIPMENT_DEFINITIONS = {
  daggers: {
    id: 'daggers',
    name: 'Poignards',
    kind: 'weapon',
    attackBonus: 1,
    image: `${TOKEN_ASSET_PATH}/daggers${EQUIPMENT_IMAGE_SUFFIX}`,
  },
  sword: {
    id: 'sword',
    name: 'Épée',
    kind: 'weapon',
    attackBonus: 2,
    image: `${TOKEN_ASSET_PATH}/sword${EQUIPMENT_IMAGE_SUFFIX}`,
  },
  axe: {
    id: 'axe',
    name: 'Hache',
    kind: 'weapon',
    attackBonus: 3,
    image: `${TOKEN_ASSET_PATH}/axe${EQUIPMENT_IMAGE_SUFFIX}`,
  },
  'fire-sword': {
    id: 'fire-sword',
    name: 'Tir magique',
    kind: 'spell',
    effect: 'magic-attack',
    image: `${TOKEN_ASSET_PATH}/fire-sword${EQUIPMENT_IMAGE_SUFFIX}`,
  },
  heart: {
    id: 'heart',
    name: 'Portail de guérison',
    kind: 'spell',
    effect: 'healing-portal',
    image: `${TOKEN_ASSET_PATH}/heart${EQUIPMENT_IMAGE_SUFFIX}`,
  },
  key: { id: 'key', name: 'Clé', kind: 'key', image: `${TOKEN_ASSET_PATH}/key${EQUIPMENT_IMAGE_SUFFIX}` },
} as const satisfies Record<string, Equipment>;

/** Construit ou calcule le resultat de getEquipmentDefinition. */
/** Construit ou calcule le resultat de getEquipmentDefinition. */
export function getEquipmentDefinition(id: string): Equipment | undefined {
  return Object.values(EQUIPMENT_DEFINITIONS).find((item) => item.id === id);
}
