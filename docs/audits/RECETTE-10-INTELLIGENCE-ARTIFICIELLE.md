# KARAK — Recette fonctionnelle 10 : intelligence artificielle

## Périmètre et verdict

Cette campagne couvre exclusivement `AI-001` à `AI-010`. Les règles officielles du manuel servent de référence pour les conséquences métier ; les choix de direction, de rotation, de cible et d’automatisation sont documentés comme stratégie IA.

| Mécanisme | Statut avant | Statut après | Verdict |
|---|---|---|---|
| AI-001 | Couvert par test | Conforme vérifié | cycle IA déclenché pour le joueur actif |
| AI-002 | Couvert par test | Conforme vérifié | une IA ne contrôle pas un joueur humain |
| AI-003 | Couvert par test | Conforme vérifié | les résolutions pending précèdent les déplacements |
| AI-004 | Couvert par test | Conforme vérifié | déplacement légal délégué au moteur métier |
| AI-005 | Couvert par test | Conforme vérifié | exploration et rotation déterministes valides |
| AI-006 | Couvert par test | Conforme vérifié | combats, relances et décisions facultatives |
| AI-007 | Couvert par test | Conforme vérifié | récompenses, équipement et abandon |
| AI-008 | Couvert par test | Conforme vérifié | cible de malédiction légale et déterministe |
| AI-009 | Couvert par test | Conforme vérifié | Portail de guérison et Réincarnation |
| AI-010 | Couvert par test | Conforme vérifié | deux rotations complètes IA démontrées par Playwright |

## Architecture et distinctions

`AiService` choisit les actions et les décisions. Les validations, mutations et conséquences métier restent dans `GameService`, `CombatService`, `ExplorationService`, `PlayerService` et `TurnService`. L’IA ne dispose donc pas d’un chemin de règle parallèle.

Les stratégies suivantes sont des conventions applicatives : choisir la première destination de portail ou fontaine, conserver le premier jeton de Taia, choisir le combat pour Aderyn, privilégier certaines récompenses et choisir une cible de malédiction selon les trésors. Elles ne modifient pas les règles officielles.

## Résultats par mécanisme

### AI-001 à AI-003 — activation et résolutions prioritaires

Le cycle vérifie que le joueur actif est bien contrôlé par l’IA. `resolveMandatoryAction` refuse les joueurs humains, attend un combat en cours et résout avant le déplacement les choix de coffre, récompense, malédiction, Sneak, Tisseuse de destin, Substitution et Inarrêtable.

Résultat : conforme vérifié par les tests AiService/GameService et les parcours navigateur de décisions.

### AI-004 et AI-005 — déplacements et exploration

`getAvailableActions` ne propose que les directions validées par `GameService.canMoveTo` ou `ExplorationService.canExplore`. `performMove` et `performExploration` consomment un seul mouvement, utilisent les validations communes, placent les tuiles via `ExplorationService` et résolvent l’entrée via `GameService.resolveTileEntry`. La rotation retenue est déterministe parmi les orientations valides.

Résultat : conforme vérifié par les tests de service et la partie navigateur complète.

### AI-006 — combats

L’IA laisse le lancer et l’affichage au `CombatOverlay`, puis résout les décisions avec `resolveMagicBoltDecision`, `resolveNextHeroRerollDecision`, `resolveXanrosSacrificeDecision` et `resolveUnstoppableDecision`. Les résultats, pertes de vies, reculs, récompenses et fins de tour restent ceux du moteur commun.

Résultat : conforme vérifié par les tests ciblés et les E2E Horan, Victorius, Xanros et Taia.

### AI-007 et AI-008 — récompenses et malédiction

L’IA collecte les trésors, tente l’équipement utile, laisse les récompenses impossibles et résout les cibles de malédiction selon une stratégie stable. Les gardes métier empêchent la duplication, la consommation illégale et la résolution sur une cible non autorisée.

Résultat : conforme vérifié par `AiService` et `GameService`.

### AI-009 — Portail de guérison et Réincarnation

L’IA privilégie la première fontaine disponible lorsqu’un Portail de guérison est utilisable et dispose d’un héros blessé. La Réincarnation de Horan est résolue par les méthodes métier communes, avec sélection de fontaine et guérison complète.

Résultat : conforme vérifié par les tests et le scénario Horan.

### AI-010 — absence de blocage et continuité

Les gardes contre les doubles actions, résolutions pending, mouvements épuisés et transitions prématurées sont présents. Le scénario `e2e/ai-continuity.spec.ts` configure deux joueurs IA, attend le démarrage du plateau, observe quatre changements successifs d’annonce de joueur et vérifie que les deux joueurs reviennent chacun au moins une fois dans la rotation.

Le scénario ne simule aucune action humaine, n’observe aucun état `game-over` prématuré et conserve le plateau actif. La progression comprend deux cycles complets de rotation : IA 1 → IA 2 → IA 1 → IA 2.

Résultat : **Conforme vérifié**.

## Scénarios exécutés

- Joueur IA actif et refus de contrôle d’un humain.
- Résolution de coffres, récompenses, malédictions, Sneak, relances et pouvoirs.
- Déplacements classiques, exploration et placement déterministe.
- Combat au dernier mouvement et transition après Inarrêtable.
- Horan, Taia, Victorius et Xanros contrôlés ou assistés par l’IA dans les scénarios disponibles.
- Partie complète déterministe jusqu’au classement du Dragon.
- Partie IA contre IA déterministe avec deux joueurs et deux rotations complètes.

Les scénarios spécifiques IA multi-parties, IA seule sur plusieurs tours et reprise d’une partie pendant un tour IA restent des limites de preuve pour AI-010.

## Tests et validations

Tests Angular ciblés :

```text
npx ng test --no-watch --no-progress --include='src/app/services/ai.service.spec.ts' --include='src/app/services/game.service.spec.ts' --include='src/app/services/player.service.spec.ts' --include='src/app/services/exploration.service.spec.ts'
Résultat : 138 tests réussis dans 4 fichiers.
```

Playwright IA et continuité :

```text
npx playwright test e2e/full-game-playthrough.spec.ts e2e/taia-powers.spec.ts e2e/victorius-powers.spec.ts e2e/xanros-powers.spec.ts
Résultat : 7 scénarios réussis.
```

```text
npx playwright test e2e/ai-continuity.spec.ts
Résultat : 1 scénario réussi en 55,8 secondes.
Observations : 2 joueurs IA, 4 changements de joueur, 2 rotations complètes.
```

Le scénario navigateur a signalé `NG0913` sur la taille intrinsèque de `assets/logo.png`, sans rapport avec l’IA.

Validations globales après mise à jour : 317 tests Angular réussis, build Angular réussi, 36 fichiers Markdown valides et `git diff --check` sans erreur bloquante. Aucun correctif de production n’est appliqué dans cette recette.

## Limites et statut final

Les stratégies IA sont des conventions applicatives et ne constituent pas des choix imposés par le manuel. AI-010 est désormais conforme vérifié. La phase J n’est pas commencée.
