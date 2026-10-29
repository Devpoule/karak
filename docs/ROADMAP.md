# Karak — feuille de route réelle

État relevé le 26 octobre 2026. Ce document décrit le dépôt observé, pas une promesse de livraison.

## Déjà en place

- socle Angular, écran de partie, plateau, tuiles, exploration et déplacements ;
- joueurs humains/IA, tours, mouvements et récupération après inconscience ;
- inventaires, armes, sorts, clés, équipements au sol et remplacements ;
- combats avec lancer différé, bonus d'armes, Tir magique, verdicts et récompenses ;
- coffres, trésors, malédictions et classement de fin après le Dragon ;
- Portail de guérison côté métier et parcours humain avec sélection/confirmation ;
- panneaux de vie, trésors et inventaire, animations et harmonisation visuelle partielle ;
- écran de fin de partie enrichi avec emblème du Dragon, vainqueur mis en avant et classement détaillé par héros ;
- panneau de paramètres partagé entre l'accueil et la partie, avec préférences persistantes de mouvement, contraste, taille du texte et audio facultatif ;
- didacticiel jouable indépendant, avec checklist de progression, aides contextuelles et règles normales du jeu ;
- signal sonore court et optionnel pour les notifications, désactivé par défaut et tolérant à l'absence de Web Audio.

## Incomplet ou à risque

- Les recettes fonctionnelles 01 à 12 sont documentées. Les réserves `UI-002`, `UI-004` et `UI-009` ont été clôturées par la recette d'interface 12 ; les limites restantes sont décrites dans l'audit fonctionnel.
- La stratégie IA spécifique au Portail de guérison a été vérifiée dans les suites métier ; les limites restantes sont décrites dans l’audit fonctionnel.
- La couverture des composants visuels et des effets CSS reste limitée par rapport aux tests métier.
- La compilation Angular passe sans avertissement de budget SCSS dans la validation du 26 octobre 2026.
- `GameService` reste une façade large ; toute extraction doit être motivée par des usages concrets.
- Les six héros disposent maintenant de leurs pouvoirs documentés et couverts par les tests : Aderyn, Argentus, Horan, Taia, Victorius et Xanros. Les relances, la Tisseuse de destin, la Réincarnation et Inarrêtable sont intégrés avec désactivation par malédiction.
- Les effets sonores avancés, les extensions et le multijoueur en ligne ne sont pas prioritaires.

## Dernière recette technique

- 455 tests réussis sur 39 fichiers avec `npx ng test --no-watch --no-progress` ;
- compilation Angular réussie avec `npx ng build`, sans avertissement de budget SCSS ;
- `git diff --check` réussi ;
- contrôle des références Markdown réussi avec `node docs/tools/check-rule-references.mjs` ;
- aucune anomalie fonctionnelle confirmée pendant cette recette.

## Validation combat Chromium — 11 octobre 2026

- Fixture E2E déterministe ajoutée dans `e2e/combat-fixture.spec.ts` ; elle utilise
  uniquement l'API Angular de développement exposée par Chromium et n'ajoute aucun
  accès de test au build de production.
- Cinq scénarios Chromium validés : bonus d'épée `+2PTS`, victoire, égalité,
  défaite, écran étroit et Tir magique `+1PT`.
- Captures inspectées dans `playwright-report/` : `combat-roll-victory.png`,
  `combat-victory.png`, `combat-tie.png`, `combat-defeat.png`,
  `combat-roll-magic.png`, `combat-magic.png` et `combat-roll-narrow.png`.
- L'interface de combat est considérée comme clôturée pour ce périmètre : aucun
  débordement ni chevauchement bloquant n'a été observé ; les badges restent sur
  les cartes et les bonus restent distincts près des dés.
- Cette campagne est conservée comme preuve historique ; les pouvoirs des héros
  sont désormais intégrés et documentés dans le périmètre courant.

## Priorités proposées

1. Étendre la recette navigateur aux pouvoirs, au Portail, au repos, aux récompenses, aux objets au sol et à l'IA ; le parcours intégral Dragon est maintenant couvert dans `docs/FULL_GAME_RECIPE.md`.

## Fonctionnalités intégrées documentées

- Le grimoire des six héros est disponible uniquement pendant la phase `playing`, via une boule de cristal sous le logo de la partie.
- Les portraits se déploient sous la boule et ouvrent des fiches consultatives sans modifier l'état métier.
- Les descriptions et pouvoirs sont centralisés dans `HeroDefinition` et réutilisés dans le grimoire et la fiche latérale.
- Les commandes J1 à J5 restent le mécanisme de sélection et de repli des panneaux latéraux.

- La convention SCSS est décrite dans [`SCSS.md`](./SCSS.md). Les extractions locales sont conservées uniquement lorsqu'elles correspondent à une responsabilité autonome.
- Une synchronisation en ligne reste hors périmètre ; le jeu local est la capacité actuellement supportée.

## Prochain chantier autonome proposé

Le prochain lot autonome est une recette navigateur dédiée aux pouvoirs spécifiques et aux parcours de récompense.
- Les consultations et annonces de pouvoirs spÃ©ciaux utilisent dÃ©sormais le verso du `HeroPanel` ; les dÃ©cisions de combat conservent leur retournement dÃ©diÃ© et aucun host flottant de pouvoir n'est rendu par le HUD.
