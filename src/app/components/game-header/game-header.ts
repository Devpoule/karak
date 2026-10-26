import { Component, ElementRef, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { CombatService } from '../../services/combat.service';
import { GameService } from '../../services/game.service';
import { SettingsPanel } from '../settings-panel/settings-panel';
import { EventHistory } from '../event-history/event-history';

@Component({
  imports: [NgOptimizedImage, RouterLink, SettingsPanel, EventHistory],
  selector: 'app-game-header',
  styleUrl: './game-header.scss',
  templateUrl: './game-header.html',
})
export class GameHeader {
  isMenuOpen = false;
  showLeaveConfirmation = false;
  private previouslyFocusedMenuTrigger: HTMLElement | null = null;
  private previouslyFocusedElement: HTMLElement | null = null;

  constructor(
    private readonly combatService: CombatService,
    private readonly gameService: GameService,
    private readonly router: Router,
    private readonly elementRef: ElementRef<HTMLElement>,
  ) {}

  @Input() context: 'game' | 'rules' | 'tutorial' = 'game';
  @Output() readonly tutorialLeave = new EventEmitter<void>();

  get navigationLocked(): boolean {
    return this.combatService.hasPendingCombat || this.combatService.lastCombatResult() !== null;
  }

  /** Ouvre ou referme le menu des commandes secondaires du header. */
  toggleMenu(trigger: HTMLElement): void {
    if (this.navigationLocked) return;

    if (this.isMenuOpen) {
      this.closeMenu();
      return;
    }

    this.previouslyFocusedMenuTrigger = trigger;
    this.isMenuOpen = true;
  }

  /** Referme le menu et rend le focus au bouton qui l'a ouvert. */
  closeMenu(): void {
    this.isMenuOpen = false;
    const focusTarget = this.previouslyFocusedMenuTrigger;
    this.previouslyFocusedMenuTrigger = null;
    queueMicrotask(() => focusTarget?.focus());
  }

  requestLeave(): void {
    this.closeMenu();
    if (this.context === 'rules') {
      void this.router.navigateByUrl('/');
      return;
    }

    if (this.context === 'tutorial') {
      this.previouslyFocusedElement = document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
      this.showLeaveConfirmation = true;
      return;
    }

    // La préparation n'est pas encore une partie commencée :
    // elle peut être abandonnée sans confirmation.
    if (!this.gameService.isGameInProgress()) {
      this.gameService.initialize();
      void this.router.navigateByUrl('/');
      return;
    }

    this.previouslyFocusedElement = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    this.showLeaveConfirmation = true;
  }

  cancelLeave(): void {
    this.showLeaveConfirmation = false;
    queueMicrotask(() => this.previouslyFocusedElement?.focus());
  }

  leaveGame(): void {
    this.showLeaveConfirmation = false;
    if (this.context === 'tutorial') {
      this.tutorialLeave.emit();
      return;
    }
    // Quitter confirme une nouvelle partie vierge : le prochain clic sur
    // "Jouer" doit ouvrir la préparation, jamais restaurer cette aventure.
    this.gameService.initialize();
    void this.router.navigateByUrl('/');
  }

  @HostListener('document:keydown.escape')
  closeLeaveConfirmation(): void {
    if (this.showLeaveConfirmation) {
      this.cancelLeave();
    } else if (this.isMenuOpen) {
      this.closeMenu();
    }
  }

  /** Ferme le menu lorsqu’un clic est effectué hors du header. */
  @HostListener('document:click', ['$event'])
  closeMenuOnOutsideClick(event: MouseEvent): void {
    if (!this.isMenuOpen || !(event.target instanceof Node)) return;
    if (!this.elementRef.nativeElement.contains(event.target)) this.closeMenu();
  }
}
