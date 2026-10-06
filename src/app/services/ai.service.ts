import { Injectable } from '@angular/core';

import { Direction, DIRECTIONS, PlacedTile } from '../models/tile';
import { Player } from '../models/player';

import { DungeonService } from './dungeon.service';
import { ExplorationService } from './exploration.service';
import { GameService } from './game.service';
import { CombatService } from './combat.service';
import { PlayerService } from './player.service';
import { TurnService } from './turn.service';

/**
 * Action élémentaire qu'une IA peut actuellement effectuer.
 *
 * Cette première version distingue uniquement :
 *
 * - move    : déplacement vers une tuile déjà présente ;
 * - explore : exploration d'un secteur encore inconnu.
 *
 * Les combats, coffres, soins et capacités des héros seront
 * ajoutés ultérieurement comme nouvelles décisions possibles.
 */
interface AiAction {
  direction: Direction;
  type: 'move' | 'explore';
}

/**
 * Gère les décisions et actions des joueurs contrôlés par l'IA.
 *
 * ==========================================================
 * RESPONSABILITÉS
 * ==========================================================
 *
 * AiService :
 *
 * - vérifie que le joueur actif est bien une IA ;
 * - analyse les directions accessibles ;
 * - choisit une action parmi celles disponibles ;
 * - exécute un déplacement existant ;
 * - exécute une exploration ;
 * - oriente automatiquement une tuile explorée ;
 * - consomme les mouvements utilisés ;
 * - termine le tour lorsqu'aucune action n'est possible
 *   ou lorsque tous les mouvements ont été consommés.
 *
 * ==========================================================
 * IMPORTANT
 * ==========================================================
 *
 * AiService ne possède pas de copie des règles du moteur.
 *
 * Il s'appuie sur :
 *
 * DungeonService
 *   -> géométrie du donjon ;
 *
 * ExplorationService
 *   -> exploration et placement des nouvelles tuiles ;
 *
 * PlayerService
 *   -> position des joueurs ;
 *
 * TurnService
 *   -> mouvements disponibles ;
 *
 * GameService
 *   -> joueur actif et changement de tour.
 *
 * Cette séparation permettra plus tard d'améliorer la stratégie
 * de l'IA sans modifier les règles fondamentales du jeu.
 */
@Injectable({
  providedIn: 'root',
})
export class AiService {
  constructor(
    private readonly dungeonService: DungeonService,
    private readonly explorationService: ExplorationService,
    private readonly gameService: GameService,
    private readonly combatService: CombatService,
    private readonly playerService: PlayerService,
    private readonly turnService: TurnService,
  ) {}

  // ==========================================================
  // ACTION PRINCIPALE
  // ==========================================================

  /**
   * Joue une action pour l'IA actuellement active.
   *
   * Une invocation correspond au maximum à un déplacement.
   *
   * Cette granularité est volontaire :
   *
   * elle permet à l'interface d'animer chaque déplacement
   * séparément au lieu de faire jouer les quatre mouvements
   * de l'IA instantanément.
   *
   * Un combat obligatoire suspend immédiatement les décisions
   * de déplacement de l'IA jusqu'à sa résolution.
   *
   * @returns true lorsqu'une action a été effectuée.
   */
  playAction(): boolean {
    const player = this.gameService.activePlayer;

    /*
     * AiService ne doit jamais prendre le contrôle
     * d'un joueur humain.
     */
    if (!player || player.controller !== 'ai') {
      return false;
    }

    /*
     * Un combat obligatoire suspend toute nouvelle décision
     * de déplacement de l'IA.
     *
     * La résolution automatique du combat sera ajoutée
     * dans la prochaine tranche.
     */
    if (this.combatService.hasPendingCombat) {
      return false;
    }

    /*
     * Lorsque tous les mouvements ont été consommés
     * et qu'aucune résolution obligatoire n'est en attente,
     * le tour est terminé.
     */
    if (!this.turnService.canMove) {
      this.gameService.endTurn();

      return false;
    }

    const currentTile = this.getPlayerTile(player);

    /*
     * Un joueur sans position valide ne peut rien faire.
     *
     * On termine son tour afin d'éviter de bloquer
     * définitivement la partie.
     */
    if (!currentTile) {
      this.gameService.endTurn();

      return false;
    }

    const actions = this.getAvailableActions(currentTile);

    /*
     * Aucun passage utilisable :
     *
     * l'IA ne possède actuellement aucune autre action.
     * Son tour se termine donc immédiatement.
     */
    if (actions.length === 0) {
      this.gameService.endTurn();

      return false;
    }

    const action = this.chooseAction(actions);

    let actionPerformed = false;

    if (action.type === 'move') {
      actionPerformed = this.performMove(player, currentTile, action.direction);
    } else {
      actionPerformed = this.performExploration(player, currentTile, action.direction);
    }

    /*
     * Une action réussie consomme exactement
     * un mouvement.
     */
    if (actionPerformed) {
      this.turnService.consumeMovement();
    }

    /*
     * Après l'action, le quatrième mouvement ne transmet
     * la main que lorsqu'aucun combat obligatoire
     * n'attend encore sa résolution.
     *
     * Cas important :
     *
     * si le quatrième mouvement révèle un monstre,
     * remainingMovements atteint bien zéro mais le joueur
     * actif reste l'IA jusqu'à la résolution du combat.
     */
    if (!this.turnService.canMove && !this.combatService.hasPendingCombat) {
      this.gameService.endTurn();
    }

    return actionPerformed;
  }

