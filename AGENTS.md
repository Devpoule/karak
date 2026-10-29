# Karak — consignes permanentes pour les agents

## Méthode de travail

1. Examiner le code et l'état Git avant toute intervention.
2. Privilégier la solution simple, cohérente, maintenable et conforme à SOLID, Clean Code et DRY.
3. Ne pas multiplier les fichiers, abstractions ou dépendances sans nécessité démontrée.
4. Traiter des objectifs complets plutôt que des micro-tâches artificielles.
5. Prendre les décisions techniques ordinaires de façon autonome.
6. Respecter les règles officielles du jeu ; demander validation avant tout changement de règle ou décision produit majeure.
7. Exécuter les tests et la compilation après toute modification de code.
8. Ne jamais masquer un test échoué, un avertissement pertinent ou une régression.
9. Préserver les modifications locales préexistantes ; ne jamais les écraser ou les restaurer sans autorisation.
10. Ne pas effectuer de push, merge, rebase ou déploiement sans autorisation explicite.
11. Fournir un compte rendu synthétique en fin de mission.
12. Ne jamais présenter une vérification navigateur comme effectuée si elle ne l'a pas été.
13. Maintenir la documentation à jour lorsqu'une évolution importante est validée.
14. Documenter les décisions non évidentes et les contraintes métier dans le code ou la documentation appropriée.

## Convention SCSS

- Conserver les styles dans le composant Angular concerné pour préserver l'encapsulation.
- Garder une feuille unique pour les composants simples ; pour les composants complexes, extraire uniquement des responsabilités autonomes dans des partiels locaux (`_layout.scss`, `_responsive.scss`, `_animations.scss`, `_accessibility.scss`, etc.).
- Charger les partiels depuis la feuille principale avec `@use`, jamais avec les anciens `@import`.
- Garder les animations et le responsive près du composant, sauf s'ils sont réellement partagés.
- Réutiliser les tokens transversaux de `src/styles.scss` sans déplacer des styles locaux dans la feuille globale pour contourner les budgets.
- Comparer les tailles CSS compilées avant/après et conserver les avertissements de budget visibles lorsqu'ils restent justifiés.

## Références et règles

Le manuel local est la source de vérité pour les règles officielles :

- `public/assets/rules/karak-base.pdf`
- les huit images `public/assets/rules/karak-base-01.jpg` à `karak-base-08.jpg`

Le code décrit l'implémentation actuelle, pas nécessairement la règle officielle. Toute divergence ou ambiguïté doit être signalée explicitement (`INCERTAIN`, `DIVERGENCE` ou `CHOIX NUMÉRIQUE`) avant correction.

## Architecture

Respecter les responsabilités existantes. `GameService` orchestre actuellement de nombreux parcours ; ne pas extraire un nouveau service ou déplacer une règle sans usages réels et justification. Les signaux Angular et les révisions métier sont les mécanismes privilégiés de réactivité.

## Commandes de validation

Depuis la racine du projet :

```powershell
npx ng test --no-watch --no-progress
npx ng build
git diff --check
```

Une validation visuelle nécessite un navigateur effectivement disponible. Les avertissements de budget SCSS doivent être rapportés, même si la compilation réussit.

## Git

Les modifications locales appartenant à l'utilisateur sont conservées. Aucun commit, push, merge ou déploiement n'est implicite : ils nécessitent une demande explicite.
