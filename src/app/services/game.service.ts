import { Injectable, signal } from '@angular/core';
import { GamePhase, SetupStep } from '../models/game';
import { getTokenDefinition } from '../data/token-definitions';
import { getEquipmentDefinition } from '../data/equipment-definitions';
import { Equipment } from '../models/equipment';
import { PlacedTile } from '../models/tile';
import { Player } from '../models/player';
import { MonsterReward, MonsterTokenDefinition, TreasureTokenDefinition } from '../models/token';
import { DungeonService } from './dungeon.service';
import { ExplorationService } from './exploration.service';
import { PlayerService } from './player.service';
import { TileDeckService } from './tile-deck.service';
import { TokenBagService } from './token-bag.service';
import { TurnService } from './turn.service';
import { CombatService } from './combat.service';

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
export type TileEntryResolution = 'none' | 'combat' | 'treasure' | 'reward' | 'equipment';

/** Objet au sol en attente d'une décision du joueur. */
export interface PendingGroundEquipment {
  player: Player;
  tile: PlacedTile;
  equipment: Equipment;
  index: number;
}
@Injectable({
  providedIn: 'root',
})
export class GameService {

  /**
   * Phase globale actuelle de la partie.
   */
  readonly phase = signal<GamePhase>('setup');

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
   * Cette tranche ne gère pas encore son ouverture : elle
   * représente uniquement l'obligation de s'arrêter dessus.
   */
  readonly pendingTreasure = signal<PendingTreasure | null>(null);

  /** Récompense en attente de prise en charge par l'interface. */
  readonly pendingReward = signal<PendingReward | null>(null);

  /** Équipement présent sur la tuile et proposé au joueur actif. */
  readonly pendingGroundEquipment = signal<PendingGroundEquipment | null>(null);

  /** Objets déposés indépendamment des jetons monstres/trésors. */
  private groundEquipmentByTile = new Map<string, Equipment[]>();
  /** Révision réactive de l'affichage des équipements au sol. */
  readonly groundEquipmentRevision = signal(0);

  private groundKey(tile: PlacedTile): string {
    return `${tile.x}:${tile.y}`;
  }

  /** Une transition bloque les actions jusqu'à l'arrivée du prochain joueur. */
  readonly turnTransitionPending = signal(false);
  private readonly turnTransitionDelay = 2800;
  private turnTransitionTimer: ReturnType<typeof setTimeout> | null = null;

  /** Récompenses restant sur chaque jeton retourné après une récupération partielle. */
  private remainingRewardsByTile = new WeakMap<PlacedTile, readonly MonsterReward[]>();

  /**
   * Indique si l'entrée sur une tuile a déclenché une résolution
   * obligatoire qui doit être traitée avant toute autre action.
   */
  get hasPendingTileResolution(): boolean {
    return this.combatService.hasPendingCombat
      || this.pendingTreasure() !== null
      || this.pendingReward() !== null
      || this.pendingGroundEquipment() !== null;
  }
  constructor(
    private readonly dungeonService: DungeonService,
    private readonly explorationService: ExplorationService,
    private readonly tileDeckService: TileDeckService,
    private readonly tokenBagService: TokenBagService,
    private readonly playerService: PlayerService,
    private readonly turnService: TurnService,
    private readonly combatService: CombatService,
  ) {}

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
    if (this.turnTransitionTimer !== null) {
      clearTimeout(this.turnTransitionTimer);
      this.turnTransitionTimer = null;
    }
    this.turnTransitionPending.set(false);
    this.phase.set('setup');
    this.setupStep.set('player-count');
    this.firstPlayerRolls.set([]);
    this.firstPlayerContenders.set([]);
    this.firstPlayerIndex.set(null);
    this.activePlayerIndex.set(null);
    this.pendingTreasure.set(null);
    this.pendingReward.set(null);
    this.pendingGroundEquipment.set(null);
    this.groundEquipmentByTile = new Map<string, Equipment[]>();
    this.groundEquipmentRevision.update(value => value + 1);
    this.remainingRewardsByTile = new WeakMap<PlacedTile, readonly MonsterReward[]>();
    this.initializeDungeon();
    this.initializeExploration();
    this.initializeTileDeck();
    this.initializeTokenBag();
    this.initializeCombat();
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
  revealNewRoom(tile: PlacedTile): void {
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
    const token = this.tokenBagService.draw();
    if (!token) {
      return;
    }
    tile.tokenId = token.id;
    tile.tokenFace = 'front';
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
  ): TileEntryResolution {
    if (this.hasPendingTileResolution) {
      return 'none';
    }
    if (revealRoom) {
      this.revealNewRoom(destinationTile);
    }
    if (!destinationTile.tokenId) {
      return this.offerGroundEquipment(player, destinationTile);
    }
    const token = getTokenDefinition(destinationTile.tokenId);
    if (!token) {
      return 'none';
    }
    // Le verso d'un monstre contient une récompense, pas un adversaire.
    if (token.kind === 'monster' && destinationTile.tokenFace === 'back') {
      const remainingRewards = this.remainingRewardsByTile.get(destinationTile) ?? token.rewards ?? [];
      if (!remainingRewards.length) return this.offerGroundEquipment(player, destinationTile);
      this.turnService.stopMovements();
      this.pendingReward.set({
        player,
        monster: token,
        rewardTile: destinationTile,
        sourceTile,
        remainingRewards: [...remainingRewards],
      });
      return 'reward';
    }
    // Un coffre déjà retourné ne peut pas être ouvert à nouveau.
    if (token.kind === 'treasure' && destinationTile.tokenFace === 'back') {
      return this.offerGroundEquipment(player, destinationTile);
    }
    this.turnService.stopMovements();
    if (token.kind === 'monster') {
      return this.combatService.startCombat(player, sourceTile, destinationTile)
        ? 'combat'
        : 'none';
    }
    this.pendingTreasure.set({
      player,
      treasure: token,
      treasureTile: destinationTile,
      sourceTile,
    });
    return 'treasure';
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
    const equipment = this.playerService.removeEquipment(player, kind, slotIndex);
    if (!equipment) return false;
    this.dropEquipment(tile, equipment);
    return true;
  }

