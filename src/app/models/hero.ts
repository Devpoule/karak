import { Direction } from './tile';

/**
 * Identifiants des héros disponibles dans le jeu de base.
 *
 * Ils servent de références stables dans l'état de la partie,
 * indépendamment de leur nom affiché ou de leurs assets.
 */
export type HeroId =
  | 'aderyn'
  | 'argentus'
  | 'horan'
  | 'taia'
  | 'victorius'
  | 'xanros';


/**
 * Définition statique d'un héros.
 *
 * Cette structure décrit l'identité et les ressources graphiques
 * du personnage. Elle ne contient aucun état lié à une partie :
 * position, inventaire, état de santé, etc.
 *
 * CHOIX D'IMPLÉMENTATION :
 *
 * chaque pion possède une représentation pour les quatre
 * directions cardinales afin que son orientation sur le plateau
 * reflète directement la direction du héros.
 */
export interface HeroDefinition {
  id: HeroId;
  name: string;

  card: string;

  pawn: Record<Direction, string>;
}
