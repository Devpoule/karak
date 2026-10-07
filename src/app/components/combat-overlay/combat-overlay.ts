import { Component } from '@angular/core';

import { getHeroDefinition } from '../../data/hero-definitions';
import { CombatOutcome, CombatService } from '../../services/combat.service';
import { GameService } from '../../services/game.service';

/**
 * Surcouche cinématique dédiée aux combats.
 *
 * Le moteur du combat reste entièrement porté par CombatService.
 * Ce composant ne fait que :
 *
 * - représenter le héros et le monstre en grand ;
 * - déclencher la résolution pour un joueur humain ;
 * - présenter le dernier résultat ;
 * - demander à GameService de terminer le tour après résolution.
 */
@Component({
  selector: 'app-combat-overlay',
  imports: [],
  templateUrl: './combat-overlay.html',
  styleUrl: './combat-overlay.scss',
})
export class CombatOverlay {
  constructor(
    private readonly combatService: CombatService,
    private readonly gameService: GameService,
  ) {}

  get pendingCombat() {
    return this.combatService.pendingCombat();
  }

  get lastCombatResult() {
    return this.combatService.lastCombatResult();
  }

  get canRoll(): boolean {
    return this.pendingCombat?.player.controller === 'human';
  }

  getHeroImage(): string | undefined {
    const player = this.pendingCombat?.player ?? this.lastCombatResult?.player;

    if (!player?.heroId) {
      return undefined;
    }

    const hero = getHeroDefinition(player.heroId);
    const facing = player.facing ?? 'south';

    return hero?.pawn[facing] ?? hero?.pawn.south;
  }

  getHeroName(): string {
    const player = this.pendingCombat?.player ?? this.lastCombatResult?.player;

    if (!player?.heroId) {
      return 'Héros';
    }

    return getHeroDefinition(player.heroId)?.name ?? 'Héros';
  }

  resolveCombat(): void {
    if (!this.canRoll) {
      return;
    }

    const result = this.combatService.resolvePendingCombat();

    if (!result) {
      return;
    }

    this.gameService.endTurn();
  }

  dismissResult(): void {
    this.combatService.clearLastCombatResult();
  }

  getOutcomeLabel(outcome: CombatOutcome): string {
    switch (outcome) {
      case 'victory':
        return 'Victoire';
      case 'tie':
        return 'Match nul';
      case 'defeat':
        return 'Défaite';
    }
  }
}
