import { Component } from '@angular/core';

import { TurnService } from '../../services/turn.service';


/**
 * Affiche le nombre de mouvements encore disponibles
 * pendant le tour courant.
 *
 * TurnService reste la source de vérité de cet état.
 *
 * Le composant ne contient aucune logique de tour :
 * il se contente de représenter visuellement l'état fourni
 * par le service.
 */
@Component({
  imports: [],
  selector: 'app-movement-counter',
  styleUrl: './movement-counter.scss',
  templateUrl: './movement-counter.html',
})
export class MovementCounter {

  constructor(
    private readonly turnService: TurnService,
  ) {}


  /**
   * Indicateurs correspondant aux mouvements encore disponibles.
   *
   * Le tableau est reconstruit depuis l'état courant du tour afin
   * que le template puisse conserver son affichage sous forme
   * de points.
   *
   * remainingMovements est un Signal Angular :
   * l'appel avec () permet d'en lire la valeur actuelle.
   */
  get movementPoints(): unknown[] {
    return Array.from({
      length: this.turnService.remainingMovements(),
    });
  }
}
