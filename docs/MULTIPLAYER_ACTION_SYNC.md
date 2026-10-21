# Conception de la synchronisation des actions

**Ticket :** V3.0-03 — Concevoir la synchronisation des actions
**Date :** 21 octobre 2026
**Dépendances :** [`MULTIPLAYER_ARCHITECTURE.md`](MULTIPLAYER_ARCHITECTURE.md), [`MULTIPLAYER_ROOMS.md`](MULTIPLAYER_ROOMS.md)
**Statut :** contrat prêt pour preuve de concept

Ce document définit comment une intention de joueur devient une transition
autorisée et visible par tous. Il ne crée pas de transport, de serveur ou de
code de production. Le mode local conserve ses services Angular et son
fonctionnement sans réseau.

## 1. Principes non négociables

- Le serveur est la source de vérité de l'état partagé.
- Le client envoie une intention, jamais un résultat ou un nouvel état à
  accepter tel quel.
- Une commande est traitée une seule fois par `commandId`, même si le client
  la renvoie après un timeout.
- Une partie possède une révision monotone ; aucune commande n'est appliquée
  sur une base périmée sans décision explicite du serveur.
- Une transition métier et ses événements sont commités atomiquement.
- Les animations, délais, focus et états de bouton restent locaux à l'interface.
- Une coupure réseau ne doit ni donner deux actions, ni faire perdre une action
  déjà confirmée.

Le transport peut donc être au moins une fois, tandis que l'application métier
reste effectivement une fois grâce à l'idempotence et à la persistance du
résultat de commande.

## 2. Unités synchronisées

Une action synchronisée est une action qui peut modifier la partie ou avancer
la résolution. Les gestes purement visuels ne transitent pas.

| Catégorie | Commandes proposées | Résultat serveur |
|---|---|---|
| Préparation | `setup.configure`, `setup.draw-heroes`, `setup.roll-first-player`, `setup.start` | état de préparation et joueur actif |
| Tour | `turn.move`, `turn.explore`, `turn.end` | position, mouvements, pioche ou changement de joueur |
| Exploration | `exploration.confirm`, `exploration.cancel` | tuile posée et contenu révélé, ou annulation |
| Combat | `combat.roll`, `combat.reroll`, `combat.resolve` | dés tirés par le serveur, verdict et reprise |
| Récompense | `reward.collect`, `reward.decline`, `equipment.replace` | inventaire, tuile et fin/reprise du tour |
| Pouvoirs | `power.choose`, `power.confirm` | transition propre au pouvoir et suite de résolution |
| Portail/récupération | `portal.select`, `portal.use`, `recovery.rest` | cible, destination, vies et mouvements |

Les noms sont des identifiants de protocole proposés, pas des méthodes à
exposer directement depuis les composants Angular. Une sélection de cible ou
une rotation de prévisualisation peut rester locale jusqu'à la commande de
confirmation ; le serveur revalide toujours la sélection finale.

## 3. Enveloppe de commande

```ts
interface ActionCommandV1<TPayload = Record<string, unknown>> {
  protocolVersion: 1;
  commandId: string;
  roomId: string;
  sessionId: string;
  actorPlayerId: string;
  baseRevision: number;
  type: string;
  payload: TPayload;
  sentAt: string;
}
```

### Règles des champs

| Champ | Règle |
|---|---|
| `protocolVersion` | version du format, indépendante de la version du jeu |
| `commandId` | UUID aléatoire unique au moins pour la durée de rétention du journal |
| `roomId` / `sessionId` | issus de la session authentifiée, contrôlés côté serveur |
| `actorPlayerId` | fourni pour le diagnostic mais comparé au siège de session |
| `baseRevision` | dernière révision rendue au client lors de son intention |
| `type` | liste blanche par version, jamais une méthode arbitraire |
| `payload` | schéma strict propre à `type`, sans propriété inconnue acceptée par défaut |
| `sentAt` | informatif et borné ; ne décide jamais de l'ordre métier |

Le client ne doit pas générer `actorPlayerId` à partir d'un index visuel ni
envoyer d'objets métier sérialisés (`Player`, `PlacedTile`, signaux Angular).
Les références réseau utilisent des identifiants stables : `playerId`,
`tileId`, `tokenId` ou coordonnées validées selon le contrat concerné.

## 4. Cycle de traitement serveur

