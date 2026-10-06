import { ASSET_PATHS } from '../constants/asset-paths.constants';
import { TileDefinition } from '../models/tile';


/**
 * Catalogue des définitions de tuiles du jeu de base Karak.
 *
 * Une TileDefinition décrit les propriétés intrinsèques
 * d'un type de tuile :
 *
 * - son identifiant ;
 * - son asset graphique ;
 * - sa nature structurelle ;
 * - son éventuelle particularité ;
 * - ses ouvertures à 0°.
 *
 * ==========================================================
 * GÉOMÉTRIE
 * ==========================================================
 *
 * `openings` correspond toujours aux ouvertures visibles sur
 * l'asset dans son orientation originale, avec une rotation de 0°.
 *
 * Exemple :
 *
 * openings: ['east', 'west']
 *
 * signifie :
 *
 *          ┌───────────┐
 * west  ←──│           │──→ east
 *          └───────────┘
 *
 * La rotation réellement appliquée pendant une partie appartient
 * au PlacedTile et n'est donc jamais enregistrée ici.
 *
 * ==========================================================
 * NATURE ET PARTICULARITÉS
 * ==========================================================
 *
 * `kind` décrit la nature structurelle du secteur :
 *
 * - start
 * - corridor
 * - room
 *
 * `feature` décrit une éventuelle particularité présente
 * sur cette structure :
 *
 * - portal
 * - healing-fountain
 *
 * Exemple :
 *
 * un portail est un couloir possédant la feature `portal`.
 *
 * Cela permet de ne pas mélanger la structure physique
 * d'une tuile avec les règles particulières qu'elle porte.
 *
 * ==========================================================
 * SÉPARATION DES RESPONSABILITÉS
 * ==========================================================
 *
 * TILE_DEFINITIONS
 *   → propriétés intrinsèques des types de tuiles.
 *
 * TILE_DECK_COMPOSITION
 *   → nombre d'exemplaires physiques dans la pioche.
 *
 * DungeonService
 *   → position et rotation des tuiles placées.
 *
 * Services de gameplay
 *   → règles déclenchées par la nature ou les features
 *     d'une tuile.
 */