  // ==========================================================
  // ANALYSE DES ACTIONS
  // ==========================================================

  /**
   * Retourne toutes les actions actuellement possibles
   * depuis la tuile occupée par l'IA.
   *
   * Une direction peut correspondre :
   *
   * - à un déplacement vers une tuile existante ;
   * - à l'exploration d'une sortie encore inconnue.
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
   * Choisit une action parmi celles disponibles.
   *
   * PREMIÈRE VERSION :
   *
   * le choix est volontairement aléatoire.
   *
   * L'objectif actuel n'est pas encore de créer une IA
   * intelligente, mais de valider son intégration au moteur.
   *
   * Cette méthode deviendra plus tard le point central
   * de la stratégie :
   *
   * - privilégier l'exploration ;
   * - rechercher des coffres ;
   * - éviter certains monstres ;
   * - chercher une fontaine ;
   * - exploiter les capacités du héros ;
   * - etc.
   */
  private chooseAction(actions: AiAction[]): AiAction {
    const randomIndex = Math.floor(Math.random() * actions.length);

    return actions[randomIndex];
  }

  // ==========================================================
  // DÉPLACEMENT
  // ==========================================================

  /**
   * Replace le pion face au joueur après avoir brièvement
   * affiché la direction de son déplacement.
   *
   * Le délai est identique à celui utilisé pour les joueurs
   * humains sur le plateau.
   */
  private restorePlayerFacing(player: Player): void {
    window.setTimeout(() => {
      this.playerService.facePlayer(player, 'south');
    }, 50);
  }

  /**
   * Déplace l'IA vers une tuile déjà présente
   * et correctement connectée.
   */
  private performMove(player: Player, currentTile: PlacedTile, direction: Direction): boolean {
    if (!this.dungeonService.canMoveTo(currentTile, direction)) {
      return false;
    }

    const destination = this.dungeonService.getNeighborPosition(currentTile, direction);

    this.playerService.movePlayerTo(player, destination.x, destination.y, direction);

    this.restorePlayerFacing(player);

    return true;
  }

  // ==========================================================
  // EXPLORATION
  // ==========================================================

  /**
   * Effectue automatiquement une exploration complète.
   *
   * Séquence :
   *
   * 1. déclenche l'exploration ;
   * 2. pioche une tuile via ExplorationService ;
   * 3. cherche une orientation valide ;
   * 4. confirme le placement ;
   * 5. déplace l'IA sur la nouvelle tuile.
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

    /*
     * start() peut échouer, notamment lorsque
     * la pioche ne contient plus de tuile.
     */
    if (!this.explorationService.pendingTile) {
      return false;
    }

    /*
     * Une tuile possède au maximum quatre orientations
     * distinctes : 0°, 90°, 180° et 270°.
     *
     * On cherche la première orientation permettant
     * l'entrée depuis la tuile source.
     */
    const orientationFound = this.findValidPendingTileRotation();

    if (!orientationFound) {
      /*
       * Avec les tuiles normales de Karak, une orientation
       * compatible devrait exister.
       *
       * Si ce n'est pas le cas, on refuse de poursuivre
       * plutôt que de placer une tuile invalide.
       */
      return false;
    }

    const placedTile = this.explorationService.confirmPlacement();

    if (!placedTile) {
      return false;
    }

    this.playerService.movePlayerTo(player, placedTile.x, placedTile.y, direction);
    this.restorePlayerFacing(player);

    /*
     * Comme pour un joueur humain, le contenu d'une salle
     * n'est révélé qu'après l'entrée effective du héros.
     */
    this.gameService.revealNewRoom(placedTile);

    /*
     * Une révélation de monstre impose immédiatement un combat.
     */
    this.combatService.startCombat(player, currentTile, placedTile);

    return true;
  }

  /**
   * Recherche automatiquement une orientation valide
   * pour la tuile actuellement en attente.
   *
   * L'orientation courante est testée avant toute rotation.
   *
   * Au maximum quatre orientations sont examinées.
   */
  private findValidPendingTileRotation(): boolean {
    for (let attempt = 0; attempt < 4; attempt++) {
      if (this.explorationService.isPendingTilePlacementValid()) {
        return true;
      }

      this.explorationService.rotatePendingTile();
    }

    return false;
  }

  // ==========================================================
  // POSITION DU JOUEUR
  // ==========================================================

  /**
   * Retrouve la tuile actuellement occupée
   * par le joueur demandé.
   */
  private getPlayerTile(player: Player): PlacedTile | undefined {
    const position = player.position;

    if (!position) {
      return undefined;
    }

    return this.dungeonService.getTileAt(position.x, position.y);
  }
}
