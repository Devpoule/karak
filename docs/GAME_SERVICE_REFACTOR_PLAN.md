# Plan de refactorisation progressive de `GameService`

> Document d'audit — Consolidation 08. Aucun service ni comportement n'est modifié par cette consolidation.

## 1. Périmètre et état de référence

L'audit porte sur `src/app/services/game.service.ts` et ses usages actuels. La branche d'audit est `audit/game-service-responsibilities`.

État de référence validé avant l'audit :

- `main`, `origin/main` et `github/main` sont synchronisés sur `55eced0` après intégration de la consolidation 07 ;
- la consolidation 07 est enregistrée dans `261ad78` ;
- 129 tests unitaires et 14 tests E2E sont verts ;
- le build Angular est réussi, avec les avertissements de budget existants ;
- aucune règle métier ni aucun contrat public n'est modifié dans ce document.

## 2. Cartographie de l'architecture actuelle

### Dépendances directes de `GameService`

`GameService` dépend directement de neuf collaborations :

| Dépendance | Responsabilité déjà identifiée | Usage dans `GameService` |
| --- | --- | --- |
| `DungeonService` | plateau, tuiles, voisinage, salles | placement initial, entrées, fontaines, positions |
| `ExplorationService` | pioche et tuile en attente | exploration, blocage d'une résolution |
| `TileDeckService` | pioche des tuiles | initialisation et remise à zéro |
| `TokenBagService` | sachet de jetons | initialisation et remise à zéro |
| `PlayerService` | joueurs, héros, inventaires, positions | presque tous les parcours joueur |
| `TurnService` | mouvements disponibles et suspension | mouvements, repos, changement de tour |
| `CombatService` | combat et état de combat | initialisation et détection des résolutions |
| `ToastService` | notifications | annonces de récompenses et d'événements |
| catalogue héros/équipements/jetons | définitions statiques | libellés, capacités et récompenses |

Les composants qui consomment directement `GameService` sont principalement `GameSetup`, `Board`, `CombatOverlay`, `GameHeader`, `InventoryPanel`, `PlayerHud` et la page `Game`. `AiService` l'utilise également comme façade de résolution et d'action.

### États publics principaux

Les signaux de cycle de vie sont `phase`, `setupStep`, `activePlayerIndex`, `firstPlayerRolls`, `firstPlayerContenders`, `firstPlayerIndex`, `finalRanking` et `winners`.

Les résolutions en attente sont représentées séparément par `pendingTreasure`, `pendingReward`, `pendingGroundEquipment` et `pendingTokenChoice`. `hasPendingTileResolution` les agrège avec l'état de combat.

Les états transitoires complémentaires sont `turnTransitionPending`, `xanrosSubstitutionSelectionOpen`, `recoveryRevision`, `groundEquipmentRevision`, la carte des équipements au sol et la `WeakMap` des récompenses restantes par tuile.

## 3. Responsabilités de `GameService`

### 3.1 Initialisation et cycle de vie

Méthodes : `initialize`, `isInitialized`, `isGameInProgress`, `initializeCombat`, `initializeDungeon`, `initializeExploration`, `initializeTileDeck`, `initializeTokenBag`, `ensureStartTileExists`.

États modifiés : phase, étapes de préparation, états en attente, classement, équipements au sol, récompenses restantes et timers de transition. Les services physiques sont réinitialisés ici.

Risque : `initialize` connaît le détail de presque tous les services et constitue un point de remise à zéro global. C'est une orchestration légitime, mais sensible aux nouveaux états oubliés.

Tests : `game-lifecycle.spec.ts`, `game.service.spec.ts`, scénarios E2E d'abandon et de nouvelle partie.

### 3.2 Configuration et lancement de partie

Méthodes : `initializePlayers`, `goBackToSetupStep`, `continueAfterHeroDraw`, `goToNextSetupStep`, `drawHeroes`, `placeHeroesOnStart`, `rollPlayerForFirstPlayer`, `resolveFirstPlayerRoll`, `isFirstPlayerContender`, `startAdventure`.

Dépendances : `PlayerService`, `DungeonService`, `TurnService`. Les résultats de dés et les étapes de configuration sont conservés dans les signaux du service.

Observation : la validation des préconditions est répétée méthode par méthode. Cette répétition est lisible et protège les transitions, mais doit rester couverte avant toute extraction.

### 3.3 Gestion des tours et récupération

Méthodes : `endTurn`, `prepareActivePlayerTurn`, `scheduleRecoveryTurnCompletion`, `resumeMovementsAfterUnstoppable`, `getTurnOrderFrom`.

États modifiés : `turnTransitionPending`, `activePlayerIndex`, `recoveryRevision`, mouvements de `TurnService`, état de récupération de `PlayerService`.

Effets différés : `turnTransitionTimer` et `queueMicrotask` pour finir un tour de repos. `endTurn` bloque explicitement les transitions lorsque l'exploration, le combat ou une récompense est encore en attente.

Risque élevé : la transition dépend à la fois de l'état du service et d'un callback différé. `initialize` annule le timer, mais le contrat doit rester testé avec les changements de phase et de joueur.

