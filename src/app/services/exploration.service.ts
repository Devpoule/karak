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


/**
 * Représente une exploration commencée mais dont la nouvelle
 * tuile n'a pas encore été définitivement placée.
 *
 * RÈGLE OFFICIELLE KARAK :
 *
 * le joueur choisit d'abord le passage qu'il souhaite emprunter.
 * Une tuile est ensuite piochée et placée de manière à permettre
 * au héros d'y entrer depuis la tuile qu'il quitte.
 *
 * La direction choisie appartient donc à l'exploration dès
 * son déclenchement.
 */
export interface PendingTilePlacement {

  /**
   * Tuile depuis laquelle l'exploration a commencé.
   */
  sourceTile: PlacedTile;

  /**
   * Direction choisie avant le tirage de la nouvelle tuile.
   *
   * Elle représente :
   *
   * sourceTile → nouvelle tuile
   */
  direction: Direction;

  /**
   * Définition de la tuile retirée de la pioche.
   *
   * Elle n'appartient pas encore au donjon tant que son
   * placement n'a pas été confirmé.
   */
  definition: TileDefinition;

  /**
   * Orientation actuellement choisie pour la nouvelle tuile.
   *
   * Valeurs possibles :
   *
   * 0° → 90° → 180° → 270°
   */
  rotation: number;
}


/**
 * Orchestre le processus d'exploration du donjon.
 *
 * RÈGLE OFFICIELLE KARAK :
 *
 *   choix du passage
 *          │
 *          ▼
 *   tirage d'une tuile
 *          │
 *          ▼
 *   orientation
 *          │
 *          ▼
 *   placement
 *          │
 *          ▼
 *   entrée du héros
 *
 * RESPONSABILITÉS :
 *
 * - déterminer si une direction peut être explorée ;
 * - déclencher l'exploration dans cette direction ;
 * - demander une tuile à la pioche ;
 * - conserver la tuile et la direction choisie ;
 * - gérer l'orientation de la tuile ;
 * - vérifier son raccordement à la tuile source ;
 * - confirmer son placement.
 *
 * DungeonService
 *   → source de vérité du donjon.
 *
 * TileDeckService
 *   → source de vérité de la pioche.
 */
@Injectable({
  providedIn: 'root',
})
export class ExplorationService {

  constructor(
    private readonly dungeonService: DungeonService,
    private readonly tileDeckService: TileDeckService,
  ) {}


  // ==========================================================
  // ÉTAT DE L'EXPLORATION
  // ==========================================================

  /**
   * Exploration actuellement en attente de confirmation.
   *
   * null signifie qu'aucune exploration n'est en cours.
   */
  pendingTile: PendingTilePlacement | null = null;


  // ==========================================================
  // POSSIBILITÉS D'EXPLORATION
  // ==========================================================

  /**
   * Indique si une direction peut être explorée depuis
   * une tuile donnée.
   *
   * Une direction est explorable lorsque :
   *
   * - la tuile actuelle possède une ouverture dans cette direction ;
   * - aucune tuile n'occupe encore la position voisine.
   */
  canExplore(
    tile: PlacedTile,
    direction: Direction,
  ): boolean {
    const neighbor = this.dungeonService.getNeighbor(
      tile,
      direction,
    );

    return (
      !neighbor &&
      this.dungeonService.hasTileOpening(tile, direction)
    );
  }


  // ==========================================================
  // DÉCLENCHEMENT DE L'EXPLORATION
  // ==========================================================

  /**
   * Commence l'exploration d'un secteur encore inexploré.
   *
   * RÈGLE OFFICIELLE KARAK :
   *
   * le passage est choisi avant que la nouvelle tuile soit
   * révélée.
   *
   * Cette méthode :
   *
   * 1. vérifie que la direction peut être explorée ;
   * 2. vérifie qu'aucune exploration n'est déjà en cours ;
   * 3. retire une tuile de la pioche ;
   * 4. mémorise la tuile source et la direction choisie.
   *
   * La tuile ne rejoint le donjon qu'après confirmation
   * de son orientation.
   */
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


  // ==========================================================
  // POSITION DU PLACEMENT
  // ==========================================================

  /**
   * Retourne la position logique destinée à recevoir
   * la nouvelle tuile.
   *
   * La position est déterminée par le passage choisi avant
   * le tirage et ne peut donc pas être changée après celui-ci.
   */
  getPendingTilePosition(): { x: number; y: number } | null {
    if (!this.pendingTile) {
      return null;
    }

    return this.dungeonService.getNeighborPosition(
      this.pendingTile.sourceTile,
      this.pendingTile.direction,
    );
  }


  // ==========================================================
  // ORIENTATION DE LA TUILE
  // ==========================================================

  /**
   * Tourne la tuile en attente d'un quart de tour horaire.
   *
   * Cycle :
   *
   * 0° → 90° → 180° → 270° → 0°
   */
  rotatePendingTile(): void {
    if (!this.pendingTile) {
      return;
    }

    this.pendingTile.rotation =
      (this.pendingTile.rotation + 90) % 360;
  }


  // ==========================================================
  // VALIDATION DU PLACEMENT
  // ==========================================================

  /**
   * Vérifie si l'orientation actuelle permet au héros
   * d'entrer sur la nouvelle tuile depuis la tuile source.
   *
   * RÈGLE OFFICIELLE KARAK :
   *
   * la nouvelle tuile doit être raccordée au passage par
   * lequel le héros l'explore.
   *
   * Les éventuels autres voisins ne constituent pas une
   * contrainte supplémentaire pour ce placement.
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


  // ==========================================================
  // CONFIRMATION DU PLACEMENT
  // ==========================================================

  /**
   * Place définitivement la tuile explorée dans le donjon.
   *
   * Le placement est refusé lorsque :
   *
   * - aucune exploration n'est en cours ;
   * - l'orientation choisie ne permet pas l'entrée du héros ;
   * - la position ne peut pas être déterminée.
   *
   * Une fois le placement effectué, l'exploration en attente
   * est libérée.
   *
   * @returns la tuile placée lorsque la confirmation réussit,
   * ou null lorsque la confirmation est refusée.
   */
  confirmPlacement(): PlacedTile | null {
    if (
      !this.pendingTile ||
      !this.isPendingTilePlacementValid()
    ) {
      return null;
    }

    const position = this.getPendingTilePosition();

    if (!position) {
      return null;
    }

    const placedTile: PlacedTile = {
      definitionId: this.pendingTile.definition.id,
      x: position.x,
      y: position.y,
      rotation: this.pendingTile.rotation,
    };

    this.dungeonService.placeTile(placedTile);

    this.pendingTile = null;

    return placedTile;
  }
}
