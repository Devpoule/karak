import { Injectable, computed, effect, signal } from '@angular/core';
import { TutorialGuidanceStep, TutorialHelpDefinition, TutorialObjectiveId } from '../data/tutorial-scenario';
import { DIRECTIONS } from '../models/tile';
import { CombatService } from './combat.service';
import { DungeonService } from './dungeon.service';
import { ExplorationService } from './exploration.service';
import { GameService } from './game.service';
import { PlayerService } from './player.service';
import { TurnService } from './turn.service';
import { TutorialScenarioService } from './tutorial-scenario.service';

type TutorialObjectives = Record<TutorialObjectiveId, boolean>;
type TutorialHelpDisplay = 'expanded' | 'collapsed';

const OBJECTIVE_IDS: readonly TutorialObjectiveId[] = [
  'movement',
  'exploration',
  'combat',
  'west-branch',
  'east-branch',
  'portal',
  'exit',
];

function createObjectives(): TutorialObjectives {
  return {
    movement: false,
    exploration: false,
    combat: false,
    'west-branch': false,
    'east-branch': false,
    portal: false,
    exit: false,
  };
}

/**
 * Orchestration locale au didacticiel : elle observe les vraies transitions
 * métier, sans créer d'alternative au moteur de jeu.
 */
@Injectable()
export class TutorialSessionService {
  private initialized = false;
  private readonly visitedLocationIds = new Set<string>();
  private readonly dismissedHelpIds = new Set<string>();
  private readonly sessionRevision = signal(0);
  private observedPendingTileKey: string | null = null;
  private observedPendingRotation = 0;
  private pendingTileWasRotated = false;

  readonly objectives = signal<TutorialObjectives>(createObjectives());
  readonly activeHelp = signal<TutorialHelpDefinition | null>(null);
  readonly helpDisplay = signal<TutorialHelpDisplay>('expanded');
  readonly isComplete = signal(false);

  /** Étape visuelle actuelle, dérivée des possibilités réelles du moteur. */
  readonly guidanceStep = computed<TutorialGuidanceStep | null>(() => {
    this.explorationService.pendingTileRevision();
    if (this.helpSuspended()) return null;

    const objectives = this.objectives();
    const pending = this.explorationService.pendingTile;
    if (!objectives.movement) {
      if (pending) {
        if (!pending.direction) return 'explore-direction';
        return this.pendingTileWasRotated || pending.rotation !== 0 ? 'explore-confirm' : 'explore-rotate';
      }
      return this.hasAvailableExistingMovement() ? 'movement' : 'explore-direction';
    }
    if (!objectives.exploration) {
      if (!pending || !pending.direction) return 'explore-direction';
      return this.pendingTileWasRotated || pending.rotation !== 0 ? 'explore-confirm' : 'explore-rotate';
    }
    if (!objectives.combat) return 'combat';
    if (!objectives['west-branch'] || !objectives['east-branch']) return 'branches';
    if (!objectives.portal) return 'portal';
    if (!objectives.exit) return 'exit';
    return null;
  });

  readonly completedObjectiveCount = computed(() =>
    OBJECTIVE_IDS.filter(objective => this.objectives()[objective]).length,
  );

  readonly totalObjectiveCount = OBJECTIVE_IDS.length;

  readonly helpSuspended = computed(() => {
    this.sessionRevision();
    return !this.initialized
      || this.isComplete()
      || this.combatService.pendingCombat() !== null
      || this.combatService.lastCombatResult() !== null
      || this.gameService.portalTravelSelection() !== null
      || this.gameService.healingPortalSelection() !== null;
  });

  constructor(
    private readonly gameService: GameService,
    private readonly playerService: PlayerService,
    private readonly explorationService: ExplorationService,
    private readonly dungeonService: DungeonService,
    private readonly turnService: TurnService,
    private readonly combatService: CombatService,
    private readonly scenario: TutorialScenarioService,
  ) {
    effect(() => {
      this.sessionRevision();
      this.turnService.lastMovementConsumption();
      this.explorationService.placementRevision();
      this.explorationService.pendingTileRevision();
      this.combatService.pendingCombat();
      this.combatService.lastCombatResult();
      this.gameService.portalTravelRevision();
      this.gameService.portalTravelSelection();
      this.gameService.activePlayerIndex();
      this.updateFromGameState();
    });
  }

