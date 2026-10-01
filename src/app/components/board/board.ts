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
   * Pioche des tuiles encore disponibles pendant la partie.
   *
   * Chaque entrée représente un exemplaire physique disponible.
   * Lorsqu'une tuile est tirée, son identifiant est retiré de ce
   * tableau : elle ne pourra donc plus être tirée pendant cette partie.
   *
   * RÈGLE OFFICIELLE KARAK — SOURCE ULTIME :
   * la tuile de départ est placée au centre du jeu. Les autres tuiles
   * sont mélangées et constituent la réserve utilisée pendant
   * l'exploration.
   *
   * La tuile de départ n'est donc pas présente dans cette pioche.
   */
  tileDeck: string[] = [
    'length-01',
    'length-02',
    'length-03',
    'length-04',
    'teleporter-length-01',
    'teleporter-length-02',
    'teleporter-length-03',
    'teleporter-length-04',
    'length-room',
    'corner-01',
    'corner-02',
    'corner-03',
    'corner-04',
    'healing-corner',
    'intersection-01',
    'intersection-02',
    'intersection-03',
    'intersection-04',
    'intersection-05',
    'intersection-room',
    'cross',
    'cross-room',
  ];

  /**
   * Tuiles actuellement présentes sur le plateau.
   *
   * Une nouvelle partie commence uniquement avec la tuile de départ,
   * placée à l'origine logique du donjon (0, 0).
   *
   * Toutes les autres tuiles seront ajoutées progressivement
   * par le mécanisme d'exploration.
   */
  tiles: PlacedTile[] = [
    {
      definitionId: 'start',
      x: 0,
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
  getTileDefinition(tile: PlacedTile): TileDefinition | undefined {
    return this.tileDefinitions.find((definition) => definition.id === tile.definitionId);
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
  startDragging(event: PointerEvent): void {
    this.isDragging = true;
    this.hasDragged = false;

    this.lastMouseX = event.clientX;
    this.lastMouseY = event.clientY;

    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
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

  /**
   * Mémorise la tuile sur laquelle commence une interaction.
   *
   * Elle n'est pas sélectionnée immédiatement afin de permettre
   * le drag du plateau depuis n'importe quelle tuile.
   */
  prepareTileSelection(tile: PlacedTile): void {
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
  hasTileOpening(tile: PlacedTile, direction: Direction): boolean {
    const definition = this.getTileDefinition(tile);

    if (!definition) {
      return false;
    }

    return hasOpening(definition.openings, tile.rotation, direction);
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
  getNeighborPosition(tile: PlacedTile, direction: Direction): { x: number; y: number } {
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
   * Recherche une tuile déjà placée à des coordonnées précises.
   *
   * Cette méthode permet d'interroger directement le plateau sans
   * avoir besoin de connaître une tuile de départ et une direction.
   *
   * Elle sera notamment utilisée lors du placement d'une nouvelle
   * tuile pour examiner toutes les cases qui entourent sa future
   * position.
   *
   * @param x Coordonnée horizontale recherchée.
   * @param y Coordonnée verticale recherchée.
   * @returns La tuile présente à cette position, ou undefined
   * si la case est actuellement vide.
   */
  getTileAt(x: number, y: number): PlacedTile | undefined {
    return this.tiles.find((tile) => tile.x === x && tile.y === y);
  }

  /**
   * Recherche la tuile située immédiatement dans une direction
   * donnée par rapport à une autre tuile.
   *
   * La position de la case voisine est d'abord calculée avec
   * getNeighborPosition(), puis getTileAt() vérifie si cette case
   * est déjà occupée.
   *
   * @param tile Tuile servant de point de départ.
   * @param direction Direction dans laquelle chercher.
   * @returns La tuile voisine ou undefined si la case est vide.
   */
  getNeighbor(tile: PlacedTile, direction: Direction): PlacedTile | undefined {
    const position = this.getNeighborPosition(tile, direction);

    return this.getTileAt(position.x, position.y);
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
  canMoveTo(tile: PlacedTile, direction: Direction): boolean {
    const neighbor = this.getNeighbor(tile, direction);

    if (!neighbor) {
      return false;
    }

    const tileDefinition = this.getTileDefinition(tile);

    const neighborDefinition = this.getTileDefinition(neighbor);

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
  canExplore(tile: PlacedTile, direction: Direction): boolean {
    const neighbor = this.getNeighbor(tile, direction);

    return !neighbor && this.hasTileOpening(tile, direction);
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
  getDirectionStatus(tile: PlacedTile, direction: Direction): string {
    if (this.canMoveTo(tile, direction)) {
      return '✓';
    }

    if (this.canExplore(tile, direction)) {
      return '?';
    }

    return '×';
  }

  /**
   * Explore un secteur encore inexploré du donjon.
   *
   * RÈGLE OFFICIELLE KARAK — SOURCE ULTIME :
   * lorsqu'un héros entre dans un secteur inexploré, une tuile de
   * catacombes est tirée et intégrée de manière que le héros puisse
   * y entrer depuis la tuile qu'il occupe actuellement.
   *
   * La règle précise que la nouvelle tuile doit être reliée uniquement
   * à la tuile depuis laquelle le héros arrive. Elle peut donc former
   * une impasse dans les autres directions, y compris contre une tuile
   * déjà présente.
   *
   * Conséquence pour le moteur :
   * nous ne validons PAS la compatibilité de la nouvelle tuile avec
   * tous ses voisins. Nous cherchons seulement une rotation qui lui
   * donne une ouverture vers la tuile d'origine.
   *
   * Déroulement :
   * 1. vérifier que la direction est explorable ;
   * 2. tirer une tuile de la pioche ;
   * 3. déterminer le côté par lequel elle doit être accessible ;
   * 4. rechercher une rotation présentant cette ouverture ;
   * 5. calculer sa position ;
   * 6. créer puis placer la nouvelle tuile.
   *
   * Exemple pour une exploration vers north :
   *
   *       nouvelle tuile
   *            ↓ south
   *            |
   *            ↑ north
   *       tuile actuelle
   *
   * La nouvelle tuile doit donc posséder une ouverture vers south.
   * Ses autres côtés n'imposent aucune contrainte de placement.
   *
   * Si une future interprétation du code contredit les règles
   * officielles de Karak, ce sont les règles officielles qui priment.
   */
  explore(tile: PlacedTile, direction: Direction): void {
    if (!this.canExplore(tile, direction)) {
      return;
    }

    const definition = this.drawTileDefinition();

    if (!definition) {
      return;
    }

    const requiredDirection = getOppositeDirection(direction);

    /*
     * Conformément à la règle officielle, seule la connexion avec
     * la tuile d'origine est obligatoire.
     */
    const rotation = findConnectingRotation(
      definition.openings,
      requiredDirection,
    );

    if (rotation === undefined) {
      return;
    }

    const position = this.getNeighborPosition(tile, direction);

    const newTile: PlacedTile = {
      definitionId: definition.id,
      x: position.x,
      y: position.y,
      rotation,
    };

    this.tiles.push(newTile);
  }

  /**
   * Tire aléatoirement une tuile parmi celles encore disponibles
   * dans la pioche, puis la retire définitivement de celle-ci.
   *
   * RÈGLE OFFICIELLE KARAK — SOURCE ULTIME :
   * les tuiles autres que la tuile de départ sont mélangées face
   * cachée. Lorsqu'un héros entre dans un secteur inexploré, il prend
   * une tuile dans cette réserve.
   *
   * tileDeck représente numériquement cette réserve physique.
   *
   * Fonctionnement :
   *
   * 1. vérifier que la pioche contient encore au moins une tuile ;
   * 2. choisir aléatoirement un index dans tileDeck ;
   * 3. retirer l'identifiant situé à cet index avec splice() ;
   * 4. retrouver la TileDefinition correspondante dans le catalogue.
   *
   * Exemple :
   *
   * tileDeck = [
   *   'length-01',
   *   'length-02',
   *   'length-03',
   *   'length-04'
   * ]
   *
   * Si randomIndex vaut 2 :
   *
   * drawnDefinitionId = 'length-03'
   *
   * puis tileDeck devient :
   *
   * [
   *   'length-01',
   *   'length-02',
   *   'length-04'
   * ]
   *
   * La tuile 'length-03' ne pourra donc plus être tirée.
   *
   * @returns La définition de la tuile tirée,
   * ou undefined lorsque la pioche est vide.
   */
  drawTileDefinition(): TileDefinition | undefined {
    if (this.tileDeck.length === 0) {
      return undefined;
    }

    const randomIndex = Math.floor(Math.random() * this.tileDeck.length);

    const [drawnDefinitionId] = this.tileDeck.splice(randomIndex, 1);

    return this.tileDefinitions.find((definition) => definition.id === drawnDefinitionId);
  }
}
