/**
 * Trésors pouvant être possédés par un joueur.
 *
 * Le type décrit la provenance métier du trésor plutôt que son score,
 * afin d'éviter de dupliquer une donnée calculable.
 */
export type Treasure =
  | 'opened-chest'
  | 'monster-treasure'
  | 'dragon-ruby';

/** Valeur en points d'un trésor. */
export const TREASURE_POINTS: Readonly<Record<Treasure, number>> = {
  'opened-chest': 1,
  'monster-treasure': 1,
  'dragon-ruby': 1.5,
};

/** Crée une collection de trésors indépendante et initialement vide. */
export function createEmptyTreasures(): Treasure[] {
  return [];
}

/** Calcule le score à partir des trésors effectivement possédés. */
export function calculateTreasurePoints(treasures: readonly Treasure[]): number {
  return treasures.reduce((points, treasure) => points + TREASURE_POINTS[treasure], 0);
}
