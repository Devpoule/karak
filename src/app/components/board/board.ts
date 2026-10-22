import { Component, effect, HostListener, signal } from '@angular/core';
import { getPlayerUiConfig } from '../../constants/player-ui.constants';
import { getHeroDefinition } from '../../data/hero-definitions';
import { getTokenDefinition } from '../../data/token-definitions';
import { getEquipmentDefinition } from '../../data/equipment-definitions';
import { HeroDefinition, HeroPowerDefinition } from '../../models/hero';
import { Equipment } from '../../models/equipment';
import { Player } from '../../models/player';
import { DIRECTIONS, Direction, PlacedTile, TileDefinition } from '../../models/tile';
import { PlayerService } from '../../services/player.service';
import { DungeonService } from '../../services/dungeon.service';
import { TurnService } from '../../services/turn.service';
import { ExplorationService, PendingTilePlacement } from '../../services/exploration.service';
import { GameService, PendingGroundEquipment, PendingReward, PendingTreasure } from '../../services/game.service';
import { CombatService } from '../../services/combat.service';
import { TREASURE_POINTS, Treasure } from '../../models/treasure';
import { CombatOverlay } from '../combat-overlay/combat-overlay';
import { HeroPowerCard, HeroPowerCardChoice } from '../hero-power-card/hero-power-card';
import { QuantityPipe } from '../../pipes/quantity.pipe';
import { DecisionCard, DecisionCardAction } from '../decision-card/decision-card';

/**
 * Joueur prêt à être représenté sur le plateau.
 */
interface BoardPlayerView {
  player: Player;
  playerIndex: number;
  label: string;
  color: string;
}

interface PowerAnnouncement {
  hero: HeroDefinition;
  power: HeroPowerDefinition;
  message: string;
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
  imports: [CombatOverlay, HeroPowerCard, DecisionCard, QuantityPipe],
  templateUrl: './board.html',
  styleUrl: './board.scss',
})
export class Board {
  readonly powerAnnouncement = signal<PowerAnnouncement | null>(null);
  private announcementTimer: number | null = null;
  private observedSubstitutionRevision = 0;
  private observedHoranReincarnationRevision = 0;
  private observedAstralWalkRevision = 0;
  private observedTokenChoice: unknown = null;
  constructor(
    private readonly dungeonService: DungeonService,
    private readonly explorationService: ExplorationService,
    private readonly playerService: PlayerService,
    private readonly turnService: TurnService,
    readonly combatService: CombatService,
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

    effect(() => {
      const destination = this.gameService.healingPortalSelection()?.destination
        ?? this.gameService.horanReincarnationSelection()?.destination;
      queueMicrotask(() => {
        if (destination) this.centerOnPosition(destination.x, destination.y);
        else this.centerOnActivePlayer();
      });
    });

    effect(() => {
      const revision = this.gameService.xanrosSubstitutionRevision();
      if (revision > this.observedSubstitutionRevision) {
        const player = this.gameService.lastXanrosSubstitutionPlayer();
        const hero = player?.heroId ? getHeroDefinition(player.heroId) : undefined;
        const power = hero?.powers.find(candidate => candidate.id === 'substitution');
        if (hero && power) this.showPowerAnnouncement(hero, power, `${hero.name} utilise Substitution.`);
      }
      this.observedSubstitutionRevision = revision;
    });

    effect(() => {
      const choice = this.gameService.pendingTokenChoice();
      if (choice && choice.player.controller === 'ai' && choice !== this.observedTokenChoice) {
        const hero = choice.player.heroId ? getHeroDefinition(choice.player.heroId) : undefined;
        const power = hero?.powers.find(candidate => candidate.id === 'fate-weaver');
        if (hero && power) this.showPowerAnnouncement(hero, power, `${hero.name} utilise Tisseuse de destin.`);
      }
      this.observedTokenChoice = choice;
    });

    effect(() => {
      const revision = this.gameService.horanReincarnationRevision();
      if (revision > this.observedHoranReincarnationRevision) {
        const player = this.gameService.lastHoranReincarnationPlayer();
        const hero = player?.heroId ? getHeroDefinition(player.heroId) : undefined;
        const power = hero?.powers.find(candidate => candidate.id === 'reincarnation');
        if (hero && power) this.showPowerAnnouncement(hero, power, `${hero.name} revient à la vie grâce à Réincarnation.`);
      }
      this.observedHoranReincarnationRevision = revision;
    });

    effect(() => {
      const revision = this.gameService.astralWalkRevision();
      if (revision > this.observedAstralWalkRevision) {
        const player = this.gameService.lastAstralWalkPlayer();
        const hero = player?.heroId ? getHeroDefinition(player.heroId) : undefined;
        const power = hero?.powers.find(candidate => candidate.id === 'astral-walk');
        if (hero && power) this.showPowerAnnouncement(hero, power, `${hero.name} utilise Marche astrale.`);
      }
      this.observedAstralWalkRevision = revision;
    });
  }

