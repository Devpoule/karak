import { TileDefinition } from '../models/tile';

/**
 * Catalogue des définitions de tuiles disponibles dans le jeu.
 *
 * RÉFÉRENCE MÉTIER :
 * les règles officielles de Karak constituent la source ultime pour
 * tout comportement du jeu. Ce fichier décrit les données graphiques
 * et géométriques nécessaires au moteur ; il ne doit pas introduire
 * de règle contradictoire avec le livret officiel.
 *
 * Une TileDefinition décrit les propriétés intrinsèques d'un visuel :
 *
 * - son identifiant unique ;
 * - le chemin vers son image ;
 * - ses ouvertures dans l'orientation originale de l'asset (0°).
 *
 * Ce catalogue ne représente PAS le plateau et ne représente PAS
 * non plus la pioche d'une partie.
 *
 * Il répond uniquement à la question :
 *
 *   « Quelles sont les caractéristiques de cette tuile ? »
 *
 * Les informations propres à une partie, telles que :
 *
 * - la position d'une tuile ;
 * - sa rotation ;
 * - sa présence sur le plateau ;
 * - le nombre d'exemplaires encore disponibles dans la pioche ;
 *
 * sont gérées séparément.
 *
 * Cette séparation permet notamment à plusieurs exemplaires d'une
 * même définition de partager les mêmes propriétés sans dupliquer
 * l'image ou la description de leurs ouvertures.
 */
