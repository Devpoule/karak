import { ASSET_PATHS } from '../constants/asset-paths.constants';
import { TileDefinition } from '../models/tile';


/**
 * Construit une définition de tuile à partir de ses propriétés.
 *
 * CONVENTION DES ASSETS :
 *
 * L'identifiant d'une tuile correspond exactement au nom
 * de son fichier graphique, sans l'extension.
 *
 * Exemple :
 *
 * id: 'straight-01'
 * → /assets/tiles/straight-01.png
 *
 * CHOIX D'IMPLÉMENTATION :
 *
 * Le chemin de l'image est généré automatiquement afin
 * de garantir la cohérence entre :
 *
 * - l'identifiant utilisé par le moteur ;
 * - le nom du fichier graphique ;
 * - le chemin de l'asset.
 *
 * Cette fonction ne modifie aucune propriété métier.
 * Elle complète uniquement la définition avec son image.
 */
function defineTile(
  definition: Omit<TileDefinition, 'image'>,
): TileDefinition {
  return {
    ...definition,
    image: `${ASSET_PATHS.tiles}/${definition.id}.png`,
  };
}


/**
 * Catalogue des définitions de tuiles du jeu de base Karak.
 *
 * Une TileDefinition décrit les propriétés intrinsèques
 * d'un type de tuile :
 *
 * - son identifiant ;
 * - son asset graphique, généré depuis cet identifiant ;
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
 * CONVENTION DE NOMMAGE
 * ==========================================================
 *
 * Les identifiants utilisent le kebab-case.
 *
 * Exemples :
 *
 * - start
 * - straight-01
 * - corner-room
 * - t-junction-01
 * - crossroads-room
 * - portal-straight-01
 *
 * Chaque identifiant correspond directement à un fichier
 * présent dans public/assets/tiles/.
 *
 * Les chemins ne sont jamais renseignés manuellement
 * dans les définitions.
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
  defineTile({
    id: 'start',
    kind: 'start',
    feature: 'healing-fountain',
    openings: ['north', 'east', 'south', 'west'],
  }),


  // ==========================================================
  // COULOIRS DROITS
  // ==========================================================
  //
  // Orientation originale :
  //
  // west ←────────────→ east
  //

  defineTile({
    id: 'straight-01',
    kind: 'corridor',
    openings: ['east', 'west'],
  }),

  defineTile({
    id: 'straight-02',
    kind: 'corridor',
    openings: ['east', 'west'],
  }),

  defineTile({
    id: 'straight-03',
    kind: 'corridor',
    openings: ['east', 'west'],
  }),

  defineTile({
    id: 'straight-04',
    kind: 'corridor',
    openings: ['east', 'west'],
  }),


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

  defineTile({
    id: 'portal-straight-01',
    kind: 'corridor',
    feature: 'portal',
    openings: ['east', 'west'],
  }),

  defineTile({
    id: 'portal-straight-02',
    kind: 'corridor',
    feature: 'portal',
    openings: ['east', 'west'],
  }),

  defineTile({
    id: 'portal-straight-03',
    kind: 'corridor',
    feature: 'portal',
    openings: ['east', 'west'],
  }),

  defineTile({
    id: 'portal-straight-04',
    kind: 'corridor',
    feature: 'portal',
    openings: ['east', 'west'],
  }),


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
  defineTile({
    id: 't-junction-room',
    kind: 'room',
    openings: ['north', 'south', 'west'],
  }),


  /*
   * Salle traversante nord / sud.
   */
  defineTile({
    id: 'straight-room',
    kind: 'room',
    openings: ['north', 'south'],
  }),


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

  defineTile({
    id: 'corner-01',
    kind: 'corridor',
    openings: ['east', 'south'],
  }),

  defineTile({
    id: 'corner-02',
    kind: 'corridor',
    openings: ['east', 'south'],
  }),

  defineTile({
    id: 'corner-03',
    kind: 'corridor',
    openings: ['east', 'south'],
  }),

  defineTile({
    id: 'corner-04',
    kind: 'corridor',
    openings: ['east', 'south'],
  }),


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
  defineTile({
    id: 'corner-room',
    kind: 'room',
    openings: ['north', 'west'],
  }),


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

  defineTile({
    id: 'healing-corner',
    kind: 'corridor',
    feature: 'healing-fountain',
    openings: ['west', 'south'],
  }),


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

  defineTile({
    id: 't-junction-01',
    kind: 'corridor',
    openings: ['east', 'south', 'west'],
  }),

  defineTile({
    id: 't-junction-02',
    kind: 'corridor',
    openings: ['east', 'south', 'west'],
  }),

  defineTile({
    id: 't-junction-03',
    kind: 'corridor',
    openings: ['east', 'south', 'west'],
  }),

  defineTile({
    id: 't-junction-04',
    kind: 'corridor',
    openings: ['east', 'south', 'west'],
  }),

  defineTile({
    id: 't-junction-05',
    kind: 'corridor',
    openings: ['east', 'south', 'west'],
  }),


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
  defineTile({
    id: 'crossroads-room',
    kind: 'room',
    openings: ['north', 'east', 'south', 'west'],
  }),


  /*
   * Intersection ordinaire.
   */
  defineTile({
    id: 'crossroads',
    kind: 'corridor',
    openings: ['north', 'east', 'south', 'west'],
  }),
];