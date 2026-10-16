# Combat

## `COMBAT-RESOLUTION`

- Conformité métier : **à vérifier**.
- Couverture technique : **testée**.
- Implémentation : [`CombatService`](../../src/app/services/combat.service.ts), [`CombatOverlayComponent.resolveCombat`](../../src/app/components/combat-overlay/combat-overlay.ts#resolveCombat).
- Tests : [`combat.service.spec.ts`](../../src/app/services/combat.service.spec.ts), [`combat-fixture.spec.ts`](../../e2e/combat-fixture.spec.ts).
- Source : [manuel](../../public/assets/rules/karak-base.pdf), p. 3–4 à confirmer.

## `COMBAT-MAGIC-SHOT`

- Conformité métier : **à vérifier**.
- Couverture technique : **partiellement testée**.
- Implémentation : [`CombatService`](../../src/app/services/combat.service.ts).
- Tests : [`combat.service.spec.ts`](../../src/app/services/combat.service.spec.ts).
