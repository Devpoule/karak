import { GamePhase, SetupStep } from './game';

/** Enveloppe persistée et versionnée d'une partie Karak. */
export interface SaveEnvelopeV2 {
  readonly schema: 'karak-save';
  readonly version: 2;
  readonly savedAt: string;
  readonly payload: GameSavePayloadV2;
}

/** État sérialisable des joueurs, sans référence vers les services Angular. */
export interface PlayerSaveV2 {
  readonly controller: 'human' | 'ai';
  readonly lives: number;
  readonly recoveryState: 'none' | 'pending' | 'resting';
  readonly isCursed: boolean;
  readonly heroId?: string;
  readonly position?: { readonly x: number; readonly y: number };
  readonly facing?: string;
  readonly inventory: Readonly<Record<string, unknown>>;
  readonly treasures: readonly Readonly<Record<string, unknown>>[];
}

/** État sérialisable du donjon et des réserves ordonnées. */
export interface DungeonSaveV2 {
  readonly tiles: readonly Readonly<Record<string, unknown>>[];
  readonly remainingTileIds: readonly string[];
  readonly remainingTokenIds: readonly string[];
}

/** Compteurs persistables du tour courant. */
export interface TurnSaveV2 {
  readonly remainingMovements: number;
  readonly movementsMadeThisTurn: number;
  readonly suspendedMovements: number | null;
}

/** Résultats finaux sérialisables sans référence vers Player. */
export interface RankingSaveV2 {
  readonly playerIndex: number;
  readonly points: number;
}

/** État métier complet attendu par la couche de sauvegarde. */
export interface GameSavePayloadV2 {
  readonly phase: GamePhase;
  readonly setupStep: SetupStep;
  readonly players: readonly PlayerSaveV2[];
  readonly firstPlayerIndex: number | null;
  readonly activePlayerIndex: number | null;
  readonly firstPlayerRolls: readonly Readonly<Record<string, unknown>>[];
  readonly firstPlayerContenders: readonly number[];
  readonly dungeon: DungeonSaveV2;
  readonly turn: TurnSaveV2;
  readonly pending: Readonly<Record<string, unknown>>;
  readonly finalRanking: readonly RankingSaveV2[];
}
