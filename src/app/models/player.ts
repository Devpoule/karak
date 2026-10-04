import { HeroId } from './hero';
import { Direction } from './tile';


/**
 * Position d'un joueur dans le donjon.
 *
 * Les coordonnées utilisent le même repère logique que les
 * tuiles placées dans DungeonService.
 *
 * La tuile de départ se trouve en (0, 0).
 */
export interface PlayerPosition {
  x: number;
  y: number;
}


/**
 * État d'un joueur pendant une partie.
 *
 * Le joueur existe dès la préparation de la partie.
 * Son héros et sa position ne sont connus qu'aux étapes
 * suivantes du SETUP.
 */
export interface Player {

  /**
   * Points de vie actuels du joueur.
   *
   * RÈGLE OFFICIELLE KARAK :
   *
   * chaque joueur commence la partie avec 5 points de vie.
   */
  lives: number;

  /**
   * Héros attribué au joueur.
   *
   * Indéfini tant que le tirage des héros n'a pas eu lieu.
   */
  heroId?: HeroId;

  /**
   * Position du héros dans le donjon.
   *
   * Indéfinie tant que son pion n'a pas été placé.
   */
  position?: PlayerPosition;

  /**
   * Orientation graphique du pion.
   *
   * Indéfinie tant que le héros n'a pas été placé.
   */
  facing?: Direction;
}
