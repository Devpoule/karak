import { Injectable, signal } from '@angular/core';
import { GamePhase, GameRankingEntry, SetupStep } from '../models/game';
import { calculateTreasurePoints } from '../models/treasure';
import { getTokenDefinition } from '../data/token-definitions';
import { getEquipmentDefinition } from '../data/equipment-definitions';
import { Equipment } from '../models/equipment';
import { PLAYER_INVENTORY_CAPACITY } from '../models/inventory';
import { DIRECTIONS, PlacedTile } from '../models/tile';
import { Player } from '../models/player';
import { MonsterReward, MonsterTokenDefinition, TreasureTokenDefinition, TokenDefinition } from '../models/token';
import { DungeonService } from './dungeon.service';
import { ExplorationService } from './exploration.service';
import { PlayerService } from './player.service';
import { TileDeckService } from './tile-deck.service';
import { TokenBagService } from './token-bag.service';
import { TurnService } from './turn.service';
import { CombatService } from './combat.service';
import type { CombatResult } from './combat.service';
import { TOAST_LABELS, ToastAnchor, ToastEventType, ToastService, ToastTarget, ToastTone } from './toast.service';
import { getHeroDefinition } from '../data/hero-definitions';
import { GameSavePayloadV2, SaveEnvelopeV2 } from '../models/save';
import { SaveService } from './save.service';

/**
 * Résultat du lancer effectué par un joueur
 * pour déterminer qui commencera la partie.
 */
export interface FirstPlayerRoll {
  playerIndex: number;
  die1: number;
  die2: number;
  total: number;
}

/** Sélection temporaire de destination pour un voyage entre portails. */
export interface PortalTravelSelection {
  player: Player;
  destinations: readonly PlacedTile[];
  destination: PlacedTile | null;
}
/**
 * Coffre dont la résolution est obligatoire après l'entrée
 * d'un héros sur sa tuile.
 *
 * La mécanique d'ouverture du coffre sera ajoutée dans une
 * tranche ultérieure. Cet état sert pour l'instant à bloquer
 * correctement la suite du tour.
 */
export interface PendingTreasure {
  player: Player;
  treasure: TreasureTokenDefinition;
  treasureTile: PlacedTile;
  sourceTile: PlacedTile;
}
/** Récompense révélée au verso d'un monstre vaincu. */
export interface PendingReward {
  player: Player;
  monster: MonsterTokenDefinition;
  rewardTile: PlacedTile;
  sourceTile: PlacedTile;
  remainingRewards: readonly MonsterReward[];
}
export type TileEntryResolution = 'none' | 'combat' | 'treasure' | 'reward' | 'equipment' | 'token-choice' | 'sneak-choice';

/** Objet au sol en attente d'une décision du joueur. */
export interface PendingGroundEquipment {
  player: Player;
  tile: PlacedTile;
  equipment: Equipment;
  index: number;
}

/** Contrat de donnees PendingTokenChoice utilise par le domaine ou l interface. */
export interface PendingTokenChoice {
  player: Player;
  tile: PlacedTile;
  sourceTile: PlacedTile;
  tokens: readonly [TokenDefinition, TokenDefinition];
}

/** Choix d'Aderyn face à un monstre déjà révélé. */
export interface PendingSneakChoice {
  player: Player;
  monster: MonsterTokenDefinition;
  sourceTile: PlacedTile;
  destinationTile: PlacedTile;
  movementConsumed: boolean;
}

/** Contrat de donnees HealingPortalSelection utilise par le domaine ou l interface. */
export interface HealingPortalSelection {
  readonly user: Player;
  readonly target: Player | null;
  readonly destination: PlacedTile | null;
}

/** Destination choisie pour la Réincarnation de Horan. */
export interface HoranReincarnationSelection {
  readonly player: Player;
  readonly destination: PlacedTile;
}

/** Décision facultative proposée après un combat qualifiant de Victorius. */
export interface PendingUnstoppableDecision {
  readonly player: Player;
  readonly result: CombatResult;
}

/** Action facultative encore disponible après une Substitution de Xanros. */
export interface PendingXanrosSubstitutionAction {
  readonly player: Player;
  readonly tile: PlacedTile;
}

type TileEntryClassification =
  | { kind: 'empty' }
  | { kind: 'unknown' }
  | { kind: 'sneak'; token: MonsterTokenDefinition }
  | { kind: 'monster'; token: MonsterTokenDefinition }
  | { kind: 'monster-reward'; token: MonsterTokenDefinition }
  | { kind: 'already-resolved' }
  | { kind: 'closed-chest-without-key' }
  | { kind: 'treasure'; token: TreasureTokenDefinition };

/** Service ou composant GameService ; coordonne sa responsabilite de domaine ou d interface. */
@Injectable({
  providedIn: 'root',
})
export class GameService {
  private initialized = false;
  private initializedPlayerConfigurationVersion = 0;

  /**
   * Phase globale actuelle de la partie.
   */
  readonly phase = signal<GamePhase>('setup');

  /** Classement figé lorsque la partie se termine. */
  readonly finalRanking = signal<readonly GameRankingEntry[]>([]);

  /** Joueurs partageant le meilleur score final. */
  readonly winners = signal<readonly Player[]>([]);

  /**
   * Étape actuellement présentée pendant la préparation.
   */
  readonly setupStep = signal<SetupStep>('player-count');

  /**
   * Résultats définitifs du tour de lancer actuellement joué.
   *
   * Leur présence dans le moteur ne signifie pas qu'ils doivent
   * être immédiatement révélés par l'interface.
   */
  readonly firstPlayerRolls = signal<FirstPlayerRoll[]>([]);

  /**
   * Joueurs encore en lice pour commencer la partie.
   *
   * Au premier lancer, tous les joueurs participent.
   * En cas d'égalité au meilleur score, seuls les joueurs
   * concernés restent en lice pour le lancer suivant.
   */
  readonly firstPlayerContenders = signal<number[]>([]);

  /**
   * Index du joueur définitivement désigné pour commencer.
   *
   * Tant qu'aucun maximum unique n'existe, la valeur reste null.
   */
  readonly firstPlayerIndex = signal<number | null>(null);

  /**
   * Index du joueur dont le tour est actuellement actif.
   *
   * Pendant le SETUP, aucun joueur ne joue encore réellement :
   * la valeur reste donc null.
   *
   * Au démarrage de l'aventure, cette valeur reprend exactement
   * le gagnant du lancer de dés conservé dans firstPlayerIndex.
   * GameService devient ainsi la source de vérité de l'identité
   * du joueur actif, sans recalculer le premier joueur.
   */
  readonly activePlayerIndex = signal<number | null>(null);

  /**
   * Coffre actuellement en attente de résolution.
   *
   * L'ouverture est résolue explicitement par `openPendingTreasure`.
   */
  readonly pendingTreasure = signal<PendingTreasure | null>(null);

  /** Récompense en attente de prise en charge par l'interface. */
  readonly pendingReward = signal<PendingReward | null>(null);

  /** Équipement présent sur la tuile et proposé au joueur actif. */
  readonly pendingGroundEquipment = signal<PendingGroundEquipment | null>(null);
  readonly pendingTokenChoice = signal<PendingTokenChoice | null>(null);
  readonly pendingSneakChoice = signal<PendingSneakChoice | null>(null);
  /** Sélection temporaire partagée entre l'inventaire et le plateau. */
  readonly healingPortalSelection = signal<HealingPortalSelection | null>(null);
  /** Présence déjà utilisée : elle persiste entre les tours tant que le héros reste sur la tuile. */
  readonly healingFountainUse = signal<{ player: Player; tileKey: string } | null>(null);
  /** Décision métier en attente après la défaite de Horan à 0 PV. */
  readonly horanReincarnationSelection = signal<HoranReincarnationSelection | null>(null);
  /** Révision émise après une Réincarnation effectivement résolue. */
  readonly horanReincarnationRevision = signal(0);
  /** Joueur concerné par la dernière Réincarnation résolue. */
  readonly lastHoranReincarnationPlayer = signal<Player | null>(null);
  /** Révision émise après un déplacement astral effectivement réalisé. */
  readonly astralWalkRevision = signal(0);
  /** Joueur concerné par le dernier déplacement astral. */
  readonly lastAstralWalkPlayer = signal<Player | null>(null);
  /** Décision métier en attente pour la poursuite facultative de Victorius. */
  readonly pendingUnstoppableDecision = signal<PendingUnstoppableDecision | null>(null);
  /** Action facultative autorisée sur la tuile d'arrivée de Xanros. */
  readonly pendingXanrosSubstitutionAction = signal<PendingXanrosSubstitutionAction | null>(null);
  readonly portalTravelSelection = signal<PortalTravelSelection | null>(null);

  /** Objets déposés indépendamment des jetons monstres/trésors. */
  private groundEquipmentByTile = new Map<string, Equipment>();
  /** Révision réactive de l'affichage des équipements au sol. */
  readonly groundEquipmentRevision = signal(0);

/** Gere groundKey et applique les gardes necessaires avant mutation. */
  private groundKey(tile: PlacedTile): string {
    return `${tile.x}:${tile.y}`;
  }

  /** Une transition bloque les actions jusqu'à l'arrivée du prochain joueur. */
  readonly turnTransitionPending = signal(false);
  /** Sélection temporaire de cible pour la Substitution de Xanros. */
  readonly xanrosSubstitutionSelectionOpen = signal(false);
  /** Révision émise uniquement après un échange de positions réussi. */
  readonly xanrosSubstitutionRevision = signal(0);
  /** Joueur dont le dernier échange de Substitution a réussi. */
  readonly lastXanrosSubstitutionPlayer = signal<Player | null>(null);
  private xanrosSubstitutionPlayer: Player | null = null;
  private optionalXanrosTreasure = false;
  private healingFountainPresenceKey: string | null = null;
  /** Révision UI émise lorsqu'un héros entre réellement en tour de récupération. */
  readonly recoveryRevision = signal(0);
  private readonly turnTransitionDelay = 2800;
  private turnTransitionTimer: ReturnType<typeof setTimeout> | null = null;

  /** Récompenses restant sur chaque jeton retourné après une récupération partielle. */
  private remainingRewardsByTile = new WeakMap<PlacedTile, readonly MonsterReward[]>();
  /** Résultat qualifiant conservé pendant la résolution d'une récompense. */
  private pendingUnstoppableResult: CombatResult | null = null;

  /**
   * Indique si l'entrée sur une tuile a déclenché une résolution
   * obligatoire qui doit être traitée avant toute autre action.
   */
  get hasPendingTileResolution(): boolean {
    return this.combatService.hasPendingCombat
      || this.pendingTreasure() !== null
      || this.pendingReward() !== null
      || this.pendingGroundEquipment() !== null
      || this.pendingTokenChoice() !== null
      || this.pendingSneakChoice() !== null
      || this.horanReincarnationSelection() !== null
      || this.pendingUnstoppableDecision() !== null
      || this.xanrosSubstitutionSelectionOpen()
      || this.pendingXanrosSubstitutionAction() !== null;
  }

  /** Joueurs vers lesquels Xanros peut actuellement se substituer. */
  get xanrosSubstitutionTargets(): Player[] {
    const player = this.activePlayer;
    if (!player) return [];
    return this.playerService.players.filter(candidate =>
      candidate !== player && candidate.position !== undefined,
    );
  }

  get canUseXanrosSubstitution(): boolean {
    return this.xanrosSubstitutionUnavailableReason === null;
  }

