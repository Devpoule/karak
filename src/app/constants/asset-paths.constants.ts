/**
 * Chemins racines des ressources statiques de l'application.
 *
 * CHOIX D'IMPLÉMENTATION :
 *
 * les chemins sont centralisés ici afin :
 *
 * - d'éviter leur duplication dans le code ;
 * - de conserver une organisation uniforme des assets ;
 * - de pouvoir modifier leur emplacement depuis un seul endroit.
 *
 * Ces chemins correspondent aux dossiers situés sous :
 *
 * public/assets/
 */
export const ASSET_PATHS = {

  /**
   * Assets graphiques des tuiles du donjon.
   */
  tiles: '/assets/tiles',

  /**
   * Assets liés au plateau et à son environnement visuel.
   */
  board: '/assets/board',

  /**
   * Assets graphiques des héros.
   */
  heroes: '/assets/heroes',

  /**
   * Assets graphiques des monstres.
   */
  monsters: '/assets/monsters',

  /**
   * Assets graphiques des objets et équipements.
   */
  items: '/assets/items',

} as const;