### 3.4 Déplacements, exploration et entrée dans une tuile

Méthodes : `revealNewRoom`, `resolveTileEntry`, `choosePendingToken`, `getHealingFountains`, `useHealingPortal`.

Dépendances : `DungeonService`, `ExplorationService`, `TokenBagService`, `PlayerService`, `CombatService`.

`resolveTileEntry` orchestre plusieurs branches : salle nouvellement révélée, combat, coffre, récompense, équipement au sol et choix de jeton. Il constitue le point de concentration métier le plus important.

Risque : cette méthode mélange détection de contenu, mutations de tuiles, création d'états `pending`, délégation au combat et déclenchement du tour suivant.

### 3.5 Inventaires et équipements

Méthodes : `dropInventoryEquipment`, `getGroundEquipment`, `dropEquipment`, `offerGroundEquipment`, `isGroundEquipmentAvailable`, `consumeGroundEquipment`, `offerGroundEquipmentAt`, `collectGroundEquipment`, `replaceGroundEquipment`, `leaveGroundEquipment`.

Dépendances : `PlayerService`, `DungeonService`, `TurnService`, `ToastService`.

Observation : la capacité d'inventaire est déléguée à `PlayerService`, tandis que `GameService` gère l'offre, la consommation au sol, les toasts et la fin de tour. Cette séparation est réutilisable et ne justifie pas encore un nouveau service.

### 3.6 Trésors, récompenses et malédictions

Méthodes : `openPendingTreasure`, `consumePendingReward`, `collectPendingEquipment`, `collectPendingTreasure`, `replacePendingEquipment`, `cursedPlayer`, `getPendingCurseTargets`, `resolvePendingCurse`, `leavePendingReward`, `finishGame`.

Dépendances : `PlayerService`, `CombatService`, `TurnService`, `ToastService`, catalogue des équipements et trésors.

Risque élevé : les récompenses partielles sont conservées dans `remainingRewardsByTile` et dans `pendingReward`. Toute extraction doit préserver l'identité des tuiles et les conditions d'appartenance au joueur actif.

### 3.7 Pouvoirs des héros

Méthodes : `openXanrosSubstitution`, `cancelXanrosSubstitution`, `confirmXanrosSubstitution`, `resumeMovementsAfterUnstoppable`, `resolveHoranReincarnation`.

Observation : ces pouvoirs sont des règles spécialisées branchées dans des parcours généraux de déplacement, de combat ou de récompense. Ils sont actuellement peu nombreux mais augmentent le couplage de la façade.

### 3.8 Fin de partie et classement

Méthodes : `finishGame`, `collectPendingTreasure`, accès à `finalRanking` et `winners`.

`finishGame` fige le classement, passe la phase à `game-over` et annule le timer de transition. Cette responsabilité doit rester proche de la coordination du cycle de vie tant qu'aucun contrat de classement indépendant n'est nécessaire.

### 3.9 Orchestration avec l'IA

`AiService` appelle `resolveTileEntry`, les résolutions de récompense, `endTurn`, les pouvoirs et les opérations d'équipement. `GameService` reste la façade qui vérifie phase, joueur actif et états bloquants.

La cadence asynchrone appartient à `Game`, pas à `GameService`. Les tests de `Game` ajoutés en consolidation 07 couvrent l'invalidation par `aiRunId` et la destruction du composant.

## 4. Analyse SOLID, DRY et Clean Code

### Responsabilité concentrée

`GameService` cumule orchestration de cycle de vie, transitions, entrées de tuiles, inventaires, récompenses, pouvoirs et classement. Le problème est confirmé par la taille et le nombre de dépendances, mais une extraction massive serait risquée car les composants et `AiService` utilisent directement la façade.

### Mélange orchestration/règles

`resolveTileEntry` décide du type de contenu, modifie les jetons, installe les états `pending` et peut déclencher `endTurn`. C'est le meilleur candidat pour une réduction progressive, après caractérisation de chaque branche.

### Duplication limitée

Les validations `phase() === 'playing'`, joueur actif et absence de résolution sont répétées dans plusieurs méthodes. Elles expriment des garde-fous métier importants ; une abstraction commune ne doit être introduite que si elle conserve des messages et des contrats clairs.

### Couplage public

Les templates appellent directement de nombreuses méthodes de `GameService`. Cela rend le service difficile à faire évoluer sans adapter plusieurs composants, mais fournit aussi un contrat observable. Les premières étapes doivent donc préserver la façade et déléguer en interne.

### Mutations d'état

Les signaux sont centralisés, mais certaines mutations portent directement sur les objets `Player` et `PlacedTile`. Les invariants d'identité (`pending.player === activePlayer`, tuile encore porteuse du contenu) sont essentiels et doivent rester testés avant extraction.

### Dépendances circulaires

La cartographie statique ne montre pas de dépendance directe circulaire entre les services. Le couplage est surtout comportemental : `GameService` orchestre `CombatService` et `ExplorationService`, tandis que les composants et `AiService` réinjectent leurs résultats dans `GameService`.

## 5. Risques métier et couverture associée

