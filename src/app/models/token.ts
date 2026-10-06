/**
 * Nature d'un jeton pouvant être tiré depuis le sachet
 * monstres/trésors.
 *
 * Le manuel distingue deux résultats possibles lors de
 * la découverte d'une nouvelle salle :
 *
 * - un monstre ;
 * - un trésor.
 */
export type TokenKind =
  | 'monster'
  | 'treasure';


/**
 * Identifiant unique d'une définition de jeton.
 *
 * Il est volontairement indépendant :
 *
 * - du nom du fichier image ;
 * - de la force éventuelle du monstre ;
 * - du nombre d'exemplaires présents dans le sachet.
 */
export type TokenDefinitionId = string;


/**
 * Décrit les propriétés communes d'un type de jeton.
 *
 * Une TokenDefinition représente ce qu'est le jeton,
 * indépendamment de l'exemplaire physique tiré pendant
 * une partie.
 */
interface BaseTokenDefinition {

  /**
   * Identifiant métier unique.
   *
   * Exemples :
   *
   * 'giant-rat'
   * 'skeleton-mummy'
   * 'closed-chest'
   */
  id: TokenDefinitionId;

  /**
   * Nature du jeton.
   */
  kind: TokenKind;

  /**
   * Chemin vers l'image représentant la face visible
   * lors du tirage depuis le sachet.
   */
  image: string;
}


/**
 * Définition d'un monstre.
 *
 * `strength` correspond à la valeur imprimée sur sa face
 * monstre et utilisée lors du combat.
 *
 * Les équipements présents au verso ne sont volontairement
 * pas encore modélisés : cette règle appartient à l'étape
 * Combat du manuel.
 */
export interface MonsterTokenDefinition
  extends BaseTokenDefinition {

  kind: 'monster';

  /**
   * Force du monstre.
   */
  strength: number;
}


/**
 * Définition d'un trésor tiré directement depuis le sachet.
 *
 * À ce stade, le coffre reste simplement identifié comme
 * un trésor.
 *
 * Les règles concernant :
 *
 * - la clé ;
 * - l'ouverture du coffre ;
 * - sa récupération ;
 * - sa valeur finale ;
 *
 * seront implémentées aux étapes correspondantes du manuel.
 */
export interface TreasureTokenDefinition
  extends BaseTokenDefinition {

  kind: 'treasure';
}


/**
 * Ensemble des types de jetons pouvant être tirés
 * depuis le sachet.
 *
 * Cette union discriminée permet à TypeScript de déterminer
 * automatiquement les propriétés disponibles selon `kind`.
 *
 * Exemple :
 *
 * if (token.kind === 'monster') {
 *   console.log(token.strength);
 * }
 */
export type TokenDefinition =
  | MonsterTokenDefinition
  | TreasureTokenDefinition;
