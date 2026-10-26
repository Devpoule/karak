import { Component, EventEmitter, Input, Output } from '@angular/core';

export interface DecisionCardAction {
  readonly label: string;
  readonly kind?: 'primary' | 'secondary';
  readonly disabled?: boolean;
}

/** Carte générique pour une décision de jeu déjà validée par le domaine. */
@Component({
  selector: 'app-decision-card',
  standalone: true,
  templateUrl: './decision-card.html',
  styleUrl: './decision-card.scss',
})
export class DecisionCard {
  @Input() eyebrow = 'Décision';
  @Input({ required: true }) title = '';
  @Input() description = '';
  @Input() image = '';
  @Input() imageAlt = '';
  @Input() actions: readonly DecisionCardAction[] = [];
  @Input() compact = false;
  /** Rend la décision dans le rectangle de la carte du combattant. */
  @Input() embedded = false;
  /** Masque les actions pour une décision automatiquement pilotée par l’IA. */
  @Input() showActions = true;
  @Output() actionSelected = new EventEmitter<number>();

  /** Nombre de colonnes de présentation, limité pour préserver la lisibilité. */
  get actionColumns(): number {
    if (this.actions.length <= 1) return 1;
    if (this.actions.length <= 3) return this.actions.length;
    if (this.actions.length === 4) return 2;
    return 3;
  }

  /** Notifie le parent de l'action choisie sans appliquer de règle métier. */
  selectAction(index: number): void {
    this.actionSelected.emit(index);
  }
}
