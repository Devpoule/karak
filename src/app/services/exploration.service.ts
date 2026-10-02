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
 * CHOIX D'IMPLÉMENTATION :
 *
 * Le tirage et le placement sont volontairement séparés afin
 * de laisser au joueur le temps d'orienter la tuile avant
 * de confirmer son placement.
 */
export interface PendingTilePlacement {

  /**
   * Tuile depuis laquelle l'exploration a commencé.
   */
  sourceTile: PlacedTile;

  /**
   * Direction suivie depuis la tuile source vers la nouvelle case.
   *
   * Exemple :
   *
   * source → east → nouvelle tuile
   */
  direction: Direction;

  /**
   * Définition de la tuile retirée de la pioche.
   *
   * Elle n'appartient pas encore au donjon tant que son placement
   * n'a pas été confirmé.
   */
  definition: TileDefinition;

  /**
   * Orientation actuellement choisie par le joueur.
   *
   * Valeurs possibles dans l'implémentation actuelle :
   *
   * 0° → 90° → 180° → 270°
   */
  rotation: number;
}


/**
 * Orchestre le processus d'exploration du donjon.
 *
 * Une exploration suit actuellement ce cycle :
 *
 *   tuile source
 *        │
 *        ▼
 *   direction explorable ?
 *        │
 *        ▼
 *   tirage d'une tuile
 *        │
 *        ▼
 *   pendingTile
 *        │
 *        ├── rotation
 *        │
 *        ├── validation
 *        │
 *        ▼
 *   placement dans le donjon
 *
 * RESPONSABILITÉS :
 *
 * - déterminer si une exploration peut commencer ;
 * - demander une tuile à la pioche ;
 * - conserver le placement en attente ;
 * - gérer son orientation ;
 * - vérifier son raccordement à la tuile source ;
 * - confirmer son placement.
 *
 * Le service ne possède ni le donjon ni la pioche :
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
   *
   * CHOIX D'IMPLÉMENTATION :
   * une seule exploration peut être préparée à la fois.
   */
  pendingTile: PendingTilePlacement | null = null;


  // ==========================================================
  // DÉCLENCHEMENT D'UNE EXPLORATION
  // ==========================================================

  /**
   * Indique si une exploration peut commencer depuis une tuile
   * dans une direction donnée.
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


  /**
   * Commence l'exploration d'un secteur encore inexploré.
   *
   * RÈGLE OFFICIELLE KARAK :
   *
   * lorsqu'un héros entre dans un secteur inexploré, une nouvelle
   * tuile de catacombes est tirée et intégrée au donjon de manière
   * à permettre au héros d'y entrer depuis la tuile qu'il quitte.
   *
   * CHOIX D'IMPLÉMENTATION :
   *
   * nous séparons volontairement le tirage et le placement.
   *
   * Cette méthode :
   *
   * 1. vérifie que la direction peut être explorée ;
   * 2. vérifie qu'aucune autre exploration n'est en attente ;
   * 3. retire une tuile de la pioche ;
   * 4. crée un PendingTilePlacement.
   *
   * La tuile ne rejoint le donjon qu'après confirmation.
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
  // POSITION DU PLACEMENT EN ATTENTE
  // ==========================================================

  /**
   * Retourne la position logique destinée à recevoir
   * la nouvelle tuile.
   *
   * Elle correspond à la case voisine de sourceTile dans
   * la direction choisie lors du début de l'exploration.
   *
   * @returns les coordonnées logiques de la nouvelle case,
   * ou null lorsqu'aucune exploration n'est en cours.
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
   *
   * CHOIX D'IMPLÉMENTATION :
   * le joueur choisit manuellement l'orientation avant
   * de confirmer le placement.
   */
  rotatePendingTile(): void {
    if (!this.pendingTile) {
      return;
    }

    this.pendingTile.rotation =
      (this.pendingTile.rotation + 90) % 360;
  }


  // ==========================================================
  // VALIDATION DU RACCORDEMENT
  // ==========================================================

  /**
   * Vérifie si l'orientation actuelle permet de raccorder
   * la nouvelle tuile à la tuile source.
   *
   * ========================================================
   * RÈGLE OFFICIELLE KARAK
   * ========================================================
   *
   * La nouvelle tuile doit permettre au héros d'y entrer
   * depuis la tuile qu'il occupe actuellement.
   *
   * Les autres côtés ne constituent pas des contraintes
   * supplémentaires de raccordement pour ce placement.
   *
   * ========================================================
   * CHOIX D'IMPLÉMENTATION
   * ========================================================
   *
   * pendingTile.direction représente :
   *
   *     source → nouvelle tuile
   *
   * L'ouverture recherchée sur la nouvelle tuile est donc
   * située dans la direction opposée.
   *
   * Exemple :
   *
   *                 exploration EAST
   *
   *     SOURCE  ───────────────────►  NOUVELLE TUILE
   *                                      ouverture
   *                                        WEST
   *
   * On ne vérifie volontairement PAS ici la compatibilité
   * avec les éventuels autres voisins.
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
   * Place définitivement la tuile en attente dans le donjon.
   *
   * Le placement est refusé lorsque :
   *
   * - aucune exploration n'est en cours ;
   * - l'orientation choisie n'est pas valide ;
   * - la position du placement ne peut pas être déterminée.
   *
   * Une fois le placement effectué :
   *
   * pendingTile = null
   *
   * L'exploration en attente est alors terminée.
   *
   * @returns true lorsque la tuile a été placée,
   * false lorsque la confirmation a été refusée.
   */
  confirmPlacement(): boolean {
    if (
      !this.pendingTile ||
      !this.isPendingTilePlacementValid()
    ) {
      return false;
    }

    const position = this.getPendingTilePosition();

    if (!position) {
      return false;
    }

    this.dungeonService.placeTile({
      definitionId: this.pendingTile.definition.id,
      x: position.x,
      y: position.y,
      rotation: this.pendingTile.rotation,
    });

    this.pendingTile = null;

    return true;
  }
}
