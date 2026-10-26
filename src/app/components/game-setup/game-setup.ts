import {
  Component,
  effect,
  signal,
} from '@angular/core';

import {
  getHeroDefinition,
  getHeroIdentityColor,
  HERO_CARD_BACK,
  HERO_DEFINITIONS,
} from '../../data/hero-definitions';

import {
  FirstPlayerRoll,
  GameService,
} from '../../services/game.service';

import {
  MAX_PLAYER_COUNT,
  MIN_PLAYER_COUNT,
} from '../../services/player.service';
import { SetupStep } from '../../models/game';
import { ContextualHelpComponent } from '../contextual-help/contextual-help';
import { PREPARATION_HELP } from '../../data/contextual-help';

/**
 * Vue actuellement affichée dans le panneau principal.
 *
 * welcome :
 * écran d'accueil minimal présentant uniquement
 * l'action permettant de démarrer une partie.
 *
 * setup :
 * parcours complet de préparation de la partie.
 */
type SetupView =
  | 'welcome'
  | 'setup';

type GameMode =
  | 'solo'
  | 'friends'
  | 'ai';

/**
 * États visuels du tirage des héros.
 */
type HeroDrawState =
  | 'hidden'
  | 'drawing'
  | 'revealed';

/**
 * États visuels de la détermination
 * du premier joueur.
 */
type FirstPlayerResolutionState =
  | 'rolling'
  | 'tie-transition'
  | 'tie'
  | 'winner'
  | 'waiting';

@Component({
  selector: 'app-game-setup',
  imports: [ContextualHelpComponent],
  templateUrl: './game-setup.html',
  styleUrl: './game-setup.scss',
})
export class GameSetup {
  readonly preparationHelp = PREPARATION_HELP;
  /**
   * Vue initiale du jeu.
   *
   * Le panneau principal existe dès l'arrivée sur l'application,
   * mais son contenu de préparation reste volontairement masqué.
   *
   * Le joueur découvre d'abord uniquement l'action "Jouer".
   */
  readonly setupView = signal<SetupView>('setup');

  /**
   * Ouvre la préparation d'une nouvelle partie.
   *
   * Aucun changement de route n'est nécessaire :
   * l'écran d'accueil et le SETUP appartiennent au même composant.
   *
   * Le passage de "welcome" à "setup" déclenche l'animation
   * d'apparition définie dans game-setup.scss.
   */
  startNewGame(): void {
    this.setupView.set('setup');
  }

  // ==========================================================
  // CONFIGURATION DES JOUEURS
  // ==========================================================

  /**
   * Nombres de participants disponibles.
   *
   * RÈGLE DE L'APPLICATION :
   *
   * une partie oppose toujours au minimum deux aventuriers.
   *
   * Le premier joueur est humain par défaut. Le mode IA contre IA
   * permet toutefois de confier tous les participants à l'IA.
   *
   * Avec les règles actuelles de Karak :
   *
   * minimum : 2 joueurs ;
   * maximum : 5 joueurs.
   */
  readonly playerCounts = Array.from(
    {
      length:
        MAX_PLAYER_COUNT
        - MIN_PLAYER_COUNT
        + 1,
    },
    (_, index) =>
      index + MIN_PLAYER_COUNT,
  );

  /**
   * Nombre total de participants sélectionné.
   *
   * Une nouvelle partie commence par défaut
   * avec deux aventuriers :
   *
   * J1 : humain ;
   * J2 : IA.
   */
  selectedPlayerCount =
    MIN_PLAYER_COUNT;

  /**
   * Nombre de joueurs humains.
   *
   * J1 est toujours humain.
   *
   * Tous les participants suivants sont contrôlés
   * par l'IA par défaut.
   *
   * Exemple avec 5 participants :
   *
   * humanPlayerCount = 1
   *
   * J1 humain
   * J2 IA
   * J3 IA
   * J4 IA
   * J5 IA
   */
  humanPlayerCount = 1;

  /** Indique qu'une simulation entièrement automatisée est demandée. */
  aiVsAi = false;

  /**
   * Indique si la configuration du multijoueur local
   * est actuellement affichée.
   *
   * Elle reste fermée par défaut afin de conserver
   * un parcours simple pour le cas principal :
   *
   * un joueur humain contre l'ordinateur.
   */
  localMultiplayerOpen = false;

