# Gestion des déconnexions et reconnexions

**Ticket :** V3.0-04 — Gérer les déconnexions et reconnexions
**Date :** 21 octobre 2026
**Dépendances :** [`MULTIPLAYER_ARCHITECTURE.md`](MULTIPLAYER_ARCHITECTURE.md), [`MULTIPLAYER_ROOMS.md`](MULTIPLAYER_ROOMS.md), [`MULTIPLAYER_ACTION_SYNC.md`](MULTIPLAYER_ACTION_SYNC.md)
**Statut :** stratégie prête pour preuve de concept

Cette stratégie complète le protocole des salons et des actions. Elle ne
modifie pas le mode local, ne prend pas le contrôle d'un joueur à sa place et
n'introduit pas encore de serveur.

## 1. Objectifs et menaces

Une reconnexion doit permettre à un joueur de retrouver son siège et l'état
autoritaire sans appliquer deux fois une action. Le système doit distinguer :

| Incident | Exemple | Traitement attendu |
|---|---|---|
| coupure transitoire | Wi-Fi perdu quelques secondes | conserver la session, reconnecter automatiquement |
| suspension du navigateur | onglet mobile en arrière-plan | heartbeat repris au retour, rattrapage par révision |
| fermeture/rechargement | F5 ou crash de l'onglet | restaurer le siège avec le jeton de session |
| expiration de session | absence prolongée | demander une nouvelle entrée ou afficher l'expiration |
| redémarrage du serveur | déploiement ou crash | reprendre depuis un snapshot durable |
| commande incertaine | timeout après envoi | interroger le `commandId` avant tout renvoi |
| session remplacée | même siège ouvert ailleurs | invalider l'ancienne connexion sans dupliquer le joueur |

Le navigateur `navigator.onLine` est un indice d'interface, jamais une preuve
que le serveur a reçu ou traité une commande.

## 2. Cycle de session

```text
connected ── heartbeat manqué ──> degraded ── délai dépassé ──> disconnected
    ▲                                  │                              │
    └────── reprise réussie <──────────┴──────── reconnecting <────────┘
                                                                  │
                                       fenêtre dépassée ──────────┴─> expired
```

### États côté client

| État | Affichage | Mutations autorisées |
|---|---|---|
| `connected` | présence normale | commandes autorisées par le snapshot |
| `degraded` | avertissement non bloquant | nouvelle commande possible seulement si le flux répond |
| `disconnected` | reconnexion en cours | aucune mutation locale partagée |
| `reconciling` | rattrapage des événements/snapshot | aucune nouvelle commande |
| `expired` | session terminée | rejoindre ou quitter, jamais rejouer automatiquement |

Les états de connexion ne sont pas des états du moteur de jeu. Ils sont
présentés localement et ne doivent pas être persistés comme une phase métier.

## 3. Heartbeat et détection

Le WebSocket utilise un heartbeat applicatif ou celui du serveur de transport :

```ts
interface HeartbeatV1 {
  type: 'ping' | 'pong';
  connectionId: string;
  sentAt: string;
}
```

Recommandations initiales, à mesurer en environnement réel :

- ping serveur toutes les 15 secondes ;
- passage en `degraded` après deux réponses manquantes ;
- fermeture et passage en `disconnected` après 45 secondes sans preuve de
  connexion ;
- aucune expiration de siège avant la fenêtre de reconnexion du salon ;
- temporisation avec backoff exponentiel borné et jitter : 1 s, 2 s, 4 s,
  8 s, puis 15 s maximum.

Les timers sont suspendus ou ralentis par les navigateurs mobiles. Au retour de
`visibilitychange`, le client ne suppose pas que la connexion est saine : il
ouvre ou vérifie une connexion, puis reprend par révision.

## 4. Jeton de reconnexion

La création ou l'entrée dans un salon fournit un identifiant de session et un
jeton opaque. Le navigateur peut conserver ce jeton dans un stockage de session
pour survivre à un rechargement ; il ne doit pas l'écrire dans les logs, les
URLs, les captures ou le journal métier.

```ts
interface ReconnectionGrantV1 {
  roomId: string;
  sessionId: string;
  seatId: string;
  reconnectUntil: string;
  tokenVersion: 1;
}
```

