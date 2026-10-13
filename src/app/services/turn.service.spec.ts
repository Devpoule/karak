import { describe, expect, it } from 'vitest';
import { TurnService } from './turn.service';

describe('TurnService invariants', () => {
  it('ne consomme jamais plus de quatre mouvements par tour', () => {
    const service = new TurnService();

    for (let index = 0; index < 6; index++) service.consumeMovement();

    expect(service.movementsMadeThisTurn()).toBe(4);
    expect(service.remainingMovements()).toBe(0);
    expect(service.canMove).toBe(false);
  });

  it('suspend puis restaure exactement les mouvements interrompus', () => {
    const service = new TurnService();
    service.consumeMovement();
    service.consumeMovement();

    service.stopMovements();
    expect(service.remainingMovements()).toBe(0);
    expect(service.resumeSuspendedMovements()).toBe(true);
    expect(service.remainingMovements()).toBe(2);
    expect(service.resumeSuspendedMovements()).toBe(false);
  });

  it('réinitialise le compteur et invalide une suspension précédente', () => {
    const service = new TurnService();
    service.consumeMovement();
    service.stopMovements();

    service.resetMovements();

    expect(service.remainingMovements()).toBe(4);
    expect(service.movementsMadeThisTurn()).toBe(0);
    expect(service.resumeSuspendedMovements()).toBe(false);
  });
});
