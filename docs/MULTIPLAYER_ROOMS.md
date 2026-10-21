# Conception des salons de parties

**Ticket :** V3.0-02 — Concevoir les salons de parties
**Date :** 21 octobre 2026
**Dépendance :** [`MULTIPLAYER_ARCHITECTURE.md`](MULTIPLAYER_ARCHITECTURE.md)
**Statut :** conception prête pour preuve de concept

Ce document transforme l'étude d'architecture en contrat de salon exploitable
par le futur serveur. Il ne crée pas encore de backend et ne modifie pas le
mode local.

## 1. Périmètre

Le salon couvre la période qui précède le moteur de partie : création,
invitation, entrée, départ, préparation, démarrage, reconnexion et expiration.
La règle de jeu reste dans le moteur autoritaire décrit par le ticket #35.

Sont exclus de ce ticket : comptes persistants, amis, matchmaking public,
spectateurs, chat, classement global, paiement et déploiement d'un serveur.

Le salon en ligne ne doit pas réutiliser `SaveService` comme source partagée :
`localStorage` reste le mécanisme de continuité du mode local.

## 2. Modèle de données

### Room

```ts
interface RoomSnapshotV1 {
  roomId: string;
  protocolVersion: 1;
  status: 'waiting' | 'ready' | 'starting' | 'playing' | 'finished' | 'expired';
  hostSeatId: string;
  capacity: number;
  seats: readonly SeatSnapshotV1[];
  revision: number;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
}
```

`roomId` est un identifiant aléatoire non devinable. Un code d'invitation
humain, s'il est retenu, est distinct de cet identifiant et ne donne jamais
accès à une partie sans session valide.

`capacity` est fixé à la création et ne peut pas dépasser la limite du jeu
actuel. Le serveur refuse une capacité hors bornes plutôt que de la corriger
silencieusement.

### Seat

```ts
interface SeatSnapshotV1 {
  seatId: string;
  playerId: string;
  displayName: string;
  status: 'joined' | 'ready' | 'disconnected' | 'left';
  joinedAt: string;
  lastSeenAt: string;
}
```

Le `seatId` est stable pendant la vie du salon. Le `playerId` sera ensuite
associé au joueur du moteur de partie ; il ne doit pas être choisi librement
par le navigateur. Le nom d'affichage est une donnée de présentation, limitée
en longueur et nettoyée à l'entrée ; ce n'est pas une identité ni un secret.

La session réseau est séparée du siège :

```ts
interface RoomSessionV1 {
  sessionId: string;
  roomId: string;
  seatId: string;
  reconnectUntil: string;
  lastAppliedRevision: number;
}
```

Le serveur ne renvoie jamais le jeton brut dans un snapshot public et ne stocke
qu'une empreinte de ce jeton. Une reconnexion valide retrouve le même siège au
lieu de créer un doublon.

## 3. Cycle de vie

```text
waiting ──(minimum atteint + tous prêts)──> ready
   │                                         │
   ├─(hôte annule)──> expired                └─(hôte démarre)──> starting
   │                                                               │
   └─(expiration)──────────────────────────────────────────────────┘
                                                                   ▼
                                                               playing
                                                                   │
                                                     (fin du moteur) ▼
                                                               finished
```

### Transitions autorisées

| État | Événement | Préconditions | Résultat |
|---|---|---|---|
| `waiting` | `join` | siège libre, salon non expiré | nouveau siège `joined` |
| `waiting` | `ready` | session propriétaire d'un siège | siège `ready`, salon éventuellement `ready` |
| `ready` | `unready` | partie non démarrée | retour à `waiting` |
| `waiting`/`ready` | `leave` | session valide | siège libéré ou salon expiré si l'hôte quitte sans transfert |
| `waiting`/`ready` | `start` | hôte, nombre minimum, sièges prêts | `starting`, puis création atomique de la partie |
| `starting` | `start-ack` | moteur initialisé | `playing` |
| `playing` | `finish` | moteur en état final | `finished` |
| tout état non terminal | `expire` | `expiresAt` dépassé et absence de session active admissible | `expired` |
| `disconnected` | `reconnect` | session non expirée et siège réservé | même siège, statut précédent |

