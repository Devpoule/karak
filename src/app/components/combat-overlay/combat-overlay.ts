
import {
  Component,
  effect,
  OnDestroy,
  signal,
} from '@angular/core';

import { getHeroDefinition } from '../../data/hero-definitions';

import {
  CombatOutcome,
  CombatResult,
  CombatService,
  PendingCombat,
} from '../../services/combat.service';

import { GameService } from '../../services/game.service';

/**
 * Étapes visuelles de présentation d'un combat.
 */
type CombatPresentationState =
  | 'intro'
  | 'ready'
  | 'rolling'
  | 'result';

@Component({
  selector: 'app-combat-overlay',
  imports: [],
  templateUrl: './combat-overlay.html',
  styleUrl: './combat-overlay.scss',
})
export class CombatOverlay implements OnDestroy {

  readonly presentationState =
    signal<CombatPresentationState>('intro');

  readonly displayedDice = signal({
    die1: 1,
    die2: 1,
  });

  /**
   * Snapshot du combat.
   *
   * Il reste disponible après la suppression
   * de pendingCombat dans CombatService.
   */
  readonly presentedCombat =
    signal<PendingCombat | null>(null);

  readonly presentedResult =
    signal<CombatResult | null>(null);

  private trackedCombat: PendingCombat | null = null;

  private readonly timers: number[] = [];

  /**
   * Durée de l'introduction des combattants.
   */
  private readonly introDuration = 1900;

  /**
   * Durée de lecture du verdict pour une IA.
   */
  private readonly aiResultDuration = 3600;

  /**
   * Empêche deux résolutions simultanées.
   */
  private resolving = false;

  constructor(
    private readonly combatService: CombatService,
    private readonly gameService: GameService,
  ) {
    effect(() => {
      const combat = this.combatService.pendingCombat();

      if (!combat || combat === this.trackedCombat) {
        return;
      }

      this.startPresentation(combat);
    });
  }

  // ==========================================================
  // ÉTAT DE PRÉSENTATION
  // ==========================================================

  get combat(): PendingCombat | null {
    return this.presentedCombat();
  }

  get result(): CombatResult | null {
    return this.presentedResult();
  }

  get canRoll(): boolean {
    return (
      this.presentationState() === 'ready'
      && this.combat?.player.controller === 'human'
      && !this.resolving
    );
  }

  get isRolling(): boolean {
    return this.presentationState() === 'rolling';
  }

  get isResultVisible(): boolean {
    return (
      this.presentationState() === 'result'
      && this.result !== null
    );
  }

  // ==========================================================
  // ASSETS
  // ==========================================================

  /**
   * Carte du héros, et non son pion directionnel.
   */
  getHeroImage(): string | undefined {
    const player =
      this.combat?.player
      ?? this.result?.player;

    if (!player?.heroId) {
      return undefined;
    }

    return getHeroDefinition(player.heroId)?.character;
  }

  /** Nom du héros affiché sur la carte de combat. */
  getHeroName(): string {
    const heroId = this.combat?.player.heroId;

    return heroId
      ? (getHeroDefinition(heroId)?.name ?? 'Héros')
      : 'Héros';
  }

  /** Nom de l'adversaire. */
  getMonsterName(): string {
    const monster = this.combat?.monster as
      | { name?: string }
      | undefined;

    return monster?.name ?? 'Adversaire';
  }

  // ==========================================================
  // LANCER DES DÉS
  // ==========================================================

  /**
   * Action publique du bouton humain.
   */
  resolveCombat(): void {
    if (!this.canRoll) {
      return;
    }

    this.performCombatResolution();
  }

  /**
   * Résolution commune aux humains et aux IA.
   *
   * CombatService calcule les véritables dés
   * et applique les conséquences du combat.
   *
   * L'overlay ne modifie jamais ces règles.
   */
  private performCombatResolution(): void {
    if (
      this.resolving
      || this.presentationState() !== 'ready'
      || !this.presentedCombat()
    ) {
      return;
    }

    if (!this.combatService.hasPendingCombat) {
      return;
    }

    this.resolving = true;

    const result =
      this.combatService.resolvePendingCombat();

    if (!result) {
      this.resolving = false;
      return;
    }

    this.presentedResult.set(result);
    this.presentationState.set('rolling');

    this.animateDice(result);
  }

  // ==========================================================
  // INITIALISATION DU COMBAT
  // ==========================================================