  /** Motif métier affichable par la fiche descriptive du pouvoir. */
  get xanrosSubstitutionUnavailableReason(): string | null {
    const player = this.activePlayer;
    if (!player || player.heroId !== 'xanros') return 'Ce pouvoir appartient à Xanros.';
    if (player.isCursed) return 'Une malédiction empêche l’utilisation de ce pouvoir.';
    if (this.phase() !== 'playing' || this.turnTransitionPending()) return 'Le pouvoir n’est pas disponible maintenant.';
    if (this.hasPendingTileResolution || this.explorationService.pendingTile || this.healingPortalSelection() !== null) {
      return 'Une autre résolution doit être terminée auparavant.';
    }
    if (this.turnService.remainingMovements() !== 4 || this.turnService.movementsMadeThisTurn() !== 0) {
      return 'Substitution doit être utilisée au début du tour.';
    }
    if (this.turnService.suspendedMovementCount !== null) return 'Le tour est déjà suspendu par une autre décision.';
    if (player.lives <= 0 || player.recoveryState !== 'none') return 'Xanros ne peut pas utiliser ce pouvoir actuellement.';
    if (this.xanrosSubstitutionTargets.length === 0) return 'Aucun autre héros disponible pour la substitution.';
    return null;
  }

/** Gere openXanrosSubstitution et applique les gardes necessaires avant mutation. */
  openXanrosSubstitution(): boolean {
    if (!this.canUseXanrosSubstitution) return false;
    this.xanrosSubstitutionPlayer = this.activePlayer;
    this.xanrosSubstitutionSelectionOpen.set(true);
    return true;
  }

/** Gere cancelXanrosSubstitution et applique les gardes necessaires avant mutation. */
  cancelXanrosSubstitution(): void {
    this.xanrosSubstitutionPlayer = null;
    this.xanrosSubstitutionSelectionOpen.set(false);
  }

  /** Indique si l'action post-Substitution appartient encore au joueur actif. */
  get canResolveXanrosSubstitutionAction(): boolean {
    const pending = this.pendingXanrosSubstitutionAction();
    return !!pending
      && pending.player === this.activePlayer
      && this.phase() === 'playing'
      && !this.turnTransitionPending()
      && this.pendingTreasure() === null
      && this.pendingReward() === null
      && this.pendingGroundEquipment() === null
      && this.pendingTokenChoice() === null
      && this.pendingSneakChoice() === null
      && this.horanReincarnationSelection() === null
      && this.pendingUnstoppableDecision() === null
      && this.combatService.pendingCombat() === null
      && this.healingPortalSelection() === null
      && !this.xanrosSubstitutionSelectionOpen();
  }

  /** Le coffre en attente provient-il de l'action facultative de Xanros ? */
  get isOptionalXanrosTreasure(): boolean {
    return this.optionalXanrosTreasure;
  }

  /** Termine l'action facultative de Xanros sans déclencher d'autre effet. */
  finishXanrosSubstitutionAction(): boolean {
    if (!this.canResolveXanrosSubstitutionAction) return false;
    this.pendingXanrosSubstitutionAction.set(null);
    this.portalTravelSelection.set(null);
    this.endTurn();
    return true;
  }

  /**
   * Enregistre le résultat d'un combat qualifiant pour Inarrêtable.
   *
   * La décision est différée tant qu'une récompense ou une autre résolution
   * obligatoire appartient encore au combat. Le résultat doit encore être
   * celui publié par CombatService : une interface ne peut donc pas fabriquer
   * une autorisation de reprise.
   */
  registerUnstoppableContinuation(result: CombatResult): boolean {
    const player = result.player;
    if (
      !result.unstoppableEligible
      || this.combatService.lastCombatResult() !== result
      || this.phase() !== 'playing'
      || player !== this.activePlayer
      || player.heroId !== 'victorius'
      || player.isCursed
      || this.pendingUnstoppableResult !== null
      || this.pendingUnstoppableDecision() !== null
    ) {
      return false;
    }

    this.pendingUnstoppableResult = result;
    return true;
  }

  /** Tente d'afficher l'autorisation après la fin des résolutions obligatoires. */
  finalizeUnstoppableContinuation(): boolean {
    return this.offerUnstoppableDecision();
  }

  /** Accepte une continuation autorisée et consomme l'autorisation. */
  acceptUnstoppableContinuation(): boolean {
    const decision = this.pendingUnstoppableDecision();
    if (!decision || !this.canContinueUnstoppable(decision.player)) return false;
    if (!this.turnService.resumeSuspendedMovements()) return false;

    this.clearUnstoppableContinuation();
    return true;
  }

  /** Refuse la continuation et termine le tour selon le flux normal. */
  declineUnstoppableContinuation(): boolean {
    const decision = this.pendingUnstoppableDecision();
    if (
      !decision
      || this.phase() !== 'playing'
      || decision.player !== this.activePlayer
      || this.turnTransitionPending()
    ) {
      return false;
    }

    this.clearUnstoppableContinuation();
    this.endTurn();
    return true;
  }

  /** Efface une autorisation devenue obsolète. */
  private clearUnstoppableContinuation(): void {
    this.pendingUnstoppableResult = null;
    this.pendingUnstoppableDecision.set(null);
  }

  /**
   * Rend la décision visible uniquement lorsque la reprise est légale.
   * Une suspension à zéro mouvement conduit directement à la fin du tour.
   */
  private offerUnstoppableDecision(): boolean {
    const result = this.pendingUnstoppableResult;
    if (!result || this.hasPendingTileResolution) return false;

    if (!this.canContinueUnstoppable(result.player)) {
      this.clearUnstoppableContinuation();
      return false;
    }

    this.pendingUnstoppableDecision.set({ player: result.player, result });
    return true;
  }

/** Gere canContinueUnstoppable et applique les gardes necessaires avant mutation. */
  private canContinueUnstoppable(player: Player): boolean {
    return this.phase() === 'playing'
      && !this.turnTransitionPending()
      && player === this.activePlayer
      && player.heroId === 'victorius'
      && !player.isCursed
      && player.lives > 0
      && player.recoveryState === 'none'
      && this.combatService.pendingCombat() === null
      && this.pendingTreasure() === null
      && this.pendingReward() === null
      && this.pendingGroundEquipment() === null
      && this.pendingTokenChoice() === null
      && this.pendingSneakChoice() === null
      && this.horanReincarnationSelection() === null
      && (this.turnService.suspendedMovementCount ?? 0) > 0;
  }

  /** Termine une résolution obligatoire en ouvrant, si nécessaire, Inarrêtable. */
  private finishMandatoryResolution(): void {
    if (this.offerUnstoppableDecision()) return;
    this.clearUnstoppableContinuation();
    this.endTurn();
  }

/** Gere confirmXanrosSubstitution et applique les gardes necessaires avant mutation. */
  confirmXanrosSubstitution(target: Player): boolean {
    const player = this.activePlayer;
    if (!this.canConfirmXanrosSubstitution(player, target)) return false;

    const playerPosition = player.position;
    const targetPosition = target.position;
    if (!playerPosition || !targetPosition) return false;
    const sourceTile = this.dungeonService.getTileAt(playerPosition.x, playerPosition.y);
    const destinationTile = this.dungeonService.getTileAt(targetPosition.x, targetPosition.y);
    if (!sourceTile || !destinationTile || !this.turnService.consumeAllMovements()) return false;

    player.position = { ...targetPosition };
    target.position = { ...playerPosition };
    this.cancelXanrosSubstitution();
    this.lastXanrosSubstitutionPlayer.set(player);
    this.xanrosSubstitutionRevision.update(revision => revision + 1);
    this.prepareXanrosSubstitutionAction(player, destinationTile);
    return true;
  }

  /** Vérifie toute la décision conservée entre l'ouverture et la confirmation. */
  private canConfirmXanrosSubstitution(player: Player | null, target: Player): player is Player {
    return !!player
      && this.xanrosSubstitutionSelectionOpen()
      && this.xanrosSubstitutionPlayer === player
      && this.phase() === 'playing'
      && !this.turnTransitionPending()
      && !this.explorationService.pendingTile
      && this.healingPortalSelection() === null
      && this.combatService.pendingCombat() === null
      && this.pendingTreasure() === null
      && this.pendingReward() === null
      && this.pendingGroundEquipment() === null
      && this.pendingTokenChoice() === null
      && this.pendingSneakChoice() === null
      && this.horanReincarnationSelection() === null
      && this.pendingUnstoppableDecision() === null
      && player.heroId === 'xanros'
      && player.lives > 0
      && player.recoveryState === 'none'
      && !player.isCursed
      && this.turnService.remainingMovements() === 4
      && this.turnService.movementsMadeThisTurn() === 0
      && this.turnService.suspendedMovementCount === null
      && this.playerService.players.includes(target)
      && target !== player
      && this.xanrosSubstitutionTargets.includes(target)
      && !!player.position
      && !!target.position;
  }

  /** Prépare uniquement les interactions explicitement autorisées après l'échange. */
  private prepareXanrosSubstitutionAction(player: Player, tile: PlacedTile): void {
    const hasGroundEquipment = this.getGroundEquipment(tile).length > 0;
    const hasOpenableChest = tile.tokenId === 'closed-chest' && player.inventory.key !== null;
    const canHeal = player.inventory.spells.some(spell => spell?.effect === 'healing-portal')
      && this.getHealingFountains().length > 0
      && player.lives < 5;

    if (hasGroundEquipment || hasOpenableChest || canHeal) {
      this.pendingXanrosSubstitutionAction.set({ player, tile });
      return;
    }

    this.endTurn();
  }

  /** Prépare l'ouverture facultative d'un coffre de la tuile d'arrivée. */
  openXanrosSubstitutionChest(tile: PlacedTile): boolean {
    const pending = this.pendingXanrosSubstitutionAction();
    const player = this.activePlayer;
    if (
      !this.canResolveXanrosSubstitutionAction
      || !pending
      || pending.tile !== tile
      || tile.tokenId !== 'closed-chest'
      || player !== pending.player
      || player.inventory.key === null
    ) {
      return false;
    }

    const treasure = getTokenDefinition('closed-chest');
    if (!treasure || treasure.kind !== 'treasure') return false;
    this.pendingXanrosSubstitutionAction.set(null);
    this.pendingTreasure.set({ player, treasure, treasureTile: tile, sourceTile: tile });
    this.optionalXanrosTreasure = true;
    return true;
  }

  /** Refuse l'ouverture facultative d'un coffre après Substitution. */
  declineOptionalXanrosTreasure(): boolean {
    if (!this.optionalXanrosTreasure || !this.pendingTreasure()) return false;
    this.pendingTreasure.set(null);
    this.optionalXanrosTreasure = false;
    this.endTurn();
    return true;
  }

  /** Refuse un coffre facultatif et reprend les mouvements suspendus. */
  declinePendingTreasure(): boolean {
    const pending = this.pendingTreasure();
    if (!pending || pending.player !== this.activePlayer) return false;
    if (this.optionalXanrosTreasure) return this.declineOptionalXanrosTreasure();

    this.pendingTreasure.set(null);
    if (this.turnService.resumeSuspendedMovements()) {
      if (!this.turnService.canMove) this.endTurn();
    } else {
      this.endTurn();
    }
    return true;
  }
  constructor(
    private readonly dungeonService: DungeonService,
    private readonly explorationService: ExplorationService,
    private readonly tileDeckService: TileDeckService,
    private readonly tokenBagService: TokenBagService,
    private readonly playerService: PlayerService,
    private readonly turnService: TurnService,
    private readonly combatService: CombatService,
    private readonly toastService: ToastService,
    private readonly saveService: SaveService,
  ) {}

