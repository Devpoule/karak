import { Component, DoCheck, Input, OnDestroy } from '@angular/core';
import { Player } from '../../models/player';
import { PlayerService } from '../../services/player.service';
import { CombatService } from '../../services/combat.service';
import { QuantityPipe } from '../../pipes/quantity.pipe';

const MAX_LIVES = 5;
/** Contrat de donnees LifeSlot utilise par le domaine ou l interface. */
interface LifeSlot { index: number; active: boolean; }

/** Service ou composant LifePanel ; coordonne sa responsabilite de domaine ou d interface. */
@Component({
  imports: [QuantityPipe],
  selector: 'app-life-panel',
  styleUrl: './life-panel.scss',
  templateUrl: './life-panel.html',
})
export class LifePanel implements DoCheck, OnDestroy {
  @Input() player: Player | null = null;
  feedback: 'damage' | 'heal' | null = null;
  changedSlots: number[] = [];
  private observedPlayer: Player | null = null;
  private observedLives: number | null = null;
  private feedbackTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingDamageSlots: number[] = [];
  private combatResultWasVisible = false;
  private destroyed = false;
  private observedLifeLossRevision = 0;

  constructor(
    private readonly playerService: PlayerService,
    private readonly combatService: CombatService,
  ) {}

  get lives(): number {
    // Lecture du signal depuis le template : Angular est averti des dégâts.
    this.playerService.livesRevision();
    return Math.max(0, Math.min(MAX_LIVES, this.player?.lives ?? 0));
  }

  get lifeSlots(): LifeSlot[] {
    return Array.from({ length: MAX_LIVES }, (_, index) => ({
      index, active: index < this.lives,
    }));
  }

/** Gere ngDoCheck et applique les gardes necessaires avant mutation. */
  ngDoCheck(): void {
    const currentLives = this.lives;
    const combatResultVisible = this.combatService.lastCombatResult() !== null;
    if (this.player !== this.observedPlayer) {
      this.observedPlayer = this.player;
      this.observedLives = currentLives;
      this.combatResultWasVisible = combatResultVisible;
      this.pendingDamageSlots = [];
      this.observedLifeLossRevision = this.playerService.lastLifeLoss()?.revision ?? 0;
      this.resetFeedback();
      return;
    }
    const lifeLoss = this.playerService.lastLifeLoss();
    if (lifeLoss && lifeLoss.player === this.player && lifeLoss.revision > this.observedLifeLossRevision) {
      this.observedLifeLossRevision = lifeLoss.revision;
      const slots = Array.from(
        { length: lifeLoss.amount },
        (_, index) => currentLives + index,
      );
      if (combatResultVisible) {
        this.pendingDamageSlots = slots;
      } else {
        this.showFeedback('damage', slots);
      }
    }
    if (this.combatResultWasVisible && !combatResultVisible && this.pendingDamageSlots.length) {
      const slots = this.pendingDamageSlots;
      this.pendingDamageSlots = [];
      // L'overlay vient seulement d'être retiré. Attendre le prochain
      // micro-cycle garantit que l'animation démarre sur la vue de la carte,
      // en même temps que le toast du résultat de combat.
      queueMicrotask(() => {
        if (!this.destroyed && !this.combatService.lastCombatResult()) {
          this.showFeedback('damage', slots);
        }
      });
    }
    this.combatResultWasVisible = combatResultVisible;
    if (this.observedLives === null || currentLives === this.observedLives) return;
    const previousLives = this.observedLives;
    this.observedLives = currentLives;
    this.resetFeedback();
    const feedback = currentLives < previousLives ? 'damage' : 'heal';
    const changedSlots = Array.from(
      { length: Math.abs(currentLives - previousLives) },
      (_, index) => Math.min(currentLives, previousLives) + index,
    );
    if (feedback === 'damage' && combatResultVisible && this.combatService.lastCombatResult()?.player === this.player) {
      this.pendingDamageSlots = changedSlots;
      return;
    }
    this.showFeedback(feedback, changedSlots);
  }

/** Gere isChangedSlot et applique les gardes necessaires avant mutation. */
  isChangedSlot(index: number): boolean { return this.changedSlots.includes(index); }
/** Gere showFeedback et applique les gardes necessaires avant mutation. */
  private showFeedback(feedback: 'damage' | 'heal', changedSlots: number[]): void {
    this.resetFeedback();
    this.feedback = feedback;
    this.changedSlots = changedSlots;
    const duration = feedback === 'damage' ? 2800 : 1100;
    this.feedbackTimer = setTimeout(() => this.resetFeedback(), duration);
  }
/** Gere resetFeedback et applique les gardes necessaires avant mutation. */
  private resetFeedback(): void {
    if (this.feedbackTimer !== null) {
      clearTimeout(this.feedbackTimer);
      this.feedbackTimer = null;
    }
    this.feedback = null;
    this.changedSlots = [];
  }
/** Gere ngOnDestroy et applique les gardes necessaires avant mutation. */
  ngOnDestroy(): void {
    this.destroyed = true;
    this.pendingDamageSlots = [];
    this.resetFeedback();
  }
}
