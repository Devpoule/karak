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

  it('ne comptabilise pas une suspension comme un mouvement supplémentaire', () => {
    const service = new TurnService();
    service.consumeMovement();
    service.stopMovements();

    expect(service.movementsMadeThisTurn()).toBe(1);
    expect(service.remainingMovements()).toBe(0);

    expect(service.resumeSuspendedMovements()).toBe(true);
    expect(service.movementsMadeThisTurn()).toBe(1);
    expect(service.remainingMovements()).toBe(3);
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

  it('consomme définitivement les mouvements restants sans créer de suspension', () => {
    const service = new TurnService();
    service.consumeMovement();

    expect(service.consumeAllMovements()).toBe(true);
    expect(service.remainingMovements()).toBe(0);
    expect(service.movementsMadeThisTurn()).toBe(4);
    expect(service.suspendedMovementCount).toBeNull();

    service.stopMovements();
    expect(service.resumeSuspendedMovements()).toBe(false);
  });

  it('ne considère pas l arrêt après le dernier mouvement comme une suspension', () => {
    const service = new TurnService();
    for (let index = 0; index < 4; index++) service.consumeMovement();

    service.stopMovements();

    expect(service.suspendedMovementCount).toBeNull();
    expect(service.resumeSuspendedMovements()).toBe(false);
  });
});
