# Karak — référentiel des règles métier

Référentiel de comparaison entre le manuel officiel local, le comportement réellement implémenté et les tests automatisés.

## Sources

- [Manuel officiel](../public/assets/rules/karak-base.pdf)
- [Pages illustrées du manuel](../public/assets/rules/)

Le manuel prévaut sur le code. Une formulation présente dans le code mais absente du manuel n'est pas une règle officielle.

## Statuts

### Conformité métier

`conforme`, `divergence`, `incertaine`, `adaptation numérique`, `non implémentée`.

### Couverture technique

`testée`, `partiellement testée`, `non testée`, `à vérifier`.

## Table des matières

- [Inventaire](#inventaire)
- [Préparation](rules/preparation.md)
- [Déplacement](rules/movement.md)
- [Exploration](rules/exploration.md)
- [Combat](rules/combat.md)
- [Équipement et trésors](rules/equipment-and-treasures.md)
- [Récupération et malédiction](rules/recovery-and-curse.md)
- [Victoire](rules/victory.md)
- [Aderyn](rules/heroes/aderyn.md)
- [Argentus](rules/heroes/argentus.md)
- [Horan](rules/heroes/horan.md)
- [Taia](rules/heroes/taia.md)
- [Victorius](rules/heroes/victorius.md)
- [Xanros](rules/heroes/xanros.md)

## Inventaire

| Identifiant | Domaine | Conformité métier | Couverture technique |
|---|---|---|---|
| `PREP-HERO-DRAW` | Préparation | à vérifier | partiellement testée |
| `TURN-MOVEMENT-COUNT` | Déplacement | à vérifier | testée |
| `TURN-MANDATORY-RESOLUTION` | Tour | à vérifier | partiellement testée |
| `EXP-TILE-DISCOVERY` | Exploration | à vérifier | testée |
| `COMBAT-RESOLUTION` | Combat | à vérifier | testée |
| `COMBAT-MAGIC-SHOT` | Combat | à vérifier | partiellement testée |
| `TREASURE-CHEST-KEY` | Trésors | à vérifier | testée |
| `TREASURE-SCORING` | Score | à vérifier | testée |
| `DRAGON-RUBY` | Victoire | à vérifier | partiellement testée |
| `RECOVERY-REST` | Récupération | divergence (variante produit documentée) | testée |
| `CURSE-MUMMY` | Malédiction | à vérifier | partiellement testée |
| `PORTAL-HEALING` | Guérison | adaptation numérique | testée |
| `HERO-ADERYN-BACKSTAB` | Aderyn | à vérifier | partiellement testée |
| `HERO-ADERYN-SNEAK` | Aderyn | à vérifier | partiellement testée |
| `HERO-ARGENTUS-MAGIC-AFFINITY` | Argentus | à vérifier | partiellement testée |
| `HERO-ARGENTUS-ASTRAL-WALK` | Argentus | à vérifier | partiellement testée |
| `HERO-HORAN-DOUBLE-ATTACK` | Horan | à vérifier | testée |
| `HERO-HORAN-REINCARNATION` | Horan | à vérifier | testée |
| `HERO-TAIA-PREMONITION` | Taia | à vérifier | partiellement testée |
| `HERO-TAIA-FATE-WEAVER` | Taia | à vérifier | partiellement testée |
| `HERO-VICTORIUS-COMBAT-TRAINING` | Victorius | à vérifier | testée |
| `HERO-VICTORIUS-UNSTOPPABLE` | Victorius | à vérifier | testée |
| `HERO-XANROS-SACRIFICE` | Xanros | divergence | partiellement testée |
| `HERO-XANROS-SUBSTITUTION` | Xanros | incertaine / adaptation numérique | testée |

Les règles générales et les fiches détaillées sont en cours de consolidation ; `à vérifier` signifie que la confrontation page par page reste à établir.

> Variante produit `fix/healing-fountain-optional-action` : une fontaine occupée expose une action volontaire, sans soin automatique à l’arrivée. L’utilisation est limitée à une fois par présence continue et consomme les mouvements restants. Le comportement officiel historique et ses limites sont détaillés dans [Récupération et malédiction](rules/recovery-and-curse.md) et dans la recette LIFE-011.

## Matrice règle → implémentation → tests

Les liens `#Lx` ciblent une ligne GitHub/GitLab lorsqu’elle est connue. Ils restent maintenables uniquement tant que le code n’est pas déplacé : après toute évolution du fichier cible, la ligne doit être recalculée. Le nom qualifié reste affiché pour conserver une référence lisible dans VS Code et dans les forges qui ne résolvent pas les ancres de symboles TypeScript.

| Règle et identifiant | Fiche documentaire | Fonction(s) responsables | Test(s) associés |
|---|---|---|---|
| `PREP-HERO-DRAW` | [Préparation](rules/preparation.md) | [`GameService.drawHeroes`](../src/app/services/game.service.ts#L676), [`PlayerService.drawHeroes`](../src/app/services/player.service.ts#L386) | [`game-lifecycle.spec.ts`](../src/app/services/game-lifecycle.spec.ts), [`full-game-playthrough.spec.ts`](../e2e/full-game-playthrough.spec.ts) |
| `TURN-MOVEMENT-COUNT` | [Déplacement](rules/movement.md) | [`TurnService.resetMovements`](../src/app/services/turn.service.ts#L165), [`GameService.canPerformNormalMovementTo`](../src/app/services/game.service.ts#L1188) | [`turn.service.spec.ts`](../src/app/services/turn.service.spec.ts), [`game-turn-transition-contracts.spec.ts`](../src/app/services/game-turn-transition-contracts.spec.ts) |
| `TURN-MANDATORY-RESOLUTION` | [Déplacement](rules/movement.md) | Répartie entre [`GameService`](../src/app/services/game.service.ts) et [`ExplorationService`](../src/app/services/exploration.service.ts) ; aucune fonction unique ne porte toute la transition | [`game-tile-entry-contracts.spec.ts`](../src/app/services/game-tile-entry-contracts.spec.ts) |
| `EXP-TILE-DISCOVERY` | [Exploration](rules/exploration.md) | [`ExplorationService`](../src/app/services/exploration.service.ts), [`Board.confirmPendingTile`](../src/app/components/board/board.ts), [`AiService.playAction`](../src/app/services/ai.service.ts) | [`exploration.service.spec.ts`](../src/app/services/exploration.service.spec.ts), [`exploration-recipe.spec.ts`](../src/app/services/exploration-recipe.spec.ts), [`board.spec.ts`](../src/app/components/board/board.spec.ts), [`ai.service.spec.ts`](../src/app/services/ai.service.spec.ts), [`exploration-flow.spec.ts`](../e2e/exploration-flow.spec.ts) |
| `COMBAT-RESOLUTION` | [Combat](rules/combat.md) | [`CombatOverlayComponent.resolveCombat`](../src/app/components/combat-overlay/combat-overlay.ts#L405), [`CombatService`](../src/app/services/combat.service.ts) | [`combat.service.spec.ts`](../src/app/services/combat.service.spec.ts), [`combat-fixture.spec.ts`](../e2e/combat-fixture.spec.ts) |
| `COMBAT-MAGIC-SHOT` | [Combat](rules/combat.md) | Répartie entre [`CombatOverlayComponent`](../src/app/components/combat-overlay/combat-overlay.ts) et [`CombatService`](../src/app/services/combat.service.ts) ; aucune méthode unique n’a été identifiée | [`combat.service.spec.ts`](../src/app/services/combat.service.spec.ts) |
| `TREASURE-CHEST-KEY` | [Équipement et trésors](rules/equipment-and-treasures.md) | [`PlayerService.addTreasure`](../src/app/services/player.service.ts#L451), orchestration dans [`GameService`](../src/app/services/game.service.ts) | [`player.service.spec.ts`](../src/app/services/player.service.spec.ts), [`game.service.spec.ts`](../src/app/services/game.service.spec.ts) |
| `TREASURE-SCORING` | [Équipement et trésors](rules/equipment-and-treasures.md) | [`calculateTreasurePoints`](../src/app/models/treasure.ts#L25) | [`player.service.spec.ts`](../src/app/services/player.service.spec.ts), [`game.service.spec.ts`](../src/app/services/game.service.spec.ts) |
| `DRAGON-RUBY` | [Victoire](rules/victory.md) | Répartie entre [`GameService`](../src/app/services/game.service.ts) et [`PlayerService.addTreasure`](../src/app/services/player.service.ts#L451) ; aucune fonction unique ne porte récompense et fin de partie | [`game-lifecycle.spec.ts`](../src/app/services/game-lifecycle.spec.ts), [`full-game-playthrough.spec.ts`](../e2e/full-game-playthrough.spec.ts) |
| `RECOVERY-REST` | [Récupération](rules/recovery-and-curse.md) | [`PlayerService.beginRecoveryTurn`](../src/app/services/player.service.ts#L103), [`GameService.useHealingPortal`](../src/app/services/game.service.ts#L1301) | [`player.service.spec.ts`](../src/app/services/player.service.spec.ts), [`game.service.spec.ts`](../src/app/services/game.service.spec.ts) |
| `CURSE-MUMMY` | [Récupération et malédiction](rules/recovery-and-curse.md) | Répartie entre [`CombatService`](../src/app/services/combat.service.ts) et [`GameService`](../src/app/services/game.service.ts) ; aucune fonction unique identifiée | [`combat.service.spec.ts`](../src/app/services/combat.service.spec.ts), [`game.service.spec.ts`](../src/app/services/game.service.spec.ts) |
| `PORTAL-HEALING` | [Récupération et malédiction](rules/recovery-and-curse.md) | [`GameService.useHealingPortal`](../src/app/services/game.service.ts#L1301) | [`game.service.spec.ts`](../src/app/services/game.service.spec.ts), [`game-turn-transition-contracts.spec.ts`](../src/app/services/game-turn-transition-contracts.spec.ts) |
| `HERO-ADERYN-BACKSTAB` | [Aderyn](rules/heroes/aderyn.md) | Répartie dans [`CombatService`](../src/app/services/combat.service.ts) ; aucune méthode unique documentée | [`combat.service.spec.ts`](../src/app/services/combat.service.spec.ts) |
| `HERO-ADERYN-SNEAK` | [Aderyn](rules/heroes/aderyn.md) | Répartie dans [`GameService`](../src/app/services/game.service.ts) et [`ExplorationService`](../src/app/services/exploration.service.ts) | [`aderyn-sneak.spec.ts`](../e2e/aderyn-sneak.spec.ts) |
| `HERO-ARGENTUS-MAGIC-AFFINITY` | [Argentus](rules/heroes/argentus.md) | Répartie dans [`CombatService`](../src/app/services/combat.service.ts) ; aucune méthode unique identifiée | [`argentus-astral.spec.ts`](../e2e/argentus-astral.spec.ts), [`combat.service.spec.ts`](../src/app/services/combat.service.spec.ts) |
| `HERO-ARGENTUS-ASTRAL-WALK` | [Argentus](rules/heroes/argentus.md) | [`GameService.canPerformNormalMovementTo`](../src/app/services/game.service.ts#L1188) | [`argentus-astral.spec.ts`](../e2e/argentus-astral.spec.ts) |
| `HERO-HORAN-DOUBLE-ATTACK` | [Horan](rules/heroes/horan.md) | Répartie dans [`CombatService`](../src/app/services/combat.service.ts) ; aucune méthode unique identifiée | [`horan-powers.spec.ts`](../e2e/horan-powers.spec.ts) |
| `HERO-HORAN-REINCARNATION` | [Horan](rules/heroes/horan.md) | Répartie entre [`GameService`](../src/app/services/game.service.ts) et [`PlayerService.beginRecoveryTurn`](../src/app/services/player.service.ts#L103) | [`horan-powers.spec.ts`](../e2e/horan-powers.spec.ts), [`game.service.spec.ts`](../src/app/services/game.service.spec.ts) |
| `HERO-TAIA-PREMONITION` | [Taia](rules/heroes/taia.md) | Répartie dans [`CombatService`](../src/app/services/combat.service.ts) et [`GameService`](../src/app/services/game.service.ts) ; aucune méthode unique identifiée | [`taia-powers.spec.ts`](../e2e/taia-powers.spec.ts) |
| `HERO-TAIA-FATE-WEAVER` | [Taia](rules/heroes/taia.md) | Répartie entre [`ExplorationService`](../src/app/services/exploration.service.ts) et [`GameService`](../src/app/services/game.service.ts) | [`taia-powers.spec.ts`](../e2e/taia-powers.spec.ts) |
| `HERO-VICTORIUS-COMBAT-TRAINING` | [Victorius](rules/heroes/victorius.md) | Répartie dans [`CombatService`](../src/app/services/combat.service.ts) ; aucune méthode unique identifiée | [`victorius-powers.spec.ts`](../e2e/victorius-powers.spec.ts) |
| `HERO-VICTORIUS-UNSTOPPABLE` | [Victorius](rules/heroes/victorius.md) | Répartie dans [`GameService`](../src/app/services/game.service.ts) ; aucune méthode unique identifiée | [`victorius-powers.spec.ts`](../e2e/victorius-powers.spec.ts) |
| `HERO-XANROS-SACRIFICE` | [Xanros](rules/heroes/xanros.md) | [`GameService.canUseXanrosSacrificeForScore`](../src/app/services/game.service.ts#L1237) ; l’application du bonus de combat est répartie dans [`CombatService`](../src/app/services/combat.service.ts) | [`game.service.spec.ts`](../src/app/services/game.service.spec.ts#L116) |
| `HERO-XANROS-SUBSTITUTION` | [Xanros](rules/heroes/xanros.md) | [`GameService.canUseXanrosSubstitution`](../src/app/services/game.service.ts#L246), [`GameService.confirmXanrosSubstitution`](../src/app/services/game.service.ts#L414), [`GameService.prepareXanrosSubstitutionAction`](../src/app/services/game.service.ts#L464), [`GameService.openXanrosSubstitutionChest`](../src/app/services/game.service.ts#L480) | [`game.service.spec.ts`](../src/app/services/game.service.spec.ts#L219), [`xanros-powers.spec.ts`](../e2e/xanros-powers.spec.ts#L24) |

## Vérification automatisée

```powershell
node docs/tools/check-rule-references.mjs
```

Le vérificateur contrôle les chemins locaux, les symboles textuels et les ancres de ligne `file.ts#L123` utilisées par la matrice. Les ancres de ligne doivent être maintenues après toute modification du code.
