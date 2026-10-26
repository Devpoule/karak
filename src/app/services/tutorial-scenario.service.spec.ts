import { describe, expect, it } from 'vitest';
import { TILE_DEFINITIONS } from '../data/tile-definitions';
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
  it('décrit chaque pose avec une destination, une tuile et une rotation déterministes', () => {
    const scenario = new TutorialScenarioService();

    for (const placement of TUTORIAL_SCENARIO.placements) {
      const definition = TILE_DEFINITIONS.find(candidate => candidate.id === placement.definitionId)!;
      const source = tile(placement.source.x, placement.source.y);

      expect(scenario.canExplore(source, placement.direction)).toBe(true);
      expect(scenario.isPlacementAllowed(
        source,
        placement.direction,
        definition,
        placement.allowedRotations[0],
        placement.target,
      )).toBe(true);
      expect(scenario.isPlacementAllowed(source, placement.direction, definition, 45, placement.target)).toBe(false);
    }
  });

  it('conserve la même tuile de convergence quelle que soit la branche découverte en premier', () => {
    const scenario = new TutorialScenarioService();

    expect(scenario.getDefinitionIdForSource(tile(0, 5))).toBe('cross');
    expect(scenario.getDefinitionIdForSource(tile(2, 5))).toBe('cross');
    expect(scenario.getRoomTokenId({ definitionId: 'corner-room', x: 2, y: 5, rotation: 0 })).toBeNull();
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
    expect(exploration.confirmPlacement()).toMatchObject({ x: 0, y: 1, definitionId: 'straight-01', rotation: 90 });
  });
});

