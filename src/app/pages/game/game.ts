import { Component } from '@angular/core';

import { GameHeader } from '../../components/game-header/game-header';
import { Board } from '../../components/board/board';
import { PlayerHud } from '../../components/player-hud/player-hud';


/**
 * Page principale de jeu.
 *
 * Cette page joue uniquement un rôle de composition :
 *
 * - GameHeader fournit l'en-tête de la partie ;
 * - Board affiche et permet de manipuler le donjon ;
 * - PlayerHud superpose l'interface des joueurs au plateau.
 *
 * La logique du donjon et du gameplay ne doit pas être
 * implémentée directement dans cette page.
 */
@Component({
  imports: [
    GameHeader,
    Board,
    PlayerHud,
  ],
  selector: 'app-game',
  styleUrl: './game.scss',
  templateUrl: './game.html',
})
export class Game {}
