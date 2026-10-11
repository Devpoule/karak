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

- La recette navigateur des combats, récompenses et fin de partie doit encore être étendue. Playwright/Chromium est opérationnel ; le serveur existant sur `http://127.0.0.1:4200` est réutilisé.
- La stratégie IA spécifique au Portail de guérison reste à auditer avant de la considérer complète.
- La couverture des composants visuels et des effets CSS est limitée par rapport aux tests métier.
- La compilation passe avec des avertissements de budget SCSS, notamment sur `CombatOverlay` et `GameSetup`.
- `GameService` reste une façade large ; toute extraction doit être motivée par des usages concrets.
- La couverture exacte des pouvoirs particuliers des héros doit rester alignée sur les règles effectivement codées et testées.
- Les extensions, le son et le multijoueur en ligne ne sont pas prioritaires.

## Dernière recette technique

- 89 tests réussis sur 8 fichiers avec `npx ng test --no-watch --no-progress` ;
- compilation Angular réussie avec `npx ng build` ;
- `git diff --check` réussi ;
- recette Playwright Chromium étendue : 4 scénarios E2E, dont une vérification à 390 px et la progression jusqu'à l'écran du premier joueur ;
- avertissements de budget SCSS conservés sur `CombatOverlay` et `GameSetup` ;
- aucune anomalie fonctionnelle confirmée pendant cette recette.

## Priorités proposées

1. Rejouer les scénarios navigateur du Portail, des combats, du repos et des objets au sol ; corriger uniquement les anomalies reproduites.
2. Compléter les tests ciblés des transitions humain/IA et des états obligatoires.
3. Auditer la couverture des règles officielles et des pouvoirs de héros avant toute nouvelle mécanique.
4. Réduire progressivement les avertissements SCSS sans refonte visuelle.
5. Préparer ultérieurement une architecture de synchronisation en ligne, après stabilisation du jeu local.

## Prochain chantier autonome proposé

Une recette navigateur reproductible des parcours Portail de guérison, combat et récupération, avec captures et journal des états, lorsque l'environnement navigateur est disponible. Ce chantier doit commencer seulement après validation de cette proposition.
