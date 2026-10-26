# Contrats techniques des services métier

Ce document décrit le contrat observable des services du domaine numérique de
Karak. Il complète [`RULES.md`](./RULES.md), qui reste la référence pour les
règles officielles, et [`INVARIANTS.md`](./INVARIANTS.md), qui recense les
invariants transversaux.

## Frontière des responsabilités

Les services portent l'état et les décisions métier. Les composants Angular
présentent cet état et transmettent les intentions de l'utilisateur ; ils ne
doivent pas recalculer les actions légales ni modifier directement les phases,
les combats ou les récompenses.

| Service | Contrat principal |
| --- | --- |
| `GameService` | Façade de cycle de vie : préparation, tour actif, résolution des entrées de tuiles, pouvoirs, récompenses, fin de partie et sauvegarde/reprise. |
| `TurnService` | Compteur des mouvements du tour, suspension temporaire pendant une décision obligatoire et remise à zéro entre les tours. |
| `DungeonService` | Tuiles placées et géométrie : voisinage, ouvertures, présence et placement des tuiles. |
| `ExplorationService` | Tirage ou sélection de la prochaine tuile, direction, rotation et validation de son raccordement. |
| `TileDeckService` / `TokenBagService` | Stocks de tuiles et de jetons, avec tirage, retour autorisé et restauration. |
| `PlayerService` | Joueurs, position, orientation, vies, récupération, malédiction, inventaire et trésors. |
| `CombatService` | Combat en attente, lancer, bonus, relances, Tir magique, verdict et résultat. |
| `AiService` | Choix de l'IA et exécution des mêmes opérations légales que le joueur humain. |
| `SaveService` | Enveloppe versionnée, validation de forme et lecture/écriture de la sauvegarde locale. |
| `TutorialSessionService` / `TutorialScenarioService` | Progression et aides du didacticiel ; aucune de ces données ne remplace les règles du moteur. |

`GameService` reste volontairement une façade large : plusieurs composants et
`AiService` l'utilisent directement. Une extraction de responsabilité nécessite
donc d'abord un contrat testable et ne doit pas déplacer une règle par simple
préférence d'architecture.

## Cycle de vie d'une partie

1. `GameService.initialize()` annule les transitions différées, réinitialise
   les services physiques et efface les résolutions en attente.
2. `initializePlayers()` valide le nombre de joueurs et d'humains ; les étapes
   de préparation tirent puis placent les héros sans doublon.
3. `continueAfterHeroDraw()` et `placeHeroesOnStart()` amènent la partie à
   `first-player-roll`. Chaque joueur admissible ne peut lancer qu'une fois.
4. `resolveFirstPlayerRoll()` départage les ex æquo et `startAdventure()` remet
   les mouvements à quatre avant de passer à `playing`.
5. `endTurn()` ne change de joueur que lorsque les combats, explorations,
   récompenses et choix obligatoires sont résolus. Il prépare ensuite le joueur
   suivant ou déclenche sa récupération.
6. `finishGame()` fige le classement et passe la phase à `game-over`; les
   commandes de jeu deviennent alors inopérantes.

Les états `phase` et `setupStep` sont les gardes de premier niveau. Une action
qui ne concerne pas le joueur actif, une partie terminée ou une transition en
cours doit retourner sans mutation.

## Déplacement et exploration

`GameService.canPerformNormalMovement()` vérifie le contexte du tour ;
`GameService.canMoveTo()` délègue la géométrie à `DungeonService` et ajoute les
gardes de vie, de joueur actif, de mouvements et de résolutions en attente.
`AiService` et `Board` utilisent cette même façade : ils ne possèdent pas de
liste parallèle de directions autorisées.

`DungeonService.canMoveTo()` applique l'ouverture des deux côtés d'une liaison.
L'exception d'Argentus non maudit est décidée au niveau de `GameService`, car
elle relève du pouvoir du héros et non de la topologie du donjon.

Pour une exploration, `ExplorationService.canExplore()` vérifie seulement que
la case voisine est vide et que la sortie de la tuile source est ouverte. La
tuile en attente peut ensuite être orientée par rotations de 90 degrés ; la
validation finale exige l'ouverture opposée et une destination libre. Le
didacticiel peut fournir une définition déterministe de tuile et un jeton
prédéfini pour garantir sa progression, mais il ne filtre pas les directions,
les retours ou les rotations légalement proposés par ces services.

La consommation des mouvements est centralisée dans `TurnService` :

- `consumeMovement()` consomme exactement un point après une action réussie ;
- `consumeAllMovements()` termine immédiatement le reliquat lorsqu'une règle
  l'exige et refuse l'opération si le compteur est déjà nul ou suspendu ;