  /** Résumé lisible de la configuration réellement envoyée au moteur. */
  get gameSummary(): string {
    if (this.aiVsAi) {
      return `${this.selectedPlayerCount} aventuriers IA`;
    }

    if (this.humanPlayerCount === 1) {
      const aiCount = this.selectedPlayerCount - 1;
      return `Vous + ${aiCount} ${aiCount === 1 ? 'adversaire IA' : 'adversaires IA'}`;
    }

    const aiCount = this.selectedPlayerCount - this.humanPlayerCount;
    if (aiCount === 0) {
      return `${this.humanPlayerCount} joueurs humains`;
    }

    return `${this.humanPlayerCount} joueurs humains + ${aiCount} ${aiCount === 1 ? 'adversaire IA' : 'adversaires IA'}`;
  }

  /** Indique le mode actuellement sélectionné par l'utilisateur. */
  isGameModeSelected(mode: GameMode): boolean {
    if (mode === 'ai') return this.aiVsAi;
    if (mode === 'friends') return !this.aiVsAi && this.localMultiplayerOpen;
    return !this.aiVsAi && !this.localMultiplayerOpen && this.humanPlayerCount === 1;
  }

  // ==========================================================
  // TIRAGE DES HÉROS
  // ==========================================================

  readonly heroCardBack =
    HERO_CARD_BACK;

  readonly heroDrawState =
    signal<HeroDrawState>('hidden');

  readonly drawingHeroCards =
    signal<string[]>([]);

  // ==========================================================
  // DÉTERMINATION DU PREMIER JOUEUR
  // ==========================================================

  /**
   * Index du joueur dont les dés sont actuellement
   * en cours d'animation.
   *
   * null signifie qu'aucune animation de lancer
   * n'est active.
   */
  readonly rollingPlayerIndex =
    signal<number | null>(null);

  /**
   * Valeurs actuellement affichées pendant
   * l'animation des dés.
   *
   * Ces valeurs sont purement visuelles.
   *
   * Le résultat définitif est généré
   * et conservé par GameService.
   */
  readonly displayedDice =
    signal<
      Record<number, [number, number]>
    >({});

  /**
   * Index des joueurs dont le résultat définitif
   * a déjà été révélé à l'écran.
   */
  readonly revealedPlayerIndexes =
    signal<number[]>([]);

  /**
   * État visuel actuel de la détermination
   * du premier joueur.
   */
  readonly firstPlayerResolutionState =
    signal<FirstPlayerResolutionState>(
      'waiting',
    );

  /**
   * Indique que les lancers suivants appartiennent
   * à une manche de départage.
   *
   * Cet état reste actif entre les lancers successifs
   * afin que l'interface conserve le libellé « Relancer ».
   */
  readonly isFirstPlayerTieBreakerRound =
    signal(false);

  /**
   * Instantané des résultats ex æquo conservés
   * pendant la transition vers la manche de départage.
   *
   * GameService peut ainsi préparer immédiatement
   * la manche suivante sans faire disparaître
   * la preuve visuelle de l'égalité.
   */
  private readonly tieTransitionRolls =
    signal<Record<number, FirstPlayerRoll>>({});

  /**
   * Indique qu'un lancer automatique de l'IA
   * a déjà été programmé.
   *
   * Cette protection évite qu'un effect Angular
   * programme plusieurs timers pour le même tour IA.
   */
  private aiRollScheduled = false;

  /**
   * Délai précédant le lancer automatique d'une IA.
   *
   * Le délai permet au joueur humain de percevoir
   * clairement le changement de tour sans ralentir
   * inutilement la préparation.
   */
  private readonly aiRollDelay = 750;

  /**
   * Durée pendant laquelle les résultats ex æquo
   * restent visibles avant d'autoriser les relances.
   */
  private readonly tieResultsDisplayDelay = 1800;

