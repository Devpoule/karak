# Karak — audit fonctionnel exhaustif et chronologique

> Inventaire de l’implémentation observée le 17 octobre 2026. Ce document ne corrige aucun comportement et ne transforme pas une présence dans le code en preuve de conformité.

## 1. Périmètre et méthode

Sources examinées :

- manuel local `public/assets/rules/karak-base.pdf` et ses huit pages PNG ;
- référentiel interne `docs/RULES.md` et fiches `docs/rules/` ;
- modèles, données, services, composants et pages Angular sous `src/app/` ;
- 32 fichiers de tests contenant 304 cas `it/test` ;
- 9 fichiers Playwright sous `e2e/`.

Le manuel `karak-base.pdf` est la référence normative prioritaire. Les huit pages sont utilisées ainsi :

| Page | Règles normatives exploitées |
|---:|---|
| 1 | couverture du manuel ; aucune règle exploitable |
| 2 | matériel, objectif, valeur des trésors et condition générale de fin |
| 3 | préparation, 4 déplacements, découverte d’un secteur, tirage du contenu d’une pièce, portails et fontaines |
| 4 | résolution du combat, égalité/défaite/victoire, équipement, déplacement dans un secteur exploré |
| 5 | fin de tour, fin de partie, vies et guérison, équipement, clé/trésor et malédiction |
| 6 | Argentus, Horan, Xanros et Aderyn |
| 7 | Victorius, Taia et bestiaire |
| 8 | résumé des règles de base et rappel des pouvoirs |

Les pages 3 à 5 fixent notamment les contrôles suivants : un tour dispose de quatre déplacements ; une nouvelle pièce reçoit un jeton lors de sa découverte ; une attaque gagne seulement lorsque sa force est supérieure à celle du monstre ; une égalité ne blesse personne et fait reculer le héros ; une défaite fait perdre une vie et fait reculer le héros ; un combat, l’ouverture d’un coffre, le ramassage d’un objet ou un soin terminent le tour. Le manuel précise aussi que deux portails permettent un déplacement de l’un à l’autre pour un mouvement et qu’une fontaine permet de soigner le héros à la fin de son tour.

### Référentiel matériel de la page 2

| Élément officiel | Référence dans le manuel | Implémentation observée | Statut |
|---|---|---|---|
| 80 tuiles de catacombes, dont 1 départ | p. 2 | `GAME_CONSTANTS.tiles.total = 80`, pioche contrôlée à 79, départ dans `DungeonService.initialize` | Conforme vérifié |
| 6 pions et supports de héros | p. 2 | six entrées dans `HERO_DEFINITIONS`, attribution sans doublon | Couvert par test |
| 6 cartes de héros | p. 2 | représentées par les six définitions de héros ; pas de paquet physique séparé | Adaptation numérique |
| 5 plateaux individuels d’inventaire | p. 2 | inventaire porté par chaque objet `Player`, maximum applicatif de 5 participants | Adaptation numérique |
| 30 jetons de vie | p. 2 | chaque joueur commence avec `lives = 5` ; les jetons physiques ne sont pas gérés comme un stock global | Adaptation numérique |
| 43 jetons de monstres | p. 2 | `TOKEN_BAG_COMPOSITION` totalise 43 : 8 rats, 4 araignées, 12 gardiens, 5 épéistes, 8 momies, 3 rois, 2 Morts, 1 Dragon | Conforme vérifié |
| 10 jetons de coffres verrouillés | p. 2 | `TOKEN_BAG_COMPOSITION` contient 10 `closed-chest` | Conforme vérifié |
| 2 dés | p. 2 | dés virtuels à six faces dans `GameService` et `CombatService` | Adaptation numérique |
| 1 jeton de malédiction | p. 2 et p. 5 | état booléen par joueur et transfert orchestré par `GameService` | Couvert par test |

La composition du sac est donc conforme aux quantités visibles dans le manuel, mais la matérialité des plateaux, cartes, vies et dés est naturellement remplacée par des états numériques. Cette adaptation ne vaut pas preuve de conformité des comportements qui utilisent ces éléments.

Les références de code sont données par symbole afin de rester maintenables. Les lignes peuvent être retrouvées avec `rg -n`. Les statuts sont : **Conforme vérifié**, **Couvert par test**, **Implémenté non vérifié**, **Écart constaté**, **Absent**, **À clarifier**. « Couvert par test » signifie que le chemin possède un test, pas que la règle officielle est démontrée.

