import { GAME_CONSTANTS } from '../constants/game.constants';
import { TILE_DEFINITIONS } from './tile-definitions';


/**
 * Décrit une catégorie de tuiles présente dans la pioche.
 *
 * Plusieurs tuiles physiques peuvent partager la même définition.
 *
 * Exemple :
 *
 * {
 *   definitionId: 'corner-room',
 *   count: 13,
 * }
 *
 * signifie que 13 occurrences de cette définition doivent
 * être présentes dans la pioche.
 */
export interface TileDeckEntry {

  /**
   * Identifiant de la TileDefinition correspondante.
   */
  definitionId: string;

  /**
   * Nombre d'exemplaires physiques présents dans la pioche.
   */
  count: number;
}


// ==========================================================
// COMPOSITION DE LA PIOCHE
// ==========================================================

/**
 * Composition physique de la pioche du jeu de base Karak.
 *
 * RÈGLE OFFICIELLE KARAK :
 *
 * le jeu contient 80 tuiles de catacombes au total.
 * La tuile de départ est placée directement au centre du donjon
 * et ne fait donc pas partie de la pioche.
 *
 * La pioche contient ainsi 79 tuiles.
 *
 * CHOIX D'IMPLÉMENTATION :
 *
 * les assets numérotés correspondent à des tuiles physiques
 * représentées individuellement.
 *
 * Les définitions communes peuvent, elles, apparaître plusieurs
 * fois grâce à la propriété `count`.
 */
export const TILE_DECK_COMPOSITION: TileDeckEntry[] = [

  // ----------------------------------------------------------
  // COULOIRS DROITS
  // ----------------------------------------------------------

  { definitionId: 'straight-01', count: 1 },
  { definitionId: 'straight-02', count: 1 },
  { definitionId: 'straight-03', count: 1 },
  { definitionId: 'straight-04', count: 1 },


  // ----------------------------------------------------------
  // COULOIRS EN ANGLE
  // ----------------------------------------------------------

  { definitionId: 'corner-01', count: 1 },
  { definitionId: 'corner-02', count: 1 },
  { definitionId: 'corner-03', count: 1 },
  { definitionId: 'corner-04', count: 1 },


  // ----------------------------------------------------------
  // SALLES
  // ----------------------------------------------------------

  { definitionId: 'corner-room', count: 13 },
  { definitionId: 'crossroads-room', count: 14 },
  { definitionId: 't-junction-room', count: 13 },
  { definitionId: 'straight-room', count: 13 },


  // ----------------------------------------------------------
  // CROISEMENTS
  // ----------------------------------------------------------

  { definitionId: 'cross', count: 7 },


  // ----------------------------------------------------------
  // TÉLÉPORTEURS
  // ----------------------------------------------------------

  { definitionId: 'portal-straight-01', count: 1 },
  { definitionId: 'portal-straight-02', count: 1 },
  { definitionId: 'portal-straight-03', count: 1 },
  { definitionId: 'portal-straight-04', count: 1 },


  // ----------------------------------------------------------
  // FONTAINES DE GUÉRISON
  // ----------------------------------------------------------

  { definitionId: 'healing-corner', count: 2 },


  // ----------------------------------------------------------
  // INTERSECTIONS EN T
  // ----------------------------------------------------------

  { definitionId: 't-junction-01', count: 1 },
  { definitionId: 't-junction-02', count: 1 },
  { definitionId: 't-junction-03', count: 1 },
  { definitionId: 't-junction-04', count: 1 },
  { definitionId: 't-junction-05', count: 1 },
];


// ==========================================================
// CONTRÔLE DE LA COMPOSITION
// ==========================================================

/**
 * Nombre réel de tuiles déclaré par TILE_DECK_COMPOSITION.
 *
 * Cette valeur est calculée plutôt que renseignée manuellement
 * afin d'éviter une seconde source de vérité.
 */
export const TILE_DECK_SIZE = TILE_DECK_COMPOSITION.reduce(
  (total, entry) => total + entry.count,
  0,
);


/**
 * Garde-fou de cohérence.
 *
 * La somme des exemplaires déclarés dans TILE_DECK_COMPOSITION
 * doit correspondre au nombre de tuiles attendu dans la pioche.
 *
 * Une modification accidentelle de la composition provoquera
 * ainsi immédiatement une erreur explicite.
 */
if (TILE_DECK_SIZE !== GAME_CONSTANTS.tiles.deck) {
  throw new Error(
    `Composition de la pioche invalide : ${TILE_DECK_SIZE} tuiles ` +
      `au lieu de ${GAME_CONSTANTS.tiles.deck}.`,
  );
}


/**
 * Garde-fou de cohérence entre la composition de la pioche
 * et le catalogue des définitions.
 *
 * Chaque definitionId utilisé dans TILE_DECK_COMPOSITION
 * doit correspondre à une TileDefinition existante.
 *
 * Cela permet de détecter immédiatement une faute de frappe
 * ou une référence vers une définition supprimée.
 */
const tileDefinitionIds = new Set(
  TILE_DEFINITIONS.map((definition) => definition.id),
);

const unknownDefinitionIds = TILE_DECK_COMPOSITION
  .map((entry) => entry.definitionId)
  .filter((definitionId) => !tileDefinitionIds.has(definitionId));

if (unknownDefinitionIds.length > 0) {
  throw new Error(
    `Définition de tuile inconnue dans la pioche : ` +
      unknownDefinitionIds.join(', '),
  );
}


// ==========================================================
// CRÉATION DE LA PIOCHE
// ============== ============================================

/**
 * Construit la pioche complète à partir de sa composition.
 *
 * Chaque TileDeckEntry est développé selon son nombre
 * d'exemplaires.
 *
 * Exemple :
 *
 * {
 *   definitionId: 'example',
 *   count: 3,
 * }
 *
 * devient :
 *
 * [
 *   'example',
 *   'example',
 *   'example',
 * ]
 *
 * La pioche produite ici n'est pas encore mélangée.
 */
export function createTileDeck(): string[] {
  return TILE_DECK_COMPOSITION.flatMap(
    (entry) =>
      Array(entry.count).fill(entry.definitionId),
  );
}


// ==========================================================
// MÉLANGE
// ==========================================================

/**
 * Mélange une pioche avec l'algorithme de Fisher-Yates.
 *
 * CHOIX D'IMPLÉMENTATION :
 *
 * le tableau reçu n'est jamais modifié directement.
 * Une copie est créée avant le mélange.
 *
 * Cette propriété permet d'utiliser la fonction sans provoquer
 * d'effet de bord sur le tableau d'origine.
 */
export function shuffleTileDeck(
  deck: string[],
): string[] {
  const shuffledDeck = [...deck];

  for (
    let i = shuffledDeck.length - 1;
    i > 0;
    i--
  ) {
    const randomIndex =
      Math.floor(Math.random() * (i + 1));

    [
      shuffledDeck[i],
      shuffledDeck[randomIndex],
    ] = [
      shuffledDeck[randomIndex],
      shuffledDeck[i],
    ];
  }

  return shuffledDeck;
}


// ==========================================================
// CRÉATION D'UNE PIOCHE PRÊTE À JOUER
// ==========================================================

/**
 * Construit une nouvelle pioche complète puis la mélange.
 *
 * C'est le point d'entrée utilisé par TileDeckService
 * lorsqu'une nouvelle pioche doit être initialisée.
 */
export function createShuffledTileDeck(): string[] {
  return shuffleTileDeck(
    createTileDeck(),
  );
}