  /** Affiche une annonce sans modifier la décision métier existante. */
  private showPowerAnnouncement(hero: HeroDefinition, power: HeroPowerDefinition, message: string): void {
    if (this.announcementTimer !== null) window.clearTimeout(this.announcementTimer);
    this.powerAnnouncement.set({ hero, power, message });
    this.announcementTimer = window.setTimeout(() => {
      this.powerAnnouncement.set(null);
      this.announcementTimer = null;
    }, 3500);
  }

  get healingPortalSelection() {
    return this.gameService.healingPortalSelection();
  }

  get horanReincarnationSelection() {
    return this.gameService.horanReincarnationSelection();
  }

  /** Prépare les deux jetons de Tisseuse de destin pour la carte unique. */
  get fateWeaverChoices(): readonly HeroPowerCardChoice[] {
    const choice = this.gameService.pendingTokenChoice();
    return choice?.tokens.map(token => ({ label: token.id, image: token.image, alt: token.id })) ?? [];
  }

  /** Prépare les fontaines éligibles déjà calculées par le service métier. */
  get horanReincarnationChoices(): readonly HeroPowerCardChoice[] {
    return this.healingFountains.map((fountain, index) => {
      const definition = this.getTileDefinition(fountain);
      return {
        label: `Fontaine ${index + 1} · (${fountain.x}, ${fountain.y})`,
        image: definition?.image ?? '',
        alt: `Fontaine d’eau curative ${index + 1}`,
      };
    });
  }

  /** Sélectionne puis confirme une fontaine sans dupliquer les règles métier. */
  chooseHoranReincarnationDestination(index: number): void {
    const fountain = this.healingFountains[index];
    if (!fountain || !this.horanReincarnationSelection) return;
    this.gameService.selectHoranReincarnationDestination(fountain);
    this.gameService.confirmHoranReincarnation();
  }

  /** Prépare les cibles autorisées par les gardes métier de Substitution. */
  get xanrosSubstitutionChoices(): readonly HeroPowerCardChoice[] {
    return this.gameService.xanrosSubstitutionTargets.map((target) => {
      const hero = target.heroId ? getHeroDefinition(target.heroId) : undefined;
      return {
        label: hero?.name ?? 'Héros',
        image: hero?.character ?? '',
        alt: hero?.name ?? 'Héros disponible',
      };
    });
  }

  /** Retourne la cible métier correspondant à l'index affiché par la carte. */
  getXanrosSubstitutionTarget(index: number): Player | undefined {
    return this.gameService.xanrosSubstitutionTargets[index];
  }

  get portalTravelSelection() {
    return this.gameService.portalTravelSelection();
  }

  get healingFountains(): readonly PlacedTile[] { return this.gameService.getHealingFountains(); }

  get canUseHealingFountain(): boolean { return this.gameService.canUseHealingFountain; }

  get canUsePortalTravel(): boolean {
    return this.gameService.canUsePortalTravel(this.gameService.activePlayer);
  }

  isActivePlayerOnTile(tile: PlacedTile): boolean {
    const position = this.gameService.activePlayer?.position;
    return position?.x === tile.x && position?.y === tile.y;
  }

  useHealingFountain(event: Event): void {
    event.stopPropagation();
    this.gameService.useHealingFountain();
  }

  get healingPortalImage(): string {
    return getEquipmentDefinition('heart')?.image ?? '';
  }

