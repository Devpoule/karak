import { Component } from '@angular/core';

import { DungeonService } from '../../services/dungeon.service';
import { ExplorationService, PendingTilePlacement } from '../../services/exploration.service';

import { Direction, PlacedTile, TileDefinition } from '../../models/tile';

@Component({
  selector: 'app-board',
  imports: [],
  templateUrl: './board.html',
  styleUrl: './board.scss',
})
export class Board {
  constructor(
    private readonly dungeonService: DungeonService,
    private readonly explorationService: ExplorationService,
  ) {}

  /**
   * Indique si le donjon a été révélé au joueur.
   *
   * La couverture est uniquement une présentation visuelle :
   * elle ne modifie aucun état du moteur de jeu.
   */
  isBoardRevealed = false;
  isBoardRevealing = false;

  revealBoard(): void {
    if (this.isBoardRevealing) {
      return;
    }

    this.isBoardRevealing = true;

    window.setTimeout(() => {
      this.isBoardRevealed = true;
    }, 1300);
  }

  /**
   * Taille d'affichage d'une tuile.
   *
   * Les coordonnées du donjon restent logiques :
   * deux cases voisines sont toujours séparées de 1,
   * indépendamment de cette valeur.
   */
  readonly tileSize = 120;

  /**
   * La tuile de départ est au centre.
   * 79 emplacements restent disponibles dans chaque direction,
   * soit 159 cases par axe.
   */
  readonly mapSizeInTiles = 159;

  get mapSizeInPixels(): number {
    return this.mapSizeInTiles * this.tileSize;
  }

  readonly mapCenterInPixels = this.mapSizeInPixels / 2;

  get tiles(): PlacedTile[] {
    return this.dungeonService.tiles;
  }

  /**
   * Décalage visuel de la caméra.
   * Il ne modifie jamais les coordonnées logiques du donjon.
   */
  offsetX = 0;
  offsetY = 0;

  selectedTile: PlacedTile | null = null;

  get pendingTile(): PendingTilePlacement | null {
    return this.explorationService.pendingTile;
  }

  /*
   * État de l'interaction avec le plateau.
   *
   * pressedTile permet de différencier la sélection d'une tuile
   * d'un drag commencé depuis cette même tuile.
   */
  private isDragging = false;
  private hasDragged = false;
  private lastMouseX = 0;
  private lastMouseY = 0;
  private pressedTile: PlacedTile | null = null;

  getTileDefinition(tile: PlacedTile): TileDefinition | undefined {
    return this.dungeonService.getTileDefinition(tile);
  }

  get worldTransform(): string {
    const x = this.offsetX - this.mapCenterInPixels;
    const y = this.offsetY - this.mapCenterInPixels;

    return `translate(${x}px, ${y}px)`;
  }

  startDragging(event: PointerEvent): void {
    this.isDragging = true;
    this.hasDragged = false;

    this.lastMouseX = event.clientX;
    this.lastMouseY = event.clientY;

    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }

  drag(event: PointerEvent): void {
    if (!this.isDragging) {
      return;
    }

    const deltaX = event.clientX - this.lastMouseX;
    const deltaY = event.clientY - this.lastMouseY;

    if (deltaX !== 0 || deltaY !== 0) {
      this.hasDragged = true;
    }

    this.offsetX += deltaX;
    this.offsetY += deltaY;

    this.lastMouseX = event.clientX;
    this.lastMouseY = event.clientY;
  }

  stopDragging(event: PointerEvent): void {
    this.isDragging = false;

    if (!this.hasDragged && this.pressedTile) {
      this.selectedTile = this.pressedTile;
    }

    this.pressedTile = null;

    const board = event.currentTarget as HTMLElement;

    if (board.hasPointerCapture(event.pointerId)) {
      board.releasePointerCapture(event.pointerId);
    }
  }

  prepareTileSelection(tile: PlacedTile): void {
    this.pressedTile = tile;
  }

  hasTileOpening(tile: PlacedTile, direction: Direction): boolean {
    return this.dungeonService.hasTileOpening(tile, direction);
  }

  getNeighborPosition(tile: PlacedTile, direction: Direction): { x: number; y: number } {
    return this.dungeonService.getNeighborPosition(tile, direction);
  }

  getPendingTilePosition(): { x: number; y: number } | null {
    return this.explorationService.getPendingTilePosition();
  }

  getTileAt(x: number, y: number): PlacedTile | undefined {
    return this.dungeonService.getTileAt(x, y);
  }

  getNeighbor(tile: PlacedTile, direction: Direction): PlacedTile | undefined {
    return this.dungeonService.getNeighbor(tile, direction);
  }

  canMoveTo(tile: PlacedTile, direction: Direction): boolean {
    return this.dungeonService.canMoveTo(tile, direction);
  }

  canExplore(tile: PlacedTile, direction: Direction): boolean {
    return this.explorationService.canExplore(tile, direction);
  }

  /**
   * Contrôle temporaire de développement :
   * ✓ passage existant
   * ? exploration possible
   * × direction inaccessible
   */
  getDirectionStatus(tile: PlacedTile, direction: Direction): string {
    if (this.canMoveTo(tile, direction)) {
      return '✓';
    }

    if (this.canExplore(tile, direction)) {
      return '?';
    }

    return '×';
  }

  explore(tile: PlacedTile, direction: Direction): void {
    this.explorationService.start(tile, direction);
  }

  rotatePendingTile(): void {
    this.explorationService.rotatePendingTile();
  }

  isPendingTilePlacementValid(): boolean {
    return this.explorationService.isPendingTilePlacementValid();
  }

  confirmPendingTile(): void {
    this.explorationService.confirmPlacement();
  }
}
