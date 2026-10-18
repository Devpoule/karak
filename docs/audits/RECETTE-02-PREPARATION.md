# KARAK — Recette fonctionnelle 02 : préparation de la partie

Date : 17 octobre 2026  
Périmètre : `INIT-001` à `INIT-012` uniquement.

## Référentiel et méthode

Le manuel local `public/assets/rules/karak-base.pdf` est la source normative. Les étapes de préparation de la page 2 imposent notamment : une tuile de départ, les autres tuiles mélangées face cachée, cinq vies par joueur, un héros distinct tiré pour chaque joueur et le placement des pions sur la tuile de départ. La quantité physique des composants est rappelée page 1.

Le code et les tests ont ensuite été confrontés à ces exigences. Les tests ajoutés pour cette campagne sont :

- `src/app/services/preparation-recipe.spec.ts` : états métier, bornes, composition des joueurs, héros, donjon, pioche et sachet ;
- `e2e/preparation-recipe.spec.ts` : accueil, configuration visible, retour d’étape, tirage visible et reprise via le Codex.

## Résultats détaillés

| Mécanisme | Sous-contrôles et preuves | Résultat | Verdict |
|---|---|---|---|
| `INIT-001` | Accueil `/`, lien `Jouer`, écran `Nouvelle partie`, question du nombre d’aventuriers. E2E `preparation-recipe.spec.ts:3`. | Affichage conforme. | **Conforme vérifié** |
| `INIT-002` | `GameService.initialize` remet phase, étape, tirages, index, ressources et état joueur à leur état initial. Tests service `preparation-recipe.spec.ts:41` et `:103`. | Les joueurs, références de perte de vie et anciennes configurations sont supprimés lors d’une nouvelle initialisation. | **Conforme vérifié** |
| `INIT-003` | `GamePage.ngOnInit` n’appelle `initialize()` que si le jeu n’est pas initialisé. E2E : entrée en tirage des héros, Codex, retour, absence de `Nouvelle partie`. | La préparation est reprise sans réinitialisation involontaire. | **Conforme vérifié** |
| `INIT-004` | Sélection UI de 5 joueurs ; test des bornes 2 et 5 et rejet de 1 et 6 dans `preparation-recipe.spec.ts:53`. | Bornes conformes ; une valeur invalide conserve la configuration précédente. | **Conforme vérifié** |
| `INIT-005` | UI : 3 humains et 2 IA ; service : contrôleurs et effectifs vérifiés. E2E `preparation-recipe.spec.ts:11`. | Composition conforme. | **Conforme vérifié** |
| `INIT-006` | Garde de `initializePlayers` hors étape de configuration ; aucun parcours UI de reconfiguration après validation n’est autorisé. Tests existants `game-lifecycle.spec.ts` et recette ciblée. | La garde métier bloque la reconfiguration après passage en partie. | **Conforme vérifié** |
| `INIT-007` | Retour depuis le tirage des héros vers le choix des joueurs, conservation de 5 participants, puis progression à nouveau vers le tirage. E2E `preparation-recipe.spec.ts:11`. | Aucun état visible corrompu dans le parcours testé. | **Conforme vérifié** |
| `INIT-008` | Cinq cartes sont tirées et leurs sources sont distinctes ; le service utilise un tirage mélangé sans remplacement. E2E et service ciblés. | Aucun doublon observé pour 5 joueurs. | **Conforme vérifié** |
| `INIT-009` | Les cinq joueurs reçoivent chacun un `heroId` appartenant aux six héros définis ; test service `preparation-recipe.spec.ts:72`. | Attribution complète et valide. | **Conforme vérifié** |
| `INIT-010` | `placeHeroesOnStart()` place tous les joueurs en `(0,0)` ; le parcours atteint ensuite `Qui commence ?`. Test service `preparation-recipe.spec.ts:72`, E2E. | Placement conforme à la tuile de départ. | **Conforme vérifié** |
| `INIT-011` | `DungeonService.initialize()` crée une tuile `start` en `(0,0)` ; `TileDeckService` contient 79 tuiles restantes. Test service `preparation-recipe.spec.ts:41`. | Donjon et pioche initialisés conformément au manuel. | **Conforme vérifié** |
| `INIT-012` | Tirage exhaustif du sachet : 53 jetons, avec les quantités de `TOKEN_BAG_COMPOSITION` vérifiées par type. Test service `preparation-recipe.spec.ts:41`. | Composition vérifiée : 43 monstres et 10 coffres. | **Conforme vérifié** |

## Correction ciblée appliquée après la recette

La cause était l’absence d’appel à `PlayerService` depuis `GameService.initialize()`. Le correctif ajoute `PlayerService.reset()`, qui vide la liste mutable des joueurs et le signal `lastLifeLoss`, puis notifie les révisions d’affichage. Le reset n’est déclenché que lorsqu’une instance déjà initialisée est relancée sans nouvelle configuration de participants ; cela préserve les parcours de préparation technique et le retour « Continuer ».

Les tests couvrent une partie à cinq joueurs suivie d’une nouvelle configuration à deux joueurs IA, les héros, vies, malédictions et références indirectes. L’ancienne configuration ne persiste pas.

## Validation exécutée

- `npx ng test --no-watch --no-progress` : **303 tests passés**, 25 fichiers ;
- `npx playwright test e2e/preparation-recipe.spec.ts` : **3 tests passés** ;
- `npx ng build` : **réussi** ; aucun avertissement de budget SCSS ;
- `git diff --check` : aucune erreur d’espacement. Git signale seulement les avertissements usuels de conversion LF/CRLF ;
- avertissement navigateur Angular `NG0913` sur les dimensions intrinsèques de `logo.png`, sans échec fonctionnel.

## Limites

La recette valide les parcours d’interface ciblés dans Chromium et les états des services. Elle ne constitue pas un test multi-navigateur ni un test de persistance après fermeture complète du navigateur.

## Synthèse avant / après

| Mécanisme | Statut avant | Statut après | Preuve principale | Anomalie |
|---|---|---|---|---|
| `INIT-001` | Couvert par test | Conforme vérifié | E2E accueil/préparation | — |
| `INIT-002` | Écart constaté | Conforme vérifié | `PlayerService.reset()` + tests de nouvelle partie | — |
| `INIT-003` | Implémenté non vérifié | Conforme vérifié | E2E reprise Codex | — |
| `INIT-004` | Couvert par test | Conforme vérifié | Service + E2E 5 joueurs | — |
| `INIT-005` | Couvert par test | Conforme vérifié | Service + E2E 3 humains/2 IA | — |
| `INIT-006` | Couvert par test | Conforme vérifié | Garde service | — |
| `INIT-007` | Implémenté non vérifié | Conforme vérifié | E2E retour d’étape | — |
| `INIT-008` | Couvert par test | Conforme vérifié | E2E cartes distinctes | — |
| `INIT-009` | Couvert par test | Conforme vérifié | Test service héros | — |
| `INIT-010` | Couvert par test | Conforme vérifié | Test service positions | — |
| `INIT-011` | Couvert par test | Conforme vérifié | Test service donjon/pioche | — |
| `INIT-012` | Couvert par test | Conforme vérifié | Test exhaustif du sachet | — |

La campagne s’arrête à `INIT-012`, comme demandé.
