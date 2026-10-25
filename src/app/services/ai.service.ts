
import { Injectable } from '@angular/core';

import {
  Direction,
  DIRECTIONS,
  PlacedTile,
} from '../models/tile';
import { Player } from '../models/player';
import { calculateTreasurePoints } from '../models/treasure';

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

/** Résultat d'une tentative de résolution obligatoire par l'IA. */
export type AiMandatoryResolutionResult =
  | 'resolved'
  | 'waiting'
  | `unsupported:${string}`
  | 'none';

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
   * Résout au plus une action obligatoire du joueur IA actif.
   *
   * Les règles et mutations restent dans GameService. Cette méthode
   * ne couvre volontairement que les coffres et les trésors ; les
   * autres résolutions sont signalées comme non prises en charge.
   */
  resolveMandatoryAction(): AiMandatoryResolutionResult {
    const player = this.gameService.activePlayer;
    if (!player || player.controller !== 'ai' || this.gameService.phase() !== 'playing') {
      return 'none';
    }
    const pendingXanrosAction = this.gameService.pendingXanrosSubstitutionAction();
    if (pendingXanrosAction?.player === player) {
      return this.resolveXanrosSubstitutionAction()
        ? 'resolved'
        : 'unsupported:xanros-substitution-action';
    }
    if (this.combatService.hasPendingCombat || this.combatService.lastCombatResult() !== null) {
      return 'waiting';
    }

    const pendingUnstoppable = this.gameService.pendingUnstoppableDecision();
    if (pendingUnstoppable?.player === player) {
      return this.resolveUnstoppableDecision() ? 'resolved' : 'unsupported:unstoppable-decision';
    }

    const pendingSneak = this.gameService.pendingSneakChoice();
    if (pendingSneak?.player === player) {
      return this.gameService.choosePendingSneak('combat') ? 'resolved' : 'unsupported:sneak-choice';
    }

    const pendingTokenChoice = this.gameService.pendingTokenChoice();
    if (pendingTokenChoice?.player === player) {
      // Choix déterministe : conserver le premier jeton tiré.
      return this.gameService.choosePendingToken(0) ? 'resolved' : 'unsupported:token-choice';
    }

    const pendingTreasure = this.gameService.pendingTreasure();
    if (pendingTreasure?.player === player) {
      return pendingTreasure.treasure.id === 'closed-chest'
        && player.inventory.key !== null
        && this.gameService.openPendingTreasure()
        ? 'resolved'
        : 'unsupported:chest-unavailable';
    }

    const pendingReward = this.gameService.pendingReward();
    if (pendingReward?.player === player) {
      const hasTreasureReward = pendingReward.remainingRewards.some(reward => reward.kind === 'treasure');
      if (hasTreasureReward) {
        return this.gameService.collectPendingTreasure()
          ? 'resolved'
          : 'unsupported:treasure-rejected';
      }

      const equipmentReward = pendingReward.remainingRewards.find(reward => reward.kind === 'equipment');
      if (equipmentReward?.kind === 'equipment') {
        if (this.gameService.resolvePendingRewardEquipment()) return 'resolved';

        // Une tuile occupée peut empêcher le dépôt ou l'échange. Résoudre
        // d'abord les autres éléments obligatoires de la récompense, puis
        // laisser l'équipement attaché au jeton pour une visite ultérieure.
        if (pendingReward.remainingRewards.some(reward => reward.kind === 'special' && reward.effect === 'curse')) {
          return this.resolvePendingCurseForAi(player);
        }
        return this.gameService.leavePendingReward()
          ? 'resolved'
          : 'unsupported:equipment-decision';
      }

      if (pendingReward.remainingRewards.some(reward => reward.kind === 'special' && reward.effect === 'curse')) {
        return this.resolvePendingCurseForAi(player);
      }

      return this.gameService.leavePendingReward()
        ? 'resolved'
        : 'unsupported:reward-decision';
    }

    const pendingGroundEquipment = this.gameService.pendingGroundEquipment();
    if (pendingGroundEquipment?.player === player) {
      return this.gameService.resolvePendingGroundEquipment()
        ? 'resolved'
        : 'unsupported:ground-equipment-decision';
    }

    return 'none';
  }

  /** Applique la décision post-lancer de l'IA sans résoudre le combat. */
  resolveMagicBoltDecision(): boolean {
    const player = this.gameService.activePlayer;
    const roll = this.combatService.pendingCombatRoll();
    const combat = this.combatService.pendingCombat();
    if (!player || player.controller !== 'ai' || !combat || combat.player !== player || !roll) {
      return false;
    }

    const required = Math.max(0, combat.monster.strength - roll.attackPower + 1);
    const available = this.combatService.getRemainingMagicBolts();
    if (required === 0 || required > available) return true;

    for (let index = 0; index < required; index++) {
      if (!this.combatService.useMagicBolt()) return false;
    }
    return true;
  }

  /** Relance les dés éligibles, au maximum une fois chacun, sans bloquer le combat. */
  resolveHeroRerollDecision(): boolean {
    let rerolled = false;
    while (this.resolveNextHeroRerollDecision()) {
      rerolled = true;
    }
    return rerolled;
  }

  /** Applique une seule relance IA et retourne le dé présenté à l'interface. */
  resolveNextHeroRerollDecision(): 'both' | 'die1' | 'die2' | null {
    const player = this.gameService.activePlayer;
    const combat = this.combatService.pendingCombat();
    const roll = this.combatService.pendingCombatRoll();
    if (!player || player.controller !== 'ai' || !combat || combat.player !== player || !roll) {
      return null;
    }
    if (roll.attackPower > combat.monster.strength) return null;

    const choice = this.combatService.getAvailableHeroRerolls()[0];
    return choice && this.combatService.useHeroReroll(choice) ? choice : null;
  }

  /** Choix déterministe de l'IA pour Inarrêtable. */
  resolveUnstoppableDecision(): boolean {
    const player = this.gameService.activePlayer;
    const pending = this.gameService.pendingUnstoppableDecision();
    if (!player || player.controller !== 'ai' || pending?.player !== player) return false;
    return this.gameService.acceptUnstoppableContinuation()
      || this.gameService.declineUnstoppableContinuation();
  }