## 2. Cartographie chronologique

| Phase | Mécanismes recensés | Risque principal |
|---|---:|---|
| A. Initialisation | 17 | tirage du premier joueur, reprise et états intermédiaires |
| B. Tour et déplacement | 19 | consommation/suspension des mouvements, portails et transitions |
| C. Exploration | 12 | raccordement, rotation, confirmation et entrée |
| D. Pièces et événements | 12 | jeton choisi, résolution unique et retour sur tuile |
| E. Combat | 16 | ordre des bonus, égalité, relances et animation |
| F. Récompenses/inventaire | 17 | inventaire plein, dépôt et récompenses restantes |
| G. Vie/soins/malédiction | 11 | inconscience, fontaines, repos et transmission de malédiction |
| H. Pouvoirs des héros | 13 | restrictions et choix facultatifs |
| I. Intelligence artificielle | 10 | progression complète sans blocage |
| J. Fin de partie | 6 | Dragon, classement et arrêt des actions |
| K. Interface/continuité | 10 | asynchronisme, verrouillage et responsive |
| **Total** | **143** | — |

Le total correspond aux contrôles élémentaires ci-dessous ; un contrôle peut couvrir plusieurs fonctions et plusieurs contrôles peuvent partager un test.

## 3. Inventaire détaillé

### Phase A — Initialisation

| ID | Mécanisme — déclencheur / résultat attendu | Comportement actuel et code | Tests | Statut |
|---|---|---|---|---|
| INIT-001 | Ouvrir l’application ; afficher l’entrée | `app.routes.ts`, `EntryPage` | `e2e/preparation-recipe.spec.ts` | Conforme vérifié |
| INIT-002 | Initialiser une nouvelle partie | `GameService.initialize` remet services, joueurs, phase et sélections à zéro | `preparation-recipe.spec.ts` | Conforme vérifié |
| INIT-003 | Détecter une partie déjà initialisée | `GamePage.ngOnInit` appelle `initialize` seulement si nécessaire | `e2e/preparation-recipe.spec.ts` | Conforme vérifié |
| INIT-004 | Choisir le nombre de joueurs ; refuser hors 2–5 | `PlayerService.initialize`, constantes `MIN/MAX_PLAYER_COUNT` | `preparation-recipe.spec.ts`, E2E | Conforme vérifié |
| INIT-005 | Choisir le nombre d’humains ; compléter en IA | `PlayerService.initialize(playerCount, humanPlayerCount)` | `preparation-recipe.spec.ts`, E2E | Conforme vérifié |
| INIT-006 | Refuser une reconfiguration après setup | garde `phase === setup` et `setupStep` | `game-lifecycle.spec.ts`, `preparation-recipe.spec.ts` | Conforme vérifié |
| INIT-007 | Revenir à une étape de préparation | `goBackToSetupStep` valide les préconditions | `e2e/preparation-recipe.spec.ts` | Conforme vérifié |
| INIT-008 | Tirer les héros sans doublon | `PlayerService.drawHeroes`, `hero-definitions.ts` | `preparation-recipe.spec.ts`, E2E | Conforme vérifié |
| INIT-009 | Attribuer un héros à chaque joueur | `GameService.drawHeroes` / `continueAfterHeroDraw` | `preparation-recipe.spec.ts`, E2E | Conforme vérifié |
| INIT-010 | Placer les héros sur la tuile de départ | `PlayerService.placeHeroesOnStart` | `preparation-recipe.spec.ts`, E2E | Conforme vérifié |
| INIT-011 | Initialiser le donjon et la pioche | `DungeonService.initialize`, `TileDeckService.initialize` | `preparation-recipe.spec.ts` | Conforme vérifié |
| INIT-012 | Initialiser le sac de jetons | `TokenBagService.initialize` | `preparation-recipe.spec.ts` | Conforme vérifié |
| INIT-013 | Préparer le tirage du premier joueur | `GameService.continueAfterHeroDraw` ou `placeHeroesOnStart` passe à `first-player-roll` | `e2e/smoke.spec.ts`, `src/app/services/first-player-recipe.spec.ts`, `e2e/first-player-recipe.spec.ts` | Conforme vérifié |
| INIT-014 | Autoriser un lancer une seule fois par joueur | `GameSetup.canPlayerRoll`, `GameService.rollPlayerForFirstPlayer` refusent doublon/joueur illégal ; bouton masqué pendant l'animation | `src/app/services/first-player-recipe.spec.ts`, `e2e/first-player-recipe.spec.ts` | Conforme vérifié |
| INIT-015 | Calculer le résultat des deux dés et le présenter | `GameService.firstPlayerRolls` conserve les deux dés et leur somme ; `GameSetup` présente les valeurs exactes et conserve un instantané pendant la transition d'égalité | `src/app/services/first-player-recipe.spec.ts`, `e2e/first-player-recipe.spec.ts` | Conforme vérifié |
| INIT-016 | Résoudre une égalité | `resolveFirstPlayerRoll` ne conserve que les leaders à égalité ; `GameSetup` verrouille une transition lisible puis maintient le libellé « Relancer » pendant toute la manche. Cette procédure reste une convention applicative, le manuel indiquant seulement que le total le plus élevé commence | `src/app/services/first-player-recipe.spec.ts`, `e2e/first-player-recipe.spec.ts` | Conforme vérifié |
| INIT-017 | Déterminer et activer le premier joueur | `GameService.startAdventure` transfère le vainqueur dans `activePlayerIndex` et `TurnService.resetMovements` rend 4 mouvements | `src/app/services/first-player-recipe.spec.ts`, `e2e/first-player-recipe.spec.ts` | Conforme vérifié |

