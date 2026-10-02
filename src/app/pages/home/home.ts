import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';


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
  imports: [RouterLink],
  selector: 'app-home',
  styleUrl: './home.scss',
  templateUrl: './home.html',
})
export class Home {}
