import { TokenDefinitionId } from './token';

/**
 * Représente les quatre directions utilisées par le moteur
 * pour décrire les ouvertures et les connexions des tuiles.
 *
 * CONVENTION DU MOTEUR :
 *
 *              north
 *                ↑
 *                │
 *       west ← tuile → east
 *                │
 *                ↓
 *              south
 *
 * L'ordre horaire est :
 *
 * north → east → south → west
 *
 * Cet ordre est important car il sert également au calcul
 * des rotations.
 */
export type Direction =
  | 'north'
  | 'east'
  | 'south'
  | 'west';


/**
 * Liste ordonnée des directions du moteur.
 *
 * CHOIX D'IMPLÉMENTATION :
 *
 * l'ordre suit le sens horaire afin qu'un déplacement dans
 * cette liste corresponde directement à une rotation de 90°.
 *
 * Exemple :
 *
 * north + 90°  → east
 * east  + 90°  → south
 * south + 90°  → west
 * west  + 90°  → north
 */
export const DIRECTIONS: Direction[] = [
  'north',
  'east',
  'south',
  'west',
];


// ==========================================================
// NATURE DES TUILES
// ==========================================================

/**
 * Nature structurelle d'une tuile.
 *
 * Cette propriété décrit le type de secteur représenté
 * par la tuile indépendamment de ses éventuelles
 * particularités de gameplay.
 *
 * start
 *   → tuile de départ du donjon ;
 *
 * corridor
 *   → couloir dans lequel le héros peut circuler ;
 *
 * room
 *   → pièce dont la découverte provoquera ultérieurement
 *     le tirage d'un jeton monstres/trésors.
 *
 * IMPORTANT :
 *
 * Un portail ou une fontaine ne constitue pas une nature
 * différente de tuile.
 *
 * Il s'agit d'une particularité portée par un couloir.
 * Ces éléments sont donc décrits séparément par TileFeature.
 */
export type TileKind =
  | 'start'
  | 'corridor'
  | 'room';


/**
 * Particularité éventuelle présente sur une tuile.
 *
 * Une feature complète la nature structurelle de la tuile
 * sans la remplacer.
 *
 * Exemple :
 *
 * un portail est représenté par :
 *
 * kind: 'corridor'
 * feature: 'portal'
 *
 * Cela permet de conserver la distinction entre :
 *
 * - la structure du secteur ;
 * - l'effet particulier qu'il contient.
 *
 * Les règles associées à ces features seront implémentées
 * séparément lorsque leur étape sera atteinte dans le manuel.
 */
export type TileFeature =
  | 'portal'
  | 'healing-fountain';


// ==========================================================
// MODÈLES DES TUILES
// ==========================================================

/**
 * Décrit les propriétés intrinsèques d'un type de tuile.
 *
 * Une TileDefinition décrit ce qu'est une tuile,
 * indépendamment de son utilisation dans une partie.
 *
 * Elle ne contient donc ni coordonnées ni rotation de placement.
 */
export interface TileDefinition {

  /**
   * Identifiant unique du type de tuile.
   *
   * Exemple :
   * 'start'
   * 'length-01'
   * 'corner-room'
   */
  id: string;

  /**
   * Chemin vers l'asset graphique représentant la tuile.
   */
  image: string;

  /**
   * Nature structurelle de la tuile.
   *
   * Cette information permettra notamment de distinguer
   * les couloirs des pièces lors de l'exploration.
   */
  kind: TileKind;

  /**
   * Particularité éventuelle présente sur la tuile.
   *
   * Exemple :
   *
   * 'portal'
   * 'healing-fountain'
   *
   * L'absence de valeur signifie que la tuile ne possède
   * aucune feature particulière actuellement modélisée.
   */
  feature?: TileFeature;

  /**
   * Ouvertures présentes sur l'asset dans son orientation
   * originale, c'est-à-dire avec une rotation de 0°.
   *
   * IMPORTANT :
   *
   * cette liste n'est pas modifiée lorsqu'une occurrence de
   * la tuile est tournée sur le plateau.
   *
   * Les ouvertures réellement orientées sont calculées à partir
   * de cette valeur et de la rotation du PlacedTile.
   */
  openings: Direction[];
}


/**
 * Représente une occurrence d'une tuile effectivement placée
 * dans le donjon.
 *
 * TileDefinition
 *   → décrit ce qu'est la tuile.
 *
 * PlacedTile
 *   → décrit où et comment elle est placée ainsi que son état
 *     dynamique pendant la partie.
 *
 * CONVENTION DU MOTEUR :
 *
 *              y - 1
 *                ↑
 *                │
 *       x - 1 ← (x,y) → x + 1
 *                │
 *                ↓
 *              y + 1
 *
 * x augmente vers l'est.
 * y augmente vers le sud.
 */
