import { Component } from '@angular/core';

import { MovementCounter } from '../movement-counter/movement-counter';
import { PlayerSidebar } from '../player-sidebar/player-sidebar';


export type HudMode = 'solo' | 'vs-computer' | '1v1';


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
   * CHOIX D'IMPLÉMENTATION :
   *
   * Tant que la configuration d'une partie n'est pas encore
   * modélisée, le mode est défini localement afin de permettre
   * le développement des différentes dispositions du HUD.
   *
   * Le mode par défaut représente actuellement une partie
   * opposant le joueur à un adversaire contrôlé par l'ordinateur.
   *
   * À terme, cette valeur sera fournie par l'état de la partie.
   */
  readonly mode: HudMode = 'vs-computer';


  /**
   * État d'ouverture des panneaux joueurs.
   *
   * false = panneau déplié
   * true  = panneau replié
   *
   * CHOIX D'IMPLÉMENTATION :
   *
   * les panneaux sont repliés au lancement afin de laisser
   * un maximum d'espace disponible au plateau.
   */
  leftCollapsed = true;
  rightCollapsed = true;


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
