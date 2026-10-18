# KARAK — Recette fonctionnelle 05 : pièces et événements

## Périmètre et verdict global

Cette campagne couvre exclusivement `ROOM-001` à `ROOM-012`. Le manuel officiel du jeu de base (`public/assets/rules/karak-base.pdf`, pages 3 à 5) est la référence normative. Les combats eux-mêmes et le calcul de leur résultat ne sont pas audités ici.

Verdict de la recette initiale : 11 mécanismes conformes vérifiés. Après le correctif ciblé, `ROOM-009` est conforme vérifié : l'ouverture est facultative pour un humain et l'IA conserve une stratégie déterministe d'ouverture.

## Référentiel normatif

- À l'entrée dans une pièce nouvellement découverte, un jeton est tiré du sac et placé sur la pièce.
- Avec la capacité de Taia, deux jetons sont tirés ; le joueur en choisit un et remet l'autre dans le sac.
- Un jeton de monstre déclenche un combat ; les calculs de combat appartiennent à la phase E.
- Un trésor peut être pris avec une clé ; le manuel indique que le joueur peut le prendre, consomme la clé et termine son tour.
- Un élément non pris reste sur la tuile pour une visite ultérieure.
- La tuile de départ et une pièce déjà résolue ne déclenchent pas une nouvelle pioche.

Les quantités numériques utilisées dans les tests proviennent des définitions de jetons existantes. Le comportement lorsque le sac est vide est traité comme une convention numérique de l'application : aucune révélation supplémentaire n'est possible et aucun jeton n'est consommé.

## Sous-contrôles et résultats

| Mécanisme | Sous-contrôles | Preuves | Résultat |
|---|---|---|---|
| `ROOM-001` | Classification pièce/couloir, contenu absent/présent, entrée humaine et IA | `GameService.resolveTileEntry`, `classifyTileEntry`; `game-tile-entry-contracts.spec.ts`; Playwright `full-game-playthrough.spec.ts` | **Conforme vérifié** |
| `ROOM-002` | Pièce nouvelle, pièce connue vide, pièce déjà pourvue d'un jeton | `revealNewRoom` et garde `tile.tokenId`; tests `ne pioche pas de jeton...`, `ne traite pas un coffre déjà retourné...` | **Conforme vérifié** |
| `ROOM-003` | Un tirage par pièce nouvelle, placement du jeton, consommation exacte du sac | `TokenBagService.draw`, `revealNewRoom`; test `révèle une salle nouvellement explorée...` | **Conforme vérifié** |
| `ROOM-004` | Taia non maudite, deux tirages, suspension du déplacement, humains/IA | `revealNewRoom`, `pendingTokenChoice`; `game.service.spec.ts`, `ai.service.spec.ts`, `game-tile-entry-contracts.spec.ts`; `taia-powers.spec.ts` | **Conforme vérifié** |
| `ROOM-005` | Choix d'un jeton, retour de l'autre, résolution unique, reprise | `choosePendingToken`; nouveau test de comptage du sac et `taia-powers.spec.ts` | **Conforme vérifié** |
| `ROOM-006` | Retour dans une pièce résolue sans nouvelle pioche ni nouvel événement | `classifyTileEntry`, `tokenFace`; `game-tile-entry-contracts.spec.ts` | **Conforme vérifié** |
| `ROOM-007` | Pièce vide, poursuite du tour, absence de consommation de jeton | nouveau test `ne pioche pas de jeton en entrant dans une pièce déjà connue et vide` | **Conforme vérifié** |
| `ROOM-008` | Jeton monstre sur pièce nouvellement révélée, blocage des mouvements, entrée dans le combat | `CombatService.startCombat` via `resolveTileEntry`; tests d'entrée et tests IA | **Conforme vérifié** |
| `ROOM-009` | Coffre sans clé, choix humain ouvrir/continuer, consommation clé/trésor, fin du tour, reprise, comportement IA | `resolveTileEntry`, `openPendingTreasure`, `declinePendingTreasure`; tests service, IA et `e2e/room-009-chest.spec.ts` | **Conforme vérifié** |
| `ROOM-010` | Récompense ou coffre non récupéré, conservation sur la tuile, récupération ultérieure | `remainingRewardsByTile`, état du jeton; `game-tile-entry-contracts.spec.ts`, tests récompenses | **Conforme vérifié** |
| `ROOM-011` | Double entrée, double clic logique, jeton déjà retourné, résolution pending unique | garde `hasPendingTileResolution`, `tokenFace`, `pending*`; tests de répétition | **Conforme vérifié** |
| `ROOM-012` | Suspension pendant choix/combat, reprise après résolution, fin si aucun mouvement | `TurnService.stopMovements`, `resumeSuspendedMovements`, `endTurn`; `taia-powers.spec.ts`, tests service et navigateur | **Conforme vérifié** |

