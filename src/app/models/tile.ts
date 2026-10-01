/**
 * Représente les quatre directions possibles sur une tuile.
 *
 * Cette convention est utilisée dans tout le moteur :
 *
 *              north
 *                ↑
 *       west ← tuile → east
 *                ↓
 *              south
 *
 * L'ordre north → east → south → west correspond également
 * au sens horaire. Cette propriété est exploitée pour calculer
 * les rotations des ouvertures.
 */
export type Direction = 'north' | 'east' | 'south' | 'west';

/**
 * Liste des quatre directions possibles autour d'une tuile.
 *
 * Cette constante permet de parcourir systématiquement les quatre
 * côtés d'une tuile lorsqu'un algorithme en a besoin.
 *
 * Elle ne définit aucune règle de placement : les règles officielles
 * de Karak restent la source ultime pour déterminer les connexions
 * obligatoires pendant l'exploration.
 *
 * L'ordre suit le sens horaire :
 * north → east → south → west.
 */
export const DIRECTIONS: Direction[] = [
  'north',
  'east',
  'south',
  'west',
];

/**
 * Décrit un type de tuile du jeu.
 *
 * Une TileDefinition représente les propriétés intrinsèques
 * d'une tuile, indépendamment de son utilisation dans une partie.
 *
 * Par exemple :
 * - son identifiant ;
 * - son image ;
 * - ses ouvertures dans l'orientation originale de l'image.
 *
 * Les coordonnées et la rotation n'appartiennent PAS à cette
 * structure puisqu'elles dépendent de la partie en cours.
 */
export interface TileDefinition {
  /**
   * Identifiant unique de la définition.
   *
   * Exemple :
   * 'start'
   * 'length-01'
   */
  id: string;

  /**
   * Chemin vers l'image utilisée pour représenter la tuile.
   */
  image: string;

  /**
   * Ouvertures de la tuile dans son orientation originale,
   * c'est-à-dire avec une rotation de 0°.
   *
   * Important :
   * ces valeurs ne sont jamais modifiées lorsqu'une tuile tourne.
   * Les ouvertures réellement orientées sont calculées à partir
   * de cette valeur et de la rotation du PlacedTile.
   */
  openings: Direction[];
}

/**
 * Représente une occurrence d'une tuile réellement placée
 * sur le plateau pendant une partie.
 *
 * La définition et l'état sont volontairement séparés :
 *
 * TileDefinition
 *   → décrit ce qu'est la tuile.
 *
 * PlacedTile
 *   → décrit où et comment elle est placée.
 */
export interface PlacedTile {
  /**
   * Identifiant de la TileDefinition utilisée.
   *
   * Cela évite de recopier l'image et les ouvertures dans chaque
   * tuile placée sur le plateau.
   */
  definitionId: string;

  /**
   * Coordonnée horizontale dans le repère logique du donjon.
   *
   * x augmente vers l'est :
   *
   * -1    0    1
   *  ←         →
   */
  x: number;

  /**
   * Coordonnée verticale dans le repère logique du donjon.
   *
   * y diminue vers le nord et augmente vers le sud :
   *
   *       -1
   *        ↑
   *        0
   *        ↓
   *        1
   */
  y: number;

  /**
   * Rotation visuelle et logique de la tuile en degrés.
   *
   * Les valeurs utilisées actuellement sont :
   * 0, 90, 180 et 270.
   */
  rotation: number;
}

/**
 * Calcule la direction réelle d'une ouverture après rotation
 * d'une tuile.
 *
 * Les directions sont volontairement rangées dans le sens horaire :
 *
 * north → east → south → west → north
 *
 * Une rotation de 90° représente donc un déplacement d'une position
 * dans ce tableau.
 *
 * Exemple avec north :
 *
 * rotation 0°   → north
 * rotation 90°  → east
 * rotation 180° → south
 * rotation 270° → west
 *
 * Le modulo (%) permet de revenir au début du tableau lorsqu'on
 * dépasse la dernière direction.
 *
 * Exemple :
 *
 * west correspond à l'index 3.
 *
 * west + 90° :
 *   3 + 1 = 4
 *   4 % 4 = 0
 *
 * L'index 0 correspond à north.
 *
 * @param direction Direction dans l'orientation originale.
 * @param rotation Rotation de la tuile en degrés.
 * @returns Direction obtenue après application de la rotation.
 */
export function rotateDirection(
  direction: Direction,
  rotation: number
): Direction {
  const directions: Direction[] = [
    'north',
    'east',
    'south',
    'west',
  ];

  const currentIndex = directions.indexOf(direction);

  // Une rotation de 90° correspond à un quart de tour.
  const quarterTurns = rotation / 90;

  // Le modulo permet de revenir à l'index 0 après 'west'.
  const newIndex =
    (currentIndex + quarterTurns) % directions.length;

  return directions[newIndex];
}

