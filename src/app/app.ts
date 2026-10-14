import { ApplicationRef, Component, isDevMode } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { getEquipmentDefinition } from './data/equipment-definitions';
import { GameService } from './services/game.service';
import { DungeonService } from './services/dungeon.service';
import { PlayerService } from './services/player.service';

interface ManualHealingPortalFixtureResult {
  readonly playerIndex: number;
  readonly fountains: readonly { x: number; y: number }[];
}

declare global {
  interface Window {
    /** Fixture manuelle disponible uniquement en développement local. */
    __karakManualFixture?: {
      prepareHealingPortal(): ManualHealingPortalFixtureResult;
    };
  }
}

@Component({
  imports: [RouterOutlet],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  constructor(
    private readonly applicationRef: ApplicationRef,
    private readonly gameService: GameService,
    private readonly dungeonService: DungeonService,
    private readonly playerService: PlayerService,
  ) {
    if (isDevMode()) this.installManualFixture();
  }

  /**
   * Expose une préparation explicite pour la recette manuelle du portail.
   *
   * La fixture ne s'exécute jamais automatiquement et n'est pas enregistrée
   * dans un build de production. Elle utilise les APIs métier existantes afin
   * de conserver les mêmes notifications que le jeu normal.
   */
  private installManualFixture(): void {
    window.__karakManualFixture = {
      prepareHealingPortal: () => {
        if (this.gameService.phase() !== 'playing') {
          throw new Error('Démarrez une partie et entrez dans le donjon avant la fixture.');
        }

        const playerIndex = this.playerService.players.findIndex(player => player.controller === 'human');
        const player = this.playerService.players[playerIndex];
        const portal = getEquipmentDefinition('heart');
        if (!player || !portal) throw new Error('Joueur humain ou portail indisponible.');

        this.gameService.activePlayerIndex.set(playerIndex);
        player.heroId = 'xanros';
        player.inventory.spells.fill(null);
        this.playerService.addEquipment(player, portal);
        this.playerService.restoreCompletely(player, 2);
        this.playerService.setCursed(player, true);

        // La tuile de départ est aussi une fontaine découverte. Elle fait
        // partie du donjon et ne doit jamais être supprimée par la fixture.
        // Seules les fontaines ajoutées par une préparation précédente sont
        // retirées afin de rendre l'appel répétable sans reconstruire le plateau.
        for (let index = this.dungeonService.tiles.length - 1; index >= 0; index -= 1) {
          const tile = this.dungeonService.tiles[index];
          const definition = this.dungeonService.getTileDefinition(tile);
          if (definition?.feature === 'healing-fountain' && definition.kind !== 'start') {
            this.dungeonService.tiles.splice(index, 1);
          }
        }

        // Le scénario utilise la fontaine de départ et une seconde fontaine
        // découverte. Les autres salles et leurs références restent intactes.
        const fountainPosition = { x: 2, y: 0 };
        this.dungeonService.tiles.push({
          definitionId: 'healing-corner',
          ...fountainPosition,
          rotation: 0,
        });

        const fountains = this.dungeonService.tiles
          .filter(tile => this.dungeonService.getTileDefinition(tile)?.feature === 'healing-fountain')
          .map(({ x, y }) => ({ x, y }));
        // La fixture est appelée depuis la console, hors du cycle Angular.
        this.applicationRef.tick();
        return { playerIndex, fountains };
      },
    };
  }
}
