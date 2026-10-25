import { describe, expect, it } from 'vitest';
import { DungeonService } from './dungeon.service';
import { ExplorationService } from './exploration.service';
import { TileDeckService } from './tile-deck.service';

describe('ExplorationService invariants', () => {
  function createServices(): { dungeon: DungeonService; deck: TileDeckService; exploration: ExplorationService } {
    const dungeon = new DungeonService();
    const deck = new TileDeckService();
    const exploration = new ExplorationService(dungeon, deck);
    dungeon.initialize();
    // Le contenu déterministe de la pioche permet de tester le contrat sans hasard.
    (deck as unknown as { deck: string[] }).deck = ['straight-01'];
    return { dungeon, deck, exploration };
  }

  it('pioche et révèle une tuile avant le choix de direction', () => {
    const { dungeon, exploration } = createServices();
    const source = dungeon.getTileAt(0, 0)!;

    exploration.start(source);

    expect(exploration.pendingTile?.sourceTile).toBe(source);
    expect(exploration.pendingTile?.direction).toBeNull();
    expect(exploration.getPendingTilePosition()).toBeNull();
    expect(exploration.isPendingTilePlacementValid()).toBe(false);
    expect(dungeon.tiles).toHaveLength(1);

    exploration.changePendingDirection('east');

    expect(exploration.pendingTile?.direction).toBe('east');
    expect(exploration.getPendingTilePosition()).toEqual({ x: 1, y: 0 });
  });

  it('refuse une direction occupée, fermée ou une seconde exploration', () => {
    const { dungeon, exploration } = createServices();
    const source = dungeon.getTileAt(0, 0)!;
    dungeon.placeTile({ definitionId: 'straight-01', x: 1, y: 0, rotation: 0 });

    expect(exploration.canExplore(source, 'east')).toBe(false);
    expect(exploration.canExplore(source, 'north')).toBe(true);
    exploration.start(source);
    exploration.changePendingDirection('north');
    const pending = exploration.pendingTile;
    exploration.start(source);

    expect(exploration.pendingTile).toBe(pending);
    expect(exploration.pendingTile?.direction).toBe('north');
  });

  it('permet de changer de sortie sans repiocher ni perdre la rotation', () => {
    const { dungeon, deck, exploration } = createServices();
    const source = dungeon.getTileAt(0, 0)!;
    exploration.start(source);
    exploration.changePendingDirection('north');
    const remainingAfterDraw = deck.remainingTiles;
    exploration.rotatePendingTile();

    exploration.changePendingDirection('west');

    expect(exploration.pendingTile?.direction).toBe('west');
    expect(exploration.pendingTile?.rotation).toBe(90);
    expect(deck.remainingTiles).toBe(remainingAfterDraw);
  });

  it('refuse une orientation non raccordée puis confirme une orientation valide', () => {
    const { dungeon, exploration } = createServices();
    const source = dungeon.getTileAt(0, 0)!;
    exploration.start(source);
    exploration.changePendingDirection('north');

    expect(exploration.isPendingTilePlacementValid()).toBe(false);
    exploration.rotatePendingTile();
    expect(exploration.isPendingTilePlacementValid()).toBe(true);

    const placed = exploration.confirmPlacement();

    expect(placed).toMatchObject({ definitionId: 'straight-01', x: 0, y: -1, rotation: 90 });
    expect(exploration.pendingTile).toBeNull();
    expect(dungeon.getTileAt(0, -1)).toEqual(placed);
  });

  it('réinitialise une exploration non confirmée sans modifier le donjon', () => {
    const { dungeon, exploration } = createServices();
    exploration.start(dungeon.getTileAt(0, 0)!);

    exploration.initialize();

    expect(exploration.pendingTile).toBeNull();
    expect(dungeon.tiles).toHaveLength(1);
  });

  it('refuse une position devenue occupée avant la confirmation', () => {
    const { dungeon, exploration } = createServices();
    const source = dungeon.getTileAt(0, 0)!;

    exploration.start(source);
    exploration.changePendingDirection('north');
    exploration.rotatePendingTile();
    dungeon.placeTile({ definitionId: 'straight-02', x: 0, y: -1, rotation: 0 });

    expect(exploration.confirmPlacement()).toBeNull();
    expect(exploration.pendingTile).not.toBeNull();
  });
});
