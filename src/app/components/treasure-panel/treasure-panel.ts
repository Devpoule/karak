import { Component, Input } from '@angular/core';
import { calculateTreasurePoints, Treasure } from '../../models/treasure';
import { Player } from '../../models/player';
import { PlayerService } from '../../services/player.service';
import { QuantityPipe } from '../../pipes/quantity.pipe';

/** Contrat de donnees TreasureGroup utilise par le domaine ou l interface. */
interface TreasureGroup {
  readonly type: Treasure;
  readonly singularLabel: string;
  readonly pluralLabel: string;
  readonly image: string;
  readonly count: number;
}

/** Affiche les trésors collectés et leur score dérivé. */
@Component({
  selector: 'app-treasure-panel',
  imports: [QuantityPipe],
  templateUrl: './treasure-panel.html',
  styleUrl: './treasure-panel.scss',
})
export class TreasurePanel {
  @Input() playerIndex: number | null = null;
  @Input() player: Player | null = null;

  constructor(private readonly playerService: PlayerService) {}

  get groups(): TreasureGroup[] {
    this.playerService.treasuresRevision();
    const treasures = this.player?.treasures ?? [];
    return (['opened-chest', 'monster-treasure', 'dragon-ruby'] as const)
      .map(type => ({
        type,
        singularLabel: this.getLabel(type, 'singular'),
        pluralLabel: this.getLabel(type, 'plural'),
        image: this.getImage(type),
        count: treasures.filter(treasure => treasure === type).length,
      }))
      .filter(group => group.count > 0);
  }

  get points(): number {
    this.playerService.treasuresRevision();
    return calculateTreasurePoints(this.player?.treasures ?? []);
  }

/** Gere getLabel et applique les gardes necessaires avant mutation. */
  private getLabel(type: Treasure, form: 'singular' | 'plural'): string {
    switch (type) {
      case 'opened-chest': return form === 'singular' ? 'Coffre ouvert' : 'Coffres ouverts';
      case 'monster-treasure': return form === 'singular' ? 'Trésor des Morts' : 'Trésors des Morts';
      case 'dragon-ruby': return 'Rubis du dragon';
    }
  }

/** Gere getImage et applique les gardes necessaires avant mutation. */
  private getImage(type: Treasure): string {
    switch (type) {
      case 'opened-chest': return '/assets/tokens/open-chest.png';
      case 'monster-treasure': return '/assets/tokens/treasure.png';
      case 'dragon-ruby': return '/assets/tokens/dragon.png';
    }
  }
}
