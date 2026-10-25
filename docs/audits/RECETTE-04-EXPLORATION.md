# KARAK — Recette fonctionnelle 04 : exploration du donjon

Date : 17 octobre 2026  
Périmètre strict : `TILE-001` à `TILE-012`.

## Référentiel et périmètre

Le manuel `public/assets/rules/karak-base.pdf` est la référence normative. La page 3 décrit l’entrée dans un secteur inexploré : une tuile est piochée, raccordée depuis le passage choisi, puis le héros entre sur la tuile. La page 4 confirme que la limite de quatre déplacements s’applique également aux secteurs déjà explorés et que le contenu d’une pièce apparaît au moment où la tuile est ajoutée.

Les règles internes des événements de pièce ne sont pas réévaluées ici ; leur déclenchement après l’entrée est seulement contrôlé comme transition vers la phase D.

Le flux numérique est désormais documenté comme : tirage, révélation, choix de direction, rotation, placement puis résolution. Le raccordement reste limité au passage source selon le contrat métier actuel ; aucune nouvelle contrainte latérale n’est introduite.

## Résultats détaillés

| Mécanisme | Sous-contrôles et preuves | Résultat | Verdict |
|---|---|---|---|
| `TILE-001` | `ExplorationService.canExplore` testé sur une ouverture libre ; quatre directions et source de départ couvertes par `exploration.service.spec.ts`. | Une ouverture libre déclenche une exploration. | **Conforme vérifié** |
| `TILE-002` | Direction occupée, direction fermée et directions incompatibles vérifiées ; le plateau ne propose que `canMoveTo`/`canExplore`. | Les directions invalides sont refusées. | **Conforme vérifié** |
| `TILE-003` | `start` refuse une seconde exploration et `pendingTile` reste la même référence ; tests service. | Une seule tuile pending peut exister. | **Conforme vérifié** |
| `TILE-004` | `start` retire exactement une tuile via `TileDeckService.draw` et la révèle avant toute sélection de direction, sans l’ajouter au donjon avant confirmation. | Pioche, révélation et état provisoire synchronisés. | **Conforme vérifié** |
| `TILE-005` | Pioche vide testée dans `exploration-recipe.spec.ts` ; aucune tuile pending ni modification du donjon. | L’exploration est refusée proprement lorsque la pioche est vide. | **Conforme vérifié** |
| `TILE-006` | `getPendingTilePosition` ne calcule la position qu’après sélection de la direction ; la tuile reste visible en prévisualisation avant ce choix. | Révélation immédiate puis position proposée correcte. | **Conforme vérifié** |
| `TILE-007` | `changePendingDirection` sélectionne ou change la sortie depuis la même source sans nouveau tirage et conserve la rotation. | La tuile tirée reste identique et la pioche ne bouge pas. | **Conforme vérifié** |
| `TILE-008` | Cycle complet `0° → 90° → 180° → 270° → 0°` vérifié dans `exploration-recipe.spec.ts`. | Rotation cyclique conforme. | **Conforme vérifié** |
| `TILE-009` | `isPendingTilePlacementValid` exige l’ouverture opposée au passage source ; tests d’orientation valide/invalide. | Le raccordement d’entrée est contrôlé. | **Conforme vérifié** |
| `TILE-010` | Confirmation d’une orientation non raccordée refusée ; aucune tuile n’est ajoutée. | Les placements invalides ne mutent pas le donjon. | **Conforme vérifié** |
| `TILE-011` | `confirmPlacement` ajoute la tuile, conserve ses coordonnées/rotation et nettoie `pendingTile`; double confirmation impossible. | Placement définitif et nettoyage conformes. | **Conforme vérifié** |
| `TILE-012` | `Board.confirmPendingTile` place, déplace le héros, consomme un mouvement et appelle la résolution d’entrée ; tests `game-tile-entry-contracts.spec.ts` et E2E. | Aucun déplacement avant confirmation et une seule consommation après confirmation. | **Conforme vérifié** |

## Cas limites vérifiés

- Pioche vide.
- Une seule tuile pending et tentative de seconde exploration.
- Directions occupées, fermées ou sans ouverture.
- Rotations à 0°, 90°, 180° et 270°.
- Changement de sortie sans repiocher.
- Confirmation répétée et orientation invalide.
- Tuile pending non encore présente dans le donjon.
- Entrée sur une nouvelle pièce avec résolution obligatoire ; la résolution est seulement contrôlée comme transition hors périmètre.
- Interface du plateau, état pending, confirmation et synchronisation visuelle dans Chromium.
- Parcours de préparation, retour Codex et entrée sur le plateau après modification du référentiel.

Les scénarios IA de déplacement et de résolution existants ont été inclus dans les contrôles de non-régression concernés. Aucun correctif de production n’a été nécessaire.

## Validation exécutée

- `npx ng test --no-watch --no-progress --include=...` sur les suites exploration/entrée : **27 tests passés** ;
- `npx ng test --no-watch --no-progress` : **309 tests passés**, 26 fichiers ;
- `npx playwright test e2e/portal-travel.spec.ts e2e/smoke.spec.ts --grep=...` : **11 tests passés** ;
- Compilation Angular : réussite lors de la validation précédente du checkout, sans modification de production dans cette recette ;
- Références documentaires : **29 fichiers vérifiés, toutes valides** ;
- `git diff --check` : aucune erreur d’espacement.

Les tests navigateur ont produit l’avertissement Angular `NG0913` relatif aux dimensions intrinsèques de `logo.png`, sans échec fonctionnel.

## Limites

La vérification navigateur a été menée avec Chromium uniquement. La couverture des événements internes de pièce est volontairement limitée au déclenchement et à la suspension du tour, conformément au périmètre. Aucun scénario multi-navigateur ni reprise après fermeture complète du navigateur n’a été exécuté.

## Synthèse avant / après

| Mécanisme | Statut initial | Statut final | Preuve principale | Anomalie |
|---|---|---|---|---|
| `TILE-001` | Couvert par test | Conforme vérifié | ExplorationService + E2E | — |
| `TILE-002` | Couvert par test | Conforme vérifié | Directions/connexions | — |
| `TILE-003` | Couvert par test | Conforme vérifié | pendingTile | — |
| `TILE-004` | Couvert par test | Conforme vérifié | Pioche + pending | — |
| `TILE-005` | Implémenté non vérifié | Conforme vérifié | Test pioche vide | — |
| `TILE-006` | Couvert par test | Conforme vérifié | Position voisine | — |
| `TILE-007` | Couvert par test | Conforme vérifié | Changement de direction | — |
| `TILE-008` | Couvert par test | Conforme vérifié | Cycle de rotations | — |
| `TILE-009` | Couvert par test | Conforme vérifié | Ouvertures opposées | — |
| `TILE-010` | Couvert par test | Conforme vérifié | Confirmation invalide | — |
| `TILE-011` | Couvert par test | Conforme vérifié | Placement/cleanup | — |
| `TILE-012` | Couvert par test | Conforme vérifié | Board + entrée | — |

La campagne s’arrête à `TILE-012`. Aucune correction fonctionnelle ni phase D n’est engagée.