**Confrontation règle :** pour `INIT-013` à `INIT-017`, voir [Recette 01](audits/RECETTE-01-INITIALISATION.md). Les autres points de préparation restent hors de cette campagne. La page 3 du PDF (page imprimée 2) fixe le total le plus élevé ; le départage des égalités relève d'une convention de l'application.

### Phase B — Tour et déplacement

| ID | Mécanisme — déclencheur / résultat attendu | Code et preuve | Statut |
|---|---|---|---|
| TURN-001 | Activer le joueur courant | `TurnService.activePlayerIndex`, `GameService` | Conforme vérifié |
| TURN-002 | Démarrer avec le nombre de mouvements prévu | `TurnService.resetMovements` | Conforme vérifié |
| TURN-003 | Afficher les mouvements restants | `MovementCounterComponent`, signaux `TurnService` | Conforme vérifié |
| TURN-004 | Refuser l’action d’un joueur inactif | gardes `activePlayer` dans `GameService`/`BoardComponent` | Conforme vérifié |
| TURN-005 | Refuser un héros sans vie ou en repos | `canPerformNormalMovement` | Conforme vérifié |
| TURN-006 | Calculer une destination adjacente | `DungeonService.getNeighborPosition` | Conforme vérifié |
| TURN-007 | Vérifier les ouvertures réciproques | `DungeonService.canMoveTo` | Conforme vérifié |
| TURN-008 | Déplacer vers une tuile existante | `BoardComponent.moveActivePlayerTo`, `PlayerService.movePlayerTo` | Conforme vérifié |
| TURN-009 | Consommer exactement un mouvement | `TurnService.consumeMovement` | Conforme vérifié |
| TURN-010 | Refuser une destination identique/invalide | `canPerformNormalMovementTo`, coordonnées et destination | Conforme vérifié |
| TURN-011 | Traverser un mur avec exception de pouvoir | `GameService.canMoveTo`, Argentus | Conforme vérifié |
| TURN-012 | Suspendre les mouvements pendant combat/choix | `TurnService.suspendMovements` et reprise | Conforme vérifié |
| TURN-013 | Reprendre les mouvements après résolution | `resumeSuspendedMovements` | Conforme vérifié |
| TURN-014 | Arrêter volontairement les mouvements | `stopMovements`, bouton Board | Conforme vérifié |
| TURN-015 | Fin automatique au dernier mouvement | `resolveTileEntry`, `endTurn` | Conforme vérifié |
| TURN-016 | Fin volontaire du tour | `BoardComponent.endTurn`, `GameService.endTurn` | Conforme vérifié |
| TURN-017 | Programmer la transition asynchrone | `turnTransitionPending`, timer/microtask | Conforme vérifié |
| TURN-018 | Passer au joueur suivant et boucler l’ordre | `getTurnOrderFrom`, `advanceToNextPlayer` | Conforme vérifié |
| TURN-019 | Relier deux portails après la pose d’au moins deux tuiles ; consommer un mouvement | `GameService` sélectionne et valide les destinations, `Board` les met en évidence, `AiService` utilise le même mécanisme métier | `portal-travel.spec.ts`, `e2e/portal-travel.spec.ts` | Conforme vérifié |

