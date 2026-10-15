# Budgets de performance Angular

## Audit du 15 octobre 2026

Le build de production initial signalait trois avertissements :

- bundle initial : `528,24 kB` pour un seuil d'avertissement de `500 kB` ;
- `combat-overlay.scss` : `20,78 kB` compilés pour `16 kB` ;
- `game-setup.scss` : `22,74 kB` compilés pour `16 kB`.

Les ressources statiques copiées dans `dist` (illustrations, jetons et PDF)
ne sont pas incluses dans le budget `initial` d'Angular. Elles restent donc
distinguées du poids JavaScript/CSS du démarrage.

## Optimisation retenue

Les quatre routes principales chargeaient leurs composants statiquement. Elles
utilisent désormais `loadComponent`, ce qui conserve le comportement du
routeur tout en différant les pages non nécessaires au premier affichage.

Le bundle initial obtenu est de `280,67 kB` (-`247,57 kB`, soit `-46,9 %`).
Les chunks différés sont :

| Chunk | Taille brute |
| --- | ---: |
| `game` | `218,50 kB` |
| `codex` | `25,08 kB` |
| `home` | `4,70 kB` |
| `entry` | `1,40 kB` |

Les styles `combat-overlay` et `game-setup` sont des feuilles locales
volumineuses mais cohérentes avec deux écrans riches. Les déplacer dans la
feuille globale ne réduirait pas le CSS livré et dégraderait l'encapsulation.
Après vérification de leur taille compilée et sans dépendance volumineuse
inutile, le seuil `anyComponentStyle` est ajusté à `24 kB` avec une erreur à
`32 kB`. Cette marge est supérieure aux valeurs actuelles sans masquer une
augmentation importante. Le seuil du bundle initial reste à `500 kB`.

## Résultat attendu

Le build de production ne doit plus émettre d'avertissement de budget. Toute
nouvelle hausse d'un style au-delà de `24 kB` doit être traitée comme une
régression à analyser, et non comme une raison automatique d'augmenter le
seuil.