  /** Initialise une nouvelle session sans consulter ni modifier les sauvegardes normales. */
  initialize(): void {
    this.initialized = false;
    this.visitedLocationIds.clear();
    this.dismissedHelpIds.clear();
    this.observedPendingTileKey = null;
    this.observedPendingRotation = 0;
    this.pendingTileWasRotated = false;
    this.objectives.set(createObjectives());
    this.activeHelp.set(null);
    this.helpDisplay.set('expanded');
    this.isComplete.set(false);

    this.gameService.initialize();
    this.playerService.initializeTutorialPlayer(this.scenario.heroId);
    this.gameService.startPreparedAdventure();
    this.initialized = true;
    this.sessionRevision.update(revision => revision + 1);
    this.updateFromGameState();
  }

  /** Efface explicitement l'état de la session route-scopée. */
  reset(): void {
    this.initialized = false;
    this.visitedLocationIds.clear();
    this.dismissedHelpIds.clear();
    this.observedPendingTileKey = null;
    this.observedPendingRotation = 0;
    this.pendingTileWasRotated = false;
    this.activeHelp.set(null);
    this.isComplete.set(false);
    this.gameService.initialize();
    this.playerService.reset();
    this.sessionRevision.update(revision => revision + 1);
  }

  /** Ferme l'aide courante pour la session sans modifier les objectifs. */
  dismissActiveHelp(): void {
    const help = this.activeHelp();
    if (!help) return;
    this.dismissedHelpIds.add(help.id);
    this.activeHelp.set(null);
  }

  /** Rend l'aide courante disponible à nouveau, sans réinitialiser la progression. */
  reopenHelp(): void {
    const helpId = this.getRelevantHelpId();
    if (!helpId) return;
    this.dismissedHelpIds.delete(helpId);
    const help = this.scenario.helpDefinitions.find(candidate => candidate.id === helpId);
    if (!help) return;
    this.activeHelp.set(help);
    this.helpDisplay.set('expanded');
  }

  /** Réduit l'aide courante ; la check-list reste indépendante de ce choix. */
  collapseHelp(): void {
    if (this.activeHelp()) this.helpDisplay.set('collapsed');
  }

  /** Réaffiche l'aide courante sans recalculer la progression. */
  expandHelp(): void {
    if (this.activeHelp()) this.helpDisplay.set('expanded');
  }

  private updateFromGameState(): void {
    if (!this.initialized) return;

    this.observePendingTileRotation();

    if (this.turnService.lastMovementConsumption() !== null && this.wasDirectMovement()) {
      this.completeObjective('movement');
    }
    if (this.explorationService.lastPlacedTile() !== null) {
      this.completeObjective('exploration');
    }
    if (this.combatService.lastCombatResult() !== null) {
      this.completeObjective('combat');
    }
    if (this.gameService.portalTravelRevision() > 0) {
      this.completeObjective('portal');
    }

    const player = this.gameService.activePlayer;
    if (player?.position) {
      const tile = this.dungeonService.getTileAt(player.position.x, player.position.y);
      if (tile) {
        const locationId = this.scenario.getLocationId(tile);
        if (locationId) this.visitedLocationIds.add(locationId);
      }
    }

    if (this.scenarioRequiredLocationsVisited('west')) {
      this.completeObjective('west-branch');
    }
    if (this.scenarioRequiredLocationsVisited('east')) {
      this.completeObjective('east-branch');
    }

    const objectives = this.objectives();
    const readyForExit = OBJECTIVE_IDS
      .filter(objective => objective !== 'exit')
      .every(objective => objectives[objective]);
    if (readyForExit && player?.position && player.position.x === this.scenario.exit.x && player.position.y === this.scenario.exit.y) {
      this.completeObjective('exit');
    }

    const complete = OBJECTIVE_IDS.every(objective => this.objectives()[objective])
      && !this.hasPendingResolution();
    this.isComplete.set(complete);
    this.updateActiveHelp();
  }