| Risque | Protection existante | Lacune à combler |
| --- | --- | --- |
| transition setup → playing | `game-lifecycle.spec.ts`, E2E | séquences invalides plus exhaustives |
| abandon et reset | tests E2E et `initialize` | callback différé du service après reset |
| pending combat/coffre/récompense | `game.service.spec.ts`, E2E | séquences combinées et abandon intermédiaire |
| changement de tour | `turn.service.spec.ts`, `game.service.spec.ts` | timer invalidé par phase et réinitialisation |
| IA différée | `game-async-lifecycle.spec.ts` | interaction avec le timer de transition du service |
| inventaire plein | tests IA et service | matrice équipement/clé/trésor plus explicite |
| récompenses partielles | `game.service.spec.ts` | plusieurs récompenses avec changement de tour |
| pouvoirs des héros | tests ciblés existants | interaction pouvoir + pending + reset |
| fin de partie | `game.service.spec.ts` | fin pendant transition différée |

## 6. Couverture Vitest

La commande actuelle instrumente l'ensemble du graphe chargé par les tests. L'ajout du test de `Game` importe le composant, son template et plusieurs composants enfants ; ces fichiers apparaissent donc dans le dénominateur. La couverture globale est passée à 37,10 % lignes et 44,19 % branches, alors que le groupe des services reste à 73,33 % instructions, 67,65 % branches, 79,58 % fonctions et 78,66 % lignes.

Cette variation ne signifie pas une baisse de couverture des services : elle reflète un périmètre applicatif plus large.

Configuration recommandée, à réaliser dans une intervention séparée :

1. conserver la commande globale pour mesurer l'application chargée par la suite complète ;
2. ajouter une commande métier ciblant explicitement `src/app/services/**/*.ts`, avec rapport séparé ;
3. conserver les tests de composants dans une mesure applicative distincte ;
4. ne pas exclure les services ou composants métier pour améliorer artificiellement les pourcentages ;
5. ne pas ajouter de seuil global avant d'avoir stabilisé les deux périmètres.

La configuration actuelle ne doit pas être modifiée dans cet audit.

## 7. Plan de refactorisation proposé

### Étape 1 — Contrats et snapshots d'état

Objectif : documenter et tester les préconditions publiques de `GameService`.

Fichiers : tests `game.service.spec.ts`, `game-lifecycle.spec.ts`, documentation des invariants.

Risque : faible. Critère : tests verts sans modification de comportement. Retour arrière : suppression des tests/documentation uniquement.

### Étape 2 — Encapsuler la transition de tour

Objectif : isoler le timer, les gardes de transition et la récupération tout en conservant `endTurn()` comme façade publique.

Réutiliser `TurnService` et les mécanismes existants ; ne pas créer automatiquement un nouveau service.

Tests préalables : fake timers, reset pendant transition, pending combat/récompense, IA contre IA.

Risque : élevé mais localisé. Critère : aucun changement des délais ni des transitions observables.

### Étape 3 — Réduire `resolveTileEntry`

Objectif : séparer la classification de contenu de l'application de la résolution, avec des fonctions privées ou un objet de décision avant toute nouvelle abstraction.

Tests préalables : salle, combat, coffre, récompense, équipement, choix de jeton et entrée répétée.

Risque : très élevé. Cette étape doit être découpée par branche et réversible par petits commits.

### Étape 4 — Stabiliser les récompenses partielles

Objectif : regrouper les opérations de `pendingReward` et leurs invariants sans changer les contrats consommés par `Board` et `AiService`.

Réutiliser `PlayerService` pour les capacités d'inventaire et conserver les mutations de tuile documentées.

Risque : élevé. Critère : conservation des récompenses restantes, des toasts et de la fin de partie.

### Étape 5 — Délimiter les pouvoirs de héros

Objectif : isoler les préconditions spécifiques de Xanros, Victorius et Horan dans des fonctions cohérentes, sans créer un service de pouvoirs tant que le nombre de cas ne le justifie pas.

Tests préalables : héros maudit/non maudit, pending, reset, changement de joueur.

Risque : moyen à élevé.

### Étape 6 — Normaliser la couverture

Objectif : introduire la mesure métier/applicative séparée proposée plus haut.

Critère : rapports reproductibles, exclusions justifiées et aucune suppression de fichier métier du périmètre.

### Étape 7 — Réévaluer une extraction

Après les étapes précédentes, réévaluer s'il existe une responsabilité autonome suffisamment stable pour justifier une abstraction. `GameService` doit rester une façade si cette option réduit le risque de rupture des composants et de l'IA.

## 8. Conclusion et décision de démarrage

Une refactorisation progressive est envisageable, mais pas une réécriture de `GameService`. La première intervention recommandée est l'encapsulation ciblée de la transition de tour, précédée des tests fake-timer manquants. L'extraction de `resolveTileEntry` vient ensuite, branche par branche.

Les contrats publics, les temporisations, les états `pending` et les tests E2E doivent rester inchangés pendant les premières étapes. Toute divergence de règle ou de comportement devra être signalée comme `DIVERGENCE` ou `CHOIX NUMÉRIQUE` avant correction.
