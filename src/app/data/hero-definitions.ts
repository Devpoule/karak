
import {
  HeroDefinition,
  HeroId,
  HeroPowerDefinition,
  HeroPowerId,
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
 * Catalogue des pouvoirs spéciaux du jeu de base.
 *
 * Les descriptions reprennent les règles du livret.
 * L'application effective appartient aux services métier.
 */
export const HERO_POWER_DEFINITIONS: Readonly<
  Record<HeroPowerId, HeroPowerDefinition>
> = {
  'backstab': {
    id: 'backstab',
    name: 'Attaque par l’arrière',
    description:
      'Aderyn remporte un combat même lorsque sa force d’attaque est égale à celle du monstre.',
  },
  'sneak': {
    id: 'sneak',
    name: 'Marche rampante',
    description:
      'Aderyn peut traverser les tuiles occupées par des monstres sans les combattre.',
  },
  'magic-affinity': {
    id: 'magic-affinity',
    name: 'Affinité magique',
    description:
      'Argentus conserve les tirs magiques utilisés pendant les combats.',
  },
  'astral-walk': {
    id: 'astral-walk',
    name: 'Marche astrale',
    description:
      'Argentus peut se déplacer entre deux tuiles voisines déjà explorées, même sans couloir reliant ces tuiles.',
  },
  'double-attack': {
    id: 'double-attack',
    name: 'Double attaque',
    description:
      'Horan peut relancer les deux dés une fois par combat s’il n’est pas satisfait de son premier résultat. Le second résultat est définitif.',
  },
  'reincarnation': {
    id: 'reincarnation',
    name: 'Réincarnation',
    description:
      'Si Horan perd sa dernière vie lors d’un combat, il rejoint une tuile avec une fontaine curative et guérit complètement.',
  },
  'premonition': {
    id: 'premonition',
    name: 'Prémonition',
    description:
      'Taia reçoit +1 à sa force d’attaque lorsqu’elle combat après son premier déplacement du tour.',
  },
  'fate-weaver': {
    id: 'fate-weaver',
    name: 'Tisseuse de destin',
    description:
      'Lorsqu’elle découvre une nouvelle pièce, Taia pioche deux jetons et choisit celui qui sera placé sur la tuile. L’autre retourne dans le sachet.',
  },
  'combat-training': {
    id: 'combat-training',
    name: 'Entraînement au combat',
    description:
      'Victorius peut relancer un dé ayant obtenu 1. Les autres résultats ne peuvent pas être relancés.',
  },
  'unstoppable': {
    id: 'unstoppable',
    name: 'Inarrêtable',
    description:
      'Si Victorius obtient un 6 sur un dé pendant un combat, il peut poursuivre son tour après le combat, même en cas de défaite ou d’égalité, dans la limite de quatre déplacements.',
  },
  'sacrifice': {
    id: 'sacrifice',
    name: 'Sacrifice',
    description:
      'Xanros peut sacrifier une vie pour ajouter +1 à sa force d’attaque après le lancer des dés, une seule fois par combat.',
  },
  'substitution': {
    id: 'substitution',
    name: 'Substitution',
    description:
      'Xanros peut utiliser ses quatre déplacements pour échanger sa position avec celle d’un autre héros. Il décide de le faire au début de son tour.',
  },
};

/**
 * Association des deux pouvoirs à chaque héros.
 *
 * L'ordre correspond à celui des pouvoirs du livret.
 */
const HERO_POWERS: Readonly<
  Record<HeroId, readonly [HeroPowerId, HeroPowerId]>
> = {
  aderyn: ['backstab', 'sneak'],
  argentus: ['magic-affinity', 'astral-walk'],
  horan: ['double-attack', 'reincarnation'],
  taia: ['premonition', 'fate-weaver'],
  victorius: ['combat-training', 'unstoppable'],
  xanros: ['sacrifice', 'substitution'],
};

/**
 * Construit la définition graphique et fonctionnelle
 * d'un héros.
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
  const [firstPower, secondPower] = HERO_POWERS[id];

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

    powers: [
      HERO_POWER_DEFINITIONS[firstPower],
      HERO_POWER_DEFINITIONS[secondPower],
    ],
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

/**
 * Recherche la définition statique d'un pouvoir.
 */
export function getHeroPowerDefinition(
  powerId: HeroPowerId,
): HeroPowerDefinition {
  return HERO_POWER_DEFINITIONS[powerId];
}
