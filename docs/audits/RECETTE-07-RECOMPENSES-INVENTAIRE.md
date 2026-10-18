# KARAK — Recette fonctionnelle 07 : récompenses et inventaire

## Périmètre et verdict

Cette campagne couvre exclusivement `INV-001` à `INV-017`. Le manuel officiel du jeu de base (`public/assets/rules/karak-base.pdf`, pages 2 à 5 et résumé p. 8) est la référence normative.

Les 17 mécanismes sont **Conformes vérifiés**. Aucun correctif de production n'a été appliqué pendant cette campagne.

## Références normatives et conventions

- Une récompense n'est disponible qu'après la victoire du monstre et reste attachée à son jeton retourné tant qu'elle n'est pas récupérée.
- Un trésor classique vaut 1 point ; le trésor obtenu du Dragon avec un rubis vaut 1,5 point.
- Une clé est consommée à l'ouverture d'un coffre et l'ouverture termine le tour.
- L'inventaire comporte deux emplacements d'armes, trois emplacements de tours de magie et un emplacement de clé.
- Un équipement plein peut nécessiter un remplacement ou un abandon ; les décisions d'équipement sont traitées par les mécanismes applicatifs existants.

La règle officielle est distinguée des conventions UX vérifiées : une arme strictement plus puissante peut remplacer automatiquement une arme plus faible ; une arme égale ou inférieure est abandonnée sans proposer une décision inutile ; une seule pièce d'équipement est conservée au sol par tuile.

## Tableau de synthèse

| Mécanisme | Sous-contrôles et preuves | Statut |
|---|---|---|
| `INV-001` | `getRemainingMonsterRewards` restitue les récompenses du monstre, les récompenses pending et les récompenses restantes après collecte partielle. Tests GameService. | **Conforme vérifié** |
| `INV-002` | Une victoire ouvre la séquence de récompense ; aucune récompense avant victoire ; collecte unique et refus d'un joueur inactif. Tests récompenses et parcours intégral. | **Conforme vérifié** |
| `INV-003` | Le Dragon attribue `dragon-ruby`, valorisé 1,5 point, avec fin de partie conservée hors périmètre détaillé. Tests `GameService récompenses trésor` et panneau trésor. | **Conforme vérifié** |
| `INV-004` | Ouverture confirmée avec clé, consommation exacte de la clé, attribution unique du trésor, suppression du coffre et fin du tour. Tests `game-tile-entry-contracts.spec.ts` et `game.service.spec.ts`. | **Conforme vérifié** |
| `INV-005` | Sans clé, aucune action impossible n'est proposée ; le coffre reste fermé et peut être revisité. Tests coffre et recette ROOM-009. | **Conforme vérifié** |
| `INV-006` | Une clé occupe un emplacement unique ; l'ajout est refusé si l'emplacement est occupé ; la clé est correctement retirée à l'ouverture. Tests PlayerService/GameService. | **Conforme vérifié** |
| `INV-007` | Les sorts sont placés dans les trois emplacements dédiés ; l'ajout et le remplacement d'un sort plein sont vérifiés. Tests GameService et CombatService. | **Conforme vérifié** |
| `INV-008` | Les armes sont placées dans les deux emplacements d'armes ; le bonus reflète les armes réellement équipées. Tests PlayerService, récompenses et combats. | **Conforme vérifié** |
| `INV-009` | Inventaire plein : ajout refusé sans perte d'objet, décision de remplacement ou abandon possible, blocage absent. Tests PlayerService/GameService. | **Conforme vérifié** |
| `INV-010` | Une récompense d'arme strictement supérieure remplace automatiquement l'arme plus faible, en conservant l'autre emplacement. Tests de remplacement et récompenses. | **Conforme vérifié** |
| `INV-011` | Une arme égale ou inférieure ne déclenche pas de remplacement ; aucune proposition UX inutile ; les emplacements invalides sont refusés. Tests PlayerService et invariants au sol. | **Conforme vérifié** |
| `INV-012` | L'ancien équipement est déposé si la tuile le permet ; en cas de tuile occupée, le traitement reste atomique et sans perte. Tests de remplacement sur récompense et tuile occupée. | **Conforme vérifié** |
| `INV-013` | L'abandon d'une récompense nettoie le pending, conserve la récompense sur le jeton ou l'équipement au sol et permet la poursuite du tour. Tests GameService. | **Conforme vérifié** |
| `INV-014` | Un équipement au sol est récupérable par un joueur actif si un emplacement est libre ; la collecte est unique et protégée contre les doubles actions. Tests GameService. | **Conforme vérifié** |
| `INV-015` | Un équipement au sol peut remplacer un équipement plus faible ; l'ancien objet est traité sans duplication. Tests d'invariants au sol. | **Conforme vérifié** |
| `INV-016` | Les équipements au sol sont indexés par tuile, persistent entre visites et restent disponibles après changement de joueur. Tests de persistance et d'occupation. | **Conforme vérifié** |
| `INV-017` | `calculateTreasurePoints` applique les valeurs 1, 1 et 1,5 aux trésors correspondants ; les combinaisons sont calculées sans score redondant. Tests PlayerService, TreasurePanel et GameService. | **Conforme vérifié** |