/**
 * Calcule toutes les ouvertures réelles d'une tuile après rotation.
 *
 * La TileDefinition conserve toujours ses ouvertures originales.
 * Cette fonction produit donc une nouvelle liste sans modifier
 * la définition.
 *
 * Exemple :
 *
 * openings = ['east', 'west']
 * rotation = 90
 *
 * donne :
 *
 * ['south', 'north']
 *
 * @param openings Ouvertures originales de la tuile.
 * @param rotation Rotation appliquée à la tuile.
 * @returns Nouvelles directions après rotation.
 */
export function getRotatedOpenings(
  openings: Direction[],
  rotation: number
): Direction[] {
  return openings.map(
    direction => rotateDirection(direction, rotation)
  );
}

/**
 * Indique si une tuile possède réellement une ouverture dans
 * une direction donnée après prise en compte de sa rotation.
 *
 * Cette fonction évite aux autres parties du moteur d'avoir
 * à effectuer elles-mêmes les calculs de rotation.
 *
 * Exemple :
 *
 * openings = ['east', 'west']
 *
 * À 0° :
 * hasOpening(..., 'east')  → true
 * hasOpening(..., 'north') → false
 *
 * À 90° :
 * hasOpening(..., 'east')  → false
 * hasOpening(..., 'north') → true
 *
 * @param openings Ouvertures originales de la définition.
 * @param rotation Rotation actuelle de la tuile.
 * @param direction Direction recherchée.
 */
export function hasOpening(
  openings: Direction[],
  rotation: number,
  direction: Direction
): boolean {
  return getRotatedOpenings(
    openings,
    rotation
  ).includes(direction);
}

/**
 * Retourne la direction opposée.
 *
 * Cette fonction est notamment utilisée lorsqu'on vérifie
 * la connexion entre deux tuiles voisines.
 *
 * Si une tuile A se trouve à l'ouest d'une tuile B :
 *
 *     A → east | west ← B
 *
 * l'ouverture east de A doit correspondre à l'ouverture west de B.
 *
 * @param direction Direction dont on cherche l'opposé.
 */
export function getOppositeDirection(
  direction: Direction
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
 * Vérifie si deux tuiles voisines possèdent un passage commun.
 *
 * `direction` indique où se trouve la seconde tuile par rapport
 * à la première.
 *
 * Exemple :
 *
 * direction = 'east'
 *
 *       east          west
 *        →              ←
 *   ┌────────┐      ┌────────┐
 *   │   A    │      │   B    │
 *   └────────┘      └────────┘
 *
 * Pour que les deux tuiles communiquent :
 *
 * - A doit avoir une ouverture vers east ;
 * - B doit avoir une ouverture vers west.
 *
 * Les rotations des deux tuiles sont prises en compte.
 *
 * @param firstOpenings Ouvertures originales de la première tuile.
 * @param firstRotation Rotation de la première tuile.
 * @param secondOpenings Ouvertures originales de la seconde tuile.
 * @param secondRotation Rotation de la seconde tuile.
 * @param direction Position de la seconde tuile par rapport à la première.
 */
export function areConnected(
  firstOpenings: Direction[],
  firstRotation: number,
  secondOpenings: Direction[],
  secondRotation: number,
  direction: Direction
): boolean {
  return (
    hasOpening(
      firstOpenings,
      firstRotation,
      direction
    ) &&
    hasOpening(
      secondOpenings,
      secondRotation,
      getOppositeDirection(direction)
    )
  );
}

/**
 * Recherche une rotation permettant à une tuile de présenter
 * une ouverture dans une direction donnée.
 *
 * RÈGLE OFFICIELLE KARAK — SOURCE ULTIME :
 * pendant l'exploration, la nouvelle tuile doit permettre au héros
 * d'y entrer depuis la tuile qu'il occupait.
 *
 * Cette fonction ne valide volontairement PAS les trois autres côtés :
 * le livret autorise la nouvelle tuile à former une impasse dans les
 * autres directions.
 *
 * Les quatre orientations possibles sont testées successivement :
 *
 * 0° → 90° → 180° → 270°
 *
 * Exemple :
 *
 * Un couloir possède :
 *
 * ['east', 'west']
 *
 * Si une ouverture vers south est nécessaire :
 *
 * 0°  → east/west   : incompatible
 * 90° → south/north : compatible
 *
 * La fonction retourne alors 90.
 *
 * Si aucune des quatre rotations ne permet d'obtenir l'ouverture
 * demandée, undefined est retourné.
 *
 * Remarque :
 * cette fonction retourne la PREMIÈRE rotation compatible.
 * Elle ne choisit pas aléatoirement entre plusieurs orientations
 * possibles.
 *
 * @param openings Ouvertures originales de la tuile.
 * @param requiredDirection Direction qui doit être ouverte.
 * @returns Rotation compatible ou undefined.
 */
export function findConnectingRotation(
  openings: Direction[],
  requiredDirection: Direction
): number | undefined {
  const rotations = [0, 90, 180, 270];

  return rotations.find(
    rotation =>
      hasOpening(
        openings,
        rotation,
        requiredDirection
      )
  );
}
