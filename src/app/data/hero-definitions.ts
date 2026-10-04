import { ASSET_PATHS } from '../constants/asset-paths.constants';
import { HeroDefinition, HeroId } from '../models/hero';

/**
 * Dos commun aux cartes Héros.
 *
 * Il est utilisé pendant la préparation de la partie,
 * avant la révélation des héros attribués aux joueurs.
 */
export const HERO_CARD_BACK =
  `${ASSET_PATHS.characters.cards}/hero_card_back.jpg`;

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

    card: `${ASSET_PATHS.characters.cards}/aderyn.jpg`,

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

    card: `${ASSET_PATHS.characters.cards}/argentus.jpg`,

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

    card: `${ASSET_PATHS.characters.cards}/horan.jpg`,

    pawn: {
      north: `${ASSET_PATHS.characters.pawns}/horan_pawn_north.png`,
      east: `${ASSET_PATHS.characters.pawns}/horan_pawn_east.png`,
      south: `${ASSET_PATHS.characters.pawns}/horan_pawn_south.png`,
      west: `${ASSET_PATHS.characters.pawns}/horan_pawn_west.png`,
    },
  },
  {
    id: 'taia',
    name: 'Taia',

    card: `${ASSET_PATHS.characters.cards}/taia.jpg`,

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

    card: `${ASSET_PATHS.characters.cards}/victorius.jpg`,

    pawn: {
      north: `${ASSET_PATHS.characters.pawns}/victorius_pawn_north.png`,
      east: `${ASSET_PATHS.characters.pawns}/victorius_pawn_east.png`,
      south: `${ASSET_PATHS.characters.pawns}/victorius_pawn_south.png`,
      west: `${ASSET_PATHS.characters.pawns}/victorius_pawn_west.png`,
    },
  },
  {
    id: 'xanros',
    name: 'Xanros',

    card: `${ASSET_PATHS.characters.cards}/xanros.jpg`,

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
