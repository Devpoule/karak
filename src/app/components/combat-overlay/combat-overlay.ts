
import {
  Component,
  ElementRef,
  effect,
  OnDestroy,
  signal,
  ViewChild,
} from '@angular/core';

import { getHeroDefinition } from '../../data/hero-definitions';

import {
  CombatOutcome,
  CombatRoll,
  CombatResult,
  CombatService,
  PendingCombat,
} from '../../services/combat.service';

import { GameService } from '../../services/game.service';
import { AiService } from '../../services/ai.service';
import { ToastService } from '../../services/toast.service';

/**
 * Étapes visuelles de présentation d'un combat.
 */
type CombatPresentationState =
  | 'intro'
  | 'ready'
  | 'rolling'
  | 'decision'
  | 'result';

export type CombatWaveTarget = 'hero' | 'monster' | null;
export type CombatWaveDirection = 'left-to-right' | 'right-to-left';

interface CombatFighterBounds {
  left: number;
  right: number;
}

/** Retourne la cible visuelle de la vague sans modifier l'issue métier. */
export function getCombatWaveTarget(outcome: CombatOutcome): CombatWaveTarget {
  if (outcome === 'victory') return 'monster';
  if (outcome === 'defeat') return 'hero';
  return null;
}

/** Détermine le sens de propagation à partir des positions réellement rendues. */
export function getCombatWaveDirection(
  source: CombatFighterBounds,
  target: CombatFighterBounds,
): CombatWaveDirection {
  const sourceCenter = (source.left + source.right) / 2;
  const targetCenter = (target.left + target.right) / 2;
  return sourceCenter <= targetCenter ? 'left-to-right' : 'right-to-left';
}

@Component({
  selector: 'app-combat-overlay',
  imports: [],
  templateUrl: './combat-overlay.html',
  styleUrl: './combat-overlay.scss',
})
export class CombatOverlay implements OnDestroy {

  @ViewChild('heroFighter')
  private heroFighter?: ElementRef<HTMLElement>;

  @ViewChild('monsterFighter')
  private monsterFighter?: ElementRef<HTMLElement>;

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
  readonly magicBoltFeedback = signal<number[]>([]);
  readonly magicBoltScorePulse = signal(false);
  readonly xanrosSacrificeDeclined = signal(false);
  readonly waveDirection = signal<CombatWaveDirection>('left-to-right');

  private trackedCombat: PendingCombat | null = null;

  private readonly timers: number[] = [];

  /**
   * Durée de l'introduction des combattants.
   */
  private readonly introDuration = 1900;

  /** Durée commune de lecture du verdict avant fermeture automatique. */
  private readonly resultDuration = 1800;
  /** Lecture brève du verdict d'égalité avant reprise automatique. */
  private readonly tieResultDuration = 900;

  /**
   * Empêche deux résolutions simultanées.
   */
  private resolving = false;

