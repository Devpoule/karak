import { GAME_CONSTANTS } from '../constants/game.constants';

export interface TileDeckEntry {
  definitionId: string;
  count: number;
}

/**
 * Composition physique de la pioche du jeu de base Karak.
 *
 * La tuile de départ n'en fait pas partie : elle est placée
 * directement au centre du donjon.
 *
 * Les assets numérotés représentent des tuiles physiques uniques.
 * Les autres définitions peuvent exister en plusieurs exemplaires.
 */
export const TILE_DECK_COMPOSITION: TileDeckEntry[] = [
  // Couloirs droits
  { definitionId: 'length-01', count: 1 },
  { definitionId: 'length-02', count: 1 },
  { definitionId: 'length-03', count: 1 },
  { definitionId: 'length-04', count: 1 },

  // Couloirs en angle
  { definitionId: 'corner-01', count: 1 },
  { definitionId: 'corner-02', count: 1 },
  { definitionId: 'corner-03', count: 1 },
  { definitionId: 'corner-04', count: 1 },

  // Salles
  { definitionId: 'corner-room', count: 13 },
  { definitionId: 'cross-room', count: 14 },
  { definitionId: 'intersection-room', count: 13 },
  { definitionId: 'length-room', count: 13 },

  // Croisements
  { definitionId: 'cross', count: 7 },

  // Téléporteurs
  { definitionId: 'teleporter-length-01', count: 1 },
  { definitionId: 'teleporter-length-02', count: 1 },
  { definitionId: 'teleporter-length-03', count: 1 },
  { definitionId: 'teleporter-length-04', count: 1 },

  // Fontaines de guérison
  { definitionId: 'healing-corner', count: 2 },

  // Intersections en T
  { definitionId: 'intersection-01', count: 1 },
  { definitionId: 'intersection-02', count: 1 },
  { definitionId: 'intersection-03', count: 1 },
  { definitionId: 'intersection-04', count: 1 },
  { definitionId: 'intersection-05', count: 1 },
];

export const TILE_DECK_SIZE = TILE_DECK_COMPOSITION.reduce(
  (total, entry) => total + entry.count,
  0,
);

/**
 * Garde-fou : la composition déclarée doit toujours correspondre
 * au nombre attendu de tuiles dans la pioche.
 */
if (TILE_DECK_SIZE !== GAME_CONSTANTS.tiles.deck) {
  throw new Error(
    `Composition de la pioche invalide : ${TILE_DECK_SIZE} tuiles ` +
      `au lieu de ${GAME_CONSTANTS.tiles.deck}.`,
  );
}

export function createTileDeck(): string[] {
  return TILE_DECK_COMPOSITION.flatMap((entry) =>
    Array(entry.count).fill(entry.definitionId),
  );
}

/**
 * Mélange Fisher-Yates sans modifier le tableau reçu.
 */
export function shuffleTileDeck(deck: string[]): string[] {
  const shuffledDeck = [...deck];

  for (let i = shuffledDeck.length - 1; i > 0; i--) {
    const randomIndex = Math.floor(Math.random() * (i + 1));

    [shuffledDeck[i], shuffledDeck[randomIndex]] = [
      shuffledDeck[randomIndex],
      shuffledDeck[i],
    ];
  }

  return shuffledDeck;
}

export function createShuffledTileDeck(): string[] {
  return shuffleTileDeck(createTileDeck());
}
