import { Injectable } from '@angular/core';

import {
  Direction,
  PlacedTile,
  TileDefinition,
  areConnected,
  hasOpening,
} from '../models/tile';

import { TILE_DEFINITIONS } from '../data/tile-definitions';


/**
 * Gère la structure physique du donjon.
 *
 * RESPONSABILITÉS :
 *
 * - conserver les tuiles actuellement placées ;
 * - retrouver une tuile à partir de ses coordonnées ;
 * - calculer les positions voisines ;
 * - retrouver la définition d'une tuile ;
 * - interpréter ses ouvertures selon sa rotation ;
 * - vérifier la connexion géométrique entre deux tuiles ;
 * - ajouter une tuile validée au donjon.
 *
 * HORS PÉRIMÈTRE :
 *
 * Ce service ne décide pas :
 *
 * - si une exploration est autorisée ;
 * - quelle tuile doit être piochée ;
 * - si un placement en attente est valide ;
 * - combien de mouvements possède un joueur ;
 * - si un héros peut effectuer une action pendant son tour.
 *
 * Ces responsabilités appartiennent aux autres parties
 * du moteur de jeu.
 */
@Injectable({
  providedIn: 'root',
})
export class DungeonService {


  // ==========================================================
  // ÉTAT DU DONJON
  // ==========================================================

  /**
   * Ensemble des tuiles actuellement présentes dans le donjon.
   *
   * La tuile de départ occupe toujours les coordonnées logiques
   * (0, 0) lors de l'initialisation.
   *
   * CONVENTION DU REPÈRE :
   *
   *                  north
   *                    ↑
   *                    │
   *          west ←  (x,y)  → east
   *                    │
   *                    ↓
   *                  south
   *
   * x augmente vers l'est.
   * y augmente vers le sud.
   *
   * Exemples :
   *
   * (0, -1) = nord de la tuile de départ
   * (1,  0) = est
   * (0,  1) = sud
   * (-1, 0) = ouest
   */
  readonly tiles: PlacedTile[] = [
    {
      definitionId: 'start',
      x: 0,
      y: 0,
      rotation: 0,
    },
  ];


  // ==========================================================
  // RECHERCHE DANS LE DONJON
  // ==========================================================

  /**
   * Recherche une tuile à partir de ses coordonnées logiques.
   *
   * @returns la tuile trouvée ou undefined lorsque la case
   * est actuellement vide.
   */
  getTileAt(
    x: number,
    y: number,
  ): PlacedTile | undefined {
    return this.tiles.find(
      (tile) => tile.x === x && tile.y === y,
    );
  }


  /**
   * Retrouve la définition correspondant à une tuile placée.
   *
   * PlacedTile contient uniquement l'identifiant de sa définition,
   * sa position et sa rotation.
   *
   * Les propriétés intrinsèques de la tuile restent centralisées
   * dans TILE_DEFINITIONS.
   */
  getTileDefinition(
    tile: PlacedTile,
  ): TileDefinition | undefined {
    return TILE_DEFINITIONS.find(
      (definition) => definition.id === tile.definitionId,
    );
  }


  // ==========================================================
  // VOISINAGE
  // ==========================================================

  /**
   * Calcule les coordonnées logiques de la case voisine
   * dans une direction donnée.
   *
   * Cette méthode ne vérifie pas si une tuile existe réellement
   * à cette position.
   *
   * Exemple :
   *
   * tile = (0, 0)
   * direction = east
   *
   * résultat = (1, 0)
   */
  getNeighborPosition(
    tile: PlacedTile,
    direction: Direction,
  ): { x: number; y: number } {
    switch (direction) {
      case 'north':
        return {
          x: tile.x,
          y: tile.y - 1,
        };

      case 'east':
        return {
          x: tile.x + 1,
          y: tile.y,
        };

      case 'south':
        return {
          x: tile.x,
          y: tile.y + 1,
        };

      case 'west':
        return {
          x: tile.x - 1,
          y: tile.y,
        };
    }
  }