  /** Restaure une sauvegarde stable avant l'affichage de la partie. */
  restoreSavedGame(envelope: SaveEnvelopeV2): boolean {
    this.toastService.clearHistory();
    // Les sauvegardes V2 décrivent des états stables : une tuile révélée
    // mais non placée ne doit pas survivre à une restauration partielle.
    this.explorationService.initialize();
    const payload: GameSavePayloadV2 = envelope.payload;
    if (!this.playerService.restore(payload.players)) return false;
    if (!this.dungeonService.restore(payload.dungeon)) return false;
    if (!this.tileDeckService.restore(payload.dungeon.remainingTileIds)) return false;
    if (!this.tokenBagService.restore(payload.dungeon.remainingTokenIds)) return false;
    if (!this.turnService.restore(
      payload.turn.remainingMovements,
      payload.turn.movementsMadeThisTurn,
      payload.turn.suspendedMovements,
    )) return false;
    this.phase.set(payload.phase);
    this.setupStep.set(payload.setupStep);
    this.firstPlayerIndex.set(payload.firstPlayerIndex);
    this.activePlayerIndex.set(payload.activePlayerIndex);
    this.firstPlayerContenders.set([...payload.firstPlayerContenders]);
    this.firstPlayerRolls.set(payload.firstPlayerRolls as unknown as FirstPlayerRoll[]);
    this.finalRanking.set([]);
    this.winners.set([]);
    this.initializedPlayerConfigurationVersion = this.playerService.configurationVersion;
    this.initialized = true;
    return true;
  }

  /** Tente la reprise locale et revient à une nouvelle partie si elle échoue. */
  restoreOrInitialize(): void {
    const savedGame = this.saveService.read();
    if (!savedGame || !this.restoreSavedGame(savedGame)) this.initialize();
  }

  /** Construit la cible UI sans exposer de référence DOM au domaine. */
  private toastTarget(player: Player, anchor: Exclude<ToastAnchor, 'global'>): ToastTarget | undefined {
    const playerIndex = this.playerService.players.indexOf(player);
    return playerIndex >= 0 ? { playerIndex, anchor } : undefined;
  }

  /** Publie une notification standardisee avec l identite du heros cible. */
  private showPlayerToast(
    player: Player,
    text: string,
    tone: ToastTone,
    eventType: ToastEventType,
    anchor: Exclude<ToastAnchor, 'global'>,
    icon?: string,
  ): void {
    this.toastService.show(text, tone, this.toastTarget(player, anchor), {
      eventType,
      heroId: player.heroId,
      icon,
    });
  }

  /** Annonce une récupération ou une amélioration sans ouvrir une décision. */
  private announceEquipmentObtained(player: Player, equipment: Equipment): void {
    this.showPlayerToast(
      player,
      this.getEquipmentObtainedLabel(equipment),
      'success',
      'equipment',
      equipment.kind === 'weapon' ? 'inventory-weapons' : equipment.kind === 'spell' ? 'inventory-spells' : 'inventory-key',
      '✧',
    );
  }

  /** Annonce un remplacement d'arme après la validation complète de l'échange. */
  private announceWeaponReplacement(player: Player, replacement: Equipment): void {
    this.showPlayerToast(
      player,
      this.getEquipmentObtainedLabel(replacement),
      'success',
      'equipment',
      'inventory-top',
      '✧',
    );
  }

  /** Construit le libellé court d'obtention depuis l'identifiant métier. */
  private getEquipmentObtainedLabel(equipment: Equipment): string {
    return equipment.id === 'key' ? TOAST_LABELS.key() : TOAST_LABELS.equipment(equipment.id);
  }

  /**
   * Commence la préparation d'une nouvelle partie.
   *
   * Tous les états propres au SETUP sont réinitialisés.
   *
   * Les éléments physiques nécessaires à l'aventure sont
   * également préparés :
   *
   * - donjon ;
   * - état d'exploration ;
   * - pioche des tuiles ;
   * - sachet monstres/trésors.
   */
  initialize(): void {
    this.toastService.clearHistory();
    // Une nouvelle partie doit repartir sans joueurs ni références
    // hérités. Lors de la toute première ouverture, les joueurs ne
    // sont pas encore configurés et doivent donc rester intacts si un
    // appelant prépare la configuration avant l'initialisation du jeu.
    if (
      this.initialized
      && this.playerService.configurationVersion === this.initializedPlayerConfigurationVersion
    ) {
      this.playerService.reset();
    }
    if (this.turnTransitionTimer !== null) {
      clearTimeout(this.turnTransitionTimer);
      this.turnTransitionTimer = null;
    }
    this.clearUnstoppableContinuation();
    this.cancelXanrosSubstitution();
    this.pendingXanrosSubstitutionAction.set(null);
    this.optionalXanrosTreasure = false;
    this.turnTransitionPending.set(false);
    this.phase.set('setup');
    this.finalRanking.set([]);
    this.winners.set([]);
    this.setupStep.set('player-count');
    this.firstPlayerRolls.set([]);
    this.firstPlayerContenders.set([]);
    this.firstPlayerIndex.set(null);
    this.activePlayerIndex.set(null);
    this.pendingTreasure.set(null);
    this.pendingReward.set(null);
    this.pendingGroundEquipment.set(null);
    this.pendingSneakChoice.set(null);
    this.pendingTokenChoice.set(null);
    this.portalTravelSelection.set(null);
    this.healingPortalSelection.set(null);
    this.healingFountainUse.set(null);
    this.healingFountainPresenceKey = null;
    this.horanReincarnationSelection.set(null);
    this.clearUnstoppableContinuation();
    this.groundEquipmentByTile = new Map<string, Equipment>();
    this.groundEquipmentRevision.update(value => value + 1);
    this.remainingRewardsByTile = new WeakMap<PlacedTile, readonly MonsterReward[]>();
    this.initializeDungeon();
    this.initializeExploration();
    this.initializeTileDeck();
    this.initializeTokenBag();
    this.initializeCombat();
    this.initializedPlayerConfigurationVersion = this.playerService.configurationVersion;
    this.initialized = true;
  }

  /** Indique si une partie ou sa préparation existe déjà en mémoire. */
  isInitialized(): boolean {
    return this.initialized;
  }

  /** Une aventure est commencée uniquement lorsque la phase de jeu est active. */
  isGameInProgress(): boolean {
    return this.phase() === 'playing';
  }

  /**
   * Prépare les joueurs participant à la partie.
   *
   * RÈGLE OFFICIELLE KARAK :
   *
   * chaque joueur reçoit un plateau d'inventaire et commence
   * la partie avec 5 jetons de vie face cœur.
   *
   * CHOIX D'IMPLÉMENTATION :
   *
   * Karak peut être joué dans l'application par des joueurs
   * humains et des joueurs contrôlés par l'IA.
   *
   * Une nouvelle partie contient un seul joueur humain
   * par défaut.
   *
   * Lorsque plusieurs humains jouent sur le même appareil,
   * humanPlayerCount indique combien de premières positions
   * doivent leur être attribuées.
   *
   * Exemple :
   *
   * initializePlayers(5, 2)
   *
   * J1 humain
   * J2 humain
   * J3 IA
   * J4 IA
   * J5 IA
   */
  initializePlayers(playerCount: number, humanPlayerCount = 1): void {
    if (this.phase() !== 'setup') return;
    if (this.setupStep() !== 'player-count') return;
    this.playerService.initialize(playerCount, humanPlayerCount);
    this.setupStep.set('hero-draw');
  }

  /** Revient à une étape déjà franchie sans relancer de hasard. */
  goBackToSetupStep(step: SetupStep): void {
    if (this.phase() !== 'setup') return;
    if (step === 'player-count' && this.playerService.players.length > 0) {
      this.setupStep.set('player-count');
      return;
    }
    if (step === 'hero-draw' && this.playerService.players.every(player => player.heroId)) {
      this.setupStep.set('hero-draw');
    }
  }

  /** Reprend la détermination du premier joueur sans tirer de nouveau héros. */
  continueAfterHeroDraw(): void {
    if (this.phase() !== 'setup' || this.setupStep() !== 'hero-draw') return;
    if (!this.playerService.players.every(player => player.heroId)) return;
    this.playerService.placeHeroesOnStart();
    this.firstPlayerContenders.set(this.playerService.players.map((_, index) => index));
    this.setupStep.set('first-player-roll');
  }

  /** Avance uniquement vers une étape dont les prérequis sont déjà validés. */
  goToNextSetupStep(): void {
    if (this.phase() !== 'setup') return;
    if (this.setupStep() === 'player-count' && this.playerService.players.length > 0) {
      this.setupStep.set('hero-draw');
      return;
    }
    if (this.setupStep() === 'hero-draw') this.continueAfterHeroDraw();
  }

  /**
   * Réinitialise l'état de combat pour une nouvelle partie.
   */
  private initializeCombat(): void {
    this.combatService.initialize();
  }

  /**
   * Effectue le tirage aléatoire des héros.
   */
  drawHeroes(): void {
    if (this.phase() !== 'setup') return;
    if (this.setupStep() !== 'hero-draw') return;
    this.playerService.drawHeroes();
  }

  /**
   * Place les héros sur la tuile Départ puis prépare
   * la détermination du premier joueur.
   */
  placeHeroesOnStart(): void {
    if (this.phase() !== 'setup') return;
    if (this.setupStep() !== 'hero-draw') return;
    this.playerService.placeHeroesOnStart();
    this.firstPlayerRolls.set([]);
    this.firstPlayerIndex.set(null);
    this.firstPlayerContenders.set(this.playerService.players.map((_, playerIndex) => playerIndex));
    this.setupStep.set('first-player-roll');
  }

  /**
   * Lance les deux dés d'un joueur encore en lice.
   */
  rollPlayerForFirstPlayer(playerIndex: number): void {
    if (this.phase() !== 'setup') return;
    if (this.setupStep() !== 'first-player-roll') return;
    if (this.firstPlayerIndex() !== null) return;
    if (!this.firstPlayerContenders().includes(playerIndex)) {
      return;
    }
    const alreadyRolled = this.firstPlayerRolls().some((roll) => roll.playerIndex === playerIndex);
    if (alreadyRolled) {
      return;
    }
    const die1 = this.rollDie();
    const die2 = this.rollDie();
    this.firstPlayerRolls.update((rolls) => [
      ...rolls,
      {
        playerIndex,
        die1,
        die2,
        total: die1 + die2,
      },
    ]);
  }

  /**
   * Indique si tous les joueurs encore en lice
   * ont effectué leur lancer actuel.
   */
  get haveAllContendersRolled(): boolean {
    return this.firstPlayerContenders().every((playerIndex) =>
      this.firstPlayerRolls().some((roll) => roll.playerIndex === playerIndex),
    );
  }

  /**
   * Analyse les résultats du tour de lancer.
   *
   * RÈGLE OFFICIELLE KARAK :
   *
   * le total le plus élevé détermine le premier joueur.
   *
   * CHOIX D'IMPLÉMENTATION :
   *
   * le règlement consulté ne détaillant pas le départage
   * d'une égalité au meilleur score, les joueurs concernés
   * relancent les dés jusqu'à obtenir un maximum unique.
   *
   * Retour :
   *
   * - winner : un joueur est définitivement désigné ;
   * - tie : plusieurs joueurs doivent relancer ;
   * - pending : tous les lancers nécessaires ne sont pas faits.
   */
  resolveFirstPlayerRoll(): 'winner' | 'tie' | 'pending' {
    if (!this.haveAllContendersRolled) {
      return 'pending';
    }
    const contenderRolls = this.firstPlayerRolls().filter((roll) =>
      this.firstPlayerContenders().includes(roll.playerIndex),
    );
    const highestTotal = Math.max(...contenderRolls.map((roll) => roll.total));
    const leaders = contenderRolls.filter((roll) => roll.total === highestTotal);
    if (leaders.length === 1) {
      this.firstPlayerIndex.set(leaders[0].playerIndex);
      return 'winner';
    }
    const tiedPlayerIndexes = leaders.map((roll) => roll.playerIndex);
    this.firstPlayerContenders.set(tiedPlayerIndexes);
    /**
     * Les résultats des joueurs à égalité sont retirés afin
     * de leur permettre d'effectuer leur nouveau lancer.
     *
     * Les anciens résultats des joueurs éliminés restent
     * disponibles pour l'affichage récapitulatif.
     */
    this.firstPlayerRolls.update((rolls) =>
      rolls.filter((roll) => !tiedPlayerIndexes.includes(roll.playerIndex)),
    );
    return 'tie';
  }