  /** Actions de la carte unique de sélection du Portail de guérison. */
  get healingPortalActions(): readonly DecisionCardAction[] {
    const selection = this.healingPortalSelection;
    if (!selection) return [];
    const fountains = this.healingFountains;
    return [
      ...this.playerService.players.map(player => ({
        label: `Cibler ${player.heroId ? getHeroDefinition(player.heroId)?.name ?? 'le héros' : 'le héros'}`,
        kind: player === selection.target ? 'primary' as const : 'secondary' as const,
      })),
      ...fountains.map((_, index) => ({
        label: `Fontaine ${index + 1}`,
        kind: index === fountains.indexOf(selection.destination!) ? 'primary' as const : 'secondary' as const,
      })),
      { label: 'Utiliser le portail', kind: 'primary', disabled: !selection.target || !selection.destination },
      { label: 'Annuler' },
    ];
  }

  get healingPortalTargetLabel(): string {
    const heroId = this.healingPortalSelection?.target?.heroId;
    return heroId ? getHeroDefinition(heroId)?.name ?? 'aucun héros' : 'aucun héros';
  }

  /** Applique un choix d'interface en réutilisant les gardes de GameService. */
  resolveHealingPortalAction(index: number): void {
    const selection = this.healingPortalSelection;
    if (!selection) return;
    const players = this.playerService.players;
    const fountains = this.healingFountains;
    if (index < players.length) {
      this.gameService.selectHealingPortalTarget(players[index]);
      return;
    }
    const fountainIndex = index - players.length;
    if (fountainIndex < fountains.length) {
      this.gameService.selectHealingPortalDestination(fountains[fountainIndex]);
      return;
    }
    if (fountainIndex === fountains.length) {
      this.confirmHealingPortal();
      return;
    }
    this.gameService.closeHealingPortalSelection();
  }

/** Gere healingPortalControlLeft et applique les gardes necessaires avant mutation. */
  healingPortalControlLeft(tile: PlacedTile | null | undefined): number {
    return this.mapCenterInPixels + (tile?.x ?? 0) * this.tileSize;
  }

/** Gere healingPortalControlTop et applique les gardes necessaires avant mutation. */
  healingPortalControlTop(tile: PlacedTile | null | undefined): number {
    return this.mapCenterInPixels + (tile?.y ?? 0) * this.tileSize - this.tileSize * 0.75;
  }

/** Gere confirmHealingPortal et applique les gardes necessaires avant mutation. */
  confirmHealingPortal(): void {
    const selection = this.healingPortalSelection;
    if (selection?.target && selection.destination && this.gameService.useHealingPortal(selection.target, selection.destination)) {
      this.gameService.closeHealingPortalSelection();
    }
  }

/** Gere handleTileClick et applique les gardes necessaires avant mutation. */
  handleTileClick(tile: PlacedTile): void {
    if (this.portalTravelSelection) {
      this.gameService.selectPortalTravelDestination(tile);
      this.centerOnPosition(tile.x, tile.y);
      return;
    }
    if (this.gameService.canUsePortalTravel(this.gameService.activePlayer)
      && this.gameService.getPortalTiles().includes(tile)) {
      this.gameService.openPortalTravelSelection();
      this.gameService.selectPortalTravelDestination(tile);
      this.centerOnPosition(tile.x, tile.y);
      return;
    }
    if (this.horanReincarnationSelection) {
      this.gameService.selectHoranReincarnationDestination(tile);
      this.centerOnPosition(tile.x, tile.y);
      return;
    }
    if (this.healingPortalSelection) {
      this.gameService.selectHealingPortalDestination(tile);
      this.centerOnPosition(tile.x, tile.y);
      return;
    }

    if (this.gameService.canResolveXanrosSubstitutionAction) {
      this.gameService.openXanrosSubstitutionChest(tile);
    }
  }

/** Gere confirmXanrosSubstitution et applique les gardes necessaires avant mutation. */
  confirmXanrosSubstitution(target: Player): void {
    if (this.gameService.confirmXanrosSubstitution(target)) this.centerOnActivePlayer();
  }

/** Gere finishXanrosSubstitutionAction et applique les gardes necessaires avant mutation. */
  finishXanrosSubstitutionAction(): void {
    this.gameService.finishXanrosSubstitutionAction();
  }

/** Gere moveHealingPortalSelection et applique les gardes necessaires avant mutation. */
  moveHealingPortalSelection(step: 1 | -1): void {
    if (!this.healingPortalSelection) return;
    this.gameService.moveHealingPortalSelection(step);
    const destination = this.gameService.healingPortalSelection()?.destination;
    if (destination) this.centerOnPosition(destination.x, destination.y);
  }

/** Gere moveHoranReincarnationSelection et applique les gardes necessaires avant mutation. */
  moveHoranReincarnationSelection(step: 1 | -1): void {
    if (!this.horanReincarnationSelection) return;
    this.gameService.moveHoranReincarnationSelection(step);
    const destination = this.gameService.horanReincarnationSelection()?.destination;
    if (destination) this.centerOnPosition(destination.x, destination.y);
  }

/** Gere confirmHoranReincarnation et applique les gardes necessaires avant mutation. */
  confirmHoranReincarnation(): void {
    this.gameService.confirmHoranReincarnation();
  }

/** Gere handleHealingPortalKeyboard et applique les gardes necessaires avant mutation. */
  @HostListener('window:keydown', ['$event'])
  handleHealingPortalKeyboard(event: KeyboardEvent): void {
    if (this.combatService.hasPendingCombat) {
      if (['ArrowLeft', 'ArrowRight', 'Enter', 'Escape'].includes(event.key)) {
        event.preventDefault();
        event.stopPropagation();
      }
      return;
    }
    if (this.horanReincarnationSelection) {
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        this.gameService.moveHoranReincarnationSelection(1);
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        this.gameService.moveHoranReincarnationSelection(-1);
      } else if (event.key === 'Enter') {
        event.preventDefault();
        this.gameService.confirmHoranReincarnation();
      }
      const destination = this.gameService.horanReincarnationSelection()?.destination;
      if (destination) this.centerOnPosition(destination.x, destination.y);
      return;
    }

