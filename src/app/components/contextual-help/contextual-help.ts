import { Component, ElementRef, HostListener, input } from '@angular/core';
import { ContextualHelp } from '../../data/contextual-help';

/** Aide courte liée à une section documentaire stable du Codex. */
@Component({
  selector: 'app-contextual-help',
  imports: [],
  templateUrl: './contextual-help.html',
  styleUrl: './contextual-help.scss',
})
export class ContextualHelpComponent {
  constructor(private readonly elementRef: ElementRef<HTMLElement>) {}

  readonly help = input.required<ContextualHelp>();
  isOpen = false;
  private previouslyFocusedElement: HTMLElement | null = null;

  toggle(): void {
    if (!this.isOpen) {
      this.previouslyFocusedElement = document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    }
    this.isOpen = !this.isOpen;
  }

  close(): void {
    this.isOpen = false;
    const focusTarget = this.previouslyFocusedElement
      ?? this.elementRef.nativeElement.querySelector<HTMLButtonElement>('.contextual-help__trigger');
    this.previouslyFocusedElement = null;
    queueMicrotask(() => focusTarget?.focus());
  }

  @HostListener('document:keydown.escape')
  closeOnEscape(): void {
    if (this.isOpen) this.close();
  }

  @HostListener('document:click', ['$event'])
  closeOnOutsideClick(event: MouseEvent): void {
    if (this.isOpen && !this.elementRef.nativeElement.contains(event.target as Node)) this.close();
  }

}