  constructor(
    readonly gameService: GameService,
  ) {
    /**
     * Surveille la progression de la détermination
     * du premier joueur.
     *
     * Lorsqu'un joueur IA devient le prochain joueur
     * autorisé à lancer, son lancer est automatiquement
     * programmé.
     *
     * Un joueur humain reste en attente de son clic.
     *
     * Cette logique fonctionne également lors
     * des relances provoquées par une égalité.
     */
    effect(() => {
      /**
       * Ces lectures déclarent explicitement
       * les dépendances réactives de l'effect.
       */
      this.gameService.setupStep();
      this.gameService
        .firstPlayerContenders();
      this.gameService.firstPlayerIndex();

      this.revealedPlayerIndexes();
      this.rollingPlayerIndex();
      this.firstPlayerResolutionState();

      this.scheduleAiRollIfNeeded();
    });
  }

  // ==========================================================
  // CONFIGURATION DES JOUEURS
  // ==========================================================

  /**
   * Sélectionne le nombre total de participants.
   *
   * Le nombre choisi est nécessairement compris
   * entre MIN_PLAYER_COUNT et MAX_PLAYER_COUNT,
   * puisque seules ces valeurs sont proposées
   * par l'interface.
   *
   * Si le nombre total est réduit sous le nombre
   * actuel de joueurs humains, ce dernier est
   * automatiquement ramené au nouveau maximum.
   */
  selectPlayerCount(
    playerCount: number,
  ): void {
    if (
      playerCount < MIN_PLAYER_COUNT
      || playerCount > MAX_PLAYER_COUNT
    ) {
      return;
    }

    this.selectedPlayerCount =
      playerCount;

    if (this.aiVsAi) {
      return;
    }

    if (
      this.humanPlayerCount
      > playerCount
    ) {
      this.humanPlayerCount =
        playerCount;
    }
  }

  /** Sélectionne l'un des trois modes présentés par le configurateur. */
  selectGameMode(mode: GameMode): void {
    if (mode === 'ai') {
      this.aiVsAi = true;
      this.localMultiplayerOpen = false;
      this.humanPlayerCount = 0;
      return;
    }

    this.aiVsAi = false;

    if (mode === 'friends') {
      this.localMultiplayerOpen = true;
      this.humanPlayerCount = Math.max(
        2,
        Math.min(this.humanPlayerCount || 2, this.selectedPlayerCount),
      );
      return;
    }

    this.localMultiplayerOpen = false;
    this.humanPlayerCount = 1;
  }

  /**
   * Sélectionne le nombre de personnes
   * jouant réellement sur l'appareil.
   *
   * Les humains sont toujours affectés
   * dans l'ordre :
   *
   * J1 → J2 → J3 → J4 → J5.
   *
   * Les places restantes sont automatiquement
   * attribuées à l'IA.
   *
   * Exemple :
   *
   * 5 participants
   * 3 humains
   *
   * J1 humain
   * J2 humain
   * J3 humain
   * J4 IA
   * J5 IA
   */
  selectHumanPlayerCount(
    humanPlayerCount: number,
  ): void {
    if (
      humanPlayerCount < 2
      || humanPlayerCount
        > this.selectedPlayerCount
    ) {
      return;
    }

    this.humanPlayerCount =
      humanPlayerCount;
    this.aiVsAi = false;
  }

  /**
   * Confirme la composition de la partie.
   *
   * GameService reçoit :
   *
   * - le nombre total de participants ;
   * - le nombre de joueurs humains.
   *
   * PlayerService attribue ensuite automatiquement
   * le contrôleur "ai" à toutes les places restantes.
   */
  confirmPlayerCount(): void {
    const initialized = this.gameService.initializePlayers(
      this.selectedPlayerCount,
      this.aiVsAi ? 0 : this.humanPlayerCount,
    );

    if (initialized) {
      this.heroDrawState.set(
        this.gameService.players.every(player => player.heroId)
          ? 'revealed'
          : 'hidden',
      );
      this.resetFirstPlayerVisuals();
    }
  }

  goToSetupStep(step: 'players' | 'heroes'): void {
    const target: SetupStep = step === 'players' ? 'player-count' : 'hero-draw';
    this.gameService.goBackToSetupStep(target);
    this.heroDrawState.set(
      this.gameService.players.every(player => player.heroId)
        ? 'revealed'
        : 'hidden',
    );
    this.resetFirstPlayerVisuals();
    this.aiRollScheduled = false;
  }

  continueAfterHeroDraw(): void {
    this.gameService.continueAfterHeroDraw();
    this.heroDrawState.set('revealed');
    this.restoreFirstPlayerVisuals();
  }

