
import {
  TokenDefinition,
  TokenDefinitionId,
} from '../models/token';

/**
 * Chemin des illustrations des jetons.
 */
const TOKEN_ASSET_PATH = '/assets/tokens';
const TOKEN_IMAGE_SUFFIX = '-small.webp';

/**
 * Catalogue des jetons de Karak.
 *
 * Les récompenses correspondent aux versos physiques
 * des monstres.
 *
 * Les définitions des extensions restent disponibles
 * sans être automatiquement ajoutées au sachet.
 *
 * Le nombre d'exemplaires est défini séparément dans
 * TOKEN_BAG_COMPOSITION.
 */
export const TOKEN_DEFINITIONS: TokenDefinition[] = [

  // ==========================================================
  // MONSTRES — JEU DE BASE
  // ==========================================================

  {
    id: 'giant-rat',
    origin: 'base',
    name: 'Le Rat Géant',
    kind: 'monster',
    strength: 5,
    image: `${TOKEN_ASSET_PATH}/giant-rat${TOKEN_IMAGE_SUFFIX}`,
    rewards: [
      { kind: 'equipment', equipmentId: 'daggers' },
    ],
  },

  {
    id: 'giant-spider',
    origin: 'base',
    name: 'L\'Araignée Géante',
    kind: 'monster',
    strength: 6,
    image: `${TOKEN_ASSET_PATH}/giant-spider${TOKEN_IMAGE_SUFFIX}`,
    rewards: [
      { kind: 'equipment', equipmentId: 'heart' },
    ],
  },

  {
    id: 'skeleton-mummy',
    origin: 'base',
    name: 'La Momie',
    kind: 'monster',
    strength: 7,
    image: `${TOKEN_ASSET_PATH}/skeleton-mummy${TOKEN_IMAGE_SUFFIX}`,
    rewards: [
      { kind: 'equipment', equipmentId: 'fire-sword' },
      { kind: 'special', effect: 'curse' },
    ],
  },

  {
    id: 'skeleton-key-guardian',
    origin: 'base',
    name: 'Le Gardien De Clé',
    kind: 'monster',
    strength: 8,
    image: `${TOKEN_ASSET_PATH}/skeleton-key-guardian${TOKEN_IMAGE_SUFFIX}`,
    rewards: [
      { kind: 'equipment', equipmentId: 'key' },
    ],
  },

  {
    id: 'skeleton-swordsman',
    origin: 'base',
    name: 'L\'Épéiste',
    kind: 'monster',
    strength: 9,
    image: `${TOKEN_ASSET_PATH}/skeleton-swordsman${TOKEN_IMAGE_SUFFIX}`,
    rewards: [
      { kind: 'equipment', equipmentId: 'sword' },
    ],
  },

  {
    id: 'skeleton-king',
    origin: 'base',
    name: 'Le Roi',
    kind: 'monster',
    strength: 10,
    image: `${TOKEN_ASSET_PATH}/skeleton-king${TOKEN_IMAGE_SUFFIX}`,
    rewards: [
      { kind: 'equipment', equipmentId: 'axe' },
    ],
  },

  {
    id: 'fallen',
    origin: 'base',
    name: 'Le Spectre De Mort',
    kind: 'monster',
    strength: 12,
    image: `${TOKEN_ASSET_PATH}/fallen${TOKEN_IMAGE_SUFFIX}`,
    rewards: [
      { kind: 'treasure', tokenId: 'open-chest' },
    ],
  },

  {
    id: 'dragon',
    origin: 'base',
    name: 'Le Dragon',
    kind: 'monster',
    strength: 15,
    image: `${TOKEN_ASSET_PATH}/dragon${TOKEN_IMAGE_SUFFIX}`,
    rewards: [
      { kind: 'treasure', tokenId: 'treasure' },
    ],
  },

  // ==========================================================
  // MONSTRES — EXTENSION KARAK RÉGENT
  // ==========================================================

  {
    id: 'giant-bat',
    origin: 'regent',
    name: 'La Chauve-Souris Géante',
    kind: 'monster',
    strength: 6,
    image: `${TOKEN_ASSET_PATH}/giant-bat${TOKEN_IMAGE_SUFFIX}`,
    rewards: [
      { kind: 'equipment', equipmentId: 'skull' },
    ],
  },

  {
    id: 'skeleton-ice-magician',
    origin: 'regent',
    name: 'Le Magicien De Glace',
    kind: 'monster',
    strength: 11,
    image: `${TOKEN_ASSET_PATH}/skeleton-ice-magician${TOKEN_IMAGE_SUFFIX}`,
    rewards: [
      { kind: 'equipment', equipmentId: 'punch' },
    ],
  },

  // ==========================================================
  // TRÉSORS
  // ==========================================================

  {
    id: 'closed-chest',
    origin: 'base',
    kind: 'treasure',
    image: `${TOKEN_ASSET_PATH}/closed-chest${TOKEN_IMAGE_SUFFIX}`,
    backTokenId: 'open-chest',
  },

  {
    id: 'open-chest',
    origin: 'base',
    kind: 'treasure',
    image: `${TOKEN_ASSET_PATH}/open-chest${TOKEN_IMAGE_SUFFIX}`,
  },

  {
    id: 'treasure',
    origin: 'base',
    kind: 'treasure',
    image: `${TOKEN_ASSET_PATH}/treasure${TOKEN_IMAGE_SUFFIX}`,
  },
];

/**
 * Recherche une définition de jeton
 * à partir de son identifiant métier.
 */
export function getTokenDefinition(
  id: TokenDefinitionId,
): TokenDefinition | undefined {
  return TOKEN_DEFINITIONS.find(
    definition => definition.id === id,
  );
}