  /**
   * Indique si un joueur est encore concerné
   * par la détermination du premier joueur.
   */
  isFirstPlayerContender(playerIndex: number): boolean {
    return this.firstPlayerContenders().includes(playerIndex);
  }

  /**
   * Démarre réellement l'aventure après la préparation.
   *
   * Cette transition est volontairement stricte :
   *
   * - la partie doit encore être en phase SETUP ;
   * - le SETUP doit être arrivé à la détermination du premier joueur ;
   * - un vainqueur doit déjà avoir été désigné.
   *
   * La méthode ne relance aucun dé et ne recalcule aucun ordre :
   * elle transforme simplement le vainqueur du SETUP en joueur actif.
   *
   * Les héros sont replacés sur la tuile Départ afin de garantir
   * un état initial stable même si l'interface appelle cette transition
   * après une animation ou une future reprise d'état.
   */
  startAdventure(): void {
    if (this.phase() !== 'setup') return;
    if (this.setupStep() !== 'first-player-roll') return;
    const firstPlayerIndex = this.firstPlayerIndex();
    if (firstPlayerIndex === null) {
      return;
    }
    this.playerService.placeHeroesOnStart();
    this.ensureStartTileExists();
    this.activePlayerIndex.set(firstPlayerIndex);
    this.turnService.resetMovements();
    this.prepareActivePlayerTurn();
    this.phase.set('playing');
  }

  // ==========================================================
  // ENTRÉE DANS UNE SALLE

  // ==========================================================

  /**
   * Révèle le contenu d'une salle nouvellement découverte
   * après que le héros y est entré.
   *
   * RÈGLE OFFICIELLE KARAK :
   *
   * lorsqu'un héros entre dans une salle qui vient d'être
   * ajoutée au donjon, un jeton est tiré du sachet
   * monstres/trésors et placé dans cette salle.
   *
   * IMPORTANT :
   *
   * cette première étape se limite à la révélation.
   *
   * Elle ne résout pas encore :
   *
   * - un éventuel combat ;
   * - l'ouverture d'un coffre ;
   * - la récupération d'un trésor.
   */
  revealNewRoom(tile: PlacedTile, player?: Player, sourceTile?: PlacedTile): void {
    const definition = this.dungeonService.getTileDefinition(tile);
    if (!definition || definition.kind !== 'room') {
      return;
    }
    /*
     * Une salle ne doit recevoir son contenu qu'une seule fois.
     */
    if (tile.tokenId) {
      return;
    }
    const firstToken = this.tokenBagService.draw();
    if (!firstToken) {
      // Adaptation numérique : le manuel ne décrit pas la découverte
      // d'une pièce lorsque le sachet est vide.
      return;
    }
    const canUseFateWeaver = player?.heroId === 'taia'
      && !player.isCursed
      && sourceTile !== undefined;
    const secondToken = canUseFateWeaver ? this.tokenBagService.draw() : undefined;
    if (secondToken && player && sourceTile) {
      this.turnService.stopMovements();
      this.pendingTokenChoice.set({
        player,
        tile,
        sourceTile,
        tokens: [firstToken, secondToken],
      });
      return;
    }
    // Adaptation numérique : avec un seul jeton disponible, il n'existe
    // pas de décision possible et le premier tirage est placé directement.
    tile.tokenId = firstToken.id;
    tile.tokenFace = 'front';
  }

/** Gere choosePendingToken et applique les gardes necessaires avant mutation. */
  choosePendingToken(index: 0 | 1): boolean {
    const pending = this.pendingTokenChoice();
    if (
      !pending
      || this.phase() !== 'playing'
      || this.turnTransitionPending()
      || pending.player !== this.activePlayer
      || pending.player.isCursed
      || !this.dungeonService.tiles.includes(pending.tile)
      || pending.tile.tokenId !== undefined
    ) {
      return false;
    }
    const selected = pending.tokens[index];
    const rejected = pending.tokens[index === 0 ? 1 : 0];
    if (!selected || !rejected) return false;
    this.tokenBagService.returnToken(rejected.id);
    pending.tile.tokenId = selected.id;
    pending.tile.tokenFace = 'front';
    this.pendingTokenChoice.set(null);
    const resolution = this.resolveTileEntry(pending.player, pending.sourceTile, pending.tile);
    if (resolution === 'none' && !this.hasPendingTileResolution) {
      this.turnService.resumeSuspendedMovements();
      if (!this.turnService.canMove) {
        this.endTurn();
      }
    }
    return true;
  }

  /** Résout le choix tactique d'Aderyn face à un monstre révélé. */
  choosePendingSneak(action: 'combat' | 'sneak'): boolean {
    const pending = this.pendingSneakChoice();
    if (!pending || pending.player !== this.activePlayer || pending.player.isCursed) return false;

    if (action === 'combat') {
      const started = this.combatService.startCombat(
        pending.player,
        pending.sourceTile,
        pending.destinationTile,
        pending.movementConsumed,
      );
      if (!started) return false;
      this.pendingSneakChoice.set(null);
      return true;
    }

    // The entry movement is consumed by the board flow. Tile resolution only
    // suspends the movements still available while waiting for the decision.
    if (!this.turnService.resumeSuspendedMovements()) return false;
    this.pendingSneakChoice.set(null);
    if (!pending.movementConsumed) {
      this.turnService.consumeMovement();
    }
    if (!this.turnService.canMove) {
      this.endTurn();
    }
    return true;
  }

  /**
   * Résout les conséquences communes de l'entrée d'un héros
   * sur une tuile.
   *
   * Cette méthode constitue le point de passage unique pour les
   * joueurs humains comme pour les IA.
   *
   * ORDRE :
   *
   * 1. si la tuile vient d'être découverte, révéler son contenu ;
   * 2. détecter le jeton présent ;
   * 3. arrêter immédiatement les déplacements si un jeton existe ;
   * 4. déclencher le combat ou mettre le coffre en attente.
   *
   * La résolution effective du combat et l'ouverture du coffre
   * seront implémentées dans leurs tranches respectives.
   */
  resolveTileEntry(
    player: Player,
    sourceTile: PlacedTile,
    destinationTile: PlacedTile,
    revealRoom = false,
    movementConsumed = false,
  ): TileEntryResolution {
    // Une entrée de tuile est une résolution de partie : elle n'est
    // valide qu'après la fin de la préparation et avant la fin de partie.
    if (this.phase() !== 'playing' || player !== this.activePlayer) return 'none';
    if (player.recoveryState === 'resting') return 'none';
    if (this.turnTransitionPending() || this.hasPendingTileResolution) {
      return 'none';
    }
    this.clearHealingFountainUseOnDeparture(player, destinationTile);
    if (revealRoom) {
      this.revealNewRoom(destinationTile, player, sourceTile);
      if (this.pendingTokenChoice()) return 'token-choice';
    }

    // La Marche rampante reste disponible lors de toute rencontre éligible,
    // y compris lorsque le contenu vient d'être révélé sur une nouvelle tuile.
    const classification = this.classifyTileEntry(player, destinationTile, true);

    if (classification.kind === 'sneak') {
      this.turnService.stopMovements();
      this.pendingSneakChoice.set({
        player,
        monster: classification.token,
        sourceTile,
        destinationTile,
        movementConsumed,
      });
      return 'sneak-choice';
    }

    if (classification.kind === 'empty' || classification.kind === 'already-resolved') {
      return this.offerGroundEquipment(player, destinationTile);
    }
    if (classification.kind === 'unknown'
      || classification.kind === 'closed-chest-without-key') {
      return 'none';
    }
    // Le verso d'un monstre contient une récompense, pas un adversaire.
    if (classification.kind === 'monster-reward') {
      const remainingRewards = this.remainingRewardsByTile.get(destinationTile)
        ?? classification.token.rewards
        ?? [];
      if (!remainingRewards.length) return this.offerGroundEquipment(player, destinationTile);
      this.remainingRewardsByTile.delete(destinationTile);
      this.turnService.stopMovements();
      this.pendingReward.set({
        player,
        monster: classification.token,
        rewardTile: destinationTile,
        sourceTile,
        remainingRewards: [...remainingRewards],
      });
      const curseTargets = this.getPendingCurseTargets();
      if (curseTargets.length === 1) {
        this.resolvePendingCurse(curseTargets[0]);
      }
      this.resolvePendingRewardEquipment();
      return 'reward';
    }

    this.turnService.stopMovements();
    if (classification.kind === 'monster') {
      return this.combatService.startCombat(player, sourceTile, destinationTile, movementConsumed)
        ? 'combat'
        : 'none';
    }
    this.pendingTreasure.set({
      player,
      treasure: classification.token,
      treasureTile: destinationTile,
      sourceTile,
    });
    return 'treasure';
  }

  /** Classifie le contenu d'une tuile sans modifier l'état du jeu. */
  private classifyTileEntry(
    player: Player,
    destinationTile: PlacedTile,
    allowSneak = true,
  ): TileEntryClassification {
    if (!destinationTile.tokenId) return { kind: 'empty' };

    const token = getTokenDefinition(destinationTile.tokenId);
    if (!token) return { kind: 'unknown' };

    // Aderyn's Sneak lets her cross a live monster tile without combat.
    // The curse disables hero powers but does not alter ordinary movement.
    if (
      token.kind === 'monster'
      && destinationTile.tokenFace !== 'back'
      && allowSneak
      && player.heroId === 'aderyn'
      && !player.isCursed
    ) {
      return { kind: 'sneak', token };
    }

    if (token.kind === 'monster') {
      return destinationTile.tokenFace === 'back'
        ? { kind: 'monster-reward', token }
        : { kind: 'monster', token };
    }

    // Un coffre déjà retourné ne peut pas être ouvert à nouveau.
    if (destinationTile.tokenFace === 'back') {
      return { kind: 'already-resolved' };
    }

    // Un coffre fermé sans clé ne constitue pas une résolution obligatoire.
    if (token.id === 'closed-chest' && player.inventory.key === null) {
      return { kind: 'closed-chest-without-key' };
    }

    return { kind: 'treasure', token };
  }

  /**
   * Ouvre le coffre fermé actuellement en attente.
   *
   * La clé est consommée définitivement avant que le jeton ne soit
   * retiré de la tuile. Les équipements déposés sur cette tuile sont
   * stockés séparément et restent donc inchangés.
   */
  openPendingTreasure(): boolean {
    const pending = this.pendingTreasure();
    if (
      !pending
      || this.phase() !== 'playing'
      || pending.player !== this.activePlayer
      || pending.treasure.id !== 'closed-chest'
      || pending.treasureTile.tokenId !== 'closed-chest'
    ) {
      return false;
    }

    const key = this.playerService.removeEquipment(pending.player, 'key', 0);
    if (!key) {
      return false;
    }

    if (!this.playerService.addTreasure(pending.player, 'opened-chest')) {
      return false;
    }

    pending.treasureTile.tokenId = undefined;
    pending.treasureTile.tokenFace = undefined;
    this.pendingTreasure.set(null);
    this.optionalXanrosTreasure = false;
    this.endTurn();
    this.showPlayerToast(pending.player, TOAST_LABELS.treasure(), 'success', 'treasure', 'treasure', '◆');
    return true;
  }

