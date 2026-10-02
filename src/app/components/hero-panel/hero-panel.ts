import { Component } from '@angular/core';


/**
 * Affiche le plateau visuel réservé au héros d'un joueur.
 *
 * ÉTAT ACTUEL :
 *
 * Le composant affiche uniquement l'asset servant de support
 * à la future représentation du héros.
 *
 * Il ne gère pas encore :
 *
 * - le héros sélectionné ;
 * - son portrait ;
 * - son nom ;
 * - son pouvoir spécial ;
 * - son état pendant la partie.
 *
 * Ces informations seront ajoutées lorsque le modèle des héros
 * et l'état des joueurs seront implémentés.
 */
@Component({
  imports: [],
  selector: 'app-hero-panel',
  styleUrl: './hero-panel.scss',
  templateUrl: './hero-panel.html',
})
export class HeroPanel {}