    if (!this.healingPortalSelection) return;
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.moveHealingPortalSelection(1);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.moveHealingPortalSelection(-1);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.gameService.closeHealingPortalSelection();
    }
    const destination = this.gameService.healingPortalSelection()?.destination;
    if (destination) this.centerOnPosition(destination.x, destination.y);
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
    return !this.combatService.hasPendingCombat
      && this.gameService.canPerformNormalMovement(this.gameService.activePlayer);
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
    const remainingRewards = this.gameService.getRemainingMonsterRewards(tile);
    if (remainingRewards.length === 0) return undefined;
    const equipmentReward = remainingRewards.find((reward) => reward.kind === 'equipment');
    if (equipmentReward?.kind === 'equipment') {
      return getEquipmentDefinition(equipmentReward.equipmentId)?.image ?? token.image;
    }
    return token.image;
  }

  /** Fournit un libellé accessible correspondant à la face du jeton visible. */
  getTileTokenAlt(tile: PlacedTile): string {
    if (!tile.tokenId) return '';
    const token = getTokenDefinition(tile.tokenId);
    if (!token) return 'Jeton inconnu';
    if (tile.tokenFace !== 'back') {
      return token.kind === 'monster'
        ? token.name
        : token.id === 'closed-chest' ? 'Coffre fermé' : 'Trésor';
    }
    return token.kind === 'monster' ? `Récompense de ${token.name}` : 'Coffre ouvert';
  }

  /** Récompense actuellement proposée au joueur humain. */
  get humanPendingReward(): PendingReward | null {
    const pending = this.gameService.pendingReward();
    return pending?.player === this.gameService.activePlayer && pending.player.controller === 'human'
      ? pending
      : null;
  }

  /** Expose la définition d'un jeton au template sans déplacer la logique métier. */
  getTokenDefinition(tokenId: string) {
    return getTokenDefinition(tokenId);
  }

  /** Coffre en attente appartenant au joueur humain actif. */
  get humanPendingTreasure(): PendingTreasure | null {
    const pending = this.gameService.pendingTreasure();
    return pending?.player === this.gameService.activePlayer
      && pending.player.controller === 'human'
      ? pending
      : null;
  }

  /** L'action est affichée uniquement si la clé est encore présente. */
  get canOpenPendingTreasure(): boolean {
    const pending = this.humanPendingTreasure;
    return pending?.treasure.id === 'closed-chest'
      && pending.treasureTile.tokenId === 'closed-chest'
      && pending.player.inventory.key !== null;
  }

  /** Actions autorisées par l'état métier du coffre actuellement présenté. */
  get pendingTreasureActions(): readonly DecisionCardAction[] {
    return [
      { label: 'Ouvrir le coffre', kind: 'primary', disabled: !this.canOpenPendingTreasure },
      { label: this.gameService.isOptionalXanrosTreasure ? 'Ne pas ouvrir' : 'Continuer' },
    ];
  }

  /** Objet au sol nécessitant une décision humaine. */
  get humanPendingGroundEquipment(): PendingGroundEquipment | null {
    const pending = this.gameService.pendingGroundEquipment();
    return pending?.player === this.gameService.activePlayer && pending.player.controller === 'human' ? pending : null;
  }

  /** Actions de récupération, remplacement ou abandon de l'objet au sol. */
  get pendingGroundEquipmentActions(): readonly DecisionCardAction[] {
    const pending = this.humanPendingGroundEquipment;
    if (!pending) return [];
    const actions: DecisionCardAction[] = [];
    if (this.playerService.canAddEquipment(pending.player, pending.equipment)) {
      actions.push({ label: 'Récupérer', kind: 'primary' });
    } else {
      const slots = pending.equipment.kind === 'weapon' ? 2 : pending.equipment.kind === 'spell' ? 3 : 1;
      for (let index = 0; index < slots; index++) {
        if (this.playerService.canReplaceEquipment(pending.player, pending.equipment, index)) {
          actions.push({ label: `Remplacer l’emplacement ${index + 1}`, kind: 'primary' });
        }
      }
    }
    actions.push({ label: 'Laisser sur la tuile' });
    return actions;
  }

  /** Résout le choix d'équipement via les opérations métier existantes. */
  resolvePendingGroundEquipmentAction(index: number): void {
    const pending = this.humanPendingGroundEquipment;
    if (!pending) return;
    if (this.playerService.canAddEquipment(pending.player, pending.equipment)) {
      if (index === 0) this.gameService.collectGroundEquipment();
      else this.gameService.leaveGroundEquipment();
      return;
    }
    const slots = pending.equipment.kind === 'weapon' ? 2 : pending.equipment.kind === 'spell' ? 3 : 1;
    const validSlots = Array.from({ length: slots }, (_, slot) => slot)
      .filter(slot => this.playerService.canReplaceEquipment(pending.player, pending.equipment, slot));
    if (index < validSlots.length) this.gameService.replaceGroundEquipment(validSlots[index]);
    else this.gameService.leaveGroundEquipment();
  }

  /** Exécute l'action du coffre sans dupliquer les gardes du service métier. */
  resolvePendingTreasureAction(index: number): void {
    if (index === 0) this.openPendingTreasure();
    else if (this.gameService.isOptionalXanrosTreasure) this.declineOptionalXanrosTreasure();
    else this.declinePendingTreasure();
  }