  // ==========================================================
  // ÉQUIPEMENTS DÉPOSÉS SUR LES TUILES

  // ==========================================================

  /**
   * Dépose volontairement un équipement sur la tuile du héros actif.
   * Les résolutions obligatoires et les transitions interdisent cette action.
   */
  dropInventoryEquipment(player: Player, kind: Equipment['kind'], slotIndex: number): boolean {
    if (this.phase() !== 'playing' || player !== this.activePlayer || player.controller !== 'human') return false;
    if (this.turnTransitionPending() || this.hasPendingTileResolution || this.explorationService.pendingTile) return false;
    if (!Number.isInteger(slotIndex) || !player.position) return false;
    const tile = this.dungeonService.getTileAt(player.position.x, player.position.y);
    if (!tile) return false;
    if (this.getGroundEquipment(tile).length > 0) return false;
    const equipment = this.playerService.removeEquipment(player, kind, slotIndex);
    if (!equipment) return false;
    if (!this.dropEquipment(tile, equipment)) {
      this.playerService.replaceEquipment(player, equipment, slotIndex);
      return false;
    }
    return true;
  }

  /** Liste en lecture seule des équipements présents sur une tuile. */
  getGroundEquipment(tile: PlacedTile): readonly Equipment[] {
    this.groundEquipmentRevision();
    const equipment = this.groundEquipmentByTile.get(this.groundKey(tile));
    return equipment ? [equipment] : [];
  }

  /** Récompenses du verso encore disponibles sur un jeton de monstre. */
  getRemainingMonsterRewards(tile: PlacedTile): readonly MonsterReward[] {
    const pending = this.pendingReward();
    const remainingRewards = this.remainingRewardsByTile.get(tile);
    if (pending?.rewardTile === tile) {
      return [...pending.remainingRewards, ...(remainingRewards ?? [])];
    }
    if (remainingRewards) return remainingRewards;
    const token = tile.tokenId ? getTokenDefinition(tile.tokenId) : undefined;
    return token?.kind === 'monster' ? token.rewards ?? [] : [];
  }

  /** Dépose un objet uniquement sur une tuile sans équipement au sol. */
  private dropEquipment(tile: PlacedTile, equipment: Equipment): boolean {
    const key = this.groundKey(tile);
    if (this.groundEquipmentByTile.has(key)) return false;
    this.groundEquipmentByTile.set(key, equipment);
    this.groundEquipmentRevision.update(value => value + 1);
    return true;
  }

  /** Remplace atomiquement l'objet attendu par un équipement déjà validé. */
  private replaceGroundEquipmentItem(
    tile: PlacedTile,
    expected: Equipment,
    replacement: Equipment,
  ): boolean {
    const key = this.groundKey(tile);
    if (this.groundEquipmentByTile.get(key) !== expected) return false;
    this.groundEquipmentByTile.set(key, replacement);
    this.groundEquipmentRevision.update(value => value + 1);
    return true;
  }

  /**
   * Dépose l'arme remplacée si possible ; si un objet occupe déjà la tuile,
   * applique explicitement la règle métier de défausse de l'ancienne arme.
   */
  private depositOrDiscardReplacedEquipment(
    tile: PlacedTile,
    replacement: Equipment,
    displaced: Equipment,
  ): boolean {
    if (this.getGroundEquipment(tile).length > 0) return replacement.kind === 'weapon';
    return this.dropEquipment(tile, displaced);
  }

  /** Propose puis résout automatiquement le premier objet au sol. */
  private offerGroundEquipment(player: Player, tile: PlacedTile): TileEntryResolution {
    const equipment = this.getGroundEquipment(tile)[0];
    if (!equipment) return 'none';
    this.pendingGroundEquipment.set({ player, tile, equipment, index: 0 });
    this.resolvePendingGroundEquipment();
    return 'equipment';
  }

  /**
   * Réévalue une seule fois l'objet apparu après une action complète.
   *
   * Les résolutions d'abandon ne rappellent jamais cette méthode : un objet
   * refusé reste donc au sol sans boucle de proposition.
   */
  private resolveGroundEquipmentAfterAction(player: Player, tile: PlacedTile): boolean {
    if (
      this.phase() !== 'playing'
      || player !== this.activePlayer
      || this.pendingReward() !== null
      || this.pendingGroundEquipment() !== null
      || this.pendingTreasure() !== null
      || this.explorationService.pendingTile
      || this.turnTransitionPending()
      || !player.position
      || player.position.x !== tile.x
      || player.position.y !== tile.y
    ) {
      return false;
    }

    return this.getGroundEquipment(tile).length > 0
      && this.offerGroundEquipment(player, tile) === 'equipment';
  }

  /** Retourne les fontaines déjà découvertes et accessibles par le portail. */
  getHealingFountains(): readonly PlacedTile[] {
    return this.dungeonService.tiles.filter(tile =>
      this.dungeonService.getTileDefinition(tile)?.feature === 'healing-fountain',
    );
  }

  /** Retourne les tuiles portail déjà découvertes. */
  getPortalTiles(): readonly PlacedTile[] {
    return this.dungeonService.tiles.filter(tile =>
      this.dungeonService.getTileDefinition(tile)?.feature === 'portal',
    );
  }

  /** Vérifie les conditions communes d’un voyage entre portails. */
  canUsePortalTravel(player: Player | null): boolean {
    if (!this.canPerformNormalMovement(player) || !player?.position) return false;
    const source = this.dungeonService.getTileAt(player.position.x, player.position.y);
    if (!source || this.dungeonService.getTileDefinition(source)?.feature !== 'portal') return false;
    return this.getPortalTiles().some(tile => tile !== source);
  }

  /** Ouvre la sélection des destinations portail pour le joueur actif. */
  openPortalTravelSelection(): boolean {
    const player = this.activePlayer;
    if (!this.canUsePortalTravel(player) || this.portalTravelSelection()) return false;
    if (!player?.position) return false;
    const source = this.dungeonService.getTileAt(player.position.x, player.position.y)!;
    const destinations = this.getPortalTiles().filter(tile => tile !== source);
    this.portalTravelSelection.set({ player, destinations, destination: destinations[0] ?? null });
    return true;
  }

/** Gere selectPortalTravelDestination et applique les gardes necessaires avant mutation. */
  selectPortalTravelDestination(destination: PlacedTile): boolean {
    const selection = this.portalTravelSelection();
    if (!selection || !selection.destinations.includes(destination)) return false;
    this.portalTravelSelection.set({ ...selection, destination });
    return true;
  }

/** Gere closePortalTravelSelection et applique les gardes necessaires avant mutation. */
  closePortalTravelSelection(): void {
    this.portalTravelSelection.set(null);
  }

  /** Déplace le héros vers le portail choisi et consomme exactement un mouvement. */
  confirmPortalTravel(): boolean {
    const selection = this.portalTravelSelection();
    const player = this.activePlayer;
    const destination = selection?.destination;
    if (!selection || selection.player !== player || !destination || !this.canUsePortalTravel(player)) return false;

    this.playerService.movePlayerTo(player, destination.x, destination.y, player.facing ?? 'south');
    this.turnService.consumeMovement();
    this.portalTravelSelection.set(null);
    if (!this.turnService.canMove && !this.hasPendingTileResolution) this.endTurn();
    return true;
  }

  /** Valide les invariants communs à un déplacement normal de héros. */
  canPerformNormalMovement(player: Player | null): boolean {
    return this.phase() === 'playing'
      && !!player
      && player === this.activePlayer
      && player.lives > 0
      && player.recoveryState === 'none'
      && !this.turnTransitionPending()
      && !this.hasPendingTileResolution
      && !this.explorationService.pendingTile
      && this.healingPortalSelection() === null
      && this.turnService.canMove;
  }

  /**
   * Autorise uniquement la sélection d'une sortie pour une tuile déjà
   * révélée. Cette étape n'est pas un déplacement et ne consomme aucun
   * mouvement ; elle doit néanmoins rester bloquée par les mêmes états
   * obligatoires que les actions normales.
   */
  canSelectPendingExplorationDirection(player: Player | null): boolean {
    return this.phase() === 'playing'
      && !!player
      && player === this.activePlayer
      && player.lives > 0
      && player.recoveryState === 'none'
      && !this.turnTransitionPending()
      && !this.hasPendingTileResolution
      && !!this.explorationService.pendingTile
      && this.healingPortalSelection() === null
      && this.turnService.canMove;
  }

  /**
   * Valide un déplacement normal vers une destination précise.
   * Une même tuile n'est jamais une destination de déplacement.
   */
  canPerformNormalMovementTo(player: Player | null, x: number, y: number): boolean {
    if (!this.canPerformNormalMovement(player) || !player?.position) return false;
    return player.position.x !== x || player.position.y !== y;
  }

  /**
   * Valide un déplacement légal vers une tuile voisine déjà présente.
   *
   * DungeonService reste responsable de la géométrie. Cette méthode ajoute
   * les invariants du tour et les exceptions des pouvoirs de héros afin que
   * Board et IA utilisent une même source de vérité.
   */
  canMoveTo(
    player: Player | null,
    sourceTile: PlacedTile | null,
    destinationTile: PlacedTile | null,
  ): boolean {
    if (!this.canPerformNormalMovement(player) || !sourceTile || !destinationTile || !player?.position) {
      return false;
    }

    const actualSource = this.dungeonService.getTileAt(sourceTile.x, sourceTile.y);
    const actualDestination = this.dungeonService.getTileAt(destinationTile.x, destinationTile.y);
    if (!actualSource || !actualDestination || actualSource !== sourceTile || actualDestination !== destinationTile) {
      return false;
    }

    if (player.position.x !== actualSource.x || player.position.y !== actualSource.y) {
      return false;
    }

    const direction = DIRECTIONS.find(candidate =>
      this.dungeonService.getNeighbor(actualSource, candidate) === actualDestination,
    );
    if (!direction) return false;

    if (this.dungeonService.canMoveTo(actualSource, direction)) return true;

    return player.heroId === 'argentus' && !player.isCursed;
  }

  /** Signale Marche astrale uniquement après mutation réussie de la position. */
  recordAstralWalkIfUsed(player: Player, sourceTile: PlacedTile, destinationTile: PlacedTile): void {
    if (player.heroId !== 'argentus' || player.isCursed) return;
    const direction = DIRECTIONS.find(candidate => this.dungeonService.getNeighbor(sourceTile, candidate) === destinationTile);
    if (!direction || this.dungeonService.canMoveTo(sourceTile, direction)) return;
    this.lastAstralWalkPlayer.set(player);
    this.astralWalkRevision.update(revision => revision + 1);
  }

  /**
   * Indique si le sacrifice de Xanros peut encore changer l'issue du score.
   *
   * Le score est calculé à partir des trésors réellement possédés. Un héros
   * déjà strictement en tête n'a aucun intérêt à perdre un point de vie ; de
   * même, le sacrifice n'est proposé que si son point supplémentaire atteint
   * au moins le meilleur score adverse.
   */
  canUseXanrosSacrificeForScore(player: Player): boolean {
    if (!this.playerService.players.includes(player) || player.heroId !== 'xanros') return false;
    const playerScore = calculateTreasurePoints(player.treasures);
    const bestOpponentScore = Math.max(
      ...this.playerService.players
        .filter(candidate => candidate !== player)
        .map(candidate => calculateTreasurePoints(candidate.treasures)),
    );
    return Number.isFinite(bestOpponentScore)
      && playerScore <= bestOpponentScore
      && playerScore + 1 >= bestOpponentScore;
  }

