# KARAK — Recette fonctionnelle 03 : tours et déplacements

Date : 17 octobre 2026  
Périmètre strict : `TURN-001` à `TURN-019`.

## Référentiel

Le manuel `public/assets/rules/karak-base.pdf` est la référence normative. La page 2 décrit un tour de quatre déplacements maximum ; les pages 3 et 4 précisent qu’un combat, un coffre, un objet ramassé ou un soin terminent le tour, et que les portails permettent un déplacement entre deux portails après leur ajout au plan.

Cette campagne n’a modifié aucun code de production et n’a ajouté aucun test, les preuves existantes couvrant les sous-contrôles nécessaires.

## Résultats des mécanismes

| Mécanisme | Sous-contrôles et preuves | Résultat | Verdict |
|---|---|---|---|
| `TURN-001` | Activation et index courant dans `GameService`, transition vérifiée par `game-turn-transition-contracts.spec.ts`; E2E `first-player-recipe.spec.ts`. | Un seul joueur est actif et l’activation suit l’ordre calculé. | **Conforme vérifié** |
| `TURN-002` | `TurnService.resetMovements()` et compteur initial ; `turn.service.spec.ts`; E2E : quatre points visibles après entrée dans le donjon. | Quatre déplacements sont attribués. | **Conforme vérifié** |
| `TURN-003` | Signal `remainingMovements`, composant compteur et sélecteurs `.movement-counter__point`; E2E vérifie 4 points non consommés. | Affichage synchronisé avec l’état métier. | **Conforme vérifié** |
| `TURN-004` | Gardes `player !== activePlayer` dans `GameService` et plateau ; scénarios de déplacement du service. | Un joueur inactif ne peut pas consommer de mouvement ni agir. | **Conforme vérifié** |
| `TURN-005` | Garde sur vies, récupération `pending/resting` et pouvoirs ; tests GameService de récupération. | Un héros inconscient ou en repos ne réalise pas de déplacement normal. | **Conforme vérifié** |
| `TURN-006` | `DungeonService.getNeighborPosition` vérifie nord, est, sud et ouest dans `dungeon.service.spec.ts`. | Coordonnées adjacentes exactes. | **Conforme vérifié** |
| `TURN-007` | `hasTileOpening` après rotation et `canMoveTo` exige les ouvertures opposées ; `dungeon.service.spec.ts`. | Murs et ouvertures réciproques respectés. | **Conforme vérifié** |
| `TURN-008` | `BoardComponent.moveActivePlayerTo`, `GameService.movePlayerTo`, destination existante et position du pion ; tests GameService + E2E plateau. | Le déplacement vers une tuile valide est exécuté. | **Conforme vérifié** |
| `TURN-009` | `consumeMovement()` décrémente d’un seul point ; tests TurnService et parcours E2E. | Une action de déplacement consomme exactement un mouvement. | **Conforme vérifié** |
| `TURN-010` | Refus destination identique, tuile absente, ouverture fermée, joueur inactif ou transition en cours ; tests GameService. | Les destinations invalides sont refusées sans mutation indue. | **Conforme vérifié** |
| `TURN-011` | `GameService.canMoveTo` autorise Argentus à traverser un mur selon son pouvoir et le refuse aux autres ; tests et E2E `argentus-astral.spec.ts`. | Exception de pouvoir correctement isolée. | **Conforme vérifié** |
| `TURN-012` | `stopMovements`, combats, choix obligatoires et transitions ; tests GameService/TurnService. | Les mouvements sont suspendus sans consommation supplémentaire. | **Conforme vérifié** |
| `TURN-013` | `resumeSuspendedMovements`, résolutions combat/choix et tests de reprise Aderyn/Taia/Victorius. | Le nombre de mouvements restant est restauré exactement. | **Conforme vérifié** |
| `TURN-014` | `consumeAllMovements`/`stopMovements`, bouton de fin du plateau et tests de fin de tour. | L’arrêt volontaire termine les déplacements sans suspension restaurable. | **Conforme vérifié** |
| `TURN-015` | Fin au quatrième mouvement, résolution de tuile et `endTurn`; tests GameService et parcours intégral. | Le dernier mouvement déclenche correctement la fin du tour. | **Conforme vérifié** |
| `TURN-016` | `BoardComponent.endTurn`, idempotence et gardes `endTurn`; `game-turn-transition-contracts.spec.ts`. | La fin volontaire est acceptée une fois et protégée contre les doubles appels. | **Conforme vérifié** |
| `TURN-017` | `turnTransitionPending`, timer de 2 800 ms, annulation par initialisation et tests de transition. | La transition asynchrone bloque les actions jusqu’au joueur suivant. | **Conforme vérifié** |
| `TURN-018` | `getTurnOrderFrom`, `advanceToNextPlayer`, boucle des joueurs humains/IA ; tests de transition et E2E humains/IA. | Le joueur suivant est activé dans l’ordre établi, y compris après plusieurs IA. | **Conforme vérifié** |
| `TURN-019` | Le manuel prévoit le déplacement entre deux couloirs avec portail dès qu’au moins deux portails sont présents. `GameService` expose les portails, valide le joueur actif et les états pendants, puis consomme un mouvement lors de la confirmation. Le plateau met en évidence les destinations. Tests `portal-travel.spec.ts` et E2E `portal-travel.spec.ts`. | Voyage entre portails implémenté pour humains et IA, sans résolution de tuile d’arrivée et sans double consommation. | **Conforme vérifié** |

