import { TestBed } from '@angular/core/testing';
import { describe, expect, beforeEach, it } from 'vitest';
import { GameSavePayloadV2 } from '../models/save';
import { SAVE_STORAGE_KEY, SaveService } from './save.service';

function payload(): GameSavePayloadV2 {
  return {
    phase: 'playing', setupStep: 'first-player-roll', players: [],
    firstPlayerIndex: null, activePlayerIndex: null, firstPlayerRolls: [],
    firstPlayerContenders: [],
    dungeon: { tiles: [], remainingTileIds: [], remainingTokenIds: [] },
    turn: { remainingMovements: 4, movementsMadeThisTurn: 0, suspendedMovements: null },
    pending: {}, finalRanking: [],
  };
}

describe('SaveService', () => {
  let service: SaveService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [SaveService] });
    service = TestBed.inject(SaveService);
  });

  it('écrit et relit une enveloppe V2 versionnée', () => {
    expect(service.save(payload())).toBe(true);
    expect(JSON.parse(localStorage.getItem(SAVE_STORAGE_KEY)!)).toMatchObject({ schema: 'karak-save', version: 2 });
    expect(service.read()?.payload.turn.remainingMovements).toBe(4);
  });

  it('rejette une enveloppe corrompue ou incompatible', () => {
    localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify({ schema: 'other', version: 1 }));
    expect(service.read()).toBeNull();
    expect(localStorage.getItem(SAVE_STORAGE_KEY)).toBeNull();
    localStorage.setItem(SAVE_STORAGE_KEY, '{invalid');
    expect(service.read()).toBeNull();
    expect(localStorage.getItem(SAVE_STORAGE_KEY)).toBeNull();
  });

  it('rejette une structure métier invalide et la retire du stockage', () => {
    localStorage.setItem(SAVE_STORAGE_KEY, JSON.stringify({
      schema: 'karak-save', version: 2, savedAt: new Date().toISOString(),
      payload: { ...payload(), turn: { remainingMovements: 9, movementsMadeThisTurn: 0, suspendedMovements: null } },
    }));

    expect(service.read()).toBeNull();
    expect(localStorage.getItem(SAVE_STORAGE_KEY)).toBeNull();
  });

  it('rejette un index de joueur hors limites sans mutation', () => {
    const invalid = { ...payload(), activePlayerIndex: 1 };
    expect(service.save(invalid)).toBe(false);
    expect(localStorage.getItem(SAVE_STORAGE_KEY)).toBeNull();
  });

  it('supprime explicitement la sauvegarde', () => {
    service.save(payload());
    service.clear();
    expect(service.read()).toBeNull();
  });
});