  /** Liste en lecture seule des équipements présents sur une tuile. */
  getGroundEquipment(tile: PlacedTile): readonly Equipment[] {
    this.groundEquipmentRevision();
    return this.groundEquipmentByTile.get(this.groundKey(tile)) ?? [];
  }

  /** Dépose un objet sans altérer le jeton éventuellement présent. */
  private dropEquipment(tile: PlacedTile, equipment: Equipment): void {
    const key = this.groundKey(tile);
    const items = this.groundEquipmentByTile.get(key) ?? [];
    this.groundEquipmentByTile.set(key, [...items, equipment]);
    this.groundEquipmentRevision.update(value => value + 1);
  }

  /** Propose le premier objet au sol lors de l'entrée sur une tuile libre. */
  private offerGroundEquipment(player: Player, tile: PlacedTile): TileEntryResolution {
    const equipment = this.getGroundEquipment(tile)[0];
    if (!equipment) return 'none';
    this.turnService.stopMovements();
    this.pendingGroundEquipment.set({ player, tile, equipment, index: 0 });
    return 'equipment';
  }

  /** Vérifie que la proposition correspond toujours à l'objet présent au sol. */
  private isGroundEquipmentAvailable(pending: PendingGroundEquipment): boolean {
    return this.getGroundEquipment(pending.tile)[pending.index] === pending.equipment;
  }

  /** Retire exactement l'objet récupéré et notifie immédiatement le plateau. */
  private consumeGroundEquipment(pending: PendingGroundEquipment): boolean {
    const key = this.groundKey(pending.tile);
    const items = [...this.getGroundEquipment(pending.tile)];
    if (items[pending.index] !== pending.equipment) return false;
    items.splice(pending.index, 1);
    if (items.length) this.groundEquipmentByTile.set(key, items);
    else this.groundEquipmentByTile.delete(key);
    this.groundEquipmentRevision.update(value => value + 1);
    this.pendingGroundEquipment.set(null);
    this.endTurn();
    return true;
  }

  /** Permet de sélectionner un équipement directement sur la tuile du héros. */
  offerGroundEquipmentAt(tile: PlacedTile, index: number): boolean {
    const player = this.activePlayer;
    if (this.phase() !== 'playing' || !player || player.controller !== 'human') return false;
    if (this.turnTransitionPending() || this.hasPendingTileResolution || this.explorationService.pendingTile) return false;
    if (!player.position || player.position.x !== tile.x || player.position.y !== tile.y) return false;
    if (!Number.isInteger(index) || index < 0) return false;
    const equipment = this.getGroundEquipment(tile)[index];
    if (!equipment) return false;
    this.turnService.stopMovements();
    this.pendingGroundEquipment.set({ player, tile, equipment, index });
    return true;
  }

  /** Ramasse l'objet proposé si une place est disponible. */
  collectGroundEquipment(): boolean {
    const pending = this.pendingGroundEquipment();
    if (!pending || this.phase() !== 'playing' || pending.player !== this.activePlayer) return false;
    if (!this.isGroundEquipmentAvailable(pending)) return false;
    if (!this.playerService.addEquipment(pending.player, pending.equipment)) return false;
    this.consumeGroundEquipment(pending);
    return true;
  }

  /** Échange un objet au sol contre un équipement du même type. */
  replaceGroundEquipment(slotIndex: number): boolean {
    const pending = this.pendingGroundEquipment();
    if (!pending || this.phase() !== 'playing' || pending.player !== this.activePlayer) return false;
    if (!this.isGroundEquipmentAvailable(pending)) return false;
    const previous = this.playerService.replaceEquipment(pending.player, pending.equipment, slotIndex);
    if (!previous) return false;
    this.consumeGroundEquipment(pending);
    this.dropEquipment(pending.tile, previous);
    return true;
  }

