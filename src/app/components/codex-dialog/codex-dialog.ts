import { AfterViewInit, Component, ElementRef, EventEmitter, Input, Output, Renderer2 } from '@angular/core';

/** Fiche de consultation commune aux biographies et aux pouvoirs. */
@Component({
  selector: 'app-codex-dialog',
  standalone: true,
  templateUrl: './codex-dialog.html',
  styleUrl: './codex-dialog.scss',
})
export class CodexDialog implements AfterViewInit {
  constructor(private readonly elementRef: ElementRef<HTMLElement>, private readonly renderer: Renderer2) {}

  @Input({ required: true }) title = '';
  @Input() subtitle = '';
  @Input() icon = '';
  @Input() iconAlt = '';
  @Input() body = '';
  @Input() note = '';
  @Input() placement: 'left' | 'right' = 'left';
  @Output() closed = new EventEmitter<void>();

  /** Sort la modale du contexte transformé de la sidebar pour la rattacher au viewport. */
  ngAfterViewInit(): void {
    this.renderer.appendChild(document.body, this.elementRef.nativeElement);
  }

  close(): void {
    this.closed.emit();
  }
}
