import { Injectable } from '@angular/core';

import { TileDefinition } from '../models/tile';
import { TILE_DEFINITIONS } from '../data/tile-definitions';
import { createShuffledTileDeck } from '../data/tile-deck';

/**
 * Gère l'état de la pioche de tuiles pendant une partie.
 */
@Injectable({
  providedIn: 'root',
})
export class TileDeckService {
  private deck: string[] = createShuffledTileDeck();

  get remainingTiles(): number {
    return this.deck.length;
  }

  draw(): TileDefinition | undefined {
    const definitionId = this.deck.shift();

    if (!definitionId) {
      return undefined;
    }

    return TILE_DEFINITIONS.find(
      (definition) => definition.id === definitionId,
    );
  }

  reset(): void {
    this.deck = createShuffledTileDeck();
  }
}
