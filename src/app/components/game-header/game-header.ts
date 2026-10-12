import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CombatService } from '../../services/combat.service';

@Component({
  imports: [RouterLink],
  selector: 'app-game-header',
  styleUrl: './game-header.scss',
  templateUrl: './game-header.html',
})
export class GameHeader {
  constructor(private readonly combatService: CombatService) {}

  @Input() context: 'game' | 'rules' = 'game';

  get navigationLocked(): boolean {
    return this.combatService.hasPendingCombat || this.combatService.lastCombatResult() !== null;
  }
}
