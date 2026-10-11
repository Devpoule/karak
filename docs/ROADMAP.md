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
- Aderyn : égalité gagnante et Marche rampante sont intégrées et couvertes par les tests ; les autres pouvoirs restent à traiter. Horan/Victorius, Taia, Xanros et Argentus nécessitent encore des fenêtres de décision ou un état de tour dédié.
- Les extensions, le son et le multijoueur en ligne ne sont pas prioritaires.

## Dernière recette technique

- 89 tests réussis sur 8 fichiers avec `npx ng test --no-watch --no-progress` ;
- compilation Angular réussie avec `npx ng build` ;
- `git diff --check` réussi ;
- recette Playwright Chromium étendue : 5 scénarios E2E, dont une vérification à 390 px, la progression jusqu'à l'écran du premier joueur et l'accès naturel au plateau/combat ;
- avertissements de budget SCSS conservés sur `CombatOverlay` et `GameSetup` ;
- aucune anomalie fonctionnelle confirmée pendant cette recette.

## Validation combat Chromium — 11 octobre 2026

- Fixture E2E déterministe ajoutée dans `e2e/combat-fixture.spec.ts` ; elle utilise
  uniquement l'API Angular de développement exposée par Chromium et n'ajoute aucun
  accès de test au build de production.
- Cinq scénarios Chromium validés : bonus d'épée `+2pts`, victoire, égalité,
  défaite, écran étroit et Tir magique `+1pt`.
- Captures inspectées dans `playwright-report/` : `combat-roll-victory.png`,
  `combat-victory.png`, `combat-tie.png`, `combat-defeat.png`,
  `combat-roll-magic.png`, `combat-magic.png` et `combat-roll-narrow.png`.
- L'interface de combat est considérée comme clôturée pour ce périmètre : aucun
  débordement ni chevauchement bloquant n'a été observé ; les badges restent sur
  les cartes et les bonus restent distincts près des dés.
- La prochaine priorité est l'implémentation progressive des pouvoirs spécifiques
  des héros, en commençant par les règles explicitement vérifiables dans le manuel.

## Priorités proposées

1. Implémenter les relances de Horan et Victorius dans la fenêtre post-lancer, après confirmation de la présentation officielle.
2. Implémenter le bonus de Taia, puis son choix de jetons, avec un état de déplacement par tour.
3. Implémenter le sacrifice/substitution de Xanros et la Marche astrale d'Argentus.
4. Rejouer les scénarios navigateur du Portail, du repos, des récompenses et des objets au sol ; corriger uniquement les anomalies reproduites.
5. Réduire progressivement les avertissements SCSS sans refonte visuelle.
6. Préparer ultérieurement une architecture de synchronisation en ligne, après stabilisation du jeu local.

## Prochain chantier autonome proposé

Un premier lot de pouvoirs spécifiques de héros, en commençant par une capacité dont la règle et le point d'intégration sont confirmés par le manuel. Les fixtures E2E pourront être étendues ensuite aux récompenses, au repos, au Portail et à la fin de partie.
