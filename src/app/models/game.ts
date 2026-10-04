/**
 * Grandes phases d'une partie de Karak.
 *
 * RÈGLE OFFICIELLE KARAK :
 *
 * une partie commence par sa préparation, se poursuit par
 * l'enchaînement des tours et se termine lorsque le Dragon
 * est vaincu.
 *
 * CHOIX D'IMPLÉMENTATION :
 *
 * ces trois états représentent uniquement le cycle global
 * de la partie. Les étapes internes d'un tour (exploration,
 * combat, résolution d'un objet, etc.) ne doivent pas être
 * ajoutées ici.
 */
export type GamePhase =
  | 'setup'
  | 'playing'
  | 'game-over';

/**
 * Étapes successives de la préparation d'une partie.
 *
 * Elles suivent l'ordre de mise en place du jeu officiel.
 *
 * Les premières opérations sont automatiques :
 *
 * - préparation du donjon ;
 * - préparation de la pioche.
 *
 * Les étapes interactives sont ajoutées progressivement
 * à mesure de leur implémentation.
 */
export type SetupStep =
  | 'player-count'
  | 'hero-draw'
  | 'hero-placement';