  /** Renonce à l'objet au sol : il reste disponible sur la tuile. */
  leaveGroundEquipment(): boolean {
    const pending = this.pendingGroundEquipment();
    if (!pending || this.phase() !== 'playing' || pending.player !== this.activePlayer) return false;
    this.pendingGroundEquipment.set(null);
    this.endTurn();
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
    if (remainingRewards.length) {
      this.remainingRewardsByTile.set(pending.rewardTile, remainingRewards);
      this.pendingReward.set({ ...pending, remainingRewards });
      return;
    }
    this.remainingRewardsByTile.delete(pending.rewardTile);
    pending.rewardTile.tokenId = undefined;
    pending.rewardTile.tokenFace = undefined;
    this.pendingReward.set(null);
    this.endTurn();
  }

  /** Récupère un équipement sans appliquer les autres récompenses implicitement. */
  collectPendingEquipment(): boolean {
    const pending = this.pendingReward();
    if (!pending || this.phase() !== 'playing' || pending.player !== this.activePlayer) return false;
    const rewardIndex = pending.remainingRewards.findIndex(reward => reward.kind === 'equipment');
    if (rewardIndex < 0) return false;
    const reward = pending.remainingRewards[rewardIndex];
    if (reward.kind !== 'equipment') return false;
    const equipment = getEquipmentDefinition(reward.equipmentId);
    if (!equipment || !this.playerService.addEquipment(pending.player, equipment)) return false;
    this.consumePendingReward(pending, rewardIndex);
    return true;
  }

  /** Remplace un équipement plein et dépose l'ancien sur la tuile du combat. */
  replacePendingEquipment(slotIndex: number): boolean {
    const pending = this.pendingReward();
    if (!pending || this.phase() !== 'playing' || pending.player !== this.activePlayer) return false;
    const rewardIndex = pending.remainingRewards.findIndex(reward => reward.kind === 'equipment');
    if (rewardIndex < 0) return false;
    const reward = pending.remainingRewards[rewardIndex];
    if (reward.kind !== 'equipment') return false;
    const equipment = getEquipmentDefinition(reward.equipmentId);
    if (!equipment) return false;
    const previous = this.playerService.replaceEquipment(pending.player, equipment, slotIndex);
    if (!previous) return false;
    this.dropEquipment(pending.rewardTile, previous);
    this.consumePendingReward(pending, rewardIndex);
    return true;
  }

  /** Détenteur actuel de l'unique malédiction. */
  get cursedPlayer(): Player | null {
    return this.playerService.players.find(player => player.isCursed) ?? null;
  }

  /**
   * Attribue la malédiction à un autre joueur ou la laisse à son détenteur.
   * target === null signifie conserver le détenteur actuel (si présent).
   */
  resolvePendingCurse(target: Player | null): boolean {
    const pending = this.pendingReward();
    if (!pending || this.phase() !== 'playing' || pending.player !== this.activePlayer) return false;
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
    return true;
  }

  /**
   * Laisse l'équipement sur la tuile pour une visite future.
   * La malédiction, lorsqu'elle est présente, doit d'abord être résolue.
   */
  leavePendingReward(): boolean {
    const pending = this.pendingReward();
    if (!pending || this.phase() !== 'playing' || pending.player !== this.activePlayer) return false;
    if (pending.remainingRewards.some(reward => reward.kind === 'special' && reward.effect === 'curse')) {
      return false;
    }
    this.pendingReward.set(null);
    this.endTurn();
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
    if (this.turnTransitionPending()) return;
    if (this.phase() !== 'playing') {
      return;
    }
    /*
     * Un changement de joueur est interdit tant qu'une
     * exploration attend encore sa confirmation.
     *
     * Cela évite qu'une tuile piochée par un joueur soit
     * finalement manipulée pendant le tour du suivant.
     */
    if (this.explorationService.pendingTile) {
      return;
    }
    /*
     * Un combat ou un coffre obligatoire doit être résolu avant
     * que la main puisse passer au joueur suivant.
     */
    if (this.hasPendingTileResolution) {
      return;
    }
    const currentPlayerIndex = this.activePlayerIndex();
    const playerCount = this.playerService.players.length;
    if (currentPlayerIndex === null || playerCount === 0) {
      return;
    }
    const nextPlayerIndex = (currentPlayerIndex + 1) % playerCount;
    // Conserver le joueur sortant pendant la pause entre les tours.
    this.turnTransitionPending.set(true);
    this.turnService.stopMovements();
    this.turnTransitionTimer = setTimeout(() => {
      this.turnTransitionTimer = null;
      if (this.phase() !== 'playing' || this.activePlayerIndex() !== currentPlayerIndex) {
        this.turnTransitionPending.set(false);
        return;
      }
      this.turnService.resetMovements();
      this.activePlayerIndex.set(nextPlayerIndex);
      this.turnTransitionPending.set(false);
    }, this.turnTransitionDelay);
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
