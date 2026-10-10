
import {
  TokenDefinition,
  TokenDefinitionId,
} from '../models/token';

/**
 * Chemin des illustrations des jetons.
 */
const TOKEN_ASSET_PATH = '/assets/tokens';

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
    name: 'Le Rat Géant',
    kind: 'monster',
    strength: 5,
    image: `${TOKEN_ASSET_PATH}/giant-rat.png`,
    rewards: [
      { kind: 'equipment', equipmentId: 'daggers' },
    ],
  },

  {
    id: 'giant-spider',
    name: 'L\'Araignée Géante',
    kind: 'monster',
    strength: 6,
    image: `${TOKEN_ASSET_PATH}/giant-spider.png`,
    rewards: [
      { kind: 'equipment', equipmentId: 'heart' },
    ],
  },

  {
    id: 'skeleton-mummy',
    name: 'La Momie',
    kind: 'monster',
    strength: 7,
    image: `${TOKEN_ASSET_PATH}/skeleton-mummy.png`,
    rewards: [
      { kind: 'equipment', equipmentId: 'fire-sword' },
      { kind: 'special', effect: 'curse' },
    ],
  },

  {
    id: 'skeleton-key-guardian',
    name: 'Le Squelette – Gardien De Clé',
    kind: 'monster',
    strength: 8,
    image: `${TOKEN_ASSET_PATH}/skeleton-key-guardian.png`,
    rewards: [
      { kind: 'equipment', equipmentId: 'key' },
    ],
  },

  {
    id: 'skeleton-swordsman',
    name: 'Le Squelette – Épéiste',
    kind: 'monster',
    strength: 9,
    image: `${TOKEN_ASSET_PATH}/skeleton-swordsman.png`,
    rewards: [
      { kind: 'equipment', equipmentId: 'sword' },
    ],
  },

  {
    id: 'skeleton-king',
    name: 'Le Roi Squelette',
    kind: 'monster',
    strength: 10,
    image: `${TOKEN_ASSET_PATH}/skeleton-king.png`,
    rewards: [
      { kind: 'equipment', equipmentId: 'axe' },
    ],
  },

  {
    id: 'fallen',
    name: 'Le Spectre De Mort',
    kind: 'monster',
    strength: 12,
    image: `${TOKEN_ASSET_PATH}/fallen.png`,
    rewards: [
      { kind: 'treasure', tokenId: 'open-chest' },
    ],
  },

  {
    id: 'dragon',
    name: 'Le Dragon',
    kind: 'monster',
    strength: 15,
    image: `${TOKEN_ASSET_PATH}/dragon.png`,
    rewards: [
      { kind: 'treasure', tokenId: 'treasure' },
    ],
  },

  // ==========================================================
  // MONSTRES — EXTENSION KARAK RÉGENT
  // ==========================================================

  {
    id: 'giant-bat',
    name: 'La Chauve-Souris Géante',
    kind: 'monster',
    strength: 6,
    image: `${TOKEN_ASSET_PATH}/giant-bat.png`,
    rewards: [
      { kind: 'equipment', equipmentId: 'skull' },
    ],
  },

  {
    id: 'skeleton-ice-magician',
    name: 'Le Squelette – Magicien De Glace',
    kind: 'monster',
    strength: 11,
    image: `${TOKEN_ASSET_PATH}/skeleton-ice-magician.png`,
    rewards: [
      { kind: 'equipment', equipmentId: 'punch' },
    ],
  },

  // ==========================================================
  // TRÉSORS
  // ==========================================================

  {
    id: 'closed-chest',
    kind: 'treasure',
    image: `${TOKEN_ASSET_PATH}/closed-chest.png`,
    backTokenId: 'open-chest',
  },

  {
    id: 'open-chest',
    kind: 'treasure',
    image: `${TOKEN_ASSET_PATH}/open-chest.png`,
  },

  {
    id: 'treasure',
    kind: 'treasure',
    image: `${TOKEN_ASSET_PATH}/treasure.png`,
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
