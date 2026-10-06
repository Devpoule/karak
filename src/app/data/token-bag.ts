import { TokenDefinitionId } from '../models/token';


/**
 * Composition physique initiale du sachet
 * monstres/trésors du jeu de base Karak.
 *
 * Chaque entrée associe :
 *
 * - l'identifiant métier d'un type de jeton ;
 * - son nombre d'exemplaires présents au début de la partie.
 *
 * IMPORTANT :
 *
 * Cette constante décrit uniquement la composition du sachet.
 *
 * Les caractéristiques des jetons (image, force, etc.)
 * appartiennent à TOKEN_DEFINITIONS.
 */
export interface TokenBagCompositionEntry {
  definitionId: TokenDefinitionId;
  count: number;
}


/**
 * Composition officielle du sachet au début d'une partie.
 *
 * Total :
 *
 * - 43 monstres ;
 * - 10 coffres ;
 * - 53 jetons.
 */
export const TOKEN_BAG_COMPOSITION: TokenBagCompositionEntry[] = [
  {
    definitionId: 'giant-rat',
    count: 8,
  },
  {
    definitionId: 'giant-spider',
    count: 4,
  },
  {
    definitionId: 'skeleton-key-guardian',
    count: 12,
  },
  {
    definitionId: 'skeleton-swordsman',
    count: 5,
  },
  {
    definitionId: 'skeleton-mummy',
    count: 8,
  },
  {
    definitionId: 'skeleton-king',
    count: 3,
  },
  {
    definitionId: 'fallen',
    count: 2,
  },
  {
    definitionId: 'closed-chest',
    count: 10,
  },
  {
    definitionId: 'dragon',
    count: 1,
  },
  // Extension "Karak Régent"
  // {
  //   definitionId: 'giant-bat',
  //   count: 6,
  // },
  // {
  //   definitionId: 'skeleton-ice-magician',
  //   count: 2,
  // },
];
