import { Routes } from '@angular/router';
import { AiService } from './services/ai.service';
import { CombatService } from './services/combat.service';
import { DungeonService } from './services/dungeon.service';
import { ExplorationService } from './services/exploration.service';
import { GameService } from './services/game.service';
import { PlayerService } from './services/player.service';
import { TileDeckService } from './services/tile-deck.service';
import { TokenBagService } from './services/token-bag.service';
import { TurnService } from './services/turn.service';
import { TutorialScenarioService } from './services/tutorial-scenario.service';
import { TutorialSessionService } from './services/tutorial-session.service';

/**
 * Routes principales de l'application.
 *
 * L'application est actuellement organisée autour de trois
 * espaces indépendants :
 *
 * - accueil ;
 * - partie ;
 * - consultation des règles.
 */
export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home').then(({ Home }) => Home),
  },
  {
    path: 'game',
    loadComponent: () => import('./pages/entry/entry').then(({ Entry }) => Entry),
  },
  {
    path: 'play',
    loadComponent: () => import('./pages/game/game').then(({ Game }) => Game),
  },
  {
    path: 'tutorial',
    loadComponent: () => import('./pages/tutorial/tutorial').then(({ Tutorial }) => Tutorial),
    providers: [
      AiService,
      CombatService,
      DungeonService,
      ExplorationService,
      GameService,
      PlayerService,
      TileDeckService,
      TokenBagService,
      TurnService,
      TutorialScenarioService,
      TutorialSessionService,
    ],
  },
  {
    path: 'rules',
    redirectTo: 'codex',
    pathMatch: 'full',
  },
  {
    path: 'codex',
    loadComponent: () => import('./pages/codex/codex').then(({ Codex }) => Codex),
  },
  {
    path: 'continuity-prototype',
    loadComponent: () => import('./components/board-continuity-prototype/board-continuity-prototype')
      .then(({ BoardContinuityPrototype }) => BoardContinuityPrototype),
  },
];
