import { HeroDefinition, HeroId, HeroPowerDefinition, HeroPowerId } from '../models/hero';

/**
 * Répertoire commun des ressources graphiques des héros.
 */
const HERO_ASSETS_PATH = '/assets/heroes';

/**
 * Dos commun à toutes les cartes Héros.
 */
export const HERO_CARD_BACK = `${HERO_ASSETS_PATH}/card-back.png`;

/**
 * Variante transparente du dos de carte.
 */
export const HERO_CARD_BACK_TRANSPARENT = `${HERO_ASSETS_PATH}/card-back-transparent.png`;

/**
 * Catalogue des pouvoirs spéciaux du jeu de base.
 *
 * Les descriptions reprennent les règles du livret.
 * L'application effective appartient aux services métier.
 */
export const HERO_POWER_DEFINITIONS: Readonly<Record<HeroPowerId, HeroPowerDefinition>> = {
  backstab: {
    id: 'backstab',
    name: 'Attaque par l’arrière',
    summary: 'Vous gagnez le combat même en cas de match nul.',
    description:
      'La voleuse sait attaquer dans l’ombre. Grâce à cette attaque insidieuse, elle remporte le combat avec un monstre même en cas de match nul.',
  },
  sneak: {
    id: 'sneak',
    name: 'Marche rampante',
    summary: 'Vous ne devez pas combattre les monstres et pouvez déplacer librement votre pion à travers les tuiles occupées par des monstres.',
    description: 'La voleuse sait se déplacer dans l’ombre. En entrant sur une tuile monstre, vous pouvez décider si vous voulez combattre contre ce monstre ou si la voleuse restera dans l’ombre sans combattre. De cette façon, elle peut se déplacer malgré les monstres et en découvrir ainsi plus en un seul tour.',
  },
  'magic-affinity': {
    id: 'magic-affinity',
    name: 'Affinité magique',
    summary: 'Vous ne devez pas enlever les jetons de tirs magiques après leur utilisation.',
    description: 'Le magicien sait mieux utiliser les parchemins magiques. Lors d’un combat avec les monstres, rajoutez les tirs magiques à la force d’attaque comme d’habitude, mais vous ne devez pas enlever les jetons du jeu. Vous pouvez continuer à les garder. Attention : L’affinité magique ne concerne pas le tour de magie portail de guérison. Si vous avez le jeton de malédiction, vous devez l’enlever, tout comme les autres héros, après avoir utilisé le tir magique.',
  },
  'astral-walk': {
    id: 'astral-walk',
    name: 'Marche astrale',
    summary: 'Vous pouvez déplacer le pion entre les tuiles voisines sans tenir compte du fait qu’elles soient reliées par un couloir.',
    description:
      'Le magicien sait traverser les murs. Il peut donc se déplacer entre les tuiles voisines au choix horizontalement ou verticalement sans tenir compte du fait qu’elles soient reliées par un couloir. Ce pouvoir ne peut être utilisé que pour se déplacer dans des zones explorées.',
  },
  'double-attack': {
    id: 'double-attack',
    name: 'Double attaque',
    summary: 'Vous pouvez lancer à nouveau les deux dés (une fois par combat).',
    description:
      'Le guerrier est habile dans le combat avec les monstres. Si vous jouez avec le guerrier, vous pouvez à nouveau lancer les deux dés au cours de chaque combat avec un monstre si le résultat de la première lancée ne vous satisfait pas. Le résultat de la deuxième lancée est alors pris en compte.',
  },
  reincarnation: {
    id: 'reincarnation',
    name: 'Réincarnation',
    summary: 'En cas de perte de la dernière vie, déplacez votre héros sur une case avec fontaine d’eau curative pour le soigner complètement.',
    description:
      'Si le guerrier perd sa dernière vie lors d’un combat avec un monstre, il ne s’évanouit pas comme les autres héros, mais se déplace sur l’une des tuiles au choix avec fontaine d’eau curative et guérit complètement.',
  },
  premonition: {
    id: 'premonition',
    name: 'Prémonition',
    summary: 'Si vous combattez tout de suite après votre premier déplacement, vous ajoutez +1 à votre force d’attaque.',
    description:
      'La prophétesse a une vue parfaite des ennemis qui l’entourent. Si son premier déplacement pendant un tour entraîne un combat, sa force d’attaque augmente de +1.',
  },
  'fate-weaver': {
    id: 'fate-weaver',
    name: 'Tisseuse de destin',
    summary: 'Lors de la découverte d’une pièce, vous pouvez choisir parmi les deux jetons tirés de monstres/trésors.',
    description:
      'La prophétesse voit les divers avenirs possibles qui peuvent survenir et sait les influencer. À chaque fois que vous découvrez une nouvelle pièce, piochez deux jetons du sachet avec les jetons des monstres et des trésors. Posez un jeton choisi sur la tuile de la pièce découverte comme d’habitude, remettez le deuxième dans le sachet.',
  },
  'combat-training': {
    id: 'combat-training',
    name: 'Entraînement au combat',
    summary: 'Peut relancer une fois chaque dé affichant 1 pendant un combat.',
    description:
      'Le spadassin est un combattant expérimenté dont les attaques sont toujours menées avec précision. Si vous avez le chiffre 1 sur un de vos dés, vous pouvez toujours répéter la lancée. En d’autres termes – vous n’aurez jamais 1 sur le dé.',
  },
  unstoppable: {
    id: 'unstoppable',
    name: 'Inarrêtable',
    summary: 'Avec un 6 au combat, peut poursuivre son tour après la résolution, dans la limite des mouvements restants.',
    description:
      'Si pendant un combat le spadassin a un six sur un dé, il peut continuer son tour, et ce même si vous avez perdu le combat ou si son résultat s’est soldé par un match nul. Vous pouvez donc à nouveau combattre ou continuer votre déplacement (mais la limite de quatre déplacements s’applique même dans ce cas).',
  },
  sacrifice: {
    id: 'sacrifice',
    name: 'Sacrifice',
    summary: 'Vous pouvez ajouter +1 à votre force d’attaque au prix d’une vie.',
    description:
      'Le prince noir peut sacrifier une vie pour rajouter +1 à sa force d’attaque. Il ne peut utiliser ce pouvoir, de même que pour les tours de magie, qu’après la lancée du dé. Mais il ne peut utiliser qu’une seule fois le sacrifice dans un combat. Il est possible d’utiliser le sacrifi ce même s’il reste une seule vie au héros, mais ensuite selon les règles habituelles, il perd connaissance.',
  },
  substitution: {
    id: 'substitution',
    name: 'Substitution',
    summary: 'À la place de l’ensemble des quatre déplacements, vous pouvez changer votre position avec le pion d’un autre héros.',
    description:
      'Le prince noir peut changer sa position sur le plan de jeu avec n’importe lequel des autres héros. Le prince noir utilise tous ses 4 déplacements pour activer le pouvoir, mais il doit décider de faire la substitution au début de son tour. Il peut réaliser une action (par exemple se soigner, ramasser une arme sur la tuile en question ou ouvrir un coffre) sur la tuile sur laquelle il se trouve après la substitution.',
  },
};

