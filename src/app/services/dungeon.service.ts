import { Injectable } from '@angular/core';

import {
  Direction,
  PlacedTile,
  TileDefinition,
  areConnected,
  hasOpening,
} from '../models/tile';
import { TILE_DEFINITIONS } from '../data/tile-definitions';

/**
 * Gère la structure physique du donjon :
 * tuiles placées, voisinage et connexions.
 *
 * Il ne gère pas les règles du joueur, des tours ou de l'exploration.
 */
@Injectable({
  providedIn: 'root',
})
export class DungeonService {
  /**
   * Convention du repère logique :
   *
   *              north
   *                ↑
   * west  ←      (x,y)      →  east
   *                ↓
   *              south
   *
   * x augmente vers l'est et y vers le sud.
   */
  readonly tiles: PlacedTile[] = [
    {
      definitionId: 'start',
      x: 0,
      y: 0,
      rotation: 0,
    },
  ];

  getTileAt(x: number, y: number): PlacedTile | undefined {
    return this.tiles.find(
      (tile) => tile.x === x && tile.y === y,
    );
  }

  getNeighborPosition(
    tile: PlacedTile,
    direction: Direction,
  ): { x: number; y: number } {
    switch (direction) {
      case 'north':
        return { x: tile.x, y: tile.y - 1 };

      case 'east':
        return { x: tile.x + 1, y: tile.y };

      case 'south':
        return { x: tile.x, y: tile.y + 1 };

      case 'west':
        return { x: tile.x - 1, y: tile.y };
    }
  }

  getNeighbor(
    tile: PlacedTile,
    direction: Direction,
  ): PlacedTile | undefined {
    const position = this.getNeighborPosition(tile, direction);

    return this.getTileAt(position.x, position.y);
  }

  getTileDefinition(
    tile: PlacedTile,
  ): TileDefinition | undefined {
    return TILE_DEFINITIONS.find(
      (definition) => definition.id === tile.definitionId,
    );
  }

  hasTileOpening(
    tile: PlacedTile,
    direction: Direction,
  ): boolean {
    const definition = this.getTileDefinition(tile);

    if (!definition) {
      return false;
    }

    return hasOpening(
      definition.openings,
      tile.rotation,
      direction,
    );
  }

  /**
   * Vérifie uniquement la connexion géométrique entre deux tuiles.
   * Les points de mouvement et autres règles du tour sont hors périmètre.
   */
  canMoveTo(
    tile: PlacedTile,
    direction: Direction,
  ): boolean {
    const neighbor = this.getNeighbor(tile, direction);

    if (!neighbor) {
      return false;
    }

    const tileDefinition = this.getTileDefinition(tile);
    const neighborDefinition = this.getTileDefinition(neighbor);

    if (!tileDefinition || !neighborDefinition) {
      return false;
    }

    return areConnected(
      tileDefinition.openings,
      tile.rotation,
      neighborDefinition.openings,
      neighbor.rotation,
      direction,
    );
  }

  /**
   * Ajoute une tuile au donjon sans décider si son placement est autorisé.
   * Cette validation appartient à ExplorationService.
   */
  placeTile(tile: PlacedTile): void {
    this.tiles.push(tile);
  }
}
