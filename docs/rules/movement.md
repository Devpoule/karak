# Déplacement

## `TURN-MOVEMENT-COUNT`

- Conformité métier : **à vérifier**.
- Couverture technique : **testée**.
- Implémentation : [`TurnService.resetMovements`](../../src/app/services/turn.service.ts#resetMovements), [`GameService.canPerformNormalMovementTo`](../../src/app/services/game.service.ts#canPerformNormalMovementTo).
- Tests : [`turn.service.spec.ts`](../../src/app/services/turn.service.spec.ts), [`game-turn-transition-contracts.spec.ts`](../../src/app/services/game-turn-transition-contracts.spec.ts).
- Source : [manuel](../../public/assets/rules/karak-base.pdf), p. 2 à confirmer.