Le nombre minimum et la politique de sièges non remplis sont des choix produit
à valider avant le ticket d'implémentation. Recommandation : le démarrage
nécessite au moins deux joueurs humains prêts ; aucun siège manquant n'est
converti silencieusement en IA.

## 4. Contrats HTTP

Les routes sont proposées sous `/api/v1/rooms`. Elles manipulent le salon,
mais ne portent aucune règle de combat ou de déplacement.

| Méthode | Route | Résultat |
|---|---|---|
| `POST` | `/rooms` | crée le salon et retourne le snapshot privé de l'hôte avec sa session |
| `GET` | `/rooms/{roomId}` | retourne le snapshot autorisé pour la session courante |
| `POST` | `/rooms/{roomId}/join` | réserve un siège ou renvoie une session de reconnexion |
| `POST` | `/rooms/{roomId}/ready` | change la disponibilité du siège courant |
| `POST` | `/rooms/{roomId}/leave` | libère le siège ou lance la politique de transfert d'hôte |
| `POST` | `/rooms/{roomId}/start` | demande le démarrage à l'hôte |
| `DELETE` | `/rooms/{roomId}` | annulation explicite par l'hôte avant le démarrage |

Chaque mutation exige la session de salon dans un cookie sécurisé ou un
en-tête d'autorisation. Les réponses de mutation contiennent au minimum le
snapshot public et la nouvelle `revision`. Elles ne renvoient pas le token
secret dans les logs ou dans les messages d'erreur.

Exemple de création :

```json
{
  "capacity": 2,
  "displayName": "Aventurier"
}
```

Réponse conceptuelle :

```json
{
  "room": {
    "roomId": "room_7f...",
    "status": "waiting",
    "capacity": 2,
    "revision": 1,
    "seats": []
  },
  "session": {
    "sessionId": "session_...",
    "seatId": "seat_...",
    "reconnectUntil": "2026-10-21T12:00:00Z"
  }
}
```

Les identifiants et dates ci-dessus sont illustratifs. Leur format définitif
doit être choisi avec la bibliothèque de validation du serveur.

## 5. Flux WebSocket

Après création ou entrée, le client ouvre un flux authentifié sur
`/api/v1/rooms/{roomId}/events`.

Événements de salon minimaux :

```ts
type RoomEventType =
  | 'room.created'
  | 'seat.joined'
  | 'seat.ready'
  | 'seat.unready'
  | 'seat.disconnected'
  | 'seat.reconnected'
  | 'seat.left'
  | 'room.starting'
  | 'room.started'
  | 'room.finished'
  | 'room.expired';
```

Chaque événement porte `protocolVersion`, `eventId`, `roomId`, `revision`,
`occurredAt` et un payload minimal. Le serveur diffuse uniquement les données
autorisées au siège connecté. Les événements de jeu suivent ensuite le
contrat du ticket #35.

## 6. Concurrence et idempotence

Une mutation de salon doit être traitée dans une section critique par
`roomId`. La preuve de concept peut utiliser une file mémoire par salon ; la
version persistante devra utiliser une transaction ou un verrou équivalent.

Les commandes de mutation portent un `commandId`. Le serveur conserve le
résultat des dernières commandes par session : un retry avec le même identifiant
retourne le résultat déjà produit, sans recréer de siège ni incrémenter deux
fois la révision.

Un client qui envoie une mutation sur une révision périmée reçoit :

```json
{
  "code": "ROOM_REVISION_CONFLICT",
  "currentRevision": 12,
  "retryable": true
}
```

Il doit d'abord récupérer le snapshot courant. Le serveur ne tente pas de
fusionner silencieusement deux actions concurrentes.

## 7. Erreurs publiques

