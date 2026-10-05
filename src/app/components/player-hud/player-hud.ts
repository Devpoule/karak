import { Component } from '@angular/core';

import { getPlayerUiConfig } from '../../constants/player-ui.constants';
import { Player } from '../../models/player';
import { GameService } from '../../services/game.service';
import { PlayerService } from '../../services/player.service';
import { MovementCounter } from '../movement-counter/movement-counter';
import { PlayerSidebar } from '../player-sidebar/player-sidebar';


/**
 * Représente un joueur secondaire accessible depuis les onglets
 * du panneau droit.
 *
 * `playerIndex` correspond à l'index réel du joueur dans
 * PlayerService.players :
 *
 * 0 = J1
 * 1 = J2
 * ...
 */
interface OpponentTab {
  player: Player;
  playerIndex: number;
}


/**
 * HUD principal de la partie.
 *
 * RÈGLE D'AFFICHAGE :
 *
 * - le panneau gauche représente toujours J1 ;
 * - le panneau droit représente J2, J3, J4 ou J5 ;
 * - lorsqu'il existe plusieurs joueurs secondaires, ils sont
 *   accessibles individuellement grâce aux onglets du panneau droit ;
 * - le joueur actif ne détermine pas quel panneau est affiché.
 *
 * L'identité d'un panneau et le joueur dont c'est le tour sont
 * volontairement deux notions différentes.
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
   * Index du joueur actuellement consulté dans le panneau droit.
   *
   * J2 est sélectionné par défaut.
   */
  selectedOpponentIndex = 1;


  /**
   * Les panneaux sont repliés au lancement afin de laisser
   * un maximum d'espace au donjon.
   */
  leftCollapsed = true;
  rightCollapsed = true;


  constructor(
    private readonly gameService: GameService,
    private readonly playerService: PlayerService,
  ) {}


  /**
   * J1 occupe toujours le panneau gauche.
   *
   * Le panneau ne suit donc jamais activePlayer.
   */
  get playerOne(): Player | null {
    return this.playerService.players[0] ?? null;
  }


  /**
   * Joueurs disponibles dans le panneau droit.
   *
   * J1 est volontairement exclu puisqu'il possède son propre
   * panneau permanent à gauche.
   */
  get opponents(): OpponentTab[] {
    return this.playerService.players
      .slice(1)
      .map((player, index) => ({
        player,
        playerIndex: index + 1,
      }));
  }


  /**
   * Joueur actuellement présenté dans le panneau droit.
   *
   * Si l'index sélectionné n'existe plus pour une raison quelconque,
   * le premier adversaire disponible est utilisé sans créer
   * de nouvel état métier.
   */
  get selectedOpponent(): Player | null {
    return (
      this.playerService.players[this.selectedOpponentIndex]
      ?? this.opponents[0]?.player
      ?? null
    );
  }


  /**
   * Index réellement représenté dans le panneau droit.
   *
   * Ce helper permet de garder l'onglet correct sélectionné même
   * lorsqu'un fallback vers le premier adversaire est nécessaire.
   */
  get displayedOpponentIndex(): number | null {
    if (this.playerService.players[this.selectedOpponentIndex]) {
      return this.selectedOpponentIndex;
    }

    return this.opponents[0]?.playerIndex ?? null;
  }


  /**
   * Index du joueur dont c'est actuellement le tour.
   *
   * Cette information sert uniquement à la mise en évidence visuelle.
   */
  get activePlayerIndex(): number | null {
    return this.gameService.activePlayerIndex();
  }


  /**
   * Sélectionne le joueur affiché dans le panneau droit.
   */
  selectOpponent(playerIndex: number): void {
    if (!this.playerService.players[playerIndex]) {
      return;
    }

    this.selectedOpponentIndex = playerIndex;

    /*
     * Cliquer sur un onglet constitue également une intention
     * explicite de consulter cette fiche.
     */
    this.rightCollapsed = false;
  }


  /**
   * Retourne la couleur UI stable associée à J1...J5.
   *
   * La configuration visuelle reste centralisée dans
   * player-ui.constants.ts et n'est jamais stockée dans Player.
   */
  getPlayerColor(playerIndex: number): string {
    return getPlayerUiConfig(playerIndex).color;
  }


  /**
   * Indique si le joueur correspondant joue actuellement.
   */
  isActivePlayer(playerIndex: number): boolean {
    return this.activePlayerIndex === playerIndex;
  }


  /**
   * Déplie ou replie le panneau de J1.
   */
  toggleLeft(): void {
    this.leftCollapsed = !this.leftCollapsed;
  }


  /**
   * Déplie ou replie le panneau des autres joueurs.
   */
  toggleRight(): void {
    this.rightCollapsed = !this.rightCollapsed;
  }
}
