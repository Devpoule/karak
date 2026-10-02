import { Component } from '@angular/core';
import { PlayerSidebar } from '../player-sidebar/player-sidebar';
import { MovementCounter } from '../movement-counter/movement-counter';

export type HudMode = 'solo' | '1v1';

@Component({
  selector: 'app-player-hud',
  imports: [
    PlayerSidebar,
    MovementCounter,
  ],
  templateUrl: './player-hud.html',
  styleUrl: './player-hud.scss',
})
export class PlayerHud {

  /**
   * Mode d'affichage actuel du HUD.
   *
   * Temporaire :
   * plus tard, cette valeur viendra de la configuration réelle
   * de la partie.
   */
  readonly mode: HudMode = '1v1';

  /**
   * État d'ouverture des panneaux joueurs.
   *
   * false = panneau déplié
   * true  = panneau replié
   */
  leftCollapsed = false;
  rightCollapsed = false;

  /**
   * Déplie ou replie le panneau du joueur gauche.
   */
  toggleLeft(): void {
    this.leftCollapsed = !this.leftCollapsed;
  }

  /**
   * Déplie ou replie le panneau du joueur droit.
   */
  toggleRight(): void {
    this.rightCollapsed = !this.rightCollapsed;
  }
}
