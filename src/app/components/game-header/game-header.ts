import { Component, HostListener, Input } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CombatService } from '../../services/combat.service';
import { GameService } from '../../services/game.service';

@Component({
  imports: [RouterLink],
  selector: 'app-game-header',
  styleUrl: './game-header.scss',
  templateUrl: './game-header.html',
})
export class GameHeader {
  showLeaveConfirmation = false;

  constructor(
    private readonly combatService: CombatService,
    private readonly gameService: GameService,
    private readonly router: Router,
  ) {}

  @Input() context: 'game' | 'rules' = 'game';

  get navigationLocked(): boolean {
    return this.combatService.hasPendingCombat || this.combatService.lastCombatResult() !== null;
  }

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

    this.showLeaveConfirmation = true;
  }

  cancelLeave(): void {
    this.showLeaveConfirmation = false;
  }

  leaveGame(): void {
    this.showLeaveConfirmation = false;
    this.gameService.initialize();
    void this.router.navigateByUrl('/');
  }

  @HostListener('document:keydown.escape')
  closeLeaveConfirmation(): void {
    if (this.showLeaveConfirmation) this.cancelLeave();
  }
}
