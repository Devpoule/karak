import { Component, ElementRef, HostListener, Input } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { CombatService } from '../../services/combat.service';
import { GameService } from '../../services/game.service';
import { SettingsPanel } from '../settings-panel/settings-panel';
import { TutorialPanel } from '../tutorial-panel/tutorial-panel';
import { EventHistory } from '../event-history/event-history';

/** Service ou composant GameHeader ; coordonne sa responsabilite de domaine ou d interface. */
@Component({
  imports: [NgOptimizedImage, RouterLink, SettingsPanel, TutorialPanel, EventHistory],
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

  @Input() context: 'game' | 'rules' = 'game';

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

/** Gere requestLeave et applique les gardes necessaires avant mutation. */
  requestLeave(): void {
    this.closeMenu();
    if (this.context !== 'game') {
      void this.router.navigateByUrl('/');
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

/** Gere cancelLeave et applique les gardes necessaires avant mutation. */
  cancelLeave(): void {
    this.showLeaveConfirmation = false;
    queueMicrotask(() => this.previouslyFocusedElement?.focus());
  }

/** Gere leaveGame et applique les gardes necessaires avant mutation. */
  leaveGame(): void {
    this.showLeaveConfirmation = false;
    void this.router.navigateByUrl('/');
  }

/** Gere closeLeaveConfirmation et applique les gardes necessaires avant mutation. */
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
