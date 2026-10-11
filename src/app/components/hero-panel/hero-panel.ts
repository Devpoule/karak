import { Component, Input } from '@angular/core';

import { getHeroDefinition } from '../../data/hero-definitions';
import { HeroDefinition } from '../../models/hero';
import { Player } from '../../models/player';


/**
 * Affiche le plateau visuel réservé au héros d'un joueur.
 *
 * Le composant conserve l'asset servant de support au héros,
 * mais l'identité affichée provient désormais du joueur actif.
 *
 * Il ne gère pas encore :
 *
 * - son pouvoir spécial ;
 * - les autres états du héros pendant la partie.
 *
 * Ces informations seront ajoutées lorsque le modèle des héros
 * et l'état des joueurs seront implémentés.
 */
@Component({
  imports: [],
  selector: 'app-hero-panel',
  styleUrl: './hero-panel.scss',
  templateUrl: './hero-panel.html',
})
export class HeroPanel {
  /**
   * Joueur dont le héros est représenté.
   */
  @Input() player: Player | null = null;
  @Input() curseImagePath = '/assets/tokens/curse.png';

  get isCursed(): boolean {
    return this.player?.isCursed === true;
  }

  /**
   * Le voile reste actif pendant l'attente et le tour de récupération.
   * Il ne disparaît qu'une fois que le moteur libère réellement le héros.
   */
  get isUnconscious(): boolean {
    return this.player?.recoveryState !== undefined
      && this.player.recoveryState !== 'none';
  }

  get heroDefinition(): HeroDefinition | null {
    const heroId = this.player?.heroId;

    if (!heroId) {
      return null;
    }

    return (
      getHeroDefinition(heroId)
      ?? null
    );
  }
}
