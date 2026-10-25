# Exploration

## `EXP-TILE-DISCOVERY`

- Conformité métier : **à vérifier**.
- Couverture technique : **testée sur le flux ciblé**.
- Séquence numérique : tirage → révélation → direction → rotation → placement → résolution.
- Implémentation : [`ExplorationService`](../../src/app/services/exploration.service.ts), [`Board.confirmPendingTile`](../../src/app/components/board/board.ts#confirmPendingTile), [`AiService`](../../src/app/services/ai.service.ts).
- Raccordement : la validation conserve la règle actuelle du passage source ; les voisins latéraux ne constituent pas une contrainte supplémentaire dans le contrat existant.
- Tests : [`exploration.service.spec.ts`](../../src/app/services/exploration.service.spec.ts), [`exploration-recipe.spec.ts`](../../src/app/services/exploration-recipe.spec.ts), [`board.spec.ts`](../../src/app/components/board/board.spec.ts), [`ai.service.spec.ts`](../../src/app/services/ai.service.spec.ts).
- Source : [manuel](../../public/assets/rules/karak-base.pdf), p. 2–3 à confirmer.
