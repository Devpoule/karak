# Bilan architectural post-refactor de `GameService`

> Audit documentaire de la consolidation 15. Aucun comportement métier, contrat public ou service n'est modifié par ce document.

## 1. État initial

Le document [`GAME_SERVICE_REFACTOR_PLAN.md`](./GAME_SERVICE_REFACTOR_PLAN.md), produit lors de la consolidation 08, décrivait `GameService` comme une façade d'orchestration concentrant :

- le cycle de vie et la configuration ;
- les tours, récupérations et transitions différées ;
- l'entrée dans les tuiles et l'exploration ;
- les équipements au sol ;
- les coffres, récompenses et malédictions ;
- les pouvoirs de héros ;
- la fin de partie et le classement ;
- l'orchestration appelée par l'IA.

Cette concentration reste réelle. Elle est toutefois compensée par des services spécialisés déjà existants (`PlayerService`, `TurnService`, `DungeonService`, `ExplorationService`, `CombatService`) et par une façade publique consommée directement par plusieurs composants et par `AiService`.

## 2. Modifications réalisées entre les consolidations 08 et 14

### Consolidation 10 — transition de tour

La transition de tour a été découpée en méthodes privées cohérentes :

- `getTurnTransitionContext()` prépare les données nécessaires ;
- `completeTurnTransition()` applique la transition différée ;
- `prepareActivePlayerTurn()` prépare le joueur actif ;
- `scheduleRecoveryTurnCompletion()` gère la reprise différée.

`endTurn()` reste le point d'entrée public. Les délais, l'invalidation des timers et les conditions de blocage ont été conservés.

### Consolidation 12 — entrée de tuile

`classifyTileEntry()` sépare la détection sans effet de bord de la résolution. La classification couvre notamment les tuiles vides, monstres, récompenses de monstres, coffres déjà résolus et cas de discrétion d'Aderyn.

Les mutations restent dans `resolveTileEntry()` : révélation, arrêt des mouvements, création des états `pending`, déclenchement du combat et préparation des récompenses.

### Consolidation 13 — préconditions de phase

`resolveTileEntry()` rejette désormais explicitement les appels hors de `playing`, avant toute révélation ou mutation. Cela corrige le déclenchement possible d'un combat pendant `setup`.

### Consolidation 14 — récompenses en attente

`getActivePendingReward()` centralise la garde commune utilisée par les opérations de collecte, remplacement, refus et résolution de malédiction. `pendingReward` et `remainingRewardsByTile` restent coordonnés par `consumePendingReward()`.

## 3. Comparaison avant / après

Les mesures suivantes sont prises sur l'état actuel de `main` après la consolidation 14. Les références historiques proviennent du plan de consolidation 08 et des bilans précédents ; elles ne constituent pas une mesure exécutée rétroactivement avec le même outil.

| Indicateur | État initial documenté | État actuel | Analyse |
| --- | ---: | ---: | --- |
| Lignes de `GameService` | façade déjà volumineuse | 1 349 | La taille reste élevée ; elle n'est pas un critère suffisant à elle seule. |
| Méthodes détectées | non chiffré dans le plan | 61 | 39 publiques et 22 privées selon le motif de déclaration actuel. |
| Dépendances directes | 9 collaborations | 9 collaborations principales | Pas de nouveau service ni de dépendance ajoutée par les consolidations 10–14. |
| Responsabilités | 9 domaines identifiés | mêmes 9 domaines | Les frontières internes sont plus lisibles, mais la façade demeure large. |
| États `pending` | combat, coffre, récompense, équipement, choix de jeton | mêmes états | Aucun regroupement risqué des modèles d'état n'a été introduit. |
| Duplications ciblées | gardes de transition et de récompense répétées | réduites localement | Les extractions portent sur des répétitions réellement identiques. |

La complexité est surtout structurelle : `resolveTileEntry()` et `initialize()` restent des points d'orchestration denses, tandis que les méthodes extraites réduisent la taille de leurs appelants sans déplacer les règles dans de nouvelles abstractions.

## 4. Évaluation des extractions

### `getTurnTransitionContext()` — à conserver

Responsabilité cohérente : capturer les préconditions et les données de transition avant la programmation du callback. La méthode réduit la charge cognitive de `endTurn()` et protège l'ordre des opérations. Son nom décrit correctement une lecture de contexte, sans effet de bord notable.

### `completeTurnTransition()` — à conserver

Responsabilité cohérente : exécuter la transition après expiration du délai. Elle conserve au même endroit l'invalidation, le changement de joueur et la préparation du tour suivant. L'indirection est justifiée par le caractère différé de l'opération.

### `classifyTileEntry()` — à conserver

Responsabilité pure et stable : reconnaître le contenu et les exceptions de classification. Elle ne consomme pas de jeton, ne modifie pas de tuile, ne crée pas de `pending` et ne déclenche pas de combat. La séparation réduit le risque de mélanger détection et effets de bord.