/**
 * Association des deux pouvoirs à chaque héros.
 *
 * L'ordre correspond à celui des pouvoirs du livret.
 */
const HERO_POWERS: Readonly<Record<HeroId, readonly [HeroPowerId, HeroPowerId]>> = {
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
  identityColor: string,
  nickname: string,
  description: string,
): HeroDefinition {
  const path = `${HERO_ASSETS_PATH}/${id}`;
  const [firstPower, secondPower] = HERO_POWERS[id];

  return {
    id,
    origin: 'base',
    name,
    identityColor,
    nickname,
    description,

    /**
     * La carte du tirage correspond à l'illustration
     * complète du personnage.
     */
    card: `${path}/character.png`,

    character: `${path}/character.png`,

    characterTransparent: `${path}/character-transparent.png`,

    characterStats: `${path}/character-stats.png`,

    pawn: {
      north: `${path}/sprite-north.png`,
      east: `${path}/sprite-east.png`,
      south: `${path}/sprite-south.png`,
      west: `${path}/sprite-west.png`,
    },

    powers: [HERO_POWER_DEFINITIONS[firstPower], HERO_POWER_DEFINITIONS[secondPower]],
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
  createHeroDefinition(
    'aderyn',
    'Aderyn',
    '#43A65C',
    'la voleuse',
    'Avant qu’Aderyn ait appris l’art répréhensible du vol, elle avait profité de tous les avantages de sa noble origine. Mais son père, gouverneur juste et sage du Royaume insulaire, est tombé dans une des dernières batailles avec les hordes barbares venues de l’Est. Aderyn a pu fuir du château de son père grâce au sacrifice de son garde fidèle, mais est peu après devenue captive d’une bande de voleurs qui se cachaient dans les forêts. Leur chef a toutefois eu pitié de la princesse rousse et a refusé de la remettre aux Gens de l’Est. Il lui a plutôt appris comment survivre dans ce monde violent. Avec ses dons nouvellement acquis, Aderyn sent une opportunité de venger son père, mais elle a besoin pour son plan d’une goutte de sang de dragon et de beaucoup d’or. Quel hasard, les deux l’attendent dans les sombres souterrains du château de Karak.',
  ),
  createHeroDefinition(
    'argentus',
    'Argentus',
    '#F0F0E8',
    'le magicien blanc',
    'La ville de lumière – demeure antique des magiciens. Cette jadis éblouissante métropole regorgeant de merveilles et de connaissances est devenue le champ de bataille de deux fractions rivales. Tandis que les premiers croient que les magiciens devraient utiliser leurs pouvoirs pour sauver le monde contre le cataclysme à venir, les autres sont d’avis qu’il est temps que les magiciens s’isolent des problèmes du monde et laissent les gens se débrouiller seuls. Le magicien blanc Argentus a découvert que le pouvoir qui menace d’entraîner le cataclysme se trouve dans les profondeurs sous le château de Karak. Trouvera-t-il en lui-même assez de force pour apporter à ses frères une preuve convaincante de la gravité de la menace à venir ? Ou bien ça serait plutôt l’éclat des nombreux trésors du labyrinthe de Karak qui l’impressionnera davantage ?',
  ),
  createHeroDefinition(
    'horan',
    'Horan',
    '#8197A8',
    'le guerrier',
    'Lord Horan est un guerrier redouté dont le nom est devenu depuis longtemps une légende dans l’ensemble du monde connu. C’est un chef né et aucune forteresse ni château ne résiste à ses troupes et machines de guerre. Mais, pendant ses incursions, il a entendu parler d’un endroit que même la plus grande armée ne serait pas en mesure de conquérir. Karak – jadis demeure puissante de chevaliers vertueux, désormais ruine entourée de légendes parlant des monstres rampants dans un labyrinthe de couloirs sous le château. Même le célèbre Horan est guetté par la vieillesse et il sent que c’est sa dernière chance d’entrer dans l’histoire en tant que combattant le plus puissant de tous les temps. Il suffirait pourtant très peu – terrasser l’horrifique Dragon qui garde les immenses richesses de Karak.',
  ),
  createHeroDefinition(
    'taia',
    'Taia',
    '#F2D34F',
    'la prophétesse',
    'Taia a grandi dans l’ombre du château de Karak. Elle a observé les conséquences de l’intoxication qui s’est peu à peu répandue du château dans le foyer de ses ancêtres – des maladies, des puits empoisonnés et des cultures des végétaux mourants. Tout cela à cause du dragon séjournant dans les profondeurs sous le château de Karak. Taia voyait des images de l’avenir dès sa plus tendre enfance. D’abord ces visions la déconcertaient et l’effrayaient, mais, au fil du temps, elle a transformé sa malédiction en avantage. Désormais, elle a plus que jamais besoin de clairvoyance. Elle se rend en effet dans le labyrinthe de Karak pour mettre fin à la souffrance de son peuple. Et même sans son pouvoir, elle sait bien qu’autrement un avenir vraiment sombre attend son peuple.',
  ),
  createHeroDefinition(
    'victorius',
    'Victorius',
    '#E98936',
    'le spadassin',
    'Victorius est un soldat d’élite du Royaume méditerranéen, dont personne dans l’ensemble du monde connu ne peut égaler l’habileté dans le maniement de l’épée. Mais même l’escrimeur le plus habile a une faiblesse – et c’est le cœur. Son amour envers la jeune reine qu’il a promis de protéger est profond et brûlant. Mais pour elle, il n’est rien de plus que la meilleure épée de son armée. Son amour a amené Victorius à un acte désespéré, qui doit montrer à la belle reine la profondeur de ses sentiments. Il est décidé à apporter à sa bien-aimée le célèbre rubis du dragon des profondeurs sous le château de Karak – et ce coûte que coûte !',
  ),
  createHeroDefinition(
    'xanros',
    'Xanros',
    '#9860D2',
    'le prince noir',
    'Lord Xanros a étudié pendant des décennies les secrets les plus mystérieux de la magie. Il a une soif ardente de pouvoir et d’immortalité. Il a découvert dans un grimoire poussiéreux un écrit partiel sur un jadis célèbre château où demeurait un ordre puissant de chevaliers – ce château s’appelait Karak. Mais Xanros a aussi découvert le fait que sous Karak se cachent des couloirs souterrains qui fourmilleraient de monstres épouvantables et dans lesquels les gens habitant près du château n’ont jamais osé rentrer. Il croit que le pouvoir caché dans les profondeurs sous les ruines de Karak pourra lui donner l’immortalité. Lord Xanros fera tout ce qui est possible pour obtenir ce pouvoir – même si cela devait signifier affronter le dragon.',
  ),
];

/**
 * Recherche la définition statique d'un héros.
 */
export function getHeroDefinition(heroId: HeroId): HeroDefinition | undefined {
  return HERO_DEFINITIONS.find((hero) => hero.id === heroId);
}

/** Couleur neutre utilisée uniquement avant le tirage ou pour une donnée invalide. */
export const DEFAULT_HERO_IDENTITY_COLOR = '#d8c39a';

/** Retourne la couleur d'identité du héros sans exposer la structure du catalogue. */
export function getHeroIdentityColor(heroId: HeroId | null | undefined): string {
  return heroId ? getHeroDefinition(heroId)?.identityColor ?? DEFAULT_HERO_IDENTITY_COLOR : DEFAULT_HERO_IDENTITY_COLOR;
}

/**
 * Recherche la définition statique d'un pouvoir.
 */
export function getHeroPowerDefinition(powerId: HeroPowerId): HeroPowerDefinition {
  return HERO_POWER_DEFINITIONS[powerId];
}
