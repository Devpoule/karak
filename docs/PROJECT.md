# Karak — vision et architecture

## Vision

Karak est une adaptation numérique du jeu de société Karak, réalisée en Angular, TypeScript et SCSS. Le projet vise une expérience lisible et soignée, jouable avec des héros humains et des adversaires IA, puis publiable sur le Web. Le respect des règles du jeu de base prime sur les extensions et les effets sonores, qui restent facultatifs. Le multijoueur en ligne est une évolution future, pas une capacité actuelle.

Les règles officielles et les choix propres à l'adaptation sont toujours distingués. Le manuel local est référencé dans [`RULES.md`](./RULES.md).

## Périmètre actuel

Le projet couvre notamment :

- exploration et placement des tuiles, caméra et déplacements ;
- tours, mouvements, inconscience et récupération ;
- combats humains et IA, dés, armes, Tir magique et verdicts ;
- équipements, clés, coffres, trésors et objets au sol ;
- malédictions et Portail de guérison ;
- victoire contre le Dragon, classement et état `game-over` ;
- HUD, inventaires, vies, trésors et retours visuels ;
- retour sonore optionnel des notifications, désactivé par défaut.

## Organisation

```text
src/app/
├── components/   Board, HUD, inventaire, combat et panneaux
├── data/         définitions statiques des héros, tuiles, jetons et équipements
├── models/       contrats du domaine
├── pages/        écrans Home, Game et Rules
└── services/     orchestration du jeu et sous-domaines
```

Responsabilités principales :

- `GameService` : façade d'orchestration des phases, tours, explorations, récompenses et fin de partie ;
- `TurnService` : mouvements restants et transitions de tour ;
- `DungeonService` : tuiles placées et géométrie ;
- `ExplorationService` et `TileDeckService` : exploration et pioche de tuiles ;
- `TokenBagService` : pioche des jetons ;
- `PlayerService` : joueurs, inventaires, vies, malédictions, récupération et trésors ;
- `CombatService` : combats en attente, lancer, bonus, résolution et résultats ;
- `AiService` : actions obligatoires, combats et déplacements IA ;
- `SettingsService` : préférences persistantes de confort, dont l'audio facultatif ;
- `AudioService` : création lazy de signaux sonores courts sans asset ni dépendance externe ;
- `Board` : rendu du plateau et contrôles d'action ;
- `PlayerHud`, `PlayerSidebar`, `HeroPanel`, `LifePanel`, `InventoryPanel`, `TreasurePanel` : présentation des joueurs.

La réactivité repose sur les signaux Angular et des révisions explicites (`inventoryRevision`, `livesRevision`, `treasuresRevision`, `groundEquipmentRevision`, etc.). Toute nouvelle dépendance doit être consommée de manière réactive plutôt que recalculée par effet secondaire.

## Travail et validation

Le projet est client-only : aucun backend ni stockage serveur n'est actuellement requis. Les tests sont exécutés avec l'outillage Angular/Vitest du dépôt. Les commandes de référence sont celles de `AGENTS.md`.

Le statut fonctionnel détaillé, les risques connus et les prochaines priorités sont tenus dans [`ROADMAP.md`](./ROADMAP.md).

## Recette navigateur

Playwright est configuré par `playwright.config.ts`. La commande `npm run test:e2e` utilise Chromium et réemploie le serveur Angular disponible sur `127.0.0.1:4200`. Si aucun serveur n'est disponible, Playwright tente de le lancer via `cmd.exe`, ce qui évite le problème observé avec le wrapper PowerShell. Les rapports et captures sont écrits dans `playwright-report/`, ignoré par Git.
