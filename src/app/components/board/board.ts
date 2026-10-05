import { Component } from '@angular/core';
import { getPlayerUiConfig } from '../../constants/player-ui.constants';
import { getHeroDefinition } from '../../data/hero-definitions';
import { HeroDefinition } from '../../models/hero';
import { Player } from '../../models/player';
import { PlayerService } from '../../services/player.service';
import { DungeonService } from '../../services/dungeon.service';
import { TurnService } from '../../services/turn.service';
import { ExplorationService, PendingTilePlacement } from '../../services/exploration.service';
import { GameService } from '../../services/game.service';

import { Direction, PlacedTile, TileDefinition } from '../../models/tile';

/**
 * Joueur prêt à être représenté sur le plateau.
 */
interface BoardPlayerView {
  player: Player;
  playerIndex: number;
  label: string;
  color: string;
}

/**
 * Représentation visuelle d'une tuile occupée.
 *
 * Les coordonnées restent celles du donjon. Lorsqu'une tuile contient
 * plusieurs joueurs, un seul pion est affiché et les autres joueurs
 * deviennent des marqueurs légers.
 */
interface TileOccupancyView {
  key: string;
  x: number;
  y: number;
  primary: BoardPlayerView;
  markers: BoardPlayerView[];
}

/**
 * Position visuelle d'un marqueur autour d'une tuile.
 */
