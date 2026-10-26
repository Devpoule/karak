import { describe, expect, it } from 'vitest';
import { TUTORIAL_SCENARIO } from '../data/tutorial-scenario';
import { PlacedTile } from '../models/tile';
import { DungeonService } from './dungeon.service';
import { ExplorationService } from './exploration.service';
import { TileDeckService } from './tile-deck.service';
import { TutorialScenarioService } from './tutorial-scenario.service';

function tile(x: number, y: number): PlacedTile {
  return { definitionId: 'start', x, y, rotation: 0 };
}

describe('TutorialScenarioService', () => {
  it('expose les données déterministes sans remplacer les règles de placement', () => {
    const scenario = new TutorialScenarioService();

    expect(scenario.getDefinitionIdForSource(tile(0, 0))).toBe('straight-01');
    expect(scenario.getDefinitionIdForSource(tile(0, 5))).toBe('cross');
    expect(scenario.getDefinitionIdForSource(tile(2, 5))).toBe('cross');
    expect(scenario.getRoomTokenId({ definitionId: 'corner-room', x: 2, y: 5, rotation: 0 }))
      .toBeNull();
    expect(scenario.getRoomTokenId({ definitionId: 'crossroads-room', x: -1, y: 4, rotation: 0 }))
      .toBe('skeleton-swordsman');
  });

  it('réutilise le flux d’exploration sans filtrer les directions légales', () => {
    const dungeon = new DungeonService();
    const deck = new TileDeckService();
    const scenario = new TutorialScenarioService();
    const exploration = new ExplorationService(dungeon, deck, scenario);
    dungeon.initialize();
    deck.initialize();
    const initialDeckSize = deck.remainingTiles;
    const start = dungeon.getTileAt(0, 0)!;

    expect(exploration.canExplore(start, 'east')).toBe(true);
    expect(exploration.canExplore(start, 'south')).toBe(true);
    exploration.start(start);

    expect(exploration.pendingTile?.definition.id).toBe('straight-01');
    expect(deck.remainingTiles).toBe(initialDeckSize);
    exploration.changePendingDirection('south');
    expect(exploration.isPendingTilePlacementValid()).toBe(false);
    exploration.rotatePendingTile();
    expect(exploration.isPendingTilePlacementValid()).toBe(true);
    expect(exploration.confirmPlacement()).toMatchObject({
      x: 0,
      y: 1,
      definitionId: 'straight-01',
      rotation: 90,
    });
  });
});
