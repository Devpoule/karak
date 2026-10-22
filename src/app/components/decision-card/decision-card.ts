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
  @Output() actionSelected = new EventEmitter<number>();

  /** Notifie le parent de l'action choisie sans appliquer de règle métier. */
  selectAction(index: number): void {
    this.actionSelected.emit(index);
  }
}
