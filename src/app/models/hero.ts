
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
 * Identifiants des pouvoirs spéciaux du jeu de base.
 *
 * Chaque identifiant représente une règle propre à un héros.
 * Leur exécution appartient aux services métier du jeu.
 */
export type HeroPowerId =
  | 'backstab'
  | 'sneak'
  | 'magic-affinity'
  | 'astral-walk'
  | 'double-attack'
  | 'reincarnation'
  | 'premonition'
  | 'fate-weaver'
  | 'combat-training'
  | 'unstoppable'
  | 'sacrifice'
  | 'substitution';

/**
 * Définition statique d'un pouvoir spécial.
 *
 * La description est informative : elle ne constitue pas
 * une implémentation de la règle.
 */
export interface HeroPowerDefinition {
  id: HeroPowerId;
  name: string;
  description: string;
}

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

  /**
   * Les deux pouvoirs spéciaux du héros.
   *
   * Leur disponibilité dépend de l'état du joueur :
   * un héros maudit ne peut utiliser aucun de ses pouvoirs.
   *
   * Les définitions restent inchangées par la malédiction.
   */
  powers: readonly [
    HeroPowerDefinition,
    HeroPowerDefinition,
  ];
}