Le serveur conserve uniquement une empreinte du jeton. La rotation doit être
possible après une reconnexion réussie. Une révocation explicite rend le jeton
inutilisable même si sa date d'expiration n'est pas dépassée.

La session est liée à un siège et non à un onglet. Deux connexions simultanées
avec le même jeton sont soit fusionnées sur une connexion principale, soit
résolues par remplacement explicite ; elles ne doivent jamais produire deux
acteurs autorisés pour le même siège.

## 5. Flux de reprise

Le client doit traiter une reconnexion comme une nouvelle lecture autoritaire :

1. suspendre les commandes et conserver uniquement les `commandId` en attente ;
2. ouvrir une connexion avec `roomId` et le jeton de session ;
3. envoyer `lastAppliedRevision` et `lastKnownStateHash` ;
4. recevoir les événements manquants ou un snapshot complet ;
5. vérifier la continuité des révisions et remplacer l'état de présentation ;
6. demander le statut des commandes en attente ;
7. reprendre les commandes seulement après le retour à `connected`.

```ts
interface ResumeRequestV1 {
  roomId: string;
  sessionId: string;
  lastAppliedRevision: number;
  lastKnownStateHash: string | null;
}

type ResumeResultV1 =
  | { kind: 'events'; fromRevision: number; events: readonly ActionEventV1[] }
  | { kind: 'snapshot'; revision: number; stateHash: string; snapshot: unknown }
  | { kind: 'expired'; reason: 'SESSION_EXPIRED' | 'ROOM_EXPIRED' | 'SEAT_REVOKED' };
```

Le serveur n'envoie les événements manquants que si leur première révision
correspond exactement à `lastAppliedRevision + 1`. Sinon, il force un snapshot.
Le client ne tente pas de reconstruire une partie à partir d'un flux incomplet.

## 6. Commandes dont le résultat est inconnu

Le cas le plus dangereux est une coupure après envoi mais avant réception de
l'accusé. Le client conserve alors :

```ts
interface PendingCommandRecord {
  commandId: string;
  type: string;
  createdAt: string;
  baseRevision: number;
  status: 'unknown' | 'accepted' | 'rejected';
}
```

À la reprise :

1. le client appelle `GET /rooms/{roomId}/commands/{commandId}` ou envoie une
   requête de statut équivalente ;
2. si la commande est acceptée, il applique les événements déjà connus ou les
   récupère par révision ;
3. si elle est refusée, il retire l'attente et affiche l'erreur adaptée ;
4. si elle est absente mais encore dans la fenêtre de traitement, il attend ou
   renvoie le même `commandId` ;
5. il ne génère jamais un nouveau `commandId` pour une action dont l'effet est
   inconnu.

Un renvoi automatique n'est acceptable que pour la même commande idempotente,
jamais pour une nouvelle intention calculée à partir d'un ancien écran.

## 7. Joueur actif déconnecté

La déconnexion d'un joueur actif exige une décision produit et ne doit pas être
résolue par un timeout implicite dans le code. Recommandation pour le premier
prototype :

- conserver le siège et bloquer la résolution de son tour pendant une courte
  fenêtre de reconnexion ;
- informer les autres joueurs de l'état `disconnected`, sans révéler le jeton ;
- reprendre la décision obligatoire exactement où elle était, à partir du
  snapshot serveur ;
- après expiration, appliquer une politique explicitement validée : pause de
  la partie, abandon du joueur ou fin contrôlée du tour ;
- ne pas remplacer automatiquement un humain par l'IA sans choix produit et
  sans événement visible.

Le serveur reste maître du délai. Le client ne peut pas simuler une fin de tour
parce que son onglet est hors ligne.

## 8. Redémarrage et reprise serveur

Un redémarrage ne doit pas dépendre de la mémoire du processus. Pour une partie
`playing`, le stockage conserve au minimum :

- snapshot autoritaire et `revision` ;
- journal d'événements encore nécessaire au rattrapage ;
- commandes récentes et leur résultat ;
- sièges, sessions hachées et dates d'expiration ;
- état de pause ou de décision obligatoire.