  /**
   * Recherche la tuile voisine dans une direction donnée.
   *
   * Cette méthode combine :
   *
   * 1. le calcul de la position voisine ;
   * 2. la recherche d'une tuile à cette position.
   *
   * @returns la tuile voisine ou undefined si la case est vide.
   */
  getNeighbor(
    tile: PlacedTile,
    direction: Direction,
  ): PlacedTile | undefined {
    const position = this.getNeighborPosition(
      tile,
      direction,
    );

    return this.getTileAt(
      position.x,
      position.y,
    );
  }


  // ==========================================================
  // OUVERTURES DES TUILES
  // ==========================================================

  /**
   * Vérifie si une tuile possède réellement une ouverture
   * dans une direction donnée.
   *
   * La rotation actuelle de la tuile est prise en compte.
   *
   * Exemple :
   *
   * une définition peut posséder une ouverture north à 0°,
   * mais cette ouverture devient east après une rotation de 90°.
   */
  hasTileOpening(
    tile: PlacedTile,
    direction: Direction,
  ): boolean {
    const definition = this.getTileDefinition(tile);

    if (!definition) {
      return false;
    }

    return hasOpening(
      definition.openings,
      tile.rotation,
      direction,
    );
  }


  // ==========================================================
  // CONNEXION ENTRE DEUX TUILES
  // ==========================================================

  /**
   * Vérifie uniquement si un passage géométrique existe entre
   * une tuile et sa voisine dans la direction demandée.
   *
   * Pour qu'un passage existe :
   *
   * 1. une tuile voisine doit être présente ;
   * 2. la tuile source doit être ouverte vers cette voisine ;
   * 3. la tuile voisine doit être ouverte vers la source.
   *
   * Exemple :
   *
   *        ouverture EAST       ouverture WEST
   *
   *      [ SOURCE ] ─────────── [ VOISINE ]
   *
   * ========================================================
   * RESPONSABILITÉ DU SERVICE
   * ========================================================
   *
   * Cette méthode répond uniquement à la question :
   *
   * « Ces deux tuiles communiquent-elles géométriquement ? »
   *
   * Elle ne vérifie PAS :
   *
   * - les points de mouvement ;
   * - le joueur actif ;
   * - les monstres ;
   * - les combats ;
   * - les autres règles du tour.
   */
  canMoveTo(
    tile: PlacedTile,
    direction: Direction,
  ): boolean {
    const neighbor = this.getNeighbor(
      tile,
      direction,
    );

    if (!neighbor) {
      return false;
    }

    const tileDefinition =
      this.getTileDefinition(tile);

    const neighborDefinition =
      this.getTileDefinition(neighbor);

    if (!tileDefinition || !neighborDefinition) {
      return false;
    }

    return areConnected(
      tileDefinition.openings,
      tile.rotation,
      neighborDefinition.openings,
      neighbor.rotation,
      direction,
    );
  }


  // ==========================================================
  // MODIFICATION DU DONJON
  // ==========================================================

  /**
   * Ajoute une tuile au donjon.
   *
   * IMPORTANT :
   *
   * cette méthode ne décide volontairement PAS si le placement
   * demandé est autorisé.
   *
   * Elle exécute uniquement la modification de l'état physique
   * du donjon.
   *
   * ========================================================
   * CHOIX D'ARCHITECTURE
   * ========================================================
   *
   * ExplorationService est actuellement responsable de valider
   * le placement avant d'appeler cette méthode.
   *
   * La séparation est donc :
   *
   * ExplorationService
   *       │
   *       │ « ce placement est-il autorisé ? »
   *       ▼
   * DungeonService
   *       │
   *       │ « ajoute cette tuile »
   *       ▼
   * tiles
   */
  placeTile(tile: PlacedTile): void {
    this.tiles.push(tile);
  }
}
