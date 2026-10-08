import { Component, effect } from '@angular/core';

import { getPlayerUiConfig } from '../../constants/player-ui.constants';
import { Player } from '../../models/player';
import { GameService } from '../../services/game.service';
import { PlayerService } from '../../services/player.service';
import { MovementCounter } from '../movement-counter/movement-counter';
import { PlayerSidebar } from '../player-sidebar/player-sidebar';

/**
 * Association entre un joueur et son index réel dans la partie.
 *
 * L'index est conservé lorsque les joueurs sont séparés
 * entre humains et IA afin de préserver leur identité J1...J5.
 */
interface HudPlayerEntry {
  player: Player;
  index: number;
}

/**
 * HUD principal de la partie.
 *
 * ORGANISATION :
 *
 * - les joueurs humains sont affichés à gauche du compteur ;
 * - les joueurs IA sont affichés à droite ;
 * - un joueur humain ouvre sa fiche à gauche ;
 * - un joueur IA ouvre sa fiche à droite ;
 * - les deux côtés fonctionnent indépendamment ;
 * - consulter une fiche ne modifie jamais le joueur actif.
 *
 * TRANSITION ENTRE DEUX JOUEURS DU MÊME CÔTÉ :
 *
 * Si une fiche est déjà ouverte et qu'un autre joueur du même
 * côté est sélectionné :
 *
 * 1. la fiche actuelle se replie complètement ;
 * 2. son contenu est remplacé ;
 * 3. la nouvelle fiche se déplie.
 *
 * Le changement est synchronisé avec la transition CSS réelle
 * grâce à transitionend. Aucun délai artificiel n'est utilisé.
 */
@Component({
  selector: 'app-player-hud',
  imports: [PlayerSidebar, MovementCounter],
  templateUrl: './player-hud.html',
  styleUrl: './player-hud.scss',
})
export class PlayerHud {
  // ==========================================================
  // PANNEAU GAUCHE — JOUEURS HUMAINS
  // ==========================================================

  /**
   * État d'ouverture du panneau gauche.
   */
  leftPanelOpen = false;

  /**
   * Joueur actuellement mémorisé dans le panneau gauche.
   *
   * J1 est utilisé comme valeur initiale.
   */
  leftPlayerIndex = 0;

  /**
   * Joueur devant remplacer le contenu du panneau gauche
   * une fois son animation de fermeture terminée.
   *
   * null signifie qu'aucun changement n'est en attente.
   */
  private pendingLeftPlayerIndex: number | null = null;

  // ==========================================================
  // PANNEAU DROIT — JOUEURS IA
  // ==========================================================

  /**
   * État d'ouverture du panneau droit.
   */
  rightPanelOpen = false;

  /**
   * Joueur actuellement mémorisé dans le panneau droit.
   *
   * J2 est utilisé comme valeur initiale historique.
   * La présence réelle du joueur est toujours vérifiée
   * avant affichage.
   */
  rightPlayerIndex = 1;

  /**
   * Joueur devant remplacer le contenu du panneau droit
   * une fois son animation de fermeture terminée.
   */
  private pendingRightPlayerIndex: number | null = null;

  /** Empêche une ouverture différée de rétablir un ancien tour. */
  private activeTurnSequence = 0;

  constructor(
    private readonly gameService: GameService,
    private readonly playerService: PlayerService,
  ) {
    effect(() => {
      const playerIndex = this.gameService.activePlayerIndex();
      const sequence = ++this.activeTurnSequence;

      // L'effet observe uniquement le joueur actif. Les panneaux sont
      // synchronisés après la mise à jour de l'état de la partie.
      queueMicrotask(() => {
        if (sequence !== this.activeTurnSequence || playerIndex === null) {
          return;
        }

        this.showActivePlayerPanel(playerIndex);
      });
    });
  }

  /**
   * Ouvre la fiche du joueur actif et replie le panneau opposé.
   * Les changements de fiche sur un même côté respectent transitionend.
   */
  private showActivePlayerPanel(playerIndex: number): void {
    const player = this.players[playerIndex];

    if (!player) {
      return;
    }

    if (player.controller === 'human') {
      this.pendingRightPlayerIndex = null;
      this.rightPanelOpen = false;
      this.openLeftPlayer(playerIndex);
    } else {
      this.pendingLeftPlayerIndex = null;
      this.leftPanelOpen = false;
      this.openRightPlayer(playerIndex);
    }
  }

  private openLeftPlayer(playerIndex: number): void {
    if (this.leftPlayerIndex === playerIndex) {
      this.pendingLeftPlayerIndex = null;
      this.leftPanelOpen = true;
    } else if (this.leftPanelOpen) {
      this.pendingLeftPlayerIndex = playerIndex;
      this.leftPanelOpen = false;
    } else {
      this.pendingLeftPlayerIndex = null;
      this.leftPlayerIndex = playerIndex;
      this.leftPanelOpen = true;
    }
  }

  private openRightPlayer(playerIndex: number): void {
    if (this.rightPlayerIndex === playerIndex) {
      this.pendingRightPlayerIndex = null;
      this.rightPanelOpen = true;
    } else if (this.rightPanelOpen) {
      this.pendingRightPlayerIndex = playerIndex;
      this.rightPanelOpen = false;
    } else {
      this.pendingRightPlayerIndex = null;
      this.rightPlayerIndex = playerIndex;
      this.rightPanelOpen = true;
    }
  }

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
   * Joueur actuellement associé au panneau gauche.
   */
  get leftPlayer(): Player | null {
    return this.players[this.leftPlayerIndex] ?? null;
  }