Au démarrage, le serveur recharge les salons non expirés, vérifie le hash du
snapshot et marque comme indisponu une donnée incohérente. Il vaut mieux
refuser la reprise d'une partie corrompue que proposer une divergence silencieuse.

Les salons `waiting` sans activité peuvent être purgés plus tôt que les
parties `playing` ou `finished`. La politique de rétention est documentée et
mesurée séparément du cache des connexions.

## 9. Réconciliation et données privées

Le snapshot de reprise est filtré selon le siège. La présence d'un joueur est
publique dans le salon, mais un futur état caché (tirage non révélé, choix
privé, information d'extension) ne doit pas être inclus dans un snapshot destiné
à un autre joueur.

Après réception :

- vérifier `roomId`, `protocolVersion`, révision et hash ;
- remplacer les collections autoritaires, ne pas fusionner par index ;
- invalider les références visuelles et les animations en cours ;
- reconstruire uniquement les décisions encore présentes dans le snapshot ;
- restaurer le focus sur le conteneur de la décision courante si le joueur est
  autorisé à agir.

Le client doit afficher une information de reprise compréhensible, par exemple
« Partie resynchronisée », sans exposer de détails techniques aux autres
joueurs.

## 10. Tests de déconnexion

| Niveau | Scénario | Attendu |
|---|---|---|
| session | rechargement immédiat | même siège, aucun doublon |
| réseau | coupure avant heartbeat puis retour | passage degraded/disconnected, reprise automatique |
| réseau | coupure après envoi d'une commande | statut du même `commandId`, aucun double effet |
| révision | événements manquants disponibles | replay contigu puis connected |
| révision | journal purgé | snapshot complet, hash cohérent |
| décision | déconnexion pendant combat/choix | décision conservée, pas de résolution locale |
| tour | joueur actif déconnecté | politique de grâce/timeout explicitement appliquée |
| session | ancien jeton révoqué | refus et sortie contrôlée |
| concurrence | deux onglets du même siège | un seul acteur autorisé, événement de remplacement/fusion |
| serveur | redémarrage pendant une partie | reprise depuis snapshot durable |
| expiration | retour après `reconnectUntil` | session expirée, pas de réintégration silencieuse |
| sécurité | jeton d'un autre salon | refus sans fuite de snapshot |
| interface | mobile en arrière-plan puis retour | pas de débordement, état pending réconcilié |

La preuve de concept doit utiliser deux navigateurs et des sessions distinctes.
Les tests E2E locaux actuels ne valident pas ces scénarios réseau tant qu'aucun
serveur n'est implémenté ; ils restent des tests de non-régression du mode
local.

## 11. Observabilité et support

Les métriques minimales sont :

- durée et résultat des tentatives de reconnexion ;
- nombre de sessions expirées, remplacées et révoquées ;
- commandes `unknown` résolues par statut ;
- conflits de révision et demandes de snapshot complet ;
- salons bloqués par déconnexion du joueur actif ;
- temps entre dernière révision client et rattrapage complet.

Les logs corrèlent `roomId`, `seatId`, `sessionId` tronqué, `commandId` et
`revision`, mais jamais le jeton. Une page de support doit pouvoir distinguer
un problème de réseau, une session expirée et une commande refusée par le
moteur.

## 12. Décisions à valider

- durée exacte de la fenêtre de reconnexion ;
- politique d'un joueur actif qui ne revient pas ;
- transfert ou non du rôle d'hôte après reconnexion manquée ;
- persistance des parties `playing` et durée de conservation des parties
  `finished` ;
- nombre maximal de tentatives et durée maximale de backoff ;
- fusion de deux onglets du même siège ou remplacement du premier ;
- données privées nécessaires aux futures extensions.

Ces points sont des **CHOIX PRODUIT**. La recommandation technique est de les
stocker dans une configuration versionnée du serveur, pas dans des constantes
du client.

## Conclusion

La reconnexion est une reprise autoritaire par session et par révision, pas une
restauration optimiste de l'état local. Le traitement des commandes inconnues,
la rétention des snapshots, le heartbeat et les décisions interrompues sont
définis pour être implémentés et testés dans les tickets suivants.
