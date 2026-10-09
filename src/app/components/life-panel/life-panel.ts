import { Component, DoCheck, Input, OnDestroy } from '@angular/core';
import { Player } from '../../models/player';
import { PlayerService } from '../../services/player.service';

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

  constructor(private readonly playerService: PlayerService) {}

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
    if (this.player !== this.observedPlayer) {
      this.observedPlayer = this.player;
      this.observedLives = currentLives;
      this.resetFeedback();
      return;
    }
    if (this.observedLives === null || currentLives === this.observedLives) return;
    const previousLives = this.observedLives;
    this.observedLives = currentLives;
    this.resetFeedback();
    this.feedback = currentLives < previousLives ? 'damage' : 'heal';
    this.changedSlots = Array.from(
      { length: Math.abs(currentLives - previousLives) },
      (_, index) => Math.min(currentLives, previousLives) + index,
    );
    this.feedbackTimer = setTimeout(() => this.resetFeedback(), 1100);
  }

  isChangedSlot(index: number): boolean { return this.changedSlots.includes(index); }
  private resetFeedback(): void {
    if (this.feedbackTimer !== null) {
      clearTimeout(this.feedbackTimer);
      this.feedbackTimer = null;
    }
    this.feedback = null;
    this.changedSlots = [];
  }
  ngOnDestroy(): void { this.resetFeedback(); }
}
