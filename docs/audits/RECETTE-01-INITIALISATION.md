# KARAK — Recette fonctionnelle 01 : tirage du premier joueur

Date d’exécution : 17 octobre 2026

Périmètre : `INIT-013` à `INIT-017` exclusivement

Référentiel : [manuel officiel du jeu de base](../../public/assets/rules/karak-base.pdf), page 3 du PDF (page imprimée 2), rubrique « Préparation du jeu », point 7

Code de production modifié lors de la finalisation : `GameSetup` uniquement, sans modification des règles métier

## 1. Conclusion

Le tirage désigne correctement le joueur au total le plus élevé, fait participer les joueurs humains et IA, neutralise les doubles déclenchements et active le vainqueur avec ses quatre mouvements initiaux.

Le manuel ne définit aucun départage en cas d’égalité. L’application applique la convention suivante : seuls les joueurs à égalité sur le meilleur total relancent deux dés, autant de fois que nécessaire. Cette convention est impartiale et préserve la règle normative du meilleur total.

Les deux anomalies de présentation découvertes pendant la recette initiale ont été corrigées et validées le 17 octobre 2026 :

1. les dés qui produisent une égalité restent visibles pendant une transition verrouillée de 1,8 seconde, avec identification explicite des joueurs concernés ;
2. l’état de manche de départage est conservé entre tous les lancers : le bouton et les consignes emploient désormais toujours « Relancer ».

Le service métier, les résultats de dés, les candidats au départage et le calcul du vainqueur n’ont pas été modifiés.

| Mécanisme | Avant recette | Après recette initiale | Après finalisation | Preuve principale |
|---|---|---|---|---|
| `INIT-013` — Préparer le tirage | Couvert par test | Conforme vérifié | **Conforme vérifié** | service à 5 joueurs, parcours navigateur humain/IA |
| `INIT-014` — Un lancer par joueur | Couvert par test | Conforme vérifié | **Conforme vérifié** | gardes métier, double appel, verrouillage du bouton et automatisation IA |
| `INIT-015` — Calculer et présenter les dés | Implémenté non vérifié | Couvert par test | **Conforme vérifié** | valeurs `1` et `6`, sommes, faces DOM et conservation pendant l’égalité |
| `INIT-016` — Résoudre une égalité | À clarifier | Couvert par test | **Conforme vérifié** | égalités partielle et répétée, transition verrouillée, relances humaine et IA |
| `INIT-017` — Activer le premier joueur | Couvert par test | Conforme vérifié | **Conforme vérifié** | vainqueur actif dans le plateau, ordre et quatre mouvements intacts |

## 2. Règle officielle et convention applicative

### 2.1 Règle normative

Le point 7 de la préparation indique que le joueur ayant obtenu le total le plus élevé commence. Cette phrase impose :

- la participation des joueurs au tirage ;
- un résultat comparable par joueur ;
- la sélection du total maximal comme premier joueur.

Le manuel ne précise ni la procédure en cas d’égalité, ni l’ordre des lancers, ni la présentation animée des dés. Ces éléments ne peuvent donc pas être qualifiés de règles officielles.

### 2.2 Convention d’égalité évaluée

L’application ne conserve comme candidats que les joueurs à égalité sur le meilleur total. Chacun relance deux dés frais ; les scores antérieurs ne donnent aucun bonus et les joueurs déjà éliminés ne peuvent plus agir. Une nouvelle égalité répète le même cycle.

Cette convention est acceptable parce que :

- tous les candidats encore à égalité subissent exactement la même règle ;
- l’ordre séquentiel d’affichage ne modifie pas le calcul du maximum ;
- aucun score antérieur n’est reporté ;
- un joueur éliminé ne peut ni relancer ni influencer le résultat ;
- les égalités successives sont traitées de façon identique.

La convention n’est pas attribuée au manuel. Elle reste un choix explicite de l’application.

## 3. Cartographie technique