  get canNavigatePrevious(): boolean { return this.gameService.setupStep() !== 'player-count'; }

  get canNavigateNext(): boolean {
    return this.gameService.setupStep() === 'player-count'
      ? this.gameService.playerCount > 0
      : this.gameService.setupStep() === 'hero-draw' && this.heroDrawState() === 'revealed';
  }

  navigatePrevious(): void {
    if (this.gameService.setupStep() === 'first-player-roll') this.goToSetupStep('heroes');
    else if (this.gameService.setupStep() === 'hero-draw') this.goToSetupStep('players');
  }

  navigateNext(): void {
    if (!this.canNavigateNext) return;
    if (this.gameService.setupStep() === 'hero-draw') this.continueAfterHeroDraw();
    else this.confirmPlayerCount();
  }

  /** Réinitialise uniquement la projection visuelle des lancers. */
  private resetFirstPlayerVisuals(): void {
    this.displayedDice.set({});
    this.revealedPlayerIndexes.set([]);
    this.rollingPlayerIndex.set(null);
    this.firstPlayerResolutionState.set('waiting');
    this.isFirstPlayerTieBreakerRound.set(false);
    this.tieTransitionRolls.set({});
  }

  /** Reconstruit l'affichage depuis les résultats métier conservés. */
  private restoreFirstPlayerVisuals(): void {
    const rolls = this.gameService.firstPlayerRolls();
    this.displayedDice.set(
      Object.fromEntries(rolls.map(roll => [roll.playerIndex, [roll.die1, roll.die2]])),
    );
    this.revealedPlayerIndexes.set(rolls.map(roll => roll.playerIndex));
    this.rollingPlayerIndex.set(null);
    this.isFirstPlayerTieBreakerRound.set(
      this.gameService.firstPlayerContenders().length < this.gameService.players.length,
    );
    this.firstPlayerResolutionState.set(
      this.gameService.firstPlayerIndex() === null ? 'waiting' : 'winner',
    );
    this.tieTransitionRolls.set({});
    this.aiRollScheduled = false;
  }

  // ==========================================================
  // TIRAGE DES HÉROS
  // ==========================================================

  /**
   * Lance le tirage des héros
   * et son animation visuelle.
   */
  drawHeroes(): void {
    if (
      this.heroDrawState() !== 'hidden'
    ) {
      return;
    }

    this.gameService.drawHeroes();

    this.heroDrawState.set('drawing');

    const speeds = [
      70,
      70,
      80,
      90,
      110,
      140,
      180,
      240,
      320,
    ];

    let step = 0;

    const animate = (): void => {
      if (step >= speeds.length) {
        this.drawingHeroCards.set([]);

        this.heroDrawState.set(
          'revealed',
        );

        /**
         * Le tirage terminé, les héros sont placés
         * automatiquement sur la tuile Départ.
         *
         * On passe ensuite à la détermination
         * du premier joueur.
         */
        window.setTimeout(
          () =>
            this.placeHeroesOnStart(),
          650,
        );

        return;
      }

      this.drawingHeroCards.set(
        this.getRandomUniqueHeroCards(),
      );

      const delay = speeds[step];

      step++;

      window.setTimeout(
        animate,
        delay,
      );
    };

    animate();
  }

  /**
   * Place les héros sur la tuile Départ
   * puis réinitialise les états visuels
   * nécessaires à la détermination
   * du premier joueur.
   */
  placeHeroesOnStart(): void {
    if (
      this.heroDrawState()
      !== 'revealed'
    ) {
      return;
    }

    this.gameService
      .placeHeroesOnStart();

    this.displayedDice.set({});

    this.revealedPlayerIndexes.set(
      [],
    );

    this.rollingPlayerIndex.set(
      null,
    );

    this.firstPlayerResolutionState.set(
      'waiting',
    );

    this.isFirstPlayerTieBreakerRound.set(
      false,
    );

    this.tieTransitionRolls.set({});

    /**
     * Autorise la programmation du prochain
     * éventuel lancer automatique.
     */
    this.aiRollScheduled = false;
  }

  // ==========================================================
  // LANCERS HUMAINS / IA
  // ==========================================================

