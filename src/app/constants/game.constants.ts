/**
 * Constantes structurelles du jeu de base Karak.
 *
 * Ces valeurs décrivent les règles et la composition générale
 * du jeu. Elles ne représentent aucun état d'une partie en cours.
 *
 * RÈGLE OFFICIELLE KARAK :
 *
 * - 80 tuiles de catacombes au total ;
 * - 1 tuile de départ ;
 * - les 79 autres tuiles constituent la pioche ;
 * - un héros dispose de 4 mouvements pendant son tour.
 *
 * Ces constantes servent de référence aux différentes parties
 * du moteur afin d'éviter de dupliquer ces valeurs.
 */
export const GAME_CONSTANTS = {

  // ==========================================================
  // TUILES
  // ==========================================================

  tiles: {

    /**
     * Nombre total de tuiles du jeu,
     * tuile de départ comprise.
     */
    total: 80,

    /**
     * Nombre de tuiles placées au démarrage.
     */
    start: 1,

    /**
     * Nombre de tuiles constituant la pioche.
     *
     * 80 tuiles - 1 tuile de départ = 79.
     */
    deck: 79,
  },


  // ==========================================================
  // MOUVEMENT
  // ==========================================================

  movement: {

    /**
     * Nombre de mouvements disponibles pour un héros
     * pendant son tour.
     */
    perTurn: 4,
  },

} as const;