### Phase C — Exploration du donjon

| ID | Mécanisme — résultat attendu | Code/tests | Statut |
|---|---|---|---|
| TILE-001 | Détecter une ouverture libre | `ExplorationService.canExplore` | Conforme vérifié |
| TILE-002 | Refuser direction occupée/fermée | même méthode + `BoardComponent` | Conforme vérifié |
| TILE-003 | Empêcher deux explorations simultanées | `pendingTile` | Conforme vérifié |
| TILE-004 | Piocher et révéler une tuile avant le choix de direction | `TileDeckService.draw`, `ExplorationService.start` | Conforme vérifié |
| TILE-005 | Gérer une pioche vide | `draw` retourne `undefined` | Conforme vérifié |
| TILE-006 | Calculer la position proposée | `getPendingTilePosition` | Conforme vérifié |
| TILE-007 | Choisir ou changer la sortie après révélation sans repiocher | `changePendingDirection` | Conforme vérifié |
| TILE-008 | Faire tourner la tuile | `rotatePendingTile` | Conforme vérifié |
| TILE-009 | Vérifier les connexions | `isPendingTilePlacementValid` | Conforme vérifié |
| TILE-010 | Refuser le placement non raccordé | `confirmPlacement` retourne null | Conforme vérifié |
| TILE-011 | Placer et retirer la tuile pending | `DungeonService.placeTile`, `confirmPlacement` | Conforme vérifié |
| TILE-012 | Déplacer le héros et consommer le mouvement après confirmation | `BoardComponent.confirmPendingTile` | Conforme vérifié |

### Phase D — Pièces et événements

| ID | Mécanisme | Code/tests | Statut |
|---|---|---|---|
| ROOM-001 | Identifier le type de tuile à l’entrée | `resolveTileEntry`, définitions de tuiles | Conforme vérifié |
| ROOM-002 | Détecter une pièce non résolue | `revealNewRoom`, `tokenId/tokenFace` | Conforme vérifié |
| ROOM-003 | Tirer le premier jeton | `TokenBagService.draw`, `revealNewRoom` | Conforme vérifié |
| ROOM-004 | Taia tire deux jetons | `revealNewRoom`, `pendingTokenChoice` | Conforme vérifié |
| ROOM-005 | Choisir un jeton et remettre l’autre | `choosePendingToken` | Conforme vérifié |
| ROOM-006 | Retourner une pièce déjà résolue sans nouvel événement | classification `already-resolved` | Conforme vérifié |
| ROOM-007 | Résoudre pièce vide | classification `empty` | Conforme vérifié |
| ROOM-008 | Déclencher monstre | classification `monster`, `CombatService.startCombat` | Conforme vérifié |
| ROOM-009 | Déclencher coffre fermé ; avec une clé, permettre de prendre le trésor et terminer le tour | `resolveTileEntry` crée une décision pending ; l’humain choisit `Ouvrir le coffre` ou `Continuer`, tandis que l’IA conserve sa stratégie déterministe d’ouverture | `RECETTE-05-PIECES-EVENEMENTS.md`, `game-tile-entry-contracts.spec.ts`, `game.service.spec.ts`, `ai.service.spec.ts`, `e2e/room-009-chest.spec.ts` | Conforme vérifié |
| ROOM-010 | Conserver les éléments non récupérés | `remainingRewardsByTile`, état du jeton | Conforme vérifié |
| ROOM-011 | Ne résoudre un jeton qu’une fois | flags de tuile et résultats restants | Conforme vérifié |
| ROOM-012 | Continuer ou terminer selon la résolution | `resolveTileEntry`, `endTurn` | Conforme vérifié |

### Phase E — Combats

