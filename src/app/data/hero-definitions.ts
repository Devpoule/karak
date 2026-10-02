import { ASSET_PATHS } from '../constants/asset-paths.constants';
import { HeroDefinition, HeroId } from '../models/hero';


/**
 * Catalogue des héros disponibles dans le jeu de base.
 *
 * Chaque entrée contient uniquement les données statiques
 * nécessaires pour identifier et représenter graphiquement
 * un héros.
 *
 * L'état d'un héros pendant une partie ne doit pas être
 * stocké dans ce catalogue.
 */
export const HERO_DEFINITIONS: readonly HeroDefinition[] = [
  {
    id: 'aderyn',
    name: 'Aderyn',
    pawn: {
      north: `${ASSET_PATHS.characters.pawns}/aderyn_pawn_north.png`,
      east: `${ASSET_PATHS.characters.pawns}/aderyn_pawn_east.png`,
      south: `${ASSET_PATHS.characters.pawns}/aderyn_pawn_south.png`,
      west: `${ASSET_PATHS.characters.pawns}/aderyn_pawn_west.png`,
    },
  },
  {
    id: 'argentus',
    name: 'Argentus',
    pawn: {
      north: `${ASSET_PATHS.characters.pawns}/argentus_pawn_north.png`,
      east: `${ASSET_PATHS.characters.pawns}/argentus_pawn_east.png`,
      south: `${ASSET_PATHS.characters.pawns}/argentus_pawn_south.png`,
      west: `${ASSET_PATHS.characters.pawns}/argentus_pawn_west.png`,
    },
  },
  {
    id: 'horan',
    name: 'Horan',
    pawn: {
      north: `${ASSET_PATHS.characters.pawns}/horan_pawn_front.jpg`,
      east: `${ASSET_PATHS.characters.pawns}/horan_pawn_right.jpg`,
      south: `${ASSET_PATHS.characters.pawns}/horan_pawn_back.jpg`,
      west: `${ASSET_PATHS.characters.pawns}/horan_pawn_left.jpg`,
    },
  },
  {
    id: 'taia',
    name: 'Taia',
    pawn: {
      north: `${ASSET_PATHS.characters.pawns}/taia_pawn_north.png`,
      east: `${ASSET_PATHS.characters.pawns}/taia_pawn_east.png`,
      south: `${ASSET_PATHS.characters.pawns}/taia_pawn_south.png`,
      west: `${ASSET_PATHS.characters.pawns}/taia_pawn_west.png`,
    },
  },
  {
    id: 'victorius',
    name: 'Victorius',
    pawn: {
      north: `${ASSET_PATHS.characters.pawns}/victorius_pawn_front.jpg`,
      east: `${ASSET_PATHS.characters.pawns}/victorius_pawn_right.jpg`,
      south: `${ASSET_PATHS.characters.pawns}/victorius_pawn_back.jpg`,
      west: `${ASSET_PATHS.characters.pawns}/victorius_pawn_left.jpg`,
    },
  },
  {
    id: 'xanros',
    name: 'Xanros',
    pawn: {
      north: `${ASSET_PATHS.characters.pawns}/xanros_pawn_north.png`,
      east: `${ASSET_PATHS.characters.pawns}/xanros_pawn_east.png`,
      south: `${ASSET_PATHS.characters.pawns}/xanros_pawn_south.png`,
      west: `${ASSET_PATHS.characters.pawns}/xanros_pawn_west.png`,
    },
  },
];


/**
 * Recherche la définition statique d'un héros.
 */
export function getHeroDefinition(
  heroId: HeroId,
): HeroDefinition | undefined {
  return HERO_DEFINITIONS.find(
    (hero) => hero.id === heroId,
  );
}