  /**
   * Prépare l'affichage d'un nouveau combat.
   */
  private startPresentation(combat: PendingCombat): void {
    this.clearTimers();

    this.trackedCombat = combat;
    this.resolving = false;

    this.presentedCombat.set(combat);
    this.presentedResult.set(null);

    this.displayedDice.set({
      die1: this.randomDie(),
      die2: this.randomDie(),
    });

    this.presentationState.set('intro');

    /**
     * L'introduction est identique pour tous.
     *
     * Humain :
     *   le bouton de lancer devient disponible.
     *
     * IA :
     *   le lancer démarre automatiquement.
     */
    this.schedule(() => {
      if (this.presentedCombat() !== combat) {
        return;
      }

      if (!this.combatService.hasPendingCombat) {
        return;
      }

      this.presentationState.set('ready');

      if (combat.player.controller === 'ai') {
        this.performCombatResolution();
      }
    }, this.introDuration);
  }

  // ==========================================================
  // ANIMATION DES DÉS
  // ==========================================================

  /**
   * Simule un ralentissement progressif.
   *
   * Les valeurs intermédiaires sont visuelles.
   * Les valeurs finales proviennent exclusivement
   * de CombatService.
   */
  private animateDice(result: CombatResult): void {
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

    let elapsed = 0;

    for (const speed of speeds) {
      elapsed += speed;

      this.schedule(() => {
        this.displayedDice.set({
          die1: this.randomDie(),
          die2: this.randomDie(),
        });
      }, elapsed);
    }

    /**
     * Arrêt sur les dés réels.
     */
    elapsed += 180;

    this.schedule(() => {
      this.displayedDice.set({
        die1: result.die1,
        die2: result.die2,
      });
    }, elapsed);

    /**
     * Temps de lecture des dés avant le verdict.
     */
    elapsed += 1050;

    this.schedule(() => {
      this.presentationState.set('result');

      /**
       * Le verdict reste visible avant toute
       * transition vers le joueur suivant.
       */
      if (result.player.controller === 'ai') {
        this.schedule(() => {
          if (
            this.presentationState() === 'result'
            && this.presentedResult() === result
          ) {
            this.dismissResult();
          }
        }, this.aiResultDuration);
      }
    }, elapsed);
  }

  // ==========================================================
  // FERMETURE ET SUITE DU TOUR
  // ==========================================================

  /**
   * Ferme la présentation du combat.
   *
   * Après une victoire :
   * - le jeton a déjà été retourné par CombatService ;
   * - GameService examine son verso ;
   * - une récompense éventuelle est mise en attente.
   *
   * Après une égalité ou une défaite :
   * - les conséquences ont déjà été appliquées ;
   * - le tour peut se terminer normalement.
   *
   * Appel manuel pour un humain.
   * Appel automatique pour une IA.
   */
  dismissResult(): void {
    const result = this.presentedResult();
    const combat = this.presentedCombat();

    if (
      this.presentationState() !== 'result'
      || !result
      || !combat
    ) {
      return;
    }

    this.clearTimers();

    /**
     * Libérer l'état de présentation et le dernier
     * résultat avant de traiter la suite du tour.
     *
     * L'IA ne doit plus considérer que le verdict
     * précédent est en cours d'affichage.
     */
    this.combatService.clearLastCombatResult();

    this.presentedCombat.set(null);
    this.presentedResult.set(null);
    this.presentationState.set('intro');

    this.trackedCombat = null;
    this.resolving = false;

    /**
     * Le héros est déjà présent sur la tuile
     * du monstre vaincu.
     *
     * Nous déclenchons donc la résolution de son
     * verso sans effectuer un second déplacement.
     */
    if (result.outcome === 'victory') {
      this.gameService.resolveTileEntry(
        combat.player,
        combat.sourceTile,
        combat.monsterTile,
      );
    }

    /**
     * Une récompense obligatoire bloque le passage
     * au joueur suivant.
     *
     * GameService reste responsable de cette règle.
     */
    if (this.gameService.hasPendingTileResolution) {
      return;
    }

    /**
     * Aucun contenu obligatoire ne reste à résoudre.
     * Le tour peut se terminer.
     */
    this.gameService.endTurn();
  }

  // ==========================================================
  // VERDICT
  // ==========================================================

  getOutcomeLabel(outcome: CombatOutcome): string {
    switch (outcome) {
      case 'victory':
        return 'Victoire';

      case 'tie':
        return 'Égalité';

      case 'defeat':
        return 'Défaite';
    }
  }

  // ==========================================================
  // TEMPORISATIONS
  // ==========================================================

  private randomDie(): number {
    return Math.floor(Math.random() * 6) + 1;
  }

  private schedule(
    callback: () => void,
    delay: number,
  ): void {
    const timer = window.setTimeout(
      callback,
      delay,
    );

    this.timers.push(timer);
  }

  private clearTimers(): void {
    for (const timer of this.timers) {
      window.clearTimeout(timer);
    }

    this.timers.length = 0;
  }

  ngOnDestroy(): void {
    this.clearTimers();
  }
}