  /**
   * Programme automatiquement le lancer
   * du prochain joueur lorsque celui-ci
   * est contrôlé par l'IA.
   *
   * Cette méthode ne déclenche jamais
   * le lancer d'un humain.
   *
   * CONDITIONS :
   *
   * - nous devons être à l'étape
   *   "first-player-roll" ;
   * - aucun vainqueur ne doit avoir
   *   encore été désigné ;
   * - aucune animation de lancer
   *   ne doit être active ;
   * - aucun autre lancer IA ne doit
   *   déjà être programmé ;
   * - le prochain joueur doit être
   *   contrôlé par l'IA.
   */
  private scheduleAiRollIfNeeded():
    void {
    if (
      this.gameService.setupStep()
      !== 'first-player-roll'
    ) {
      return;
    }

    if (
      this.gameService
        .firstPlayerIndex()
      !== null
    ) {
      return;
    }

    if (
      this.rollingPlayerIndex()
      !== null
    ) {
      return;
    }

    if (
      this.firstPlayerResolutionState()
      === 'tie-transition'
    ) {
      return;
    }

    if (this.aiRollScheduled) {
      return;
    }

    const playerIndex =
      this.getNextPlayerToRoll();

    if (playerIndex === null) {
      return;
    }

    const player =
      this.gameService
        .players[playerIndex];

    if (
      !player
      || player.controller !== 'ai'
    ) {
      return;
    }

    /**
     * Verrouillage avant la création du timer.
     *
     * Cela empêche une nouvelle exécution
     * de l'effect de programmer une seconde fois
     * le même lancer.
     */
    this.aiRollScheduled = true;

    window.setTimeout(
      () => {
        /**
         * Libération du verrou.
         *
         * canPlayerRoll() vérifie ensuite
         * que la situation n'a pas changé
         * pendant le délai.
         */
        this.aiRollScheduled = false;

        if (
          this.canPlayerRoll(
            playerIndex,
          )
        ) {
          this.rollPlayer(
            playerIndex,
          );
        }
      },
      this.aiRollDelay,
    );
  }

  /**
   * Lance les dés pour le joueur indiqué
   * puis anime visuellement le résultat
   * avant de le révéler.
   *
   * Cette méthode est commune
   * aux humains et aux IA.
   *
   * DÉCLENCHEMENT HUMAIN :
   *
   * clic sur le bouton de dés.
   *
   * DÉCLENCHEMENT IA :
   *
   * appel automatique après le délai
   * défini par aiRollDelay.
   *
   * Le calcul du résultat reste dans GameService.
   */
  rollPlayer(
    playerIndex: number,
  ): void {
    if (
      !this.canPlayerRoll(
        playerIndex,
      )
    ) {
      return;
    }

    // Masque immédiatement l'action manuelle avant toute mutation métier
    // afin d'éviter un rendu transitoire du bouton pendant l'animation.
    this.rollingPlayerIndex.set(playerIndex);
    this.firstPlayerResolutionState.set('rolling');

    this.gameService
      .rollPlayerForFirstPlayer(
        playerIndex,
      );

    const finalRoll =
      this.gameService
        .firstPlayerRolls()
        .find(
          (roll) =>
            roll.playerIndex
            === playerIndex,
        );

    if (!finalRoll) {
      this.rollingPlayerIndex.set(null);
      this.firstPlayerResolutionState.set('waiting');
      return;
    }

    const speeds = [
      70,
      70,
      80,
      90,
      105,
      125,
      150,
      180,
      215,
      260,
      315,
    ];

    let step = 0;

    const animate = (): void => {
      if (step >= speeds.length) {
        this.setDisplayedDice(
          playerIndex,
          finalRoll.die1,
          finalRoll.die2,
        );

        this.revealedPlayerIndexes
          .update(
            (indexes) => [
              ...indexes,
              playerIndex,
            ],
          );

        this.rollingPlayerIndex.set(
          null,
        );

        this.resolveFirstPlayerIfPossible();

        return;
      }

      this.setDisplayedDice(
        playerIndex,
        this.randomDie(),
        this.randomDie(),
      );

      const delay = speeds[step];

      step++;

      window.setTimeout(
        animate,
        delay,
      );
    };

    animate();
  }

