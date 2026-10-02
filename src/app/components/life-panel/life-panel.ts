import { Component } from '@angular/core';


/**
 * Affiche le plateau visuel des points de vie d'un joueur.
 *
 * ÉTAT ACTUEL :
 *
 * Le composant affiche uniquement l'asset correspondant
 * au plateau de vie.
 *
 * Il ne gère pas encore :
 *
 * - les points de vie actuels du héros ;
 * - la perte de points de vie ;
 * - la guérison ;
 * - le positionnement des marqueurs de vie.
 *
 * Ces éléments seront ajoutés lorsque l'état du joueur
 * et du héros sera implémenté.
 */
@Component({
  imports: [],
  selector: 'app-life-panel',
  styleUrl: './life-panel.scss',
  templateUrl: './life-panel.html',
})
export class LifePanel {}
