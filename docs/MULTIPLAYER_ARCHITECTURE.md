# Étude d'architecture multijoueur

**Ticket :** V3.0-01 — Étudier l'architecture multijoueur
**Date :** 21 octobre 2026
**Statut :** étude validée, implémentation différée

Cette étude prépare les tickets V3.0 suivants sans introduire de backend,
dépendance réseau ou changement de règle dans l'application actuelle.

## 1. État observé

| Sujet | État actuel | Conséquence pour le multijoueur |
|---|---|---|
| Interface | Angular standalone et routes chargées à la demande | Peut conserver la présentation et recevoir un adaptateur en ligne |
| État métier | Services Angular en mémoire, avec `GameService` comme façade | Le client actuel ne peut pas être la source d'autorité partagée |
| Services métier | `PlayerService`, `TurnService`, `DungeonService`, `ExplorationService`, `CombatService`, `AiService` | Les règles sont déjà réparties, mais plusieurs transitions sont orchestrées par `GameService` |
| Sauvegarde | `SaveService` et `localStorage`, enveloppe `karak-save` version 2 | Adaptée au mode local ; insuffisante pour une reprise depuis un autre appareil |
| Réseau | Aucun serveur, HTTP métier ou WebSocket | Aucun contrat de synchronisation existant |
| Déploiement | Artefact statique prévu pour OVH | Un serveur temps réel doit être hébergé séparément ou sur une offre compatible |

Le mode local doit rester inchangé et continuer à fonctionner sans connexion.
L'architecture en ligne est une capacité supplémentaire, pas un remplacement
du parcours actuel.

## 2. Cible recommandée

Le serveur devient l'autorité d'une partie. Le navigateur envoie des
commandes intentionnelles ; il ne transmet jamais un score, un état complet ou
un résultat de dé. Le serveur valide la commande, applique le moteur métier et
diffuse l'événement autoritatif aux participants.

```text
Angular local/online
        │ HTTPS : créer/rejoindre une partie
        │ WebSocket : commandes et événements
        ▼
Gateway de partie ── Authentification de session
        ▼
Room Authority ── une file séquentielle par partie
        ▼
Moteur Karak déterministe ── règles, tours, combats, RNG serveur
        ▼
Snapshot + journal de révisions ── stockage durable
```

### Responsabilités

| Élément | Responsabilité | Interdit |
|---|---|---|
| Client Angular | Afficher un snapshot, demander une action, gérer l'attente et la reconnexion | Décider du résultat, modifier l'état partagé ou avancer le tour localement |
| API de salon | Créer, rejoindre, quitter et obtenir les métadonnées d'une partie | Appliquer une règle de jeu dans le contrôleur HTTP |
| WebSocket Gateway | Authentifier la session, recevoir les commandes et diffuser les événements | Faire confiance aux données métier envoyées par le client |
| Room Authority | Sérialiser les commandes d'un salon et contrôler la révision | Permettre deux mutations concurrentes de la même partie |
| Moteur de domaine | Valider les préconditions, tirer l'aléatoire serveur, produire les événements | Dépendre d'Angular, du DOM, d'un socket ou de `localStorage` |
| Stockage | Conserver salons, joueurs, snapshots et journal court des événements | Être accessible directement depuis le navigateur |

La première extraction ne doit pas réécrire `GameService`. Elle doit isoler un
contrat de commandes et un moteur testable par caractérisation, puis conserver
la façade Angular comme adaptateur du mode local tant que les invariants ne
sont pas couverts.

## 3. Contrat de synchronisation

Le protocole doit être versionné dès son premier échange. Un format JSON est
suffisant pour la première version ; les messages doivent rester indépendants
des classes TypeScript et des noms de composants.

### Commande client

```ts
interface GameCommandV1 {
  protocolVersion: 1;
  commandId: string;
  matchId: string;
  sessionId: string;
  expectedRevision: number;
  type: 'roll' | 'move' | 'explore' | 'resolve' | 'end-turn';
  payload: Record<string, unknown>;
}
```

`commandId` rend les renvois idempotents. `expectedRevision` permet de rejeter
une action construite sur un état périmé. Les commandes réelles devront être
typées par action et validées par le moteur ; `Record<string, unknown>` ne doit
pas devenir le contrat public final.

### Événement serveur

```ts
interface GameEventV1 {
  protocolVersion: 1;
  eventId: string;
  matchId: string;
  revision: number;
  type: string;
  actorPlayerId: string | null;
  payload: Record<string, unknown>;
}
```

Une commande acceptée produit une ou plusieurs révisions strictement
croissantes. Une commande refusée produit une erreur structurée avec la
révision courante ; elle ne modifie pas la partie.

### Reconnexion

Le client conserve `matchId`, `sessionId` et `lastAppliedRevision`. Après une
reconnexion :

1. il ré-authentifie la session et demande la reprise depuis sa dernière révision ;
2. le serveur rejoue les événements manquants si le journal court les contient ;
3. sinon, il envoie un snapshot complet accompagné de sa révision ;
4. le client remplace son état de présentation et reprend l'écoute des événements suivants.

