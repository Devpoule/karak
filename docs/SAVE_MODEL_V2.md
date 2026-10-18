# Karak — Modèle de sauvegarde V2

Statut : **conception validée**  
Ticket : `V2.1-01`  
Date : 18 octobre 2026

Ce document définit le contrat de données destiné aux tickets
`V2.1-02` à `V2.1-05`. Il ne constitue pas encore une implémentation de la
sauvegarde locale.

## 1. État actuel

Karak ne possède actuellement aucun mécanisme de persistance applicative.
L’état est conservé en mémoire dans les services Angular et disparaît lors
du rechargement de la page. Le modèle doit donc sérialiser l’état métier,
jamais les instances de services, les signaux Angular ou les références
croisées entre objets.

## 2. Enveloppe versionnée

Chaque sauvegarde utilise une enveloppe explicite :

```ts
interface SaveEnvelopeV2 {
  schema: 'karak-save';
  version: 2;
  savedAt: string;
  payload: GameSavePayloadV2;
}
```

`schema` distingue une donnée Karak d’une autre valeur du stockage. `version`
permet les migrations futures. `savedAt` sert à informer l’utilisateur et à
départager deux écritures, mais ne participe pas aux règles du jeu.

## 3. Payload métier

Le payload recommandé est composé de données primitives et d’identifiants :

```ts
interface GameSavePayloadV2 {
  phase: 'setup' | 'playing' | 'game-over';
  setupStep: string;
  players: PlayerSaveV2[];
  firstPlayerIndex: number | null;
  activePlayerIndex: number | null;
  firstPlayerRolls: FirstPlayerRollSaveV2[];
  firstPlayerContenders: number[];
  dungeon: DungeonSaveV2;
  turn: TurnSaveV2;
  pending: PendingSaveV2;
  finalRanking: RankingSaveV2[];
}
```

Chaque joueur conserve contrôleur humain/IA, héros, vies, récupération,
malédiction, position, orientation, armes, sorts, clé et trésors. Les
définitions statiques sont référencées par identifiant, jamais recopiées.

Le donjon conserve pour chaque tuile `definitionId`, `x`, `y`, `rotation`,
`tokenId` et `tokenFace`. Les réserves conservent leurs listes d’identifiants
dans l’ordre de tirage : tuiles restantes et jetons restants. Sauvegarder
seulement les quantités produirait une partie différente.

`turn` conserve `remainingMovements`, `movementsMadeThisTurn` et la suspension
de mouvements active. Les animations ne sont pas persistées.

## 4. Résolutions en attente

Les décisions interrompant un tour doivent être représentées par des
discriminants et des identifiants, jamais par des références d’objets : combat
et lancer présenté, coffre, récompense, choix de jeton, équipement au sol,
pouvoirs facultatifs, portail, réincarnation, substitution et tuile
d’exploration en attente.

Animations, délais, tâches IA et promesses ne sont pas persistés. À la
restauration, une résolution est reconstruite depuis son discriminant ou la
sauvegarde est refusée si elle ne peut pas l’être sans ambiguïté.

## 5. Identité et invariants

1. Les index de joueurs sont nuls ou valides dans `players`.
2. Chaque tuile possède une définition connue, des coordonnées uniques et une
   rotation parmi `0`, `90`, `180`, `270`.
3. Jetons et équipements utilisent des identifiants connus.
4. Un héros ne peut être attribué qu’une seule fois.
5. Vies, mouvements et réserves restent dans leurs bornes.
6. Les références de `pending` pointent vers des joueurs et tuiles présents.
7. Une sauvegarde `game-over` conserve le classement, mais ne reprend pas un
   tour actif.

Une sauvegarde invalide est rejetée sans mutation de la partie affichée.

## 6. Points de reprise

La sauvegarde doit être déclenchée sur des points stables : après une action
métier confirmée, une transition de tour, une résolution complète et avant une
navigation vers l’accueil.

Une écriture ne capture jamais une animation intermédiaire, un double clic ou
une transition différée. Un état de résolution est sauvegardé seulement si sa
restauration est déterministe ; les états visuels sont reconstruits.

## 7. Stockage et migrations

Le stockage local utilisera une clé dédiée, par exemple `karak.save.v2`.
L’écriture construit, sérialise, valide puis remplace la valeur précédente.

Les migrations sont des fonctions pures :

```ts
type SaveMigration = (input: unknown) => unknown;
```

Version inconnue, migration absente ou donnée corrompue produisent un état
« sauvegarde indisponible », jamais une partie partiellement restaurée. La
suppression de la sauvegarde reste distincte de l’initialisation d’une nouvelle
partie.

## 8. Découpage des tickets suivants

| Ticket | Responsabilité |
|---|---|
| `V2.1-02` | sérialisation, validation et écriture locale |
| `V2.1-03` | détection au démarrage et restauration contrôlée |
| `V2.1-04` | rejet, incompatibilité, corruption et migration |
| `V2.1-05` | tests E2E de sauvegarde, reprise et continuité |

Ce modèle ne modifie ni les règles officielles ni le code de production.
