import { Component, HostListener, Input, computed, signal } from '@angular/core';
import { TutorialObjectiveId } from '../../data/tutorial-scenario';
import { TutorialSessionService } from '../../services/tutorial-session.service';

interface TutorialChecklistItem {
  readonly id: TutorialObjectiveId;
  readonly label: string;
}

/** Présentation des objectifs du didacticiel, sans état métier propre. */
@Component({
  selector: 'app-tutorial-checklist',
  templateUrl: './tutorial-checklist.html',
  styleUrl: './tutorial-checklist.scss',
})
export class TutorialChecklist {
  @Input() mode: 'sidebar' | 'mobile' = 'sidebar';

  readonly mobileExpanded = signal(false);
  readonly checklistItems: readonly TutorialChecklistItem[] = [
    { id: 'movement', label: 'Se déplacer' },
    { id: 'exploration', label: 'Explorer une dalle' },
    { id: 'combat', label: 'Résoudre un combat' },
    { id: 'west-branch', label: 'Explorer la branche ouest' },
    { id: 'east-branch', label: 'Explorer la branche est' },
    { id: 'portal', label: 'Utiliser un portail' },
    { id: 'exit', label: 'Atteindre la sortie' },
  ];
  readonly currentObjective = computed(() =>
    this.checklistItems.find(item => !this.session.objectives()[item.id])?.id ?? null,
  );
  readonly progressPercentage = computed(() => Math.round(
    (this.session.completedObjectiveCount() / this.session.totalObjectiveCount) * 100,
  ));

  constructor(readonly session: TutorialSessionService) {}

  get expanded(): boolean {
    return this.mode === 'sidebar' || this.mobileExpanded();
  }

  toggle(): void {
    if (this.mode === 'mobile') this.mobileExpanded.update(expanded => !expanded);
  }

  /** L'ouverture du volet ne doit jamais être interprétée comme un clic extérieur de l'aide. */
  @HostListener('click', ['$event'])
  stopExternalHelpCollapse(event: Event): void {
    event.stopPropagation();
  }
}

