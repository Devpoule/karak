import { Component, effect, Input, OnDestroy, signal } from '@angular/core';

import { GAME_CONSTANTS } from '../../constants/game.constants';
import { TurnService } from '../../services/turn.service';
import { QuantityPipe } from '../../pipes/quantity.pipe';


/**
 * Affiche le nombre de mouvements encore disponibles
 * pendant le tour courant.
 *
 * TurnService reste la source de vérité de cet état.
 *
 * Le composant ne contient aucune logique de tour :
 * il se contente de représenter visuellement l'état fourni
 * par le service.
 */
@Component({
  imports: [QuantityPipe],
  selector: 'app-movement-counter',
  styleUrl: './movement-counter.scss',
  templateUrl: './movement-counter.html',
})
export class MovementCounter implements OnDestroy {

  /** Affiche uniquement les points dans une incrustation d’inventaire. */
  @Input() compact = false;
  /** Les inventaires inactifs affichent les points désactivés. */
  @Input() active = true;

  readonly pointIndexes = Array.from({ length: GAME_CONSTANTS.movement.perTurn }, (_, index) => index);
  readonly fragmentIndexes = Array.from({ length: 6 }, (_, index) => index);
  private readonly animatingPointIndexes = new Set<number>();
  private readonly animationStateRevision = signal(0);
  private readonly animationTimers = new Map<number, ReturnType<typeof setTimeout>>();

  constructor(
    private readonly turnService: TurnService,
  ) {
    effect(() => {
      const consumption = this.turnService.lastMovementConsumption();
      if (!consumption || !this.active) {
        this.clearAnimations();
        return;
      }

      for (let offset = 0; offset < consumption.count; offset++) {
        const pointIndex = consumption.firstPointIndex + offset;
        this.animatingPointIndexes.add(pointIndex);
        const previousTimer = this.animationTimers.get(pointIndex);
        if (previousTimer !== undefined) clearTimeout(previousTimer);
        this.animationTimers.set(pointIndex, setTimeout(() => {
          this.animatingPointIndexes.delete(pointIndex);
          this.animationTimers.delete(pointIndex);
          this.animationStateRevision.update(revision => revision + 1);
        }, 480));
      }
      this.animationStateRevision.update(revision => revision + 1);
    });
  }


  /**
   * Indicateurs correspondant aux mouvements encore disponibles.
   *
   * Le tableau est reconstruit depuis l'état courant du tour afin
   * que le template puisse conserver son affichage sous forme
   * de points.
   *
   * remainingMovements est un Signal Angular :
   * l'appel avec () permet d'en lire la valeur actuelle.
   */
  get movementPoints(): unknown[] {
    return Array.from({
      length: this.turnService.remainingMovements(),
    });
  }

/** Gere isPointConsumed et applique les gardes necessaires avant mutation. */
  isPointConsumed(index: number): boolean {
    return !this.active || index >= this.turnService.remainingMovements();
  }

/** Gere isPointAnimating et applique les gardes necessaires avant mutation. */
  isPointAnimating(index: number): boolean {
    this.animationStateRevision();
    return this.active && this.animatingPointIndexes.has(index);
  }

/** Gere ngOnDestroy et applique les gardes necessaires avant mutation. */
  ngOnDestroy(): void {
    this.clearAnimations();
  }

/** Gere clearAnimations et applique les gardes necessaires avant mutation. */
  private clearAnimations(): void {
    this.animationTimers.forEach(timer => clearTimeout(timer));
    this.animationTimers.clear();
    if (this.animatingPointIndexes.size === 0) return;
    this.animatingPointIndexes.clear();
    this.animationStateRevision.update(revision => revision + 1);
  }
}
