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
 * de la partie. Les étapes internes d'un tour ne doivent pas
 * être ajoutées ici.
 */
export type GamePhase =
  | 'setup'
  | 'playing'
  | 'game-over';

/**
 * Étapes interactives de la préparation d'une partie.
 *
 * Les opérations purement automatiques ne nécessitent pas
 * nécessairement leur propre état d'interface.
 *
 * Le placement des héros sur la tuile Départ est notamment
 * effectué automatiquement entre le tirage des héros
 * et la détermination du premier joueur.
 */
export type SetupStep =
  | 'player-count'
  | 'hero-draw'
  | 'first-player-roll';
