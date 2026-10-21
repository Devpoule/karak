# Stratégie de test des parties multijoueurs

**Ticket :** V3.0-05 — Tester les parties multijoueurs
**Date :** 21 octobre 2026
**Dépendances :** conception des salons, synchronisation des actions et reconnexion
**Statut :** stratégie prête ; exécution réseau bloquée par l'absence de serveur

Ce document définit les preuves nécessaires avant d'ouvrir le multijoueur. Il
ne transforme pas les tests Angular locaux en tests réseau et ne modifie pas
les règles de jeu.

## 1. État actuel et limite de la recette

Le dépôt contient uniquement le client Angular et le mode local :

- aucun serveur HTTP/WebSocket de partie ;
- aucune implémentation de salon ou de session réseau ;
- aucune persistance serveur ni environnement de test multi-client ;
- `SaveService` vérifie seulement la continuité locale par `localStorage`.

En conséquence, les tests E2E existants vérifient l'interface et le moteur
local, mais ne peuvent pas prouver une synchronisation entre deux clients.
Cette limite est un résultat de l'audit, pas un test manquant à masquer.

## 2. Pyramide de test cible

```text
                 ┌──────────────────────────────┐
                 │ E2E multi-client + résilience│
                 └──────────────┬───────────────┘
                        ┌───────▼────────┐
                        │ transport/room │
                        └───────┬────────┘
                  ┌────────────▼────────────┐
                  │ moteur + replay + RNG   │
                  └────────────┬────────────┘
             ┌─────────────────▼─────────────────┐
             │ schémas, erreurs, invariants purs │
             └───────────────────────────────────┘
```

Les tests bas niveau doivent être rapides et déterministes. Les scénarios
réseau doivent rester peu nombreux mais couvrir les transitions critiques,
avec deux sessions réellement indépendantes.

## 3. Fixtures canoniques

Chaque partie de test est décrite par une fixture versionnée :

```ts
interface MultiplayerFixtureV1 {
  protocolVersion: 1;
  seed: string;
  players: readonly { displayName: string }[];
  commands: readonly ActionCommandV1[];
  expectedEvents: readonly string[];
  expectedFinalRevision: number;
  expectedStateHash: string;
}
```

La fixture ne doit pas dépendre d'un délai réel, d'un ordre de démarrage de
processus ou d'un index DOM. Le RNG de test est injecté au moteur serveur ; le
client ne contrôle jamais le hasard d'une partie en ligne.

Les séquences minimales sont :

1. création, entrée de deux joueurs, readiness et démarrage ;
2. tour avec déplacement, exploration et résolution obligatoire ;
3. combat avec résultat, récompense et passage au joueur suivant ;
4. fin de partie et classement final ;
5. reprise d'une même séquence depuis un snapshot intermédiaire.

## 4. Contrats et machine de salon

| Domaine | Cas | Preuve attendue |
|---|---|---|
| création | capacité valide, invalide, nom invalide | réponse stable et aucun salon partiel |
| entrée | siège libre, complet, fermé, doublon de session | une seule réservation et code d'erreur déterministe |
| readiness | prêt, annulation, joueur parti | transitions `waiting`/`ready` ordonnées |
| démarrage | hôte, non-hôte, minimum absent, siège non prêt | seul l'hôte satisfait les préconditions |
| départ | joueur non-hôte, hôte avant/après démarrage | politique d'hôte explicitement appliquée |
| expiration | salon vide, siège déconnecté, partie terminée | purge sans réutilisation de session |
| sécurité | autre salon, token invalide, replay d'une requête | refus sans fuite de snapshot |

Les tests de salon doivent vérifier à la fois l'état final et la séquence des
événements publics. Un état correct obtenu avec des événements dans le mauvais
ordre reste un échec.

## 5. Synchronisation des actions

| Cas | Action de test | Attendu |
|---|---|---|
| action valide | commande à la révision courante | accusé accepté, événements contigus |
| acteur illégal | joueur non actif ou autre siège | rejet sans mutation |
| payload illégal | destination, rotation ou choix impossible | `PAYLOAD_INVALID` ou `RULE_VIOLATION` |
| révision périmée | deux commandes partent de `R` | une seule accepte, l'autre reçoit un conflit |
| doublon | même `commandId` deux fois | même résultat, aucun double effet |
| timeout | coupure après envoi | statut du `commandId`, pas de nouvelle commande |
| action longue | combat, coffre, pouvoir ou portail pending | décision conservée et propriétaire respecté |
| ordre | messages retardés ou livrés en rafale | application par révision, jamais par heure d'arrivée |
| RNG | même seed et mêmes commandes | mêmes événements et `stateHash` |

Les assertions doivent vérifier les invariants métier, notamment les mouvements,
les réserves de tuiles/jetons, l'inventaire et le joueur actif. Un simple test
de présence d'un message WebSocket n'est pas suffisant.

## 6. Reconnexion et reprise