  get canUseHealingPortal(): boolean {
    const player = this.activePlayer;
    const postSubstitution = this.pendingXanrosSubstitutionAction()?.player === player;
    return this.phase() === 'playing'
      && !!player
      && player.controller === 'human'
      && player.recoveryState === 'none'
      && !this.turnTransitionPending()
      && (!this.hasPendingTileResolution || postSubstitution)
      && !this.explorationService.pendingTile
      && this.healingPortalSelection() === null
      && player.inventory.spells.some(spell => spell?.effect === 'healing-portal')
      && this.getHealingFountains().length > 0;
  }

  /** Indique si le joueur actif peut volontairement utiliser la fontaine occupée. */
  get canUseHealingFountain(): boolean {
    const player = this.activePlayer;
    const tile = player?.position ? this.dungeonService.getTileAt(player.position.x, player.position.y) : undefined;
    const tileKey = tile ? this.groundKey(tile) : null;
    return this.phase() === 'playing'
      && !!player
      && player.lives > 0
      && player.recoveryState === 'none'
      && !this.turnTransitionPending()
      && !this.hasPendingTileResolution
      && !this.explorationService.pendingTile
      && this.healingPortalSelection() === null
      && this.turnService.canMove
      && !!tile
      && this.dungeonService.getTileDefinition(tile)?.feature === 'healing-fountain'
      && !this.isHealingFountainUsed(player, tileKey!)
      && (player.lives < 5 || player.isCursed);
  }

  /** Soigne volontairement le héros présent sur sa fontaine et termine son tour. */
  useHealingFountain(): boolean {
    if (!this.canUseHealingFountain) return false;
    const player = this.activePlayer;
    const tile = player?.position ? this.dungeonService.getTileAt(player.position.x, player.position.y) : undefined;
    if (!player || !tile || !this.playerService.restoreCompletely(player, 5)) return false;
    if (!this.turnService.consumeAllMovements()) return false;
    this.healingFountainUse.set({ player, tileKey: this.groundKey(tile) });
    this.showPlayerToast(player, TOAST_LABELS.healing(), 'success', 'healing', 'inventory-top', '♥');
    this.endTurn();
    return true;
  }

  private refreshHealingFountainPresence(player: Player | null, tileKey: string | null): void {
    const presenceKey = player && tileKey ? `${this.playerService.players.indexOf(player)}:${tileKey}` : null;
    if (presenceKey === this.healingFountainPresenceKey) return;
    this.healingFountainPresenceKey = presenceKey;
    const used = this.healingFountainUse();
    if (!used || !player || used.player !== player || used.tileKey !== tileKey) this.healingFountainUse.set(null);
  }

  private isHealingFountainUsed(player: Player, tileKey: string): boolean {
    const used = this.healingFountainUse();
    return used?.player === player && used.tileKey === tileKey;
  }

  private clearHealingFountainUseOnDeparture(player: Player, destinationTile: PlacedTile): void {
    const used = this.healingFountainUse();
    if (!used || used.player !== player) return;
    const destinationKey = this.groundKey(destinationTile);
    if (used.tileKey !== destinationKey) this.healingFountainUse.set(null);
  }

/** Gere openHealingPortalSelection et applique les gardes necessaires avant mutation. */
  openHealingPortalSelection(): boolean {
    if (!this.canUseHealingPortal || !this.activePlayer) return false;
    const fountains = this.getHealingFountains();
    this.healingPortalSelection.set({ user: this.activePlayer, target: this.activePlayer, destination: fountains[0] });
    return true;
  }

/** Gere closeHealingPortalSelection et applique les gardes necessaires avant mutation. */
  closeHealingPortalSelection(): void {
    this.healingPortalSelection.set(null);
  }

/** Gere selectHealingPortalTarget et applique les gardes necessaires avant mutation. */
  selectHealingPortalTarget(target: Player): void {
    const selection = this.healingPortalSelection();
    if (!selection || !this.playerService.players.includes(target)) return;
    this.healingPortalSelection.set({ ...selection, target });
  }

/** Gere selectHealingPortalDestination et applique les gardes necessaires avant mutation. */
  selectHealingPortalDestination(destination: PlacedTile): void {
    const selection = this.healingPortalSelection();
    if (!selection || !this.getHealingFountains().includes(destination)) return;
    this.healingPortalSelection.set({ ...selection, destination });
  }

/** Gere moveHealingPortalSelection et applique les gardes necessaires avant mutation. */
  moveHealingPortalSelection(step: 1 | -1): void {
    const selection = this.healingPortalSelection();
    const fountains = this.getHealingFountains();
    if (!selection || fountains.length < 2) return;
    const currentIndex = Math.max(0, fountains.indexOf(selection.destination as PlacedTile));
    const nextIndex = (currentIndex + step + fountains.length) % fountains.length;
    this.selectHealingPortalDestination(fountains[nextIndex]);
  }

  /**
   * Téléporte un héros vers une fontaine et consomme un Portail de guérison.
   * Aucun état n'est modifié avant la validation complète de l'action.
   */
  useHealingPortal(target: Player, destination: PlacedTile): boolean {
    const user = this.activePlayer;
    const postSubstitution = this.pendingXanrosSubstitutionAction()?.player === user;
    if (this.phase() !== 'playing' || !user || user.recoveryState !== 'none') return false;
    if (this.turnTransitionPending() || (this.hasPendingTileResolution && !postSubstitution) || this.explorationService.pendingTile) return false;
    if (!this.playerService.players.includes(target) || !this.playerService.players.includes(user)) return false;
    if (!user.inventory.spells.some(spell => spell?.effect === 'healing-portal')) return false;
    const validDestination = this.dungeonService.tiles.includes(destination)
      && this.dungeonService.getTileDefinition(destination)?.feature === 'healing-fountain';
    if (!validDestination) return false;

    const portalIndex = user.inventory.spells.findIndex(spell => spell?.effect === 'healing-portal');
    if (portalIndex < 0 || !target.position) return false;
    const portal = this.playerService.removeEquipment(user, 'spell', portalIndex);
    if (!portal) return false;

    this.playerService.movePlayerTo(target, destination.x, destination.y, target.facing ?? 'north');
    this.playerService.restoreCompletely(target, 5);
    this.showPlayerToast(target, TOAST_LABELS.healing(), 'success', 'healing', 'inventory-top', '♥');
    const activePortalSelection = this.healingPortalSelection();
    if (activePortalSelection?.user === user) {
      this.healingPortalSelection.set(null);
    }
    if (postSubstitution) {
      this.pendingXanrosSubstitutionAction.set(null);
      this.endTurn();
    }
    return true;
  }

  /**
   * Prépare la Réincarnation uniquement à partir du dernier combat résolu.
   *
   * Une fontaine unique est appliquée immédiatement. Lorsque plusieurs
   * destinations existent, la décision reste en attente sur le plateau.
   * L'IA choisit la première destination de manière déterministe.
   */
  beginHoranReincarnation(result: CombatResult): boolean {
    const player = result.player;
    const fountains = this.getHealingFountains();
    if (fountains.length === 0) {
      // Adaptation numérique provisoire : le manuel ne définit pas ce cas.
      // Le flux appelant conserve alors la récupération générique sans
      // inventer une élimination de Horan.
      return false;
    }
    if (
      this.phase() !== 'playing'
      || this.combatService.pendingCombat() !== null
      || this.combatService.lastCombatResult() !== result
      || result.outcome !== 'defeat'
      || player !== this.activePlayer
      || !this.playerService.players.includes(player)
      || player.heroId !== 'horan'
      || player.isCursed
      || player.lives !== 0
      || player.recoveryState !== 'pending'
      || this.horanReincarnationSelection() !== null
    ) {
      return false;
    }

    this.horanReincarnationSelection.set({
      player,
      destination: fountains[0],
    });

    if (fountains.length === 1 || player.controller === 'ai') {
      return this.confirmHoranReincarnation();
    }

    return true;
  }

  /** Sélectionne une fontaine valide pour la Réincarnation en attente. */
  selectHoranReincarnationDestination(destination: PlacedTile): void {
    const selection = this.horanReincarnationSelection();
    if (!selection || !this.getHealingFountains().includes(destination)) return;
    this.horanReincarnationSelection.set({ ...selection, destination });
  }

  /** Navigue entre les fontaines proposées pour la Réincarnation. */
  moveHoranReincarnationSelection(step: 1 | -1): void {
    const selection = this.horanReincarnationSelection();
    const fountains = this.getHealingFountains();
    if (!selection || fountains.length < 2) return;
    const currentIndex = Math.max(0, fountains.indexOf(selection.destination));
    const nextIndex = (currentIndex + step + fountains.length) % fountains.length;
    this.selectHoranReincarnationDestination(fountains[nextIndex]);
  }

  /** Applique une seule fois la destination de Réincarnation confirmée. */
  confirmHoranReincarnation(): boolean {
    const selection = this.horanReincarnationSelection();
    if (
      !selection
      || this.phase() !== 'playing'
      || selection.player !== this.activePlayer
      || selection.player.heroId !== 'horan'
      || selection.player.isCursed
      || selection.player.lives !== 0
      || selection.player.recoveryState !== 'pending'
      || !this.getHealingFountains().includes(selection.destination)
    ) {
      return false;
    }

    this.playerService.movePlayerTo(
      selection.player,
      selection.destination.x,
      selection.destination.y,
      selection.player.facing ?? 'north',
    );
    const restored = this.playerService.restoreCompletely(selection.player, 5);
    if (!restored) return false;

    this.horanReincarnationSelection.set(null);
    this.lastHoranReincarnationPlayer.set(selection.player);
    this.horanReincarnationRevision.update(revision => revision + 1);
    this.showPlayerToast(selection.player, TOAST_LABELS.healing(), 'success', 'healing', 'inventory-top', '♥');

    // La Réincarnation est une résolution de fin de combat : elle ne rend
    // pas les mouvements consommés et le tour reprend sa fin normale.
    this.endTurn();
    return true;
  }

  /** Vérifie que la proposition correspond toujours à l'objet présent au sol. */
  private isGroundEquipmentAvailable(pending: PendingGroundEquipment): boolean {
    return this.getGroundEquipment(pending.tile)[pending.index] === pending.equipment;
  }

  /** Retourne l'arme la plus faible uniquement pour une amélioration stricte. */
  private findStrictlyWeakerWeapon(player: Player, equipment: Equipment): number | null {
    if (equipment.kind !== 'weapon') return null;
    let weakestIndex = -1;
    let weakestBonus = Number.POSITIVE_INFINITY;
    player.inventory.weapons.forEach((weapon, index) => {
      if (weapon && weapon.attackBonus < weakestBonus) {
        weakestBonus = weapon.attackBonus;
        weakestIndex = index;
      }
    });
    return weakestIndex >= 0 && equipment.attackBonus > weakestBonus ? weakestIndex : null;
  }

  /** Retire exactement l'objet récupéré et notifie immédiatement le plateau. */
  private consumeGroundEquipment(pending: PendingGroundEquipment): boolean {
    const key = this.groundKey(pending.tile);
    if (pending.index !== 0 || this.groundEquipmentByTile.get(key) !== pending.equipment) return false;
    this.groundEquipmentByTile.delete(key);
    this.groundEquipmentRevision.update(value => value + 1);
    this.pendingGroundEquipment.set(null);
    this.finishMandatoryResolution();
    return true;
  }

