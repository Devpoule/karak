# KARAK — Recette fonctionnelle 06 : combats

## Périmètre et verdict

Cette campagne couvre exclusivement `COMBAT-001` à `COMBAT-016`. Le manuel officiel du jeu de base (`public/assets/rules/karak-base.pdf`, pages 3 à 8) est la référence normative.

Les 16 mécanismes sont **Conformes vérifiés**. Aucun correctif de production n'a été appliqué pendant cette campagne.

## Références normatives

- Un combat contre un monstre est déclenché à l'entrée sur une tuile portant un monstre face visible.
- L'attaque est le total de deux dés, augmenté par les armes et les bonus applicables.
- Une attaque strictement supérieure à la force du monstre gagne ; une égalité est un match nul ; une attaque inférieure constitue une défaite.
- Une victoire retourne le monstre sur son verso ; une égalité fait reculer le héros sans perte de vie ; une défaite fait perdre une vie et reculer le héros.
- Horan peut relancer les deux dés une fois par combat.
- Victorius peut relancer chaque dé affichant 1, au plus une fois par dé.
- Le Tir magique ajoute +1 par utilisation après le lancer ; Argentus conserve ses tirs après usage, tandis qu'un héros maudit les consomme.
- Xanros peut sacrifier une vie après le lancer pour ajouter +1.
- Les pouvoirs sont désactivés par la malédiction.

Les dés sont simulés par `Math.floor(Math.random() * 6) + 1`, soit six faces et des bornes 1–6. Les conventions d'interface (proposition uniquement lorsque l'option peut modifier l'issue, stratégie de l'IA, durée de présentation du verdict) sont distinguées des règles normatives.

## Tableau de synthèse

| Mécanisme | Sous-contrôles et preuves | Statut |
|---|---|---|
| `COMBAT-001` | `CombatService.startCombat` vérifie un monstre recto valide, conserve le héros, la tuile source et bloque le cycle via `pendingCombat`. Tests service et parcours `combat-fixture`/intégral. | **Conforme vérifié** |
| `COMBAT-002` | Refus d'un combat déjà pending, d'un token absent, retourné ou non-monstre ; second déclenchement sans mutation. Tests `combat.service.spec.ts`, `game.service.spec.ts`, tests d'entrée de tuile. | **Conforme vérifié** |
| `COMBAT-003` | Deux appels à `rollDie`, résultats conservés dans `pendingCombatRoll`, second lancer refusé avant résolution. Tests déterministes et overlay navigateur. | **Conforme vérifié** |
| `COMBAT-004` | `diceTotal = die1 + die2`, dés bornés 1–6, résultats affichés cohérents avec le snapshot métier. Tests de lancer et fixtures Playwright. | **Conforme vérifié** |
| `COMBAT-005` | Addition des armes non nulles, bonus conservés dans le résultat, absence de double comptabilisation après relance ou Tir magique. Tests cumul d'armes et de tirs. | **Conforme vérifié** |
| `COMBAT-006` | Bonus spécifiques d'Argentus, bonus Taia, désactivation sous malédiction et consommation correcte des tirs. Tests CombatService et IA. | **Conforme vérifié** |
| `COMBAT-007` | Victoire uniquement si attaque supérieure, ou égalité spéciale d'Aderyn non maudite ; monstre retourné seulement à la résolution définitive. | **Conforme vérifié** |
| `COMBAT-008` | Égalité conservée comme `tie`, recul sans perte de vie, fin du combat sans suppression prématurée du monstre. Tests déterministes et fixture navigateur. | **Conforme vérifié** |
| `COMBAT-009` | Défaite, perte d'une vie, recul vers la tuile source, résolution unique et gestion de la dernière vie. Tests service et enchaînements GameService. | **Conforme vérifié** |
| `COMBAT-010` | Horan relance les deux dés une seule fois lorsque le score n'est pas gagnant ; refus après victoire, malédiction ou seconde utilisation. Tests unitaires, IA et Playwright. | **Conforme vérifié** |
| `COMBAT-011` | Victorius relance seulement les dés affichant 1, conserve l'autre dé, et peut traiter les deux dés séparément. Tests unitaires et Playwright avec animation ciblée. | **Conforme vérifié** |
| `COMBAT-012` | Les relances et options post-lancer sont refusées lorsqu'elles sont inutiles, après victoire, sous malédiction ou après consommation. Tests `getAvailableHeroRerolls`, Tir magique et pouvoirs. | **Conforme vérifié** |
| `COMBAT-013` | Tir magique interdit avant lancer et après victoire, ajoute +1 par utilisation, consomme le sort une fois pour un héros normal/maudit et le conserve pour Argentus non maudit. Tests service, IA et fixture visuelle. | **Conforme vérifié** |
| `COMBAT-014` | Sacrifice de Xanros post-lancer, +1 attaque, perte exacte d'une vie, une seule utilisation et refus sous malédiction. Tests déterministes et scénario Xanros. | **Conforme vérifié** |
| `COMBAT-015` | `lastCombatResult` conserve verdict, scores, dés et bonus ; overlay affiche scores, verdict, vague bleue/rouge et options pertinentes. Tests overlay, vague et Playwright. | **Conforme vérifié** |
| `COMBAT-016` | Nettoyage après présentation, fermeture après quatre secondes, reprise/fin de tour, récompense pending après victoire et absence de seconde résolution. Tests overlay, GameService, IA et parcours intégral. | **Conforme vérifié** |