export const TILE_DEFINITIONS: TileDefinition[] = [

  // ==========================================================
  // TUILE DE DÉPART
  // ==========================================================

  /*
   * La tuile de départ possède une identité propre.
   *
   * Elle comporte également une fontaine d'eau curative.
   *
   * Cette particularité est explicitement représentée afin
   * que les futures règles de guérison puissent traiter
   * uniformément toutes les fontaines du jeu.
   */
  {
    id: 'start',
    image: `${ASSET_PATHS.tiles}/start_tile.jpg`,
    kind: 'start',
    feature: 'healing-fountain',
    openings: ['north', 'east', 'south', 'west'],
  },


  // ==========================================================
  // COULOIRS DROITS
  // ==========================================================
  //
  // Orientation originale :
  //
  // west ←────────────→ east
  //

  {
    id: 'length-01',
    image: `${ASSET_PATHS.tiles}/length_01.jpg`,
    kind: 'corridor',
    openings: ['east', 'west'],
  },
  {
    id: 'length-02',
    image: `${ASSET_PATHS.tiles}/length_02.jpg`,
    kind: 'corridor',
    openings: ['east', 'west'],
  },
  {
    id: 'length-03',
    image: `${ASSET_PATHS.tiles}/length_03.jpg`,
    kind: 'corridor',
    openings: ['east', 'west'],
  },
  {
    id: 'length-04',
    image: `${ASSET_PATHS.tiles}/length_04.jpg`,
    kind: 'corridor',
    openings: ['east', 'west'],
  },


  // ==========================================================
  // COULOIRS AVEC PORTAIL
  // ==========================================================
  //
  // Leur structure reste celle d'un couloir droit.
  //
  // La présence du portail est représentée séparément
  // par la feature `portal`.
  //
  // La règle de déplacement entre portails sera implémentée
  // lorsque cette étape du manuel sera traitée.
  //

  {
    id: 'teleporter-length-01',
    image: `${ASSET_PATHS.tiles}/teleporter_length_01.jpg`,
    kind: 'corridor',
    feature: 'portal',
    openings: ['east', 'west'],
  },
  {
    id: 'teleporter-length-02',
    image: `${ASSET_PATHS.tiles}/teleporter_length_02.jpg`,
    kind: 'corridor',
    feature: 'portal',
    openings: ['east', 'west'],
  },
  {
    id: 'teleporter-length-03',
    image: `${ASSET_PATHS.tiles}/teleporter_length_03.jpg`,
    kind: 'corridor',
    feature: 'portal',
    openings: ['east', 'west'],
  },
  {
    id: 'teleporter-length-04',
    image: `${ASSET_PATHS.tiles}/teleporter_length_04.jpg`,
    kind: 'corridor',
    feature: 'portal',
    openings: ['east', 'west'],
  },


  // ==========================================================
  // SALLES
  // ==========================================================

  /*
   * Salle possédant trois ouvertures dans son orientation
   * originale :
   *
   *             north
   *               ↑
   *               │
   *      west ← [ salle ]
   *               │
   *               ↓
   *             south
   */
  {
    id: 'intersection-room',
    image: `${ASSET_PATHS.tiles}/intersection_room.jpg`,
    kind: 'room',
    openings: ['north', 'south', 'west'],
  },


  /*
   * Salle traversante nord / sud.
   */
  {
    id: 'length-room',
    image: `${ASSET_PATHS.tiles}/length_room.jpg`,
    kind: 'room',
    openings: ['north', 'south'],
  },


  // ==========================================================
  // COULOIRS EN ANGLE
  // ==========================================================
  //
  // Les quatre assets numérotés possèdent la même géométrie
  // logique dans leur orientation originale :
  //
  //              [ tuile ] ──→ east
  //                  │
  //                  ↓
  //                south
  //

  {
    id: 'corner-01',
    image: `${ASSET_PATHS.tiles}/corner_01.jpg`,
    kind: 'corridor',
    openings: ['east', 'south'],
  },
  {
    id: 'corner-02',
    image: `${ASSET_PATHS.tiles}/corner_02.jpg`,
    kind: 'corridor',
    openings: ['east', 'south'],
  },
  {
    id: 'corner-03',
    image: `${ASSET_PATHS.tiles}/corner_03.jpg`,
    kind: 'corridor',
    openings: ['east', 'south'],
  },
  {
    id: 'corner-04',
    image: `${ASSET_PATHS.tiles}/corner_04.jpg`,
    kind: 'corridor',
    openings: ['east', 'south'],
  },


  /*
   * Variante avec salle.
   *
   * Orientation originale :
   *
   *                north
   *                  ↑
   *                  │
   *        west ← [ salle ]
   */
  {
    id: 'corner-room',
    image: `${ASSET_PATHS.tiles}/corner_room.jpg`,
    kind: 'room',
    openings: ['north', 'west'],
  },


  // ==========================================================
  // COULOIR AVEC FONTAINE D'EAU CURATIVE
  // ==========================================================
  //
  // La structure reste celle d'un couloir.
  //
  // La fontaine est représentée par la feature
  // `healing-fountain`.
  //
  // La règle de guérison sera implémentée séparément
  // lorsque cette étape du manuel sera traitée.
  //

  {
    id: 'healing-corner',
    image: `${ASSET_PATHS.tiles}/healing_corner.jpg`,
    kind: 'corridor',
    feature: 'healing-fountain',
    openings: ['west', 'south'],
  },


  // ==========================================================
  // INTERSECTIONS EN T
  // ==========================================================
  //
  // Orientation originale :
  //
  //        west ←────┬────→ east
  //                  │
  //                  ↓
  //                south
  //

  {
    id: 'intersection-01',
    image: `${ASSET_PATHS.tiles}/intersection_01.jpg`,
    kind: 'corridor',
    openings: ['east', 'south', 'west'],
  },
  {
    id: 'intersection-02',
    image: `${ASSET_PATHS.tiles}/intersection_02.jpg`,
    kind: 'corridor',
    openings: ['east', 'south', 'west'],
  },
  {
    id: 'intersection-03',
    image: `${ASSET_PATHS.tiles}/intersection_03.jpg`,
    kind: 'corridor',
    openings: ['east', 'south', 'west'],
  },
  {
    id: 'intersection-04',
    image: `${ASSET_PATHS.tiles}/intersection_04.jpg`,
    kind: 'corridor',
    openings: ['east', 'south', 'west'],
  },
  {
    id: 'intersection-05',
    image: `${ASSET_PATHS.tiles}/intersection_05.jpg`,
    kind: 'corridor',
    openings: ['east', 'south', 'west'],
  },


  // ==========================================================
  // QUATRE OUVERTURES
  // ==========================================================
  //
  // Ces tuiles communiquent avec les quatre directions.
  //
  // Leur géométrie est donc inchangée par une rotation :
  //
  //                north
  //                  ↑
  //                  │
  //        west ← [ tuile ] → east
  //                  │
  //                  ↓
  //                south
  //

  /*
   * Variante avec salle.
   */
  {
    id: 'cross-room',
    image: `${ASSET_PATHS.tiles}/cross_room.jpg`,
    kind: 'room',
    openings: ['north', 'east', 'south', 'west'],
  },

  /*
   * Intersection ordinaire.
   */
  {
    id: 'cross',
    image: `${ASSET_PATHS.tiles}/cross.jpg`,
    kind: 'corridor',
    openings: ['north', 'east', 'south', 'west'],
  },
];
