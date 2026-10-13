import { describe, expect, it } from 'vitest';
import { PlacedTile } from '../models/tile';
import { DungeonService } from './dungeon.service';

describe('DungeonService invariants géométriques', () => {
  const start = (): PlacedTile => ({
    definitionId: 'start', x: 0, y: 0, rotation: 0,
  });

  it('initialise une seule tuile de départ au centre', () => {
    const service = new DungeonService();
    service.placeTile({ definitionId: 'straight-01', x: 4, y: 4, rotation: 0 });

    service.initialize();

    expect(service.tiles).toEqual([start()]);
    expect(service.getTileAt(0, 0)).toEqual(start());
    expect(service.getTileAt(4, 4)).toBeUndefined();
  });

  it('calcule les voisins selon le repère logique du donjon', () => {
    const service = new DungeonService();
    const tile = { definitionId: 'start', x: 3, y: -2, rotation: 0 };

    expect(service.getNeighborPosition(tile, 'north')).toEqual({ x: 3, y: -3 });
    expect(service.getNeighborPosition(tile, 'east')).toEqual({ x: 4, y: -2 });
    expect(service.getNeighborPosition(tile, 'south')).toEqual({ x: 3, y: -1 });
    expect(service.getNeighborPosition(tile, 'west')).toEqual({ x: 2, y: -2 });
  });

  it('interprète les ouvertures après rotation et exige deux ouvertures opposées', () => {
    const service = new DungeonService();
    const source = start();
    const neighbor: PlacedTile = { definitionId: 'straight-01', x: 1, y: 0, rotation: 0 };
    service.initialize();
    service.placeTile(neighbor);

    expect(service.hasTileOpening(neighbor, 'east')).toBe(true);
    expect(service.hasTileOpening(neighbor, 'west')).toBe(true);
    expect(service.canMoveTo(source, 'east')).toBe(true);

    neighbor.rotation = 90;
    expect(service.hasTileOpening(neighbor, 'north')).toBe(true);
    expect(service.canMoveTo(source, 'east')).toBe(false);
  });

  it('reste une source physique neutre : le placement est exécuté sans validation métier', () => {
    const service = new DungeonService();
    const tile: PlacedTile = { definitionId: 'straight-01', x: 0, y: 0, rotation: 0 };

    service.placeTile(tile);

    expect(service.tiles).toHaveLength(1);
    expect(service.getTileAt(0, 0)).toBe(tile);
  });
});
