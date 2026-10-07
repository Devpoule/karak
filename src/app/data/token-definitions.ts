import { TokenDefinition } from '../models/token';


/**
 * Chemin racine des assets représentant les jetons.
 *
 * Centralisé ici afin d'éviter de répéter le chemin complet
 * pour chaque définition.
 */
const TOKEN_ASSET_PATH = '/assets/tokens';


/**
 * Définitions des jetons pouvant être tirés depuis le sachet
 * monstres/trésors du jeu de base Karak.
 *
 * Cette collection décrit les caractéristiques propres à chaque
 * type de jeton :
 *
 * - son identifiant métier ;
 * - sa nature (monstre ou trésor) ;
 * - son image ;
 * - sa force lorsqu'il s'agit d'un monstre.
 *
 * Le nombre d'exemplaires présents dans le sachet n'est pas
 * défini ici : il appartient à TOKEN_BAG_COMPOSITION.
 */
export const TOKEN_DEFINITIONS: TokenDefinition[] = [

  // ---------------------------------------------------------------------------
  // Monstres
  // ---------------------------------------------------------------------------

  {
    id: 'giant-rat',
    kind: 'monster',
    strength: 5,
    image: `${TOKEN_ASSET_PATH}/giant_rat.png`,
  },

  {
    id: 'giant-spider',
    kind: 'monster',
    strength: 6,
    image: `${TOKEN_ASSET_PATH}/giant_spider.png`,
  },

  {
    id: 'skeleton-mummy',
    kind: 'monster',
    strength: 7,
    image: `${TOKEN_ASSET_PATH}/skeleton_mummy.png`,
  },

  {
    id: 'skeleton-key-guardian',
    kind: 'monster',
    strength: 8,
    image: `${TOKEN_ASSET_PATH}/skeleton_key_guardian.png`,
  },

  {
    id: 'skeleton-swordsman',
    kind: 'monster',
    strength: 9,
    image: `${TOKEN_ASSET_PATH}/skeleton_swordsman.png`,
  },

  {
    id: 'skeleton-king',
    kind: 'monster',
    strength: 10,
    image: `${TOKEN_ASSET_PATH}/skeleton_king.png`,
  },

  {
    id: 'fallen',
    kind: 'monster',
    strength: 12,
    image: `${TOKEN_ASSET_PATH}/fallen.png`,
  },

  // {
  //   id: 'skeleton-ice-magician',
  //   kind: 'monster',
  //   strength: 11,
  //   image: `${TOKEN_ASSET_PATH}/skeleton_ice_magician.png`,
  // },

  {
    id: 'dragon',
    kind: 'monster',
    strength: 15,
    image: `${TOKEN_ASSET_PATH}/dragon.png`,
  },

  // ---------------------------------------------------------------------------
  // Trésors
  // ---------------------------------------------------------------------------

  {
    id: 'closed-chest',
    kind: 'treasure',
    image: `${TOKEN_ASSET_PATH}/closed_chest.png`,
  },

  {
    id: 'open-chest',
    kind: 'treasure',
    image: `${TOKEN_ASSET_PATH}/open_chest.png`,
  },

  {
    id: 'treasure',
    kind: 'treasure',
    image: `${TOKEN_ASSET_PATH}/treasure.png`,
  },
];


/**
 * Recherche une définition de jeton à partir de son identifiant métier.
 */
export function getTokenDefinition(
  id: string,
): TokenDefinition | undefined {
  return TOKEN_DEFINITIONS.find(
    definition => definition.id === id,
  );
}