  constructor(
    private readonly combatService: CombatService,
    private readonly gameService: GameService,
    private readonly aiService: AiService,
    private readonly toastService: ToastService,
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

  get waveTarget(): CombatWaveTarget {
    const outcome = this.result?.outcome;
    return outcome ? getCombatWaveTarget(outcome) : null;
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

  /** Indique que le lancer est terminé et attend la confirmation du joueur. */
  get isDecisionVisible(): boolean {
    return this.presentationState() === 'decision' && this.combatService.pendingCombatRoll() !== null;
  }

  /** Armes capturées au lancer, indépendamment de l'inventaire courant. */
  get displayedWeapons() {
    return this.combatService.pendingCombatRoll()?.weapons
      ?? this.result?.weapons
      ?? [];
  }

  /** Bonus magique déjà réservé dans le combat en cours. */
  get displayedMagicBonus(): number {
    return this.combatService.pendingCombatRoll()?.magicBoltsUsed
      ?? this.result?.magicBoltsUsed
      ?? 0;
  }

  /** Une entrée par Tir magique utilisé, pour conserver leur lisibilité individuelle. */
  get displayedMagicBonusEntries(): number[] {
    return Array.from({ length: this.displayedMagicBonus }, (_, index) => index);
  }

  get magicBoltsUsed(): number {
    return this.combatService.pendingCombatRoll()?.magicBoltsUsed ?? 0;
  }

  get remainingMagicBolts(): number {
    return this.combatService.getRemainingMagicBolts();
  }

  /** Le tir magique n'est proposé que si le lancer brut ne suffit pas déjà. */
  get canUseMagicBolt(): boolean {
    const roll = this.combatService.pendingCombatRoll();
    return this.remainingMagicBolts > 0
      && !!roll
      && roll.attackPower <= roll.monsterStrength;
  }

  get displayedSacrificeBonus(): number {
    return this.combatService.pendingCombatRoll()?.sacrificeUsed ? 1 : 0;
  }

  get availableHeroRerolls(): Array<'both' | 'die1' | 'die2'> {
    return this.combatService.getAvailableHeroRerolls();
  }

  get canUseHeroReroll(): boolean {
    return this.isDecisionVisible && this.availableHeroRerolls.length > 0;
  }

  get canUseXanrosSacrifice(): boolean {
    return this.isDecisionVisible
      && !this.xanrosSacrificeDeclined()
      && this.combatService.canUseXanrosSacrifice();
  }

  useXanrosSacrifice(): void {
    if (!this.canUseXanrosSacrifice || !this.combatService.useXanrosSacrifice()) return;
    if (this.remainingMagicBolts === 0) this.resolveCombatAfterRoll();
  }

  declineXanrosSacrifice(): void {
    if (!this.canUseXanrosSacrifice) return;
    this.xanrosSacrificeDeclined.set(true);
    if (this.remainingMagicBolts === 0 && this.availableHeroRerolls.length === 0) {
      this.resolveCombatAfterRoll();
    }
  }

  useHeroReroll(kind: 'both' | 'die1' | 'die2'): void {
    if (!this.canUseHeroReroll || !this.combatService.useHeroReroll(kind)) return;
    const roll = this.combatService.pendingCombatRoll();
    if (roll) this.displayedDice.set({ die1: roll.die1, die2: roll.die2 });
    if (this.remainingMagicBolts === 0 && this.availableHeroRerolls.length === 0) {
      this.resolveCombatAfterRoll();
    }
  }

  useMagicBolt(): void {
    if (!this.isDecisionVisible || !this.resolving) return;
    if (!this.combatService.useMagicBolt()) return;
    this.triggerMagicBoltFeedback();
    if (this.remainingMagicBolts === 0) this.resolveCombatAfterRoll();
  }

  private triggerMagicBoltFeedback(count = 1): void {
    for (let index = 0; index < count; index++) {
      const eventId = Date.now() + index + Math.random();
      this.magicBoltFeedback.update(events => [...events, eventId]);
      this.schedule(() => {
        this.magicBoltFeedback.update(events => events.filter(event => event !== eventId));
      }, 850 + index * 80);
    }
    this.magicBoltScorePulse.set(false);
    queueMicrotask(() => this.magicBoltScorePulse.set(true));
    this.schedule(() => this.magicBoltScorePulse.set(false), 520 + count * 80);
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
    return this.combat?.monster.name ?? 'Adversaire';
  }

  /** Verdict métier présenté avec l'identité du vainqueur. */
  getVerdictLabel(outcome: CombatOutcome): string {
    if (outcome === 'tie') return 'Égalité';
    return outcome === 'victory'
      ? `${this.getHeroName()} gagne`
      : `${this.getMonsterName()} gagne`;
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

  /** Confirme la résolution définitive après l'animation des dés. */
  confirmCombatResolution(): void {
    if (!this.isDecisionVisible || !this.resolving) return;
    this.resolveCombatAfterRoll();
  }

  /**
   * Résolution commune aux humains et aux IA.
   *
   * CombatService lance les dés ; la résolution définitive
   * intervient seulement après leur animation.
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

    const roll = this.combatService.rollPendingCombat();

    if (!roll) {
      this.resolving = false;
      return;
    }

    this.presentationState.set('rolling');

    this.animateDice(roll);
  }

  private resolveCombatAfterRoll(): void {
    const result = this.combatService.resolvePendingCombat();
    if (!result) {
      this.resolving = false;
      return;
    }
    this.presentedResult.set(result);
    this.presentationState.set('result');
    this.schedule(() => this.updateWaveDirection(result.outcome), 0);

    this.schedule(() => {
      if (this.presentationState() === 'result' && this.presentedResult() === result) {
        this.dismissResult();
      }
    }, result.outcome === 'tie' ? this.tieResultDuration : this.resultDuration);
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
    this.waveDirection.set('left-to-right');
    this.magicBoltFeedback.set([]);
    this.magicBoltScorePulse.set(false);
    this.xanrosSacrificeDeclined.set(false);

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
  private animateDice(roll: CombatRoll): void {
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
        die1: roll.die1,
        die2: roll.die2,
      });
    }, elapsed);

    /**
     * Temps de lecture des dés avant le verdict.
     */
    elapsed += 1050;

    this.schedule(() => {
      this.presentationState.set('decision');

      // Un lancer gagnant ne nécessite aucun choix supplémentaire :
      // relance, sort ou sacrifice ne peuvent plus améliorer son issue.
      if (this.combatService.hasWinningRoll()) {
        this.schedule(() => {
          if (this.presentationState() === 'decision' && this.combatService.pendingCombatRoll() === roll) {
            this.resolveCombatAfterRoll();
          }
        }, 0);
        return;
      }

      if (roll.player.controller === 'ai') {
        this.schedule(() => {
          if (this.presentationState() === 'decision' && this.combatService.pendingCombatRoll() === roll) {
            const boltsBefore = roll.magicBoltsUsed;
            this.aiService.resolveHeroRerollDecision();
            this.aiService.resolveXanrosSacrificeDecision();
            this.aiService.resolveMagicBoltDecision();
            const boltsUsed = (this.combatService.pendingCombatRoll()?.magicBoltsUsed ?? boltsBefore) - boltsBefore;
            if (boltsUsed > 0) this.triggerMagicBoltFeedback(boltsUsed);
            this.resolveCombatAfterRoll();
          }
        }, this.resultDuration);
      } else if (!this.canUseMagicBolt && this.availableHeroRerolls.length === 0 && !this.canUseXanrosSacrifice) {
        this.schedule(() => {
          if (this.presentationState() === 'decision' && this.combatService.pendingCombatRoll() === roll) {
            this.resolveCombatAfterRoll();
          }
        }, 500);
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

    if (result.outcome === 'defeat' && result.player.lives === 0) {
      this.gameService.resolveHoranReincarnation(result.player);
    }

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

    // Une récompense obligatoire possède déjà son propre dialogue : le toast
    // de victoire serait redondant et resterait visible derrière celui-ci.
    const heroName = result.player.heroId
      ? getHeroDefinition(result.player.heroId)?.name ?? 'Le héros'
      : 'Le héros';
    const combatMessage = result.outcome === 'victory'
      ? `${heroName} vainc ${result.monster.name}.`
      : result.outcome === 'defeat'
        ? `${heroName} perd 1 point de vie.`
        : `${heroName} est à égalité avec ${result.monster.name}.`;
    const combatTone = result.outcome === 'victory'
      ? 'success'
      : result.outcome === 'defeat'
        ? 'combat'
        : 'warning';
    queueMicrotask(() => this.toastService.show(combatMessage, combatTone));

    if (result.canContinueTurn) {
      this.gameService.resumeMovementsAfterUnstoppable();
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

  private updateWaveDirection(outcome: CombatOutcome): void {
    const target = getCombatWaveTarget(outcome);
    if (!target) return;

    const heroElement = this.heroFighter?.nativeElement;
    const monsterElement = this.monsterFighter?.nativeElement;
    if (!heroElement || !monsterElement) return;

    const sourceElement = target === 'hero' ? monsterElement : heroElement;
    const targetElement = target === 'hero' ? heroElement : monsterElement;
    this.waveDirection.set(
      getCombatWaveDirection(
        sourceElement.getBoundingClientRect(),
        targetElement.getBoundingClientRect(),
      ),
    );
  }

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
