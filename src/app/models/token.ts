
/**
 * Nature d'un jeton tiré depuis le sachet.
 */
export type TokenKind =
  | 'monster'
  | 'treasure';

/**
 * Identifiant métier d'une définition de jeton.
 */
export type TokenDefinitionId = string;

/**
 * Identifiants des équipements pouvant apparaître
 * au verso des monstres.
 */
export type EquipmentRewardId =
  | 'daggers'
  | 'sword'
  | 'axe'
  | 'fire-sword'
  | 'heart'
  | 'skull'
  | 'punch'
  | 'key';

/**
 * Effets particuliers pouvant être associés
 * à une récompense.
 */
export type SpecialRewardId = 'curse';

/**
 * Récompense correspondant à un équipement.
 */
export interface EquipmentReward {
  readonly kind: 'equipment';
  readonly equipmentId: EquipmentRewardId;
}

/**
 * Récompense correspondant à un effet particulier.
 */
export interface SpecialReward {
  readonly kind: 'special';
  readonly effect: SpecialRewardId;
}

/**
 * Récompense correspondant à un trésor.
 */
export interface TreasureReward {
  readonly kind: 'treasure';
  readonly tokenId: 'open-chest' | 'treasure';
}

/**
 * Ensemble des récompenses possibles.
 */
export type MonsterReward =
  | EquipmentReward
  | SpecialReward
  | TreasureReward;

/**
 * Propriétés communes aux définitions de jetons.
 */
interface BaseTokenDefinition {
  readonly id: TokenDefinitionId;
  readonly kind: TokenKind;
  readonly image: string;
}

/**
 * Définition d'un monstre.
 *
 * rewards décrit les éléments associés à son verso.
 * La récupération et les effets seront gérés séparément.
 */
export interface MonsterTokenDefinition
  extends BaseTokenDefinition {

  readonly kind: 'monster';
  /** Nom affiché dans les interactions de combat. */
  readonly name: string;
  readonly strength: number;
  readonly rewards?: readonly MonsterReward[];
}

/**
 * Définition d'un trésor.
 *
 * backTokenId représente l'identifiant de la face
 * visible après retournement du jeton.
 *
 * Exemple :
 * closed-chest -> open-chest
 *
 * Cette propriété ne provoque pas automatiquement
 * le retournement du jeton.
 */
export interface TreasureTokenDefinition
  extends BaseTokenDefinition {

  readonly kind: 'treasure';
  readonly backTokenId?: TokenDefinitionId;
}

/**
 * Union discriminée des jetons.
 */
export type TokenDefinition =
  | MonsterTokenDefinition
  | TreasureTokenDefinition;
