import { ASSET_PATHS } from '../constants/asset-paths.constants';
import { TileDefinition } from '../models/tile';


/**
 * Catalogue des définitions de tuiles du jeu de base Karak.
 *
 * Une TileDefinition décrit uniquement les propriétés
 * intrinsèques nécessaires à la représentation géométrique
 * actuelle d'une tuile :
 *
 * - son identifiant ;
 * - son asset graphique ;
 * - ses ouvertures à 0°.
 *
 * CONVENTION DU MOTEUR :
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
 * SÉPARATION DES RESPONSABILITÉS :
 *
 * TILE_DEFINITIONS
 *   → propriétés intrinsèques et géométrie des types de tuiles.
 *
 * TILE_DECK_COMPOSITION
 *   → nombre d'exemplaires physiques dans la pioche.
 *
 * DungeonService
 *   → position et rotation des tuiles placées.
 *
 * Les effets spéciaux tels que les téléporteurs ou les fontaines
 * de guérison seront également modélisés séparément de cette
 * géométrie lorsqu'ils seront implémentés.
 */
export const TILE_DEFINITIONS: TileDefinition[] = [

  // ==========================================================
  // TUILE DE DÉPART
  // ==========================================================

  {
    id: 'start',
    image: `${ASSET_PATHS.tiles}/start_tile.jpg`,
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
    openings: ['east', 'west'],
  },
  {
    id: 'length-02',
    image: `${ASSET_PATHS.tiles}/length_02.jpg`,
    openings: ['east', 'west'],
  },
  {
    id: 'length-03',
    image: `${ASSET_PATHS.tiles}/length_03.jpg`,
    openings: ['east', 'west'],
  },
  {
    id: 'length-04',
    image: `${ASSET_PATHS.tiles}/length_04.jpg`,
    openings: ['east', 'west'],
  },


  // ==========================================================
  // TÉLÉPORTEURS
  // ==========================================================
  //
  // Leur géométrie actuelle est celle d'un couloir droit.
  //
  // IMPORTANT :
  // leur effet de téléportation n'est volontairement pas
  // représenté par TileDefinition. Il sera traité séparément
  // lorsque cette mécanique sera implémentée.
  //

  {
    id: 'teleporter-length-01',
    image: `${ASSET_PATHS.tiles}/teleporter_length_01.jpg`,
    openings: ['east', 'west'],
  },
  {
    id: 'teleporter-length-02',
    image: `${ASSET_PATHS.tiles}/teleporter_length_02.jpg`,
    openings: ['east', 'west'],
  },
  {
    id: 'teleporter-length-03',
    image: `${ASSET_PATHS.tiles}/teleporter_length_03.jpg`,
    openings: ['east', 'west'],
  },
  {
    id: 'teleporter-length-04',
    image: `${ASSET_PATHS.tiles}/teleporter_length_04.jpg`,
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
    openings: ['north', 'south', 'west'],
  },


  /*
   * Salle traversante nord / sud.
   */
  {
    id: 'length-room',
    image: `${ASSET_PATHS.tiles}/length_room.jpg`,
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
    openings: ['east', 'south'],
  },
  {
    id: 'corner-02',
    image: `${ASSET_PATHS.tiles}/corner_02.jpg`,
    openings: ['east', 'south'],
  },
  {
    id: 'corner-03',
    image: `${ASSET_PATHS.tiles}/corner_03.jpg`,
    openings: ['east', 'south'],
  },
  {
    id: 'corner-04',
    image: `${ASSET_PATHS.tiles}/corner_04.jpg`,
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
    openings: ['north', 'west'],
  },


  // ==========================================================
  // FONTAINE DE GUÉRISON
  // ==========================================================
  //
  // TileDefinition ne représente actuellement que sa géométrie.
  //
  // Son effet de soin sera implémenté séparément afin de ne pas
  // mélanger circulation dans le donjon et effets de gameplay.
  //

  {
    id: 'healing-corner',
    image: `${ASSET_PATHS.tiles}/healing_corner.jpg`,
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
    openings: ['east', 'south', 'west'],
  },
  {
    id: 'intersection-02',
    image: `${ASSET_PATHS.tiles}/intersection_02.jpg`,
    openings: ['east', 'south', 'west'],
  },
  {
    id: 'intersection-03',
    image: `${ASSET_PATHS.tiles}/intersection_03.jpg`,
    openings: ['east', 'south', 'west'],
  },
  {
    id: 'intersection-04',
    image: `${ASSET_PATHS.tiles}/intersection_04.jpg`,
    openings: ['east', 'south', 'west'],
  },
  {
    id: 'intersection-05',
    image: `${ASSET_PATHS.tiles}/intersection_05.jpg`,
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

  {
    id: 'cross-room',
    image: `${ASSET_PATHS.tiles}/cross_room.jpg`,
    openings: ['north', 'east', 'south', 'west'],
  },
  {
    id: 'cross',
    image: `${ASSET_PATHS.tiles}/cross.jpg`,
    openings: ['north', 'east', 'south', 'west'],
  },
];