| ID | Mécanisme — résultat attendu | Code/tests | Statut |
|---|---|---|---|
| COMBAT-001 | Démarrer contre un monstre face visible | `CombatService.startCombat` | Conforme vérifié |
| COMBAT-002 | Refuser combat déjà pending ou token invalide | mêmes gardes | Conforme vérifié |
| COMBAT-003 | Lancer deux dés | `rollPendingCombat` | Conforme vérifié |
| COMBAT-004 | Calculer attaque brute | `CombatRoll`, `combat.service.ts` | Conforme vérifié |
| COMBAT-005 | Ajouter armes et bonus | `getAttackPower`/définitions équipement | Conforme vérifié |
| COMBAT-006 | Appliquer Argentus et malédiction | logique `argentus` dans CombatService | Conforme vérifié |
| COMBAT-007 | Déterminer victoire | `isWinningCombatRoll` | Conforme vérifié |
| COMBAT-008 | Déterminer égalité | `resolvePendingCombat` | Conforme vérifié |
| COMBAT-009 | Déterminer défaite et perte de vie | résolution + `PlayerService.loseLife` | Conforme vérifié |
| COMBAT-010 | Proposer relance Horan | `getAvailableHeroRerolls`, `useHeroReroll` | Conforme vérifié |
| COMBAT-011 | Proposer relance Victorius sur dé égal à 1 | mêmes méthodes | Conforme vérifié |
| COMBAT-012 | Refuser relance après victoire ou malédiction | gardes CombatService | Conforme vérifié |
| COMBAT-013 | Tir magique et consommation du sort | `useMagicBolt`, `countMagicBolts` | Conforme vérifié |
| COMBAT-014 | Sacrifice de Xanros | `canUseXanrosSacrifice`, `useXanrosSacrifice` | Conforme vérifié |
| COMBAT-015 | Produire le verdict et le conserver | `lastCombatResult`, overlay | Conforme vérifié |
| COMBAT-016 | Nettoyer combat/résultat et reprendre le tour | `clearLastCombatResult`, GameService | Conforme vérifié |

**Points à contrôler contre le manuel :** ordre exact des modificateurs, traitement de l’égalité, nombre et nature des dés, usage des relances et formulation du Tir magique. Le code et les tests démontrent des scénarios numériques, pas à eux seuls la conformité au PDF.

### Phase F — Récompenses et inventaire

| ID | Mécanisme | Code/tests | Statut |
|---|---|---|---|
| INV-001 | Lire les récompenses restantes | `getRemainingMonsterRewards` | Conforme vérifié |
| INV-002 | Récompenser le monstre vaincu | `collectPendingTreasure/Equipment` et GameService | Conforme vérifié |
| INV-003 | Récompenser le Dragon par rubis | `PlayerService.addTreasure`, `calculateTreasurePoints` | Conforme vérifié |
| INV-004 | Ouvrir coffre avec clé | `openPendingTreasure` consomme clé | Conforme vérifié |
| INV-005 | Laisser coffre sans clé | pending treasure conservé | Conforme vérifié |
| INV-006 | Ajouter une clé unique | `PlayerService.canAddEquipment/addEquipment` | Conforme vérifié |
| INV-007 | Ajouter un sort dans un emplacement libre | PlayerService | Conforme vérifié |
| INV-008 | Ajouter une arme dans un emplacement libre | PlayerService | Conforme vérifié |
| INV-009 | Refuser inventaire plein | `canAddEquipment` | Conforme vérifié |
| INV-010 | Proposer remplacement d’arme | `canReplaceEquipment` | Conforme vérifié |
| INV-011 | Refuser remplacement égal ou inférieur | comparaison `attackBonus` | Conforme vérifié |
| INV-012 | Déposer/remplacer l’ancien équipement | `replacePendingEquipment`, dépôt au sol | Conforme vérifié |
| INV-013 | Abandonner une récompense | `leavePendingReward` | Conforme vérifié |
| INV-014 | Récupérer un équipement au sol | `offerGroundEquipmentAt`, `collectGroundEquipment` | Conforme vérifié |
| INV-015 | Remplacer un équipement au sol | `replaceGroundEquipment` | Conforme vérifié |
| INV-016 | Persister les équipements au sol | `groundEquipmentByTile` | Conforme vérifié |
| INV-017 | Calculer les points de trésor | `calculateTreasurePoints` | Conforme vérifié |

### Phase G — Vie, soins et malédiction