## Scénarios exécutés

### Angular

Commande ciblée :

```text
npx ng test --no-watch --no-progress --include='src/app/services/combat.service.spec.ts' --include='src/app/components/combat-overlay/combat-overlay.spec.ts' --include='src/app/components/combat-overlay/combat-wave.spec.ts' --include='src/app/services/ai.service.spec.ts' --include='src/app/services/game.service.spec.ts'
```

Résultat : **188 tests passés**, 5 fichiers.

Les tests existants couvrent les bornes des dés, les combinaisons d'armes, les trois issues, les relances, la malédiction, les consommations, la réinitialisation et les décisions IA. Aucun test ciblé supplémentaire n'a été nécessaire.

### Playwright

Commande :

```text
npx playwright test e2e/combat-fixture.spec.ts e2e/horan-powers.spec.ts e2e/victorius-powers.spec.ts e2e/xanros-powers.spec.ts e2e/full-game-playthrough.spec.ts
```

Résultat : **15 scénarios passés**.

Preuves navigateur obtenues :

- victoire, égalité et défaite avec scores visibles ;
- bonus d'épée et Tir magique visibles ;
- mise en page en écran étroit et paysage court ;
- relance Horan avec animation des deux dés ;
- relance Victorius avec animation du seul dé ciblé ;
- continuation et fin du tour de Victorius, y compris IA ;
- parcours intégral jusqu'à la récompense du Dragon.

Les tests ont également observé les animations avec le navigateur réel. Les avertissements Angular `NG0913` sur la taille intrinsèque du logo ne concernent pas les mécanismes de combat.

## Limites et conventions

- Les valeurs aléatoires sont rendues déterministes dans les tests par espionnage de `Math.random` ou remplacement contrôlé du lancer pour les fixtures navigateur ; la distribution statistique n'est pas auditée.
- La stratégie IA qui utilise automatiquement une relance, un Tir magique ou un sacrifice est une convention de décision applicative, distincte de l'obligation normative faite au joueur humain.
- La proposition UI des choix seulement lorsqu'ils peuvent modifier l'issue est une convention UX documentée dans l'inventaire ; elle ne modifie pas les règles.
- La collecte détaillée des récompenses et de l'inventaire reste hors périmètre, conformément à la recette.
- La vérification `prefers-reduced-motion` de l'overlay s'appuie sur les règles SCSS et les tests de composants ; aucun défaut n'a été observé dans le périmètre exécuté.

## Statuts avant/après

Avant la recette : les 16 mécanismes étaient « Couvert par test ».

Après la recette : les 16 mécanismes sont « Conforme vérifié ». La phase E est donc validée à 16/16.
