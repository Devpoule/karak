import { HeroId } from './hero';
import { PlayerInventory } from './inventory';
import { Direction } from './tile';

/**
 * Type de contrôleur associé à un joueur.
 *
 * - human : joueur humain utilisant l'appareil ;
 * - ai    : joueur contrôlé automatiquement par le jeu.
 *
 * CHOIX D'IMPLÉMENTATION :
 *
 * le type de contrôleur appartient au joueur et non au héros.
 * Un même héros peut donc être attribué aussi bien à un humain
 * qu'à une IA.
 */
export type PlayerController =
  | 'human'
  | 'ai';

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
   * Type de contrôleur du joueur.
   *
   * RÈGLE DE SETUP :
   *
   * le joueur 1 est toujours humain.
   *
   * Par défaut, tous les joueurs suivants sont contrôlés
   * par l'IA.
   *
   * Lorsqu'une partie locale à plusieurs humains est choisie,
   * les humains supplémentaires sont attribués dans l'ordre :
   *
   * J1 → J2 → J3 → J4 → J5.
   *
   * Les places restantes sont automatiquement occupées
   * par des joueurs IA.
   */
  controller: PlayerController;

  /**
   * Points de vie actuels du joueur.
   *
   * RÈGLE OFFICIELLE KARAK :
   *
   * chaque joueur commence la partie avec 5 points de vie.
   */
  lives: number;

  /**
   * Inventaire personnel du joueur.
   *
   * Les emplacements existent dès la création du joueur mais
   * commencent vides : aucune arme, aucun sort et aucune clé
   * ne sont attribués au début de partie.
   */
  inventory: PlayerInventory;

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
