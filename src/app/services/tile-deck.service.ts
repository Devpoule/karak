import { Injectable } from '@angular/core';

import { TileDefinition } from '../models/tile';
import { TILE_DEFINITIONS } from '../data/tile-definitions';
import { createShuffledTileDeck } from '../data/tile-deck';

/**
 * Gère l'état de la pioche de tuiles pendant une partie.
 *
 * RESPONSABILITÉS :
 *
 * - créer une pioche mélangée au démarrage ;
 * - conserver les tuiles encore disponibles ;
 * - tirer et retirer une tuile de la pioche ;
 * - exposer le nombre de tuiles restantes ;
 * - réinitialiser la pioche.
 *
 * HORS PÉRIMÈTRE :
 *
 * Ce service ne décide pas :
 *
 * - quand un joueur a le droit de piocher ;
 * - où une tuile peut être placée ;
 * - comment elle doit être orientée ;
 * - si son placement est valide.
 *
 * Ces décisions appartiennent notamment à ExplorationService.
 */
@Injectable({
  providedIn: 'root',
})
export class TileDeckService {
  // ==========================================================
  // ÉTAT DE LA PIOCHE
  // ==========================================================

  /**
   * Identifiants des tuiles encore disponibles.
   *
   * CHOIX D'IMPLÉMENTATION :
   *
   * la pioche ne contient pas directement les TileDefinition.
   * Elle conserve uniquement leurs identifiants.
   *
   * Les propriétés complètes des tuiles restent centralisées
   * dans TILE_DEFINITIONS.
   */
  private deck: string[] = [];

  /**
   * Nombre de tuiles encore disponibles dans la pioche.
   */
  get remainingTiles(): number {
    return this.deck.length;
  }

  // ==========================================================
  // PIOCHE
  // ==========================================================

  /**
   * Retire la prochaine tuile de la pioche et retourne
   * sa définition.
   *
   * RÈGLE OFFICIELLE KARAK :
   *
   * les tuiles de catacombes, à l'exception de la tuile
   * de départ, constituent une réserve mélangée dans laquelle
   * une nouvelle tuile est prise lors d'une exploration.
   *
   * CHOIX D'IMPLÉMENTATION :
   *
   * la pioche ayant déjà été mélangée lors de sa création,
   * draw() retire simplement son premier élément.
   *
   * @returns la définition de la tuile tirée,
   * ou undefined lorsque la pioche est vide.
   */
  draw(): TileDefinition | undefined {
    const definitionId = this.deck.shift();

    if (!definitionId) {
      return undefined;
    }

    return TILE_DEFINITIONS.find((definition) => definition.id === definitionId);
  }

  // ==========================================================
  // RÉINITIALISATION
  // ==========================================================

  /**
   * Prépare la pioche pour une nouvelle partie.
   *
   * RÈGLE OFFICIELLE KARAK :
   *
   * les 79 tuiles de catacombes restantes sont mélangées
   * face cachée après la mise en place de la tuile de départ.
   *
   * CHOIX D'IMPLÉMENTATION :
   *
   * createShuffledTileDeck() construit la réserve complète
   * sans la tuile de départ et en mélange immédiatement
   * son contenu.
   */
  initialize(): void {
    this.deck = createShuffledTileDeck();
  }
}
