import { Component } from '@angular/core';

import {
  Direction,
  PlacedTile,
  TileDefinition,
  areConnected,
  findConnectingRotation,
  getOppositeDirection,
  hasOpening,
} from '../../models/tile';

import { TILE_DEFINITIONS } from '../../data/tile-definitions';

@Component({
  selector: 'app-board',
  imports: [],
  templateUrl: './board.html',
  styleUrl: './board.scss',
})
export class Board {

  /**
   * Taille d'une tuile affichée sur le plateau, en pixels.
   *
   * Les coordonnées logiques du jeu restent indépendantes
   * de cette valeur.
   *
   * Par exemple :
   *
   * (0, 0) et (1, 0)
   *
   * sont deux cases voisines quel que soit tileSize.
   *
   * tileSize sert uniquement à convertir ces coordonnées
   * logiques en positions visuelles.
   */
  readonly tileSize = 120;

  /**
   * Catalogue des définitions de tuiles.
   *
   * Il contient les informations intrinsèques des différents
   * types de tuiles : image et ouvertures originales.
   */
  readonly tileDefinitions = TILE_DEFINITIONS;

  /**
   * Tuiles actuellement présentes sur le plateau.
   *
   * Chaque élément référence une TileDefinition et possède
   * sa propre position ainsi que sa propre rotation.
   *
   * Pour le moment, le plateau est initialisé avec :
   * - la tuile de départ en (0, 0) ;
   * - un couloir de test en (1, 0).
   */
  tiles: PlacedTile[] = [
    {
      definitionId: 'start',
      x: 0,
      y: 0,
      rotation: 0,
    },
    {
      definitionId: 'length-01',
      x: 1,
      y: 0,
      rotation: 0,
    },
  ];

  /**
   * Décalage visuel de la caméra.
   *
   * Ces valeurs ne modifient jamais les coordonnées logiques
   * des tuiles.
   *
   * Une tuile située en (0, 0) reste en (0, 0), même lorsque
   * l'utilisateur déplace visuellement le plateau.
   */
  offsetX = 0;
  offsetY = 0;

  /**
   * Tuile actuellement sélectionnée.
   *
   * Elle sert notamment à afficher les possibilités de déplacement
   * et d'exploration autour de cette tuile.
   */
  selectedTile: PlacedTile | null = null;

  /**
   * Indique qu'un déplacement de caméra est actuellement en cours.
   */
  private isDragging = false;

  /**
   * Permet de distinguer un clic simple d'un véritable drag.
   *
   * false :
   * l'utilisateur a appuyé puis relâché sans déplacer le pointeur.
   *
   * true :
   * le pointeur a bougé pendant l'appui.
   */
  private hasDragged = false;

  /**
   * Dernière position connue du pointeur.
   *
   * Ces valeurs servent à calculer le déplacement effectué
   * entre deux PointerEvent successifs.
   */
  private lastMouseX = 0;
  private lastMouseY = 0;

  /**
   * Tuile sur laquelle le pointerdown a commencé.
   *
   * Elle n'est pas immédiatement sélectionnée car l'utilisateur
   * peut vouloir commencer un drag depuis cette tuile.
   *
   * La sélection n'est confirmée qu'au pointerup si aucun
   * déplacement n'a été détecté.
   */
  private pressedTile: PlacedTile | null = null;

  /**
   * Retourne la définition correspondant à une tuile placée.
   *
   * PlacedTile ne contient volontairement que definitionId.
   * Cette méthode effectue donc la liaison :
   *
   * PlacedTile
   *     ↓ definitionId
   * TileDefinition
   *
   * @param tile Tuile présente sur le plateau.
   * @returns Sa définition, ou undefined si elle n'existe pas.
   */
  getTileDefinition(
    tile: PlacedTile
  ): TileDefinition | undefined {
    return this.tileDefinitions.find(
      definition =>
        definition.id === tile.definitionId
    );
  }

  /**
   * Transformation CSS appliquée au monde du plateau.
   *
   * Le monde conserve son repère logique.
   * Seul son affichage est déplacé selon la position de la caméra.
   */
  get worldTransform(): string {
    return `translate(${this.offsetX}px, ${this.offsetY}px)`;
  }

  /**
   * Commence une interaction avec le plateau.
   *
   * Le pointeur est capturé afin que le drag continue même
   * lorsque la souris quitte momentanément la zone du Board.
   *
   * hasDragged est réinitialisé : nous ne savons pas encore
   * s'il s'agit d'un clic ou d'un déplacement.
   */
  startDragging(
    event: PointerEvent
  ): void {
    this.isDragging = true;
    this.hasDragged = false;

    this.lastMouseX = event.clientX;
    this.lastMouseY = event.clientY;

    (event.currentTarget as HTMLElement)
      .setPointerCapture(event.pointerId);
  }