  /** Permet de sélectionner un équipement directement sur la tuile du héros. */
  offerGroundEquipmentAt(tile: PlacedTile, index: number): boolean {
    const player = this.activePlayer;
    const postSubstitution = this.pendingXanrosSubstitutionAction()?.player === player;
    if (this.phase() !== 'playing' || !player || (player.controller !== 'human' && !postSubstitution)) return false;
    if (this.turnTransitionPending() || (this.hasPendingTileResolution && !postSubstitution) || this.explorationService.pendingTile) return false;
    if (!player.position || player.position.x !== tile.x || player.position.y !== tile.y) return false;
    if (index !== 0) return false;
    const equipment = this.getGroundEquipment(tile)[index];
    if (!equipment) return false;
    this.pendingGroundEquipment.set({ player, tile, equipment, index });
    if (postSubstitution) this.pendingXanrosSubstitutionAction.set(null);
    this.resolvePendingGroundEquipment();
    return true;
  }

  /**
   * Résout une récompense d'équipement sans exposer de choix inutile.
   *
   * Une case libre accepte aussi les exemplaires équivalents. Lorsque
   * l'inventaire est plein, seule une amélioration stricte est automatique ;
   * tout autre équipement reste sur la tuile sans créer d'attente.
   */
  resolvePendingRewardEquipment(): boolean {
    const pending = this.getActivePendingReward();
    if (!pending) return false;
    const rewardIndex = pending.remainingRewards.findIndex(reward => reward.kind === 'equipment');
    if (rewardIndex < 0) return false;
    const reward = pending.remainingRewards[rewardIndex];
    if (reward.kind !== 'equipment') return false;
    const equipment = getEquipmentDefinition(reward.equipmentId);
    if (!equipment) return false;

    if (this.playerService.canAddEquipment(pending.player, equipment)) {
      return this.collectPendingEquipment();
    }

    const slotIndex = this.findStrictlyWeakerWeapon(pending.player, equipment);
    if (slotIndex !== null) {
      return this.replacePendingEquipment(slotIndex);
    }

    // Un humain doit encore pouvoir choisir un emplacement compatible
    // lorsque l'inventaire est plein. L'IA, elle, conserve sa stratégie
    // déterministe et abandonne l'équipement inutilisable.
    if (
      pending.player.controller === 'human'
      && this.getReplaceableEquipmentSlots(pending.player, equipment).length > 0
    ) {
      return true;
    }

    return this.deferPendingRewardEquipment(pending, rewardIndex, equipment);
  }

  /** Résout automatiquement un équipement posé au sol. */
  resolvePendingGroundEquipment(): boolean {
    const pending = this.pendingGroundEquipment();
    if (!pending || this.phase() !== 'playing' || pending.player !== this.activePlayer) return false;

    if (this.playerService.canAddEquipment(pending.player, pending.equipment)) {
      return this.collectGroundEquipment();
    }

    const slotIndex = this.findStrictlyWeakerWeapon(pending.player, pending.equipment);
    if (slotIndex !== null) {
      return this.replaceGroundEquipment(slotIndex);
    }

    if (
      pending.player.controller === 'human'
      && this.getReplaceableEquipmentSlots(pending.player, pending.equipment).length > 0
    ) {
      return true;
    }

    return this.leaveGroundEquipment();
  }

  /** Retourne les emplacements qu'un joueur peut choisir pour un remplacement. */
  getReplaceableEquipmentSlots(player: Player, equipment: Equipment): number[] {
    const slotCount = equipment.kind === 'weapon'
      ? PLAYER_INVENTORY_CAPACITY.weapons
      : equipment.kind === 'spell'
        ? PLAYER_INVENTORY_CAPACITY.spells
        : PLAYER_INVENTORY_CAPACITY.key;
    return Array.from({ length: slotCount }, (_, index) => index)
      .filter(index => this.playerService.canReplaceEquipment(player, equipment, index));
  }

  /** Ramasse l'objet proposé si une place est disponible. */
  collectGroundEquipment(): boolean {
    const pending = this.pendingGroundEquipment();
    if (!pending || this.phase() !== 'playing' || pending.player !== this.activePlayer) return false;
    if (!this.isGroundEquipmentAvailable(pending)) return false;
    if (!this.playerService.addEquipment(pending.player, pending.equipment)) return false;
    this.consumeGroundEquipment(pending);
    this.announceEquipmentObtained(pending.player, pending.equipment);
    return true;
  }

  /** Échange un objet au sol contre un équipement du même type. */
  replaceGroundEquipment(slotIndex: number): boolean {
    const pending = this.pendingGroundEquipment();
    if (!pending || this.phase() !== 'playing' || pending.player !== this.activePlayer) return false;
    if (!this.isGroundEquipmentAvailable(pending)) return false;
    if (!this.playerService.canReplaceEquipment(pending.player, pending.equipment, slotIndex)) return false;
    const previous = this.playerService.replaceEquipment(pending.player, pending.equipment, slotIndex);
    if (!previous) return false;
    if (!this.replaceGroundEquipmentItem(pending.tile, pending.equipment, previous)) {
      this.playerService.replaceEquipment(pending.player, previous, slotIndex);
      return false;
    }
    this.pendingGroundEquipment.set(null);
    this.finishMandatoryResolution();
    if (pending.equipment.kind === 'weapon' && previous.kind === 'weapon') {
      this.announceWeaponReplacement(pending.player, pending.equipment);
    } else {
      this.announceEquipmentObtained(pending.player, pending.equipment);
    }
    return true;
  }

  /** Renonce à l'objet au sol : il reste disponible sur la tuile. */
  leaveGroundEquipment(): boolean {
    const pending = this.pendingGroundEquipment();
    if (!pending || this.phase() !== 'playing' || pending.player !== this.activePlayer) return false;
    this.pendingGroundEquipment.set(null);
    // Refuser un objet n'est pas une fin de tour : les mouvements restants
    // restent disponibles. Si le héros avait déjà consommé son dernier
    // mouvement, la fin automatique du tour reste toutefois applicable.
    if (!this.turnService.canMove) {
      this.finishMandatoryResolution();
    }
    return true;
  }

  // ==========================================================
  // RÉCUPÉRATION DES RÉCOMPENSES

  // ==========================================================

  /**
   * Consomme une récompense et conserve les autres sur le jeton.
   * Le tour ne se termine que lorsque toutes les résolutions sont terminées.
   */
  private consumePendingReward(pending: PendingReward, rewardIndex: number): void {
    const remainingRewards = pending.remainingRewards.filter((_, index) => index !== rewardIndex);
    const deferredRewards = this.remainingRewardsByTile.get(pending.rewardTile) ?? [];
    if (remainingRewards.length) {
      if (!deferredRewards.length) this.remainingRewardsByTile.delete(pending.rewardTile);
      this.pendingReward.set({ ...pending, remainingRewards });
      return;
    }
    if (deferredRewards.length) {
      this.pendingReward.set(null);
      this.finishMandatoryResolution();
      return;
    }
    this.remainingRewardsByTile.delete(pending.rewardTile);
    pending.rewardTile.tokenId = undefined;
    pending.rewardTile.tokenFace = undefined;
    this.pendingReward.set(null);
    if (pending.monster.id === 'dragon') {
      this.finishGame();
      return;
    }
    this.finishMandatoryResolution();
  }

  /** Retourne la récompense uniquement lorsqu'elle appartient au joueur actif. */
  private getActivePendingReward(): PendingReward | null {
    const pending = this.pendingReward();
    if (!pending || this.phase() !== 'playing' || pending.player !== this.activePlayer) {
      return null;
    }
    return pending;
  }

  /** Termine la partie une seule fois et fige le classement des trésors. */
  private finishGame(): void {
    if (this.phase() === 'game-over') return;
    const ranking = this.playerService.players
      .map(player => ({ player, points: calculateTreasurePoints(player.treasures) }))
      .sort((left, right) => right.points - left.points);
    const bestScore = ranking[0]?.points ?? 0;

    this.finalRanking.set(ranking);
    this.winners.set(ranking.filter(entry => entry.points === bestScore).map(entry => entry.player));
    if (this.turnTransitionTimer !== null) {
      clearTimeout(this.turnTransitionTimer);
      this.turnTransitionTimer = null;
    }
    this.clearUnstoppableContinuation();
    this.cancelXanrosSubstitution();
    this.pendingXanrosSubstitutionAction.set(null);
    this.optionalXanrosTreasure = false;
    this.turnTransitionPending.set(false);
    this.turnService.stopMovements();
    this.phase.set('game-over');
  }

  /** Récupère un équipement sans appliquer les autres récompenses implicitement. */
  collectPendingEquipment(): boolean {
    const pending = this.getActivePendingReward();
    if (!pending) return false;
    const rewardIndex = pending.remainingRewards.findIndex(reward => reward.kind === 'equipment');
    if (rewardIndex < 0) return false;
    const reward = pending.remainingRewards[rewardIndex];
    if (reward.kind !== 'equipment') return false;
    const equipment = getEquipmentDefinition(reward.equipmentId);
    if (!equipment || !this.playerService.addEquipment(pending.player, equipment)) return false;
    this.consumePendingReward(pending, rewardIndex);
    this.announceEquipmentObtained(pending.player, equipment);
    return true;
  }

  /**
   * Laisse un équipement inutile sans interrompre le tour.
   * L'objet devient un équipement au sol afin de rester disponible sans être
   * reproposé comme une récompense obligatoire.
   */
  leavePendingRewardEquipment(): boolean {
    const pending = this.getActivePendingReward();
    if (!pending) return false;
    const rewardIndex = pending.remainingRewards.findIndex(reward => reward.kind === 'equipment');
    if (rewardIndex < 0) return false;
    const reward = pending.remainingRewards[rewardIndex];
    if (reward.kind !== 'equipment') return false;
    const equipment = getEquipmentDefinition(reward.equipmentId);
    if (!equipment) return false;
    return this.deferPendingRewardEquipment(pending, rewardIndex, equipment);
  }

  /** Dépose uniquement l'équipement choisi et conserve les autres récompenses. */
  private deferPendingRewardEquipment(
    pending: PendingReward,
    rewardIndex: number,
    equipment: Equipment,
  ): boolean {
    const deferredReward = pending.remainingRewards[rewardIndex];
    if (deferredReward.kind !== 'equipment') return false;
    const remainingRewards = pending.remainingRewards.filter((_, index) => index !== rewardIndex);
    const groundIsOccupied = this.getGroundEquipment(pending.rewardTile).length > 0;
    if (!groundIsOccupied && !this.dropEquipment(pending.rewardTile, equipment)) return false;

    if (remainingRewards.length) {
      if (groundIsOccupied) this.remainingRewardsByTile.set(pending.rewardTile, [deferredReward]);
      this.pendingReward.set({ ...pending, remainingRewards });
      return true;
    }

    if (groundIsOccupied) this.remainingRewardsByTile.set(pending.rewardTile, [deferredReward]);
    else this.remainingRewardsByTile.set(pending.rewardTile, []);
    this.pendingReward.set(null);
    if (!groundIsOccupied && this.resolveGroundEquipmentAfterAction(pending.player, pending.rewardTile)) return true;
    this.finishMandatoryResolution();
    return true;
  }

