import { Component, OnInit } from '@angular/core';

import { GameHeader } from '../../components/game-header/game-header';
import { GameSetup } from '../../components/game-setup/game-setup';
import { Board } from '../../components/board/board';
import { PlayerHud } from '../../components/player-hud/player-hud';
import { GameService } from '../../services/game.service';

/**
 * Page principale de jeu.
 *
 * Cette page joue principalement un rôle de composition :
 *
 * - GameHeader fournit l'en-tête de la partie ;
 * - GameSetup affiche les étapes de préparation ;
 * - Board affiche et permet de manipuler le donjon ;
 * - PlayerHud superpose l'interface des joueurs au plateau.
 *
 * Elle constitue également le point d'entrée de la partie :
 * lors de son initialisation, elle demande à GameService
 * de commencer la préparation d'une nouvelle partie.
 *
 * La logique du donjon, du SETUP et du gameplay ne doit pas
 * être implémentée directement dans cette page.
 */
@Component({
  imports: [
    GameHeader,
    GameSetup,
    Board,
    PlayerHud,
  ],
  selector: 'app-game',
  styleUrl: './game.scss',
  templateUrl: './game.html',
})
export class Game implements OnInit {
  constructor(
    readonly gameService: GameService,
  ) {}

  ngOnInit(): void {
    this.gameService.initialize();
  }
}
