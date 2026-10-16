# Préparation

## `PREP-HERO-DRAW`

- Conformité métier : **à vérifier**.
- Couverture technique : **partiellement testée**.
- Implémentation : [`GameService.drawHeroes`](../../src/app/services/game.service.ts#drawHeroes), [`PlayerService.drawHeroes`](../../src/app/services/player.service.ts#drawHeroes).
- Tests : [`game-lifecycle.spec.ts`](../../src/app/services/game-lifecycle.spec.ts), [`full-game-playthrough.spec.ts`](../../e2e/full-game-playthrough.spec.ts).
- Source : [manuel](../../public/assets/rules/karak-base.pdf), pages 1–2 ; pagination précise à confirmer.

Le code distribue six héros et les place sur la tuile de départ. La conformité détaillée du nombre de joueurs et de l’ordre de préparation reste à vérifier dans le manuel.
