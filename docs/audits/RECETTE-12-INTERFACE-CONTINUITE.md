# KARAK — Recette fonctionnelle 12 : interface et continuité

Date de vérification : 18 octobre 2026  
Périmètre strict : `UI-001` à `UI-010`  
Références : `docs/FUNCTIONAL_AUDIT.md`, manuel officiel, suites Angular et Playwright existantes.

## 1. Méthode et limites

Cette campagne vérifie les comportements d’interface et les transitions observables sans modifier le code de production. Les tests existants ont été confrontés à des scénarios réels dans Chromium. Un statut « Conforme vérifié » est attribué uniquement lorsque le comportement est couvert par une preuve automatisée pertinente ; les zones seulement identifiées dans le code restent « Implémenté non vérifié ».

Les règles du manuel sont la référence pour les parcours de jeu. Les choix d’interface (fermeture par Échap, confirmation de sortie, réduction des animations) sont des conventions applicatives vérifiées contre le comportement attendu documenté dans le projet.

## 2. Synthèse

| ID | Mécanisme | Statut avant | Statut après | Preuves principales | Anomalies |
|---|---|---|---|---|---|
| UI-001 | Navigation accueil, préparation, jeu, règles, Codex | Couvert par test | Conforme vérifié | `preparation-recipe.spec.ts`, `smoke.spec.ts` | Aucune |
| UI-002 | Panneaux héros, vie, inventaire, trésors | Implémenté non vérifié | Conforme vérifié | `player-sidebar.spec.ts` : rendu simultané des quatre panneaux ; smoke Chromium | — |
| UI-003 | Modales et confirmations | Couvert par test | Conforme vérifié | `smoke.spec.ts`, `room-009-chest.spec.ts` | Aucune |
| UI-004 | Clic extérieur et annulation | Implémenté non vérifié | Conforme vérifié | `contextual-help.spec.ts` et smoke Chromium : clic extérieur | — |
| UI-005 | Notifications séquencées | Couvert par test | Conforme vérifié | `toast.service.spec.ts` (2/2) | Aucune |
| UI-006 | Verrouillage pendant résolution | Couvert par test | Conforme vérifié | specs GameService/Board, `smoke.spec.ts`, `room-009-chest.spec.ts` | Aucune |
| UI-007 | Animations dés et verdict | Couvert par test | Conforme vérifié | `combat-overlay.spec.ts`, `combat-wave.spec.ts`, parcours combat | Aucune |
| UI-008 | Réduction des animations | Couvert par test | Conforme vérifié | `smoke.spec.ts` : accueil et préparation | Aucune |
| UI-009 | Recentrage plateau, clavier et pointeur | Implémenté non vérifié | Conforme vérifié | `board.spec.ts` : recentrage, capture/déplacement pointeur et clavier ; smoke Chromium | Preuve clavier/pointeur au niveau composant ; parcours Chromium complet du drag non isolé |
| UI-010 | Responsive et débordement | Couvert par test | Conforme vérifié | `smoke.spec.ts` : 6 dimensions + écran étroit | Aucune |

## 3. Sous-contrôles et résultats

### UI-001 — Navigation

Vérifications : ouverture de l’accueil, passage en préparation, progression jusqu’au plateau, accès au Codex puis retour à la page précédente. Les tests confirment que la préparation active est conservée lors du retour depuis le Codex (`INIT-003` dans `preparation-recipe.spec.ts`) et que la partie atteint effectivement le plateau (`smoke.spec.ts`, `full-game-playthrough.spec.ts`).

Verdict : **Conforme vérifié**.

### UI-002 — Panneaux

Les specs dédiées prouvent les états isolés et `player-sidebar.spec.ts` démontre le rendu intégré simultané des panneaux héros, vie, inventaire et trésors.

Verdict : **Conforme vérifié**.

### UI-003 — Modales et confirmations

Le parcours smoke vérifie l’ouverture du Codex, la fermeture par Échap et la confirmation/annulation de sortie d’une partie active. Les scénarios `room-009-chest.spec.ts` vérifient également l’ouverture d’une décision et sa validation unique.

Verdict : **Conforme vérifié**.

