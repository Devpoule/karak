import { Direction } from './tile';

/**
 * Identifiants des héros disponibles dans le jeu de base.
 *
 * Ils restent indépendants de l'organisation des assets.
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
 * Les images sont regroupées par rôle graphique.
 * Aucun état de partie n'est stocké ici.
 */
export interface HeroDefinition {
  id: HeroId;
  name: string;

  /**
   * Carte utilisée pendant le tirage des héros.
   */
  card: string;

  /**
   * Illustration principale sans indicateurs de pouvoirs.
   */
  character: string;

  /**
   * Illustration détourée, sans arrière-plan.
   */
  characterTransparent: string;

  /**
   * Illustration enrichie des indicateurs de pouvoirs.
   */
  characterStats: string;

  /**
   * Sprites directionnels du héros sur le plateau.
   *
   * La propriété pawn est conservée pour maintenir
   * la compatibilité avec les composants existants.
   */
  pawn: Record<Direction, string>;
}