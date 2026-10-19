import { Component } from '@angular/core';
import { TILE_DEFINITIONS } from '../../data/tile-definitions';
import { areConnected, Direction, getRotatedOpenings } from '../../models/tile';

interface PrototypeTile {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly rotation: number;
}

interface PrototypeConnection {
  readonly key: string;
  readonly orientation: 'horizontal' | 'vertical';
  readonly x: number;
  readonly y: number;
}

interface PrototypeContour {
  readonly key: string;
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
}

/** Démonstrateur isolé des raccordements graphiques entre tuiles. */
@Component({
  standalone: true,
  selector: 'app-board-continuity-prototype',
  templateUrl: './board-continuity-prototype.html',
  styleUrl: './board-continuity-prototype.scss',
})
export class BoardContinuityPrototype {
  readonly tileSize = 144;
  readonly tileIds = ['straight-01', 'corner-01', 't-junction-01', 'straight-room', 'portal-straight-01'];
  readonly directions: readonly Direction[] = ['north', 'east', 'south', 'west'];
  mode: 'original' | 'continuous' | 'continuous-contours' = 'continuous';
  showBoundaries = false;
  /** Largeur graphique commune réservée au passage, indépendante des règles métier. */
  readonly openingVisualWidth = 52;

  readonly layouts: readonly { label: string; tiles: readonly PrototypeTile[] }[] = [
    {
      label: 'Chaîne principale',
      tiles: [
        { id: 'straight-01', x: 0, y: 0, rotation: 0 },
        { id: 'corner-01', x: 1, y: 0, rotation: 0 },
        { id: 't-junction-01', x: 1, y: 1, rotation: 90 },
        { id: 'straight-room', x: 2, y: 1, rotation: 90 },
        { id: 'portal-straight-01', x: 3, y: 1, rotation: 0 },
      ],
    },
    {
      label: 'Rotations croisées',
      tiles: [
        { id: 'straight-02', x: 0, y: 0, rotation: 90 },
        { id: 'corner-02', x: 0, y: 1, rotation: 90 },
        { id: 't-junction-02', x: 1, y: 1, rotation: 180 },
        { id: 'crossroads-room', x: 2, y: 1, rotation: 0 },
        { id: 'healing-corner', x: 2, y: 0, rotation: 90 },
      ],
    },
  ];

  selectedLayoutIndex = 0;

  /** Retourne les tuiles de la configuration actuellement sélectionnée. */
  get selectedLayout(): readonly PrototypeTile[] {
    return this.layouts[this.selectedLayoutIndex].tiles;
  }

  /** Retourne la coordonnée horizontale minimale de la configuration. */
  get minX(): number { return Math.min(...this.selectedLayout.map(tile => tile.x)); }
  /** Retourne la coordonnée verticale minimale de la configuration. */
  get minY(): number { return Math.min(...this.selectedLayout.map(tile => tile.y)); }
  /** Calcule la largeur de la scène à partir de la grille de démonstration. */
  get width(): number { return (Math.max(...this.selectedLayout.map(tile => tile.x)) - this.minX + 1) * this.tileSize; }
  /** Calcule la hauteur de la scène à partir de la grille de démonstration. */
  get height(): number { return (Math.max(...this.selectedLayout.map(tile => tile.y)) - this.minY + 1) * this.tileSize; }

  /** Retourne les connexions réelles, limitées aux voisins présents. */
  get connections(): readonly PrototypeConnection[] {
    const byPosition = new Map(this.selectedLayout.map(tile => [`${tile.x},${tile.y}`, tile]));
    const connections: PrototypeConnection[] = [];
    for (const tile of this.selectedLayout) {
      const east = byPosition.get(`${tile.x + 1},${tile.y}`);
      if (east && this.isConnected(tile, east, 'east')) {
        connections.push({ key: `${tile.id}-east-${east.id}`, orientation: 'horizontal', x: tile.x - this.minX + 1, y: tile.y - this.minY });
      }
      const south = byPosition.get(`${tile.x},${tile.y + 1}`);
      if (south && this.isConnected(tile, south, 'south')) {
        connections.push({ key: `${tile.id}-south-${south.id}`, orientation: 'vertical', x: tile.x - this.minX, y: tile.y - this.minY + 1 });
      }
    }
    return connections;
  }

  /**
   * Retourne les contours internes nécessaires aux murs fermés.
   * Chaque frontière est visitée une seule fois, depuis le voisin est ou sud.
   */
  get contours(): readonly PrototypeContour[] {
    const byPosition = new Map(this.selectedLayout.map(tile => [`${tile.x},${tile.y}`, tile]));
    const contours: PrototypeContour[] = [];
    for (const tile of this.selectedLayout) {
      const east = byPosition.get(`${tile.x + 1},${tile.y}`);
      if (east && !this.hasCompatibleOpening(tile, east, 'east')) {
        contours.push({
          key: `${tile.id}-east-contour-${east.id}`,
          x1: (tile.x - this.minX + 1) * this.tileSize,
          y1: (tile.y - this.minY) * this.tileSize,
          x2: (tile.x - this.minX + 1) * this.tileSize,
          y2: (tile.y - this.minY + 1) * this.tileSize,
        });
      }
      const south = byPosition.get(`${tile.x},${tile.y + 1}`);
      if (south && !this.hasCompatibleOpening(tile, south, 'south')) {
        contours.push({
          key: `${tile.id}-south-contour-${south.id}`,
          x1: (tile.x - this.minX) * this.tileSize,
          y1: (tile.y - this.minY + 1) * this.tileSize,
          x2: (tile.x - this.minX + 1) * this.tileSize,
          y2: (tile.y - this.minY + 1) * this.tileSize,
        });
      }
    }
    return contours;
  }

  /** Retourne le chemin public de l’illustration correspondant à une tuile. */
  getTileImage(tile: PrototypeTile): string {
    return this.findDefinition(tile.id)?.image ?? '';
  }

  /** Convertit la rotation métier en transformation CSS de démonstration. */
  getTileRotation(tile: PrototypeTile): string {
    return `rotate(${tile.rotation}deg)`;
  }

  /** Positionne une tuile dans la scène sans modifier la grille du jeu. */
  getTileStyle(tile: PrototypeTile): Record<string, string> {
    return {
      left: `${(tile.x - this.minX) * this.tileSize}px`,
      top: `${(tile.y - this.minY) * this.tileSize}px`,
    };
  }

  /** Vérifie une connexion sans ajouter de règle métier au moteur. */
  private isConnected(first: PrototypeTile, second: PrototypeTile, direction: Direction): boolean {
    const firstDefinition = this.findDefinition(first.id);
    const secondDefinition = this.findDefinition(second.id);
    return !!firstDefinition && !!secondDefinition && areConnected(
      firstDefinition.openings,
      first.rotation,
      secondDefinition.openings,
      second.rotation,
      direction,
    );
  }

  /** Vérifie la compatibilité visuelle et métier d'une frontière adjacente. */
  private hasCompatibleOpening(first: PrototypeTile, second: PrototypeTile, direction: Direction): boolean {
    return this.isConnected(first, second, direction);
  }

  /** Expose la géométrie tournée pour le mode diagnostic. */
  getOpenings(tile: PrototypeTile): readonly Direction[] {
    const definition = this.findDefinition(tile.id);
    return definition ? getRotatedOpenings(definition.openings, tile.rotation) : [];
  }

  private findDefinition(id: string) {
    return TILE_DEFINITIONS.find(definition => definition.id === id);
  }
}
