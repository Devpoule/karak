
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
import { CombatService } from '../../services/combat.service';
import { GameService } from '../../services/game.service';

/**
 * Page principale du jeu.
 *
 * Compose les différentes interfaces et orchestre
 * le rythme des tours contrôlés par l'IA.
 *
 * Les décisions restent dans AiService.
 * Les règles et changements de joueur restent
 * dans les services métier.
 */
@Component({
  selector: 'app-game',
  imports: [
    GameHeader,
    GameSetup,
    Board,
    PlayerHud,
  ],
  templateUrl: './game.html',
  styleUrl: './game.scss',
})
export class Game implements OnInit, OnDestroy {

  /**
   * Intervalle visuel entre deux actions IA.
   */
  private readonly aiActionDelay = 1500;

  /**
   * Intervalle de vérification pendant une résolution
   * obligatoire.
   */
  private readonly aiBlockedCheckDelay = 200;

  /**
   * Empêche plusieurs boucles simultanées.
   */
  private aiTurnRunning = false;

  /**
   * Invalide les boucles asynchrones obsolètes.
   */
  private aiRunId = 0;

  private destroyed = false;

  constructor(
    readonly gameService: GameService,
    private readonly aiService: AiService,
    private readonly combatService: CombatService,
  ) {
    effect(() => {
      const phase = this.gameService.phase();
      const activePlayerIndex =
        this.gameService.activePlayerIndex();

      if (
        phase !== 'playing'
        || activePlayerIndex === null
        || this.destroyed
      ) {
        return;
      }

      if (
        this.gameService.activePlayer?.controller !== 'ai'
      ) {
        return;
      }

      queueMicrotask(() => {
        if (!this.destroyed) {
          void this.runAiTurn();
        }
      });
    });
  }

  ngOnInit(): void {
    this.gameService.initialize();
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.aiRunId++;
  }

  /**
   * Indique si le Battle doit encore bloquer les actions IA.
   *
   * pendingCombat :
   *   le résultat n'a pas encore été calculé.
   *
   * lastCombatResult :
   *   le résultat existe mais sa présentation n'est
   *   pas encore terminée.
   */
  private get combatBlocksAi(): boolean {
    return (
      this.combatService.pendingCombat() !== null
      || this.combatService.lastCombatResult() !== null
    );
  }

  /**
   * Orchestre les actions automatiques.
   *
   * Un Battle suspend la boucle, sans la terminer.
   * L'overlay est seul responsable du lancer et
   * de la fermeture du résultat.
   */
  private async runAiTurn(): Promise<void> {
    if (this.aiTurnRunning || this.destroyed) {
      return;
    }

    if (
      this.gameService.phase() !== 'playing'
      || this.gameService.activePlayer?.controller !== 'ai'
    ) {
      return;
    }

    this.aiTurnRunning = true;

    const runId = ++this.aiRunId;

    try {
      while (
        runId === this.aiRunId
        && !this.destroyed
        && this.gameService.phase() === 'playing'
        && this.gameService.activePlayer?.controller === 'ai'
      ) {
        /**
         * Ne jamais solliciter AiService pendant
         * un combat ou son animation de résultat.
         */
        if (this.combatBlocksAi) {
          await this.wait(this.aiBlockedCheckDelay);
          continue;
        }

        /**
         * Les autres résolutions obligatoires restent
         * bloquantes, notamment les trésors.
         *
         * Leur automatisation sera traitée séparément.
         */
        if (this.gameService.hasPendingTileResolution) {
          await this.wait(this.aiBlockedCheckDelay);
          continue;
        }

        await this.wait(this.aiActionDelay);

        if (
          runId !== this.aiRunId
          || this.destroyed
          || this.gameService.phase() !== 'playing'
          || this.gameService.activePlayer?.controller !== 'ai'
        ) {
          break;
        }

        /**
         * Revérification après l'attente :
         * un combat peut avoir été déclenché
         * pendant cette période.
         */
        if (
          this.combatBlocksAi
          || this.gameService.hasPendingTileResolution
        ) {
          continue;
        }

        this.aiService.playAction();
      }
    } finally {
      this.aiTurnRunning = false;

      /**
       * Si une IA a transmis la main à une autre IA
       * pendant que le verrou était actif,
       * une nouvelle boucle peut démarrer.
       */
      if (
        !this.destroyed
        && runId === this.aiRunId
        && this.gameService.phase() === 'playing'
        && this.gameService.activePlayer?.controller === 'ai'
      ) {
        queueMicrotask(() => {
          if (!this.destroyed) {
            void this.runAiTurn();
          }
        });
      }
    }
  }

  /**
   * Temporisation purement visuelle.
   */
  private wait(milliseconds: number): Promise<void> {
    return new Promise((resolve) => {
      window.setTimeout(resolve, milliseconds);
    });
  }
}