```text
reçu
  │
  ├─ session/room/type invalides ───────────────> rejet non mutatif
  │
  ├─ commandId déjà traité ─────────────────────> réponse mémorisée
  │
  ├─ baseRevision périmée ──────────────────────> conflit + rattrapage
  │
  └─ session valide + révision courante
       │ authentifier l'acteur et valider le payload
       │ appliquer la transition du moteur avec RNG serveur
       │ commit état + journal + résultat de commande
       ▼
     accusé accepté + événements diffusés
```

Le verrou porte sur la partie, pas sur la connexion. Une seule commande peut
muter un salon à la fois ; les autres attendent ou reçoivent un résultat
déterministe. Une commande refusée ne consomme ni aléatoire, ni mouvement, ni
récompense et n'incrémente pas la révision.

## 5. Accusés et événements

### Accusé accepté

```ts
interface ActionAcceptedV1 {
  kind: 'accepted';
  commandId: string;
  roomId: string;
  firstRevision: number;
  lastRevision: number;
  eventIds: readonly string[];
}
```

Une commande peut produire plusieurs événements : par exemple un déplacement
peut consommer un mouvement, révéler une tuile et déclencher une résolution.
Le client affiche l'accusé comme confirmation technique, puis rend les
événements dans l'ordre reçu.

### Rejet

```ts
interface ActionRejectedV1 {
  kind: 'rejected';
  commandId: string;
  code:
    | 'SESSION_INVALID'
    | 'ACTOR_NOT_ACTIVE'
    | 'PHASE_INVALID'
    | 'PENDING_DECISION_REQUIRED'
    | 'PAYLOAD_INVALID'
    | 'RULE_VIOLATION'
    | 'REVISION_CONFLICT'
    | 'COMMAND_EXPIRED';
  currentRevision: number;
  retryable: boolean;
}
```

Les erreurs de règle sont stables et exploitables par l'interface ; le serveur
ne renvoie pas une trace interne ou un message dépendant de la langue.

### Événement métier

```ts
interface ActionEventV1<TPayload = Record<string, unknown>> {
  protocolVersion: 1;
  eventId: string;
  roomId: string;
  revision: number;
  type: string;
  actorPlayerId: string | null;
  payload: TPayload;
  stateHash: string;
  occurredAt: string;
}
```

`stateHash` aide à diagnostiquer une divergence et n'est pas un mécanisme de
sécurité. Il est calculé sur une représentation canonique du snapshot public.
Les événements ne contiennent pas de référence DOM, de timer ou de promesse.

## 6. Révisions et rattrapage

Le serveur conserve un snapshot autoritaire et un journal court des événements.
Le client conserve seulement le dernier événement appliqué avec succès.

### Flux normal

1. le client rend le snapshot à la révision `R` ;
2. il envoie une commande avec `baseRevision: R` ;
3. le serveur committe les événements `R+1...R+n` ;
4. le client les applique dans l'ordre et publie `lastAppliedRevision = R+n` ;
5. toute action d'interface nouvelle part de cette dernière révision.

### Conflit

Si la commande arrive avec une base plus ancienne, le serveur renvoie
`REVISION_CONFLICT`, la révision actuelle et la possibilité de rattrapage. Le
client ne rejoue pas automatiquement une action potentiellement dangereuse
comme un déplacement, un lancer ou une consommation de récompense. Il actualise
l'état et demande une nouvelle intention de l'utilisateur.

### Reconnexion

Le client envoie :

```ts
interface ResumeRequestV1 {
  roomId: string;
  sessionId: string;
  lastAppliedRevision: number;
}
```

Le serveur répond soit par les événements manquants, soit par un snapshot
complet si la rétention du journal est dépassée. Un événement de présentation
perdu n'est jamais rejoué seul ; l'état métier est prioritaire.

## 7. Client Angular et états d'interface

Le futur adaptateur en ligne doit distinguer trois états :

| État | Signification | Action utilisateur |
|---|---|---|
| `idle` | aucune commande en attente | peut choisir une action autorisée |
| `pending(commandId)` | commande envoyée, résultat inconnu | contrôles concernés verrouillés, reconnexion permise |
| `reconciling` | snapshot ou événements en cours d'application | aucune nouvelle mutation locale |

Après `accepted`, l'adaptateur ne doit pas appliquer une mutation optimiste
qui ferait ensuite doublon avec l'événement serveur. Une animation peut démarrer
à la réception de l'événement correspondant, comme présentation dérivée de la
transition confirmée.