  private scenarioRequiredLocationsVisited(branch: 'west' | 'east'): boolean {
    const locations = branch === 'west'
      ? this.scenario.requiredWestLocationIds
      : this.scenario.requiredEastLocationIds;
    return locations.every(location => this.visitedLocationIds.has(location));
  }

  private hasPendingResolution(): boolean {
    return this.explorationService.pendingTile !== null
      || this.gameService.hasPendingTileResolution
      || this.gameService.portalTravelSelection() !== null
      || this.combatService.pendingCombat() !== null
      || this.combatService.lastCombatResult() !== null;
  }

  private completeObjective(objective: TutorialObjectiveId): void {
    if (this.objectives()[objective]) return;
    this.objectives.update(current => ({ ...current, [objective]: true }));
  }

  private updateActiveHelp(): void {
    if (this.isComplete()) {
      this.activeHelp.set(null);
      return;
    }

    const nextHelpId = this.getRelevantHelpId();
    const nextHelp = nextHelpId
      ? this.scenario.helpDefinitions.find(help => help.id === nextHelpId) ?? null
      : null;
    if (!nextHelp || this.dismissedHelpIds.has(nextHelp.id)) {
      this.activeHelp.set(null);
      return;
    }

    if (this.activeHelp()?.id !== nextHelp.id) {
      this.activeHelp.set(nextHelp);
      this.helpDisplay.set(nextHelp.display);
    }
  }

  private getRelevantHelpId(): string | null {
    const objectives = this.objectives();
    if (!objectives.movement) {
      const pending = this.explorationService.pendingTile;
      if (pending) {
        if (!pending.direction) return 'explore-direction';
        return this.pendingTileWasRotated || pending.rotation !== 0 ? 'explore-confirm' : 'explore-rotate';
      }
      return this.hasAvailableExistingMovement() ? 'move' : 'explore-direction';
    }
    if (!objectives.exploration) {
      const pending = this.explorationService.pendingTile;
      if (!pending || !pending.direction) return 'explore-direction';
        return this.pendingTileWasRotated || pending.rotation !== 0 ? 'explore-confirm' : 'explore-rotate';
    }
    if (!objectives.combat) return 'combat';
    if (!objectives['west-branch'] || !objectives['east-branch']) return 'branches';
    if (!objectives.portal) return 'portal';
    if (!objectives.exit) return 'exit';
    return null;
  }

  /** Observe uniquement la rotation effective, sans intervenir dans le moteur. */
  private observePendingTileRotation(): void {
    const pending = this.explorationService.pendingTile;
    if (!pending) {
      this.observedPendingTileKey = null;
      this.pendingTileWasRotated = false;
      return;
    }

    const key = `${pending.sourceTile.x}:${pending.sourceTile.y}:${pending.definition.id}`;
    if (key !== this.observedPendingTileKey) {
      this.observedPendingTileKey = key;
      this.observedPendingRotation = pending.rotation;
      this.pendingTileWasRotated = false;
      return;
    }

    if (pending.rotation !== this.observedPendingRotation) {
      this.observedPendingRotation = pending.rotation;
      this.pendingTileWasRotated = true;
    }
  }

  /** Détermine si une tuile existante offre réellement un déplacement légal. */
  private hasAvailableExistingMovement(): boolean {
    const player = this.gameService.activePlayer;
    if (!player?.position || !this.gameService.canPerformNormalMovement(player)) return false;

    const source = this.dungeonService.getTileAt(player.position.x, player.position.y);
    if (!source) return false;
    return DIRECTIONS.some(direction => {
      const destination = this.dungeonService.getNeighbor(source, direction);
      return !!destination && this.gameService.canMoveTo(player, source, destination);
    });
  }

  /** Une entrée sur une tuile nouvellement placée ne valide pas encore le déplacement pédagogique. */
  private wasDirectMovement(): boolean {
    const player = this.gameService.activePlayer;
    const placed = this.explorationService.lastPlacedTile();
    return !placed
      || !player?.position
      || player.position.x !== placed.x
      || player.position.y !== placed.y;
  }
}