### `getActivePendingReward()` — à conserver

Responsabilité cohérente : exprimer une précondition partagée par plusieurs commandes publiques. Elle réduit une duplication exacte sans masquer les règles propres à chaque type de récompense. Elle ne modifie aucun état.

## 5. Risques résiduels

### Risques démontrés ou fortement sensibles

- `GameService` reste le coordinateur de nombreuses transitions et doit être modifié avec des tests de caractérisation.
- Les récompenses partielles reposent sur deux représentations coordonnées : le signal `pendingReward` et la `WeakMap` indexée par l'identité de la tuile.
- Les mutations directes de `Player` et `PlacedTile` rendent l'identité des objets importante pour les validations et les callbacks.
- `initialize()` doit continuer à réinitialiser tous les états transitoires, timers et cartes associées.
- Les actions IA et la transition de tour restent couplées par les conditions de phase, de joueur actif et de résolution bloquante.

### Risques couverts par les tests

- Récompenses multiples, collecte partielle et inventaire plein.
- Remplacement et refus d'équipement.
- Fin de partie après récompense du Dragon.
- Entrées de tuile invalides selon la phase.
- Invalidation des transitions et actions différées.
- Réinitialisation pendant une résolution.

### Risques encore insuffisamment couverts

- Séquences combinant changement de joueur, récompense partielle et callback IA différé dans le même scénario.
- Matrice complète des pouvoirs de héros pendant une récompense ou une transition.
- Interactions rares entre fin de partie, timer de transition et classement déjà en cours.
- Couverture des composants UI : la couverture applicative reste faible hors services, sans que cela démontre un défaut métier.

## 6. État des tests

Validation historique de référence de la consolidation 14 :

- **160 tests unitaires réussis** ;
- **14 tests E2E réussis** ;
- couverture métier : **80,51 % des lignes**, **69,95 % des branches** ;
- couverture applicative : **41,16 % des lignes**, **45,21 % des branches** ;
- build Angular réussi ;
- `git diff --check` réussi.

Les avertissements de budget Angular mentionnés ici décrivent cette campagne
historique ; la validation courante sans avertissement est consignée dans
`ROADMAP.md`.

## 7. Recommandations hiérarchisées

### A — Nécessaire

#### A1. Ajouter un scénario intégré IA + récompense partielle + transition

- Problème : la combinaison est identifiée comme sensible mais n'est pas couverte par un parcours unique.
- Méthodes : `endTurn()`, `consumePendingReward()`, opérations `pendingReward`, cadence de `AiService`.
- Bénéfice : détecter une mutation tardive ou un changement de joueur pendant une résolution.
- Risque : faible si le test est déterministe avec fake timers.
- Tests : scénario unitaire d'intégration ciblé, sans modification de production.
- Effort : faible à moyen.

Cette intervention est prioritaire avant toute extraction supplémentaire.

### B — Utile

#### B1. Documenter les invariants d'identité des récompenses

Documenter explicitement le lien entre `pending.player`, `activePlayer`, `pending.rewardTile` et `remainingRewardsByTile`. Bénéfice : faciliter les futures modifications sans déplacer les règles. Effort faible.

#### B2. Réduire progressivement `initialize()` uniquement si un état nouveau le justifie

La méthode connaît plusieurs services, mais l'orchestration de remise à zéro est actuellement cohérente. Une extraction ne serait utile qu'avec un groupe d'états autonome et des tests de reset dédiés. Effort moyen, risque moyen.

### C — Facultatif

#### C1. Découper davantage `resolveTileEntry()` par branche

Le bénéfice de lisibilité existe, mais la méthode est déjà sécurisée par `classifyTileEntry()` et les tests. Une extraction supplémentaire serait principalement esthétique tant qu'aucune branche ne forme un contrat indépendant. Effort moyen, risque élevé.

#### C2. Créer un service de récompenses

Non recommandé actuellement. Les composants et `AiService` utilisent `GameService` comme façade, et `PlayerService` possède déjà les opérations d'inventaire. Un nouveau service introduirait une indirection et des risques de synchronisation sans bénéfice démontré.

## 8. Décision architecturale proposée

`GameService` peut raisonnablement être conservé dans son architecture actuelle : une façade large mais stabilisée, s'appuyant sur des services spécialisés existants.

Une nouvelle refactorisation n'est pas nécessaire immédiatement. La prochaine intervention justifiée est A1, consacrée à un scénario de caractérisation combinant IA, récompense partielle et transition. Après ce test, une extraction supplémentaire ne devra être entreprise que si une complexité concrète reste mesurable et si elle réduit un risque identifié.

La création d'un nouveau service de récompenses ou une réécriture générale de `GameService` n'est pas recommandée à ce stade.