/** Gere openPendingTreasure et applique les gardes necessaires avant mutation. */
  openPendingTreasure(): void {
    if (this.canOpenPendingTreasure) {
      this.gameService.openPendingTreasure();
    }
  }

/** Gere declinePendingTreasure et applique les gardes necessaires avant mutation. */
  declinePendingTreasure(): void {
    this.gameService.declinePendingTreasure();
  }

/** Gere declineOptionalXanrosTreasure et applique les gardes necessaires avant mutation. */
  declineOptionalXanrosTreasure(): void {
    this.gameService.declineOptionalXanrosTreasure();
  }

  get humanPendingXanrosSubstitutionAction() {
    const pending = this.gameService.pendingXanrosSubstitutionAction();
    return pending?.player === this.gameService.activePlayer
      && pending.player.controller === 'human'
      && this.gameService.healingPortalSelection() === null
      ? pending
      : null;
  }

  /** Récompense trésor actuellement proposée après un combat. */
  get pendingTreasureReward() {
    const pending = this.humanPendingReward;
    const reward = pending?.remainingRewards.find(item => item.kind === 'treasure');
    return reward?.kind === 'treasure' ? reward : undefined;
  }

  get pendingTreasureRewardPoints(): number {
    const reward = this.pendingTreasureReward;
    if (!reward) return 0;
    const treasure: Treasure = reward.tokenId === 'open-chest'
      ? 'monster-treasure'
      : 'dragon-ruby';
    return TREASURE_POINTS[treasure];
  }

  /** Décrit la résolution de récompense visible dans la carte unifiée. */
  get pendingRewardDescription(): string {
    if (this.hasPendingCurse) return 'Choisissez le héros qui recevra la malédiction.';
    return `Récompense de combat : ${this.pendingTreasureRewardPoints} point${this.pendingTreasureRewardPoints > 1 ? 's' : ''}.`;
  }

  /** Construit les actions à partir des choix déjà exposés par le domaine. */
  get pendingRewardActions(): readonly DecisionCardAction[] {
    const actions: DecisionCardAction[] = [];
    if (this.pendingTreasureReward) actions.push({ label: 'Récupérer le trésor', kind: 'primary' });
    if (this.hasPendingCurse) {
      this.curseTargets.forEach(target => actions.push({
        label: `J${target.index + 1} — ${this.getHeroDefinition(target.player)?.name ?? 'Héros'}`,
      }));
      if (this.gameService.cursedPlayer) actions.push({ label: 'Laisser la malédiction à son détenteur actuel' });
    } else {
      actions.push({ label: 'Laisser sur la tuile' });
    }
    return actions;
  }

  /** Traduit l'action visuelle en appel métier unique. */
  resolvePendingRewardAction(index: number): void {
    if (this.pendingTreasureReward) {
      if (index === 0) { this.collectPendingTreasure(); return; }
      index -= 1;
    }
    if (this.hasPendingCurse) {
      const target = this.curseTargets[index];
      if (target) { this.resolvePendingCurse(target.player); return; }
      if (this.gameService.cursedPlayer && index === this.curseTargets.length) {
        this.resolvePendingCurse(null);
      }
      return;
    }
    if (index === 0) this.leavePendingReward();
  }

