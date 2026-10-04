import { Injectable, signal } from '@angular/core';

import { GamePhase, SetupStep } from '../models/game';
import { DungeonService } from './dungeon.service';
import { TileDeckService } from './tile-deck.service';
import { PlayerService } from './player.service';
import { Player } from '../models/player';

@Injectable({
  providedIn: 'root',
})
export class GameService {
  readonly phase = signal<GamePhase>('setup');
  /**
   * Étape actuellement présentée pendant la préparation.
   *
   * Le donjon et la pioche étant préparés automatiquement,
   * la première étape interactive consiste à déterminer
   * le nombre de joueurs.
   */
  readonly setupStep = signal<SetupStep>('player-count');

  constructor(
    private readonly dungeonService: DungeonService,
    private readonly tileDeckService: TileDeckService,
    private readonly playerService: PlayerService,
  ) {}

  /**
   * Commence la préparation d'une nouvelle partie.
   *
   * Cette méthode constitue le point d'entrée du SETUP.
   * Les différentes étapes de préparation y seront ajoutées
   * progressivement dans l'ordre prévu par les règles.
   */
  initialize(): void {
    this.phase.set('setup');
    this.setupStep.set('player-count');

    this.initializeDungeon();
    this.initializeTileDeck();
  }

  /**
   * Prépare les joueurs participant à la partie.
   *
   * RÈGLE OFFICIELLE KARAK :
   * chaque joueur reçoit un plateau d'inventaire et commence
   * la partie avec 5 jetons de vie face cœur.
   *
   * Une fois les joueurs préparés, la mise en place passe
   * au tirage aléatoire des héros.
   */
  initializePlayers(playerCount: number): void {
    if (this.phase() !== 'setup') return;
    if (this.setupStep() !== 'player-count') return;

    this.playerService.initialize(playerCount);

    this.setupStep.set('hero-draw');
  }

  /**
   * Effectue le tirage aléatoire des héros.
   *
   * RÈGLE OFFICIELLE KARAK :
   * les cartes Héros sont mélangées face cachée,
   * puis chaque joueur en reçoit une.
   *
   * GameService orchestre cette étape sans connaître
   * le détail de l'algorithme de tirage.
   */
  drawHeroes(): void {
    if (this.phase() !== 'setup') return;
    if (this.setupStep() !== 'hero-draw') return;

    this.playerService.drawHeroes();
  }

  /**
   * Place les héros sur la tuile Départ.
   *
   * RÈGLE OFFICIELLE KARAK :
   * après l'attribution des héros, chaque joueur prend
   * le pion correspondant et le place sur la tuile Départ.
   */
  placeHeroesOnStart(): void {
    console.log(
      'AVANT',
      this.phase(),
      this.setupStep(),
    );

    if (this.phase() !== 'setup') return;
    if (this.setupStep() !== 'hero-draw') return;

    this.playerService.placeHeroesOnStart();

    this.setupStep.set('hero-placement');

    console.log(
      'APRÈS',
      this.phase(),
      this.setupStep(),
    );
  }

  /**
   * Première étape du SETUP : prépare le donjon.
   *
   * RÈGLE OFFICIELLE KARAK :
   *
   * la tuile de départ est placée au centre de la zone de jeu
   * avant le début de la partie.
   */
  private initializeDungeon(): void {
    this.dungeonService.initialize();
  }

  /**
   * Deuxième étape du SETUP : prépare les tuiles
   * utilisées pour l'exploration.
   *
   * RÈGLE OFFICIELLE KARAK :
   *
   * après avoir placé la tuile de départ, les 79 autres
   * tuiles de catacombes sont mélangées face cachée.
   */
  private initializeTileDeck(): void {
    this.tileDeckService.initialize();
  }

  /**
   * Nombre de joueurs actuellement préparés pour la partie.
   *
   * Cette information est exposée par GameService afin que
   * l'interface de préparation n'ait pas à accéder directement
   * à PlayerService.
   */
  get playerCount(): number {
    return this.playerService.players.length;
  }

  /**
   * Joueurs actuellement préparés pour la partie.
   *
   * Cette exposition permet aux écrans pilotés par GameService
   * de représenter l'état de la partie sans dépendre directement
   * de PlayerService.
   */
  get players(): readonly Player[] {
    return this.playerService.players;
  }
}
