# KARAK — Recette fonctionnelle 09 : pouvoirs spéciaux

## Périmètre et verdict

Cette campagne couvre exclusivement `HERO-001` à `HERO-013`. Le manuel de base `public/assets/rules/karak-base.pdf`, pages 5 à 8, constitue la référence normative.

| Mécanisme | Héros | Statut avant | Statut après | Verdict et preuves |
|---|---|---|---|---|
| HERO-001 | Aderyn | Couvert par test | Conforme vérifié | attaque par l’arrière, égalité gagnée ; tests CombatService et E2E Aderyn |
| HERO-002 | Aderyn | Couvert par test | Conforme vérifié | choix combat/passage et reprise des mouvements ; E2E Aderyn |
| HERO-003 | Argentus | Couvert par test | Conforme vérifié | Affinité magique et conservation des tirs ; tests CombatService |
| HERO-004 | Argentus | Couvert par test | Conforme vérifié | Marche astrale entre tuiles découvertes ; tests et E2E Argentus |
| HERO-005 | Horan | Couvert par test | Conforme vérifié | Double attaque/relance facultative ; tests et E2E Horan |
| HERO-006 | Horan | Couvert par test | Conforme vérifié | Réincarnation, sélection de fontaine et guérison ; tests et E2E Horan |
| HERO-007 | Taia | Couvert par test | Conforme vérifié | Prémonition et tirage de deux jetons ; tests GameService |
| HERO-008 | Taia | Couvert par test | Conforme vérifié | Tisseuse du destin, choix et restitution ; tests GameService et E2E Taia |
| HERO-009 | Victorius | Couvert par test | Conforme vérifié | relance d’un dé égal à 1 ; tests CombatOverlay et E2E Victorius |
| HERO-010 | Victorius | Couvert par test | Conforme vérifié | Inarrêtable, continuation facultative et IA ; tests et E2E Victorius |
| HERO-011 | Xanros | Couvert par test | Conforme vérifié | Sacrifice conditionnel pour le score ; tests GameService et CombatOverlay |
| HERO-012 | Xanros | Couvert par test | Conforme vérifié | Substitution et action facultative à l’arrivée ; tests et E2E Xanros |
| HERO-013 | Aderyn | Écart constaté | Conforme vérifié | Marche rampante évaluée aussi après révélation d’une nouvelle pièce |

## Référentiel normatif

- Aderyn gagne un combat à égalité lorsqu’elle attaque par l’arrière et peut traverser une tuile occupée par un monstre sans combattre, en décidant lorsqu’elle y entre.
- Argentus ajoute les tirs magiques à sa force sans retirer les jetons et peut traverser les murs entre tuiles voisines déjà explorées.
- Horan peut relancer les deux dés une fois par combat et se réincarne après avoir perdu sa dernière vie, avec guérison complète sur une fontaine choisie.
- Taia reçoit un bonus de Prémonition dans la condition prévue et tire deux jetons lors de la découverte d’une pièce pour en choisir un.
- Victorius peut relancer un dé affichant 1 et peut poursuivre son tour après un six grâce à Inarrêtable.
- Xanros peut sacrifier une vie pour obtenir le bonus prévu et peut échanger sa position avec un autre héros ; la Substitution ne consomme pas les quatre déplacements ordinaires.

La malédiction désactive les pouvoirs des héros pendant sa durée. Les tests vérifient les gardes `!player.isCursed` sur les pouvoirs concernés.

## Résultats par héros

### Aderyn — HERO-001, HERO-002, HERO-013

`CombatService` applique l’attaque par l’arrière et autorise la victoire en cas de match nul. `resolveTileEntry` crée une décision `sneak-choice` sur une tuile connue ; `choosePendingSneak` permet ensuite le combat ou le passage sans combat et restaure correctement les mouvements restants.

L’E2E `e2e/aderyn-sneak.spec.ts` confirme le parcours utilisateur sur une tuile déjà explorée.

`HERO-013` a été corrigé : `resolveTileEntry` appelle désormais `classifyTileEntry` avec la Marche rampante disponible pour toute rencontre éligible, quelle que soit l’ancienneté de la tuile. La garde de malédiction reste dans `classifyTileEntry`, de sorte qu’une Aderyn maudite déclenche normalement le combat.

### Argentus — HERO-003, HERO-004

