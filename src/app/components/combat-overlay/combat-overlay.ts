
import {
  Component,
  effect,
  OnDestroy,
  signal,
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

/**
 * Étapes visuelles de présentation d'un combat.
 */
type CombatPresentationState =
  | 'intro'
  | 'ready'
  | 'rolling'
  | 'decision'
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
  readonly magicBoltFeedback = signal<number[]>([]);
  readonly magicBoltScorePulse = signal(false);

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

  /** Indique que le lancer est terminé et attend la confirmation du joueur. */
  get isDecisionVisible(): boolean {
    return this.presentationState() === 'decision' && this.combatService.pendingCombatRoll() !== null;
  }

  get provisionalAttack(): number | null {
    return this.combatService.pendingCombatRoll()?.attackPower ?? null;
  }

  get provisionalMonsterStrength(): number | null {
    return this.combatService.pendingCombatRoll()?.monsterStrength ?? null;
  }

  /** Bonus d'armes enregistré, sans les Tirs magiques déjà utilisés. */
  get displayedWeaponBonus(): number | null {
    const roll = this.combatService.pendingCombatRoll();
    if (roll) return roll.equipmentBonus - roll.magicBoltsUsed;
    return this.result
      ? this.result.equipmentBonus - this.result.magicBoltsUsed
      : null;
  }

  /** Armes capturées au lancer, indépendamment de l'inventaire courant. */
  get displayedWeapons() {
    return this.combatService.pendingCombatRoll()?.weapons
      ?? this.result?.weapons
      ?? [];
  }

  get initialAttack(): number | null {
    const roll = this.combatService.pendingCombatRoll();
    return roll ? roll.attackPower - roll.magicBoltsUsed : null;
  }

  get magicBoltsUsed(): number {
    return this.combatService.pendingCombatRoll()?.magicBoltsUsed ?? 0;
  }

  get remainingMagicBolts(): number {
    return this.combatService.getRemainingMagicBolts();
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
      ? `Victoire de ${this.result?.player.heroId ? this.getHeroName() : 'Héros'}`
      : `Victoire de ${this.getMonsterName()}`;
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

    if (result.outcome === 'tie' || result.player.controller === 'ai') {
      this.schedule(() => {
        if (this.presentationState() === 'result' && this.presentedResult() === result) {
          this.dismissResult();
        }
      }, result.outcome === 'tie' ? this.tieResultDuration : this.aiResultDuration);
    }
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
    this.magicBoltFeedback.set([]);
    this.magicBoltScorePulse.set(false);

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

      if (roll.player.controller === 'ai') {
        this.schedule(() => {
          if (this.presentationState() === 'decision' && this.combatService.pendingCombatRoll() === roll) {
            const boltsBefore = roll.magicBoltsUsed;
            this.aiService.resolveMagicBoltDecision();
            const boltsUsed = (this.combatService.pendingCombatRoll()?.magicBoltsUsed ?? boltsBefore) - boltsBefore;
            if (boltsUsed > 0) this.triggerMagicBoltFeedback(boltsUsed);
            this.resolveCombatAfterRoll();
          }
        }, this.aiResultDuration);
      } else if (this.remainingMagicBolts === 0) {
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
