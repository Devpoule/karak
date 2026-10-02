import { Component } from '@angular/core';

import { GameHeader } from '../../components/game-header/game-header';


/**
 * Lecteur du livret officiel des règles de Karak.
 *
 * Les pages du manuel sont conservées sous forme d'images
 * dans /assets/rules.
 *
 * CHOIX D'IMPLÉMENTATION :
 *
 * une seule page est affichée à la fois. Son chemin est calculé
 * à partir de currentPage afin d'éviter de maintenir séparément
 * une liste de huit chemins d'assets.
 */
@Component({
  selector: 'app-rules',
  imports: [GameHeader],
  templateUrl: './rules.html',
  styleUrl: './rules.scss',
})
export class Rules {

  /**
   * Nombre de pages du manuel actuellement intégré.
   */
  readonly totalPages = 8;

  /**
   * Page actuellement affichée.
   *
   * La numérotation commence à 1 afin de correspondre
   * directement aux noms des assets.
   */
  currentPage = 1;


  /**
   * Construit le chemin de l'image correspondant à la page
   * actuellement affichée.
   *
   * Exemple :
   *
   * page 1 → /assets/rules/karak_base_01.jpg
   */
  get currentPageImage(): string {
    const page =
      this.currentPage
        .toString()
        .padStart(2, '0');

    return `/assets/rules/karak_base_${page}.jpg`;
  }


  /**
   * Affiche la page précédente lorsqu'elle existe.
   */
  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }


  /**
   * Affiche la page suivante lorsqu'elle existe.
   */
  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }
}