| Code | HTTP | Signification | Action client |
|---|---:|---|---|
| `ROOM_NOT_FOUND` | 404 | identifiant inconnu ou masqué après expiration | afficher que le salon n'est plus disponible |
| `ROOM_FULL` | 409 | capacité atteinte | proposer un autre salon |
| `ROOM_CLOSED` | 409 | salon démarré, terminé ou expiré | revenir à l'accueil |
| `ROOM_NAME_INVALID` | 422 | nom absent, trop long ou interdit | corriger le champ |
| `ROOM_NOT_HOST` | 403 | action réservée à l'hôte | actualiser le rôle |
| `ROOM_NOT_READY` | 409 | précondition de démarrage absente | afficher les sièges manquants |
| `ROOM_SESSION_INVALID` | 401 | session absente, expirée ou révoquée | rejoindre ou restaurer la session |
| `ROOM_REVISION_CONFLICT` | 409 | état client périmé | récupérer puis rejouer avec discernement |
| `ROOM_RATE_LIMITED` | 429 | trop de créations, entrées ou retries | attendre avec backoff |

Les messages destinés à l'utilisateur restent séparés des codes stables. Le
serveur ne doit pas révéler si un `roomId` existe lorsque la session n'est pas
autorisée à le consulter.

## 8. Hôte, déconnexion et expiration

La règle de transfert d'hôte doit être explicite avant implementation.
Recommandation :

1. l'hôte peut annuler le salon tant qu'il est en `waiting` ou `ready` ;
2. s'il se déconnecte temporairement, son siège est réservé pendant la
   fenêtre de reconnexion ;
3. après expiration de cette fenêtre, le rôle est transféré au joueur prêt le
   plus ancien, avec un événement `host.transferred` ;
4. si aucun joueur ne peut reprendre, le salon expire ;
5. une partie déjà `playing` n'est jamais détruite par une simple fermeture de
   navigateur : le moteur poursuit ou applique sa politique de pause.

Le choix entre transfert automatique et annulation est un **CHOIX PRODUIT**.
La preuve de concept doit tester les deux options avant de figer le contrat.

## 9. Matrice de validation

La conception sera considérée prête pour implémentation lorsque la preuve de
concept couvrira :

| Scénario | Attendu |
|---|---|
| création avec capacité valide | un hôte et une session sont créés |
| capacité trop basse ou trop haute | rejet sans salon partiellement créé |
| deux entrées simultanées sur le dernier siège | une seule réussit, l'autre reçoit `ROOM_FULL` |
| entrée répétée avec même `commandId` | même résultat, une seule révision |
| tous les joueurs prêts | état `ready` et événement ordonné |
| départ avant démarrage | siège libéré, révision diffusée |
| démarrage par un non-hôte | refus `ROOM_NOT_HOST` |
| démarrage sans minimum ou sans readiness | refus `ROOM_NOT_READY` |
| coupure puis reconnexion | même siège, événements manquants rattrapés |
| reconnexion après expiration | refus contrôlé, aucune nouvelle partie |
| expiration sans activité | salon nettoyé sans fuite de session |
| récupération d'un salon terminé | état terminal en lecture seule |
| accès avec session d'un autre salon | refus sans fuite de données |

Les tests doivent être exécutés contre la machine d'état et le transport. Les
tests Angular existants vérifient le mode local ; ils ne prouvent pas la
concurrence réseau.

## 10. Décisions à valider

Les points suivants restent volontairement ouverts :

- capacité exacte proposée dans l'interface et possibilité de la modifier ;
- code d'invitation lisible ou partage du lien complet ;
- transfert automatique de l'hôte ;
- durée de réservation d'un siège déconnecté ;
- comportement d'une partie active lorsque l'hôte disparaît ;
- maintien des salons terminés et politique de purge ;
- prise en charge de sièges IA dans un salon en ligne ;
- choix du fournisseur d'authentification et du service temps réel.

Ces points ne doivent pas être tranchés par une implémentation technique
implicite. La recommandation par défaut est un salon privé, 2 à 5 joueurs,
invités authentifiés par session courte, sans spectateur ni IA en ligne pour le
premier incrément.

## Conclusion

Le salon est un agrégat autonome avec une identité, des sièges, des sessions,
une révision et un cycle de vie strict. Ses mutations sont sérialisées,
idempotentes et diffusées sous forme d'événements. Ce contrat est prêt pour une
preuve de concept mémoire dans le ticket suivant, sans modifier l'application
locale ni les règles du jeu.
