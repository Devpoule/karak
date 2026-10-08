
import { Injectable } from '@angular/core';

import {
  Direction,
  DIRECTIONS,
  PlacedTile,
} from '../models/tile';
import { Player } from '../models/player';

import { DungeonService } from './dungeon.service';
import { ExplorationService } from './exploration.service';
import { GameService } from './game.service';
import { PlayerService } from './player.service';
import { TurnService } from './turn.service';
import { CombatService } from './combat.service';

/**
 * Action élémentaire disponible pour l'IA.
 */
interface AiAction {
  direction: Direction;
  type: 'move' | 'explore';
}

/**
 * Service de décision des joueurs IA.
 *
 * Chaque appel à playAction() exécute au maximum
 * une action de déplacement ou d'exploration.
 *
 * Le rythme des actions appartient à Game.
 * La présentation des combats appartient à CombatOverlay.
 */
@Injectable({
  providedIn: 'root',
})
export class AiService {

  constructor(
    private readonly dungeonService: DungeonService,
    private readonly explorationService: ExplorationService,
    private readonly gameService: GameService,
    private readonly playerService: PlayerService,
    private readonly turnService: TurnService,
    private readonly combatService: CombatService,
  ) {}

  // ==========================================================
  // ACTION PRINCIPALE
  // ==========================================================

  /**
   * Exécute au maximum une action pour le joueur IA actif.
   *
   * @returns true si un déplacement ou une exploration
   * a effectivement été réalisé.
   */
  playAction(): boolean {
    const player = this.gameService.activePlayer;

    if (!player || player.controller !== 'ai') {
      return false;
    }

    /**
     * Le combat est entièrement pris en charge
     * par CombatOverlay.
     *
     * Il ne faut ni lancer les dés ici,
     * ni terminer le tour.
     */
    if (
      this.combatService.hasPendingCombat
      || this.combatService.lastCombatResult() !== null
    ) {
      return false;
    }

    /**
     * Une autre résolution obligatoire
     * interdit les déplacements.
     */
    if (this.gameService.hasPendingTileResolution) {
      return false;
    }

    /**
     * Plus aucun mouvement disponible.
     */
    if (!this.turnService.canMove) {
      this.gameService.endTurn();
      return false;
    }

    const currentTile = this.getPlayerTile(player);

    if (!currentTile) {
      this.gameService.endTurn();
      return false;
    }

    const actions = this.getAvailableActions(currentTile);

    if (actions.length === 0) {
      this.gameService.endTurn();
      return false;
    }

    const action = this.chooseAction(actions);

    let actionPerformed = false;

    if (action.type === 'move') {
      actionPerformed = this.performMove(
        player,
        currentTile,
        action.direction,
      );
    } else {
      actionPerformed = this.performExploration(
        player,
        currentTile,
        action.direction,
      );
    }

    /**
     * Une action réussie consomme un mouvement.
     */
    if (actionPerformed) {
      this.turnService.consumeMovement();
    }

    /**
     * La fin du tour ne doit jamais interrompre
     * une résolution obligatoire.
     *
     * Un monstre découvert au quatrième mouvement
     * doit donc être combattu avant de changer de joueur.
     */
    if (
      !this.turnService.canMove
      && !this.gameService.hasPendingTileResolution
      && this.combatService.lastCombatResult() === null
    ) {
      this.gameService.endTurn();
    }

    return actionPerformed;
  }

  // ==========================================================
  // ANALYSE DES ACTIONS
  // ==========================================================

  /**
   * Retourne les déplacements et explorations
   * disponibles depuis la tuile courante.
   */
  private getAvailableActions(tile: PlacedTile): AiAction[] {
    const actions: AiAction[] = [];

    for (const direction of DIRECTIONS) {
      if (this.dungeonService.canMoveTo(tile, direction)) {
        actions.push({
          direction,
          type: 'move',
        });

        continue;
      }

      if (this.explorationService.canExplore(tile, direction)) {
        actions.push({
          direction,
          type: 'explore',
        });
      }
    }

    return actions;
  }

  // ==========================================================
  // CHOIX DE L'ACTION
  // ==========================================================

  /**
   * Choix aléatoire pour cette première version.
   *
   * Une stratégie plus avancée pourra être
   * introduite sans modifier les règles métier.
   */
  private chooseAction(actions: AiAction[]): AiAction {
    const randomIndex =
      Math.floor(Math.random() * actions.length);

    return actions[randomIndex];
  }

  // ==========================================================
  // ORIENTATION DU HÉROS
  // ==========================================================

  /**
   * Replace le pion face au joueur après
   * l'animation directionnelle.
   */
  private restorePlayerFacing(player: Player): void {
    window.setTimeout(() => {
      this.playerService.facePlayer(player, 'south');
    }, 450);
  }

  // ==========================================================
  // DÉPLACEMENT
  // ==========================================================

  /**
   * Déplace l'IA vers une tuile déjà présente.
   */
  private performMove(
    player: Player,
    currentTile: PlacedTile,
    direction: Direction,
  ): boolean {
    if (!this.dungeonService.canMoveTo(currentTile, direction)) {
      return false;
    }

    const destination =
      this.dungeonService.getNeighborPosition(
        currentTile,
        direction,
      );

    const destinationTile =
      this.dungeonService.getTileAt(
        destination.x,
        destination.y,
      );

    if (!destinationTile) {
      return false;
    }

    this.playerService.movePlayerTo(
      player,
      destination.x,
      destination.y,
      direction,
    );

    this.restorePlayerFacing(player);

    this.gameService.resolveTileEntry(
      player,
      currentTile,
      destinationTile,
    );

    return true;
  }

  // ==========================================================
  // EXPLORATION
  // ==========================================================

  /**
   * Réalise une exploration complète :
   *
   * - pioche ;
   * - recherche d'une rotation valide ;
   * - confirmation du placement ;
   * - déplacement ;
   * - résolution du contenu de la salle.
   */
  private performExploration(
    player: Player,
    currentTile: PlacedTile,
    direction: Direction,
  ): boolean {
    if (!this.explorationService.canExplore(currentTile, direction)) {
      return false;
    }

    this.explorationService.start(currentTile, direction);

    if (!this.explorationService.pendingTile) {
      return false;
    }

    const orientationFound =
      this.findValidPendingTileRotation();

    if (!orientationFound) {
      return false;
    }

    const placedTile =
      this.explorationService.confirmPlacement();

    if (!placedTile) {
      return false;
    }

    this.playerService.movePlayerTo(
      player,
      placedTile.x,
      placedTile.y,
      direction,
    );

    this.restorePlayerFacing(player);

    /**
     * true indique que la salle vient d'être
     * explorée et que son contenu doit être révélé.
     */
    this.gameService.resolveTileEntry(
      player,
      currentTile,
      placedTile,
      true,
    );

    return true;
  }

  /**
   * Cherche une orientation compatible
   * parmi les quatre rotations possibles.
   */
  private findValidPendingTileRotation(): boolean {
    for (let attempt = 0; attempt < 4; attempt++) {
      if (
        this.explorationService.isPendingTilePlacementValid()
      ) {
        return true;
      }

      this.explorationService.rotatePendingTile();
    }

    return false;
  }

  // ==========================================================
  // POSITION
  // ==========================================================

  /**
   * Retrouve la tuile occupée par le joueur.
   */
  private getPlayerTile(player: Player): PlacedTile | undefined {
    const position = player.position;

    if (!position) {
      return undefined;
    }

    return this.dungeonService.getTileAt(
      position.x,
      position.y,
    );
  }
}
