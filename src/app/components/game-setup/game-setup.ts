import { Component, signal } from '@angular/core';

import {
  getHeroDefinition,
  HERO_CARD_BACK,
  HERO_DEFINITIONS,
} from '../../data/hero-definitions';

import {
  FirstPlayerRoll,
  GameService,
} from '../../services/game.service';

import { MAX_PLAYER_COUNT } from '../../services/player.service';

type HeroDrawState =
  | 'hidden'
  | 'drawing'
  | 'revealed';

type FirstPlayerResolutionState =
  | 'rolling'
  | 'tie'
  | 'winner'
  | 'waiting';

@Component({
  selector: 'app-game-setup',
  imports: [],
  templateUrl: './game-setup.html',
  styleUrl: './game-setup.scss',
})
export class GameSetup {
  readonly playerCounts = Array.from(
    { length: MAX_PLAYER_COUNT },
    (_, index) => index + 1,
  );

  selectedPlayerCount: number | null = null;

  readonly heroCardBack = HERO_CARD_BACK;

  readonly heroDrawState =
    signal<HeroDrawState>('hidden');

  readonly drawingHeroCards =
    signal<string[]>([]);

  readonly rollingPlayerIndex =
    signal<number | null>(null);

  readonly displayedDice =
    signal<Record<number, [number, number]>>({});

  readonly revealedPlayerIndexes =
    signal<number[]>([]);

  readonly firstPlayerResolutionState =
    signal<FirstPlayerResolutionState>('waiting');

  constructor(
    readonly gameService: GameService,
  ) {}

  selectPlayerCount(playerCount: number): void {
    this.selectedPlayerCount = playerCount;
  }

  confirmPlayerCount(): void {
    if (this.selectedPlayerCount === null) {
      return;
    }

    this.gameService.initializePlayers(
      this.selectedPlayerCount,
    );
  }