  /**
   * Récupère la récompense trésor révélée après une victoire.
   *
   * L'identifiant de la récompense reste celui du jeton physique ;
   * le modèle joueur reçoit le type métier correspondant à son origine.
   */
  collectPendingTreasure(): boolean {
    const pending = this.getActivePendingReward();
    if (!pending) return false;

    const rewardIndex = pending.remainingRewards.findIndex(reward => reward.kind === 'treasure');
    if (rewardIndex < 0) return false;
    const reward = pending.remainingRewards[rewardIndex];
    if (reward.kind !== 'treasure') return false;

    const treasure = reward.tokenId === 'open-chest'
      ? 'monster-treasure'
      : reward.tokenId === 'treasure'
        ? 'dragon-ruby'
        : undefined;
    if (!treasure || !this.playerService.addTreasure(pending.player, treasure)) {
      return false;
    }

    this.consumePendingReward(pending, rewardIndex);
    this.showPlayerToast(pending.player, TOAST_LABELS.treasure(), 'success', 'treasure', 'treasure', '◆');
    return true;
  }

  /** Remplace l'équipement ciblé et dépose l'ancien si la tuile est libre. */
  replacePendingEquipment(slotIndex: number): boolean {
    const pending = this.getActivePendingReward();
    if (!pending) return false;
    const rewardIndex = pending.remainingRewards.findIndex(reward => reward.kind === 'equipment');
    if (rewardIndex < 0) return false;
    const reward = pending.remainingRewards[rewardIndex];
    if (reward.kind !== 'equipment') return false;
    const equipment = getEquipmentDefinition(reward.equipmentId);
    if (!equipment) return false;
    if (!this.playerService.canReplaceEquipment(pending.player, equipment, slotIndex)) return false;
    const previous = this.playerService.replaceEquipment(pending.player, equipment, slotIndex);
    if (!previous) return false;
    if (!this.depositOrDiscardReplacedEquipment(pending.rewardTile, equipment, previous)) {
      this.playerService.replaceEquipment(pending.player, previous, slotIndex);
      return false;
    }
    this.consumePendingReward(pending, rewardIndex);
    if (equipment.kind === 'weapon' && previous.kind === 'weapon') {
      this.announceWeaponReplacement(pending.player, equipment);
    } else {
      this.announceEquipmentObtained(pending.player, equipment);
    }
    return true;
  }

  /** Détenteur actuel de l'unique malédiction. */
  get cursedPlayer(): Player | null {
    return this.playerService.players.find(player => player.isCursed) ?? null;
  }

  /** Retourne les cibles légales de la malédiction actuellement en attente. */
  getPendingCurseTargets(): Player[] {
    const pending = this.pendingReward();
    if (!pending || !pending.remainingRewards.some(
      reward => reward.kind === 'special' && reward.effect === 'curse',
    )) {
      return [];
    }
    return this.playerService.players.filter(player => player !== pending.player);
  }

  /**
   * Attribue la malédiction à un autre joueur ou la laisse à son détenteur.
   * target === null signifie conserver le détenteur actuel (si présent).
   */
  resolvePendingCurse(target: Player | null): boolean {
    const pending = this.getActivePendingReward();
    if (!pending) return false;
    const rewardIndex = pending.remainingRewards.findIndex(
      reward => reward.kind === 'special' && reward.effect === 'curse',
    );
    if (rewardIndex < 0) return false;
    const currentHolder = this.cursedPlayer;
    if (target === null) {
      if (!currentHolder) return false;
    } else {
      if (target === pending.player || !this.playerService.players.includes(target)) return false;
      if (currentHolder && currentHolder !== target) {
        this.playerService.setCursed(currentHolder, false);
      }
      this.playerService.setCursed(target, true);
    }
    this.consumePendingReward(pending, rewardIndex);
    const cursedPlayer = target ?? currentHolder;
    if (!cursedPlayer) return false;
    this.showPlayerToast(cursedPlayer, TOAST_LABELS.cursed(), 'warning', 'curse', 'curse', '☠');
    return true;
  }

  /**
   * Laisse l'équipement sur la tuile pour une visite future.
   * La malédiction, lorsqu'elle est présente, doit d'abord être résolue.
   */
  leavePendingReward(): boolean {
    const pending = this.getActivePendingReward();
    if (!pending) return false;
    if (pending.remainingRewards.some(reward => reward.kind === 'special' && reward.effect === 'curse')) {
      return false;
    }
    const deferredRewards = this.remainingRewardsByTile.get(pending.rewardTile) ?? [];
    const remainingRewards = [...pending.remainingRewards, ...deferredRewards];
    if (remainingRewards.length) this.remainingRewardsByTile.set(pending.rewardTile, remainingRewards);
    this.pendingReward.set(null);
    this.finishMandatoryResolution();
    return true;
  }

  // ==========================================================
  // GESTION DES TOURS

  // ==========================================================

  /**
   * Termine le tour du joueur actuellement actif
   * et transmet la main au joueur suivant.
   *
   * ORDRE DES JOUEURS :
   *
   * L'ordre reste celui établi par les index :
   *
   * J1 → J2 → J3 → J4 → J5 → J1
   *
   * Le joueur désigné pendant le SETUP détermine uniquement
   * le point de départ de cette rotation.
   *
   * Exemple :
   *
   * premier joueur = J3
   *
   * J3 → J4 → J5 → J1 → J2 → J3
   *
   * Une fois le joueur suivant déterminé, son nouveau tour
   * commence avec l'intégralité de ses mouvements.
   */
  endTurn(): void {
    const transition = this.getTurnTransitionContext();
    if (!transition) return;

    // Conserver le joueur sortant pendant la pause entre les tours.
    this.turnTransitionPending.set(true);
    this.turnService.stopMovements();
    this.turnTransitionTimer = setTimeout(
      () => this.completeTurnTransition(transition),
      this.turnTransitionDelay,
    );
  }

  /** Retourne le contexte immuable nécessaire à une transition autorisée. */
  private getTurnTransitionContext(): {
    currentPlayerIndex: number;
    nextPlayerIndex: number;
    currentPlayer: Player | null;
  } | null {
    if (this.turnTransitionPending() || this.phase() !== 'playing') return null;

    // Une tuile piochée ou une résolution obligatoire appartient au joueur courant.
    if (
      this.explorationService.pendingTile
      || this.hasPendingTileResolution
      || this.healingPortalSelection() !== null
    ) {
      return null;
    }

    const currentPlayerIndex = this.activePlayerIndex();
    const playerCount = this.playerService.players.length;
    if (currentPlayerIndex === null || playerCount === 0) return null;

    return {
      currentPlayerIndex,
      nextPlayerIndex: (currentPlayerIndex + 1) % playerCount,
      currentPlayer: this.activePlayer,
    };
  }

  /** Applique une transition seulement si son contexte est encore valide. */
  private completeTurnTransition(transition: {
    currentPlayerIndex: number;
    nextPlayerIndex: number;
    currentPlayer: Player | null;
  }): void {
    this.turnTransitionTimer = null;
    if (
      this.phase() !== 'playing'
      || this.activePlayerIndex() !== transition.currentPlayerIndex
    ) {
      this.clearUnstoppableContinuation();
      this.cancelXanrosSubstitution();
      this.pendingXanrosSubstitutionAction.set(null);
      this.optionalXanrosTreasure = false;
      this.turnTransitionPending.set(false);
      return;
    }

    if (transition.currentPlayer) {
      this.playerService.completeRecoveryTurn(transition.currentPlayer);
    }
    this.clearUnstoppableContinuation();
    this.cancelXanrosSubstitution();
    this.pendingXanrosSubstitutionAction.set(null);
    this.optionalXanrosTreasure = false;
    this.turnService.resetMovements();
    this.activePlayerIndex.set(transition.nextPlayerIndex);
    this.prepareActivePlayerTurn();
    this.turnTransitionPending.set(false);
    this.scheduleRecoveryTurnCompletion(transition.nextPlayerIndex);
  }

  /** Prépare le tour actif, y compris le tour obligatoire de récupération. */
  private prepareActivePlayerTurn(): void {
    const player = this.activePlayer;
    if (!player || player.recoveryState !== 'pending') return;
    if (this.playerService.beginRecoveryTurn(player)) {
      this.recoveryRevision.update(revision => revision + 1);
    }
    this.turnService.stopMovements();
  }

  /** Termine automatiquement un tour consacré au repos, quel que soit le contrôleur. */
  private scheduleRecoveryTurnCompletion(playerIndex: number): void {
    queueMicrotask(() => {
      if (
        this.phase() === 'playing'
        && !this.turnTransitionPending()
        && this.activePlayerIndex() === playerIndex
        && this.activePlayer?.recoveryState === 'resting'
      ) {
        this.endTurn();
      }
    });
  }

  /**
   * Retourne la valeur d'un dé classique à six faces.
   */
  private rollDie(): number {
    return Math.floor(Math.random() * 6) + 1;
  }

  /**
   * Première étape du SETUP : prépare le donjon.
   */
  private initializeDungeon(): void {
    this.dungeonService.initialize();
  }

  /**
   * Réinitialise l'état transitoire d'exploration.
   */
  private initializeExploration(): void {
    this.explorationService.initialize();
  }

  /**
   * Deuxième étape du SETUP : prépare les 79 tuiles
   * restantes utilisées pour l'exploration.
   */
  private initializeTileDeck(): void {
    this.tileDeckService.initialize();
  }

  /**
   * Prépare le sachet monstres/trésors pour une nouvelle partie.
   *
   * RÈGLE OFFICIELLE KARAK :
   *
   * le sachet du jeu de base contient initialement :
   *
   * - 43 monstres ;
   * - 10 coffres ;
   * - soit 53 jetons au total.
   *
   * Les jetons sont mélangés afin que chaque salle nouvellement
   * découverte puisse en recevoir un aléatoirement.
   */
  private initializeTokenBag(): void {
    this.tokenBagService.initialize();
  }

  /**
   * Garantit que le donjon possède bien sa tuile de départ.
   *
   * DungeonService.initialize() est déjà appelé au début d'une
   * nouvelle partie. On évite donc de le rappeler tant que la
   * tuile Départ existe, car une réinitialisation complète
   * détruirait les futures tuiles explorées.
   */
  private ensureStartTileExists(): void {
    const startTile = this.dungeonService.getTileAt(0, 0);
    if (startTile?.definitionId === 'start') {
      return;
    }
    this.dungeonService.initialize();
  }

  /**
   * Nombre de joueurs actuellement préparés.
   *
   * Ce nombre comprend les joueurs humains et les IA.
   */
  get playerCount(): number {
    return this.playerService.players.length;
  }

  /**
   * Joueurs actuellement préparés.
   *
   * Chaque joueur expose notamment son type de contrôleur
   * via Player.controller.
   */
  get players(): readonly Player[] {
    return this.playerService.players;
  }

  /**
   * Joueur actuellement actif, lorsqu'une aventure est en cours.
   */
  get activePlayer(): Player | null {
    const activePlayerIndex = this.activePlayerIndex();
    if (activePlayerIndex === null) {
      return null;
    }
    return this.playerService.players[activePlayerIndex] ?? null;
  }

  /**
   * Retourne l'ordre cyclique des joueurs à partir d'un index.
   *
   * Le lancer initial détermine uniquement le premier joueur.
   * Ensuite, la rotation suit toujours l'ordre naturel des index :
   *
   * J1 → J2 → J3 → J4 → J5 → J1
   *
   * Cette méthode ne trie donc jamais les joueurs par score de dés.
   */
  getTurnOrderFrom(startPlayerIndex: number | null = this.activePlayerIndex()): number[] {
    const playerCount = this.playerService.players.length;
    if (
      playerCount === 0 ||
      startPlayerIndex === null ||
      startPlayerIndex < 0 ||
      startPlayerIndex >= playerCount
    ) {
      return [];
    }
    return Array.from(
      {
        length: playerCount,
      },
      (_, offset) => (startPlayerIndex + offset) % playerCount,
    );
  }
}