  /**
   * Joueur actuellement associé au panneau droit.
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
  // RÉPARTITION HUMAINS / IA
  // ==========================================================

  /**
   * Joueurs humains.
   *
   * Ils sont affichés à gauche du compteur et utilisent
   * exclusivement le panneau gauche.
   */
  get humanPlayers(): HudPlayerEntry[] {
    return this.players
      .map((player, index) => ({
        player,
        index,
      }))
      .filter(({ player }) => player.controller === 'human');
  }

  /**
   * Joueurs IA.
   *
   * Ils sont affichés à droite du compteur et utilisent
   * exclusivement le panneau droit.
   */
  get aiPlayers(): HudPlayerEntry[] {
    return this.players
      .map((player, index) => ({
        player,
        index,
      }))
      .filter(({ player }) => player.controller === 'ai');
  }

  // ==========================================================
  // SÉLECTION D'UNE FICHE
  // ==========================================================

  /**
   * Ouvre ou ferme la fiche du joueur demandé.
   *
   * Le contrôleur du joueur détermine automatiquement
   * le côté utilisé :
   *
   * - human -> gauche ;
   * - ai    -> droite.
   */
  togglePlayerPanel(playerIndex: number): void {
    const player = this.players[playerIndex];

    if (!player) {
      return;
    }

    if (player.controller === 'human') {
      this.toggleLeftPlayer(playerIndex);
      return;
    }

    this.toggleRightPlayer(playerIndex);
  }

  // ==========================================================
  // PANNEAU GAUCHE
  // ==========================================================

  /**
   * Gère l'ouverture d'un joueur humain.
   *
   * Même joueur :
   * -> ouverture / fermeture normale.
   *
   * Autre joueur, panneau fermé :
   * -> remplacement immédiat puis ouverture.
   *
   * Autre joueur, panneau ouvert :
   * -> mémorisation du prochain joueur puis fermeture.
   *    Le nouveau joueur sera affiché après transitionend.
   */
  private toggleLeftPlayer(playerIndex: number): void {
    if (!this.isHumanPlayer(playerIndex)) {
      return;
    }

    if (this.leftPanelOpen && this.leftPlayerIndex === playerIndex) {
      this.pendingLeftPlayerIndex = null;
      this.leftPanelOpen = false;
      return;
    }

    if (!this.leftPanelOpen) {
      this.pendingLeftPlayerIndex = null;
      this.leftPlayerIndex = playerIndex;
      this.leftPanelOpen = true;
      return;
    }

    this.pendingLeftPlayerIndex = playerIndex;
    this.leftPanelOpen = false;
  }

  /**
   * Appelé lorsque la transition du panneau gauche se termine.
   *
   * Si un autre joueur attend d'être affiché :
   *
   * - le contenu est remplacé ;
   * - le panneau est ensuite rouvert.
   */
  onLeftPanelTransitionEnd(event: TransitionEvent): void {
    if (
      event.propertyName !== 'transform' ||
      this.leftPanelOpen ||
      this.pendingLeftPlayerIndex === null
    ) {
      return;
    }

    this.leftPlayerIndex = this.pendingLeftPlayerIndex;
    this.pendingLeftPlayerIndex = null;

    this.leftPanelOpen = true;
  }

  // ==========================================================
  // PANNEAU DROIT
  // ==========================================================

  /**
   * Gère l'ouverture d'un joueur IA.
   *
   * Le comportement est identique au panneau gauche :
   * lorsqu'une autre IA est sélectionnée, la fiche actuelle
   * se replie avant que la suivante ne se déplie.
   */
  private toggleRightPlayer(playerIndex: number): void {
    if (!this.isAiPlayer(playerIndex)) {
      return;
    }

    if (this.rightPanelOpen && this.rightPlayerIndex === playerIndex) {
      this.pendingRightPlayerIndex = null;
      this.rightPanelOpen = false;
      return;
    }

    if (!this.rightPanelOpen) {
      this.pendingRightPlayerIndex = null;
      this.rightPlayerIndex = playerIndex;
      this.rightPanelOpen = true;
      return;
    }

    this.pendingRightPlayerIndex = playerIndex;
    this.rightPanelOpen = false;
  }

  /**
   * Appelé lorsque la transition du panneau droit se termine.
   *
   * Le nouveau joueur n'est injecté dans le panneau qu'après
   * le repli complet de la fiche précédente.
   */
  onRightPanelTransitionEnd(event: TransitionEvent): void {
    if (
      event.propertyName !== 'transform' ||
      this.rightPanelOpen ||
      this.pendingRightPlayerIndex === null
    ) {
      return;
    }

    this.rightPlayerIndex = this.pendingRightPlayerIndex;
    this.pendingRightPlayerIndex = null;

    this.rightPanelOpen = true;
  }

  // ==========================================================
  // ÉTAT DES FICHES
  // ==========================================================

  /**
   * Indique si la fiche du joueur demandé est actuellement
   * ouverte.
   */
  isPlayerPanelOpen(playerIndex: number): boolean {
    const player = this.players[playerIndex];

    if (!player) {
      return false;
    }

    if (player.controller === 'human') {
      return this.leftPanelOpen && this.leftPlayerIndex === playerIndex;
    }

    return this.rightPanelOpen && this.rightPlayerIndex === playerIndex;
  }

  // ==========================================================
  // TYPE DE JOUEUR
  // ==========================================================

  /**
   * Vérifie que le joueur demandé existe et est humain.
   */
  private isHumanPlayer(playerIndex: number): boolean {
    return this.players[playerIndex]?.controller === 'human';
  }

  /**
   * Vérifie que le joueur demandé existe et est contrôlé
   * par l'IA.
   */
  private isAiPlayer(playerIndex: number): boolean {
    return this.players[playerIndex]?.controller === 'ai';
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
