# Karak

Adaptation numérique du jeu de société **Karak**, développée avec Angular.

Le projet a pour objectif de reproduire progressivement les mécaniques du jeu de base tout en conservant une architecture claire, testable et suffisamment découplée de l'interface graphique.

Le développement est réalisé progressivement : les règles sont intégrées et validées par étapes avant l'ajout des mécaniques suivantes.

---

## État actuel

Le socle d'exploration du donjon est fonctionnel.

Fonctionnalités actuellement présentes :

- génération et mélange de la pioche de tuiles ;
- placement de la tuile de départ ;
- affichage du donjon sur une carte extensible ;
- déplacement de la caméra ;
- sélection des tuiles ;
- détection des ouvertures et connexions entre tuiles ;
- exploration depuis une ouverture disponible ;
- tirage d'une nouvelle tuile ;
- rotation de la tuile avant son placement ;
- validation géométrique du placement ;
- confirmation du placement ;
- interface HUD pour les modes solo et 1v1 ;
- consultation intégrée du livret de règles.

Certains contrôles actuellement présents sur le plateau sont des **outils temporaires de développement** destinés à tester l'exploration avant l'introduction des héros et du véritable système de déplacement.

---

## Périmètre

Le développement actuel concerne le **jeu de base Karak**.

Les extensions ne font pas partie du périmètre actuel.

Les règles du jeu officiel constituent la référence pour l'implémentation des mécaniques.

Dans le code, une distinction est volontairement faite entre :

- `RÈGLE OFFICIELLE KARAK` : comportement provenant directement des règles du jeu ;
- `CHOIX D'IMPLÉMENTATION` : décision technique prise pour adapter cette règle à l'application.

---

## Technologies

- Angular
- TypeScript
- SCSS
- Angular Router

Le projet utilise actuellement une architecture entièrement côté client.

Aucun backend ni base de données ne sont nécessaires à ce stade.

---

## Architecture

Le code applicatif est situé dans :

```text
src/app/
├── components/
├── constants/
├── data/
├── models/
├── pages/
└── services/
```

### `models`

Contient les représentations du domaine.

La géométrie fondamentale des tuiles y est notamment définie :

- directions ;
- ouvertures ;
- rotations ;
- position des tuiles ;
- connexion entre deux tuiles.

### `data`

Contient les données statiques du jeu :

- catalogue des tuiles ;
- composition de la pioche.

La pioche du jeu de base contient **79 tuiles à tirer**, auxquelles s'ajoute la tuile de départ.

### `services`

Contient la logique applicative indépendante de l'affichage.

Les principales responsabilités sont actuellement séparées entre :

- `TileDeckService` : gestion de la pioche ;
- `DungeonService` : état physique et géométrie du donjon ;
- `ExplorationService` : processus d'exploration et placement d'une nouvelle tuile.

### `components`

Contient les éléments d'interface réutilisables.

Le `Board` représente le plateau et sa caméra.

Le HUD est composé de plusieurs éléments spécialisés pour les informations des joueurs, l'inventaire, les messages et les mouvements.

### `pages`

Contient les écrans principaux de l'application :

```text
/
├── accueil
├── game
└── rules
```

La page `game` joue principalement un rôle de composition entre :

- l'en-tête ;
- le plateau ;
- le HUD.

La logique métier du jeu ne doit pas être placée directement dans cette page.

---

## Donjon

Le plateau n'est pas représenté par une grille HTML contenant toutes les cases possibles.

Le donjon utilise des **coordonnées logiques** :

```text
(x, y)
```

La tuile de départ occupe :

```text
(0, 0)
```

Les tuiles placées sont ensuite projetées visuellement dans un espace suffisamment grand pour permettre l'expansion du donjon.

Cette approche évite de générer des milliers de cellules DOM inutiles.

---

## Exploration

Lorsqu'une exploration est déclenchée :

1. une tuile est tirée de la pioche ;
2. elle est présentée sur la position voisine à explorer ;
3. le joueur peut la faire pivoter ;
4. le placement est vérifié ;
5. la tuile peut être confirmée lorsqu'elle permet l'entrée depuis la tuile d'origine.

Conformément à la règle utilisée par le projet, la nouvelle tuile doit permettre l'entrée depuis la tuile source.

Elle n'est pas obligée de se connecter aux éventuelles autres tuiles déjà présentes autour d'elle : certaines de ses sorties peuvent donc aboutir contre un mur voisin.

---

## Interface de jeu

La page de jeu fonctionne en plein écran.

Elle est composée de trois couches principales :

```text
Game
│
├── GameHeader
│
└── zone de jeu
    │
    ├── Board
    │
    └── PlayerHud
```

Le HUD est superposé au plateau.

Le conteneur global du HUD laisse passer les événements du pointeur afin que le plateau reste manipulable. Les contrôles interactifs du HUD réactivent leurs propres événements lorsque nécessaire.

---

## Lancer le projet

Installer les dépendances :

```bash
npm install
```

Démarrer le serveur de développement :

```bash
ng serve -o
```

Angular compile alors l'application et ouvre le serveur de développement dans le navigateur.

---

## Build

Pour générer une version de production :

```bash
ng build
```

Les fichiers générés sont placés dans le répertoire de sortie configuré par Angular.

---

## Principes de développement

Le projet suit quelques principes simples.

### Respect des responsabilités

La logique du jeu ne doit pas être concentrée dans les composants graphiques.

Les composants affichent et transmettent les interactions tandis que les modèles et services portent les règles et l'état correspondant à leur responsabilité.

### Règles officielles et implémentation

Une décision technique ne doit pas être présentée comme une règle du jeu.

Lorsque la distinction est importante, elle est explicitement documentée dans le code.

### Développement progressif

Les abstractions ne sont introduites que lorsqu'elles deviennent nécessaires.

Le projet évite volontairement d'anticiper des systèmes complexes dont le besoin n'est pas encore établi.

### Documentation

Les commentaires expliquent principalement :

- les responsabilités ;
- les décisions non évidentes ;
- les contraintes ;
- les règles officielles ;
- les choix d'implémentation.

Ils ne doivent pas simplement reformuler le code.

---

## Prochaines étapes

La prochaine phase de développement concerne l'introduction du joueur et du héros sur le plateau.

Elle permettra progressivement d'aborder :

- la position du héros ;
- les déplacements réels entre les tuiles ;
- les mouvements disponibles pendant un tour ;
- la gestion du tour de jeu.

Les mécaniques suivantes seront introduites progressivement lorsque leurs dépendances seront suffisamment établies.

---

## Statut

Projet en cours de développement.

L'interface et l'architecture peuvent encore évoluer à mesure que les mécaniques du jeu sont intégrées.
