# Récupération et malédiction

## `RECOVERY-REST` et `CURSE-MUMMY`

- Conformité métier : **à vérifier**.
- Couverture technique : **testée** pour la récupération, **partiellement testée** pour la malédiction.
- Implémentation : [`PlayerService.beginRecoveryTurn`](../../src/app/services/player.service.ts#beginRecoveryTurn), [`GameService.useHealingPortal`](../../src/app/services/game.service.ts#useHealingPortal).
- Tests : [`player.service.spec.ts`](../../src/app/services/player.service.spec.ts), [`game.service.spec.ts`](../../src/app/services/game.service.spec.ts).
- Source : [manuel](../../public/assets/rules/karak-base.pdf), p. 4 à confirmer.