  /**
   * Déplace visuellement la caméra pendant un drag.
   *
   * Le déplacement est calculé à partir de la différence entre
   * la position actuelle du pointeur et sa position précédente :
   *
   * deltaX = position actuelle X - ancienne position X
   * deltaY = position actuelle Y - ancienne position Y
   *
   * Ces deltas sont ensuite ajoutés aux offsets de la caméra.
   *
   * Dès qu'un déplacement est détecté, hasDragged passe à true.
   * Cela empêchera la sélection accidentelle d'une tuile
   * lorsque l'utilisateur voulait simplement déplacer le plateau.
   */
  drag(
    event: PointerEvent
  ): void {
    if (!this.isDragging) {
      return;
    }

    const deltaX =
      event.clientX - this.lastMouseX;

    const deltaY =
      event.clientY - this.lastMouseY;

    if (deltaX !== 0 || deltaY !== 0) {
      this.hasDragged = true;
    }

    this.offsetX += deltaX;
    this.offsetY += deltaY;

    this.lastMouseX = event.clientX;
    this.lastMouseY = event.clientY;
  }

  /**
   * Termine l'interaction avec le plateau.
   *
   * Deux comportements sont possibles :
   *
   * 1. Aucun déplacement n'a eu lieu :
   *    le geste est considéré comme un clic et la tuile
   *    pressée devient la tuile sélectionnée.
   *
   * 2. Un déplacement a eu lieu :
   *    le geste était un drag et aucune sélection n'est effectuée.
   *
   * La capture du pointeur est ensuite libérée.
   */
  stopDragging(
    event: PointerEvent
  ): void {
    this.isDragging = false;

    if (!this.hasDragged && this.pressedTile) {
      this.selectedTile = this.pressedTile;
    }

    this.pressedTile = null;

    const board =
      event.currentTarget as HTMLElement;

    if (board.hasPointerCapture(event.pointerId)) {
      board.releasePointerCapture(event.pointerId);
    }
  }

  /**
   * Mémorise la tuile sur laquelle commence une interaction.
   *
   * Elle n'est pas sélectionnée immédiatement afin de permettre
   * le drag du plateau depuis n'importe quelle tuile.
   */
  prepareTileSelection(
    tile: PlacedTile
  ): void {
    this.pressedTile = tile;
  }

  /**
   * Indique si une tuile possède une ouverture réelle dans
   * une direction donnée.
   *
   * La définition fournit les ouvertures originales tandis que
   * PlacedTile fournit la rotation actuelle.
   *
   * Les deux informations sont combinées par hasOpening().
   */
  hasTileOpening(
    tile: PlacedTile,
    direction: Direction
  ): boolean {
    const definition =
      this.getTileDefinition(tile);

    if (!definition) {
      return false;
    }

    return hasOpening(
      definition.openings,
      tile.rotation,
      direction
    );
  }

  /**
   * Calcule les coordonnées de la case voisine dans une direction.
   *
   * Convention du plateau :
   *
   *                 (x, y - 1)
   *                     ↑
   *                     |
   * (x - 1, y) ←      (x,y)      → (x + 1, y)
   *                     |
   *                     ↓
   *                 (x, y + 1)
   *
   * @param tile Tuile servant de point de départ.
   * @param direction Direction recherchée.
   */
  getNeighborPosition(
    tile: PlacedTile,
    direction: Direction
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
   * Recherche la tuile située immédiatement dans une direction.
   *
   * La méthode calcule d'abord les coordonnées attendues,
   * puis cherche si une tuile du plateau occupe cette position.
   *
   * L'absence de résultat n'est pas nécessairement une erreur :
   * elle peut représenter une zone du donjon encore inexplorée.
   */
  getNeighbor(
    tile: PlacedTile,
    direction: Direction
  ): PlacedTile | undefined {
    const position =
      this.getNeighborPosition(tile, direction);

    return this.tiles.find(
      candidate =>
        candidate.x === position.x &&
        candidate.y === position.y
    );
  }

  /**
   * Détermine si un déplacement est possible entre une tuile
   * et sa voisine dans une direction donnée.
   *
   * Trois conditions sont nécessaires :
   *
   * 1. une tuile voisine doit exister ;
   * 2. la définition des deux tuiles doit être connue ;
   * 3. leurs ouvertures doivent être compatibles.
   *
   * areConnected() prend également en compte leurs rotations.
   */
  canMoveTo(
    tile: PlacedTile,
    direction: Direction
  ): boolean {
    const neighbor =
      this.getNeighbor(tile, direction);

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
      direction
    );
  }

