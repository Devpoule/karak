import { Component, ElementRef, HostListener } from '@angular/core';
import { TutorialSessionService } from '../../services/tutorial-session.service';

/** Aide contextuelle non bloquante, limitée à un seul message à la fois. */
@Component({
  selector: 'app-tutorial-help',
  templateUrl: './tutorial-help.html',
  styleUrl: './tutorial-help.scss',
})
export class TutorialHelp {
  constructor(
    readonly session: TutorialSessionService,
    private readonly elementRef: ElementRef<HTMLElement>,
  ) {}

  @HostListener('document:keydown.escape')
  collapseOnEscape(): void {
    this.session.collapseHelp();
  }

  @HostListener('document:click', ['$event'])
  collapseOnOutsideClick(event: MouseEvent): void {
    if (event.target instanceof Node && !this.elementRef.nativeElement.contains(event.target)) {
      this.session.collapseHelp();
    }
  }
}

