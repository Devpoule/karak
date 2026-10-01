import { Injectable } from '@angular/core';

import {
  Direction,
  PlacedTile,
  TileDefinition,
  getOppositeDirection,
  hasOpening,
} from '../models/tile';
import { DungeonService } from './dungeon.service';
import { TileDeckService } from './tile-deck.service';

export interface PendingTilePlacement {
  sourceTile: PlacedTile;
  direction: Direction;
  definition: TileDefinition;
  rotation: number;
}

/**
 * Gère une exploration depuis son déclenchement
 * jusqu'au placement définitif de la tuile piochée.
 */
@Injectable({
  providedIn: 'root',
})
export class ExplorationService {
  pendingTile: PendingTilePlacement | null = null;

  constructor(
    private readonly dungeonService: DungeonService,
    private readonly tileDeckService: TileDeckService,
  ) {}

  canExplore(
    tile: PlacedTile,
    direction: Direction,
  ): boolean {
    const neighbor = this.dungeonService.getNeighbor(tile, direction);

    return (
      !neighbor &&
      this.dungeonService.hasTileOpening(tile, direction)
    );
  }

  start(
    tile: PlacedTile,
    direction: Direction,
  ): void {
    if (!this.canExplore(tile, direction) || this.pendingTile) {
      return;
    }

    const definition = this.tileDeckService.draw();

    if (!definition) {
      return;
    }

    this.pendingTile = {
      sourceTile: tile,
      direction,
      definition,
      rotation: 0,
    };
  }

  getPendingTilePosition(): { x: number; y: number } | null {
    if (!this.pendingTile) {
      return null;
    }

    return this.dungeonService.getNeighborPosition(
      this.pendingTile.sourceTile,
      this.pendingTile.direction,
    );
  }

  rotatePendingTile(): void {
    if (!this.pendingTile) {
      return;
    }

    this.pendingTile.rotation =
      (this.pendingTile.rotation + 90) % 360;
  }

  /**
   * RÈGLE OFFICIELLE KARAK :
   * la nouvelle tuile doit permettre l'entrée depuis la tuile source.
   * Ses autres côtés peuvent former des impasses.
   *
   * CHOIX D'IMPLÉMENTATION :
   * `direction` indique le sens source → nouvelle tuile.
   * L'ouverture requise sur la nouvelle tuile est donc son opposé.
   */
  isPendingTilePlacementValid(): boolean {
    if (!this.pendingTile) {
      return false;
    }

    const requiredDirection = getOppositeDirection(
      this.pendingTile.direction,
    );

    return hasOpening(
      this.pendingTile.definition.openings,
      this.pendingTile.rotation,
      requiredDirection,
    );
  }

  confirmPlacement(): boolean {
    if (
      !this.pendingTile ||
      !this.isPendingTilePlacementValid()
    ) {
      return false;
    }

    const position = this.getPendingTilePosition();

    if (!position) {
      return false;
    }

    this.dungeonService.placeTile({
      definitionId: this.pendingTile.definition.id,
      x: position.x,
      y: position.y,
      rotation: this.pendingTile.rotation,
    });

    this.pendingTile = null;

    return true;
  }
}