/** Gere collectPendingTreasure et applique les gardes necessaires avant mutation. */
  collectPendingTreasure(): void {
    if (this.pendingTreasureReward) {
      this.gameService.collectPendingTreasure();
    }
  }

  /** Un équipement au sol est sélectionnable uniquement sur la tuile du héros actif. */
  canSelectGroundEquipment(tile: PlacedTile): boolean {
    const player = this.gameService.activePlayer;
    return this.gameService.phase() === 'playing'
      && player?.controller === 'human'
      && player.position?.x === tile.x && player.position?.y === tile.y
      && !this.gameService.turnTransitionPending()
      && (!this.gameService.hasPendingTileResolution || this.gameService.canResolveXanrosSubstitutionAction)
      && !this.explorationService.pendingTile;
  }

  /** Ouvre le choix de récupération pour l'objet sélectionné. */
  selectGroundEquipment(tile: PlacedTile, index: number): void {
    if (!this.canSelectGroundEquipment(tile)) return;
    this.gameService.offerGroundEquipmentAt(tile, index);
  }

/** Gere getGroundEquipment et applique les gardes necessaires avant mutation. */
  getGroundEquipment(tile: PlacedTile): readonly Equipment[] {
    return this.gameService.getGroundEquipment(tile);
  }

  /** La momie impose une décision concernant la malédiction. */
  get hasPendingCurse(): boolean {
    return this.humanPendingReward?.remainingRewards.some(
      reward => reward.kind === 'special' && reward.effect === 'curse',
    ) ?? false;
  }

  /** Joueurs pouvant recevoir la malédiction, hormis le vainqueur. */
  get curseTargets(): { player: Player; index: number }[] {
    return this.gameService.getPendingCurseTargets().map(player => ({
      player,
      index: this.players.indexOf(player),
    }));
  }

/** Gere resolvePendingCurse et applique les gardes necessaires avant mutation. */
  resolvePendingCurse(player: Player | null): void {
    if (!this.hasPendingCurse) return;
    this.gameService.resolvePendingCurse(player);
  }

