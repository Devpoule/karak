# Karak — recette fonctionnelle complète

## Périmètre

Cette recette couvre le parcours navigateur depuis la préparation d'une partie jusqu'à la défaite du Dragon et l'affichage du classement. Elle complète les tests unitaires existants et les scénarios Chromium de combat.

La recette est désormais intégrée à la branche `main` et ses preuves sont reprises dans les recettes fonctionnelles 01 à 12.

## Méthode et déterminisme

- Les scénarios Playwright utilisent Chromium et le serveur Angular configuré dans `playwright.config.ts`.
- Un générateur pseudo-aléatoire local est installé uniquement dans le contexte de test avec `page.addInitScript`. Le fonctionnement de production n'est pas modifié.
- La préparation de partie est réalisée par les boutons visibles : entrée, configuration, tirage des héros, lancers et entrée dans le donjon.
- Le scénario intégral prépare ensuite le combat Dragon dans l'état Angular de développement du navigateur de test, puis déclenche le lancer, la résolution et la collecte avec l'interface réelle.

## Matrice de recette

| Catégorie | Scénario | Résultat |
| --- | --- | --- |
| VALIDÉ | Chargement de l'accueil et accès à la partie | `e2e/smoke.spec.ts` |
| VALIDÉ | Préparation, tirage des héros et premier joueur | `e2e/smoke.spec.ts` |
| VALIDÉ | Préparation sur écran étroit | `e2e/smoke.spec.ts` |
| VALIDÉ | Accès au plateau après la préparation | `e2e/smoke.spec.ts` |
| VALIDÉ | Combat gagné, égalité, défaite et Tir magique | `e2e/combat-fixture.spec.ts` |
| VALIDÉ | Combat sur écran étroit | `e2e/combat-fixture.spec.ts` |
| VALIDÉ | Partie intégrale jusqu'au classement du Dragon | `e2e/full-game-playthrough.spec.ts` |
| NON COUVERT | Parcours complet naturel de toutes les tuiles et déplacements | À étendre |
| NON COUVERT | Les six pouvoirs dans un parcours navigateur distinct | Les règles sont testées en métier, l'intégration navigateur reste à étendre |
| VALIDÉ | IA complète sur plusieurs tours avec états bloquants variés | `e2e/ai-continuity.spec.ts` |
| PARTIELLEMENT COUVERT | Inventaire, coffres, malédictions, repos et Portail en parcours Chromium dédiés | Voir recettes 05 à 09 et leurs limites |
| RÈGLE AMBIGUË | Aucune ambiguïté nouvelle rencontrée pendant cette recette | Les questions existantes restent dans `docs/RULES.md` |
| BLOCAGE REPRODUIT | Aucun blocage fonctionnel confirmé après correction du fixture étroit | — |

## Anomalies et corrections

La baseline Chromium a échoué une fois sur le fixture de combat étroit : l'aide `openBoard` attendait le bouton d'entrée après seulement vingt tentatives de lancer. La cause était une attente de test insuffisamment robuste, pas une règle métier confirmée. Le fixture utilise désormais une séquence déterministe et quarante tentatives bornées, avec une assertion explicite sur l'apparition du bouton.

Aucune anomalie produit confirmée n'a été corrigée pendant ce jalon.

## Validations finales

- Tests unitaires : 100 tests réussis sur 8 fichiers.
- Playwright Chromium : 10 scénarios réussis après correction, dont le scénario intégral.
- Compilation Angular : réussie.
- `git diff --check` : à exécuter après les dernières modifications.
- Au moment de cette recette historique, les avertissements SCSS concernaient
  `game-setup.scss` (22,20 kB pour 16 kB) et `combat-overlay.scss` (20,24 kB
  pour 16 kB). La validation courante, consignée dans `ROADMAP.md`, ne
  reproduit plus ces avertissements.

Le jalon est donc validé pour le parcours intégral couvert, mais reste ouvert pour les catégories explicitement marquées `NON COUVERT`.
