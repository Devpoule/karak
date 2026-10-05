import { Component } from '@angular/core';

import { getPlayerUiConfig } from '../../constants/player-ui.constants';
import { Player } from '../../models/player';
import { GameService } from '../../services/game.service';
import { PlayerService } from '../../services/player.service';
import { MovementCounter } from '../movement-counter/movement-counter';
import { PlayerSidebar } from '../player-sidebar/player-sidebar';


/**
 * HUD principal de la partie.
 *
 * ORGANISATION :
 *
 * - J1 ouvre sa fiche sur le côté gauche ;
 * - J2 à J5 partagent une fiche sur le côté droit ;
 * - les commandes des joueurs sont regroupées autour
 *   du compteur de mouvements ;
 * - consulter une fiche ne modifie jamais le joueur actif.
 *
 * IMPORTANT :
 *
 * Le joueur affiché dans le panneau droit est mémorisé même
 * lorsque le panneau est fermé.
 *
 * Cela permet de conserver son contenu pendant toute
 * l'animation de repli.
 */
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
   * État d'ouverture de la fiche de J1.
   */
  leftPanelOpen = false;


  /**
   * État d'ouverture du panneau droit.
   *
   * Cet état est volontairement indépendant du joueur
   * actuellement mémorisé dans ce panneau.
   */
  rightPanelOpen = false;


  /**
   * Joueur actuellement associé au panneau droit.
   *
   * J2 est mémorisé par défaut afin que le panneau dispose
   * toujours d'un contenu lorsqu'il doit être animé.
   *
   * La présence réelle de J2 reste vérifiée avant affichage.
   */
  rightPlayerIndex = 1;


  constructor(
    private readonly gameService: GameService,
    private readonly playerService: PlayerService,
  ) {}


  // ==========================================================
  // JOUEURS
  // ==========================================================

  /**
   * Tous les joueurs participant réellement à la partie.
   *
   * 0 = J1
   * 1 = J2
   * 2 = J3
   * 3 = J4
   * 4 = J5
   */
  get players(): Player[] {
    return this.playerService.players;
  }


  /**
   * J1 possède toujours la fiche gauche.
   */
  get playerOne(): Player | null {
    return this.players[0] ?? null;
  }


  /**
   * Joueur mémorisé dans la fiche droite.
   *
   * La fiche peut être fermée tout en conservant ce joueur,
   * ce qui permet au contenu de rester visible pendant
   * l'animation de repli.
   */
  get rightPlayer(): Player | null {
    return this.players[this.rightPlayerIndex] ?? null;
  }


  /**
   * Index du joueur dont c'est actuellement le tour.
   */
  get activePlayerIndex(): number | null {
    return this.gameService.activePlayerIndex();
  }


  // ==========================================================
  // FICHE GAUCHE
  // ==========================================================

  /**
   * Ouvre ou ferme la fiche de J1.
   */
  togglePlayerOne(): void {
    this.leftPanelOpen = !this.leftPanelOpen;
  }


  // ==========================================================
  // FICHE DROITE
  // ==========================================================

  /**
   * Ouvre, ferme ou change le joueur présenté dans
   * le panneau droit.
   *
   * Cas 1 :
   * le panneau est fermé.
   * -> le joueur demandé est mémorisé puis le panneau s'ouvre.
   *
   * Cas 2 :
   * le même joueur est déjà affiché.
   * -> le panneau se ferme mais conserve son contenu afin que
   *    l'animation de sortie reste entièrement visible.
   *
   * Cas 3 :
   * un autre joueur est demandé pendant que le panneau est ouvert.
   * -> le contenu change directement sans fermer le panneau.
   */
  toggleRightPlayer(playerIndex: number): void {
    if (
      playerIndex < 1
      || playerIndex >= this.players.length
    ) {
      return;
    }

    if (
      this.rightPanelOpen
      && this.rightPlayerIndex === playerIndex
    ) {
      this.rightPanelOpen = false;
      return;
    }

    this.rightPlayerIndex = playerIndex;
    this.rightPanelOpen = true;
  }


  /**
   * Indique si la fiche correspondant au joueur est ouverte.
   */
  isPlayerPanelOpen(playerIndex: number): boolean {
    if (playerIndex === 0) {
      return this.leftPanelOpen;
    }

    return (
      this.rightPanelOpen
      && this.rightPlayerIndex === playerIndex
    );
  }


  // ==========================================================
  // ÉTAT DU TOUR
  // ==========================================================

  /**
   * Indique si le joueur correspondant joue actuellement.
   */
  isActivePlayer(playerIndex: number): boolean {
    return this.activePlayerIndex === playerIndex;
  }


  // ==========================================================
  // IDENTITÉ VISUELLE
  // ==========================================================

  /**
   * Retourne la couleur UI stable associée à J1...J5.
   */
  getPlayerColor(playerIndex: number): string {
    return getPlayerUiConfig(playerIndex).color;
  }
}
