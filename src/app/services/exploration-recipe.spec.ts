import { describe, expect, it } from 'vitest';

import { TILE_DEFINITIONS } from '../data/tile-definitions';
import { DungeonService } from './dungeon.service';
import { ExplorationService } from './exploration.service';
import { TileDeckService } from './tile-deck.service';

describe('Recette 04 - exploration du donjon', () => {
  function createServices(deckIds = ['straight-01']) {
    const dungeon = new DungeonService();
    const deck = new TileDeckService();
    const exploration = new ExplorationService(dungeon, deck);
    dungeon.initialize();
    (deck as unknown as { deck: string[] }).deck = deckIds;
    return { dungeon, deck, exploration };
  }

  it('ne crée aucune tuile pending lorsque la pioche est vide', () => {
    const { dungeon, deck, exploration } = createServices([]);
    const source = dungeon.getTileAt(0, 0)!;

    exploration.start(source);

    expect(deck.remainingTiles).toBe(0);
    expect(exploration.pendingTile).toBeNull();
    expect(dungeon.tiles).toHaveLength(1);
  });

  it('effectue exactement le cycle des quatre rotations sans repiocher', () => {
    const { dungeon, deck, exploration } = createServices();
    const source = dungeon.getTileAt(0, 0)!;
    const remainingBefore = deck.remainingTiles;

    exploration.start(source);
    exploration.changePendingDirection('north');
    exploration.rotatePendingTile();
    expect(exploration.pendingTile?.rotation).toBe(90);
    exploration.rotatePendingTile();
    expect(exploration.pendingTile?.rotation).toBe(180);
    exploration.rotatePendingTile();
    expect(exploration.pendingTile?.rotation).toBe(270);
    exploration.rotatePendingTile();

    expect(exploration.pendingTile?.rotation).toBe(0);
    expect(deck.remainingTiles).toBe(remainingBefore - 1);
  });

  it('conserve la tuile tirée pendant un changement de sortie valide', () => {
    const { dungeon, deck, exploration } = createServices();
    const source = dungeon.getTileAt(0, 0)!;

    exploration.start(source);
    exploration.changePendingDirection('north');
    exploration.rotatePendingTile();
    const pending = exploration.pendingTile;
    exploration.changePendingDirection('west');

    expect(exploration.pendingTile).toBe(pending);
    expect(exploration.pendingTile?.direction).toBe('west');
    expect(exploration.pendingTile?.rotation).toBe(90);
    expect(deck.remainingTiles).toBe(0);
  });

  it('garantit une rotation raccordable pour chaque tuile explorée du catalogue', () => {
    for (const definition of TILE_DEFINITIONS.filter(tile => tile.id !== 'start')) {
      const { dungeon, exploration } = createServices([definition.id]);
      const source = dungeon.getTileAt(0, 0)!;

      exploration.start(source);
      exploration.changePendingDirection('north');

      let validRotationFound = false;
      for (let attempt = 0; attempt < 4; attempt++) {
        if (exploration.isPendingTilePlacementValid()) {
          validRotationFound = true;
          break;
        }
        exploration.rotatePendingTile();
      }

      expect(validRotationFound, definition.id).toBe(true);
    }
  });
});
