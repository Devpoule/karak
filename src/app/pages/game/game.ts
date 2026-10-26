import {
  Component,
  OnDestroy,
  OnInit,
  Optional,
  effect,
} from '@angular/core';

import { GameHeader } from '../../components/game-header/game-header';
import { GameSetup } from '../../components/game-setup/game-setup';
import { Board } from '../../components/board/board';
import { PlayerHud } from '../../components/player-hud/player-hud';

import { AiService } from '../../services/ai.service';
import { CombatService } from '../../services/combat.service';
import { GameService } from '../../services/game.service';
import { getHeroDefinition } from '../../data/hero-definitions';
import { Player } from '../../models/player';
import { QuantityPipe } from '../../pipes/quantity.pipe';
import { TOAST_LABELS, ToastService } from '../../services/toast.service';

/**
 * Page principale du jeu.
 *
 * Compose les interfaces et cadence les actions IA.
 * Les décisions appartiennent à AiService et les règles
 * de changement de tour à GameService.
 */
@Component({
  selector: 'app-game',
  imports: [GameHeader, GameSetup, Board, PlayerHud, QuantityPipe],
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
  private unsupportedAiResolution: object | null = null;
  private announcedTurnKey: string | null = null;

  constructor(
    readonly gameService: GameService,
    private readonly aiService: AiService,
    private readonly combatService: CombatService,
    @Optional() private readonly toastService?: ToastService,
  ) {
    effect(() => {
      const phase = this.gameService.phase();
      const activePlayerIndex = this.gameService.activePlayerIndex();
      const recoveryRevision = this.gameService.recoveryRevision();

      if (phase !== 'playing') {
        this.announcedTurnKey = null;
        return;
      }
      if (activePlayerIndex === null || this.destroyed) {
        return;
      }

      const key = `${phase}:${activePlayerIndex}:${recoveryRevision}`;
      if (key !== this.announcedTurnKey) {
        this.announcedTurnKey = key;
        const player = this.gameService.activePlayer;
        if (player) this.announceTurn(player, activePlayerIndex);
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
    if (!this.gameService.isInitialized()) {
      this.gameService.restoreOrInitialize();
    }
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.aiRunId++;
  }

  getHeroName(player: Player): string {
    return player.heroId ? (getHeroDefinition(player.heroId)?.name ?? 'Héros') : 'Héros';
  }

  getHeroPortrait(player: Player): string | undefined {
    return player.heroId ? getHeroDefinition(player.heroId)?.character : undefined;
  }

  private announceTurn(player: Player, index: number): void {
    queueMicrotask(() => {
      if (this.destroyed || this.gameService.activePlayerIndex() !== index) return;
      const recovery = player.recoveryState === 'resting';
      if (recovery) this.toastService?.show(TOAST_LABELS.healing(), 'success', { playerIndex: index, anchor: 'life' }, {
        eventType: 'healing', heroId: player.heroId, icon: '♥', duration: 2800,
      });
    });
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
      && !this.gameService.turnTransitionPending()
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
        if (this.combatBlocksAi) {
          await this.wait(this.aiBlockedCheckDelay);
          continue;
        }

        if (this.gameService.hasPendingTileResolution) {
          const resolution = this.aiService.resolveMandatoryAction();
          if (resolution === 'resolved') {
            this.unsupportedAiResolution = null;
            await this.wait(this.aiBlockedCheckDelay);
            continue;
          }
          if (resolution.startsWith('unsupported:')) {
            const pending = this.gameService.pendingReward()
              ?? this.gameService.pendingTreasure()
              ?? this.gameService.pendingGroundEquipment();
            if (pending !== this.unsupportedAiResolution) {
              this.unsupportedAiResolution = pending;
              console.warn(`Résolution obligatoire IA non prise en charge : ${resolution}.`, pending);
            }
          }
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
        && !this.gameService.turnTransitionPending()
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
