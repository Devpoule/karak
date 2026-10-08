import {
  HeroDefinition,
  HeroId,
} from '../models/hero';

/**
 * Répertoire commun des ressources graphiques des héros.
 */
const HERO_ASSETS_PATH = '/assets/heroes';


/**
 * Dos commun à toutes les cartes Héros.
 */
export const HERO_CARD_BACK =
  `${HERO_ASSETS_PATH}/card-back.png`;


/**
 * Variante transparente du dos de carte.
 */
export const HERO_CARD_BACK_TRANSPARENT =
  `${HERO_ASSETS_PATH}/card-back-transparent.png`;


/**
 * Construit la définition graphique d'un héros.
 *
 * CONVENTION :
 *
 * assets/heroes/{heroId}/{nom-du-fichier}.png
 *
 * Tous les héros utilisent les mêmes noms de fichiers.
 */
function createHeroDefinition(
  id: HeroId,
  name: string,
): HeroDefinition {
  const path = `${HERO_ASSETS_PATH}/${id}`;

  return {
    id,
    name,

    /**
     * La carte du tirage correspond à l'illustration
     * complète du personnage.
     */
    card: `${path}/character.png`,

    character: `${path}/character.png`,

    characterTransparent:
      `${path}/character-transparent.png`,

    characterStats:
      `${path}/character-stats.png`,

    pawn: {
      north: `${path}/sprite-north.png`,
      east: `${path}/sprite-east.png`,
      south: `${path}/sprite-south.png`,
      west: `${path}/sprite-west.png`,
    },
  };
}


/**
 * Catalogue des héros disponibles dans le jeu de base.
 *
 * L'ordre des héros est conservé.
 *
 * Les définitions contiennent uniquement des données
 * statiques : aucune information propre à une partie.
 */
export const HERO_DEFINITIONS: readonly HeroDefinition[] = [
  createHeroDefinition('aderyn', 'Aderyn'),
  createHeroDefinition('argentus', 'Argentus'),
  createHeroDefinition('horan', 'Horan'),
  createHeroDefinition('taia', 'Taia'),
  createHeroDefinition('victorius', 'Victorius'),
  createHeroDefinition('xanros', 'Xanros'),
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