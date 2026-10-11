# Karak — feuille de route réelle

État relevé le 11 octobre 2026. Ce document décrit le dépôt observé, pas une promesse de livraison.

## Déjà en place

- socle Angular, écran de partie, plateau, tuiles, exploration et déplacements ;
- joueurs humains/IA, tours, mouvements et récupération après inconscience ;
- inventaires, armes, sorts, clés, équipements au sol et remplacements ;
- combats avec lancer différé, bonus d'armes, Tir magique, verdicts et récompenses ;
- coffres, trésors, malédictions et classement de fin après le Dragon ;
- Portail de guérison côté métier et parcours humain avec sélection/confirmation ;
- panneaux de vie, trésors et inventaire, animations et harmonisation visuelle partielle.

## Incomplet ou à risque

- La recette navigateur des récompenses, équipements, repos, Portail et fin de partie reste à étendre. Playwright/Chromium est opérationnel ; le serveur existant sur `http://127.0.0.1:4200` est réutilisé.
- La stratégie IA spécifique au Portail de guérison reste à auditer avant de la considérer complète.
- La couverture des composants visuels et des effets CSS est limitée par rapport aux tests métier.
- La compilation passe avec des avertissements de budget SCSS, notamment sur `CombatOverlay` et `GameSetup`.
- `GameService` reste une façade large ; toute extraction doit être motivée par des usages concrets.
- Plusieurs pouvoirs sont encore descriptifs mais non intégrés au moteur : relances de Horan/Victorius, bonus et choix de Taia, sacrifice/substitution de Xanros, pouvoirs de déplacement d'Aderyn et Argentus. Ils nécessitent un chantier métier séparé.
- Les extensions, le son et le multijoueur en ligne ne sont pas prioritaires.

## Dernière recette technique

- 89 tests réussis sur 8 fichiers avec `npx ng test --no-watch --no-progress` ;
- compilation Angular réussie avec `npx ng build` ;
- `git diff --check` réussi ;
- recette Playwright Chromium étendue : 5 scénarios E2E, dont une vérification à 390 px, la progression jusqu'à l'écran du premier joueur et l'accès naturel au plateau/combat ;
- avertissements de budget SCSS conservés sur `CombatOverlay` et `GameSetup` ;
- aucune anomalie fonctionnelle confirmée pendant cette recette.

## Priorités proposées

1. Ajouter un mécanisme de fixture E2E isolé du build de production, uniquement si son intégration Angular reste simple et sûre.
2. Rejouer les scénarios navigateur du Portail, des combats, du repos et des objets au sol ; corriger uniquement les anomalies reproduites.
3. Auditer puis implémenter les pouvoirs de héros par petits lots validés par les règles officielles.
4. Réduire progressivement les avertissements SCSS sans refonte visuelle.
5. Préparer ultérieurement une architecture de synchronisation en ligne, après stabilisation du jeu local.

## Prochain chantier autonome proposé

Une fixture E2E explicitement exclue des builds de production pour préparer les états Portail, récompenses, repos et fin de partie. Si cette isolation exige une refonte de l'injection Angular, conserver la recette métier unitaire et documenter la limite plutôt que créer une porte dérobée.
