# Aderyn

Pouvoirs : `HERO-ADERYN-BACKSTAB`, `HERO-ADERYN-SNEAK`.

Conformité métier : **vérifiée**. Marche rampante : Aderyn peut choisir de combattre ou de passer discrètement lorsqu’elle rencontre un monstre, y compris sur une pièce nouvellement découverte. Le pouvoir reste désactivé sous malédiction. Implémentation : [`GameService.resolveTileEntry`](../../../src/app/services/game.service.ts#resolveTileEntry), [`GameService.choosePendingSneak`](../../../src/app/services/game.service.ts#choosePendingSneak). Tests ciblés : [`game.service.spec.ts`](../../../src/app/services/game.service.spec.ts), [`aderyn-sneak.spec.ts`](../../../e2e/aderyn-sneak.spec.ts). Source officielle : manuel, p. 5–6.
