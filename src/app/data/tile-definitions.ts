import { TileDefinition } from '../models/tile';

/**
 * Catalogue des définitions de tuiles disponibles dans le jeu.
 *
 * Ce tableau décrit les propriétés intrinsèques des tuiles :
 * - leur identifiant ;
 * - leur image ;
 * - leurs ouvertures dans l'orientation originale de l'asset.
 *
 * Il ne représente PAS la pioche d'une partie.
 *
 * Une TileDefinition peut donc être utilisée par une ou plusieurs
 * occurrences de PlacedTile.
 *
 * La gestion du nombre réel d'exemplaires disponibles dans la pioche
 * sera traitée séparément.
 */
export const TILE_DEFINITIONS: TileDefinition[] = [
  /**
   * Tuile de départ.
   *
   * Elle possède une ouverture dans les quatre directions.
   */
  {
    id: 'start',
    image: '/assets/tiles/start_tile.png',
    openings: ['north', 'east', 'south', 'west'],
  },

  /**
   * Variantes graphiques du couloir droit.
   *
   * Dans leur orientation originale (0°), ces assets sont
   * horizontaux : ils communiquent donc vers east et west.
   *
   * Une rotation de 90° les transforme logiquement en couloirs
   * north/south grâce au système de rotation défini dans tile.ts.
   */
  {
    id: 'length-01',
    image: '/assets/tiles/length_01.jpg',
    openings: ['east', 'west'],
  },
  {
    id: 'length-02',
    image: '/assets/tiles/length_02.jpg',
    openings: ['east', 'west'],
  },
  {
    id: 'length-03',
    image: '/assets/tiles/length_03.jpg',
    openings: ['east', 'west'],
  },
  {
    id: 'length-04',
    image: '/assets/tiles/length_04.jpg',
    openings: ['east', 'west'],
  },
];
