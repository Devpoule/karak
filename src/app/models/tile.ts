/**
 * Directions utilisées dans tout le moteur.
 *
 * Convention :
 *
 *              north
 *                ↑
 *       west ← tuile → east
 *                ↓
 *              south
 *
 * L'ordre horaire north → east → south → west
 * est également utilisé pour calculer les rotations.
 */
export type Direction = 'north' | 'east' | 'south' | 'west';

export const DIRECTIONS: Direction[] = [
  'north',
  'east',
  'south',
  'west',
];

/**
 * Décrit les propriétés intrinsèques d'un type de tuile.
 *
 * Les ouvertures correspondent toujours à l'orientation
 * originale de l'asset, avec une rotation de 0°.
 */
export interface TileDefinition {
  id: string;
  image: string;
  openings: Direction[];
}

/**
 * Représente une tuile effectivement placée dans le donjon.
 *
 * Convention des coordonnées :
 * - x augmente vers l'est ;
 * - y augmente vers le sud.
 */
export interface PlacedTile {
  definitionId: string;
  x: number;
  y: number;
  rotation: number;
}

/**
 * Applique une rotation horaire à une direction.
 *
 * Les rotations utilisées sont 0°, 90°, 180° et 270°.
 */
export function rotateDirection(
  direction: Direction,
  rotation: number,
): Direction {
  const directions: Direction[] = [
    'north',
    'east',
    'south',
    'west',
  ];

  const currentIndex = directions.indexOf(direction);
  const quarterTurns = rotation / 90;
  const newIndex = (currentIndex + quarterTurns) % directions.length;

  return directions[newIndex];
}

export function getRotatedOpenings(
  openings: Direction[],
  rotation: number,
): Direction[] {
  return openings.map((direction) =>
    rotateDirection(direction, rotation),
  );
}

export function hasOpening(
  openings: Direction[],
  rotation: number,
  direction: Direction,
): boolean {
  return getRotatedOpenings(openings, rotation).includes(direction);
}

export function getOppositeDirection(
  direction: Direction,
): Direction {
  const opposites: Record<Direction, Direction> = {
    north: 'south',
    east: 'west',
    south: 'north',
    west: 'east',
  };

  return opposites[direction];
}

/**
 * Vérifie qu'un passage relie deux tuiles voisines.
 *
 * `direction` indique la position de la seconde tuile
 * par rapport à la première. Les rotations sont prises en compte.
 */
export function areConnected(
  firstOpenings: Direction[],
  firstRotation: number,
  secondOpenings: Direction[],
  secondRotation: number,
  direction: Direction,
): boolean {
  return (
    hasOpening(firstOpenings, firstRotation, direction) &&
    hasOpening(
      secondOpenings,
      secondRotation,
      getOppositeDirection(direction),
    )
  );
}
