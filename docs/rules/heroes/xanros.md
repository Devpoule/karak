# Xanros — prince noir

Source officielle : [manuel local](../../../public/assets/rules/karak-base.pdf), p. 5 (`karak-base-06.png`).

## `HERO-XANROS-SACRIFICE`

- Conformité métier : **divergence**.
- Couverture technique : **partiellement testée**.

### Règle officielle

Après le lancer, Xanros peut sacrifier une vie pour ajouter `+1` à sa force d’attaque. Le pouvoir est facultatif et utilisable une seule fois par combat. Le manuel autorise explicitement le sacrifice lorsqu’il ne reste qu’une vie ; Xanros perd alors connaissance selon les règles habituelles.

### Implémentation réelle

La définition statique est [`HERO_POWER_DEFINITIONS.sacrifice`](../../../src/app/data/hero-definitions.ts#L85). La décision de score est exposée par [`GameService.canUseXanrosSacrificeForScore`](../../../src/app/services/game.service.ts#canUseXanrosSacrificeForScore). Cette fonction refuse le sacrifice si Xanros est déjà en tête ou si `+1` ne permet pas d’atteindre le meilleur score adverse.

Cette restriction n’est pas présente dans la source officielle consultée : c’est une **divergence métier**, et non une simple optimisation d’interface.

### Tests associés

Les tests de [`game.service.spec.ts`](../../../src/app/services/game.service.spec.ts#L116) couvrent les trois décisions de score. Ils ne démontrent pas l’exécution du sacrifice après un lancer, avec une seule vie restante, ni le refus sous malédiction.

### À vérifier

- localiser le chemin de combat qui applique effectivement le bonus et la perte de vie ;
- ajouter ou documenter un test avec une vie restante ;
- vérifier la désactivation sous malédiction ;
- décider séparément si la restriction de score doit rester une divergence numérique.

## `HERO-XANROS-SUBSTITUTION`

- Conformité métier : **incertaine / adaptation numérique**.
- Couverture technique : **testée**.

### Règle officielle

Au début de son tour, Xanros peut échanger sa position avec celle d’un autre héros. Cette substitution consomme ses quatre déplacements. Après la substitution, il peut effectuer une action sur la tuile d’arrivée, notamment se soigner, ramasser une arme ou ouvrir un coffre.

Le passage de la page 5 ne précise pas explicitement qu’un monstre déjà présent sur la tuile d’arrivée doit déclencher automatiquement un combat. La conformité de ce cas ne peut donc pas être établie à partir de la source disponible.

### Implémentation réelle

- [`GameService.canUseXanrosSubstitution`](../../../src/app/services/game.service.ts#canUseXanrosSubstitution) vérifie le début de tour, les quatre mouvements et l’absence de malédiction ;
- [`GameService.confirmXanrosSubstitution`](../../../src/app/services/game.service.ts#confirmXanrosSubstitution) échange les positions et consomme les mouvements ;
- [`GameService.prepareXanrosSubstitutionAction`](../../../src/app/services/game.service.ts#prepareXanrosSubstitutionAction) prépare les interactions autorisées par l’interface ;
- [`GameService.openXanrosSubstitutionChest`](../../../src/app/services/game.service.ts#openXanrosSubstitutionChest) gère le coffre facultatif.

Le code ne résout pas automatiquement un monstre présent sur la tuile d’arrivée. Ce comportement est une **adaptation numérique** tant que le manuel ne tranche pas ce cas.

### Tests associés

- tests unitaires d’échange, de consommation des quatre mouvements, d’absence de combat automatique et de coffre facultatif dans [`game.service.spec.ts`](../../../src/app/services/game.service.spec.ts#L219) ;
- test E2E dans [`xanros-powers.spec.ts`](../../../e2e/xanros-powers.spec.ts#L24).