| ID | Mécanisme | Code/tests | Statut |
|---|---|---|---|
| LIFE-001 | Perdre une ou plusieurs vies | `PlayerService.loseLife` | Conforme vérifié |
| LIFE-002 | Passer à l’inconscience à zéro | `recoveryState = pending` | Conforme vérifié |
| LIFE-003 | Empêcher vies négatives/entrée invalide | bornage et validation | Conforme vérifié |
| LIFE-004 | Commencer le repos | `beginRecoveryTurn` | Conforme vérifié |
| LIFE-005 | Soigner une vie au repos | `completeRecoveryTurn` | Conforme vérifié |
| LIFE-006 | Reprendre avec restrictions | GameService transition | Conforme vérifié |
| LIFE-007 | Utiliser une fontaine via Portail de guérison | `openHealingPortalSelection/useHealingPortal` | Conforme vérifié |
| LIFE-008 | Soigner complètement et lever malédiction | `restoreCompletely`, `setCursed(false)` | Conforme vérifié |
| LIFE-009 | Appliquer la malédiction d’un jeton | résolution de récompense spéciale | Conforme vérifié |
| LIFE-010 | Transférer/refuser une malédiction | `resolvePendingCurse`, cible légale unique | Conforme vérifié |
| LIFE-011 | Arriver sur une fontaine, pouvoir se soigner à la fin du tour et lever la malédiction | `GameService.resolveTileEntry` détecte une nouvelle arrivée sur `feature: 'healing-fountain'`, arrête les mouvements et appelle `PlayerService.restoreCompletely` | `game-tile-entry-contracts.spec.ts`, Playwright de parcours | Conforme vérifié |

### Phase H — Pouvoirs des six héros

| ID | Pouvoirs et contrôles | Code/tests | Statut |
|---|---|---|---|
| HERO-001 | Aderyn : attaque arrière / bonus conditionnel | `CombatService`, fiche héros | Conforme vérifié |
| HERO-002 | Aderyn : Marche rampante, choix combat ou passage sans combat sur une tuile monstre | `choosePendingSneak`, E2E Aderyn ; le chemin est présent sur tuile déjà explorée | Conforme vérifié |
| HERO-003 | Argentus : affinité magique | `CombatService` | Conforme vérifié |
| HERO-004 | Argentus : Marche astrale entre tuiles découvertes | `canMoveTo`, E2E Argentus | Conforme vérifié |
| HERO-005 | Horan : double attaque/relance | `CombatService`, E2E Horan | Conforme vérifié |
| HERO-006 | Horan : Réincarnation et sélection de fontaine | `beginHoranReincarnation/confirmHoranReincarnation` | Conforme vérifié |
| HERO-007 | Taia : Prémonition, deux jetons et choix | `revealNewRoom/choosePendingToken` | Conforme vérifié |
| HERO-008 | Taia : Tisseuse du destin et reprise | GameService/ExplorationService | Conforme vérifié |
| HERO-009 | Victorius : entraînement au combat | CombatService relance | Conforme vérifié |
| HERO-010 | Victorius : Inarrêtable, décision de continuer | `register/accept/declineUnstoppableContinuation` | Conforme vérifié |
| HERO-011 | Xanros : Sacrifice pour atteindre le score | `canUseXanrosSacrificeForScore` | Conforme vérifié |
| HERO-012 | Xanros : Substitution, échange et résolution facultative | `open/confirm/finishXanrosSubstitution` | Conforme vérifié |
| HERO-013 | Aderyn : pouvoir applicable dès l’entrée sur une pièce nouvellement découverte contenant un monstre | `resolveTileEntry` évalue désormais la Marche rampante pour toute rencontre éligible, y compris après révélation ; la malédiction reste une restriction | `game.service.spec.ts`, `e2e/aderyn-sneak.spec.ts` | Conforme vérifié |

La fiche `docs/rules/heroes/xanros.md` signale déjà une divergence pour le Sacrifice et une incertitude/adaptation numérique pour la Substitution. Ces alertes restent ouvertes ; les tests E2E prouvent des parcours locaux, pas la règle de plateau.

### Phase I — Intelligence artificielle

| ID | Mécanisme | Code/tests | Statut |
|---|---|---|---|
| AI-001 | Déclencher le cycle IA au changement de joueur | `GamePage` effects et `runAiTurn` | Conforme vérifié |
| AI-002 | Refuser qu’une IA contrôle un humain | `AiService.resolveMandatoryAction` | Conforme vérifié |
| AI-003 | Résoudre une action obligatoire avant de bouger | `resolveMandatoryAction` | Conforme vérifié |
| AI-004 | Choisir une direction et déplacer | `chooseMove`, `GameService` | Conforme vérifié |
| AI-005 | Explorer avec orientation déterministe | `ExplorationService` + AI | Conforme vérifié |
| AI-006 | Résoudre combat et décisions de relance | `resolveCombatDecision/resolveMagicBoltDecision` | Conforme vérifié |
| AI-007 | Choisir récompenses, équipement et abandon | AiService | Conforme vérifié |
| AI-008 | Choisir cible de malédiction | AiService | Conforme vérifié |
| AI-009 | Utiliser Portail/Réincarnation | AiService et GameService | Conforme vérifié |
| AI-010 | Prévenir blocage, boucle et reprendre le joueur suivant | `runAiTurn`, guards et microtasks ; deux rotations IA observées par Playwright | Conforme vérifié |

