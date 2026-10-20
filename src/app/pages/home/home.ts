import { Component } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SettingsPanel } from '../../components/settings-panel/settings-panel';
import { TutorialPanel } from '../../components/tutorial-panel/tutorial-panel';


/**
 * Page d'accueil de l'application.
 *
 * Elle présente l'univers de Karak et fournit les deux
 * points d'entrée principaux :
 *
 * - démarrer une partie ;
 * - consulter les règles du jeu.
 *
 * Cette page ne contient aucun état de jeu.
 */
@Component({
  imports: [NgOptimizedImage, RouterLink, SettingsPanel, TutorialPanel],
  selector: 'app-home',
  styleUrl: './home.scss',
  templateUrl: './home.html',
})
export class Home {}
