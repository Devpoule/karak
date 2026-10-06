import { Injectable, signal } from '@angular/core';

import { GamePhase, SetupStep } from '../models/game';
import { Player } from '../models/player';
import { DungeonService } from './dungeon.service';
import { ExplorationService } from './exploration.service';
import { PlayerService } from './player.service';
import { TileDeckService } from './tile-deck.service';
import { TokenBagService } from './token-bag.service';
import { TurnService } from './turn.service';

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

  constructor(
    private readonly dungeonService: DungeonService,
    private readonly explorationService: ExplorationService,
    private readonly tileDeckService: TileDeckService,
    private readonly tokenBagService: TokenBagService,
    private readonly playerService: PlayerService,
    private readonly turnService: TurnService,
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
    this.phase.set('setup');
    this.setupStep.set('player-count');

    this.firstPlayerRolls.set([]);
    this.firstPlayerContenders.set([]);
    this.firstPlayerIndex.set(null);
    this.activePlayerIndex.set(null);

    this.initializeDungeon();
    this.initializeExploration();
    this.initializeTileDeck();
    this.initializeTokenBag();
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

    const currentPlayerIndex = this.activePlayerIndex();
    const playerCount = this.playerService.players.length;

    if (currentPlayerIndex === null || playerCount === 0) {
      return;
    }

    const nextPlayerIndex = (currentPlayerIndex + 1) % playerCount;

    this.activePlayerIndex.set(nextPlayerIndex);

    this.turnService.resetMovements();
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
