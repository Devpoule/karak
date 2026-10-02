import { Component } from '@angular/core';
import { GameHeader } from '../../components/game-header/game-header';
import { Board } from '../../components/board/board';
import { PlayerHud } from '../../components/player-hud/player-hud';

@Component({
  imports: [GameHeader, Board, PlayerHud],
  selector: 'app-game',
  styleUrl: './game.scss',
  templateUrl: './game.html',
})
export class Game {}