  /**
   * Détermine si une direction peut être explorée.
   *
   * Une exploration est possible lorsque :
   *
   * - aucune tuile n'occupe encore la case voisine ;
   * - la tuile actuelle possède une ouverture dans cette direction.
   *
   * Exemple :
   *
   * START possède une ouverture vers north
   * mais aucune tuile n'est encore en (0, -1).
   *
   * → north est explorable.
   */
  canExplore(
    tile: PlacedTile,
    direction: Direction
  ): boolean {
    const neighbor =
      this.getNeighbor(tile, direction);

    return (
      !neighbor &&
      this.hasTileOpening(tile, direction)
    );
  }

  /**
   * Retourne l'état actuellement affiché autour d'une tuile.
   *
   * ✓ : une tuile voisine existe et les deux tuiles communiquent.
   *
   * ? : aucune tuile voisine n'existe mais une ouverture permet
   *     d'explorer cette direction.
   *
   * × : aucun déplacement ni exploration n'est possible.
   *
   * Ce système est actuellement utilisé comme outil de debug
   * pendant le développement du moteur.
   */
  getDirectionStatus(
    tile: PlacedTile,
    direction: Direction
  ): string {
    if (this.canMoveTo(tile, direction)) {
      return '✓';
    }

    if (this.canExplore(tile, direction)) {
      return '?';
    }

    return '×';
  }

  /**
   * Explore une zone encore inconnue du donjon.
   *
   * Déroulement actuel :
   *
   * 1. vérifier que la direction est explorable ;
   * 2. tirer une définition de tuile ;
   * 3. déterminer de quel côté la nouvelle tuile doit être ouverte ;
   * 4. trouver une rotation compatible ;
   * 5. calculer les coordonnées de destination ;
   * 6. créer le PlacedTile ;
   * 7. l'ajouter au plateau.
   *
   * Exemple d'une exploration vers north :
   *
   * La tuile actuelle possède une ouverture north.
   *
   * La nouvelle tuile sera située au-dessus :
   *
   *       nouvelle tuile
   *            ↓ south
   *            |
   *            ↑ north
   *       tuile actuelle
   *
   * Elle doit donc présenter une ouverture vers south.
   *
   * IMPORTANT :
   * la pioche actuelle est encore temporaire. Une même définition
   * peut être tirée plusieurs fois sans limite.
   */
  explore(
    tile: PlacedTile,
    direction: Direction
  ): void {
    if (!this.canExplore(tile, direction)) {
      return;
    }

    const definition =
      this.drawTileDefinition();

    if (!definition) {
      return;
    }

    /*
     * La nouvelle tuile doit être ouverte vers la tuile
     * depuis laquelle l'exploration a commencé.
     *
     * Exploration north → nouvelle ouverture requise south.
     * Exploration east  → nouvelle ouverture requise west.
     * Etc.
     */
    const requiredDirection =
      getOppositeDirection(direction);

    const rotation =
      findConnectingRotation(
        definition.openings,
        requiredDirection
      );

    /*
     * Si aucune orientation de cette définition ne permet
     * la connexion, la tuile ne peut pas être posée.
     */
    if (rotation === undefined) {
      return;
    }

    const position =
      this.getNeighborPosition(
        tile,
        direction
      );

    const newTile: PlacedTile = {
      definitionId: definition.id,
      x: position.x,
      y: position.y,
      rotation,
    };

    this.tiles.push(newTile);
  }

  /**
   * Tire temporairement une définition de tuile au hasard.
   *
   * Pour le prototype actuel, seules les définitions dont
   * l'identifiant commence par "length-" participent au tirage.
   *
   * Math.random() produit une valeur comprise entre 0 inclus
   * et 1 exclu.
   *
   * Exemple avec quatre définitions :
   *
   * Math.random() = 0.63
   *
   * 0.63 × 4 = 2.52
   *
   * Math.floor(2.52) = 2
   *
   * → l'élément d'index 2 est sélectionné.
   *
   * IMPORTANT :
   * cette méthode ne représente pas encore une véritable pioche.
   * Elle choisit dans le catalogue et ne retire aucun élément.
   * Une même définition peut donc être sélectionnée indéfiniment.
   *
   * Ce comportement sera remplacé par un deck contenant un nombre
   * fini d'exemplaires de chaque tuile.
   *
   * @returns Une définition tirée au hasard ou undefined si aucune
   * définition compatible avec le filtre n'existe.
   */
  drawTileDefinition(): TileDefinition | undefined {
    const availableDefinitions =
      this.tileDefinitions.filter(
        definition =>
          definition.id.startsWith('length-')
      );

    if (availableDefinitions.length === 0) {
      return undefined;
    }

    const randomIndex = Math.floor(
      Math.random() *
      availableDefinitions.length
    );

    return availableDefinitions[randomIndex];
  }
}
