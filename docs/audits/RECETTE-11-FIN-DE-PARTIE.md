# KARAK — Recette fonctionnelle 11 : fin de partie

## Périmètre et verdict

Cette campagne couvre exclusivement `END-001` à `END-006`. Le manuel `public/assets/rules/karak-base.pdf`, pages 2 et 4, ainsi que le résumé p. 8, est la référence normative.

| Mécanisme | Statut avant | Statut après | Verdict |
|---|---|---|---|
| END-001 | Couvert par test | Conforme vérifié | la victoire contre le Dragon déclenche la récompense finale |
| END-002 | Couvert par test | Conforme vérifié | le rubis est attribué et vaut 1,5 point |
| END-003 | Couvert par test | Conforme vérifié | passage unique à `game-over` et arrêt des actions |
| END-004 | Couvert par test | Conforme vérifié | classement décroissant selon les trésors possédés |
| END-005 | À clarifier | Conforme vérifié | égalité conservée ; plusieurs vainqueurs possibles, aucun départage inventé |
| END-006 | Couvert par test | Conforme vérifié | écran final synchronisé et classement affiché |

## Référentiel normatif

Le manuel indique que la partie prend fin dès qu’un héros vainc le Dragon. Ce héros reçoit le trésor du Dragon, représenté par un rubis, mais le vainqueur final est le joueur ayant accumulé le plus de points de trésor. Un trésor classique vaut 1 point et le trésor du Dragon vaut 1,5 point.

Le manuel ne prévoit aucun critère de départage en cas d’égalité. L’application conserve donc tous les joueurs dont le score est égal au meilleur score dans `winners`. Cette convention représente directement l’absence de départage normatif et ne contredit pas le manuel.

## Résultats détaillés

### END-001 — déclenchement

`collectPendingTreasure` consomme la récompense du Dragon. Lorsque la récompense finale est consommée, `consumePendingReward` appelle `finishGame`. La phase devient `game-over` après attribution du trésor, et non au simple démarrage du combat.

Résultat : conforme vérifié.

### END-002 — rubis et score

Le trésor `treasure` du jeton Dragon est converti en `dragon-ruby` par `collectPendingTreasure`. `calculateTreasurePoints` attribue 1,5 point au rubis. Les tests vérifient l’attribution unique et le score exact.

Résultat : conforme vérifié.

### END-003 — arrêt de la partie

`finishGame` est idempotent : un second appel après `game-over` est ignoré. La méthode fige le classement, vide les décisions facultatives concernées, arrête les mouvements et invalide les actions de résolution qui exigent la phase `playing`. Les tests vérifient également qu’aucune collecte répétée ne modifie les trésors.

Résultat : conforme vérifié.

### END-004 — classement

Le classement est construit à partir des trésors effectivement possédés, trié par score décroissant. Les objets non récupérés et les équipements ne sont pas comptabilisés. Les tests couvrent notamment le joueur ayant le plus de trésors, le rubis à 1,5 point et les scores nuls.

Résultat : conforme vérifié.

### END-005 — égalités

Le manuel ne donne pas de règle de départage. `finishGame` conserve tous les joueurs dont `points === bestScore` dans `winners`, tandis que `finalRanking` conserve l’ordre déterministe du tableau en cas d’égalité. Cet ordre d’affichage est une convention de présentation, pas un départage du vainqueur.

Résultat : conforme vérifié, avec plusieurs vainqueurs possibles.

### END-006 — écran final

`Game` affiche `game-over`, le classement final, les points et la liste des vainqueurs. Le parcours Playwright jusqu’au Dragon confirme la synchronisation entre la récompense métier et l’interface : le rubis et le libellé de vainqueur sont visibles, le plateau n’est plus affiché.

Résultat : conforme vérifié.

## Scénarios et preuves

- Victoire contre le Dragon après combat déterministe.
- Attribution unique du rubis et calcul à 1,5 point.
- Joueur adverse ayant un score supérieur au vainqueur du Dragon.
- Conservation des récompenses restantes jusqu’à leur consommation.
- Refus d’une collecte par un joueur inactif ou après `game-over`.
- Classement avec scores nuls et égalités conservées comme vainqueurs multiples.
- Affichage navigateur du classement final et absence du plateau après la fin.

## Tests exécutés

Tests Angular ciblés : les tests `GameService`, `PlayerService`, `AiService`, les transitions de tour et les contrats d’entrée couvrent le Dragon, les récompenses, les scores, les égalités et les gardes `game-over`.

Test Playwright principal :

```text
npx playwright test e2e/full-game-playthrough.spec.ts
Résultat : scénario réussi ; victoire contre le Dragon, rubis visible, écran « Fin de la partie » affiché et plateau retiré.
```

Validations globales :

```text
Tests Angular : 317 réussis.
Build Angular : réussi.
Références documentaires : 36 fichiers Markdown valides.
git diff --check : aucune erreur bloquante.
```

Le navigateur signale `NG0913` sur la taille intrinsèque de `assets/logo.png`, sans rapport avec la fin de partie.

## Limites

- Le scénario Playwright de fin utilise une victoire déterministe préparée par fixture d’état, afin d’éviter une partie aléatoire complète.
- Les variantes mobiles et `prefers-reduced-motion` sont couvertes indirectement par les scénarios smoke existants, pas par un scénario END dédié.
- La phase K n’est pas commencée.