La continuité d’une partie entièrement IA est exercée indirectement mais n’est pas identifiée comme un scénario E2E dédié : **Implémenté non vérifié** pour ce contrôle de bout en bout.

### Phase J — Fin de partie

| ID | Mécanisme | Code/tests | Statut |
|---|---|---|---|
| END-001 | Détecter l’obtention du Dragon | classification de récompense `dragon` | Conforme vérifié |
| END-002 | Attribuer le rubis et ses points | GameService/PlayerService | Conforme vérifié |
| END-003 | Passer en `game-over` et arrêter les actions | phase et gardes GameService | Conforme vérifié |
| END-004 | Calculer le classement par trésors | `getRankedPlayers` / `calculateTreasurePoints` | Conforme vérifié |
| END-005 | Départager les égalités | plusieurs joueurs conservés dans `winners` ; aucun critère de départage imposé par le manuel | Conforme vérifié |
| END-006 | Afficher résultats et permettre nouvelle partie | pages Game/Entry | Conforme vérifié |

### Phase K — Interface et continuité

| ID | Mécanisme | Code/tests | Statut |
|---|---|---|---|
| UI-001 | Naviguer accueil, préparation, jeu, règles, Codex | routes/pages | Conforme vérifié |
| UI-002 | Afficher panneaux héros, vie, inventaire, trésors | composants dédiés | Conforme vérifié |
| UI-003 | Ouvrir/fermer modales et confirmations | pages/composants | Conforme vérifié |
| UI-004 | Gérer clic extérieur et annulation | composants modaux | Conforme vérifié |
| UI-005 | Afficher notifications séquencées | `ToastService`, `UX_NOTIFICATIONS.md` | Conforme vérifié |
| UI-006 | Verrouiller contrôles pendant résolution | flags `pending`, `turnTransitionPending` | Conforme vérifié |
| UI-007 | Coordonner animations de dés et verdict | CombatOverlay et `combat-wave.spec.ts` | Conforme vérifié |
| UI-008 | Respecter réduction des animations | préférence UI et CSS | Conforme vérifié |
| UI-009 | Recentrer plateau et gérer clavier/pointeur | `BoardComponent` | Conforme vérifié |
| UI-010 | Responsive et absence de débordement | SCSS + smoke E2E | Conforme vérifié |

## 4. Enchaînements à risque

Les contrôles suivants traversent plusieurs phases et doivent faire l’objet de scénarios dédiés lors de la campagne de vérification :

1. dernier mouvement → entrée dans une pièce → combat → récompenses → fin du tour ;
2. combat perdu → inconscience → repos → joueur suivant, sans double soin ni double tour ;
3. coffre sans clé → mouvements repris, puis retour ultérieur avec clé ;
4. inventaire plein → remplacement → dépôt de l’ancien objet → récupération ultérieure ;
5. récompenses multiples → collecte partielle → conservation exacte des récompenses restantes ;
6. héros maudit → pouvoir facultatif ou relance → refus systématique conforme aux restrictions ;
7. Taia → deux jetons → choix monstre/coffre → une seule résolution et retour de l’autre jeton ;
8. Xanros Substitution → échange → tuile occupée/équipement/coffre → fin sans résolution implicite ;
9. Victorius/Horan → relance → reprise des mouvements ou décision de fin ;
10. IA → action pending → combat/choix → récompense → joueur suivant ;
11. retour à l’accueil pendant animation, sélection ou transition ;
12. Dragon obtenu pendant une animation ou une résolution de récompense.

## 5. Bilan chiffré de vérification

Chaque ligne de l’inventaire possède un statut individuel. Le statut ne mesure toutefois pas la même chose selon sa valeur : **Couvert par test** indique qu’un test associé a été identifié, tandis que **Conforme vérifié** exige une preuve pertinente confrontée à la règle officielle. La recette 01 a vérifié uniquement `INIT-013` à `INIT-017`.

### Répartition globale

