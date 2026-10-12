import { Routes } from '@angular/router';

import { Home } from './pages/home/home';
import { Game } from './pages/game/game';
import { Codex } from './pages/codex/codex';
import { Entry } from './pages/entry/entry';


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
    component: Home,
  },
  {
    path: 'game',
    component: Entry,
  },
  {
    path: 'play',
    component: Game,
  },
  {
    path: 'rules',
    redirectTo: 'codex',
    pathMatch: 'full',
  },
  {
    path: 'codex',
    component: Codex,
  },
];