  /**
   * Vérifie si tous les joueurs encore en lice
   * ont terminé leur lancer visible.
   *
   * Lorsque tous les lancers nécessaires
   * sont terminés, GameService détermine :
   *
   * - un vainqueur ;
   * - une égalité ;
   * - ou un état encore incomplet.
   *
   * En cas d'égalité, seuls les joueurs
   * concernés relancent.
   *
   * Si l'un de ces joueurs est une IA,
   * son nouveau lancer sera automatiquement
   * déclenché.
   */
  private resolveFirstPlayerIfPossible():
    void {
    const contenders =
      this.gameService
        .firstPlayerContenders();

    const allContendersRevealed =
      contenders.every(
        (playerIndex) =>
          this.revealedPlayerIndexes()
            .includes(playerIndex),
      );

    if (!allContendersRevealed) {
      this.firstPlayerResolutionState.set(
        'waiting',
      );

      return;
    }

    const completedRoundRolls =
      this.gameService
        .firstPlayerRolls()
        .filter(
          (roll) =>
            contenders.includes(
              roll.playerIndex,
            ),
        );

    const result =
      this.gameService
        .resolveFirstPlayerRoll();

    if (result === 'winner') {
      this.tieTransitionRolls.set({});

      this.firstPlayerResolutionState.set(
        'winner',
      );

      return;
    }

    if (result === 'tie') {
      const tiedPlayers =
        this.gameService
          .firstPlayerContenders();

      const tiedRolls =
        completedRoundRolls.reduce<
          Record<number, FirstPlayerRoll>
        >(
          (rolls, roll) => {
            if (
              !tiedPlayers.includes(
                roll.playerIndex,
              )
            ) {
              return rolls;
            }

            rolls[roll.playerIndex] = roll;

            return rolls;
          },
          {},
        );

      this.tieTransitionRolls.set(
        tiedRolls,
      );

      this.isFirstPlayerTieBreakerRound.set(
        true,
      );

      this.firstPlayerResolutionState.set(
        'tie-transition',
      );

      window.setTimeout(
        () => this.finishTieTransition(
          tiedPlayers,
        ),
        this.tieResultsDisplayDelay,
      );

      return;
    }

    this.firstPlayerResolutionState.set(
      'waiting',
    );
  }

  /**
   * Termine la pause visuelle d'une égalité et prépare
   * l'affichage de la manche de départage.
   *
   * Les gardes empêchent un ancien timer de modifier
   * un écran quitté ou une manche déjà résolue.
   */
  private finishTieTransition(
    tiedPlayers: number[],
  ): void {
    const currentContenders =
      this.gameService
        .firstPlayerContenders();

    const sameContenders =
      currentContenders.length
        === tiedPlayers.length
      && currentContenders.every(
        (playerIndex) =>
          tiedPlayers.includes(
            playerIndex,
          ),
      );

    if (
      this.gameService.setupStep()
        !== 'first-player-roll'
      || this.gameService.firstPlayerIndex()
        !== null
      || this.firstPlayerResolutionState()
        !== 'tie-transition'
      || !sameContenders
    ) {
      return;
    }

    this.revealedPlayerIndexes.update(
      (indexes) =>
        indexes.filter(
          (playerIndex) =>
            !tiedPlayers.includes(
              playerIndex,
            ),
        ),
    );

    this.displayedDice.update(
      (dice) => {
        const nextDice = { ...dice };

        for (const playerIndex of tiedPlayers) {
          delete nextDice[playerIndex];
        }

        return nextDice;
      },
    );

    this.tieTransitionRolls.set({});
    this.firstPlayerResolutionState.set(
      'tie',
    );
  }

  /**
   * Retourne le prochain joueur
   * devant effectuer son lancer.
   *
   * L'ordre reste toujours croissant :
   *
   * J1 → J2 → J3 → J4 → J5.
   *
   * En cas d'égalité, seuls les joueurs
   * encore concernés sont considérés,
   * toujours dans cet ordre.
   */
  getNextPlayerToRoll():
    number | null {
    if (
      this.gameService
        .firstPlayerIndex()
      !== null
    ) {
      return null;
    }

    const contenders = [
      ...this.gameService
        .firstPlayerContenders(),
    ].sort(
      (a, b) => a - b,
    );

    return (
      contenders.find(
        (playerIndex) =>
          !this.hasPlayerRollBeenRevealed(
            playerIndex,
          ),
      )
      ?? null
    );
  }

