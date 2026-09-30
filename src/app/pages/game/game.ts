import { Component } from '@angular/core';
import { GameHeader } from '../../components/game-header/game-header';
import { Board } from '../../components/board/board';
import { PlayerPanel } from '../../components/player-panel/player-panel';

@Component({
  imports: [GameHeader, Board, PlayerPanel],
  selector: 'app-game',
  styleUrl: './game.scss',
  templateUrl: './game.html',
})
export class Game {}
