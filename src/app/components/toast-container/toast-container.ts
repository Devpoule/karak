import { Component } from '@angular/core';
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
  constructor(readonly toastService: ToastService) {}

  styleFor(toast: ToastMessage): Record<string, string> {
    return {
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
