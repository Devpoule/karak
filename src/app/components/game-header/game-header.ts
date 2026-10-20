import { Component, HostListener, Input } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { CombatService } from '../../services/combat.service';
import { GameService } from '../../services/game.service';
import { SettingsPanel } from '../settings-panel/settings-panel';

/** Service ou composant GameHeader ; coordonne sa responsabilite de domaine ou d interface. */
@Component({
  imports: [NgOptimizedImage, RouterLink, SettingsPanel],
  selector: 'app-game-header',
  styleUrl: './game-header.scss',
  templateUrl: './game-header.html',
})
export class GameHeader {
  showLeaveConfirmation = false;
  private previouslyFocusedElement: HTMLElement | null = null;

  constructor(
    private readonly combatService: CombatService,
    private readonly gameService: GameService,
    private readonly router: Router,
  ) {}

  @Input() context: 'game' | 'rules' = 'game';

  get navigationLocked(): boolean {
    return this.combatService.hasPendingCombat || this.combatService.lastCombatResult() !== null;
  }

/** Gere requestLeave et applique les gardes necessaires avant mutation. */
  requestLeave(): void {
    if (this.context !== 'game') {
      void this.router.navigateByUrl('/');
      return;
    }

    // La préparation n'est pas encore une partie commencée :
    // elle peut être abandonnée sans confirmation.
    if (!this.gameService.isGameInProgress()) {
      this.gameService.initialize();
      void this.router.navigateByUrl('/');
      return;
    }

    this.previouslyFocusedElement = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    this.showLeaveConfirmation = true;
  }

/** Gere cancelLeave et applique les gardes necessaires avant mutation. */
  cancelLeave(): void {
    this.showLeaveConfirmation = false;
    queueMicrotask(() => this.previouslyFocusedElement?.focus());
  }

/** Gere leaveGame et applique les gardes necessaires avant mutation. */
  leaveGame(): void {
    this.showLeaveConfirmation = false;
    this.gameService.initialize();
    void this.router.navigateByUrl('/');
  }

/** Gere closeLeaveConfirmation et applique les gardes necessaires avant mutation. */
  @HostListener('document:keydown.escape')
  closeLeaveConfirmation(): void {
    if (this.showLeaveConfirmation) this.cancelLeave();
  }
}
