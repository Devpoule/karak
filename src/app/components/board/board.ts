import { Component } from '@angular/core';
import { HERO_DEFINITIONS } from '../../data/hero-definitions';
import { HeroDefinition } from '../../models/hero';
import { PlayerService } from '../../services/player.service';
import { DungeonService } from '../../services/dungeon.service';
import { TurnService } from '../../services/turn.service';
import { ExplorationService, PendingTilePlacement } from '../../services/exploration.service';

import { Direction, PlacedTile, TileDefinition } from '../../models/tile';

/**
 * Plateau principal du jeu.
 *
 * Ce composant est responsable de la représentation et des
 * interactions visuelles avec le donjon :
 *
 * - affichage des tuiles ;
 * - déplacement de la caméra ;
 * - sélection temporaire des tuiles ;
 * - interface d'exploration ;
 * - couverture d'entrée dans le donjon.
 *
 * Les règles du donjon et de l'exploration restent déléguées
 * respectivement à DungeonService et ExplorationService.
 */
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
    private readonly playerService: PlayerService,
    private readonly turnService: TurnService,
  ) {}

  // ==========================================================
  // PRÉSENTATION DU DONJON
  // ==========================================================

  /**
   * État de la couverture affichée avant l'entrée dans le donjon.
   *
   * isBoardRevealing :
   * l'animation de disparition est en cours.
   *
   * isBoardRevealed :
   * l'animation est terminée et la couverture peut être retirée.
   *
   * CHOIX D'IMPLÉMENTATION :
   * cette couverture est purement visuelle et ne modifie aucun
   * état du moteur de jeu.
   */
  isBoardRevealed = false;
  isBoardRevealing = false;

  /**
   * Lance l'animation d'entrée dans le donjon.
   *
   * La couverture reste présente pendant les 1300 ms de
   * transition CSS avant d'être retirée du DOM.
   */
  revealBoard(): void {
    if (this.isBoardRevealing) {
      return;
    }

    this.isBoardRevealing = true;

    window.setTimeout(() => {
      this.isBoardRevealed = true;
    }, 1300);
  }

  // ==========================================================
  // GÉOMÉTRIE DE LA CARTE
  // ==========================================================

  /**
   * Taille d'affichage d'une tuile, en pixels.
   *
   * Les coordonnées du moteur restent logiques :
   * deux cases voisines sont toujours séparées de 1,
   * indépendamment de cette valeur d'affichage.
   */
  readonly tileSize = 120;

  /**
   * Nombre de positions disponibles sur chaque axe de la carte.
   *
   * La tuile de départ se trouve au centre.
   * Avec 79 autres tuiles disponibles, on réserve jusqu'à
   * 79 positions dans chacune des quatre directions :
   *
   * 79 + 1 + 79 = 159 positions.
   *
   * CHOIX D'IMPLÉMENTATION :
   * cette grande surface permet au donjon de s'étendre sans
   * avoir à redimensionner dynamiquement le monde.
   */
  readonly mapSizeInTiles = 159;

  /**
   * Taille physique du monde en pixels.
   */
  get mapSizeInPixels(): number {
    return this.mapSizeInTiles * this.tileSize;
  }

  /**
   * Position physique correspondant aux coordonnées logiques
   * (0, 0), où se trouve la tuile de départ.
   */
  readonly mapCenterInPixels = this.mapSizeInPixels / 2;

  // ==========================================================
  // DONJON AFFICHÉ
  // ==========================================================

  /**
   * Tuiles actuellement posées dans le donjon.
   *
   * Le Board ne possède pas ces données :
   * DungeonService reste leur source de vérité.
   */
  get tiles(): PlacedTile[] {
    return this.dungeonService.tiles;
  }

  /**
   * Retrouve la définition visuelle et géométrique
   * correspondant à une tuile posée.
   */
  getTileDefinition(tile: PlacedTile): TileDefinition | undefined {
    return this.dungeonService.getTileDefinition(tile);
  }

  // ==========================================================
  // JOUEUR AFFICHÉ
  // ==========================================================

  /**
   * État actuel du joueur.
   *
   * PlayerService reste la source de vérité de cet état.
   */
  get player() {
    return this.playerService.player;
  }

  /**
   * Définition statique du héros actuellement utilisé
   * par le joueur.
   */
  get heroDefinition(): HeroDefinition | undefined {
    return HERO_DEFINITIONS.find((hero) => hero.id === this.player.heroId);
  }

  /**
   * Asset du pion correspondant à l'orientation actuelle
   * du héros.
   */
  get heroPawnImage(): string | undefined {
    const facing = this.player.facing;

    if (!facing) {
      return undefined;
    }

    return this.heroDefinition?.pawn[facing];
  }

  // ==========================================================
  // CAMÉRA
  // ==========================================================

  /**
   * Décalage visuel de la caméra par rapport au centre.
   *
   * Ces valeurs ne modifient jamais les coordonnées logiques
   * des tuiles du donjon.
   */
  offsetX = 0;
  offsetY = 0;

  /**
   * État interne du glisser-déposer de la caméra.
   */
  private isDragging = false;

  private lastMouseX = 0;
  private lastMouseY = 0;

  /**
   * Transformation appliquée au monde complet.
   *
   * Le monde est d'abord ramené autour de son centre physique,
   * puis déplacé selon la position actuelle de la caméra.
   */
  get worldTransform(): string {
    const x = this.offsetX - this.mapCenterInPixels;
    const y = this.offsetY - this.mapCenterInPixels;

    return `translate(${x}px, ${y}px)`;
  }

  /**
   * Commence le déplacement de la caméra.
   *
   * Pointer Capture permet de continuer à recevoir les événements
   * même si le pointeur quitte temporairement la zone du plateau.
   */
  startDragging(event: PointerEvent): void {
    this.isDragging = true;

    this.lastMouseX = event.clientX;
    this.lastMouseY = event.clientY;

    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }

  /**
   * Déplace la caméra selon le mouvement du pointeur.
   */
  drag(event: PointerEvent): void {
    if (!this.isDragging) {
      return;
    }

    const deltaX = event.clientX - this.lastMouseX;
    const deltaY = event.clientY - this.lastMouseY;

    this.offsetX += deltaX;
    this.offsetY += deltaY;

    this.lastMouseX = event.clientX;
    this.lastMouseY = event.clientY;
  }

  /**
   * Termine le déplacement de la caméra.
   */
  stopDragging(event: PointerEvent): void {
    this.isDragging = false;

    const board = event.currentTarget as HTMLElement;

    if (board.hasPointerCapture(event.pointerId)) {
      board.releasePointerCapture(event.pointerId);
    }
  }

  // ==========================================================
  // DÉPLACEMENT DU JOUEUR
  // ==========================================================

  /**
   * Tente de déplacer le joueur dans la direction demandée.
   *
   * Le déplacement n'est effectué que si une tuile existante
   * est physiquement connectée à la position actuelle du joueur.
   */
  movePlayer(direction: Direction): void {
    const position = this.player.position;

    if (!position) {
      return;
    }

    const currentTile = this.dungeonService.getTileAt(position.x, position.y);

    if (!currentTile) {
      return;
    }

    if (!this.dungeonService.canMoveTo(currentTile, direction)) {
      return;
    }

    const destination = this.dungeonService.getNeighborPosition(currentTile, direction);

    this.playerService.moveTo(destination.x, destination.y, direction);
  }

  /**
   * Exécute l'action disponible dans une direction depuis
   * la tuile actuellement occupée par le joueur.
   *
   * Sans tuile piochée :
   *
   * - une tuile connectée existe : déplacement normal ;
   * - une sortie inexplorée existe : aucune exploration n'est
   *   déclenchée automatiquement.
   *
   * Avec une tuile piochée :
   *
   * - une sortie explorable sélectionne l'emplacement envisagé
   *   pour cette tuile ;
   * - le joueur peut changer cette sélection librement avant
   *   la confirmation définitive.
   *
   * CHOIX D'IMPLÉMENTATION :
   *
   * la sélection d'une direction et la pioche sont désormais
   * deux actions indépendantes.
   */
  handlePlayerDirection(direction: Direction): void {
    const position = this.player.position;

    if (!position) {
      return;
    }

    const currentTile = this.dungeonService.getTileAt(position.x, position.y);

    if (!currentTile) {
      return;
    }

    if (this.dungeonService.canMoveTo(currentTile, direction)) {
      const destination = this.dungeonService.getNeighborPosition(currentTile, direction);

      this.playerService.moveTo(destination.x, destination.y, direction);

      return;
    }

    if (this.explorationService.canExplore(currentTile, direction)) {
      this.explorationService.start(currentTile, direction);
    }
  }

  /**
   * Tuile actuellement occupée par le joueur.
   */
  get playerTile(): PlacedTile | undefined {
    const position = this.player.position;

    if (!position) {
      return undefined;
    }

    return this.dungeonService.getTileAt(position.x, position.y);
  }

  // ==========================================================
  // EXPLORATION
  // ==========================================================

  /**
   * Tuile actuellement piochée mais pas encore confirmée.
   *
   * ExplorationService reste la source de vérité de cet état.
   */
  get pendingTile(): PendingTilePlacement | null {
    return this.explorationService.pendingTile;
  }

  /**
   * Position logique à laquelle la tuile en attente
   * doit être présentée.
   */
  getPendingTilePosition(): { x: number; y: number } | null {
    return this.explorationService.getPendingTilePosition();
  }

  /**
   * Indique si une nouvelle tuile peut être explorée
   * depuis la direction demandée.
   */
  canExplore(tile: PlacedTile, direction: Direction): boolean {
    return this.explorationService.canExplore(tile, direction);
  }

  /**
   * Démarre une exploration depuis une tuile existante.
   *
   * La pioche et les règles de placement sont gérées
   * par ExplorationService.
   */
  explore(tile: PlacedTile, direction: Direction): void {
    this.explorationService.start(tile, direction);
  }

  /**
   * Fait pivoter la tuile actuellement en attente.
   */
  rotatePendingTile(): void {
    this.explorationService.rotatePendingTile();
  }

  /**
   * Vérifie si l'orientation actuelle permet de confirmer
   * le placement de la tuile.
   */
  isPendingTilePlacementValid(): boolean {
    return this.explorationService.isPendingTilePlacementValid();
  }

  /**
   * Confirme le placement de la tuile explorée puis déplace
   * le joueur sur cette nouvelle tuile.
   *
   * RÈGLE OFFICIELLE KARAK :
   *
   * lorsqu'un héros explore un secteur inexploré, il entre
   * sur la nouvelle tuile après son placement.
   *
   * Cette entrée constitue un déplacement et consomme donc
   * un mouvement du tour.
   */
  confirmPendingTile(): void {
    const pending = this.explorationService.pendingTile;

    if (!pending) {
      return;
    }

    /*
     * La direction doit être conservée avant la confirmation,
     * car celle-ci termine l'exploration et remet pendingTile à null.
     */
    const direction = pending.direction;

    const placedTile = this.explorationService.confirmPlacement();

    if (!placedTile) {
      return;
    }

    this.playerService.moveTo(placedTile.x, placedTile.y, direction);

    this.turnService.consumeMovement();
  }

  /**
   * Replace le héros face au joueur lorsque son animation
   * de déplacement est terminée.
   *
   * CHOIX D'IMPLÉMENTATION :
   *
   * l'orientation de repos n'est appliquée qu'à la fin de la
   * transition visuelle afin que le héros reste orienté dans
   * le sens de son déplacement pendant celui-ci.
   *
   * Le moteur de jeu ne dépend ainsi pas de la durée définie
   * dans le CSS.
   */
  onHeroMovementEnd(event: TransitionEvent): void {
    if (event.propertyName !== 'left' && event.propertyName !== 'top') {
      return;
    }

    this.playerService.face('south');
  }

  // ==========================================================
  // ACCÈS AU DONJON
  // ==========================================================
  //
  // Ces méthodes servent actuellement de relais vers
  // DungeonService.
  //
  // Elles sont conservées pendant cette passe de documentation.
  // Nous vérifierons séparément si Board en a encore réellement
  // besoin avant d'en supprimer certaines.
  // ==========================================================

  hasTileOpening(tile: PlacedTile, direction: Direction): boolean {
    return this.dungeonService.hasTileOpening(tile, direction);
  }

  getNeighborPosition(tile: PlacedTile, direction: Direction): { x: number; y: number } {
    return this.dungeonService.getNeighborPosition(tile, direction);
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

  // ==========================================================
  // OUTILS TEMPORAIRES DE DÉVELOPPEMENT
  // ==========================================================

  /**
   * Retourne un symbole permettant de visualiser rapidement
   * l'état d'une direction depuis la tuile sélectionnée.
   *
   * ✓ = une tuile connectée existe : déplacement possible
   * ? = aucune tuile : exploration possible
   * × = direction inaccessible
   *
   * CHOIX D'IMPLÉMENTATION :
   * cet affichage sert uniquement au développement du moteur.
   * Il sera remplacé par les interactions définitives du héros.
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
}