| Scénario | Préparation | Attendu |
|---|---|---|
| rechargement | fermer puis rouvrir le client | même `seatId`, aucun joueur doublé |
| coupure courte | interrompre le réseau sous 45 s | état `degraded`, puis reprise automatique |
| retour avec événements disponibles | avancer de quelques révisions | replay contigu à partir de `lastAppliedRevision` |
| retour après purge | dépasser le journal court | snapshot complet et hash cohérent |
| décision pending | couper pendant combat/choix | décision encore affichée au bon joueur |
| commande inconnue | couper avant l'accusé | statut du même `commandId`, effet unique |
| expiration | attendre après `reconnectUntil` | refus contrôlé, aucun rattachement silencieux |
| serveur redémarré | arrêter/reprendre le processus | salons persistés valides, sessions traitées selon leur fenêtre |
| deux onglets | ouvrir deux clients avec un siège | fusion ou remplacement documenté, jamais deux acteurs |

La simulation de réseau doit utiliser les contrôles du navigateur ou du
transport, pas une simple variable `isConnected` dans le client.

## 7. E2E multi-client

Le futur scénario Playwright doit créer deux contextes isolés :

```ts
const host = await browser.newContext();
const guest = await browser.newContext();
```

Le parcours minimum :

1. l'hôte crée un salon privé et conserve sa session ;
2. le second contexte rejoint avec le code prévu ;
3. les deux clients observent les sièges dans le même ordre ;
4. l'hôte démarre après readiness ;
5. le joueur actif effectue une action, les deux clients voient la même
   révision et le même état ;
6. le second client se déconnecte, puis reprend sans doublon ;
7. la partie est terminée ou nettoyée avec une fermeture explicite.

Les tests doivent enregistrer la révision et les erreurs réseau, sans capturer
les tokens de session dans les traces ou les rapports.

## 8. Tests de charge et de robustesse

Ils viennent après la correction fonctionnelle :

- création/expiration de nombreux salons simultanés ;
- entrées concurrentes sur le dernier siège ;
- rafales de retries avec même `commandId` ;
- reconnexions simultanées après redémarrage ;
- snapshots volumineux et purge du journal ;
- limitation de débit sur création, entrée et commandes ;
- fermeture propre de la connexion pendant chaque phase de jeu.

Les seuils de latence et de capacité sont à définir avec l'hébergement choisi.
Il ne faut pas annoncer un objectif de disponibilité avant d'avoir un serveur
et une topologie mesurables.

## 9. CI et rapports

Les jobs futurs seront séparés pour que les anomalies restent classifiables :

| Job | Exécution | Bloquant |
|---|---|---|
| `unit-domain` | moteur, schémas, invariants, replay | oui |
| `room-integration` | machine de salon et concurrence | oui |
| `transport-contract` | HTTP/WebSocket, erreurs et auth | oui |
| `e2e-multiplayer` | deux contextes navigateur | oui avant ouverture publique |
| `resilience` | coupures, reprise, redémarrage | oui avant ouverture publique |
| `load` | charge et limites | seuil à définir, séparé de chaque MR |
| `angular-existing` | suite actuelle du client local | oui pour les régressions nouvelles |

Les cinq échecs existants de `combat-overlay.spec.ts` doivent être suivis
comme baseline séparée tant qu'ils ne sont pas corrigés. Ils ne doivent ni
être supprimés, ni être mélangés avec un échec de transport multijoueur.

## 10. Recette actuellement possible

Sur le dépôt actuel, les contrôles reproductibles sont :

- `npx ng test --no-watch --no-progress` : 365 tests réussis sur 370, avec les
  cinq échecs historiques du combat overlay ;
- `npm run build:production` : réussi ;
- recette Chromium du livrable statique : validée lors du ticket #34, sans
  synchronisation réseau ;
- tests de salon, transport, reconnexion et E2E multi-client : **non exécutables**
  tant que le serveur n'est pas implémenté.

Cette classification est le résultat attendu pour l'état actuel du projet. La
recette réseau ne sera déclarée réussie qu'après l'ajout de l'infrastructure
correspondante.

## 11. Critères de sortie du chantier V3.0

Le multijoueur pourra être considéré comme testable lorsque :

1. une fixture canonique peut être rejouée côté serveur ;
2. deux sessions obtiennent les mêmes révisions et snapshots publics ;
3. les doublons et conflits n'ont aucun double effet ;
4. une coupure pendant chaque décision obligatoire est récupérable ;
5. un redémarrage serveur ne corrompt pas les parties persistées ;
6. les erreurs, logs et mesures ne contiennent pas de secrets ;
7. les suites obligatoires passent, avec les baselines historiques explicitement
   distinguées.

## Conclusion

La stratégie de test est prête et évite de confondre la couverture locale avec
une preuve de multijoueur en ligne. Les tests réels sont conditionnés par les
tickets d'implémentation du serveur, du transport et de la persistance ; leur
matrice est désormais définie et pourra être exécutée sans changer les règles
du jeu.
