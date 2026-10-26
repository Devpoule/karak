import { Injectable } from '@angular/core';
import { TUTORIAL_SCENARIO, TutorialScenarioPlacement } from '../data/tutorial-scenario';
import { Direction, PlacedTile, TileDefinition } from '../models/tile';
import { TokenDefinitionId } from '../models/token';

/**
 * Lecture seule du scénario du didacticiel. Il ne possède aucun état de jeu :
 * DungeonService et les services existants restent les sources de vérité.
 */
@Injectable()
export class TutorialScenarioService {
  private readonly placements = TUTORIAL_SCENARIO.placements;

  get heroId() {
    return TUTORIAL_SCENARIO.heroId;
  }

  get exit() {
    return TUTORIAL_SCENARIO.exit;
  }

  get helpDefinitions() {
    return TUTORIAL_SCENARIO.helps;
  }

  get requiredWestLocationIds() {
    return TUTORIAL_SCENARIO.requiredWestLocations;
  }

  get requiredEastLocationIds() {
    return TUTORIAL_SCENARIO.requiredEastLocations;
  }

  canExplore(source: PlacedTile, direction: Direction): boolean {
    return this.findPlacement(source.x, source.y, direction) !== undefined;
  }

  getDefinitionIdForSource(source: PlacedTile): string | null {
    const choices = this.placements.filter(placement =>
      placement.source.x === source.x && placement.source.y === source.y,
    );
    if (choices.length === 0) return null;
    const [first] = choices;
    return choices.every(choice => choice.definitionId === first.definitionId)
      ? first.definitionId
      : null;
  }

  isPlacementAllowed(
    source: PlacedTile,
    direction: Direction,
    definition: TileDefinition,
    rotation: number,
    target: { x: number; y: number },
  ): boolean {
    const placement = this.findPlacement(source.x, source.y, direction);
    return !!placement
      && placement.definitionId === definition.id
      && placement.target.x === target.x
      && placement.target.y === target.y
      && placement.allowedRotations.includes(rotation);
  }

  getRoomTokenId(tile: PlacedTile): TokenDefinitionId | null | undefined {
    return this.placements.find(placement =>
      placement.target.x === tile.x && placement.target.y === tile.y,
    )?.tokenId;
  }

  getLocationId(tile: PlacedTile): string | null {
    return this.placements.find(placement =>
      placement.target.x === tile.x && placement.target.y === tile.y,
    )?.id ?? null;
  }

  isExit(tile: PlacedTile): boolean {
    return tile.x === this.exit.x && tile.y === this.exit.y;
  }

  allowsMove(source: PlacedTile, destination: PlacedTile): boolean {
    return this.placements.some(placement =>
      (placement.source.x === source.x
        && placement.source.y === source.y
        && placement.target.x === destination.x
        && placement.target.y === destination.y)
      || (placement.target.x === source.x
        && placement.target.y === source.y
        && placement.source.x === destination.x
        && placement.source.y === destination.y),
    );
  }

  private findPlacement(x: number, y: number, direction: Direction): TutorialScenarioPlacement | undefined {
    return this.placements.find(placement =>
      placement.source.x === x && placement.source.y === y && placement.direction === direction,
    );
  }
}