  drawHeroes(): void {
    if (this.heroDrawState() !== 'hidden') {
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
        this.heroDrawState.set('revealed');

        /*
         * Le tirage terminé, on passe directement
         * à la détermination du premier joueur.
         */
        window.setTimeout(
          () => this.placeHeroesOnStart(),
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

  placeHeroesOnStart(): void {
    if (this.heroDrawState() !== 'revealed') {
      return;
    }

    this.gameService.placeHeroesOnStart();

    this.displayedDice.set({});
    this.revealedPlayerIndexes.set([]);
    this.rollingPlayerIndex.set(null);
    this.firstPlayerResolutionState.set('waiting');
  }

  rollPlayer(playerIndex: number): void {
    if (!this.canPlayerRoll(playerIndex)) {
      return;
    }

    this.gameService.rollPlayerForFirstPlayer(
      playerIndex,
    );

    const finalRoll =
      this.gameService.firstPlayerRolls().find(
        (roll) => roll.playerIndex === playerIndex,
      );

    if (!finalRoll) {
      return;
    }

    this.rollingPlayerIndex.set(playerIndex);
    this.firstPlayerResolutionState.set('rolling');

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

        this.revealedPlayerIndexes.update(
          (indexes) => [
            ...indexes,
            playerIndex,
          ],
        );

        this.rollingPlayerIndex.set(null);

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

  private resolveFirstPlayerIfPossible(): void {
    const contenders =
      this.gameService.firstPlayerContenders();

    const allContendersRevealed =
      contenders.every(
        (playerIndex) =>
          this.revealedPlayerIndexes().includes(
            playerIndex,
          ),
      );

    if (!allContendersRevealed) {
      this.firstPlayerResolutionState.set(
        'waiting',
      );

      return;
    }

    const result =
      this.gameService.resolveFirstPlayerRoll();

    if (result === 'winner') {
      this.firstPlayerResolutionState.set(
        'winner',
      );

      return;
    }

    if (result === 'tie') {
      const tiedPlayers =
        this.gameService.firstPlayerContenders();

      this.revealedPlayerIndexes.update(
        (indexes) =>
          indexes.filter(
            (playerIndex) =>
              !tiedPlayers.includes(playerIndex),
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

      this.firstPlayerResolutionState.set('tie');

      return;
    }

    this.firstPlayerResolutionState.set(
      'waiting',
    );
  }

  /**
   * Retourne le prochain joueur qui doit lancer.
   *
   * L'ordre est toujours croissant :
   * Joueur 1 → Joueur 2 → Joueur 3...
   *
   * En cas d'égalité, seuls les joueurs encore
   * concernés sont pris en compte, toujours
   * dans l'ordre croissant.
   */
  getNextPlayerToRoll(): number | null {
    if (this.gameService.firstPlayerIndex() !== null) {
      return null;
    }

    const contenders = [
      ...this.gameService.firstPlayerContenders(),
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

  isPlayerTurnToRoll(
    playerIndex: number,
  ): boolean {
    return (
      this.getNextPlayerToRoll() === playerIndex
    );
  }

  isAnyPlayerRolling(): boolean {
    return this.rollingPlayerIndex() !== null;
  }

  canPlayerRoll(playerIndex: number): boolean {
    return (
      this.gameService.firstPlayerIndex() === null
      && this.rollingPlayerIndex() === null
      && this.gameService.isFirstPlayerContender(
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

  hasPlayerRollBeenRevealed(
    playerIndex: number,
  ): boolean {
    return this.revealedPlayerIndexes().includes(
      playerIndex,
    );
  }

  isPlayerRolling(
    playerIndex: number,
  ): boolean {
    return (
      this.rollingPlayerIndex() === playerIndex
    );
  }

  isPlayerEliminated(
    playerIndex: number,
  ): boolean {
    return (
      this.firstPlayerResolutionState() !== 'winner'
      && !this.gameService.isFirstPlayerContender(
        playerIndex,
      )
    );
  }

  getDisplayedDice(
    playerIndex: number,
  ): [number, number] | null {
    return (
      this.displayedDice()[playerIndex]
      ?? null
    );
  }

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
      this.gameService.firstPlayerRolls().find(
        (roll) => roll.playerIndex === playerIndex,
      )
      ?? null
    );
  }

  isFirstPlayerWinner(
    playerIndex: number,
  ): boolean {
    return (
      this.gameService.firstPlayerIndex()
      === playerIndex
    );
  }

  getHeroCard(
    playerIndex: number,
  ): string {
    if (this.heroDrawState() === 'hidden') {
      return this.heroCardBack;
    }

    if (this.heroDrawState() === 'drawing') {
      return (
        this.drawingHeroCards()[playerIndex]
        ?? HERO_DEFINITIONS[0].card
      );
    }

    const heroId =
      this.gameService.players[playerIndex]?.heroId;

    if (!heroId) {
      return this.heroCardBack;
    }

    return (
      getHeroDefinition(heroId)?.card
      ?? this.heroCardBack
    );
  }

  isSetupStepCompleted(
    step: 'players' | 'heroes' | 'first-player',
  ): boolean {
    switch (step) {
      case 'players':
        return this.gameService.playerCount > 0;

      case 'heroes':
        return (
          this.gameService.setupStep()
          === 'first-player-roll'
        );

      case 'first-player':
        return (
          this.gameService.firstPlayerIndex()
          !== null
        );
    }
  }

  private getRandomUniqueHeroCards(): string[] {
    const availableCards =
      HERO_DEFINITIONS.map(
        (hero) => hero.card,
      );

    for (
      let i = availableCards.length - 1;
      i > 0;
      i--
    ) {
      const randomIndex = Math.floor(
        Math.random() * (i + 1),
      );

      [
        availableCards[i],
        availableCards[randomIndex],
      ] = [
        availableCards[randomIndex],
        availableCards[i],
      ];
    }

    return availableCards.slice(
      0,
      this.gameService.playerCount,
    );
  }

  private setDisplayedDice(
    playerIndex: number,
    die1: number,
    die2: number,
  ): void {
    this.displayedDice.update(
      (dice) => ({
        ...dice,
        [playerIndex]: [die1, die2],
      }),
    );
  }

  private randomDie(): number {
    return Math.floor(
      Math.random() * 6,
    ) + 1;
  }
}