## Correction ciblée de ROOM-009

La cause racine était l'appel direct à `openPendingTreasure()` dans `resolveTileEntry` dès qu'une clé était détectée. Le chemin corrigé crée désormais une résolution `pendingTreasure` sans mutation de la clé ni du coffre. Le composant présente `Ouvrir le coffre` et `Continuer`.

`openPendingTreasure()` conserve la résolution existante : suppression de la clé, attribution unique du trésor, retrait du jeton et fin du tour. `declinePendingTreasure()` retire uniquement l'état pending et restaure les mouvements suspendus ; si aucun mouvement n'est suspendu, le tour se termine normalement. L'IA appelle explicitement `openPendingTreasure()` depuis `resolveMandatoryAction`, ce qui conserve une décision automatique propre à l'IA.

## Scénarios exécutés

### Tests Angular ciblés

Commande :

```text
npx ng test --no-watch --no-progress --include='src/app/services/game-tile-entry-contracts.spec.ts' --include='src/app/services/game.service.spec.ts' --include='src/app/services/ai.service.spec.ts'
```

Résultat : **147 tests passés**, 3 fichiers.

Preuves nouvelles :

- pièce connue et vide : le sac reste à une unité et aucune résolution pending n'est créée ;
- Taia : deux jetons sont tirés, un seul est conservé, l'autre est remis dans le sac, puis le choix est clôturé.

### Vérifications navigateur

Commande :

```text
npx playwright test e2e/taia-powers.spec.ts e2e/smoke.spec.ts e2e/full-game-playthrough.spec.ts
```

Résultat : **17 scénarios passés**.

Le scénario `e2e/taia-powers.spec.ts` vérifie l'affichage du choix de jeton, la sélection, l'absence de résolution pending et la reprise du compteur de mouvements. Les parcours smoke et intégral vérifient l'entrée sur le plateau et la continuité d'une partie réelle. `e2e/room-009-chest.spec.ts` vérifie les deux décisions humaines : refus avec conservation de la clé et reprise du tour, puis ouverture confirmée avec consommation unique et transition de fin de tour.

## Limites

- Le navigateur ne fournit pas encore un scénario entièrement piloté par l'interface pour chaque type de jeton de pièce ; plusieurs preuves sont donc établies directement sur les services métier.
- Les calculs, relances et pouvoirs internes au combat sont hors périmètre.
- Le manuel ne décrit pas explicitement le cas du sac vide ; le comportement observé est documenté comme convention applicative.
- Les avertissements Angular `NG0913` concernant la taille intrinsèque de l'image du logo ont été observés pendant Playwright ; ils ne concernent pas les mécanismes ROOM audités.

## Statuts avant/après

Avant la recette initiale : 10 mécanismes « Couvert par test », `ROOM-007` « Implémenté non vérifié », `ROOM-009` « À clarifier ». Après la recette initiale, `ROOM-009` était « Écart constaté ».

Après le correctif : 12 « Conforme vérifié » dans la phase D.

Les autres phases n'ont pas été modifiées.
