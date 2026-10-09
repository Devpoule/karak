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
 * Compose les interfaces et cadence les actions IA.
 * Les décisions appartiennent à AiService et les règles
 * de changement de tour à GameService.
 */
@Component({
  selector: 'app-game',
  imports: [GameHeader, GameSetup, Board, PlayerHud],
  templateUrl: './game.html',
  styleUrl: './game.scss',
})
export class Game implements OnInit, OnDestroy {
  /** Pause entre deux actions du même joueur IA. */
  private readonly aiActionDelay = 1800;

  /** Pause avant la première action de chaque tour IA. */
  private readonly aiTurnStartDelay = 2500;

  /** Fréquence de vérification des résolutions obligatoires. */
  private readonly aiBlockedCheckDelay = 200;

  private aiTurnRunning = false;
  private aiRunId = 0;
  private destroyed = false;

  constructor(
    readonly gameService: GameService,
    private readonly aiService: AiService,
    private readonly combatService: CombatService,
  ) {
    effect(() => {
      const phase = this.gameService.phase();
      const activePlayerIndex = this.gameService.activePlayerIndex();

      if (phase !== 'playing' || activePlayerIndex === null || this.destroyed) {
        return;
      }

      if (this.gameService.activePlayer?.controller !== 'ai') {
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

  /** Le combat bloque l'IA jusqu'à la fermeture du résultat. */
  private get combatBlocksAi(): boolean {
    return (
      this.combatService.pendingCombat() !== null
      || this.combatService.lastCombatResult() !== null
    );
  }

  /** Vérifie que la boucle concerne encore le même joueur IA. */
  private canContinue(runId: number, playerIndex: number): boolean {
    return (
      runId === this.aiRunId
      && !this.destroyed
      && this.gameService.phase() === 'playing'
      && this.gameService.activePlayerIndex() === playerIndex
      && this.gameService.activePlayer?.controller === 'ai'
    );
  }

  /**
   * Exécute les actions IA sans jamais dépasser le joueur
   * pour lequel cette boucle a été lancée.
   */
  private async runAiTurn(): Promise<void> {
    if (this.aiTurnRunning || this.destroyed) {
      return;
    }

    const playerIndex = this.gameService.activePlayerIndex();

    if (
      playerIndex === null
      || this.gameService.phase() !== 'playing'
      || this.gameService.activePlayer?.controller !== 'ai'
    ) {
      return;
    }

    this.aiTurnRunning = true;
    const runId = ++this.aiRunId;
    let firstAction = true;

    try {
      while (this.canContinue(runId, playerIndex)) {
        // L'overlay garde la maîtrise des combats et de leur résultat.
        if (this.combatBlocksAi || this.gameService.hasPendingTileResolution) {
          await this.wait(this.aiBlockedCheckDelay);
          continue;
        }

        await this.wait(firstAction ? this.aiTurnStartDelay : this.aiActionDelay);

        if (!this.canContinue(runId, playerIndex)) {
          break;
        }

        // Une résolution peut avoir démarré pendant la pause.
        if (this.combatBlocksAi || this.gameService.hasPendingTileResolution) {
          continue;
        }

        firstAction = false;
        this.aiService.playAction();
      }
    } finally {
      this.aiTurnRunning = false;

      // Si une autre IA a reçu la main pendant cette boucle,
      // son propre délai de début de tour doit être appliqué.
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

  private wait(milliseconds: number): Promise<void> {
    return new Promise((resolve) => {
      window.setTimeout(resolve, milliseconds);
    });
  }
}