- `stopMovements()` suspend le reliquat pendant une décision obligatoire ;
- `resumeSuspendedMovements()` le restaure une seule fois ;
- `resetMovements()` initialise le nouveau tour à la constante métier.

Une arrivée sur une tuile peut donc consommer le mouvement d'entrée, puis
suspendre uniquement les mouvements restants. Le combat, le coffre, le soin,
le ramassage et certaines récompenses terminent ou reprennent le tour selon
leur résolution ; cette décision appartient à `GameService` et
`CombatService`, pas au plateau.

## Résolutions en attente

Une entrée de tuile peut créer un seul ou plusieurs états intermédiaires. La
propriété `GameService.hasPendingTileResolution` agrège notamment :

- combat et lancer de combat ;
- choix de jeton de Taia ;
- choix combat/passage d'Aderyn ;
- coffre, récompense ou équipement au sol ;
- cible d'une malédiction ;
- Récupération de Horan, continuation d'Inarrêtable et Substitution de Xanros ;
- sélection d'un portail de voyage ou de guérison.

Chaque méthode `resolve...`, `confirm...`, `collect...`, `leave...` ou
`decline...` revalide le joueur actif, la phase, l'identité de l'état pending et
la présence des objets concernés. Une sélection UI ne suffit jamais à autoriser
la mutation ; le service doit pouvoir refuser une sélection devenue obsolète.

Les récompenses partielles sont conservées par tuile dans
`remainingRewardsByTile` et doivent rester associées au jeton qui les porte.
Un changement de joueur ou un reset ne doit pas réutiliser une récompense
pending de la partie précédente.

## Combat et pouvoirs

`CombatService.startCombat()` crée le combat uniquement pour un monstre encore
actif et bloque les doubles démarrages. `rollPendingCombat()` ne peut lancer
qu'une fois le combat ; le résultat enregistré contient les bonus déjà
appliqués. Les options post-lancer (`useXanrosSacrifice`, relance, Tir magique)
réutilisent le même résultat et sont refusées après une victoire définitive.

`resolvePendingCombat()` applique ensuite victoire, égalité ou défaite, publie
le résultat et laisse `GameService` traiter les récompenses et le tour. Les
pouvoirs facultatifs sont valides seulement lorsqu'ils respectent le héros,
l'absence de malédiction et l'état de résolution correspondant.

## Sauvegarde et restauration

`SaveService` ne persiste que l'enveloppe de sauvegarde versionnée. `read()`
retourne `null` pour une donnée absente ou invalide ; `clear()` supprime la
sauvegarde locale. `GameService.restoreSavedGame()` réinitialise d'abord
certains états transitoires, notamment la tuile d'exploration en attente, puis
restaure les services dans un ordre contrôlé. Les résolutions `pending` ne sont
donc pas intégralement réhydratées : une partie restaurée ne reprend pas
nécessairement au milieu d'une résolution interrompue. La méthode ne dispose
pas non plus d'un rollback transactionnel complet en cas d'échec intermédiaire ;
`restoreOrInitialize()` prend ensuite le relais pour réinitialiser la partie
lorsque la restauration échoue.

## Réactivité et observabilité

Les collections métier peuvent être mutées en place pour préserver l'identité
des joueurs et des tuiles. Toute mutation consommée par l'interface doit donc
publier la révision dédiée (`inventoryRevision`, `livesRevision`,
`treasuresRevision`, `groundEquipmentRevision`, `portalTravelRevision`, etc.).
Les composants s'abonnent à ces signaux ; ils ne doivent pas dépendre d'un
effet secondaire ou d'un délai arbitraire pour découvrir une mutation.

Les temporisations d'animation et la cadence des actions IA restent dans les
composants et la page `Game`. Elles ne changent ni les préconditions ni les
résultats des services métier.

## Contrôle documentaire

Les contrats ci-dessus sont vérifiés principalement par :

- `game-lifecycle.spec.ts`, `game.service.spec.ts` et les suites spécialisées
  pour les transitions et les résolutions ;
- `turn.service.spec.ts`, `exploration.service.spec.ts` et
  `dungeon.service.spec.ts` pour les invariants de déplacement ;
- `combat.service.spec.ts` et les suites de pouvoirs pour les combats ;
- `game-async-lifecycle.spec.ts` pour les actions IA différées ;
- les recettes Playwright de `e2e/` pour les parcours utilisateur.

Lorsqu'un comportement est seulement une adaptation numérique ou reste à
confronter au manuel, il doit être signalé dans `RULES.md` avec le statut
approprié (`Adaptation numérique`, `À clarifier` ou `Divergence`) plutôt que
présenté comme une règle officielle.
