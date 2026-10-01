import { ASSET_PATHS } from '../constants/asset-paths.constants';
import { TileDefinition } from '../models/tile';

/**
 * Catalogue des tuiles du jeu de base Karak.
 *
 * `openings` décrit toujours les ouvertures visibles sur l'asset
 * dans son orientation originale (rotation 0°).
 *
 * La position, la rotation en jeu et le nombre d'exemplaires
 * appartiennent respectivement au donjon et à la pioche.
 */
export const TILE_DEFINITIONS: TileDefinition[] = [
  // Tuile de départ
  {
    id: 'start',
    image: `${ASSET_PATHS.tiles}/start_tile.jpg`,
    openings: ['north', 'east', 'south', 'west'],
  },

  // Couloirs droits
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

  // Téléporteurs
  // Leur effet sera modélisé séparément de leur géométrie.
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

  // Salles
  {
    id: 'intersection-room',
    image: `${ASSET_PATHS.tiles}/intersection_room.jpg`,
    openings: ['north', 'south', 'west'],
  },
  {
    id: 'length-room',
    image: `${ASSET_PATHS.tiles}/length_room.jpg`,
    openings: ['north', 'south'],
  },

  // Couloirs en angle
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
  {
    id: 'corner-room',
    image: `${ASSET_PATHS.tiles}/corner_room.jpg`,
    openings: ['north', 'west'],
  },

  // Fontaine de guérison
  // Son effet de soin sera modélisé séparément de sa géométrie.
  {
    id: 'healing-corner',
    image: `${ASSET_PATHS.tiles}/healing_corner.jpg`,
    openings: ['west', 'south'],
  },

  // Intersections en T
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

  // Quatre ouvertures
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
