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
  popoverTop = 0;
  popoverLeft = 0;

  toggle(): void {
    this.isOpen = !this.isOpen;
    if (this.isOpen) setTimeout(() => this.positionPopover());
  }

  close(): void {
    this.isOpen = false;
  }

  @HostListener('document:keydown.escape')
  closeOnEscape(): void {
    if (this.isOpen) this.close();
  }

  @HostListener('document:click', ['$event'])
  closeOnOutsideClick(event: MouseEvent): void {
    if (this.isOpen && !this.elementRef.nativeElement.contains(event.target as Node)) this.close();
  }

  private positionPopover(): void {
    const trigger = this.elementRef.nativeElement.getBoundingClientRect();
    const width = Math.min(320, window.innerWidth - 16);
    const estimatedHeight = 240;
    this.popoverLeft = Math.max(8, Math.min(trigger.right - width, window.innerWidth - width - 8));
    this.popoverTop = trigger.bottom + 8;
    if (this.popoverTop + estimatedHeight > window.innerHeight - 8) {
      this.popoverTop = Math.max(8, trigger.top - estimatedHeight - 8);
    }
  }
}
