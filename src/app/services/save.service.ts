import { Injectable } from '@angular/core';
import { GameSavePayloadV2, SaveEnvelopeV2 } from '../models/save';

/** Clé stable utilisée pour la sauvegarde locale V2. */
export const SAVE_STORAGE_KEY = 'karak.save.v2';

/**
 * Sérialise, valide et écrit une sauvegarde versionnée dans localStorage.
 *
 * Ce service ne reconstruit pas encore GameService : cette responsabilité
 * appartient à la campagne V2.1-03. Il garantit en revanche qu'une valeur
 * écrite respecte l'enveloppe et qu'une lecture invalide ne remonte jamais
 * comme une sauvegarde exploitable.
 */
@Injectable({ providedIn: 'root' })
export class SaveService {
  /** Écrit un payload validé et retourne false si le stockage est indisponible. */
  save(payload: GameSavePayloadV2): boolean {
    const envelope: SaveEnvelopeV2 = {
      schema: 'karak-save',
      version: 2,
      savedAt: new Date().toISOString(),
      payload,
    };
    if (!this.isValidEnvelope(envelope)) return false;

    try {
      localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify(envelope));
      return true;
    } catch {
      return false;
    }
  }

  /** Lit la sauvegarde courante après validation complète de son enveloppe. */
  read(): SaveEnvelopeV2 | null {
    try {
      const raw = localStorage.getItem(SAVE_STORAGE_KEY);
      if (!raw) return null;
      const parsed: unknown = JSON.parse(raw);
      return this.isValidEnvelope(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  /** Supprime explicitement la sauvegarde locale. */
  clear(): void {
    try {
      localStorage.removeItem(SAVE_STORAGE_KEY);
    } catch {
      // Un stockage indisponible ne doit pas interrompre une nouvelle partie.
    }
  }

  /** Vérifie la structure publique avant toute utilisation ou écriture. */
  isValidEnvelope(value: unknown): value is SaveEnvelopeV2 {
    if (!isRecord(value)) return false;
    const record = value as any;
    if (record.schema !== 'karak-save' || record.version !== 2) return false;
    if (typeof record.savedAt !== 'string' || Number.isNaN(Date.parse(record.savedAt))) return false;
    return this.isValidPayload(record.payload);
  }

  /** Vérifie les invariants de structure du payload sans muter l'application. */
  private isValidPayload(value: unknown): value is GameSavePayloadV2 {
    if (!isRecord(value)) return false;
    const record = value as any;
    if (!['setup', 'playing', 'game-over'].includes(String(record.phase))) return false;
    if (typeof record.setupStep !== 'string' || !Array.isArray(record.players)) return false;
    if (!isNullableIndex(record.firstPlayerIndex, record.players.length)) return false;
    if (!isNullableIndex(record.activePlayerIndex, record.players.length)) return false;
    if (!Array.isArray(record.firstPlayerRolls) || !Array.isArray(record.firstPlayerContenders)) return false;
    if (!isRecord(record.dungeon) || !isRecord(record.turn) || !isRecord(record.pending)) return false;
    if (!Array.isArray(record.finalRanking)) return false;
    return record.players.every(isRecord)
      && record.firstPlayerContenders.every((item: unknown) => typeof item === 'number' && Number.isInteger(item) && item >= 0 && item < record.players.length)
      && record.dungeon.tiles instanceof Array
      && record.dungeon.remainingTileIds instanceof Array
      && record.dungeon.remainingTokenIds instanceof Array
      && Number.isInteger(record.turn.remainingMovements)
      && Number.isInteger(record.turn.movementsMadeThisTurn);
  }
}

/** Réduit une valeur inconnue à un objet indexable sans accepter null. */
function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Vérifie un index de joueur facultatif dans les limites de la liste. */
function isNullableIndex(value: unknown, playerCount: number): value is number | null {
  return value === null || (typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < playerCount);
}