/** Gere leavePendingReward et applique les gardes necessaires avant mutation. */
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

  /** Fournit le pouvoir précis présenté par une décision facultative. */
  getHeroPower(player: Player, powerId: 'sneak' | 'fate-weaver' | 'substitution' | 'reincarnation') {
    return this.getHeroDefinition(player)?.powers.find(power => power.id === powerId);
  }

  /**
   * Asset du pion correspondant à l'orientation actuelle
   * du héros du joueur.
   */
  getHeroPawnImage(player: Player): string | undefined {
    const hero = this.getHeroDefinition(player);
    if (!hero) {
      return undefined;
    }

    const facing = DIRECTIONS.includes(player.facing as Direction) ? player.facing as Direction : 'south';
    return hero.pawn[facing];
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

    if (!player || !this.gameService.canPerformNormalMovementTo(player, x, y)) {
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
    if (this.combatService.hasPendingCombat) return;
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
    if (this.combatService.hasPendingCombat) return;
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
    if (this.combatService.hasPendingCombat) return;
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
    if (this.combatService.hasPendingCombat || !this.isDragging) {
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
   * Le déplacement n'est effectué que vers une tuile existante
   * autorisée par la validation métier commune.
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

    if (!this.canMoveTo(currentTile, direction)) {
      return;
    }

    const destination = this.dungeonService.getNeighborPosition(currentTile, direction);

    const destinationTile = this.dungeonService.getTileAt(destination.x, destination.y);

    if (!destinationTile) {
      return;
    }

    if (this.moveActivePlayerTo(destination.x, destination.y, direction)) {
      this.consumePlayerMovement();
      this.gameService.recordAstralWalkIfUsed(player, currentTile, destinationTile);
      this.gameService.resolveTileEntry(player, currentTile, destinationTile, false, true);
      this.finishPlayerMovement();
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
  }

/** Gere finishPlayerMovement et applique les gardes necessaires avant mutation. */
  private finishPlayerMovement(): void {
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
    if (this.canMoveTo(currentTile, direction)) {
      const destination = this.dungeonService.getNeighborPosition(currentTile, direction);

      const destinationTile = this.dungeonService.getTileAt(destination.x, destination.y);

      if (!destinationTile) {
        return;
      }

      if (this.moveActivePlayerTo(destination.x, destination.y, direction)) {
        this.consumePlayerMovement();
        this.gameService.recordAstralWalkIfUsed(player, currentTile, destinationTile);
        this.gameService.resolveTileEntry(player, currentTile, destinationTile, false, true);
        this.finishPlayerMovement();
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
   * Les joueurs IA utilisent leur propre moteur de décision
   * et ne doivent jamais exposer les commandes destinées
   * à un joueur humain.
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

/** Gere openPortalTravel et applique les gardes necessaires avant mutation. */
  openPortalTravel(): void {
    this.gameService.openPortalTravelSelection();
  }

/** Gere confirmPortalTravel et applique les gardes necessaires avant mutation. */
  confirmPortalTravel(): void {
    this.gameService.confirmPortalTravel();
  }

/** Gere closePortalTravel et applique les gardes necessaires avant mutation. */
  closePortalTravel(): void {
    this.gameService.closePortalTravelSelection();
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
    this.consumePlayerMovement();
    this.gameService.resolveTileEntry(player, sourceTile, placedTile, true, true);

    /*
     * Le déplacement ayant permis d'entrer dans la salle
     * compte bien parmi les quatre déplacements du tour.
     */
    this.finishPlayerMovement();
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

/** Expose la presence d'une ouverture dans une direction du plateau. */
/** Gere hasTileOpening et applique les gardes necessaires avant mutation. */
  hasTileOpening(tile: PlacedTile, direction: Direction): boolean {
    return this.dungeonService.hasTileOpening(tile, direction);
  }

/** Gere getNeighborPosition et applique les gardes necessaires avant mutation. */
  getNeighborPosition(tile: PlacedTile, direction: Direction): { x: number; y: number } {
    return this.dungeonService.getNeighborPosition(tile, direction);
  }

/** Gere getTileAt et applique les gardes necessaires avant mutation. */
  getTileAt(x: number, y: number): PlacedTile | undefined {
    return this.dungeonService.getTileAt(x, y);
  }

/** Gere getNeighbor et applique les gardes necessaires avant mutation. */
  getNeighbor(tile: PlacedTile, direction: Direction): PlacedTile | undefined {
    return this.dungeonService.getNeighbor(tile, direction);
  }

/** Gere canMoveTo et applique les gardes necessaires avant mutation. */
  canMoveTo(tile: PlacedTile, direction: Direction): boolean {
    const destination = this.dungeonService.getNeighbor(tile, direction);
    return this.gameService.canMoveTo(this.gameService.activePlayer, tile, destination ?? null);
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