  /**
   * Indique si le joueur est actuellement
   * celui qui doit effectuer le prochain lancer.
   *
   * Cette règle s'applique aussi bien
   * aux humains qu'aux IA.
   */
  isPlayerTurnToRoll(
    playerIndex: number,
  ): boolean {
    return (
      this.getNextPlayerToRoll()
      === playerIndex
    );
  }

  /**
   * Indique si une animation
   * de lancer est active.
   */
  isAnyPlayerRolling(): boolean {
    return (
      this.rollingPlayerIndex()
      !== null
    );
  }

  /**
   * Indique si le joueur peut actuellement
   * effectuer son lancer.
   *
   * Cette méthode représente uniquement
   * l'autorisation donnée par les règles.
   *
   * Elle ne distingue volontairement
   * pas humain et IA.
   */
  canPlayerRoll(
    playerIndex: number,
  ): boolean {
    return (
      this.gameService
        .firstPlayerIndex()
        === null
      && this.firstPlayerResolutionState()
        !== 'tie-transition'
      && this.rollingPlayerIndex()
        === null
      && this.gameService
        .isFirstPlayerContender(
          playerIndex,
        )
      && !this.hasPlayerRollBeenRevealed(
        playerIndex,
      )
      && this.isPlayerTurnToRoll(
        playerIndex,
      )
    );
  }

  /**
   * Indique si un bouton manuel de lancer
   * doit être présenté au joueur.
   *
   * Seuls les humains disposent
   * d'un bouton interactif.
   *
   * Les IA utilisent la même règle
   * canPlayerRoll(), mais leur action
   * est déclenchée automatiquement.
   */
  canHumanPlayerRoll(
    playerIndex: number,
  ): boolean {
    const player =
      this.gameService
        .players[playerIndex];

    return (
      player?.controller === 'human'
      && this.canPlayerRoll(
        playerIndex,
      )
    );
  }

  /**
   * Indique si une IA est actuellement
   * en attente de son lancer automatique.
   *
   * Cette information est notamment utilisée
   * par le template pour afficher :
   *
   * "Joueur X lance les dés..."
   */
  isAiWaitingToRoll(
    playerIndex: number,
  ): boolean {
    const player =
      this.gameService
        .players[playerIndex];

    return (
      player?.controller === 'ai'
      && this.canPlayerRoll(
        playerIndex,
      )
    );
  }

  /**
   * Indique si le résultat du joueur
   * a déjà été révélé.
   */
  hasPlayerRollBeenRevealed(
    playerIndex: number,
  ): boolean {
    return (
      this.revealedPlayerIndexes()
        .includes(playerIndex)
    );
  }

  /**
   * Indique si le joueur est actuellement
   * en train de lancer les dés.
   */
  isPlayerRolling(
    playerIndex: number,
  ): boolean {
    return (
      this.rollingPlayerIndex()
      === playerIndex
    );
  }

  /**
   * Indique si le joueur a été éliminé
   * de la détermination du premier joueur.
   */
  isPlayerEliminated(
    playerIndex: number,
  ): boolean {
    return (
      this.firstPlayerResolutionState()
        !== 'winner'
      && !this.gameService
        .isFirstPlayerContender(
          playerIndex,
        )
    );
  }

  /**
   * Retourne les dés actuellement
   * affichés pour le joueur.
   */
  getDisplayedDice(
    playerIndex: number,
  ): [number, number] | null {
    return (
      this.displayedDice()[
        playerIndex
      ]
      ?? null
    );
  }

  /**
   * Retourne le résultat définitif
   * visible du joueur.
   */
  getRevealedRoll(
    playerIndex: number,
  ): FirstPlayerRoll | null {
    if (
      !this.hasPlayerRollBeenRevealed(
        playerIndex,
      )
    ) {
      return null;
    }

    return (
      this.tieTransitionRolls()[
        playerIndex
      ]
      ??
      this.gameService
        .firstPlayerRolls()
        .find(
          (roll) =>
            roll.playerIndex
            === playerIndex,
        )
      ?? null
    );
  }