Le mode local peut conserver les appels directs à `GameService`. Le mode en
ligne devra exposer une façade de commandes de même intention, sans partager
les instances de `Player`, `PlacedTile` ou les signaux Angular avec le serveur.

## 8. Actions longues et décisions obligatoires

Les décisions obligatoires doivent apparaître dans le snapshot autoritaire par
un discriminant et des identifiants, conformément au modèle de sauvegarde
existant. Un client reconnecté doit savoir quelle décision attend son joueur
sans rejouer l'animation précédente.

Exemples :

- un combat expose `pendingCombatId` et les dés déjà tirés ;
- une exploration expose la tuile proposée, la source et les rotations valides ;
- une récompense expose les choix encore disponibles et leur propriétaire ;
- un pouvoir expose une liste d'options identifiées, jamais des callbacks ;
- un portail expose la cible et les destinations autorisées.

Une décision expirée ou résolue ne peut plus être soumise. Le serveur renvoie
`PENDING_DECISION_REQUIRED` ou `RULE_VIOLATION` selon que l'action est absente
ou incompatible avec l'état courant.

## 9. Persistance et reprise

Pour chaque commande acceptée, le stockage doit pouvoir retrouver :

- `commandId`, session et joueur auteur ;
- révision avant/après ;
- type et payload validé, sans secret ;
- événements produits ;
- date et résultat accepté/refusé.

Les payloads peuvent contenir des données de jeu mais doivent respecter une
durée de rétention limitée et une politique de minimisation. Les tokens de
session et secrets ne sont jamais journalisés. Un snapshot périodique permet de
purger les événements anciens sans perdre la capacité de reprise.

## 10. Tests de synchronisation

| Niveau | Scénarios obligatoires |
|---|---|
| Schéma | types inconnus, champs manquants, identifiants mal formés, version incompatible |
| Moteur | même snapshot + même commande + même RNG = mêmes événements |
| Idempotence | retry d'un `commandId` après timeout, aucun double mouvement ou double récompense |
| Concurrence | deux commandes sur la même révision, une seule transition acceptée |
| Autorité | acteur inactif, session d'un autre siège, phase ou décision incompatible |
| Révisions | conflit, replay partiel, snapshot de rattrapage, hash divergent |
| Transport | ordre WebSocket, reconnexion, fermeture puis reprise, backoff |
| Interface | boutons verrouillés pendant pending, erreur lisible, retour à l'état autoritaire |
| Rejeu | séquence complète préparation → exploration → combat → fin de partie |

Les tests multi-client doivent utiliser deux sessions indépendantes. Un test
qui appelle directement un service Angular ne prouve pas la synchronisation
réseau et doit rester identifié comme test du mode local.

## 11. Versionnement et observabilité

Le protocole et le moteur évoluent séparément :

- une incompatibilité de protocole est refusée avant toute mutation ;
- les événements conservent leur version de schéma ;
- un compteur de commandes acceptées/refusées et de conflits est mesuré ;
- les latences réception → accusé et accusé → événement sont séparées ;
- `roomId`, `commandId` et `revision` servent de corrélation, sans secret ;
- un rejeu de diagnostic ne doit jamais réémettre une commande en production.

Une migration qui change la forme d'un snapshot doit prévoir une conversion
atomique ou une version de lecture parallèle. Elle ne doit pas modifier les
règles officielles implicitement.

## 12. Décisions restantes

- choisir la durée de rétention du journal et la taille maximale d'un snapshot ;
- décider si les événements de préparation et de partie partagent le même
  flux ;
- arrêter la liste exhaustive des commandes après cartographie des méthodes de
  `GameService` ;
- valider la stratégie RNG : graine de partie rejouable ou tirages séquentiels
  persistés ;
- définir les données privées si une extension introduit des informations
  cachées ;
- choisir la bibliothèque de validation de schéma et le format de hash ;
- décider le comportement de l'interface après un conflit non rejouable.

Ces éléments doivent être tranchés dans la preuve de concept, pas par des
valeurs implicites dans l'adaptateur Angular.

## Conclusion

La synchronisation repose sur des commandes intentionnelles versionnées, une
révision de base, un traitement sérialisé et des événements confirmés. Les
retries sont sûrs par idempotence, les conflits sont explicites et la
reconnexion privilégie le snapshot autoritaire. Le contrat est prêt à être
implémenté après la validation produit des décisions restantes.
