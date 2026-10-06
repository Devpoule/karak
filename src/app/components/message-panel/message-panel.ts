import { Component, Input } from '@angular/core';


/**
 * Affiche la zone réservée aux messages contextuels d'un joueur.
 *
 * ÉTAT ACTUEL :
 *
 * Le composant fournit principalement le support visuel dans
 * lequel les futurs messages du jeu seront affichés.
 *
 * Il reçoit également la couleur UI du joueur actuellement
 * représenté afin de rappeler discrètement son identité dans
 * la fiche dépliée.
 *
 * Il ne gère pas encore :
 *
 * - le contenu des messages ;
 * - leur origine ;
 * - leur historique ;
 * - leur durée d'affichage ;
 * - les éventuelles interactions associées.
 *
 * Le système de messages sera conçu lorsque les événements
 * de gameplay concernés seront implémentés.
 */
@Component({
  imports: [],
  selector: 'app-message-panel',
  styleUrl: './message-panel.scss',
  templateUrl: './message-panel.html',
})
export class MessagePanel {

  /**
   * Couleur UI du joueur auquel appartient la fiche.
   *
   * Elle est injectée dans une variable CSS depuis le template
   * afin de rester purement décorative.
   */
  @Input() playerColor = 'transparent';
}
