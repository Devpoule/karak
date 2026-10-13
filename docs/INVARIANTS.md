# Karak — invariants métier et transitions

Ce document décrit les invariants observés dans le code actuel. Il ne crée
aucune règle de jeu nouvelle. Les règles officielles doivent rester vérifiées
dans `public/assets/rules/karak-base.pdf` et ses captures associées.

## Phases de la partie

| Phase | Signification | Transitions autorisées |
| --- | --- | --- |
| `setup` | Configuration, tirage des héros et premier joueur | `playing` après une résolution unique du premier joueur |
| `playing` | Tour actif, déplacements et résolutions | `game-over` après la victoire finale |
| `game-over` | Classement figé | Réinitialisation explicite par `GameService.initialize()` |

Une partie n'est considérée comme commencée que lorsque la phase vaut
`playing`. La présence de joueurs ou d'une configuration ne suffit pas.

## Invariants techniques

- `activePlayerIndex` est nul pendant `setup` et désigne un joueur existant
  pendant `playing`.
- `firstPlayerIndex` reste nul tant qu'un lancer unique n'a pas départagé les
  participants.
- Une résolution obligatoire bloque les déplacements et les actions concurrentes.
- Une résolution `pending` ne peut être validée que par le joueur actif et dans
  la phase `playing`.
- Un compteur de tour ne peut jamais être inférieur à zéro ni dépasser les
  mouvements prévus par `GAME_CONSTANTS`.
- `TurnService.stopMovements()` mémorise au plus une suspension ; la reprise
  restaure cette valeur une seule fois.
- `GameService.initialize()` annule les transitions différées, vide les
  résolutions pendantes et reconstruit les services de plateau, pioche, jetons
  et combat.
- Une action IA différée doit vérifier que son identifiant d'exécution, sa
  phase et son joueur actif sont toujours valides avant mutation.

## États `pending`

- Combat : le lancer et sa résolution sont séparés ; aucune conséquence ne doit
  être appliquée avant la résolution.
- Trésor : l'ouverture et la prise du trésor sont des décisions distinctes.
- Récompense : l'interface conserve la récompense jusqu'à la décision du joueur.
- Équipement au sol : la collecte et le remplacement vérifient que l'objet est
  toujours présent et appartient à la tuile attendue.
- Choix de jetons : un seul choix est autorisé, puis le jeton refusé retourne
  dans le sac selon le comportement numérique actuel.

## Règles officielles et adaptation

Les mouvements, armes, combats, clés, coffres, trésors, malédictions et pouvoirs
de héros doivent être distingués des choix numériques : signaux Angular,
temporisations, automatisation IA, animations et réinitialisation en mémoire.
Toute divergence avec le manuel doit être marquée `DIVERGENCE` ou `INCERTAIN`
avant correction.

## Tests de caractérisation

Les tests associés couvrent actuellement les limites du compteur de mouvements,
la suspension/reprise, la réinitialisation du cycle de partie et les règles déjà
présentes dans les suites de `GameService`, `CombatService`, `PlayerService` et
`AiService`. Ils figent le comportement observé avant toute extraction de
responsabilité.
