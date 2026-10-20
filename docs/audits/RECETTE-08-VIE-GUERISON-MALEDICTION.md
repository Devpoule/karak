# KARAK — Recette fonctionnelle 08 : vie, guérison et malédiction

## Périmètre et verdict

Cette campagne couvre exclusivement `LIFE-001` à `LIFE-011`. Le manuel de base (`public/assets/rules/karak-base.pdf`, principalement p. 4–5 et le résumé p. 8) est la référence normative.

| Mécanisme | Statut avant | Statut après | Verdict | Preuves principales |
|---|---|---|---|---|
| LIFE-001 | Couvert par test | Conforme vérifié | Conforme | `PlayerService.loseLife`, tests PlayerService |
| LIFE-002 | Couvert par test | Conforme vérifié | Conforme | passage à `recoveryState = pending`, tests de perte de vie |
| LIFE-003 | Couvert par test | Conforme vérifié | Conforme | bornage à zéro et validation des entrées |
| LIFE-004 | Couvert par test | Conforme vérifié | Conforme | `beginRecoveryTurn` |
| LIFE-005 | Couvert par test | Conforme vérifié | Conforme | `completeRecoveryTurn` |
| LIFE-006 | Couvert par test | Conforme vérifié | Conforme | transition de repos et reprise du tour |
| LIFE-007 | Couvert par test | Conforme vérifié | Conforme | portail de guérison, sélection et déplacement |
| LIFE-008 | Couvert par test | Conforme vérifié | Conforme | guérison complète et suppression de la malédiction |
| LIFE-009 | Couvert par test | Conforme vérifié | Conforme | application du jeton de malédiction |
| LIFE-010 | Couvert par test | Conforme vérifié | Conforme | transfert/refus et cible légale unique |
| LIFE-011 | Absent | Variante produit vérifiée | Conforme dans la variante | `resolveTileEntry`, `useHealingFountain`, tests unitaires et E2E |

## Référentiel normatif

Le manuel prévoit notamment :

- une défaite fait perdre une vie ; à zéro, le héros perd connaissance et récupère ensuite selon la séquence de repos ;
- une fontaine peut soigner complètement le héros ; le Portail de guérison permet de déplacer un héros vers une fontaine et de le soigner ;
- la guérison complète retire aussi la malédiction ;
- vaincre une momie applique la malédiction à un héros choisi, avec un seul détenteur simultané et des pouvoirs neutralisés tant qu’elle n’est pas retirée ;
- historiquement, le comportement officiel retenu par l’application arrêtait le déplacement à l’arrivée sur une fontaine et appliquait le soin complet ; cette décision est conservée comme trace historique, tandis que la branche actuelle applique une variante produit facultative.

Les limites numériques utilisées par l’application sont cohérentes avec le matériel : cinq vies maximum et aucune vie négative.

## Sous-contrôles et résultats

### LIFE-001 à LIFE-003 — perte de vie et inconscience

`PlayerService.loseLife` accepte une perte positive, réduit les vies sans dépasser zéro et place le joueur en récupération lorsque la dernière vie est perdue. Les valeurs invalides et les pertes successives ne produisent pas de vies négatives. Les contrôles couvrent une perte simple, une perte multiple, la dernière vie et les appels répétés.

Résultat : conforme vérifié.

### LIFE-004 à LIFE-006 — repos et reprise

`beginRecoveryTurn` n’est autorisé que depuis l’état de récupération en attente, restaure une vie et place le héros en repos. `completeRecoveryTurn` clôt le repos. Les gardes de `GameService` empêchent les déplacements et actions incompatibles pendant le repos, puis rétablissent le tour lorsque la séquence est terminée.

Résultat : conforme vérifié.

### LIFE-007 et LIFE-008 — guérison par portail et guérison complète

`openHealingPortalSelection` expose les fontaines disponibles et `useHealingPortal` déplace le héros vers la destination choisie. `restoreCompletely` restaure le maximum de vies, supprime la malédiction et termine la résolution correspondante. Les tests couvrent la sélection, l’absence de destination valide, la guérison complète et l’état maudit.

Résultat : conforme vérifié.

### LIFE-009 et LIFE-010 — malédiction

La résolution du jeton de momie marque le héros touché comme maudit. `resolvePendingCurse` applique les règles de choix : une cible légale, pas de double détenteur et transfert/refus selon la décision. Le panneau du héros reflète l’état réactif de malédiction, sans permettre les pouvoirs interdits pendant celle-ci.

Résultat : conforme vérifié.

### LIFE-011 — arrivée directe sur une fontaine

Le comportement officiel documenté reste le soin complet associé à la fontaine. La branche `fix/healing-fountain-optional-action` applique explicitement une variante produit : l’arrivée ne résout plus automatiquement le soin ; `GameService.canUseHealingFountain` expose une action volontaire et `GameService.useHealingFountain` appelle `PlayerService.restoreCompletely`, consomme les mouvements restants et lève la malédiction.

Une utilisation est mémorisée par joueur et tuile pendant la présence continue ; le changement de tour ne la réinitialise pas, tandis qu’une sortie de tuile réautorise une nouvelle utilisation. Le voyage par Portail de guérison et la Réincarnation de Horan restent inchangés.

Résultat : conforme vérifié pour la guérison complète et la levée de malédiction.

## Tests et preuves exécutés

Tests Angular ciblés :

```text
npx ng test --no-watch --no-progress --include='src/app/services/player.service.spec.ts' --include='src/app/services/game.service.spec.ts' --include='src/app/services/ai.service.spec.ts' --include='src/app/services/game-turn-transition-contracts.spec.ts' --include='src/app/components/hero-panel/hero-panel.spec.ts'
Résultat : 149 tests réussis dans 5 fichiers.
```

Parcours Playwright ciblés :

```text
npx playwright test e2e/horan-powers.spec.ts e2e/taia-powers.spec.ts e2e/smoke.spec.ts
Résultat : 19 scénarios réussis.
```

Les tests existants fournissent les preuves nécessaires pour LIFE-001 à LIFE-010. La variante LIFE-011 est couverte par l’arrivée sans soin automatique, l’activation volontaire, la limite d’une utilisation par présence, la réutilisation après sortie, l’IA, l’accessibilité et le responsive.

## Correction ciblée et validation complémentaire

Décision de variante : `resolveTileEntry` ne déclenche plus le soin automatique sur `feature: 'healing-fountain'`. `GameService.useHealingFountain` porte l’activation volontaire. Aucun changement n’a été apporté à `useHealingPortal`, au déplacement entre portails ou à la Réincarnation de Horan.

## Limites

- La validation navigateur couvre désormais l’arrivée, l’activation au clavier et les viewport mobile/paysage de la variante produit.
- Angular signale `NG0913` sur la taille intrinsèque de `assets/logo.png` ; l’avertissement est sans rapport avec cette phase.
- La phase H des pouvoirs de héros n’est pas auditée dans cette recette.

## Mise à jour de l’inventaire

Après cette campagne : 104 mécanismes sont **Conformes vérifiés**, 34 restent **Couverts par test**, 3 sont **Implémentés non vérifiés**, 1 présente un **Écart constaté**, aucun n’est **Absent** et 1 reste **À clarifier**, sur 143 mécanismes.
