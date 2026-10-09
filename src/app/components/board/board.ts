import { Component, effect } from '@angular/core';
import { getPlayerUiConfig } from '../../constants/player-ui.constants';
import { getHeroDefinition } from '../../data/hero-definitions';
import { getTokenDefinition } from '../../data/token-definitions';
import { getEquipmentDefinition } from '../../data/equipment-definitions';
import { HeroDefinition } from '../../models/hero';
import { Player } from '../../models/player';
import { Direction, PlacedTile, TileDefinition } from '../../models/tile';
import { PlayerService } from '../../services/player.service';
import { DungeonService } from '../../services/dungeon.service';
import { TurnService } from '../../services/turn.service';
import { ExplorationService, PendingTilePlacement } from '../../services/exploration.service';
import { GameService, PendingReward } from '../../services/game.service';
import { CombatOverlay } from '../combat-overlay/combat-overlay';

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
 * un ou deux joueurs, leurs pions sont visibles. À partir de trois,
 * un seul pion reste visible et les autres deviennent des marqueurs.
 */
interface TileOccupancyView {
  key: string;
  x: number;
  y: number;
  primary: BoardPlayerView;
  displayedPlayers: BoardPlayerView[];
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
  imports: [CombatOverlay],
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
  ) {
    /*
     * Lorsqu'un nouveau joueur prend la main, la caméra
     * rejoint automatiquement sa position.
     *
     * L'effect observe activePlayerIndex(), qui est un signal.
     */
    effect(() => {
      this.gameService.activePlayerIndex();

      /*
       * Laisser Angular terminer la mise à jour du joueur actif
       * avant de calculer sa nouvelle position visuelle.
       */
      queueMicrotask(() => {
        this.centerOnActivePlayer();
      });
    });
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
  readonly tileSize = 144;

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

  /**
   * Les déplacements sont possibles uniquement :
   *
   * - s'il reste au moins un mouvement ;
   * - si aucun combat obligatoire n'attend sa résolution.
   */
  get movementControlsEnabled(): boolean {
    return this.turnService.canMove && !this.gameService.hasPendingTileResolution;
  }

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

  /**
   * Retourne l'image du jeton actuellement présent
   * sur une tuile du donjon.
   *
   * Les tuiles ne stockent que l'identifiant métier du jeton.
   * Les données statiques, notamment l'asset graphique,
   * restent centralisées dans TOKEN_DEFINITIONS.
   *
   * @returns l'asset du jeton lorsqu'un jeton est présent,
   * ou undefined lorsque la tuile est vide.
   */
  getTileTokenImage(tile: PlacedTile): string | undefined {
    if (!tile.tokenId) {
      return undefined;
    }

    const token = getTokenDefinition(tile.tokenId);
    if (!token) return undefined;
    if (tile.tokenFace !== 'back') return token.image;
    if (token.kind === 'treasure') {
      return token.backTokenId ? getTokenDefinition(token.backTokenId)?.image : token.image;
    }
    const equipmentReward = token.rewards?.find((reward) => reward.kind === 'equipment');
    if (equipmentReward?.kind === 'equipment') {
      return getEquipmentDefinition(equipmentReward.equipmentId)?.image ?? token.image;
    }
    return token.image;
  }

  /** Récompense actuellement proposée au joueur humain. */
  get humanPendingReward(): PendingReward | null {
    const pending = this.gameService.pendingReward();
    return pending?.player === this.gameService.activePlayer && pending.player.controller === 'human'
      ? pending
      : null;
  }

  /** Équipement récupérable, même si le monstre possède d'autres récompenses. */
  get pendingEquipment() {
    const pending = this.humanPendingReward;
    const reward = pending?.remainingRewards.find((item) => item.kind === 'equipment');
    return reward?.kind === 'equipment' ? getEquipmentDefinition(reward.equipmentId) : undefined;
  }

  /** Indique si la récupération est possible sans remplacer un objet existant. */
  get canCollectPendingEquipment(): boolean {
    const pending = this.humanPendingReward;
    const equipment = this.pendingEquipment;
    return !!pending && !!equipment && this.playerService.canAddEquipment(pending.player, equipment);
  }

  collectPendingEquipment(): void {
    if (!this.canCollectPendingEquipment) return;
    this.gameService.collectPendingEquipment();
  }

  /** La momie impose une décision concernant la malédiction. */
  get hasPendingCurse(): boolean {
    return this.humanPendingReward?.remainingRewards.some(
      reward => reward.kind === 'special' && reward.effect === 'curse',
    ) ?? false;
  }

  /** Joueurs pouvant recevoir la malédiction, hormis le vainqueur. */
  get curseTargets(): { player: Player; index: number }[] {
    const winner = this.humanPendingReward?.player;
    return winner
      ? this.players.flatMap((player, index) => player === winner ? [] : [{ player, index }])
      : [];
  }

  resolvePendingCurse(player: Player | null): void {
    if (!this.hasPendingCurse) return;
    this.gameService.resolvePendingCurse(player);
  }

  leavePendingReward(): void {
    if (!this.humanPendingReward) return;
    this.gameService.leavePendingReward();
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
    return this.players.filter((player) => Boolean(player.heroId) && Boolean(player.position));
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
    const groups = new Map<string, BoardPlayerView[]>();

    for (let playerIndex = 0; playerIndex < this.players.length; playerIndex++) {
      const player = this.players[playerIndex];

      if (!player.heroId || !player.position) {
        continue;
      }

      const playerUi = getPlayerUiConfig(playerIndex);

      const view: BoardPlayerView = {
        player,
        playerIndex,
        label: playerUi.label,
        color: playerUi.color,
      };

      const key = this.getTileKey(player.position.x, player.position.y);

      const group = groups.get(key) ?? [];

      group.push(view);
      groups.set(key, group);
    }

    return Array.from(groups.entries()).map(([key, occupants]) => {
      const primary = this.getPrimaryOccupant(occupants);

      return {
        key,
        x: primary.player.position!.x,
        y: primary.player.position!.y,
        primary,
        displayedPlayers: occupants.length <= 2 ? occupants : [primary],
        markers: occupants.length <= 2
          ? []
          : occupants.filter((occupant) => occupant.playerIndex !== primary.playerIndex),
      };
    });
  }

  /**
   * Définition statique du héros attribué au joueur.
   */
  getHeroDefinition(player: Player): HeroDefinition | undefined {
    if (!player.heroId) {
      return undefined;
    }

    return getHeroDefinition(player.heroId);
  }

  /**
   * Asset du pion correspondant à l'orientation actuelle
   * du héros du joueur.
   */
  getHeroPawnImage(player: Player): string | undefined {
    if (!player.facing) {
      return undefined;
    }

    return this.getHeroDefinition(player)?.pawn[player.facing];
  }

  /**
   * Indique si le joueur rendu est le joueur actif.
   */
  isActivePlayer(playerIndex: number): boolean {
    return this.gameService.activePlayerIndex() === playerIndex;
  }

  /**
   * Retourne la position visuelle du marqueur autour de la tuile.
   *
   * Le marqueur peut légèrement dépasser de la tuile, mais ne modifie
   * jamais la position métier du joueur. Les positions sont distribuées
   * autour de la case pour rester lisibles lorsque plusieurs joueurs
   * partagent la même tuile.
   */
  getMarkerPosition(markerIndex: number, markerCount: number): PlayerMarkerPosition {
    const positionsByCount: Record<number, PlayerMarkerPosition[]> = {
      1: [{ x: 82, y: 18 }],
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

    return positionsByCount[markerCount]?.[markerIndex] ?? { x: 82, y: 18 };
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
  private getPrimaryOccupant(occupants: BoardPlayerView[]): BoardPlayerView {
    const occupantIndexes = new Set(occupants.map((occupant) => occupant.playerIndex));

    const turnOrder = this.gameService.getTurnOrderFrom();

    const primaryPlayerIndex = turnOrder.find((playerIndex) => occupantIndexes.has(playerIndex));

    if (primaryPlayerIndex !== undefined) {
      return occupants.find((occupant) => occupant.playerIndex === primaryPlayerIndex)!;
    }

    return occupants[0];
  }

  /**
   * Construit une clé stable à partir des coordonnées métier.
   */
  private getTileKey(x: number, y: number): string {
    return `${x}:${y}`;
  }

  /**
   * Déplace le joueur actuellement actif.
   *
   * GameService reste la source de vérité permettant
   * d'identifier le joueur dont c'est réellement le tour.
   *
   * PlayerService applique ensuite la nouvelle position.
   */
  private moveActivePlayerTo(x: number, y: number, direction: Direction): boolean {
    const player = this.gameService.activePlayer;

    if (!player || !this.turnService.canMove) {
      return false;
    }

    this.playerService.movePlayerTo(player, x, y, direction);

    /*
     * Le pion regarde dans la direction de son déplacement
     * pendant l'animation, puis revient face au joueur.
     */
    window.setTimeout(() => {
      this.playerService.facePlayer(player, 'south');
    }, 450);

    /*
     * La caméra accompagne le héros vers sa nouvelle case.
     */
    this.centerOnPosition(x, y);

    return true;
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
   * Indique si la caméra doit actuellement effectuer
   * un déplacement animé.
   *
   * Le drag manuel désactive immédiatement cette animation
   * afin que la caméra reste sous le contrôle du joueur.
   */
  cameraTransitionEnabled = false;

  /**
   * Recentre progressivement la caméra sur une position
   * logique du donjon.
   *
   * Les coordonnées x/y appartiennent au moteur de jeu.
   * La conversion en pixels reste donc confinée au Board.
   */
  private centerOnPosition(x: number, y: number): void {
    this.cameraTransitionEnabled = true;

    this.offsetX = -x * this.tileSize;
    this.offsetY = -y * this.tileSize;
  }

  /**
   * Recentre la caméra sur le joueur dont c'est actuellement
   * le tour.
   */
  centerOnActivePlayer(): void {
    const position = this.gameService.activePlayer?.position;

    if (!position) {
      return;
    }

    this.centerOnPosition(position.x, position.y);
  }

  /**
   * Recentre la caméra sur la tuile de départ.
   *
   * La tuile de départ possède toujours les coordonnées
   * logiques (0, 0).
   */
  centerOnStartTile(): void {
    this.centerOnPosition(0, 0);
  }

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

    /*
     * Dès que le joueur reprend la caméra manuellement,
     * toute transition automatique est interrompue.
     */
    this.cameraTransitionEnabled = false;

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
   * Termine volontairement le tour du joueur actif.
   *
   * Le joueur peut renoncer aux mouvements qu'il lui reste.
   *
   * Une exploration déjà commencée doit toutefois être
   * confirmée avant de pouvoir terminer le tour.
   */
  endTurn(): void {
    if (!this.canControlActivePlayer) {
      return;
    }

    if (this.pendingTile) {
      return;
    }

    this.gameService.endTurn();
  }

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

    if (!this.canControlActivePlayer) {
      return;
    }

    const player = this.gameService.activePlayer;

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

    const destinationTile = this.dungeonService.getTileAt(destination.x, destination.y);

    if (!destinationTile) {
      return;
    }

    if (this.moveActivePlayerTo(destination.x, destination.y, direction)) {
      this.gameService.resolveTileEntry(player, currentTile, destinationTile);
      this.consumePlayerMovement();
    }
  }

  /**
   * Consomme un déplacement du joueur humain.
   *
   * Après le quatrième déplacement, le tour se termine
   * automatiquement uniquement lorsqu'aucune résolution
   * obligatoire ne doit encore avoir lieu.
   */
  private consumePlayerMovement(): void {
    this.turnService.consumeMovement();

    if (!this.turnService.canMove && !this.gameService.hasPendingTileResolution) {
      this.gameService.endTurn();
    }
  }

  /**
   * Exécute l'action disponible dans une direction depuis
   * la tuile actuellement occupée par le joueur.
   *
   * Trois situations sont possibles :
   *
   * 1. une exploration est déjà en cours :
   *    la même tuile piochée change simplement d'emplacement ;
   *
   * 2. une tuile connectée existe :
   *    le héros s'y déplace ;
   *
   * 3. une sortie inexplorée existe :
   *    une nouvelle exploration commence.
   */
  handlePlayerDirection(direction: Direction): void {
    if (!this.movementControlsEnabled) {
      return;
    }

    if (!this.canControlActivePlayer) {
      return;
    }

    const player = this.gameService.activePlayer;
    const position = player?.position;

    if (!position) {
      return;
    }

    const currentTile = this.dungeonService.getTileAt(position.x, position.y);

    if (!currentTile) {
      return;
    }

    /*
     * Une tuile est déjà en attente.
     *
     * Le joueur change uniquement l'endroit où il envisage
     * de la poser. Aucune nouvelle tuile n'est piochée.
     */
    if (this.explorationService.pendingTile) {
      this.explorationService.changePendingDirection(direction);
      return;
    }

    /*
     * Déplacement dans une partie déjà explorée du donjon.
     */
    if (this.dungeonService.canMoveTo(currentTile, direction)) {
      const destination = this.dungeonService.getNeighborPosition(currentTile, direction);

      const destinationTile = this.dungeonService.getTileAt(destination.x, destination.y);

      if (!destinationTile) {
        return;
      }

      if (this.moveActivePlayerTo(destination.x, destination.y, direction)) {
        this.gameService.resolveTileEntry(player, currentTile, destinationTile);
        this.consumePlayerMovement();
      }

      return;
    }

    /*
     * Exploration d'un nouveau secteur.
     */
    if (this.explorationService.canExplore(currentTile, direction)) {
      this.explorationService.start(currentTile, direction);
    }
  }

  /**
   * Indique si le joueur actif peut être contrôlé
   * manuellement depuis le plateau.
   *
   * Les joueurs IA utiliseront ultérieurement leur propre
   * moteur de décision et ne doivent jamais exposer
   * les commandes destinées à un joueur humain.
   */
  get canControlActivePlayer(): boolean {
    return this.gameService.activePlayer?.controller === 'human';
  }

  /**
   * Tuile actuellement occupée par le joueur.
   */
  get playerTile(): PlacedTile | undefined {
    const player = this.gameService.activePlayer;

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
   * Indique si une direction doit être proposée au joueur.
   *
   * Lorsqu'une exploration est en attente, seules les sorties
   * encore inexplorées peuvent recevoir la tuile déjà piochée.
   *
   * En temps normal, une direction est disponible lorsqu'elle
   * permet soit un déplacement, soit une exploration.
   */
  canUseDirection(tile: PlacedTile, direction: Direction): boolean {
    if (this.pendingTile) {
      return this.canExplore(tile, direction);
    }

    return this.canMoveTo(tile, direction) || this.canExplore(tile, direction);
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
   * Confirme une exploration puis résout l'entrée du héros
   * sur la nouvelle tuile dans l'ordre du manuel.
   *
   * ORDRE :
   *
   * 1. placement de la tuile ;
   * 2. entrée du héros ;
   * 3. révélation éventuelle du contenu de la salle ;
   * 4. déclenchement éventuel du combat obligatoire ;
   * 5. consommation du mouvement ;
   * 6. fin automatique du tour uniquement si aucune
   *    résolution obligatoire ne reste en attente.
   */
  confirmPendingTile(): void {
    const pending = this.explorationService.pendingTile;

    if (!pending) {
      return;
    }

    const direction = pending.direction;
    const sourceTile = pending.sourceTile;

    const placedTile = this.explorationService.confirmPlacement();

    if (!placedTile) {
      return;
    }

    const player = this.gameService.activePlayer;

    if (!player) {
      return;
    }

    const playerEntered = this.moveActivePlayerTo(placedTile.x, placedTile.y, direction);

    if (!playerEntered) {
      return;
    }

    /*
     * L'entrée sur la nouvelle tuile est résolue par le même
     * mécanisme que lors d'un déplacement dans le donjon déjà
     * exploré. La salle venant d'être découverte, son contenu
     * doit d'abord être révélé.
     */
    this.gameService.resolveTileEntry(player, sourceTile, placedTile, true);

    /*
     * Le déplacement ayant permis d'entrer dans la salle
     * compte bien parmi les quatre déplacements du tour.
     */
    this.consumePlayerMovement();
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
