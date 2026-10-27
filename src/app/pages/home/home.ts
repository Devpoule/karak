import { Component, signal } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SettingsPanel } from '../../components/settings-panel/settings-panel';


const HOME_INTRO_STORAGE_KEY = 'karak-home-intro-seen-v1';
const HOME_INTRO_TRANSITION_MS = 520;

/** Page d'accueil avec introduction mémorisée et menu principal allégé. */
@Component({
  imports: [NgOptimizedImage, RouterLink, SettingsPanel],
  selector: 'app-home',
  styleUrl: './home.scss',
  templateUrl: './home.html',
})
export class Home {
  /** Affiche l'introduction tant que le joueur n'est pas entré dans le donjon. */
  readonly showIntro = signal(this.hasUnseenIntroduction());

  /** Permet d'appliquer le fondu de sortie avant de révéler le menu. */
  readonly isEnteringDungeon = signal(false);

  private hasUnseenIntroduction(): boolean {
    if (typeof localStorage === 'undefined') return true;
    return localStorage.getItem(HOME_INTRO_STORAGE_KEY) !== 'true';
  }

  /** Mémorise l'entrée et révèle le menu sans recharger l'application. */
  enterDungeon(): void {
    if (this.isEnteringDungeon() || !this.showIntro()) return;

    localStorage.setItem(HOME_INTRO_STORAGE_KEY, 'true');
    this.isEnteringDungeon.set(true);
    this.showIntro.set(false);

    const prefersReducedMotion = typeof matchMedia !== 'undefined'
      && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const transitionDuration = prefersReducedMotion ? 0 : HOME_INTRO_TRANSITION_MS;

    window.setTimeout(() => {
      this.isEnteringDungeon.set(false);
    }, transitionDuration);
  }

  /** Permet de rejouer l'introduction depuis le menu principal. */
  revisitIntroduction(): void {
    localStorage.removeItem(HOME_INTRO_STORAGE_KEY);
    this.showIntro.set(true);
  }
}
