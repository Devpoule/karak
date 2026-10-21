import { Component, ElementRef, HostListener, Input, ViewChild } from '@angular/core';
import { TUTORIAL_STEPS } from '../../data/tutorial-steps';

/** Parcours guidé consultatif, réutilisable depuis l'accueil et la partie. */
@Component({
  selector: 'app-tutorial-panel',
  templateUrl: './tutorial-panel.html',
  styleUrl: './tutorial-panel.scss',
})
export class TutorialPanel {
  @Input() compact = false;
  @Input() disabled = false;
  @ViewChild('dialogElement') private dialogElement?: ElementRef<HTMLElement>;

  readonly steps = TUTORIAL_STEPS;
  currentIndex = 0;
  isOpen = false;
  private previouslyFocusedElement: HTMLElement | null = null;

  get currentStep() {
    return this.steps[this.currentIndex];
  }

  get isLastStep(): boolean {
    return this.currentIndex === this.steps.length - 1;
  }

  open(): void {
    if (this.disabled) return;
    this.currentIndex = 0;
    this.previouslyFocusedElement = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    this.isOpen = true;
    queueMicrotask(() => this.dialogElement?.nativeElement.focus());
  }

  close(): void {
    this.isOpen = false;
    const focusTarget = this.previouslyFocusedElement;
    this.previouslyFocusedElement = null;
    queueMicrotask(() => focusTarget?.focus());
  }

  next(): void {
    if (this.isLastStep) {
      this.close();
      return;
    }
    this.currentIndex++;
  }

  previous(): void {
    if (this.currentIndex > 0) this.currentIndex--;
  }

  @HostListener('document:keydown.escape', ['$event'])
  closeOnEscape(event: Event): void {
    if (!this.isOpen) return;
    event.preventDefault();
    event.stopPropagation();
    this.close();
  }

  @HostListener('document:keydown', ['$event'])
  navigateWithKeyboard(event: KeyboardEvent): void {
    if (!this.isOpen) return;
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.next();
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.previous();
    }
  }
}