Les tests vérifient l’Affinité magique, la conservation des tirs après utilisation et la désactivation sous malédiction. `canMoveTo` autorise la Marche astrale uniquement entre secteurs découverts et voisins, avec la restriction de pouvoir correspondante. `e2e/argentus-astral.spec.ts` confirme le franchissement d’un mur valide.

Résultat : conforme vérifié après correction ciblée.

### Horan — HERO-005, HERO-006

La relance de Horan est facultative, unique par combat et remplace le résultat des deux dés. L’interface anime les dés relancés. La Réincarnation n’est ouverte qu’après perte de la dernière vie ; la sélection d’une fontaine restaure Horan une seule fois et termine la résolution. Les pouvoirs restent bloqués sous malédiction.

Les scénarios `e2e/horan-powers.spec.ts` couvrent le refus de relance, l’acceptation avec animation et la sélection de fontaine.

Résultat : conforme vérifié.

### Taia — HERO-007, HERO-008

`revealNewRoom` tire deux jetons lorsque la Tisseuse de destin est disponible et installe `pendingTokenChoice`. `choosePendingToken` conserve le jeton choisi, remet l’autre dans le sac et reprend la résolution. Les égalités ou choix sans effet utile ne créent pas de décision supplémentaire selon les gardes existantes. La malédiction désactive le pouvoir.

Les tests GameService et `e2e/taia-powers.spec.ts` démontrent le choix et la reprise du tour.

Résultat : conforme vérifié.

### Victorius — HERO-009, HERO-010

La relance de Victorius est proposée seulement lorsque l’un des dés vaut 1. Le pouvoir reste facultatif et n’est pas proposé lorsque les gardes de résultat rendent la relance inutile. Inarrêtable permet de poursuivre après un six, y compris après une issue de combat défavorable ; l’IA résout la décision sans boucle.

Les tests `combat-overlay.spec.ts` vérifient l’animation du dé concerné. `e2e/victorius-powers.spec.ts` couvre le refus, l’acceptation, le quatrième mouvement, l’IA et la fin du tour.

Résultat : conforme vérifié.

### Xanros — HERO-011, HERO-012

`canUseXanrosSacrificeForScore` n’autorise le sacrifice que si le point supplémentaire peut modifier le classement. `CombatService` applique le bonus et la perte d’une vie, sans proposer l’action sous malédiction.

La Substitution vérifie la cible, échange les positions et ouvre ensuite une action facultative sur la tuile d’arrivée. Les doubles validations sont bloquées par les états pending. L’E2E `e2e/xanros-powers.spec.ts` confirme que l’échange ne résout pas automatiquement la tuile d’arrivée.

Résultat : conforme vérifié, avec les conventions numériques déjà signalées dans la fiche Xanros.

## Scénarios transversaux

Les contrôles couvrent : héros maudit et non maudit, pouvoirs automatiques et facultatifs, refus et acceptation, relances et animations, résolution IA, dernier mouvement, reprise après décision et protection contre les doubles validations. Les appels de résolution refusent les actions lorsque le joueur n’est pas actif ou qu’une autre résolution obligatoire est déjà pending.

## Tests exécutés

Tests Angular ciblés :

```text
npx ng test --no-watch --no-progress --include='src/app/services/game.service.spec.ts' --include='src/app/services/combat.service.spec.ts' --include='src/app/services/ai.service.spec.ts' --include='src/app/components/combat-overlay/combat-overlay.spec.ts' --include='src/app/components/board/board.spec.ts'
Résultat : 187 tests réussis dans 5 fichiers.
```

Playwright pouvoirs principaux :

```text
npx playwright test e2e/horan-powers.spec.ts e2e/victorius-powers.spec.ts e2e/xanros-powers.spec.ts e2e/taia-powers.spec.ts
Résultat : 9 scénarios réussis.
```

Playwright Aderyn et Argentus :

```text
npx playwright test e2e/aderyn-sneak.spec.ts e2e/argentus-astral.spec.ts
Résultat : 2 scénarios réussis.
```

Les scénarios navigateur ont produit l’avertissement Angular `NG0913` relatif à la taille intrinsèque de `assets/logo.png`. Il est sans rapport avec les pouvoirs audités.

## Limites et anomalies

- `HERO-013` est désormais conforme : la Marche rampante est proposée aussi lors de la découverte d’une nouvelle pièce.
- Les conventions de sélection automatique de l’IA et les adaptations numériques de Xanros sont distinguées des règles officielles.
- Aucun correctif de production n’a été appliqué et la phase I n’est pas commencée.
