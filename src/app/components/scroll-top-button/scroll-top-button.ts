import { Component, HostListener } from '@angular/core';

/** Action réutilisable permettant de revenir au début de la page courante. */
@Component({
  selector: 'app-scroll-top-button',
  template: '<button type="button" class="scroll-top-button" [class.scroll-top-button--visible]="isVisible" aria-label="Remonter en haut de la page" (click)="scrollToTop()">↑</button>',
  styleUrl: './scroll-top-button.scss',
})
export class ScrollTopButton {
  isVisible = false;

/** Gere updateVisibility et applique les gardes necessaires avant mutation. */
  @HostListener('window:scroll')
  updateVisibility(): void {
    this.isVisible = window.scrollY > 160;
  }

/** Gere scrollToTop et applique les gardes necessaires avant mutation. */
  scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
