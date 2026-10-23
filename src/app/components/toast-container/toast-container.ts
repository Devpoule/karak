import { Component, HostListener } from '@angular/core';
import { getHeroIdentityColor } from '../../data/hero-definitions';
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
    const playerControl = document.querySelector<HTMLElement>(
      `.player-hud__player-control[data-player-index="${target.playerIndex}"]`,
    );
    const toastHeight = playerControl
      ? Number.parseFloat(getComputedStyle(playerControl).height)
      : 52;
    const headerTopBoundary = (headerBounds?.bottom ?? 0) + 16;
    const mobileControlsBottom = playerControl?.getBoundingClientRect().bottom ?? headerTopBoundary;
    const topBoundary = window.innerWidth <= 640
      ? Math.max(headerTopBoundary, mobileControlsBottom + 8)
      : headerTopBoundary;
    const bottomBoundary = sideBounds.top - 16;
    const availableHeight = Math.max(0, bottomBoundary - topBoundary);
    const toastCenter = topBoundary + availableHeight / 2;
    const side = sideElement?.classList.contains('player-hud__side--right')
      ? 'right'
      : 'left';
    const toastWidth = window.innerWidth <= 640
      ? Math.min(288, window.innerWidth - 16)
      : window.innerWidth / 3;
    const edge = 8;
    const inwardOffset = side === 'right'
      ? window.innerWidth - sideBounds.left + 16
      : sideBounds.right + 16;
    const boundedOffset = Math.min(inwardOffset, window.innerWidth - toastWidth - edge);
    const style: Record<string, string> = {
      top: `${availableHeight >= toastHeight ? toastCenter : topBoundary + toastHeight / 2}px`,
      transform: 'translateY(-50%)',
      '--toast-height': `${toastHeight}px`,
    };
    if (side === 'right') {
      style['right'] = `${Math.max(edge, boundedOffset)}px`;
    } else {
      style['left'] = `${Math.max(edge, boundedOffset)}px`;
    }
    return style;
  }

  styleFor(toast: ToastMessage): Record<string, string> {
    return {
      ...this.positionFor(toast),
      '--toast-hero-color': getHeroIdentityColor(toast.heroId),
    };
  }

  iconFor(eventType: ToastMessage['eventType']): string {
    return {
      info: '✦',
      turn: '✦',
      combat: '⚔',
      'life-loss': '♥',
      healing: '♥',
      equipment: '✧',
      treasure: '◆',
      curse: '☠',
      power: '✦',
    }[eventType];
  }
}