Une commande en transit peut être renvoyée avec le même `commandId` sans
dupliquer son effet. Les timers d'interface et les animations ne sont jamais
synchronisés comme vérité métier.

## 4. Autorité et invariants

Le serveur doit au minimum garantir :

- identité et droit d'action du joueur dans le salon ;
- joueur actif, phase de partie et décisions obligatoires ;
- validité des déplacements, combats, récompenses et fins de tour ;
- génération aléatoire côté serveur et conservation des résultats dans les
  événements ;
- idempotence et ordre des commandes ;
- absence de mutation partielle lorsqu'une commande est refusée ;
- séparation entre données visibles par tous et données privées éventuelles ;
- fermeture propre d'une partie et conservation de son résultat final.

Le moteur doit produire des transitions déterministes à partir d'un état,
d'une commande et d'une source d'aléatoire fournie par le serveur. Cette forme
permet des tests de rejeu : snapshot initial + séquence de commandes = même
snapshot final.

## 5. Salon et cycle de vie

Le modèle minimal d'un salon est :

```text
waiting-room → ready → playing → finished
       │          │       │
       └──────────┴───────┴→ abandoned/expired
```

Le salon porte un identifiant public non devinable, une version de protocole,
une limite de joueurs cohérente avec le jeu actuel, les sièges, les sessions,
la révision courante et la date d'expiration. Le nom d'affichage ne doit pas
être utilisé comme identifiant de sécurité.

Pour un premier incrément, des sessions invitées signées et limitées dans le
temps suffisent ; un compte utilisateur, une liste d'amis et le classement
global restent hors périmètre. Le serveur doit prévoir une limitation de débit
et l'expiration des salons avant toute ouverture publique.

## 6. Stockage et déploiement

La cible de production recommandée est :

- service Node.js/TypeScript séparé pour HTTP et WebSocket ;
- moteur de domaine partagé avec le client uniquement après extraction et
  couverture des contrats ;
- PostgreSQL ou stockage transactionnel équivalent pour les métadonnées,
  snapshots et résultats ;
- journal de révisions court pour la reconnexion, avec purge contrôlée ;
- Redis/pub-sub seulement si plusieurs instances du serveur sont nécessaires,
  pas comme dépendance initiale du mode local.

L'hébergement statique actuel d'OVH ne suffit pas à lui seul pour un serveur
WebSocket autoritaire. Le frontend peut rester sur le domaine dédié du jeu et
le service temps réel utiliser une origine séparée, avec CORS explicite,
HTTPS/WSS, secrets hors dépôt et politique de sauvegarde documentée.

## 7. Plan d'implémentation par incréments

| Étape | Livrable | Critère de sortie |
|---|---|---|
| 1. Contrats | Types de commandes, événements, erreurs, snapshots et version de protocole | Sérialisation stable et tests de validation |
| 2. Moteur isolé | Réducteur/moteur pur ou façade testable autour des transitions existantes | Rejeu déterministe des parcours locaux sans changement de règle |
| 3. Salon mémoire | Création, entrée, sortie et file séquentielle dans un processus | Deux clients de test observent les mêmes révisions |
| 4. Transport | REST de salon et WebSocket d'événements | Commandes autorisées, refusées et doublons couverts |
| 5. Adaptateur Angular | Mode en ligne distinct du `SaveService` local | Le mode local reste vert et sans réseau |
| 6. Reconnexion | Replay d'événements, snapshot de rattrapage, expiration de session | Rechargement et coupure réseau sans double action |
| 7. Persistance et exploitation | Stockage durable, logs, métriques, limites et déploiement | Recette multi-navigateurs et rollback documenté |

## 8. Décisions et risques

### Décisions proposées

- ne pas introduire de backend dans ce ticket d'étude ;
- conserver le mode local et son format `karak-save` indépendant du protocole réseau ;
- faire transiter des commandes et événements, pas des mutations d'objets ;
- utiliser une révision monotone et un identifiant de commande idempotent ;
- commencer par un serveur monoprocessus avant toute scalabilité horizontale ;
- traiter l'authentification, le rate limiting et l'observabilité comme des prérequis de publication, pas comme des détails ultérieurs.

### Risques à traiter dans les tickets suivants

- extraction de `GameService` sans modifier les invariants existants ;
- divergence entre la façade locale et le moteur partagé ;
- actions longues ou décisions obligatoires interrompues par une coupure ;
- fuite d'informations dans les snapshots et événements ;
- concurrence entre reconnexion, abandon et expiration d'un salon ;
- disponibilité et coût d'un service temps réel séparé de l'hébergement web.

## Conclusion

L'architecture recommandée est un serveur autoritaire par salon, piloté par
des commandes versionnées et diffusant des événements révisés. Elle permet de
sécuriser les règles, de rejouer une partie et de reconnecter un client sans
faire du navigateur la source de vérité.

Cette étude est suffisamment précise pour lancer le ticket #36 (salons), mais
aucun choix d'hébergeur, de fournisseur d'identité ou de persistance définitif
ne doit être considéré comme validé avant une preuve de concept et une
validation produit dédiée.
