import { Component, Input } from '@angular/core';
import { calculateTreasurePoints, Treasure } from '../../models/treasure';
import { Player } from '../../models/player';
import { PlayerService } from '../../services/player.service';

interface TreasureGroup {
  readonly type: Treasure;
  readonly label: string;
  readonly image: string;
  readonly count: number;
}

/** Affiche les trésors collectés et leur score dérivé. */
@Component({
  selector: 'app-treasure-panel',
  imports: [],
  templateUrl: './treasure-panel.html',
  styleUrl: './treasure-panel.scss',
})
export class TreasurePanel {
  @Input() player: Player | null = null;

  constructor(private readonly playerService: PlayerService) {}

  get groups(): TreasureGroup[] {
    this.playerService.treasuresRevision();
    const treasures = this.player?.treasures ?? [];
    return (['opened-chest', 'monster-treasure', 'dragon-ruby'] as const)
      .map(type => ({
        type,
        label: this.getLabel(type),
        image: this.getImage(type),
        count: treasures.filter(treasure => treasure === type).length,
      }))
      .filter(group => group.count > 0);
  }

  get points(): number {
    this.playerService.treasuresRevision();
    return calculateTreasurePoints(this.player?.treasures ?? []);
  }

  private getLabel(type: Treasure): string {
    switch (type) {
      case 'opened-chest': return 'Coffres ouverts';
      case 'monster-treasure': return 'Trésors des Morts';
      case 'dragon-ruby': return 'Rubis du dragon';
    }
  }

  private getImage(type: Treasure): string {
    switch (type) {
      case 'opened-chest': return '/assets/tokens/open-chest.png';
      case 'monster-treasure': return '/assets/tokens/treasure.png';
      case 'dragon-ruby': return '/assets/tokens/treasure.png';
    }
  }
}