### UI-004 — Clic extérieur et annulation

L’annulation par Échap et la restauration du focus sont couvertes par `smoke.spec.ts`. `contextual-help.spec.ts` et le scénario smoke de clic extérieur démontrent la fermeture par clic extérieur du composant concerné.

Verdict : **Conforme vérifié**.

### UI-005 — Notifications séquencées

`toast.service.spec.ts` vérifie le fondu de sortie puis l’affichage du toast suivant, sans chevauchement : 2 tests réussis sur 2.

Verdict : **Conforme vérifié**.

### UI-006 — Verrouillage pendant résolution

Les états `pending` et `turnTransitionPending` sont exercés par les tests métier existants. Les E2E coffre et exploration confirment qu’une décision ou une tuile en attente suspend les actions incompatibles et qu’une confirmation répétée ne déclenche pas une seconde résolution.

Verdict : **Conforme vérifié**.

### UI-007 — Animations et verdict

`combat-overlay.spec.ts` et `combat-wave.spec.ts` couvrent la présentation des dés, le verdict et la séquence d’animation. Le parcours intégral confirme la transition combat victorieux → récompense → fin de partie.

Verdict : **Conforme vérifié**.

### UI-008 — Réduction des animations

Les scénarios smoke avec `prefers-reduced-motion` vérifient l’accueil et la préparation. Les styles calculés ne conservent pas d’animation active incompatible avec la préférence.

Verdict : **Conforme vérifié**.

### UI-009 — Plateau, clavier et pointeur

`board.spec.ts` démontre le recentrage, la capture du pointeur, le déplacement de caméra et la délégation des touches de sélection. Les parcours Chromium couvrent les interactions de plateau et l’exploration ; aucune anomalie n’a été observée.

Verdict : **Conforme vérifié**.

### UI-010 — Responsive

`smoke.spec.ts` vérifie l’absence de débordement à six dimensions cibles et sur écran étroit, pour l’accueil et la préparation. Aucun débordement n’a été observé.

Verdict : **Conforme vérifié**.

## 4. Exécutions

### Angular ciblé

Commande exécutée :

```powershell
npx ng test --no-watch --no-progress --include='src/app/components/board/board.spec.ts' --include='src/app/components/combat-overlay/combat-overlay.spec.ts' --include='src/app/components/combat-overlay/combat-wave.spec.ts' --include='src/app/components/hero-panel/hero-panel.spec.ts' --include='src/app/components/inventory-panel/inventory-panel.spec.ts' --include='src/app/components/life-panel/life-panel.spec.ts' --include='src/app/components/movement-counter/movement-counter.spec.ts' --include='src/app/components/player-sidebar/player-sidebar.spec.ts' --include='src/app/components/treasure-panel/treasure-panel.spec.ts' --include='src/app/services/toast.service.spec.ts'
```

Résultat : **10 fichiers, 55 tests réussis** lors de la campagne initiale ; la validation complémentaire ajoute **6 tests réussis** dans `board.spec.ts`, ainsi que les preuves ciblées de `player-sidebar.spec.ts` et `contextual-help.spec.ts`.

### Playwright

Commande exécutée :

```powershell
npx playwright test e2e/smoke.spec.ts e2e/preparation-recipe.spec.ts e2e/full-game-playthrough.spec.ts e2e/room-009-chest.spec.ts e2e/portal-travel.spec.ts
```

Résultat : **22 scénarios Chromium réussis**. Les parcours couvrent navigation, Codex, confirmation/annulation, responsive, réduction d’animations, préparation, exploration, coffre, combat/fin et portail.

Un avertissement Angular `NG0913` concernant les dimensions intrinsèques de `assets/logo.png` a été observé dans la console. Il n’a pas provoqué d’échec fonctionnel et n’a pas été corrigé dans cette campagne.

## 5. Conclusion

La campagne complémentaire lève les trois réserves : `UI-002`, `UI-004` et `UI-009` disposent désormais de preuves ciblées. Le bilan de la phase K est de 10 mécanismes conformes vérifiés sur 10. Aucun défaut de production n’a été corrigé et aucun test existant n’a été modifié.
