import { AfterViewInit, Component, ElementRef, EventEmitter, HostListener, Input, Output, Renderer2, ViewChild } from '@angular/core';
import { HeroPowerDefinition } from '../../models/hero';

/** Fiche de consultation commune aux biographies et aux pouvoirs. */
@Component({
  selector: 'app-codex-dialog',
  standalone: true,
  templateUrl: './codex-dialog.html',
  styleUrl: './codex-dialog.scss',
})
export class CodexDialog implements AfterViewInit {
  private static nextDialogId = 0;
  constructor(private readonly elementRef: ElementRef<HTMLElement>, private readonly renderer: Renderer2) {}

  @ViewChild('dialogElement') private dialogElement?: ElementRef<HTMLElement>;
  readonly titleId = 'codex-dialog-title-' + (++CodexDialog.nextDialogId);
  @Input({ required: true }) title = '';
  @Input() subtitle = '';
  @Input() icon = '';
  @Input() iconAlt = '';
  @Input() body = '';
  @Input() note = '';
  @Input() powers: readonly HeroPowerDefinition[] = [];
  @Input() placement: 'left' | 'right' | 'center' = 'center';
  @Output() closed = new EventEmitter<void>();
  private previouslyFocusedElement: HTMLElement | null = null;

  /** Sort la modale du contexte transformé de la sidebar pour la rattacher au viewport. */
  ngAfterViewInit(): void {
    this.previouslyFocusedElement = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    this.renderer.appendChild(document.body, this.elementRef.nativeElement);
    queueMicrotask(() => this.dialogElement?.nativeElement.focus());
  }

  close(): void {
    this.closed.emit();
    queueMicrotask(() => this.previouslyFocusedElement?.focus());
  }

  @HostListener('document:keydown.escape', ['$event'])
  closeOnEscape(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.close();
  }
}
