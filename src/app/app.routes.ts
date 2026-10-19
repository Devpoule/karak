import { Routes } from '@angular/router';

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
