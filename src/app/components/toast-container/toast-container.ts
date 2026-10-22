import { Component, HostListener } from '@angular/core';
import { ToastMessage, ToastService } from '../../services/toast.service';

/** Affichage commun des notifications du jeu. */
@Component({
  selector: 'app-toast-container',
  imports: [],
  templateUrl: './toast-container.html',
  styleUrl: './toast-container.scss',
})
export class ToastContainer {
  private layoutRevision = 0;

  constructor(readonly toastService: ToastService) {}

  /** Recalcule les positions après les changements de taille du viewport. */
  @HostListener('window:resize')
  onViewportResize(): void { this.layoutRevision++; }

  /** Place le toast dans la zone entre le header et le HUD du joueur ciblé. */
  positionFor(toast: ToastMessage): Record<string, string> {
    void this.layoutRevision;
    const target = toast.target;
    if (!target || typeof document === 'undefined') return {};
    const anchor = document.querySelector<HTMLElement>(
      `[data-toast-anchor="${target.anchor}"][data-player-index="${target.playerIndex}"]`,
    );
    if (!anchor) return {};

    const sideElement = anchor.closest<HTMLElement>('.player-hud__side');
    const sideBounds = sideElement?.getBoundingClientRect();
    if (!sideBounds) return {};

    const headerBounds = document.querySelector<HTMLElement>('.game-header')?.getBoundingClientRect();
    const topBoundary = (headerBounds?.bottom ?? 0) + 16;
    const bottomBoundary = sideBounds.top - 16;
    const availableHeight = Math.max(0, bottomBoundary - topBoundary);
    const toastCenter = topBoundary + availableHeight / 2;
    const side = sideElement?.classList.contains('player-hud__side--right')
      ? 'right'
      : 'left';
    const style: Record<string, string> = {
      top: `${Math.max(topBoundary, toastCenter)}px`,
      transform: 'translateY(-50%)',
    };
    if (side === 'right') {
      style['right'] = `${Math.max(8, window.innerWidth - sideBounds.right)}px`;
    } else {
      style['left'] = `${Math.max(8, sideBounds.left)}px`;
    }
    if (availableHeight < 96) {
      style['top'] = `${topBoundary}px`;
      style['transform'] = 'none';
      style['max-height'] = `${Math.max(0, availableHeight)}px`;
      style['overflow'] = 'auto';
    }
    return style;
  }
}
