import { Injectable, computed, effect, signal } from '@angular/core';
import { TutorialHelpDefinition, TutorialObjectiveId } from '../data/tutorial-scenario';
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

  readonly objectives = signal<TutorialObjectives>(createObjectives());
  readonly activeHelp = signal<TutorialHelpDefinition | null>(null);
  readonly helpDisplay = signal<TutorialHelpDisplay>('expanded');
  readonly isComplete = signal(false);

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
      || this.gameService.hasPendingTileResolution
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
    this.activeHelp.set(null);
    this.isComplete.set(false);
    this.gameService.initialize();
    this.playerService.reset();
    this.sessionRevision.update(revision => revision + 1);
  }

  dismissActiveHelp(): void {
    const help = this.activeHelp();
    if (!help) return;
    this.dismissedHelpIds.add(help.id);
    this.activeHelp.set(null);
  }

  collapseHelp(): void {
    if (this.activeHelp()) this.helpDisplay.set('collapsed');
  }

  expandHelp(): void {
    if (this.activeHelp()) this.helpDisplay.set('expanded');
  }

  private updateFromGameState(): void {
    if (!this.initialized) return;

    if (this.turnService.lastMovementConsumption() !== null) {
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
    if (!objectives.movement) return 'move';
    if (!objectives.exploration) return 'explore';
    if (!objectives.combat) return 'combat';
    if (!objectives['west-branch'] || !objectives['east-branch']) return 'branches';
    if (!objectives.portal) return 'portal';
    if (!objectives.exit) return 'exit';
    return null;
  }
}

