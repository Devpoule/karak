/**
 * Constantes structurelles du jeu de base Karak.
 * Elles ne contiennent aucun état d'une partie en cours.
 */
export const GAME_CONSTANTS = {
  tiles: {
    total: 80,
    start: 1,
    deck: 79,
  },

  movement: {
    perTurn: 4,
  },
} as const;
