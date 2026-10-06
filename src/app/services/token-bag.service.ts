import { Injectable, signal } from '@angular/core';

import { TOKEN_BAG_COMPOSITION } from '../data/token-bag';
import { getTokenDefinition } from '../data/token-definitions';
import {
  TokenDefinition,
  TokenDefinitionId,
} from '../models/token';


/**
 * Gère le sachet de jetons monstres/trésors pendant une partie.
 *
 * Responsabilités :
 *
 * - construire le contenu initial du sachet ;
 * - mélanger les jetons ;
 * - tirer un jeton ;
 * - exposer le nombre de jetons restants.
 *
 * Les règles déclenchées après le tirage d'un jeton
 * (combat, ouverture d'un coffre, etc.) n'appartiennent
 * volontairement pas à ce service.
 */
@Injectable({
  providedIn: 'root',
})
export class TokenBagService {

  /**
   * Contenu interne du sachet.
   *
   * Chaque entrée représente un exemplaire physique.
   *
   * Exemple :
   * 8 rats géants produisent 8 occurrences de "giant-rat".
   */
  private bag: TokenDefinitionId[] = [];


  /**
   * Nombre de jetons encore présents dans le sachet.
   */
  readonly remainingTokens = signal(0);


  /**
   * Initialise le sachet avec la composition officielle
   * du jeu de base puis mélange son contenu.
   *
   * Cette méthode doit être appelée au démarrage
   * d'une nouvelle partie.
   */
  initialize(): void {
    const tokens: TokenDefinitionId[] = [];

    for (const entry of TOKEN_BAG_COMPOSITION) {
      /**
       * Vérifie immédiatement que chaque identifiant utilisé
       * dans la composition possède bien une définition.
       *
       * Cela permet de détecter une incohérence entre :
       *
       * - token-bag.ts ;
       * - token-definitions.ts.
       */
      const definition = getTokenDefinition(entry.definitionId);

      if (!definition) {
        throw new Error(
          `Unknown token definition: ${entry.definitionId}`,
        );
      }

      for (let i = 0; i < entry.count; i++) {
        tokens.push(entry.definitionId);
      }
    }

    this.bag = this.shuffle(tokens);
    this.updateRemainingTokens();
  }


  /**
   * Tire un jeton du sachet.
   *
   * Le jeton est définitivement retiré du sachet.
   *
   * Retourne `undefined` si le sachet est vide.
   */
  draw(): TokenDefinition | undefined {
    const definitionId = this.bag.pop();

    if (!definitionId) {
      return undefined;
    }

    this.updateRemainingTokens();

    const definition = getTokenDefinition(definitionId);

    /**
     * Cette situation ne devrait normalement jamais arriver,
     * puisque initialize() valide déjà toutes les définitions.
     */
    if (!definition) {
      throw new Error(
        `Unknown token definition: ${definitionId}`,
      );
    }

    return definition;
  }


  /**
   * Indique si le sachet est vide.
   */
  isEmpty(): boolean {
    return this.bag.length === 0;
  }


  /**
   * Mélange une collection avec l'algorithme
   * de Fisher-Yates.
   *
   * Une copie est utilisée afin de ne jamais modifier
   * directement le tableau reçu.
   */
  private shuffle<T>(items: T[]): T[] {
    const shuffled = [...items];

    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(
        Math.random() * (i + 1),
      );

      [shuffled[i], shuffled[j]] = [
        shuffled[j],
        shuffled[i],
      ];
    }

    return shuffled;
  }


  /**
   * Synchronise le signal public avec le contenu réel
   * du sachet.
   */
  private updateRemainingTokens(): void {
    this.remainingTokens.set(this.bag.length);
  }
}
