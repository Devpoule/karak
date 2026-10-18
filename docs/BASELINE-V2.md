# Karak — Baseline technique V2

Date de référence : 18 octobre 2026  
Branche : `main`  
Statut : baseline validée après `V2.0-01` à `V2.0-06`

## Environnement

| Élément | Valeur vérifiée |
|---|---|
| Système | Windows x64 |
| Node.js | `v24.20.0` |
| npm | `12.2.0` |
| Angular CLI | `22.2.0` |
| Angular | `22.2.0` |
| TypeScript | `6.0.3` |
| Vitest | `5.0.4` |
| Playwright | `1.64.0` déclaré dans `package.json` |
| Navigateur E2E | Chromium |

Les versions déclarées et résolues sont celles de `package.json` et de
`package-lock.json`. Une mise à jour de dépendance doit produire une nouvelle
baseline ou une révision explicite de celle-ci.

## Composition vérifiée

- 28 fichiers de tests Angular.
- 326 tests Angular réussis avec `npx ng test --no-watch --no-progress`.
- 15 fichiers de scénarios Playwright.
- Scénarios de stabilité mobile vérifiés sur 320×568, 375×667 et 430×932.
- Parcours de partie complète, continuité IA et reprise après interruption vérifiés.
- 143 mécanismes fonctionnels classés « Conforme vérifié » dans
  `docs/FUNCTIONAL_AUDIT.md`.

## Commandes de référence

Depuis la racine du projet :

```powershell
npx ng test --no-watch --no-progress
npx ng build
npx playwright test
node docs/tools/check-rule-references.mjs
git diff --check
```

Pour la validation ciblée des parcours V2 :

```powershell
npx playwright test e2e/full-game-playthrough.spec.ts e2e/ai-continuity.spec.ts --workers=1
npx playwright test e2e/mobile-stability.spec.ts e2e/smoke.spec.ts --workers=1
```

## Résultats de la campagne V2.0

| Contrôle | Résultat |
|---|---|
| Suite Angular complète | 322/322 réussis |
| Build Angular production | réussi |
| Références Markdown locales | 38 fichiers valides |
| Full game + continuité IA | 2/2 scénarios réussis |
| Mobile + smoke | 17/17 scénarios réussis |
| `git diff --check` | réussi |

Le scénario mobile vérifie l’absence de débordement horizontal, d’image non
chargée, d’erreur console et de requête réseau échouée sur l’accueil et la
préparation.

## Artefacts et avertissements

Les répertoires générés suivants sont exclus du versionnement et supprimés
après validation lorsque la campagne est terminée : `dist`, `.angular/cache`,
`coverage`, `playwright-report` et `test-results`.

Les avertissements `NG0913`, `NG02952` et `NG02960` liés au logo ont été
supprimés par l’optimisation des assets et de leur sélection responsive dans
`V2.0-02`. Les avertissements npm relatifs à `NO_COLOR` lorsque Playwright
lance le serveur sont propres à l’environnement de test et ne signalent pas
une erreur applicative.

## Règles d’évolution

Une évolution de Node, Angular, TypeScript, Vitest, Playwright, des budgets ou
des commandes de validation doit être accompagnée de la mise à jour de cette
baseline et d’une exécution complète des contrôles ci-dessus. Les recettes
historiques conservent leurs nombres d’exécution d’origine ; la présente
baseline est la référence courante pour V2.