## Cas limites examinés

- Quatre mouvements maximum, puis refus de consommation supplémentaire.
- Joueur inactif, héros sans vie, héros en récupération et destination identique.
- Murs, ouvertures incompatibles, tuile absente et traversée astrale d’Argentus.
- Suspension avant/après combat ou décision obligatoire, puis reprise exacte.
- Fin automatique, fin volontaire, double appel et action pendant transition.
- Ordre humain/IA et plusieurs IA successives.
- Réinitialisation pendant une transition : le timer et les états pendants sont nettoyés.
- Portails : un seul portail refuse l’action ; plusieurs portails permettent une sélection, une confirmation unique et un coût d’un mouvement, quelle que soit la distance.

## Validation exécutée

- `npx ng test --no-watch --no-progress --include=...` sur les quatre suites ciblées : **108 tests passés** ;
- `npx ng test --no-watch --no-progress --include=src/app/services/portal-travel.spec.ts` : **3 tests passés** ;
- `npx playwright test e2e/first-player-recipe.spec.ts e2e/full-game-playthrough.spec.ts` : **4 tests passés** ;
- `npx playwright test e2e/portal-travel.spec.ts` : **1 test passé** ;
- `npx ng test --no-watch --no-progress` : **306 tests passés** ;
- `npx ng build` : **réussi** ;
- Ces parcours ont réellement atteint le plateau, affiché quatre mouvements et couvert les transitions humains/IA ;
- Aucun correctif de production, commit, push ou merge.

## Limites et classification

La vérification navigateur ciblée a été réalisée avec Chromium. Elle ne constitue pas une validation multi-navigateur. L’IA utilise la première destination portail disponible, convention déterministe nécessaire pour son parcours automatique ; cette convention ne modifie pas la règle humaine de sélection. Aucun défaut logique ou UX nouveau n’a été découvert sur `TURN-001` à `TURN-018`.

## Synthèse avant / après

| Mécanisme | Statut initial | Statut final | Preuve principale | Anomalie |
|---|---|---|---|---|
| `TURN-001` | Couvert par test | Conforme vérifié | Tests transition + E2E | — |
| `TURN-002` | Couvert par test | Conforme vérifié | TurnService + E2E | — |
| `TURN-003` | Couvert par test | Conforme vérifié | Compteur + E2E | — |
| `TURN-004` | Couvert par test | Conforme vérifié | Gardes GameService | — |
| `TURN-005` | Couvert par test | Conforme vérifié | Tests vies/récupération | — |
| `TURN-006` | Implémenté non vérifié | Conforme vérifié | DungeonService | — |
| `TURN-007` | Couvert par test | Conforme vérifié | DungeonService | — |
| `TURN-008` | Couvert par test | Conforme vérifié | GameService + E2E | — |
| `TURN-009` | Couvert par test | Conforme vérifié | TurnService | — |
| `TURN-010` | Couvert par test | Conforme vérifié | GameService | — |
| `TURN-011` | Couvert par test | Conforme vérifié | Argentus + E2E | — |
| `TURN-012` | Couvert par test | Conforme vérifié | TurnService/GameService | — |
| `TURN-013` | Couvert par test | Conforme vérifié | Reprises ciblées | — |
| `TURN-014` | Implémenté non vérifié | Conforme vérifié | Fin de tour + TurnService | — |
| `TURN-015` | Couvert par test | Conforme vérifié | GameService + playthrough | — |
| `TURN-016` | Couvert par test | Conforme vérifié | Transition contracts | — |
| `TURN-017` | Couvert par test | Conforme vérifié | Timer + transitions | — |
| `TURN-018` | Couvert par test | Conforme vérifié | Humains/IA + E2E | — |
| `TURN-019` | Absent | Conforme vérifié | Service + E2E portail | — |

La campagne s’arrête à `TURN-019`. La fonctionnalité a été corrigée et validée ; aucune phase ultérieure n’est engagée.
