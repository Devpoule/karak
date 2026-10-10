import { Component, DoCheck, Input, OnDestroy } from '@angular/core';
import { Player } from '../../models/player';
import { PlayerService } from '../../services/player.service';
import { CombatService } from '../../services/combat.service';

const MAX_LIVES = 5;
interface LifeSlot { index: number; active: boolean; }

@Component({
  imports: [],
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

  ngDoCheck(): void {
    const currentLives = this.lives;
    const combatResultVisible = this.combatService.lastCombatResult() !== null;
    if (this.player !== this.observedPlayer) {
      this.observedPlayer = this.player;
      this.observedLives = currentLives;
      this.combatResultWasVisible = combatResultVisible;
      this.pendingDamageSlots = [];
      this.resetFeedback();
      return;
    }
    if (this.combatResultWasVisible && !combatResultVisible && this.pendingDamageSlots.length) {
      const slots = this.pendingDamageSlots;
      this.pendingDamageSlots = [];
      this.showFeedback('damage', slots);
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

  isChangedSlot(index: number): boolean { return this.changedSlots.includes(index); }
  private showFeedback(feedback: 'damage' | 'heal', changedSlots: number[]): void {
    this.resetFeedback();
    this.feedback = feedback;
    this.changedSlots = changedSlots;
    this.feedbackTimer = setTimeout(() => this.resetFeedback(), 1100);
  }
  private resetFeedback(): void {
    if (this.feedbackTimer !== null) {
      clearTimeout(this.feedbackTimer);
      this.feedbackTimer = null;
    }
    this.feedback = null;
    this.changedSlots = [];
  }
  ngOnDestroy(): void {
    this.pendingDamageSlots = [];
    this.resetFeedback();
  }
}