  /**
   * Décrit explicitement les joueurs ex æquo
   * pendant la transition de départage.
   */
  getTiedPlayersLabel(): string {
    const labels =
      this.gameService
        .firstPlayerContenders()
        .map(
          (playerIndex) =>
            `Joueur ${playerIndex + 1}`,
        );

    if (labels.length <= 1) {
      return labels[0] ?? '';
    }

    return [
      labels.slice(0, -1).join(', '),
      labels.at(-1),
    ].join(' et ');
  }

  /**
   * Indique si le joueur est
   * le premier joueur définitivement désigné.
   */
  isFirstPlayerWinner(
    playerIndex: number,
  ): boolean {
    return (
      this.gameService
        .firstPlayerIndex()
      === playerIndex
    );
  }

  // ==========================================================
  // CARTES HÉROS
  // ==========================================================

  /**
   * Retourne la carte à afficher
   * pour le joueur.
   *
   * Avant le tirage :
   * dos de carte.
   *
   * Pendant le tirage :
   * carte temporaire d'animation.
   *
   * Après le tirage :
   * véritable carte du héros attribué.
   */
  getHeroCard(
    playerIndex: number,
  ): string {
    if (
      this.heroDrawState()
      === 'hidden'
    ) {
      return this.heroCardBack;
    }

    if (
      this.heroDrawState()
      === 'drawing'
    ) {
      return (
        this.drawingHeroCards()[
          playerIndex
        ]
        ?? HERO_DEFINITIONS[0].card
      );
    }

    const heroId =
      this.gameService
        .players[playerIndex]
        ?.heroId;

    if (!heroId) {
      return this.heroCardBack;
    }

    return (
      getHeroDefinition(heroId)
        ?.card
      ?? this.heroCardBack
    );
  }

  /** Couleur du héros affiché ou déjà attribué à la carte de tirage. */
  getHeroColor(playerIndex: number): string {
    const displayedCard = this.drawingHeroCards()[playerIndex];
    const displayedHero = this.heroDrawState() === 'drawing'
      ? HERO_DEFINITIONS.find(hero => hero.card === displayedCard)
      : undefined;
    return getHeroIdentityColor(displayedHero?.id ?? this.gameService.players[playerIndex]?.heroId);
  }

  // ==========================================================
  // PROGRESSION DU SETUP
  // ==========================================================

  /**
   * Indique si une étape du bandeau
   * de progression est terminée.
   */
  isSetupStepCompleted(
    step:
      | 'players'
      | 'heroes'
      | 'first-player',
  ): boolean {
    switch (step) {
      case 'players':
        return (
          this.gameService
            .playerCount > 0
        );

      case 'heroes':
        return (
          this.gameService
            .setupStep()
          === 'first-player-roll'
        );

      case 'first-player':
        return (
          this.gameService
            .firstPlayerIndex()
          !== null
        );
    }
  }

  // ==========================================================
  // OUTILS INTERNES D'ANIMATION
  // ==========================================================

  /**
   * Retourne un ensemble aléatoire
   * de cartes Héros différentes.
   *
   * Cette sélection est utilisée uniquement
   * pendant l'animation du tirage.
   */
  private getRandomUniqueHeroCards():
    string[] {
    const availableCards =
      HERO_DEFINITIONS.map(
        (hero) => hero.card,
      );

    for (
      let i =
        availableCards.length - 1;
      i > 0;
      i--
    ) {
      const randomIndex =
        Math.floor(
          Math.random()
          * (i + 1),
        );

      [
        availableCards[i],
        availableCards[randomIndex],
      ] = [
        availableCards[
          randomIndex
        ],
        availableCards[i],
      ];
    }

    return availableCards.slice(
      0,
      this.gameService.playerCount,
    );
  }

  /**
   * Met à jour les valeurs de dés
   * affichées pour un joueur
   * pendant l'animation.
   */
  private setDisplayedDice(
    playerIndex: number,
    die1: number,
    die2: number,
  ): void {
    this.displayedDice.update(
      (dice) => ({
        ...dice,

        [playerIndex]: [
          die1,
          die2,
        ],
      }),
    );
  }

  /**
   * Génère une valeur visuelle aléatoire
   * comprise entre 1 et 6.
   *
   * Cette méthode sert uniquement
   * à l'animation.
   *
   * Le résultat définitif appartient
   * à GameService.
   */
  private randomDie(): number {
    return (
      Math.floor(
        Math.random() * 6,
      ) + 1
    );
  }
}