export interface PlacedTile {

  /**
   * Identifiant de la TileDefinition utilisée.
   *
   * Cela évite de recopier toutes les propriétés de la
   * définition dans chaque tuile placée.
   */
  definitionId: string;

  /**
   * Coordonnée horizontale dans le donjon.
   */
  x: number;

  /**
   * Coordonnée verticale dans le donjon.
   */
  y: number;

  /**
   * Rotation horaire appliquée à l'orientation originale.
   *
   * Le moteur utilise actuellement :
   *
   * 0° → 90° → 180° → 270°
   */
  rotation: number;

  /**
   * Jeton actuellement présent sur cette tuile.
   *
   * undefined
   *   → aucun jeton n'est présent.
   *
   * Un identifiant est stocké plutôt qu'une TokenDefinition
   * complète afin de conserver les données statiques dans
   * TOKEN_DEFINITIONS.
   *
   * Cette propriété représente l'état dynamique du donjon :
   * un jeton pourra apparaître, rester sur place ou être
   * retiré au cours de la partie.
   */
  tokenId?: TokenDefinitionId;
}

// ==========================================================
// ROTATION DES DIRECTIONS
// ==========================================================

/**
 * Applique une rotation horaire à une direction.
 *
 * CHOIX D'IMPLÉMENTATION :
 *
 * DIRECTIONS étant ordonné dans le sens horaire,
 * chaque quart de tour correspond à un déplacement
 * d'une position dans le tableau.
 *
 * Exemple :
 *
 * rotateDirection('north', 90)
 * → 'east'
 *
 * rotateDirection('north', 180)
 * → 'south'
 */
export function rotateDirection(
  direction: Direction,
  rotation: number,
): Direction {
  const currentIndex = DIRECTIONS.indexOf(direction);
  const quarterTurns = rotation / 90;

  const newIndex =
    (currentIndex + quarterTurns) % DIRECTIONS.length;

  return DIRECTIONS[newIndex];
}


/**
 * Calcule les ouvertures réelles d'une tuile après rotation.
 *
 * Les ouvertures originales de TileDefinition restent intactes.
 * Une nouvelle liste est produite pour l'orientation demandée.
 *
 * Exemple :
 *
 * openings = ['north', 'south']
 * rotation = 90
 *
 * résultat = ['east', 'west']
 */
export function getRotatedOpenings(
  openings: Direction[],
  rotation: number,
): Direction[] {
  return openings.map(
    (direction) => rotateDirection(direction, rotation),
  );
}


/**
 * Vérifie si une tuile possède une ouverture dans une direction
 * donnée après application de sa rotation.
 *
 * Exemple :
 *
 * openings = ['north']
 * rotation = 90
 * direction = 'east'
 *
 * → true
 */
export function hasOpening(
  openings: Direction[],
  rotation: number,
  direction: Direction,
): boolean {
  return getRotatedOpenings(
    openings,
    rotation,
  ).includes(direction);
}


// ==========================================================
// DIRECTIONS OPPOSÉES
// ==========================================================

/**
 * Retourne la direction opposée.
 *
 * north ↔ south
 * east  ↔ west
 *
 * Cette opération est notamment nécessaire pour vérifier
 * les connexions entre deux tuiles voisines.
 */
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


// ==========================================================
// CONNEXION ENTRE DEUX TUILES
// ==========================================================

/**
 * Vérifie si un passage géométrique relie deux tuiles voisines.
 *
 * `direction` représente la position de la seconde tuile
 * par rapport à la première.
 *
 * Exemple :
 *
 * direction = east
 *
 *       EAST                 WEST
 *        ──────── passage ────────
 *   [ première ]          [ seconde ]
 *
 * Pour que les deux tuiles communiquent :
 *
 * - la première doit être ouverte vers east ;
 * - la seconde doit être ouverte vers west.
 *
 * Les rotations respectives des deux tuiles sont prises
 * en compte avant d'effectuer cette vérification.
 *
 * IMPORTANT :
 *
 * cette fonction vérifie uniquement une connexion géométrique.
 * Elle ne décide pas si un héros a le droit d'effectuer
 * un déplacement dans le contexte d'un tour de jeu.
 */
export function areConnected(
  firstOpenings: Direction[],
  firstRotation: number,
  secondOpenings: Direction[],
  secondRotation: number,
  direction: Direction,
): boolean {
  return (
    hasOpening(
      firstOpenings,
      firstRotation,
      direction,
    ) &&
    hasOpening(
      secondOpenings,
      secondRotation,
      getOppositeDirection(direction),
    )
  );
}
