import { Injectable, signal } from '@angular/core';

import { GamePhase, SetupStep } from '../models/game';
import { Player } from '../models/player';
import { DungeonService } from './dungeon.service';
import { PlayerService } from './player.service';
import { TileDeckService } from './tile-deck.service';

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
  readonly setupStep =
    signal<SetupStep>('player-count');

  /**
   * Résultats définitifs du tour de lancer actuellement joué.
   *
   * Leur présence dans le moteur ne signifie pas qu'ils doivent
   * être immédiatement révélés par l'interface.
   */
  readonly firstPlayerRolls =
    signal<FirstPlayerRoll[]>([]);

  /**
   * Joueurs encore en lice pour commencer la partie.
   *
   * Au premier lancer, tous les joueurs participent.
   * En cas d'égalité au meilleur score, seuls les joueurs
   * concernés restent en lice pour le lancer suivant.
   */
  readonly firstPlayerContenders =
    signal<number[]>([]);

  /**
   * Index du joueur définitivement désigné pour commencer.
   *
   * Tant qu'aucun maximum unique n'existe, la valeur reste null.
   */
  readonly firstPlayerIndex =
    signal<number | null>(null);

  constructor(
    private readonly dungeonService: DungeonService,
    private readonly tileDeckService: TileDeckService,
    private readonly playerService: PlayerService,
  ) {}

  /**
   * Commence la préparation d'une nouvelle partie.
   */
  initialize(): void {
    this.phase.set('setup');
    this.setupStep.set('player-count');

    this.firstPlayerRolls.set([]);
    this.firstPlayerContenders.set([]);
    this.firstPlayerIndex.set(null);

    this.initializeDungeon();
    this.initializeTileDeck();
  }

  /**
   * Prépare les joueurs participant à la partie.
   *
   * RÈGLE OFFICIELLE KARAK :
   *
   * chaque joueur reçoit un plateau d'inventaire et commence
   * la partie avec 5 jetons de vie face cœur.
   */
  initializePlayers(playerCount: number): void {
    if (this.phase() !== 'setup') return;
    if (this.setupStep() !== 'player-count') return;

    this.playerService.initialize(playerCount);

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

    this.firstPlayerContenders.set(
      this.playerService.players.map(
        (_, playerIndex) => playerIndex,
      ),
    );

    this.setupStep.set('first-player-roll');
  }

  /**
   * Lance les deux dés d'un joueur encore en lice.
   */
  rollPlayerForFirstPlayer(playerIndex: number): void {
    if (this.phase() !== 'setup') return;
    if (this.setupStep() !== 'first-player-roll') return;
    if (this.firstPlayerIndex() !== null) return;

    if (
      !this.firstPlayerContenders().includes(playerIndex)
    ) {
      return;
    }

    const alreadyRolled = this.firstPlayerRolls().some(
      (roll) => roll.playerIndex === playerIndex,
    );

    if (alreadyRolled) {
      return;
    }

    const die1 = this.rollDie();
    const die2 = this.rollDie();

    this.firstPlayerRolls.update(
      (rolls) => [
        ...rolls,
        {
          playerIndex,
          die1,
          die2,
          total: die1 + die2,
        },
      ],
    );
  }

  /**
   * Indique si tous les joueurs encore en lice
   * ont effectué leur lancer actuel.
   */
  get haveAllContendersRolled(): boolean {
    return this.firstPlayerContenders().every(
      (playerIndex) =>
        this.firstPlayerRolls().some(
          (roll) => roll.playerIndex === playerIndex,
        ),
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
   * - winner : un joueur est définitivement désigné ;
   * - tie    : plusieurs joueurs doivent relancer ;
   * - pending: tous les lancers nécessaires ne sont pas faits.
   */
  resolveFirstPlayerRoll():
    | 'winner'
    | 'tie'
    | 'pending' {
    if (!this.haveAllContendersRolled) {
      return 'pending';
    }

    const contenderRolls =
      this.firstPlayerRolls().filter(
        (roll) =>
          this.firstPlayerContenders().includes(
            roll.playerIndex,
          ),
      );

    const highestTotal = Math.max(
      ...contenderRolls.map((roll) => roll.total),
    );

    const leaders = contenderRolls.filter(
      (roll) => roll.total === highestTotal,
    );

    if (leaders.length === 1) {
      this.firstPlayerIndex.set(
        leaders[0].playerIndex,
      );

      return 'winner';
    }

    const tiedPlayerIndexes = leaders.map(
      (roll) => roll.playerIndex,
    );

    this.firstPlayerContenders.set(
      tiedPlayerIndexes,
    );

    /*
     * Les résultats des joueurs à égalité sont retirés afin
     * de leur permettre d'effectuer leur nouveau lancer.
     *
     * Les anciens résultats des joueurs éliminés restent
     * disponibles pour l'affichage récapitulatif.
     */
    this.firstPlayerRolls.update(
      (rolls) =>
        rolls.filter(
          (roll) =>
            !tiedPlayerIndexes.includes(
              roll.playerIndex,
            ),
        ),
    );

    return 'tie';
  }

  /**
   * Indique si un joueur est encore concerné
   * par la détermination du premier joueur.
   */
  isFirstPlayerContender(
    playerIndex: number,
  ): boolean {
    return this.firstPlayerContenders().includes(
      playerIndex,
    );
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
   * Deuxième étape du SETUP : prépare les 79 tuiles
   * restantes utilisées pour l'exploration.
   */
  private initializeTileDeck(): void {
    this.tileDeckService.initialize();
  }

  /**
   * Nombre de joueurs actuellement préparés.
   */
  get playerCount(): number {
    return this.playerService.players.length;
  }

  /**
   * Joueurs actuellement préparés.
   */
  get players(): readonly Player[] {
    return this.playerService.players;
  }
}
