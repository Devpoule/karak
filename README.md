# Karak

Adaptation numérique du jeu de société **Karak**, développée avec Angular,
TypeScript et SCSS. L'application est client-only et conserve les règles
officielles comme référence, en distinguant explicitement les adaptations
numériques.

## État actuel

Le jeu local couvre la préparation, l'exploration, les déplacements, les tours,
les combats humains et IA, les pouvoirs des six héros, les équipements,
trésors, malédictions, soins, sauvegarde locale et classement de fin de partie.
La route `/tutorial` propose une aventure pédagogique indépendante : elle
réutilise le moteur normal, expose une progression en lecture seule et ne
modifie pas les règles d'action légale.

L'accueil, le configurateur de partie, le codex et les paramètres sont des
interfaces opérationnelles. Le multijoueur en ligne et les extensions restent
hors du périmètre implémenté.

## Documentation

- [Vision et architecture](docs/PROJECT.md)
- [Contrats techniques des services métier](docs/DOMAIN_SERVICES.md)
- [Règles et écarts avec le manuel](docs/RULES.md)
- [Invariants métier](docs/INVARIANTS.md)
- [Didacticiel jouable](docs/TUTORIAL.md)
- [Feuille de route et validation courante](docs/ROADMAP.md)
- [Guide utilisateur](docs/USER_GUIDE.md)
- [Déploiement](docs/DEPLOYMENT.md)

Le manuel officiel local et ses pages image sont conservés dans
`public/assets/rules/`. Toute divergence ou adaptation doit être signalée dans
`docs/RULES.md` plutôt que masquée dans l'interface.

La diffusion publique des assets reste soumise à l'[audit des droits de
diffusion](docs/RIGHTS_AUDIT.md). Les documents de conception du multijoueur
(`docs/MULTIPLAYER_*.md`) décrivent une évolution future sans backend
implémenté ; ils ne modifient pas le mode local.

## Architecture

```text
src/app/
├── components/   plateau, HUD, inventaires, combat et panneaux
├── constants/    constantes métier et d'interface
├── data/         catalogues statiques et scénario du didacticiel
├── models/       contrats et géométrie du domaine
├── pages/        accueil, entrée, partie, didacticiel et codex
└── services/     état métier, orchestration et persistance locale
```

Les responsabilités détaillées sont maintenues dans
[`DOMAIN_SERVICES.md`](docs/DOMAIN_SERVICES.md). Les composants présentent les
signaux des services et ne dupliquent pas les calculs d'actions légales.

## Installation et validation

```powershell
npm ci
npx ng test --no-watch --no-progress
npx ng build
node docs/tools/check-rule-references.mjs
git diff --check
```

Les scénarios navigateur utilisent Playwright et Chromium :

```powershell
npm run test:e2e
```

Les artefacts générés (`dist`, `.angular`, rapports de tests) ne sont pas
versionnés.