interface PlayerMarkerPosition {
  x: number;
  y: number;
}

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
    readonly gameService: GameService,
  ) {}

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

  /**
   * Les contrôles de déplacement existent déjà dans le prototype
   * du plateau, mais cette tranche doit uniquement stabiliser
   * l'affichage initial de l'aventure.
   *
   * Le drapeau permet donc de neutraliser temporairement les clics
   * de déplacement et d'exploration sans supprimer le code existant,
   * qui sera repris dans la tranche dédiée aux mouvements.
   */
  readonly movementControlsEnabled = false;

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
  // JOUEURS AFFICHÉS
  // ==========================================================

  /**
   * Joueurs réels de la partie.
   *
   * IMPORTANT :
   *
   * Board n'utilise plus PlayerService.player, qui reste un état
   * temporaire du prototype. Le plateau représente désormais les
   * participants préparés par le SETUP dans PlayerService.players.
   */
  get players(): readonly Player[] {
    return this.playerService.players;
  }

  /**
   * Joueurs pouvant être rendus sur le plateau.
   *
   * Un joueur devient visible lorsqu'il possède à la fois :
   *
   * - un héros tiré ;
   * - une position métier dans le donjon.
   */
  get boardPlayers(): readonly Player[] {
    return this.players.filter(
      (player) =>
        Boolean(player.heroId)
        && Boolean(player.position),
    );
  }

  /**
   * Regroupe les joueurs visibles par coordonnées de tuile.
   *
   * La représentation est recalculée depuis PlayerService.players
   * et GameService.activePlayerIndex à chaque lecture Angular :
   * un changement d'occupants ou de joueur actif modifie donc
   * automatiquement le pion principal et les marqueurs.
   */
  get tileOccupancies(): TileOccupancyView[] {
    const groups =
      new Map<string, BoardPlayerView[]>();

    for (
      let playerIndex = 0;
      playerIndex < this.players.length;
      playerIndex++
    ) {
      const player =
        this.players[playerIndex];

      if (
        !player.heroId
        || !player.position
      ) {
        continue;
      }

      const playerUi =
        getPlayerUiConfig(playerIndex);

      const view: BoardPlayerView = {
        player,
        playerIndex,
        label: playerUi.label,
        color: playerUi.color,
      };

      const key =
        this.getTileKey(
          player.position.x,
          player.position.y,
        );

      const group =
        groups.get(key) ?? [];

      group.push(view);
      groups.set(key, group);
    }

    return Array.from(
      groups.entries(),
    ).map(([key, occupants]) => {
      const primary =
        this.getPrimaryOccupant(
          occupants,
        );

      return {
        key,
        x: primary.player.position!.x,
        y: primary.player.position!.y,
        primary,
        markers:
          occupants.filter(
            (occupant) =>
              occupant.playerIndex
              !== primary.playerIndex,
          ),
      };
    });
  }

  /**
   * Définition statique du héros attribué au joueur.
   */
  getHeroDefinition(
    player: Player,
  ): HeroDefinition | undefined {
    if (!player.heroId) {
      return undefined;
    }

    return getHeroDefinition(
      player.heroId,
    );
  }

  /**
   * Asset du pion correspondant à l'orientation actuelle
   * du héros du joueur.
   */
  getHeroPawnImage(
    player: Player,
  ): string | undefined {
    if (!player.facing) {
      return undefined;
    }

    return this.getHeroDefinition(player)
      ?.pawn[player.facing];
  }

  /**
   * Indique si le joueur rendu est le joueur actif.
   */
  isActivePlayer(
    playerIndex: number,
  ): boolean {
    return (
      this.gameService.activePlayerIndex()
      === playerIndex
    );
  }

  /**
   * Retourne la position visuelle du marqueur autour de la tuile.
   *
   * Le marqueur peut légèrement dépasser de la tuile, mais ne modifie
   * jamais la position métier du joueur. Les positions sont distribuées
   * autour de la case pour rester lisibles lorsque plusieurs joueurs
   * partagent la même tuile.
   */
  getMarkerPosition(
    markerIndex: number,
    markerCount: number,
  ): PlayerMarkerPosition {
    const positionsByCount: Record<
      number,
      PlayerMarkerPosition[]
    > = {
      1: [
        { x: 82, y: 18 },
      ],
      2: [
        { x: 82, y: 18 },
        { x: 18, y: 82 },
      ],
      3: [
        { x: 82, y: 18 },
        { x: 90, y: 72 },
        { x: 18, y: 82 },
      ],
      4: [
        { x: 82, y: 18 },
        { x: 90, y: 72 },
        { x: 18, y: 82 },
        { x: 10, y: 28 },
      ],
    };

    return (
      positionsByCount[markerCount]?.[
        markerIndex
      ]
      ?? { x: 82, y: 18 }
    );
  }

  /**
   * Retourne le joueur dont le pion doit être affiché pour une tuile.
   *
   * Règle validée :
   *
   * - si le joueur actif est présent sur la tuile, son pion est affiché ;
   * - sinon, on parcourt virtuellement la rotation des prochains tours ;
   * - le premier occupant rencontré dans cette rotation porte le pion.
   */
  private getPrimaryOccupant(
    occupants: BoardPlayerView[],
  ): BoardPlayerView {
    const occupantIndexes =
      new Set(
        occupants.map(
          (occupant) =>
            occupant.playerIndex,
        ),
      );

    const turnOrder =
      this.gameService.getTurnOrderFrom();

    const primaryPlayerIndex =
      turnOrder.find(
        (playerIndex) =>
          occupantIndexes.has(playerIndex),
      );

    if (
      primaryPlayerIndex !== undefined
    ) {
      return occupants.find(
        (occupant) =>
          occupant.playerIndex
          === primaryPlayerIndex,
      )!;
    }

    return occupants[0];
  }

  /**
   * Construit une clé stable à partir des coordonnées métier.
   */
  private getTileKey(
    x: number,
    y: number,
  ): string {
    return `${x}:${y}`;
  }

  /**
   * Modifie uniquement la position du joueur prototype.
   *
   * Les déplacements réels des joueurs préparés par le SETUP
   * seront introduits dans une tranche dédiée. Tant que les
   * contrôles restent désactivés, cette méthode ne peut pas
   * modifier les coordonnées métier de PlayerService.players.
   */
  private movePrototypePlayerTo(
    x: number,
    y: number,
    direction: Direction,
  ): void {
    this.playerService.moveTo(
      x,
      y,
      direction,
    );
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
    if (!this.movementControlsEnabled) {
      return;
    }

    const player =
      this.gameService.activePlayer;

    const position = player?.position;

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

    this.movePrototypePlayerTo(destination.x, destination.y, direction);
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
    if (!this.movementControlsEnabled) {
      return;
    }

    const player =
      this.gameService.activePlayer;

    const position = player?.position;

    if (!position) {
      return;
    }

    const currentTile = this.dungeonService.getTileAt(position.x, position.y);

    if (!currentTile) {
      return;
    }

    if (this.dungeonService.canMoveTo(currentTile, direction)) {
      const destination = this.dungeonService.getNeighborPosition(currentTile, direction);

      this.movePrototypePlayerTo(destination.x, destination.y, direction);

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
    const player =
      this.gameService.activePlayer;

    const position = player?.position;

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

    this.movePrototypePlayerTo(placedTile.x, placedTile.y, direction);

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
