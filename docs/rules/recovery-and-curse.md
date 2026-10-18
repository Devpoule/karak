# Récupération et malédiction

## `RECOVERY-REST` et `CURSE-MUMMY`

- Conformité métier : **vérifiée** pour la récupération, la guérison par fontaine et la malédiction de base.
- Implémentation : [`PlayerService.beginRecoveryTurn`](../../src/app/services/player.service.ts#beginRecoveryTurn), [`PlayerService.restoreCompletely`](../../src/app/services/player.service.ts#restoreCompletely), [`GameService.resolveTileEntry`](../../src/app/services/game.service.ts#resolveTileEntry), [`GameService.useHealingPortal`](../../src/app/services/game.service.ts#useHealingPortal).
- Règle : l’arrivée sur une fontaine arrête le déplacement et soigne complètement le héros ; une guérison complète lève aussi la malédiction. Le voyage par portail conserve son traitement dédié.
- Tests : [`player.service.spec.ts`](../../src/app/services/player.service.spec.ts), [`game.service.spec.ts`](../../src/app/services/game.service.spec.ts), [`game-tile-entry-contracts.spec.ts`](../../src/app/services/game-tile-entry-contracts.spec.ts).
- Source : [manuel](../../public/assets/rules/karak-base.pdf), p. 4–5 et résumé p. 8.