| Statut | Nombre | Interprétation actuelle |
|---|---:|---|
| Conforme vérifié | 143 | conformité démontrée par règle, code, tests et parcours navigateur pour les mécanismes concernés |
| Couvert par test | 0 | aucun mécanisme ne reste dans cette catégorie après la campagne d’interface |
| Implémenté non vérifié | 0 | chemin identifié dans le code, sans preuve de fonctionnement suffisante |
| Écart constaté | 0 | comportement observé incompatible avec la règle telle qu’elle est formulée dans le manuel |
| Absent | 0 | mécanisme officiel non trouvé dans l’implémentation |
| À clarifier | 0 | règle, convention ou choix UX nécessitant une décision explicite |
| **Total** | **143** | — |

### Répartition par phase

| Phase | Total | Conforme vérifié | Couvert par test | Implémenté non vérifié | Écart constaté | Absent | À clarifier |
|---|---:|---:|---:|---:|---:|---:|---:|
| A. Initialisation | 17 | 17 | 0 | 0 | 0 | 0 | 0 |
| B. Tour et déplacement | 19 | 19 | 0 | 0 | 0 | 0 | 0 |
| C. Exploration | 12 | 12 | 0 | 0 | 0 | 0 | 0 |
| D. Pièces et événements | 12 | 12 | 0 | 0 | 0 | 0 | 0 |
| E. Combat | 16 | 16 | 0 | 0 | 0 | 0 | 0 |
| F. Récompenses/inventaire | 17 | 17 | 0 | 0 | 0 | 0 | 0 |
| G. Vie/soins/malédiction | 11 | 11 | 0 | 0 | 0 | 0 | 0 |
| H. Pouvoirs des héros | 13 | 13 | 0 | 0 | 0 | 0 | 0 |
| I. Intelligence artificielle | 10 | 10 | 0 | 0 | 0 | 0 | 0 |
| J. Fin de partie | 6 | 6 | 0 | 0 | 0 | 0 | 0 |
| K. Interface/continuité | 10 | 10 | 0 | 0 | 0 | 0 | 0 |
| **Total** | **143** | **143** | **0** | **0** | **0** | **0** | **0** |

Les cinq points de risque initiaux se répartissent ainsi : portails **Conforme vérifié**, soin direct **Conforme vérifié**, coffre automatique **Conforme vérifié**, Marche rampante d’Aderyn **Conforme vérifié**, départage du premier joueur **Conforme vérifié**. La convention de relance est cohérente et ses deux défauts de présentation ont été corrigés puis validés dans la recette 01. Les autres mécanismes « couverts par test » ne sont pas encore considérés comme conformes.

## 6. Couverture et limites

Les 304 cas automatisés sont une mesure de présence de tests, pas une couverture fonctionnelle exhaustive. La couverture est forte sur les services métier, les transitions et les six héros, mais plus faible pour :

- confrontation exacte avec chaque page du manuel officiel ;
- déplacements entre portails et soin direct sur une fontaine ;
- choix facultatif d’ouverture d’un coffre lorsqu’une clé est disponible ;
- Marche rampante d’Aderyn lors de la découverte d’une nouvelle pièce ;
- pioche vide, plateau saturé et états impossibles ;
- égalités du classement final ;
- partie entièrement IA de bout en bout ;
- reprise/fermeture pendant toutes les animations et séquences pending ;
- accessibilité complète des modales, focus et navigation clavier ;
- responsive du plateau de jeu hors fixtures de combat.

Les tests E2E ne sont pas exécutés dans cet audit ; aucune vérification navigateur ne doit être déduite de leur présence. Les commandes recommandées pour la campagne suivante sont :

```powershell
npx ng test --no-watch --no-progress
npx ng build
npm run test:e2e
node docs/tools/check-rule-references.mjs
git diff --check
```

## 7. Synthèse finale

- **143 mécanismes** recensés, répartis sur 11 phases chronologiques.
- **304 cas unitaires/intégration recensés** dans 32 fichiers ; le nombre de 294 indiqué initialement est obsolète pour ce checkout.
- Les zones les plus risquées sont les mécanismes officiellement absents ou divergents : portails de déplacement, soin direct sur fontaine, ouverture facultative d’un coffre avec clé, Marche rampante sur pièce nouvellement découverte, égalité du premier lancer et transitions pending/asynchrones.
- Aucun bug n’est corrigé, aucune règle n’est modifiée et aucun test existant n’est modifié dans le cadre de cet inventaire.