/** Gere resolveXanrosSacrificeDecision et applique les gardes necessaires avant mutation. */
/** Gere resolveXanrosSacrificeDecision et applique les gardes necessaires avant mutation. */
  resolveXanrosSacrificeDecision(): boolean {
    const player = this.gameService.activePlayer;
    const combat = this.combatService.pendingCombat();
    const roll = this.combatService.pendingCombatRoll();
    if (!player || player.controller !== 'ai' || !combat || combat.player !== player || !roll) return false;
    const useful = roll.attackPower <= combat.monster.strength
      && roll.attackPower + 1 >= combat.monster.strength;
    return useful
      && this.combatService.canUseXanrosSacrifice()
      && this.combatService.useXanrosSacrifice();
  }

  /** Résout de façon déterministe l'éventuelle action autorisée après Substitution. */
  resolveXanrosSubstitutionAction(): boolean {
    const player = this.gameService.activePlayer;
    const pending = this.gameService.pendingXanrosSubstitutionAction();
    if (!player || player.controller !== 'ai' || pending?.player !== player) return false;

    if (this.gameService.getGroundEquipment(pending.tile).length > 0
      && this.gameService.offerGroundEquipmentAt(pending.tile, 0)) {
      return true;
    }

    if (pending.tile.tokenId === 'closed-chest'
      && player.inventory.key !== null
      && this.gameService.openXanrosSubstitutionChest(pending.tile)) {
      return true;
    }

    const fountain = this.gameService.getHealingFountains()[0];
    if (fountain
      && player.inventory.spells.some(spell => spell?.effect === 'healing-portal')
      && player.lives < 5
      && this.gameService.useHealingPortal(player, fountain)) {
      return true;
    }

    return this.gameService.finishXanrosSubstitutionAction();
  }

  /** Choisit puis délègue la résolution de la malédiction au moteur métier. */
  private resolvePendingCurseForAi(player: Player): AiMandatoryResolutionResult {
    const target = this.gameService.getPendingCurseTargets()
      .map((candidate, index) => ({ candidate, index }))
      .sort((left, right) => {
        const pointsDifference = calculateTreasurePoints(right.candidate.treasures)
          - calculateTreasurePoints(left.candidate.treasures);
        return pointsDifference || left.index - right.index;
      })[0]?.candidate;

    if (!target) return 'unsupported:curse-target';
    return this.gameService.resolvePendingCurse(target)
      ? 'resolved'
      : 'unsupported:curse-rejected';
  }

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
    if (this.gameService.pendingXanrosSubstitutionAction()?.player === player) {
      return this.resolveXanrosSubstitutionAction();
    }
    if (!this.gameService.canPerformNormalMovement(player) && player.recoveryState !== 'resting') {
      return false;
    }
    if (player.recoveryState === 'resting') {
      this.gameService.endTurn();
      return false;
    }

    if (this.gameService.canUseHealingFountain && this.gameService.useHealingFountain()) return true;

    // Choix déterministe : l'IA soigne son propre héros dès que le portail
    // est utilisable, en privilégiant la première fontaine découverte.
    if (player.inventory.spells.some(spell => spell?.effect === 'healing-portal')) {
      const fountain = this.gameService.getHealingFountains()[0];
      if (fountain && player.lives < 5 && this.gameService.useHealingPortal(player, fountain)) return true;
    }

    if (this.gameService.canUseXanrosSubstitution) {
      const target = this.gameService.xanrosSubstitutionTargets[0];
      if (target) {
        this.gameService.openXanrosSubstitution();
        return this.gameService.confirmXanrosSubstitution(target);
      }
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

    // Le voyage entre portails est une action de déplacement : l’IA
    // choisit la première destination disponible de façon déterministe.
    if (this.gameService.canUsePortalTravel(player)) {
      if (this.gameService.openPortalTravelSelection()) {
        return this.gameService.confirmPortalTravel();
      }
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
      if (this.canMoveTo(tile, direction)) {
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

  /** Argentus peut franchir une séparation entre deux tuiles découvertes. */
  private canMoveTo(tile: PlacedTile, direction: Direction): boolean {
    const destination = this.dungeonService.getNeighbor(tile, direction);
    return this.gameService.canMoveTo(this.gameService.activePlayer, tile, destination ?? null);
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
    if (!this.canMoveTo(currentTile, direction)) {
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

    if (!this.gameService.canPerformNormalMovementTo(player, destination.x, destination.y)) {
      return false;
    }

    this.playerService.movePlayerTo(
      player,
      destination.x,
      destination.y,
      direction,
    );

    this.restorePlayerFacing(player);
    this.turnService.consumeMovement();
    this.gameService.recordAstralWalkIfUsed(player, currentTile, destinationTile);

    this.gameService.resolveTileEntry(
      player,
      currentTile,
      destinationTile,
      false,
      true,
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

    this.explorationService.start(currentTile);

    if (!this.explorationService.pendingTile) {
      return false;
    }

    this.explorationService.changePendingDirection(direction);

    if (this.explorationService.pendingTile.direction !== direction) {
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
    this.turnService.consumeMovement();

    /**
     * true indique que la salle vient d'être
     * explorée et que son contenu doit être révélé.
     */
    this.gameService.resolveTileEntry(
      player,
      currentTile,
      placedTile,
      true,
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
