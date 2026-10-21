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

  /** Résout une position à partir de l’ancre DOM du joueur, sans coordonnées métier fixes. */
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
    const bounds = target.anchor === 'inventory-top' && sideBounds
      ? sideBounds
      : anchor.getBoundingClientRect();
    const side = sideElement?.classList.contains('player-hud__side--right')
      ? 'right'
      : 'left';
    const narrow = window.innerWidth <= 600;
    const gap = 12;
    const isInventoryHeader = target.anchor === 'inventory-top';
    const style: Record<string, string> = {
      top: `${Math.max(8, bounds.top)}px`,
      ...(isInventoryHeader ? { transform: 'translateY(calc(-100% - 8px))' } : {}),
    };
    if (narrow) {
      style['left'] = '50%';
      style['transform'] = isInventoryHeader
        ? 'translate(-50%, calc(-100% - 8px))'
        : 'translateX(-50%)';
    } else if (side === 'right') {
      style['right'] = `${Math.max(8, window.innerWidth - bounds.right)}px`;
    } else {
      style['left'] = `${Math.max(8, bounds.left)}px`;
    }
    return style;
  }
}