## Scénarios à risque vérifiés

- victoire → récompense → inventaire plein : remplacement ou abandon sans perte ;
- arme supérieure → remplacement automatique ;
- arme égale/inférieure → aucune proposition inutile ;
- remplacement → dépôt de l'ancien équipement ;
- tuile déjà occupée → dépôt refusé ou remplacement atomique sans blocage ;
- coffre avec clé → confirmation → trésor ;
- coffre sans clé → conservation et retour ultérieur ;
- plusieurs récompenses → collecte partielle et conservation du reste ;
- alternance joueurs humains/IA et résolution déterministe des décisions IA ;
- dernière action du tour → récompense et transition cohérente.

## Tests exécutés

### Angular

Commande :

```text
npx ng test --no-watch --no-progress --include='src/app/services/game.service.spec.ts' --include='src/app/services/player.service.spec.ts' --include='src/app/components/treasure-panel/treasure-panel.spec.ts' --include='src/app/services/ai.service.spec.ts'
```

Résultat : **136 tests passés**, 4 fichiers.

Les tests existants démontrent les récompenses de monstres et du Dragon, les inventaires pleins, les remplacements, les abandons, les équipements au sol, les protections contre les doubles validations et les scores.

### Playwright

Commande :

```text
npx playwright test e2e/full-game-playthrough.spec.ts e2e/smoke.spec.ts
```

Résultat : **16 scénarios passés**.

Le parcours intégral atteint le classement du Dragon et vérifie la continuité de la récompense. Les scénarios smoke vérifient l'accès au plateau, les transitions de partie, les dimensions responsive et le retour à l'accueil. Aucun scénario navigateur dédié supplémentaire n'a été nécessaire pour établir une preuve distincte des services d'inventaire déjà couverts.

## Limites

- La collecte détaillée des récompenses est vérifiée par les services métier ; le parcours navigateur ne propose pas de fixture UI dédiée à chaque combinaison d'inventaire plein.
- Le classement final appartient à la phase J ; seul le calcul des points nécessaire à `INV-017` est vérifié ici.
- Les règles de combat qui consomment les armes ou sorts appartiennent à la phase E ; cette recette vérifie uniquement la cohérence de l'inventaire et des valeurs exposées.
- Les avertissements Angular `NG0913` sur la taille intrinsèque du logo ont été observés pendant Playwright ; ils ne concernent pas les mécanismes INV.

## Statuts avant/après

Avant la recette : les 17 mécanismes étaient « Couvert par test ».

Après la recette : les 17 mécanismes sont « Conforme vérifié ». La phase F est donc validée à 17/17.