| Élément | Rôle dans la recette | Référence |
|---|---|---|
| `GameService.firstPlayerRolls` | conserve `playerIndex`, `die1`, `die2` et `total` | [`game.service.ts`](../../src/app/services/game.service.ts#L141) |
| `GameService.firstPlayerContenders` | liste les joueurs autorisés à lancer ou relancer | [`game.service.ts`](../../src/app/services/game.service.ts#L150) |
| `GameService.firstPlayerIndex` | conserve le vainqueur du tirage | [`game.service.ts`](../../src/app/services/game.service.ts#L157) |
| `GameService.activePlayerIndex` | désigne le joueur actif après l’entrée dans le donjon | [`game.service.ts`](../../src/app/services/game.service.ts#L170) |
| `continueAfterHeroDraw` / `placeHeroesOnStart` | placent les héros, initialisent tous les candidats et passent à `first-player-roll` | [`game.service.ts`](../../src/app/services/game.service.ts#L675), [`game.service.ts`](../../src/app/services/game.service.ts#L713) |
| `rollPlayerForFirstPlayer` | applique les gardes et génère deux valeurs de dé bornées | [`game.service.ts`](../../src/app/services/game.service.ts#L726) |
| `resolveFirstPlayerRoll` | attend tous les candidats, choisit le maximum ou prépare la relance des ex æquo | [`game.service.ts`](../../src/app/services/game.service.ts#L779) |
| `startAdventure` | active le vainqueur, réinitialise le tour et passe en phase `playing` | [`game.service.ts`](../../src/app/services/game.service.ts#L831) |
| `TurnService.resetMovements` | attribue quatre mouvements et remet le compteur consommé à zéro | [`turn.service.ts`](../../src/app/services/turn.service.ts#L165) |
| `GameSetup.scheduleAiRollIfNeeded` | programme le lancer automatique de l’IA avec garde anti-duplication | [`game-setup.ts`](../../src/app/components/game-setup/game-setup.ts#L631) |
| `GameSetup.rollPlayer` | verrouille l’action, anime les dés, révèle le résultat puis déclenche la résolution | [`game-setup.ts`](../../src/app/components/game-setup/game-setup.ts#L737) |
| `GameSetup.resolveFirstPlayerIfPossible` | synchronise l’état visuel `waiting` / `rolling` / `tie-transition` / `tie` / `winner` | [`game-setup.ts`](../../src/app/components/game-setup/game-setup.ts#L851) |
| `GameSetup.finishTieTransition` | conserve l’instantané métier, verrouille 1,8 seconde puis ouvre la relance | [`game-setup.ts`](../../src/app/components/game-setup/game-setup.ts#L955) |
| `isFirstPlayerTieBreakerRound` | conserve la sémantique « Relancer » pendant toute la manche de départage | [`game-setup.ts`](../../src/app/components/game-setup/game-setup.ts#L231) |
| `getNextPlayerToRoll` / `canPlayerRoll` | imposent l’ordre d’interface et les autorisations | [`game-setup.ts`](../../src/app/components/game-setup/game-setup.ts#L1024), [`game-setup.ts`](../../src/app/components/game-setup/game-setup.ts#L1089) |
| `getDisplayedDice` / `getRevealedRoll` | exposent les faces animées puis le résultat métier | [`game-setup.ts`](../../src/app/components/game-setup/game-setup.ts#L1210), [`game-setup.ts`](../../src/app/components/game-setup/game-setup.ts#L1225) |
| gabarit `GameSetup` | affiche les deux faces, l’équation, les messages et le bouton d’action | [`game-setup.html`](../../src/app/components/game-setup/game-setup.html#L365) |

### Transition observée

`hero-draw` → initialisation de tous les candidats → `first-player-roll` → lancer/animation/révélation de chaque candidat → résolution `pending`, `tie` ou `winner` → en cas d’égalité, `tie-transition` avec résultats conservés et actions verrouillées → manche de départage limitée aux leaders → `startAdventure` → `playing`, vainqueur actif, quatre mouvements.

## 4. Sous-contrôles et résultats

### `INIT-013` — Préparer le tirage du premier joueur

| Sous-contrôle | Attendu | Obtenu | Preuve |
|---|---|---|---|
| Transition depuis le tirage des héros | passage unique de `hero-draw` à `first-player-roll` | conforme | test service ligne 27 |
| Participants | tous les joueurs, humains et IA, sont candidats | conforme avec 5 joueurs dont 3 IA | test service ligne 27 |
| État initial | aucun lancer, aucun vainqueur, aucun joueur actif | conforme | test service ligne 27 |
| Double transition | un second appel ne duplique ni candidat ni état | conforme | test service ligne 27 |
| Interface | écran « Qui commence ? » atteint après le tirage des héros | conforme | trois scénarios Playwright |

Verdict : **Conforme vérifié**.

### `INIT-014` — Autoriser un lancer une seule fois par joueur

| Sous-contrôle | Attendu | Obtenu | Preuve |
|---|---|---|---|
| Joueur légal | seul un candidat courant peut lancer | conforme | test service ligne 42 |
| Double appel | le second appel du même joueur ne consomme aucun aléa et n’ajoute aucun résultat | conforme | test service ligne 42 |
| Index invalide | index négatif ou hors liste ignoré | conforme | test service ligne 42 |
| Transition animée | le bouton du joueur disparaît pendant le lancer et deux dés animés sont présents | conforme | E2E ligne 45 |
| Joueur IA | aucun bouton humain n’est exposé et le lancer est automatique | conforme | E2E ligne 101 |
| IA à égalité | l’IA relance automatiquement lorsqu’elle reste candidate | conforme | E2E ligne 119 |
| Après victoire | aucun nouveau lancer n’est accepté | conforme | test service ligne 61 et E2E ligne 45 |

Les gardes sont présentes à deux niveaux : le composant bloque l’interaction pendant `rolling`, et le service refuse tout candidat invalide, doublon ou lancer postérieur à la victoire. Le scénario de double appel prouve que la protection métier ne dépend pas uniquement du bouton.

Verdict : **Conforme vérifié**.

### `INIT-015` — Calculer le résultat des deux dés et le présenter

| Sous-contrôle | Attendu | Obtenu | Preuve |
|---|---|---|---|
| Bornes | chaque dé vaut de 1 à 6 | valeurs limites 1 et 6 obtenues | test service ligne 42 |
| Somme métier | `total = die1 + die2` | conforme pour tous les scénarios déterministes | tests service lignes 42 et 61 |
| Faces présentées | les attributs DOM correspondent aux deux valeurs métier injectées | conforme, y compris pendant une égalité | E2E lignes 45, 101 et 119 |
| Équation présentée | les deux faces et leur somme sont identiques au résultat stocké | conforme | fonctions `expectDice` et `expectTieTransition`, E2E lignes 12 et 21 |
| Résultat menant à une victoire | les faces finales restent visibles avec le bon total | conforme | E2E lignes 45 et 101 |
| Résultat menant à une égalité | les faces décisives restent lisibles avant la relance | conforme pendant une transition de 1,8 seconde | E2E lignes 45 et 119 |
| Verrouillage de transition | aucune relance humaine ou IA avant la fin de la présentation | conforme : aucun bouton et aucun nouveau lancer | `expectTieTransition`, E2E ligne 21 |

La correspondance exacte entre aléa métier, faces finales et somme est démontrée pour les victoires et les égalités. L’interface conserve un instantané des objets `FirstPlayerRoll` utilisés par le service, puis les retire seulement au début effectif de la manche suivante.

Verdict : **Conforme vérifié**.

### `INIT-016` — Résoudre une égalité

| Sous-contrôle | Attendu | Obtenu | Preuve |
|---|---|---|---|
| Égalité au maximum | seuls les leaders restent candidats | conforme avec 3 joueurs : deux à 8, un à 3 | test service ligne 61 |
| Joueur éliminé | aucun nouveau lancer autorisé | conforme, aucun appel supplémentaire à `Math.random` | test service ligne 61 |
| Nouvelle égalité | la procédure et la transition peuvent se répéter sans conserver les anciens scores | conforme dans le service et le navigateur | test service ligne 61 et E2E ligne 45 |
| Fin de l’égalité | le maximum unique devient premier joueur | conforme | test service ligne 61 |
| Relance humaine | chaque humain ex æquo peut relancer une seule fois avec le libellé « Relancer » | conforme pour les deux joueurs et deux manches successives | E2E ligne 45 |
| Relance IA | l’IA ex æquo attend la transition puis relance automatiquement | conforme | E2E ligne 119 |
| Neutralité | même nombre de dés, aucun bonus historique, même filtre pour tous | conforme | test service ligne 61 |
| Information affichée | résultat, participants ex æquo et action de relance explicites | conforme | `expectTieTransition`, E2E ligne 21 |
| Relance prématurée | aucune action humaine ou IA pendant la pause de présentation | conforme | E2E lignes 45 et 119 |

La convention est fonctionnellement impartiale. L’ordre des clics/animations est séquentiel, mais la résolution attend tous les candidats et compare ensuite leurs totaux ; il ne confère donc aucun avantage au premier ou au dernier à lancer.

Verdict : **Conforme vérifié**. La convention est acceptée pour la logique métier et sa présentation essentielle est désormais validée.

### `INIT-017` — Déterminer et activer le premier joueur

| Sous-contrôle | Attendu | Obtenu | Preuve |
|---|---|---|---|
| Précondition | impossible de démarrer sans vainqueur | conforme | test service ligne 90 |
| Sélection | le joueur au maximum unique devient `firstPlayerIndex` | conforme | tests service lignes 61 et 90 |
| Activation | `activePlayerIndex` reçoit exactement l’index vainqueur | conforme | test service ligne 90 |
| Ordre du jeu | l’ordre repart du vainqueur puis boucle sur les autres joueurs | `[1, 2, 0]` pour un vainqueur d’index 1 | test service ligne 90 |
| Position initiale | tous les héros sont sur la tuile de départ | conforme | test service ligne 90 |
| Tour complet | quatre mouvements disponibles, zéro consommé | conforme dans le service et dans le plateau | test service ligne 90 et E2E ligne 45 |
| Double démarrage | un nouvel appel ne réinitialise pas un tour déjà commencé | conforme : après un mouvement, il reste trois points | test service ligne 90 |
| Interface | un seul héros actif et contrôle HUD du bon joueur | conforme pour J2 | E2E ligne 45 |

Verdict : **Conforme vérifié**.

## 5. Tests examinés et portée réelle

### Tests antérieurs

- [`e2e/smoke.spec.ts`](../../e2e/smoke.spec.ts#L170) atteignait l’écran « Qui commence ? », mais ne prouvait ni les faces, ni la somme, ni les égalités, ni le premier tour.
- Le parcours déterministe voisin dans [`e2e/smoke.spec.ts`](../../e2e/smoke.spec.ts#L185) poursuivait jusqu’au plateau, sans assertion dédiée aux résultats du tirage.
- Les tests de cycle de vie réinitialisaient les états globaux, sans démontrer les règles `INIT-013` à `INIT-017`.

Ces tests justifiaient une présence de parcours, pas une conformité fonctionnelle détaillée.

### Tests ajoutés comme preuves

- [`first-player-recipe.spec.ts`](../../src/app/services/first-player-recipe.spec.ts#L27) : préparation de tous les participants et idempotence de la transition.
- [`first-player-recipe.spec.ts`](../../src/app/services/first-player-recipe.spec.ts#L42) : dés bornés, somme exacte, double appel et index invalides.
- [`first-player-recipe.spec.ts`](../../src/app/services/first-player-recipe.spec.ts#L61) : égalité partielle, joueur éliminé, égalité répétée et vainqueur unique.
- [`first-player-recipe.spec.ts`](../../src/app/services/first-player-recipe.spec.ts#L90) : activation, ordre des tours, position initiale, quatre mouvements et double démarrage.
- [`first-player-recipe.spec.ts`](../../e2e/first-player-recipe.spec.ts#L21) : instantané atomique des dés, équations, message et absence d’action pendant `tie-transition`.
- [`first-player-recipe.spec.ts`](../../e2e/first-player-recipe.spec.ts#L45) : deux humains, deux égalités successives, libellés de relance, affichage exact, entrée dans le donjon et premier tour.
- [`first-player-recipe.spec.ts`](../../e2e/first-player-recipe.spec.ts#L101) : participation automatique d’une IA et correspondance exacte de ses dés.
- [`first-player-recipe.spec.ts`](../../e2e/first-player-recipe.spec.ts#L119) : conservation des résultats, verrouillage puis relance automatique de deux IA ex æquo.

Les tests ajoutés ne changent aucune attente antérieure et n’emploient aucun correctif de production. Le contrôle de `Math.random` rend les valeurs métier reproductibles ; après les deux valeurs imposées à un lancer, l’animation visuelle continue avec une valeur neutre qui ne modifie pas le résultat final.

## 6. Scénarios exécutés

| Scénario | Données | Résultat attendu | Résultat obtenu |
|---|---|---|---|
| Initialisation mixte | 5 joueurs, 2 humains, 3 IA | 5 candidats, aucun lancer ni actif | conforme |
| Limites et double action | J1 = `1 + 6`, double appel, index `-1` et `2` | un seul résultat `7`, deux tirages aléatoires consommés | conforme |
| Égalité partielle et répétée | J1/J2 à `8`, J3 à `3`, puis nouvelle égalité | J3 éliminé ; seuls J1/J2 relancent jusqu’au maximum unique | conforme |
| Deux humains dans le navigateur | `4 + 4` contre `5 + 3`, puis `1 + 5` contre `3 + 3`, puis `1 + 1` contre `6 + 6` | deux transitions verrouillées, libellé « Relancer », J2 vainqueur | conforme |
| Humain contre IA | J1 = `1 + 1`, IA = `6 + 6` | lancer IA automatique, J2 vainqueur | conforme |
| Égalité IA/IA | `3 + 3` contre `4 + 2`, puis `2 + 2` contre `5 + 5` | résultats conservés, aucune relance prématurée, reprise automatique des deux IA, J2 vainqueur | conforme |
| Premier tour | J2 vainqueur | J2 actif, un seul héros actif, 4 points non consommés | conforme |
| Double démarrage | un mouvement consommé puis nouvel appel à `startAdventure` | ne pas restaurer le mouvement | conforme, 3 points restent |

## 7. Anomalies découvertes et finalisées

### `REC01-UI-001` — Effacement immédiat des dés d’une égalité — résolue

Le comportement initial retirait immédiatement les ex æquo de `revealedPlayerIndexes`. La finalisation conserve désormais un instantané exact des `FirstPlayerRoll` dans `tieTransitionRolls`, identifie les joueurs concernés et maintient leurs dés pendant l’état `tie-transition`.

- Durée de présentation : 1,8 seconde après la révélation complète.
- Verrouillage : `canPlayerRoll`, le bouton humain et la programmation IA refusent toute relance pendant la transition.
- Preuve : deux égalités humaines successives et une égalité humain/IA contrôlées dans Chromium.
- Statut : **résolue et validée**.

### `REC01-UI-002` — Libellé incohérent après la première relance — résolue

Le libellé dépendait auparavant de l’état visuel ponctuel `tie`, perdu dès le premier lancer. Le signal `isFirstPlayerTieBreakerRound` conserve maintenant la nature de la manche indépendamment des états `waiting` et `rolling`.

- Premier tirage : bouton et consignes « Lancer ».
- Toute manche de départage : bouton et consignes « Relancer », pour humains et IA.
- Preuve : le second humain puis les deux humains d’une manche répétée sont contrôlés dans Chromium.
- Statut : **résolue et validée**.

## 8. Exécution et preuves techniques

Commandes exécutées depuis la racine :

```text
npx ng test --no-watch --no-progress
→ 24 fichiers réussis, 298 tests réussis

npx playwright test e2e/first-player-recipe.spec.ts
→ 3 scénarios réussis en 57,2 s après finalisation

npx playwright test e2e/first-player-recipe.spec.ts -g "IA ex æquo"
→ scénario ciblé IA/IA réussi en 25,6 s

npx ng build
→ compilation réussie, aucun avertissement de budget SCSS observé
```

Le total Angular de 298 comprend les 294 tests antérieurs et les 4 preuves de service ajoutées. Les 304 cas mentionnés dans l’inventaire initial provenaient d’un recensement statique combinant plusieurs suites ; ils ne doivent pas être confondus avec le total d’une seule commande exécutée. Les trois scénarios Playwright de cette recette sont des preuves supplémentaires.

Le navigateur Chromium a effectivement été utilisé par Playwright. Les clics sur les boutons animés ont été forcés, car leur animation CSS continue empêche le critère de stabilité géométrique de Playwright ; les contrôles de visibilité, de disparition pendant le lancer, de faces, de sommes, de messages et d’état du plateau ont bien été exécutés dans le navigateur.

## 9. Limites de vérification

- Le manuel est silencieux sur les égalités : seule l’acceptabilité de la convention applicative peut être conclue.
- L’aléatoire a été contrôlé pour obtenir des scénarios reproductibles ; cette recette ne réalise pas de test statistique du générateur JavaScript.
- Les cas limites `1` et `6`, les égalités successives, l’humain, l’IA et le mélange humain/IA sont couverts ; toutes les combinaisons possibles de deux dés ne sont pas énumérées, car la formule et les bornes sont contrôlées directement.
- L’observation navigateur porte sur Chromium via Playwright, pas sur une matrice multi-navigateurs ni sur des technologies d’assistance.
- Le clic forcé contourne seulement le critère de stabilité de l’outil sur un bouton animé ; il ne contourne pas les gardes métier ni les assertions fonctionnelles.
- La durée de 1,8 seconde est un choix de présentation, sans effet sur le calcul métier déjà résolu.
- Aucune campagne `INIT-001` à `INIT-012` ni aucune phase ultérieure n’a été ouverte.

## 10. Verdict final

La logique de désignation est correcte, déterministe sous données contrôlées et protégée contre les doubles actions. La relance des seuls leaders ex æquo est une convention applicative acceptable et sans avantage injustifié. Les résultats d’une égalité restent désormais lisibles pendant une transition verrouillée, puis toute la manche suivante emploie explicitement « Relancer ». `INIT-013` à `INIT-017` disposent maintenant d’une preuve métier et navigateur suffisante pour être **Conforme vérifié**.