export const TILE_DEFINITIONS: TileDefinition[] = [

  // ---------------------------------------------------------------------------
  // TUILE DE DÉPART
  // ---------------------------------------------------------------------------

  /**
   * Tuile centrale sur laquelle commence la partie.
   *
   * Elle constitue l'origine logique du donjon :
   *
   *   x = 0
   *   y = 0
   *
   * Elle possède une ouverture dans les quatre directions :
   *
   *                 north
   *                   ↑
   *                   │
   *          west ← [ START ] → east
   *                   │
   *                   ↓
   *                 south
   *
   * Les joueurs pourront donc commencer l'exploration dans
   * n'importe laquelle des quatre directions.
   *
   * RÈGLE OFFICIELLE KARAK :
   * cette tuile est placée au centre au début de la partie et les
   * héros y sont installés. Elle n'appartient donc pas à la pioche
   * des autres tuiles de catacombes.
   */
  {
    id: 'start',
    image: '/assets/tiles/start_tile.png',
    openings: ['north', 'east', 'south', 'west'],
  },

  // ---------------------------------------------------------------------------
  // COULOIRS DROITS
  // ---------------------------------------------------------------------------

  /**
   * Première variante graphique du couloir droit.
   *
   * Dans l'orientation originale de l'image (0°), le passage
   * traverse horizontalement la tuile :
   *
   *          west ←────────→ east
   *
   * Une rotation de 90° permettra au moteur d'obtenir :
   *
   *                   north
   *                     ↑
   *                     │
   *                     ↓
   *                   south
   *
   * Son rôle géométrique est donc de prolonger un chemin en ligne
   * droite sans créer de nouvelle branche.
   */
  {
    id: 'length-01',
    image: '/assets/tiles/length_01.jpg',
    openings: ['east', 'west'],
  },

  /**
   * Deuxième variante graphique du couloir droit.
   *
   * Elle possède exactement la même géométrie que length-01 :
   * une ouverture vers l'est et une ouverture vers l'ouest à 0°.
   *
   * L'image différente permet de varier visuellement le donjon
   * sans introduire une nouvelle règle de déplacement.
   */
  {
    id: 'length-02',
    image: '/assets/tiles/length_02.jpg',
    openings: ['east', 'west'],
  },

  /**
   * Troisième variante graphique du couloir droit.
   *
   * Comme les autres tuiles "length", elle prolonge un passage
   * en ligne droite.
   *
   * Orientation originale :
   *
   *          west ←────────→ east
   */
  {
    id: 'length-03',
    image: '/assets/tiles/length_03.jpg',
    openings: ['east', 'west'],
  },

  /**
   * Quatrième variante graphique du couloir droit.
   *
   * Elle partage la même géométrie que length-01, length-02
   * et length-03.
   *
   * La distinction entre ces définitions est donc actuellement
   * essentiellement graphique.
   */
  {
    id: 'length-04',
    image: '/assets/tiles/length_04.jpg',
    openings: ['east', 'west'],
  },

  /**
   * Variantes graphiques d'un couloir droit contenant un téléporteur.
   *
   * Dans l'orientation originale des assets (0°), le passage traverse
   * horizontalement la tuile :
   *
   *          west ←────────────→ east
   *
   * Géométriquement, ces tuiles se comportent donc comme les couloirs
   * droits length-* déjà présents dans le catalogue.
   *
   * La présence du téléporteur constitue une propriété de jeu distincte
   * de la géométrie du couloir. Elle sera modélisée ultérieurement lors
   * de l'implémentation des règles de téléportation.
   *
   * RÈGLES OFFICIELLES KARAK — SOURCE ULTIME :
   * les règles relatives aux téléporteurs devront être implémentées
   * conformément au livret officiel. Le champ openings décrit uniquement
   * les passages visibles sur l'asset original à 0°.
   */
  {
    id: 'teleporter-length-01',
    image: '/assets/tiles/teleporter_length_01.jpg',
    openings: ['east', 'west'],
  },
  {
    id: 'teleporter-length-02',
    image: '/assets/tiles/teleporter_length_02.jpg',
    openings: ['east', 'west'],
  },
  {
    id: 'teleporter-length-03',
    image: '/assets/tiles/teleporter_length_03.jpg',
    openings: ['east', 'west'],
  },
  {
    id: 'teleporter-length-04',
    image: '/assets/tiles/teleporter_length_04.jpg',
    openings: ['east', 'west'],
  },

  // ---------------------------------------------------------------------------
  // SALLES
  // ---------------------------------------------------------------------------

  /**
   * Salle possédant trois ouvertures.
   *
   * Dans l'orientation originale de l'image (0°), elle communique
   * avec :
   *
   * - le nord ;
   * - le sud ;
   * - l'ouest.
   *
   *                 north
   *                   ↑
   *                   │
   *          west ← [ SALLE ]
   *                   │
   *                   ↓
   *                 south
   *
   * Le côté est est fermé.
   *
   * Contrairement à un couloir droit, cette géométrie crée une
   * intersection et permet donc au donjon de se ramifier.
   *
   * Les rotations permettront naturellement d'obtenir les trois
   * autres orientations possibles de cette intersection.
   */
  {
    id: 'intersection-room',
    image: '/assets/tiles/intersection_room.jpg',
    openings: ['north', 'south', 'west'],
  },

  /**
   * Salle traversante possédant deux ouvertures opposées.
   *
   * Dans l'orientation originale de l'image (0°), le passage
   * traverse verticalement la salle :
   *
   *                 north
   *                   ↑
   *                   │
   *               [ SALLE ]
   *                   │
   *                   ↓
   *                 south
   *
   * Géométriquement, son comportement est proche d'un couloir droit.
   * Son orientation originale est cependant verticale, contrairement
   * aux assets length-* qui sont horizontaux.
   *
   * Une rotation de 90° permettra donc de produire une salle
   * traversante orientée est/ouest.
   */
  {
    id: 'length-room',
    image: '/assets/tiles/length_room.jpg',
    openings: ['north', 'south'],
  },

  // ---------------------------------------------------------------------------
  // COULOIRS EN ANGLE
  // ---------------------------------------------------------------------------

  /**
   * Première variante graphique d'un couloir en angle.
   *
   * Dans l'orientation originale de l'image (0°), le passage
   * relie l'est au sud :
   *
   *                   east →
   *                ┌────────
   *                │
   *                │
   *                ↓
   *              south
   *
   * Contrairement au couloir droit, cette tuile permet donc
   * au chemin de changer de direction.
   *
   * Grâce aux rotations, cette même géométrie peut produire :
   *
   * - east  + south ;
   * - south + west ;
   * - west  + north ;
   * - north + east.
   */
  {
    id: 'corner-01',
    image: '/assets/tiles/corner_01.jpg',
    openings: ['east', 'south'],
  },

  /**
   * Deuxième variante graphique du couloir en angle.
   *
   * Elle possède la même géométrie que corner-01 :
   * le passage relie l'est au sud dans l'image originale.
   *
   * Son rôle actuel est donc identique dans le moteur ;
   * seule son apparence graphique diffère.
   */
  {
    id: 'corner-02',
    image: '/assets/tiles/corner_02.jpg',
    openings: ['east', 'south'],
  },

  /**
   * Troisième variante graphique du couloir en angle.
   *
   * Orientation originale :
   *
   *   east + south
   *
   * Elle permet de créer un changement de direction dans le donjon
   * tout en conservant exactement deux ouvertures.
   */
  {
    id: 'corner-03',
    image: '/assets/tiles/corner_03.jpg',
    openings: ['east', 'south'],
  },

  /**
   * Quatrième variante graphique du couloir en angle.
   *
   * Elle partage la même géométrie que les trois variantes
   * précédentes :
   *
   *   east + south à 0°.
   *
   * Les quatre orientations possibles seront calculées par le
   * moteur et non enregistrées séparément dans le catalogue.
   */
  {
    id: 'corner-04',
    image: '/assets/tiles/corner_04.jpg',
    openings: ['east', 'south'],
  },

  // ---------------------------------------------------------------------------
  // TUILES À EFFET PARTICULIER
  // ---------------------------------------------------------------------------

  /**
   * Couloir en angle contenant la zone de soin.
   *
   * Du point de vue GÉOMÉTRIQUE, cette tuile fonctionne actuellement
   * exactement comme les autres tuiles corner :
   *
   *   east + south à 0°.
   *
   *                 east →
   *              ┌────────
   *              │
   *              │
   *              ↓
   *            south
   *
   * RÈGLE OFFICIELLE KARAK :
   * une tuile avec fontaine d'eau curative reste un couloir normal,
   * mais un héros peut y terminer son tour pour se soigner.
   *
   * Cet effet n'est volontairement pas encore représenté dans
   * TileDefinition : ce catalogue ne modélise pour l'instant que
   * la géométrie nécessaire à la circulation.
   *
   * Nous séparons ainsi deux notions :
   *
   *   géométrie
   *       → où le héros peut circuler ;
   *
   *   effet de la tuile
   *       → ce qui se produit lorsqu'un héros interagit avec elle.
   *
   * L'effet de soin sera ajouté ultérieurement lorsque nous
   * implémenterons les règles correspondantes. Il ne doit pas être
   * mélangé prématurément avec le système de connexions du plateau.
   */
  {
    id: 'healing-corner',
    image: '/assets/tiles/healing_corner.jpg',
    openings: ['west', 'south'],
  },

  /**
   * Variantes graphiques d'une intersection en T.
   *
   * Dans l'orientation originale des assets (0°), ces tuiles
   * possèdent trois ouvertures :
   *
   * - east ;
   * - south ;
   * - west.
   *
   * Le côté north est fermé.
   *
   *          west ←────┬────→ east
   *                    │
   *                    ↓
   *                  south
   *
   * Les autres orientations sont obtenues automatiquement par
   * rotation. Les ouvertures décrites ici correspondent toujours
   * au fichier image original à 0°, jamais à son orientation
   * après placement sur le plateau.
   *
   * RÈGLE OFFICIELLE KARAK — SOURCE ULTIME :
   * lors de l'exploration, la nouvelle tuile doit être orientée
   * de façon à permettre au héros d'y entrer depuis la tuile
   * qu'il occupait. Les autres côtés peuvent former des impasses.
   */
  {
    id: 'intersection-01',
    image: '/assets/tiles/intersection_01.jpg',
    openings: ['east', 'south', 'west'],
  },
  {
    id: 'intersection-02',
    image: '/assets/tiles/intersection_02.jpg',
    openings: ['east', 'south', 'west'],
  },
  {
    id: 'intersection-03',
    image: '/assets/tiles/intersection_03.jpg',
    openings: ['east', 'south', 'west'],
  },
  {
    id: 'intersection-04',
    image: '/assets/tiles/intersection_04.jpg',
    openings: ['east', 'south', 'west'],
  },
  {
    id: 'intersection-05',
    image: '/assets/tiles/intersection_05.jpg',
    openings: ['east', 'south', 'west'],
  },

  /**
   * Salle en croix possédant quatre ouvertures.
   *
   * Dans l'orientation originale de l'asset (0°), la salle est
   * accessible depuis les quatre directions.
   *
   *                 north
   *                   ↑
   *                   │
   *          west ← [ SALLE ] → east
   *                   │
   *                   ↓
   *                 south
   *
   * Une rotation de cette tuile ne modifie pas sa géométrie logique :
   * ses quatre côtés restent ouverts.
   *
   * RÈGLE OFFICIELLE KARAK — SOURCE ULTIME :
   * cette définition décrit uniquement la géométrie visible de l'asset.
   * Les comportements de déplacement, d'exploration et les éventuels
   * effets de jeu sont déterminés par les règles officielles.
   */
  {
    id: 'cross-room',
    image: '/assets/tiles/cross_room.jpg',
    openings: ['north', 'east', 'south', 'west'],
  },

  /**
   * Intersection en croix.
   *
   * Contrairement aux intersections en T précédemment ajoutées,
   * aucun côté n'est fermé :
   *
   *                 north
   *                   ↑
   *                   │
   *          west ←───┼───→ east
   *                   │
   *                   ↓
   *                 south
   *
   * Une rotation n'a donc aucun effet sur les connexions logiques
   * de cette tuile.
   */
  {
    id: 'cross',
    image: '/assets/tiles/cross.jpg',
    openings: ['north', 'east', 'south', 'west'],
  },
];
