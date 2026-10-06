import {
  Component,
  OnDestroy,
  OnInit,
  effect,
} from '@angular/core';

import { GameHeader } from '../../components/game-header/game-header';
import { GameSetup } from '../../components/game-setup/game-setup';
import { Board } from '../../components/board/board';
import { PlayerHud } from '../../components/player-hud/player-hud';

import { AiService } from '../../services/ai.service';
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
 * ==========================================================
 * ORCHESTRATION DES TOURS IA
 * ==========================================================
 *
 * Game constitue également le bon niveau pour rythmer
 * visuellement les actions automatiques.
 *
 * La séparation reste volontairement la suivante :
 *
 * AiService
 *   -> décide et exécute UNE action métier ;
 *
 * Game
 *   -> décide QUAND demander l'action suivante.
 *
 * GameService
 *   -> conserve l'identité du joueur actif et gère
 *      le passage au joueur suivant.
 *
 * Ainsi :
 *
 * - aucune temporisation n'entre dans le moteur métier ;
 * - AiService reste indépendant de l'interface ;
 * - les animations pourront évoluer sans modifier les règles.
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
export class Game implements OnInit, OnDestroy {

  /**
   * Délai entre deux décisions successives de l'IA.
   *
   * Cette valeur appartient à la présentation :
   * elle n'a aucune incidence sur les règles du jeu.
   */
  private readonly aiActionDelay = 1500;

  /**
   * Empêche plusieurs boucles IA de fonctionner
   * simultanément.
   */
  private aiTurnRunning = false;

  /**
   * Permet d'invalider une boucle asynchrone devenue obsolète.
   *
   * La valeur est incrémentée notamment lors de la destruction
   * de la page.
   */
  private aiRunId = 0;


  constructor(
    readonly gameService: GameService,
    private readonly aiService: AiService,
  ) {
    /**
     * Observe les changements d'état nécessaires au déclenchement
     * d'un éventuel tour automatique.
     *
     * La lecture de phase() et activePlayerIndex() établit
     * explicitement les dépendances réactives.
     */
    effect(() => {
      const phase = this.gameService.phase();

      const activePlayerIndex =
        this.gameService.activePlayerIndex();

      if (
        phase !== 'playing'
        || activePlayerIndex === null
      ) {
        return;
      }

      const activePlayer =
        this.gameService.activePlayer;

      if (activePlayer?.controller !== 'ai') {
        return;
      }

      /*
       * Le lancement réel est différé afin de ne pas modifier
       * les Signals observés directement pendant l'exécution
       * de l'effect.
       */
      queueMicrotask(() => {
        void this.runAiTurn();
      });
    });
  }


  // ==========================================================
  // INITIALISATION
  // ==========================================================

  ngOnInit(): void {
    this.gameService.initialize();
  }


  // ==========================================================
  // DESTRUCTION
  // ==========================================================

  ngOnDestroy(): void {
    /*
     * Toute boucle encore en attente devient obsolète.
     */
    this.aiRunId++;
  }


  // ==========================================================
  // TOUR IA
  // ==========================================================

  /**
   * Orchestre le tour complet d'un joueur IA.
   *
   * IMPORTANT :
   *
   * cette méthode ne décide jamais où l'IA doit aller.
   *
   * Elle demande simplement à AiService de jouer UNE action,
   * attend un court instant pour laisser l'interface refléter
   * le nouvel état, puis recommence si le joueur actif est
   * toujours une IA.
   *
   * AiService reste responsable de terminer le tour lorsque :
   *
   * - les mouvements sont épuisés ;
   * - aucune action n'est disponible.
   */
  private async runAiTurn(): Promise<void> {
    if (this.aiTurnRunning) {
      return;
    }

    const player = this.gameService.activePlayer;

    if (
      this.gameService.phase() !== 'playing'
      || player?.controller !== 'ai'
    ) {
      return;
    }

    this.aiTurnRunning = true;

    /*
     * Chaque exécution reçoit son propre identifiant.
     *
     * Si la page est détruite pendant une attente,
     * l'identifiant global change et la boucle s'arrête.
     */
    const runId = ++this.aiRunId;

    try {
      while (
        runId === this.aiRunId
        && this.gameService.phase() === 'playing'
        && this.gameService.activePlayer?.controller === 'ai'
      ) {
        /*
         * Petite pause avant l'action.
         *
         * Elle permet notamment de voir clairement qu'un joueur
         * IA vient de devenir actif avant son déplacement.
         */
        await this.wait(this.aiActionDelay);

        if (
          runId !== this.aiRunId
          || this.gameService.phase() !== 'playing'
          || this.gameService.activePlayer?.controller !== 'ai'
        ) {
          break;
        }

        this.aiService.playAction();
      }
    } finally {
      this.aiTurnRunning = false;

      /*
       * Cas important :
       *
       * une IA peut terminer son tour et transmettre la main
       * directement à une autre IA.
       *
       * L'effect Angular peut avoir tenté de lancer cette
       * nouvelle IA alors que aiTurnRunning valait encore true.
       *
       * On vérifie donc une dernière fois l'état après avoir
       * libéré le verrou.
       */
      if (
        runId === this.aiRunId
        && this.gameService.phase() === 'playing'
        && this.gameService.activePlayer?.controller === 'ai'
      ) {
        queueMicrotask(() => {
          void this.runAiTurn();
        });
      }
    }
  }


  // ==========================================================
  // TEMPORISATION
  // ==========================================================

  /**
   * Attend le nombre de millisecondes demandé.
   *
   * Cette temporisation sert uniquement au rythme visuel
   * des actions automatiques.
   */
  private wait(milliseconds: number): Promise<void> {
    return new Promise((resolve) => {
      window.setTimeout(
        resolve,
        milliseconds,
      );
    });
  }
}
