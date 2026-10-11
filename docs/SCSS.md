# Convention SCSS de Karak

## Principes

- Une feuille SCSS reste dans le composant qu'elle présente afin de préserver l'encapsulation Angular.
- Un composant simple conserve une feuille unique.
- Un composant complexe peut utiliser des partiels locaux nommés selon une responsabilité (`_layout.scss`, `_responsive.scss`, `_accessibility.scss`, etc.).
- Le fichier `<component>.scss` reste le point d'entrée et charge les partiels avec `@use`.
- Les animations et les media queries restent proches du composant qui les consomme, sauf lorsqu'elles sont réellement partagées.
- Les tokens transversaux restent dans `src/styles.scss` sous forme de variables CSS ; ils ne doivent pas servir à déplacer artificiellement des styles hors de leur composant.

## Quand créer un partiel

Créer un partiel lorsqu'un bloc est autonome, suffisamment volumineux et possède une responsabilité identifiable. Ne pas extraire quelques déclarations simplement pour augmenter le nombre de fichiers.

Les composants `GameSetup` et `CombatOverlay` utilisent cette convention pour leur bloc `prefers-reduced-motion`. Le `Board` utilise également un partiel local pour l'animation du héros actif. Les autres composants restent volontairement monolithiques tant qu'un découpage n'apporte pas un bénéfice démontré.

## Responsive et accessibilité

Les breakpoints restent dans le composant concerné. Les règles `prefers-reduced-motion` doivent conserver un feedback statique lisible et être chargées via `@use` lorsqu'elles sont isolées.

## Budgets

Le découpage SCSS ne réduit pas automatiquement le CSS compilé. Les budgets Angular doivent être comparés sur les artefacts compilés et ne doivent pas être augmentés pour masquer un avertissement. Toute réduction doit provenir de suppressions ou simplifications de règles réellement redondantes.
